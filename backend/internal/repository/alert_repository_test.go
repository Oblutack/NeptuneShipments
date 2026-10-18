package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/testutil"
)

// alertFixture is a throwaway vessel plus a unique name to scope every
// alert a test creates, so cleanup (and assertions) never touch real
// alerts in a shared dev database.
type alertFixture struct {
	repo     *AlertRepository
	vesselID string
	name     string
}

func newAlertFixture(t *testing.T) *alertFixture {
	t.Helper()
	db := testDB(t)
	ctx := context.Background()
	suffix := testutil.UniqueSuffix()

	vessels := NewVesselRepository(db.GetPool())
	v := newThrowawayVessel(t, vessels, "IMOALT"+suffix[len(suffix)-5:])
	name := "Test Alert Vessel " + suffix
	f := &alertFixture{repo: NewAlertRepository(db), vesselID: v.ID, name: name}

	// Registered after the vessel's own deletion so (LIFO) alerts go first.
	t.Cleanup(func() { vessels.Delete(ctx, v.ID) })
	t.Cleanup(func() { db.GetPool().Exec(ctx, `DELETE FROM alerts WHERE vessel_name = $1`, name) })
	return f
}

func (f *alertFixture) create(t *testing.T, level, kind string) *models.Alert {
	t.Helper()
	a, err := f.repo.Create(context.Background(), CreateAlertParams{
		VesselID: f.vesselID, VesselName: f.name, Level: level, Kind: kind, Message: kind + " for " + f.name,
	})
	if err != nil {
		t.Fatalf("Create(%s/%s): %v", level, kind, err)
	}
	return a
}

// mine filters a listing down to this test's own alerts.
func (f *alertFixture) mine(alerts []models.Alert) []models.Alert {
	var out []models.Alert
	for _, a := range alerts {
		if a.VesselName == f.name {
			out = append(out, a)
		}
	}
	return out
}

// A stranded vessel makes the engine try to raise "out of fuel" on every
// tick. The database - not memory - must collapse those into one alert, and
// must let the same fault be raised again once it has been resolved.
func TestAlertRepository_OpenConditionsAreNotDuplicated(t *testing.T) {
	f := newAlertFixture(t)
	ctx := context.Background()

	first := f.create(t, "CRITICAL", "OUT_OF_FUEL")
	if first == nil || first.ResolvedAt != nil || first.AcknowledgedAt != nil {
		t.Fatalf("first alert = %+v, want a new open, unacknowledged alert", first)
	}
	if dup := f.create(t, "CRITICAL", "OUT_OF_FUEL"); dup != nil {
		t.Errorf("a second open OUT_OF_FUEL for the same vessel was stored (%+v), want it suppressed", dup)
	}
	if other := f.create(t, "CRITICAL", "MECHANICAL_FAILURE"); other == nil {
		t.Error("a different kind of condition on the same vessel was suppressed, want it recorded")
	}

	// The fixture vessel is DISTRESS-free (DOCKED), so its conditions are over.
	if _, err := f.repo.ResolveForRecoveredVessels(ctx); err != nil {
		t.Fatalf("ResolveForRecoveredVessels: %v", err)
	}
	if again := f.create(t, "CRITICAL", "OUT_OF_FUEL"); again == nil {
		t.Error("after resolving, the same fault could not be raised again")
	}
}

// Resolution follows the vessel's state: while it is still in DISTRESS its
// alerts stay open, and once it leaves DISTRESS by any route they close.
func TestAlertRepository_ResolvesOnlyOnceTheVesselLeavesDistress(t *testing.T) {
	f := newAlertFixture(t)
	db := testDB(t)
	ctx := context.Background()
	setStatus := func(status string) {
		if _, err := db.GetPool().Exec(ctx, `UPDATE vessels SET status = $1 WHERE id = $2`, status, f.vesselID); err != nil {
			t.Fatalf("set status: %v", err)
		}
	}
	isOpen := func(id string) bool {
		var open bool
		db.GetPool().QueryRow(ctx, `SELECT resolved_at IS NULL FROM alerts WHERE id = $1`, id).Scan(&open)
		return open
	}

	setStatus("DISTRESS")
	alert := f.create(t, "CRITICAL", "OUT_OF_FUEL")
	if _, err := f.repo.ResolveForRecoveredVessels(ctx); err != nil {
		t.Fatalf("ResolveForRecoveredVessels: %v", err)
	}
	if !isOpen(alert.ID) {
		t.Fatal("the alert was closed while its vessel is still in DISTRESS")
	}

	setStatus("AT_SEA") // what a refuel does
	if _, err := f.repo.ResolveForRecoveredVessels(ctx); err != nil {
		t.Fatalf("ResolveForRecoveredVessels: %v", err)
	}
	if isOpen(alert.ID) {
		t.Error("the alert is still open although its vessel left DISTRESS")
	}
}

// Events are not conditions: a vessel that arrives twice has arrived twice.
// The old in-memory dedupe keyed on (level, vessel) and so silently dropped
// every arrival after the first until the vessel next recovered from
// distress.
func TestAlertRepository_EventsAreAlwaysRecorded(t *testing.T) {
	f := newAlertFixture(t)

	first, second := f.create(t, "INFO", "ARRIVED"), f.create(t, "INFO", "ARRIVED")
	if first == nil || second == nil {
		t.Fatalf("arrival alerts = %v, %v; want both recorded", first, second)
	}
	if first.ResolvedAt == nil || second.ResolvedAt == nil {
		t.Error("an INFO event should be stored already resolved - there is nothing to resolve")
	}
	if first.ID == second.ID {
		t.Error("both arrivals share an id")
	}
}

func TestAlertRepository_Acknowledge(t *testing.T) {
	f := newAlertFixture(t)
	db := testDB(t)
	ctx := context.Background()
	users := NewUserRepository(db, nil)

	mkUser := func(name string) *models.User {
		u := &models.User{Email: "test-ack-" + name + "-" + testutil.UniqueSuffix() + "@example.com", PasswordHash: "x", FullName: name, Role: "ADMIN"}
		if err := users.Create(ctx, u); err != nil {
			t.Fatalf("create user: %v", err)
		}
		t.Cleanup(func() { db.GetPool().Exec(ctx, `DELETE FROM users WHERE id = $1`, u.ID) })
		return u
	}
	alice, bob := mkUser("alice"), mkUser("bob")

	alert := f.create(t, "CRITICAL", "OUT_OF_FUEL")
	got, err := f.repo.Acknowledge(ctx, alert.ID, alice.ID)
	if err != nil {
		t.Fatalf("Acknowledge: %v", err)
	}
	if got.AcknowledgedAt == nil || got.AcknowledgedBy == nil || *got.AcknowledgedBy != alice.ID {
		t.Errorf("acknowledged by/at = %v / %v, want alice and a time", got.AcknowledgedBy, got.AcknowledgedAt)
	}
	if got.ResolvedAt != nil {
		t.Error("acknowledging must not resolve the condition - the vessel is still stranded")
	}

	// A second acknowledgement is harmless and keeps the first.
	again, err := f.repo.Acknowledge(ctx, alert.ID, bob.ID)
	if err != nil || *again.AcknowledgedBy != alice.ID || !again.AcknowledgedAt.Equal(*got.AcknowledgedAt) {
		t.Errorf("second ack = %+v, err %v; want the first acknowledgement kept", again, err)
	}

	// Unknown and malformed ids are both "not found", never a 500.
	for _, id := range []string{"00000000-0000-0000-0000-000000000000", "not-a-uuid", ""} {
		if _, err := f.repo.Acknowledge(ctx, id, alice.ID); !errors.Is(err, ErrAlertNotFound) {
			t.Errorf("Acknowledge(%q) error = %v, want ErrAlertNotFound", id, err)
		}
	}
}

func TestAlertRepository_ListFiltersAndOrders(t *testing.T) {
	f := newAlertFixture(t)
	ctx := context.Background()

	arrived := f.create(t, "INFO", "ARRIVED")          // oldest, an event
	stranded := f.create(t, "CRITICAL", "OUT_OF_FUEL") // open condition
	recovered := f.create(t, "INFO", "RECOVERED")      // newest
	if _, err := f.repo.Acknowledge(ctx, arrived.ID, ""); err != nil {
		t.Fatalf("Acknowledge: %v", err)
	}

	all, err := f.repo.List(ctx, false, 500)
	if err != nil {
		t.Fatalf("List(all): %v", err)
	}
	got := f.mine(all)
	if len(got) != 3 {
		t.Fatalf("List(all) returned %d of this test's alerts, want 3", len(got))
	}
	// Unresolved CRITICAL first, then newest first.
	if got[0].ID != stranded.ID || got[1].ID != recovered.ID || got[2].ID != arrived.ID {
		t.Errorf("order = %s, %s, %s; want the open CRITICAL first, then newest first", got[0].Kind, got[1].Kind, got[2].Kind)
	}

	open, err := f.repo.List(ctx, true, 500)
	if err != nil {
		t.Fatalf("List(open): %v", err)
	}
	if mine := f.mine(open); len(mine) != 2 {
		t.Errorf("List(open) returned %d of this test's alerts, want 2 (the acknowledged one excluded)", len(mine))
	}

	limited, err := f.repo.List(ctx, false, 1)
	if err != nil || len(limited) != 1 {
		t.Errorf("List(limit 1) = %d rows, err %v; want exactly 1", len(limited), err)
	}
}

// History must survive its vessel being deleted: the vessel link is
// cleared, the name snapshot keeps it readable.
func TestAlertRepository_SurvivesVesselDeletion(t *testing.T) {
	f := newAlertFixture(t)
	db := testDB(t)
	ctx := context.Background()

	alert := f.create(t, "INFO", "ARRIVED")
	if err := NewVesselRepository(db.GetPool()).Delete(ctx, f.vesselID); err != nil {
		t.Fatalf("delete vessel: %v", err)
	}

	all, err := f.repo.List(ctx, false, 500)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	for _, a := range all {
		if a.ID == alert.ID {
			if a.VesselID != nil || a.VesselName != f.name {
				t.Errorf("after vessel deletion: vessel_id = %v, name = %q; want nil and the original name", a.VesselID, a.VesselName)
			}
			return
		}
	}
	t.Error("the alert vanished when its vessel was deleted")
}
