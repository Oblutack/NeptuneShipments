package repository

import (
	"context"
	"math"
	"strings"
	"testing"
	"time"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/testutil"
)

// These are integration tests against a real Postgres database - they
// exercise the exact bugs found and fixed in VesselRepository.Update and
// .Delete (wrong column names, a routes.vessel_id column that doesn't
// exist, an invalid shipment_status enum literal). A mocked DB wouldn't
// have caught any of those, since the bugs were in the SQL itself.
//
// Skips (not fails) when no database is reachable, so `go test ./...`
// still works without Postgres running - see testutil.RequireDB.

func testDB(t *testing.T) *database.Service {
	return testutil.RequireDB(t)
}

// twoRealPortIDs fetches two distinct existing ports to satisfy shipments'
// NOT NULL foreign keys - simpler and more realistic than inserting fake
// ports just for this test.
func twoRealPortIDs(t *testing.T, db *database.Service) (string, string) {
	t.Helper()
	id1, id2, _, _, _, _ := testutil.TwoRealPorts(t, db.GetPool())
	return id1, id2
}

func newThrowawayVessel(t *testing.T, repo *VesselRepository, imo string) *models.Vessel {
	t.Helper()
	v := &models.Vessel{
		Name:        "Integration Test Vessel",
		IMONumber:   imo,
		FlagCountry: "XX",
		Type:        "CONTAINER",
		Status:      "DOCKED",
		Latitude:    1,
		Longitude:   1,
	}
	if err := repo.Create(context.Background(), v); err != nil {
		t.Fatalf("failed to create throwaway vessel: %v", err)
	}
	return v
}

func TestVesselRepository_Delete_SucceedsWithNoDependencies(t *testing.T) {
	db := testDB(t)
	repo := NewVesselRepository(db.GetPool())
	v := newThrowawayVessel(t, repo, "IMOTEST0001")

	if err := repo.Delete(context.Background(), v.ID); err != nil {
		t.Errorf("Delete() with no dependencies = %v, want nil", err)
	}
}

func TestVesselRepository_Delete_BlocksOnActiveShipment(t *testing.T) {
	db := testDB(t)
	repo := NewVesselRepository(db.GetPool())
	shipmentRepo := NewShipmentRepository(db)
	v := newThrowawayVessel(t, repo, "IMOTEST0002")
	originID, destID := twoRealPortIDs(t, db)

	shipment := &models.Shipment{
		TrackingNumber:    "TRK-INTEGRATION-TEST-0002",
		CustomerName:      "Integration Test",
		OriginPortID:      originID,
		DestinationPortID: destID,
		VesselID:          &v.ID,
		Status:            "PENDING",
		ManifestItems:     models.ManifestItems{},
	}
	if err := shipmentRepo.Create(context.Background(), shipment); err != nil {
		t.Fatalf("failed to create throwaway shipment: %v", err)
	}
	t.Cleanup(func() {
		db.GetPool().Exec(context.Background(), `DELETE FROM shipments WHERE id = $1`, shipment.ID)
		repo.Delete(context.Background(), v.ID)
	})

	err := repo.Delete(context.Background(), v.ID)
	if err == nil {
		t.Fatal("Delete() with an active shipment = nil error, want a blocking error")
	}
	if !strings.Contains(err.Error(), "active shipments") {
		t.Errorf("Delete() error = %q, want it to mention active shipments", err.Error())
	}
}

func TestVesselRepository_Update_SetsLastUpdated(t *testing.T) {
	db := testDB(t)
	repo := NewVesselRepository(db.GetPool())
	v := newThrowawayVessel(t, repo, "IMOTEST0003")
	t.Cleanup(func() { repo.Delete(context.Background(), v.ID) })

	before := time.Now().Add(-time.Second)
	v.Name = "Renamed Integration Test Vessel"
	v.Status = "ANCHORED"
	if err := repo.Update(context.Background(), v); err != nil {
		t.Fatalf("Update() = %v, want nil (this used to fail: UPDATE ... updated_at, but the real column is last_updated)", err)
	}
	if v.LastUpdated.Before(before) {
		t.Errorf("LastUpdated = %v, want a time after %v", v.LastUpdated, before)
	}

	got, err := repo.GetByID(context.Background(), v.ID)
	if err != nil {
		t.Fatalf("GetByID() after update = %v", err)
	}
	if got.Name != "Renamed Integration Test Vessel" || got.Status != "ANCHORED" {
		t.Errorf("GetByID() after update = %+v, want the renamed/ANCHORED values to have persisted", got)
	}
}

func TestVesselRepository_BulkCreate_SetsFlagCountry(t *testing.T) {
	db := testDB(t)
	repo := NewVesselRepository(db.GetPool())

	vessels := []models.Vessel{{
		Name:         "Integration Test Bulk Vessel",
		IMONumber:    "IMOTEST0004",
		FlagCountry:  "GB",
		Type:         "CONTAINER",
		Status:       "DOCKED",
		Latitude:     1,
		Longitude:    1,
		FuelLevel:    50,
		FuelCapacity: 100,
	}}
	if err := repo.BulkCreate(context.Background(), vessels); err != nil {
		t.Fatalf("BulkCreate() = %v, want nil (this used to fail: flag_country is NOT NULL but was never inserted)", err)
	}
	t.Cleanup(func() {
		db.GetPool().Exec(context.Background(), `DELETE FROM vessels WHERE imo_number = $1`, "IMOTEST0004")
	})

	id, err := repo.GetIDByIMO(context.Background(), "IMOTEST0004")
	if err != nil {
		t.Fatalf("GetIDByIMO() = %v", err)
	}
	got, err := repo.GetByID(context.Background(), id)
	if err != nil {
		t.Fatalf("GetByID() = %v", err)
	}
	if got.FlagCountry != "GB" {
		t.Errorf("FlagCountry = %q, want %q", got.FlagCountry, "GB")
	}
}

// UpdateProgress places the vessel a given FRACTION of the way along its
// route. That fraction has to be of the route's real (geodesic) length, the
// same measure routes.length_nm and the simulator's distance maths use.
// Measured in degrees instead, a ship appears to speed up and slow down
// with latitude: on this path the planar midpoint is at latitude 60, the
// true geodesic midpoint near 44.6.
func TestVesselRepository_UpdateProgress_UsesGeodesicFraction(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	pool := db.GetPool()
	repo := NewVesselRepository(pool)
	suffix := testutil.UniqueSuffix()

	originID, destID := twoRealPortIDs(t, db)
	geoJSON := []byte(`{"type":"LineString","coordinates":[[0,0],[0,60],[60,60]]}`)
	routeID, err := NewRouteRepository(db).Create(ctx, "Test Geodesic Route "+suffix, originID, destID, geoJSON)
	if err != nil {
		t.Fatalf("create route: %v", err)
	}
	// Registered before the vessel's cleanup so (LIFO) the vessel goes first.
	t.Cleanup(func() { pool.Exec(ctx, `DELETE FROM routes WHERE id = $1`, routeID) })

	v := newThrowawayVessel(t, repo, "IMOTST"+suffix[len(suffix)-5:])
	t.Cleanup(func() { repo.Delete(ctx, v.ID) })
	if _, err := pool.Exec(ctx, `UPDATE vessels SET current_route_id = $1 WHERE id = $2`, routeID, v.ID); err != nil {
		t.Fatalf("put vessel on route: %v", err)
	}

	if err := repo.UpdateProgress(ctx, v.ID, 0.5, 100, 0, 0); err != nil {
		t.Fatalf("UpdateProgress: %v", err)
	}
	got, err := repo.GetByID(ctx, v.ID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.Latitude < 44 || got.Latitude > 45.3 || math.Abs(got.Longitude) > 0.01 {
		t.Errorf("position at 50%% = (%.2f, %.2f), want about (44.6, 0) - the geodesic midpoint, not the planar one at (60, 0)", got.Latitude, got.Longitude)
	}
	// 60 degrees of meridian (~3,606 nm) plus the great-circle leg from
	// (0,60) to (60,60) (~1,737 nm).
	if got.RouteLengthNM < 5300 || got.RouteLengthNM > 5400 {
		t.Errorf("RouteLengthNM = %.0f, want about 5,340 nm", got.RouteLengthNM)
	}
}
