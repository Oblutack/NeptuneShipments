package repository

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/testutil"
)

// TestSimulationRepository_Reset is a regression test for the "Reset
// Simulation" button, which used to be entirely fake (a console.log with
// a TODO) despite its confirm dialog claiming to clear vessels,
// shipments, and routes. This proves the real implementation actually
// does that, and - just as importantly - that a reset vessel doesn't
// get immediately flagged DISTRESS again on the simulator's next tick
// (the engine's fuel-burn/distress logic only runs for AT_SEA vessels,
// so landing a reset vessel on DOCKED with full fuel must hold).
func TestSimulationRepository_Reset(t *testing.T) {
	db := testutil.RequireDB(t)
	pool := db.GetPool()
	ctx := context.Background()

	var portIDs []string
	rows, err := pool.Query(ctx, `SELECT id FROM ports LIMIT 2`)
	if err != nil {
		t.Fatalf("failed to fetch port ids: %v", err)
	}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			t.Fatalf("failed to scan port id: %v", err)
		}
		portIDs = append(portIDs, id)
	}
	rows.Close()
	if len(portIDs) < 2 {
		t.Skip("need at least 2 seeded ports for this test")
	}
	originID, destID := portIDs[0], portIDs[1]

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())

	vesselRepo := NewVesselRepository(pool)
	vessel := &models.Vessel{
		Name: "Test Reset Vessel " + suffix, IMONumber: "IMOTEST" + suffix[len(suffix)-6:],
		FlagCountry: "XX", Type: "CONTAINER", Status: "AT_SEA",
		Latitude: 1, Longitude: 1, SpeedKnots: 15, Heading: 90,
	}
	if err := vesselRepo.Create(ctx, vessel); err != nil {
		t.Fatalf("create vessel: %v", err)
	}

	routeRepo := NewRouteRepository(db)
	geoJSON := []byte(`{"type":"LineString","coordinates":[[1,1],[2,2]]}`)
	routeID, err := routeRepo.Create(ctx, "Test Reset Route "+suffix, originID, destID, geoJSON)
	if err != nil {
		t.Fatalf("create route: %v", err)
	}
	// Cleanup order matters if the test fails before Reset() runs: the
	// vessel (which references this route) must be deleted first, or
	// the route delete hits the same FK restrict Reset() itself has to
	// work around. t.Cleanup runs LIFO, so register the route's cleanup
	// before the vessel's.
	t.Cleanup(func() { pool.Exec(ctx, `DELETE FROM routes WHERE id = $1`, routeID) })
	t.Cleanup(func() { vesselRepo.Delete(ctx, vessel.ID) })

	// Simulate a vessel mid-voyage with burned fuel and accumulated
	// totals - exactly the state Reset is supposed to clear.
	if _, err := pool.Exec(ctx, `
		UPDATE vessels SET current_route_id = $1, route_progress = 0.4,
			fuel_level = fuel_capacity * 0.3, total_fuel_consumed_tons = 50, total_distance_nm = 800
		WHERE id = $2
	`, routeID, vessel.ID); err != nil {
		t.Fatalf("simulate mid-voyage state: %v", err)
	}

	shipmentRepo := NewShipmentRepository(db)
	shipment := &models.Shipment{
		TrackingNumber: "TEST-RESET-" + suffix, CustomerName: "Reset Test",
		OriginPortID: originID, DestinationPortID: destID,
		VesselID: &vessel.ID, WeightKG: 1000, Status: "IN_TRANSIT",
	}
	if err := shipmentRepo.Create(ctx, shipment); err != nil {
		t.Fatalf("create shipment: %v", err)
	}
	t.Cleanup(func() { shipmentRepo.Delete(ctx, shipment.ID) })

	simRepo := NewSimulationRepository(db)
	if err := simRepo.Reset(ctx); err != nil {
		t.Fatalf("Reset(): %v", err)
	}

	// Shipment must be gone.
	if _, err := shipmentRepo.GetByTrackingNumber(ctx, shipment.TrackingNumber); err == nil {
		t.Error("expected shipment to be deleted by Reset(), but it still exists")
	}

	// Route must be gone.
	var routeCount int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM routes WHERE id = $1`, routeID).Scan(&routeCount); err != nil {
		t.Fatalf("count routes: %v", err)
	}
	if routeCount != 0 {
		t.Errorf("expected route to be deleted by Reset(), found %d", routeCount)
	}

	// Vessel must be back to idle, full fuel, zeroed cumulative totals.
	v, err := vesselRepo.GetByID(ctx, vessel.ID)
	if err != nil {
		t.Fatalf("GetByID(vessel) after reset: %v", err)
	}
	if v.Status != "DOCKED" {
		t.Errorf("Status = %q, want DOCKED", v.Status)
	}
	if v.CurrentRouteID != nil {
		t.Errorf("CurrentRouteID = %v, want nil", *v.CurrentRouteID)
	}
	if v.RouteProgress != 0 {
		t.Errorf("RouteProgress = %v, want 0", v.RouteProgress)
	}
	if v.FuelLevel != v.FuelCapacity {
		t.Errorf("FuelLevel = %v, want full (%v)", v.FuelLevel, v.FuelCapacity)
	}
	if v.TotalFuelConsumedTons != 0 || v.TotalDistanceNM != 0 {
		t.Errorf("cumulative totals = %v/%v, want 0/0", v.TotalFuelConsumedTons, v.TotalDistanceNM)
	}
}
