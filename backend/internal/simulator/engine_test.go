package simulator

import (
	"context"
	"fmt"
	"math"
	"testing"
	"time"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/Oblutack/NeptuneShipments/backend/internal/testutil"
	"github.com/Oblutack/NeptuneShipments/backend/internal/websocket"
)

// newTestEngine builds a real Engine against the test database. The hub is
// a real websocket.Hub whose Run loop is never started - Broadcast just
// pushes onto its buffered channel (capacity 256), which is plenty for a
// handful of alerts in one test, so no running goroutine is needed to
// exercise the engine's logic.
func newTestEngine(db *database.Service) *Engine {
	return newTestEngineWithScale(db, DefaultTimeScale)
}

func newTestEngineWithScale(db *database.Service, timeScale float64) *Engine {
	return NewEngine(
		repository.NewVesselRepository(db.GetPool()),
		repository.NewShipmentRepository(db),
		repository.NewComponentRepository(db.GetPool()),
		repository.NewAllocationRepository(db),
		repository.NewShipmentEventRepository(db),
		websocket.NewHub(),
		timeScale,
	)
}

func newThrowawayVessel(t *testing.T, vesselRepo *repository.VesselRepository, suffix, status string, fuelLevel, fuelCapacity, speedKnots float64) *models.Vessel {
	t.Helper()
	v := &models.Vessel{
		Name: "Engine Test Vessel " + suffix, IMONumber: "IMOTEST" + suffix[len(suffix)-6:],
		FlagCountry: "XX", Type: "CONTAINER", Status: status,
		Latitude: 1, Longitude: 1, SpeedKnots: speedKnots,
	}
	if err := vesselRepo.Create(context.Background(), v); err != nil {
		t.Fatalf("create vessel: %v", err)
	}
	t.Cleanup(func() { vesselRepo.Delete(context.Background(), v.ID) })

	if _, err := vesselRepo.GetPool().Exec(context.Background(),
		`UPDATE vessels SET fuel_level = $1, fuel_capacity = $2 WHERE id = $3`,
		fuelLevel, fuelCapacity, v.ID); err != nil {
		t.Fatalf("set fuel: %v", err)
	}
	return v
}

// TestEngine_Tick_FuelDepletionTriggersDistress covers the engine's core
// safety behavior: a moving vessel whose fuel reaches zero mid-tick must
// be put into DISTRESS, not left AT_SEA silently drifting on an empty
// tank. This is the single most consequential state transition the
// simulator makes and, before this test, had zero coverage.
func TestEngine_Tick_FuelDepletionTriggersDistress(t *testing.T) {
	db := testutil.RequireDB(t)
	vesselRepo := repository.NewVesselRepository(db.GetPool())
	suffix := testutil.UniqueSuffix()

	// burnRate = 0.5 * (speed/20) = 0.5 at speed 20, so 0.1 fuel depletes
	// to <= 0 on the very next tick.
	v := newThrowawayVessel(t, vesselRepo, suffix, "AT_SEA", 0.1, 5000, 20)

	engine := newTestEngine(db)
	engine.tick()

	got, err := vesselRepo.GetByID(context.Background(), v.ID)
	if err != nil {
		t.Fatalf("GetByID after tick: %v", err)
	}
	if got.Status != "DISTRESS" {
		t.Errorf("Status = %q, want DISTRESS", got.Status)
	}
	if got.FuelLevel != 0 {
		t.Errorf("FuelLevel = %v, want 0 (clamped, not negative)", got.FuelLevel)
	}
	if got.SpeedKnots != 0 {
		t.Errorf("SpeedKnots = %v, want 0 (a stranded vessel isn't moving)", got.SpeedKnots)
	}
}

// TestEngine_Tick_DistressRecoversWhenRefueled covers the recovery half
// of the same behavior: once a DISTRESS vessel has fuel again (and no
// critical component failures), the next tick must bring it back to
// ANCHORED - a vessel that runs out of fuel shouldn't be stuck DISTRESS
// forever after being refueled.
func TestEngine_Tick_DistressRecoversWhenRefueled(t *testing.T) {
	db := testutil.RequireDB(t)
	vesselRepo := repository.NewVesselRepository(db.GetPool())
	suffix := testutil.UniqueSuffix()

	v := newThrowawayVessel(t, vesselRepo, suffix, "DISTRESS", 5000, 5000, 0)

	engine := newTestEngine(db)
	engine.tick()

	got, err := vesselRepo.GetByID(context.Background(), v.ID)
	if err != nil {
		t.Fatalf("GetByID after tick: %v", err)
	}
	if got.Status != "ANCHORED" {
		t.Errorf("Status = %q, want ANCHORED (recovered from DISTRESS)", got.Status)
	}
}

// TestEngine_ApplyMechanicalWear_CriticalFailureDoesNotZeroFuel is the
// regression test for the bug SetDistressOutOfFuel was split out to fix:
// a vessel that goes DISTRESS from a critical component failure still
// has real fuel aboard, and must keep it - only the fuel-exhaustion path
// should ever zero fuel_level.
func TestEngine_ApplyMechanicalWear_CriticalFailureDoesNotZeroFuel(t *testing.T) {
	db := testutil.RequireDB(t)
	vesselRepo := repository.NewVesselRepository(db.GetPool())
	suffix := testutil.UniqueSuffix()

	v := newThrowawayVessel(t, vesselRepo, suffix, "AT_SEA", 3000, 5000, 15)

	// A component already at critical health - DegradeComponents' small
	// per-tick wear isn't what's under test here, the failure itself is.
	if _, err := db.GetPool().Exec(context.Background(),
		`INSERT INTO components (vessel_id, name, type, health_percentage) VALUES ($1, 'Test Engine', 'ENGINE', 5.0)`,
		v.ID); err != nil {
		t.Fatalf("insert critical component: %v", err)
	}

	engine := newTestEngine(db)
	engine.applyMechanicalWear(context.Background(), *v)

	got, err := vesselRepo.GetByID(context.Background(), v.ID)
	if err != nil {
		t.Fatalf("GetByID after applyMechanicalWear: %v", err)
	}
	if got.Status != "DISTRESS" {
		t.Errorf("Status = %q, want DISTRESS (critical component failure)", got.Status)
	}
	if got.FuelLevel != 3000 {
		t.Errorf("FuelLevel = %v, want unchanged 3000 - a mechanical failure must not zero real remaining fuel", got.FuelLevel)
	}
}

// TestEngine_Tick_DistressStaysDistressWithoutFuel is the negative case
// for recovery: a DISTRESS vessel with no fuel must stay DISTRESS, not
// get recovered just because a tick happened.
func TestEngine_Tick_DistressStaysDistressWithoutFuel(t *testing.T) {
	db := testutil.RequireDB(t)
	vesselRepo := repository.NewVesselRepository(db.GetPool())
	suffix := testutil.UniqueSuffix()

	v := newThrowawayVessel(t, vesselRepo, suffix, "DISTRESS", 0, 5000, 0)

	engine := newTestEngine(db)
	engine.tick()

	got, err := vesselRepo.GetByID(context.Background(), v.ID)
	if err != nil {
		t.Fatalf("GetByID after tick: %v", err)
	}
	if got.Status != "DISTRESS" {
		t.Errorf("Status = %q, want still DISTRESS (no fuel to recover with)", got.Status)
	}
}

// voyageFixture is a vessel AT_SEA at the start of a straight east-west
// route of the given length in degrees of longitude along the equator
// (about 60 nm per degree).
type voyageFixture struct {
	vessel     *models.Vessel
	vesselRepo *repository.VesselRepository
	engine     *Engine
}

// newVoyage sets up a vessel on a fresh route. Cleanups register the route
// before the vessel so (LIFO) the vessel is deleted first - it holds a
// foreign key to the route.
func newVoyage(t *testing.T, db *database.Service, timeScale, speedKnots, degrees float64) *voyageFixture {
	t.Helper()
	ctx := context.Background()
	pool := db.GetPool()
	suffix := testutil.UniqueSuffix()

	originID, destID, _, _, _, _ := testutil.TwoRealPorts(t, pool)
	geoJSON := []byte(fmt.Sprintf(`{"type":"LineString","coordinates":[[0,0],[%v,0]]}`, degrees))
	routeID, err := repository.NewRouteRepository(db).Create(ctx, "Test Voyage Route "+suffix, originID, destID, geoJSON)
	if err != nil {
		t.Fatalf("create route: %v", err)
	}
	t.Cleanup(func() { pool.Exec(ctx, `DELETE FROM routes WHERE id = $1`, routeID) })

	vesselRepo := repository.NewVesselRepository(pool)
	v := newThrowawayVessel(t, vesselRepo, suffix, "AT_SEA", 5000, 5000, speedKnots)
	if _, err := pool.Exec(ctx, `UPDATE vessels SET current_route_id = $1, route_progress = 0 WHERE id = $2`, routeID, v.ID); err != nil {
		t.Fatalf("put vessel on route: %v", err)
	}
	// Delete refuses a vessel that is AT_SEA on a route, which is exactly
	// where these tests leave it - release it first, or every run leaks a
	// vessel (and its route) into the shared database. Registered after
	// newThrowawayVessel's own cleanup, so (LIFO) it runs before it.
	t.Cleanup(func() {
		pool.Exec(ctx, `UPDATE vessels SET status = 'DOCKED', current_route_id = NULL WHERE id = $1`, v.ID)
	})
	return &voyageFixture{vessel: v, vesselRepo: vesselRepo, engine: newTestEngineWithScale(db, timeScale)}
}

// ticksToArrive runs moveVessel until the vessel has covered its whole
// route (stopping before the separate docking step) and returns how many
// ticks that took.
func (f *voyageFixture) ticksToArrive(t *testing.T) int {
	t.Helper()
	ctx := context.Background()
	for ticks := 0; ticks < 5000; ticks++ {
		v, err := f.vesselRepo.GetByID(ctx, f.vessel.ID)
		if err != nil {
			t.Fatalf("GetByID: %v", err)
		}
		if v.RouteProgress >= 1.0 {
			return ticks
		}
		f.engine.moveVessel(ctx, *v)
	}
	t.Fatal("vessel never completed its route in 5000 ticks")
	return -1
}

// A voyage must last as long as its length and the vessel's speed say. It
// used to advance a fixed 0.2% per tick, so a 60 nm hop and a 3,000 nm
// crossing both took exactly 500 ticks.
func TestEngine_VoyageDurationFollowsDistanceAndSpeed(t *testing.T) {
	db := testutil.RequireDB(t)

	// scale 720 => each 5s tick is exactly one simulated hour, so a 10 kn
	// vessel sails 10 nm per tick.
	const scale, speed = 720.0, 10.0

	short := newVoyage(t, db, scale, speed, 1) // ~60 nm
	long := newVoyage(t, db, scale, speed, 3)  // ~180 nm

	shortV, _ := short.vesselRepo.GetByID(context.Background(), short.vessel.ID)
	longV, _ := long.vesselRepo.GetByID(context.Background(), long.vessel.ID)
	if shortV.RouteLengthNM < 59 || shortV.RouteLengthNM > 61 || longV.RouteLengthNM < 179 || longV.RouteLengthNM > 181.5 {
		t.Fatalf("route lengths = %.1f / %.1f nm, want about 60 / 180 (1 degree of longitude at the equator is ~60 nm)",
			shortV.RouteLengthNM, longV.RouteLengthNM)
	}

	shortTicks, longTicks := short.ticksToArrive(t), long.ticksToArrive(t)

	wantShort := int(math.Ceil(shortV.RouteLengthNM / speed))
	wantLong := int(math.Ceil(longV.RouteLengthNM / speed))
	if shortTicks != wantShort || longTicks != wantLong {
		t.Errorf("ticks = %d / %d, want %d / %d (route length / 10 nm per tick, rounded up)", shortTicks, longTicks, wantShort, wantLong)
	}
	if longTicks <= shortTicks*2 {
		t.Errorf("a route 3x as long took %d ticks vs %d - duration isn't tracking distance", longTicks, shortTicks)
	}
}

// Doubling the vessel's speed must roughly halve the voyage.
func TestEngine_FasterVesselArrivesSooner(t *testing.T) {
	db := testutil.RequireDB(t)
	slow := newVoyage(t, db, 720, 10, 3)
	fast := newVoyage(t, db, 720, 20, 3)
	slowTicks, fastTicks := slow.ticksToArrive(t), fast.ticksToArrive(t)
	if fastTicks >= slowTicks || fastTicks < slowTicks/2-1 || fastTicks > slowTicks/2+1 {
		t.Errorf("ticks at 20 kn = %d, at 10 kn = %d; want about half", fastTicks, slowTicks)
	}
}

// The distance credited to the vessel (which the CII rating is computed
// from) must be the distance actually sailed - the route's length, not an
// overshoot from a final tick that would have carried it past the end.
func TestEngine_DistanceTotalMatchesRouteLength(t *testing.T) {
	db := testutil.RequireDB(t)
	f := newVoyage(t, db, 720, 17, 2) // 17 nm/tick doesn't divide the route evenly
	f.ticksToArrive(t)
	v, _ := f.vesselRepo.GetByID(context.Background(), f.vessel.ID)
	if math.Abs(v.TotalDistanceNM-v.RouteLengthNM) > 0.01 {
		t.Errorf("total distance = %.3f nm, route length = %.3f nm; want them equal", v.TotalDistanceNM, v.RouteLengthNM)
	}
}

// The displayed ETA and the actual arrival must agree. The ETA used to
// come from real distance and speed while the vessel advanced by a fixed
// amount per tick, so they were unrelated.
func TestEngine_ETAMatchesActualArrival(t *testing.T) {
	db := testutil.RequireDB(t)
	ctx := context.Background()
	f := newVoyage(t, db, 720, 10, 3)

	originID, destID, _, _, _, _ := testutil.TwoRealPorts(t, db.GetPool())
	shipmentRepo := repository.NewShipmentRepository(db)
	shipment := &models.Shipment{
		TrackingNumber: "", CustomerName: "ETA Test", OriginPortID: originID, DestinationPortID: destID,
		VesselID: &f.vessel.ID, WeightKG: 1, Status: "IN_TRANSIT",
	}
	if err := shipmentRepo.Create(ctx, shipment); err != nil {
		t.Fatalf("create shipment: %v", err)
	}
	t.Cleanup(func() { shipmentRepo.Delete(ctx, shipment.ID) })

	// After the first tick the ETA is for the remaining distance.
	v, _ := f.vesselRepo.GetByID(ctx, f.vessel.ID)
	f.engine.moveVessel(ctx, *v)
	got, err := shipmentRepo.GetByTrackingNumber(ctx, shipment.TrackingNumber)
	if err != nil || got.ETA == nil {
		t.Fatalf("shipment ETA after one tick = %v, err = %v; want one to be set", got, err)
	}
	etaTicks := int(math.Round(time.Until(*got.ETA).Seconds() / tickInterval.Seconds()))

	remaining := f.ticksToArrive(t)
	if diff := etaTicks - remaining; diff < -1 || diff > 1 {
		t.Errorf("ETA said %d ticks to go, the vessel actually needed %d - they should agree within a tick", etaTicks, remaining)
	}
}

func TestTimeScaleFromEnv(t *testing.T) {
	for _, tc := range []struct {
		env  string
		want float64
	}{
		{"", DefaultTimeScale},
		{"250", 250},
		{"0.5", 0.5},
		{"abc", DefaultTimeScale},
		{"0", DefaultTimeScale},
		{"-3", DefaultTimeScale},
		{"NaN", DefaultTimeScale},
		{"Inf", DefaultTimeScale},
	} {
		t.Setenv("SIM_TIME_SCALE", tc.env)
		if got := TimeScaleFromEnv(); got != tc.want {
			t.Errorf("SIM_TIME_SCALE=%q -> %v, want %v", tc.env, got, tc.want)
		}
	}
}
