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
		repository.NewAlertRepository(db),
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
	// The engine records alerts as it works; they outlive the vessel
	// (vessel_id is just nulled), so remove them while it still exists.
	t.Cleanup(func() {
		vesselRepo.GetPool().Exec(context.Background(), `DELETE FROM alerts WHERE vessel_id = $1`, v.ID)
	})

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

	// A default-profile vessel (100 t/day at 18 kn) burns several tons per
	// tick at 20 kn, so 0.1 fuel depletes to <= 0 on the very next tick.
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
	routeID    string
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
	return &voyageFixture{vessel: v, vesselRepo: vesselRepo, engine: newTestEngineWithScale(db, timeScale), routeID: routeID}
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

func burnVessel(speed, designSpeed, designTPD float64) models.Vessel {
	return models.Vessel{SpeedKnots: speed, DesignSpeedKnots: designSpeed, DesignConsumptionTPD: designTPD}
}

func approx(a, b float64) bool { return math.Abs(a-b) < 1e-9*math.Max(1, math.Abs(b)) }

func TestFuelBurnTons(t *testing.T) {
	// At design speed, one simulated day burns exactly the design consumption.
	if got := fuelBurnTons(burnVessel(20, 20, 120), 24); !approx(got, 120) {
		t.Errorf("a day at design speed burned %v t, want 120", got)
	}
	// Burn is proportional to simulated time.
	if got := fuelBurnTons(burnVessel(20, 20, 120), 1); !approx(got, 5) {
		t.Errorf("an hour at design speed burned %v t, want 5", got)
	}
	// Cube law: half speed burns an eighth as fast, 1.5x speed 3.375x as fast.
	full := fuelBurnTons(burnVessel(20, 20, 120), 24)
	if got := fuelBurnTons(burnVessel(10, 20, 120), 24); !approx(got, full/8) {
		t.Errorf("half speed burned %v t/day, want an eighth of %v", got, full)
	}
	if got := fuelBurnTons(burnVessel(30, 20, 120), 24); !approx(got, full*3.375) {
		t.Errorf("1.5x speed burned %v t/day, want 3.375x %v", got, full)
	}
	// A bigger ship burns more at the same speed.
	if big, small := fuelBurnTons(burnVessel(18, 20, 200), 24), fuelBurnTons(burnVessel(18, 20, 60), 24); big <= small {
		t.Errorf("big ship burned %v, small ship %v - size must matter", big, small)
	}
	// Nothing burns when stopped or when the profile is unusable.
	for name, v := range map[string]models.Vessel{
		"stopped":           burnVessel(0, 20, 120),
		"no design speed":   burnVessel(18, 0, 120),
		"no consumption":    burnVessel(18, 20, 0),
		"negative speed":    burnVessel(-5, 20, 120),
		"zero-value vessel": {},
	} {
		if got := fuelBurnTons(v, 24); got != 0 {
			t.Errorf("%s: burned %v, want 0", name, got)
		}
	}
}

// setProfile gives a fixture vessel an explicit fuel profile.
func setProfile(t *testing.T, db *database.Service, id string, designSpeed, designTPD float64) {
	t.Helper()
	if _, err := db.GetPool().Exec(context.Background(),
		`UPDATE vessels SET design_speed_knots = $1, design_consumption_tpd = $2 WHERE id = $3`,
		designSpeed, designTPD, id); err != nil {
		t.Fatalf("set fuel profile: %v", err)
	}
}

// The burn the engine records must be what fuelBurnTons says, per vessel -
// it used to be a flat 0.5 t/tick for every ship regardless of size.
func TestEngine_FuelBurnDiffersByVessel(t *testing.T) {
	db := testutil.RequireDB(t)
	ctx := context.Background()
	const scale, speed = 720.0, 18.0 // one simulated hour per tick

	small := newVoyage(t, db, scale, speed, 3)
	large := newVoyage(t, db, scale, speed, 3)
	setProfile(t, db, small.vessel.ID, 18, 48)  // 2 t/hour at 18 kn
	setProfile(t, db, large.vessel.ID, 18, 240) // 10 t/hour at 18 kn

	burned := func(f *voyageFixture) float64 {
		v, _ := f.vesselRepo.GetByID(ctx, f.vessel.ID)
		before := v.FuelLevel
		f.engine.moveVessel(ctx, *v)
		after, _ := f.vesselRepo.GetByID(ctx, f.vessel.ID)
		if got := after.TotalFuelConsumedTons; !approx(got, before-after.FuelLevel) {
			t.Errorf("total_fuel_consumed_tons = %v, but fuel level dropped by %v", got, before-after.FuelLevel)
		}
		return before - after.FuelLevel
	}
	smallBurn, largeBurn := burned(small), burned(large)
	if !approx(smallBurn, 2) || !approx(largeBurn, 10) {
		t.Errorf("burned %v t / %v t in one simulated hour, want 2 t / 10 t", smallBurn, largeBurn)
	}
}

// A vessel with no route used to move without burning any fuel at all (a
// comment in the engine admitted it) - and its fuel was never saved.
func TestEngine_FreeRoamingVesselBurnsFuelAndCoversDistance(t *testing.T) {
	db := testutil.RequireDB(t)
	ctx := context.Background()
	vesselRepo := repository.NewVesselRepository(db.GetPool())
	v := newThrowawayVessel(t, vesselRepo, testutil.UniqueSuffix(), "AT_SEA", 1000, 1000, 10)
	setProfile(t, db, v.ID, 10, 240) // 10 t/hour at 10 kn

	engine := newTestEngineWithScale(db, 720) // one simulated hour per tick
	loaded, _ := vesselRepo.GetByID(ctx, v.ID)
	engine.moveVessel(ctx, *loaded)

	got, err := vesselRepo.GetByID(ctx, v.ID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if !approx(got.FuelLevel, 990) || !approx(got.TotalFuelConsumedTons, 10) {
		t.Errorf("fuel = %v, consumed = %v; want 990 and 10 after one hour at design speed", got.FuelLevel, got.TotalFuelConsumedTons)
	}
	if !approx(got.TotalDistanceNM, 10) {
		t.Errorf("distance = %v nm, want 10 (10 kn for an hour)", got.TotalDistanceNM)
	}
	if got.Latitude == 1 && got.Longitude == 1 {
		t.Error("vessel didn't move")
	}
}

// The last tick of a voyage only sails the distance that's left, so it must
// only burn that much fuel. Charged a full tick, a short final leg overstated
// fuel use - which skews the CII rating, and at high time scales a tick is
// days long, so the error is large.
func TestEngine_FinalTickBurnIsProrated(t *testing.T) {
	db := testutil.RequireDB(t)
	// 10 kn, one simulated hour per tick (10 nm), a ~60.1 nm route: six
	// full ticks and a final tick of ~0.1 nm.
	f := newVoyage(t, db, 720, 10, 1)
	setProfile(t, db, f.vessel.ID, 10, 240) // exactly 10 t per simulated hour at 10 kn
	f.ticksToArrive(t)

	v, _ := f.vesselRepo.GetByID(context.Background(), f.vessel.ID)
	// 10 t/hour at 10 kn = 1 t per nm sailed.
	if math.Abs(v.TotalFuelConsumedTons-v.RouteLengthNM) > 0.01 {
		t.Errorf("burned %.3f t over a %.3f nm route at 1 t/nm; want them equal (a full final tick would add ~10 t)",
			v.TotalFuelConsumedTons, v.RouteLengthNM)
	}
}

// vesselAlert is the part of an alert row these tests look at.
type vesselAlert struct {
	Level, Kind string
	Resolved    bool
}

func alertsFor(t *testing.T, db *database.Service, vesselID string) []vesselAlert {
	t.Helper()
	rows, err := db.GetPool().Query(context.Background(),
		`SELECT level, kind, resolved_at IS NOT NULL FROM alerts WHERE vessel_id = $1 ORDER BY created_at`, vesselID)
	if err != nil {
		t.Fatalf("query alerts: %v", err)
	}
	defer rows.Close()
	var out []vesselAlert
	for rows.Next() {
		var a vesselAlert
		if err := rows.Scan(&a.Level, &a.Kind, &a.Resolved); err != nil {
			t.Fatalf("scan alert: %v", err)
		}
		out = append(out, a)
	}
	return out
}

func countKind(alerts []vesselAlert, kind string) int {
	n := 0
	for _, a := range alerts {
		if a.Kind == kind {
			n++
		}
	}
	return n
}

// Running dry persists exactly one open alert, however many ticks the
// vessel then sits stranded for. This used to be a map in memory, which a
// restart emptied - after which the next tick would announce it all again.
func TestEngine_OutOfFuelRaisesOnePersistedAlert(t *testing.T) {
	db := testutil.RequireDB(t)
	vesselRepo := repository.NewVesselRepository(db.GetPool())
	v := newThrowawayVessel(t, vesselRepo, testutil.UniqueSuffix(), "AT_SEA", 0.1, 5000, 20)
	engine := newTestEngine(db)

	for i := 0; i < 4; i++ {
		engine.tick()
	}

	alerts := alertsFor(t, db, v.ID)
	if len(alerts) != 1 || alerts[0].Kind != models.AlertKindOutOfFuel || alerts[0].Level != models.AlertLevelCritical || alerts[0].Resolved {
		t.Errorf("alerts after 4 ticks = %+v, want exactly one open CRITICAL OUT_OF_FUEL", alerts)
	}

	// A fresh engine - what a server restart gives you - must not announce it again.
	newTestEngine(db).tick()
	if got := len(alertsFor(t, db, v.ID)); got != 1 {
		t.Errorf("%d alerts after a restart, want still 1", got)
	}
}

// A vessel already in DISTRESS with no alert on record (the alert write
// failed, or the vessel was stranded before alerts were persisted) gets one
// on the next tick, of the right kind.
func TestEngine_DistressedVesselWithoutAnAlertGetsOne(t *testing.T) {
	db := testutil.RequireDB(t)
	vesselRepo := repository.NewVesselRepository(db.GetPool())
	engine := newTestEngine(db)

	dry := newThrowawayVessel(t, vesselRepo, testutil.UniqueSuffix(), "DISTRESS", 0, 5000, 0)

	broken := newThrowawayVessel(t, vesselRepo, testutil.UniqueSuffix(), "DISTRESS", 3000, 5000, 0)
	if _, err := db.GetPool().Exec(context.Background(),
		`INSERT INTO components (vessel_id, name, type, health_percentage) VALUES ($1, 'Test Engine', 'ENGINE', 5.0)`, broken.ID); err != nil {
		t.Fatalf("insert critical component: %v", err)
	}

	engine.tick()

	if a := alertsFor(t, db, dry.ID); len(a) != 1 || a[0].Kind != models.AlertKindOutOfFuel {
		t.Errorf("fuel-less vessel alerts = %+v, want one OUT_OF_FUEL", a)
	}
	if a := alertsFor(t, db, broken.ID); len(a) != 1 || a[0].Kind != models.AlertKindMechanicalFailed {
		t.Errorf("vessel with fuel but a critical component alerts = %+v, want one MECHANICAL_FAILURE", a)
	}
}

// A fault's alert closes when the vessel leaves DISTRESS, whichever way it
// gets out. A refuel puts it straight back AT_SEA without passing through
// the engine's own recovery; keying resolution to that recovery step left the
// alert open forever, which would also have suppressed the next real one.
func TestEngine_AlertsCloseWhenTheVesselLeavesDistress(t *testing.T) {
	db := testutil.RequireDB(t)
	vesselRepo := repository.NewVesselRepository(db.GetPool())
	ctx := context.Background()

	t.Run("refuelled straight back to sea", func(t *testing.T) {
		engine := newTestEngine(db)
		v := newThrowawayVessel(t, vesselRepo, testutil.UniqueSuffix(), "DISTRESS", 0, 5000, 0)

		engine.tick() // stranded: alert raised
		if a := alertsFor(t, db, v.ID); len(a) != 1 || a[0].Resolved {
			t.Fatalf("alerts while stranded = %+v, want one open", a)
		}

		if err := vesselRepo.RefuelVessel(ctx, v.ID); err != nil { // sets AT_SEA directly
			t.Fatalf("refuel: %v", err)
		}
		engine.tick()

		if a := alertsFor(t, db, v.ID); countKind(a, models.AlertKindOutOfFuel) != 1 || !a[0].Resolved {
			t.Errorf("alerts after a refuel = %+v, want the OUT_OF_FUEL alert resolved", a)
		}
	})

	t.Run("recovered by the engine", func(t *testing.T) {
		engine := newTestEngine(db)
		v := newThrowawayVessel(t, vesselRepo, testutil.UniqueSuffix(), "DISTRESS", 0, 5000, 0)

		engine.tick() // stranded: alert raised
		// Fuel arrives but the vessel is left in DISTRESS: the engine's
		// own recovery has to notice and anchor it.
		if _, err := db.GetPool().Exec(ctx, `UPDATE vessels SET fuel_level = 4000 WHERE id = $1`, v.ID); err != nil {
			t.Fatalf("add fuel: %v", err)
		}
		engine.tick() // recovers the vessel (ANCHORED) and records it
		engine.tick() // sees it is out of DISTRESS and closes the fault

		alerts := alertsFor(t, db, v.ID)
		if countKind(alerts, models.AlertKindOutOfFuel) != 1 || !alerts[0].Resolved {
			t.Errorf("alerts = %+v, want the OUT_OF_FUEL alert resolved", alerts)
		}
		if countKind(alerts, models.AlertKindRecovered) != 1 {
			t.Errorf("alerts = %+v, want exactly one RECOVERED event", alerts)
		}
		if got, _ := vesselRepo.GetByID(ctx, v.ID); got.Status != "ANCHORED" {
			t.Errorf("status = %q, want ANCHORED", got.Status)
		}
	})
}

// Every arrival is announced, not just the first. The in-memory dedupe keyed
// on (level, vessel), so a second arrival was dropped until the vessel next
// recovered from distress.
func TestEngine_EveryArrivalRaisesAnAlert(t *testing.T) {
	db := testutil.RequireDB(t)
	ctx := context.Background()
	f := newVoyage(t, db, 720, 10, 1)

	for arrival := 1; arrival <= 2; arrival++ {
		if arrival == 2 { // send it round again: back on its route, already at the end
			if _, err := db.GetPool().Exec(ctx,
				`UPDATE vessels SET status = 'AT_SEA', current_route_id = $1, route_progress = 1.0, speed_knots = 10 WHERE id = $2`,
				f.routeID, f.vessel.ID); err != nil {
				t.Fatalf("second voyage setup: %v", err)
			}
		} else {
			f.ticksToArrive(t)
		}
		v, _ := f.vesselRepo.GetByID(ctx, f.vessel.ID)
		f.engine.moveVessel(ctx, *v) // the tick that docks it

		if got := countKind(alertsFor(t, db, f.vessel.ID), models.AlertKindArrived); got != arrival {
			t.Errorf("after arrival %d there are %d ARRIVED alerts, want %d", arrival, got, arrival)
		}
	}
}
