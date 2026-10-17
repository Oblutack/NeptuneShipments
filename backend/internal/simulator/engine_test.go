package simulator

import (
	"context"
	"testing"

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
	return NewEngine(
		repository.NewVesselRepository(db.GetPool()),
		repository.NewShipmentRepository(db),
		repository.NewComponentRepository(db.GetPool()),
		repository.NewAllocationRepository(db),
		repository.NewShipmentEventRepository(db),
		websocket.NewHub(),
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
