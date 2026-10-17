package repository

import (
	"context"
	"regexp"
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
	userRepo := NewUserRepository(db, nil)
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

var trackingNumberFormat = regexp.MustCompile(`^NEP-[0-9A-HJKMNP-TV-Z]{10}$`)

func TestGenerateTrackingNumber_FormatAndUniqueness(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 2000; i++ {
		tn, err := GenerateTrackingNumber()
		if err != nil {
			t.Fatalf("GenerateTrackingNumber: %v", err)
		}
		if !trackingNumberFormat.MatchString(tn) {
			t.Fatalf("tracking number %q doesn't match NEP-<10 Crockford base32 chars>", tn)
		}
		if seen[tn] {
			t.Fatalf("duplicate tracking number %q in 2000 draws", tn)
		}
		seen[tn] = true
	}
}

// Create must issue a tracking number when it isn't given one, keep one it
// is given (the CSV importer's existing data), and a duplicate insert must
// be recognised as a tracking-number collision - that last check pins the
// real constraint name the retry logic keys on.
func TestShipmentRepository_Create_TrackingNumbers(t *testing.T) {
	db := testutil.RequireDB(t)
	ctx := context.Background()
	repo := NewShipmentRepository(db)
	originID, destID, _, _, _, _ := testutil.TwoRealPorts(t, db.GetPool())
	suffix := testutil.UniqueSuffix()

	mk := func(tracking string) *models.Shipment {
		return &models.Shipment{TrackingNumber: tracking, CustomerName: "Tracking Test",
			OriginPortID: originID, DestinationPortID: destID, WeightKG: 1}
	}

	generated := mk("")
	if err := repo.Create(ctx, generated); err != nil {
		t.Fatalf("Create with no tracking number: %v", err)
	}
	t.Cleanup(func() { repo.Delete(ctx, generated.ID) })
	if !trackingNumberFormat.MatchString(generated.TrackingNumber) {
		t.Errorf("generated tracking number = %q, want NEP-xxxxxxxxxx", generated.TrackingNumber)
	}

	explicit := mk("TEST-EXPLICIT-" + suffix)
	if err := repo.Create(ctx, explicit); err != nil {
		t.Fatalf("Create with explicit tracking number: %v", err)
	}
	t.Cleanup(func() { repo.Delete(ctx, explicit.ID) })
	if explicit.TrackingNumber != "TEST-EXPLICIT-"+suffix {
		t.Errorf("explicit tracking number was changed to %q", explicit.TrackingNumber)
	}

	err := repo.Create(ctx, mk("TEST-EXPLICIT-"+suffix))
	if err == nil {
		t.Fatal("inserting a duplicate tracking number succeeded, want a unique violation")
	}
	if !isTrackingNumberCollision(err) {
		t.Errorf("duplicate insert error %v isn't recognised as a tracking-number collision - the constraint name the retry logic matches on is wrong", err)
	}
}
