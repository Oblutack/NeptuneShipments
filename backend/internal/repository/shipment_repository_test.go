package repository

import (
	"context"
	"testing"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/testutil"
)

// TestShipmentRepository_GetAllForCustomer_ScopesToOwnShipmentsOnly covers
// the access-control logic the client portal depends on: a CLIENT user
// must only ever get back shipments booked under their own account, never
// another customer's. This is a security boundary, not just a filter, so
// it's worth a real test against the real query rather than trusting it
// by inspection.
func TestShipmentRepository_GetAllForCustomer_ScopesToOwnShipmentsOnly(t *testing.T) {
	db := testutil.RequireDB(t)
	pool := db.GetPool()
	ctx := context.Background()

	portRepo := NewPortRepository(db)
	userRepo := NewUserRepository(db)
	shipmentRepo := NewShipmentRepository(db)

	suffix := testutil.UniqueSuffix()

	origin := &models.Port{Name: "Test Origin " + suffix, UnLocode: "TO" + suffix[len(suffix)-3:], Country: "XX", Latitude: 1, Longitude: 1}
	if err := portRepo.Create(ctx, origin); err != nil {
		t.Fatalf("create origin port: %v", err)
	}
	t.Cleanup(func() { portRepo.Delete(ctx, origin.ID) })

	dest := &models.Port{Name: "Test Dest " + suffix, UnLocode: "TD" + suffix[len(suffix)-3:], Country: "XX", Latitude: 2, Longitude: 2}
	if err := portRepo.Create(ctx, dest); err != nil {
		t.Fatalf("create dest port: %v", err)
	}
	t.Cleanup(func() { portRepo.Delete(ctx, dest.ID) })

	// UserRepository has no Delete method, so cleanup is a raw exec -
	// same pattern the existing vessel integration tests use for
	// entities without one.
	deleteUser := func(id string) {
		pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	}

	userA := &models.User{Email: "test-a-" + suffix + "@example.com", PasswordHash: "x", FullName: "A", CompanyName: "A Co", Role: "CLIENT"}
	if err := userRepo.Create(ctx, userA); err != nil {
		t.Fatalf("create user A: %v", err)
	}
	t.Cleanup(func() { deleteUser(userA.ID) })

	userB := &models.User{Email: "test-b-" + suffix + "@example.com", PasswordHash: "x", FullName: "B", CompanyName: "B Co", Role: "CLIENT"}
	if err := userRepo.Create(ctx, userB); err != nil {
		t.Fatalf("create user B: %v", err)
	}
	t.Cleanup(func() { deleteUser(userB.ID) })

	shipA := &models.Shipment{TrackingNumber: "TEST-A-" + suffix, CustomerName: "A", OriginPortID: origin.ID, DestinationPortID: dest.ID, WeightKG: 100, Status: "PENDING"}
	if err := shipmentRepo.Create(ctx, shipA); err != nil {
		t.Fatalf("create shipment A: %v", err)
	}
	t.Cleanup(func() { shipmentRepo.Delete(ctx, shipA.ID) })

	shipB := &models.Shipment{TrackingNumber: "TEST-B-" + suffix, CustomerName: "B", OriginPortID: origin.ID, DestinationPortID: dest.ID, WeightKG: 200, Status: "PENDING"}
	if err := shipmentRepo.Create(ctx, shipB); err != nil {
		t.Fatalf("create shipment B: %v", err)
	}
	t.Cleanup(func() { shipmentRepo.Delete(ctx, shipB.ID) })

	// There's no repository method to assign ownership (only the one-off
	// client-portal migration does this, for its demo account), so a raw
	// update is the correct way to set up this test's fixture.
	if _, err := pool.Exec(ctx, `UPDATE shipments SET customer_user_id = $1 WHERE id = $2`, userA.ID, shipA.ID); err != nil {
		t.Fatalf("assign shipment A to user A: %v", err)
	}
	if _, err := pool.Exec(ctx, `UPDATE shipments SET customer_user_id = $1 WHERE id = $2`, userB.ID, shipB.ID); err != nil {
		t.Fatalf("assign shipment B to user B: %v", err)
	}

	gotA, err := shipmentRepo.GetAllForCustomer(ctx, userA.ID)
	if err != nil {
		t.Fatalf("GetAllForCustomer(userA): %v", err)
	}
	if len(gotA) != 1 || gotA[0].TrackingNumber != shipA.TrackingNumber {
		t.Fatalf("expected user A to see only shipment A, got %+v", gotA)
	}

	gotB, err := shipmentRepo.GetAllForCustomer(ctx, userB.ID)
	if err != nil {
		t.Fatalf("GetAllForCustomer(userB): %v", err)
	}
	if len(gotB) != 1 || gotB[0].TrackingNumber != shipB.TrackingNumber {
		t.Fatalf("expected user B to see only shipment B, got %+v", gotB)
	}

	// A user with no shipments of their own gets an empty list, not
	// someone else's and not an error.
	userC := &models.User{Email: "test-c-" + suffix + "@example.com", PasswordHash: "x", FullName: "C", CompanyName: "C Co", Role: "CLIENT"}
	if err := userRepo.Create(ctx, userC); err != nil {
		t.Fatalf("create user C: %v", err)
	}
	t.Cleanup(func() { deleteUser(userC.ID) })
	gotC, err := shipmentRepo.GetAllForCustomer(ctx, userC.ID)
	if err != nil {
		t.Fatalf("GetAllForCustomer(userC): %v", err)
	}
	if len(gotC) != 0 {
		t.Fatalf("expected user C to see no shipments, got %+v", gotC)
	}
}
