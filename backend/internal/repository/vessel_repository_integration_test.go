package repository

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/joho/godotenv"
)

// These are integration tests against a real Postgres database - they
// exercise the exact bugs found and fixed in VesselRepository.Update and
// .Delete (wrong column names, a routes.vessel_id column that doesn't
// exist, an invalid shipment_status enum literal). A mocked DB wouldn't
// have caught any of those, since the bugs were in the SQL itself.
//
// Skips (not fails) when no database is reachable, so `go test ./...`
// still works without Postgres running - see testDB below.

func testDB(t *testing.T) *database.Service {
	t.Helper()
	_ = godotenv.Load("../../.env") // backend/.env, relative to this package
	if os.Getenv("DB_URL") == "" {
		t.Skip("DB_URL not set - skipping integration test (needs a running Postgres)")
	}
	db, err := database.New()
	if err != nil {
		t.Skipf("could not connect to database: %v", err)
	}
	return db
}

// twoRealPortIDs fetches two distinct existing ports to satisfy shipments'
// NOT NULL foreign keys - simpler and more realistic than inserting fake
// ports just for this test.
func twoRealPortIDs(t *testing.T, db *database.Service) (string, string) {
	t.Helper()
	rows, err := db.GetPool().Query(context.Background(), `SELECT id FROM ports LIMIT 2`)
	if err != nil {
		t.Fatalf("failed to fetch port ids: %v", err)
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			t.Fatalf("failed to scan port id: %v", err)
		}
		ids = append(ids, id)
	}
	if len(ids) < 2 {
		t.Skip("need at least 2 seeded ports for this test")
	}
	return ids[0], ids[1]
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
		TrackingNumber:     "TRK-INTEGRATION-TEST-0002",
		CustomerName:       "Integration Test",
		OriginPortID:       originID,
		DestinationPortID:  destID,
		VesselID:           &v.ID,
		Status:             "PENDING",
		ManifestItems:      models.ManifestItems{},
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
		Name:        "Integration Test Bulk Vessel",
		IMONumber:   "IMOTEST0004",
		FlagCountry: "GB",
		Type:        "CONTAINER",
		Status:      "DOCKED",
		Latitude:    1,
		Longitude:   1,
		FuelLevel:   50,
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
