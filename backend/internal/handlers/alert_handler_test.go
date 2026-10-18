package handlers

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/Oblutack/NeptuneShipments/backend/internal/testutil"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type alertTestEnv struct {
	app      *fiber.App
	repo     *repository.AlertRepository
	vesselID string
	name     string
	adminID  string
}

// newAlertTestEnv wires the real handler over a real database, with a
// throwaway vessel and admin user. Every alert the test creates carries a
// unique vessel name so cleanup and assertions never touch real alerts.
func newAlertTestEnv(t *testing.T) *alertTestEnv {
	t.Helper()
	db := testutil.RequireDB(t)
	ctx := context.Background()
	suffix := testutil.UniqueSuffix()

	vessels := repository.NewVesselRepository(db.GetPool())
	vessel := &models.Vessel{Name: "Alert Handler Vessel " + suffix, IMONumber: "IMOALH" + suffix[len(suffix)-5:],
		FlagCountry: "XX", Type: "CONTAINER", Status: "DOCKED", Latitude: 1, Longitude: 1}
	if err := vessels.Create(ctx, vessel); err != nil {
		t.Fatalf("create vessel: %v", err)
	}
	t.Cleanup(func() { vessels.Delete(ctx, vessel.ID) })

	admin := &models.User{Email: "test-alert-admin-" + suffix + "@example.com", PasswordHash: "x", FullName: "Admin", Role: "ADMIN"}
	if err := repository.NewUserRepository(db, nil).Create(ctx, admin); err != nil {
		t.Fatalf("create admin: %v", err)
	}
	t.Cleanup(func() { db.GetPool().Exec(ctx, `DELETE FROM users WHERE id = $1`, admin.ID) })
	t.Cleanup(func() {
		db.GetPool().Exec(ctx, `DELETE FROM alerts WHERE vessel_name = $1`, "Alert Handler Vessel "+suffix)
	})

	repo := repository.NewAlertRepository(db)
	h := NewAlertHandler(repo)
	app := fiber.New()
	asAdmin := func(c *fiber.Ctx) error {
		c.Locals("user", jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"user_id": admin.ID, "role": "ADMIN"}))
		return c.Next()
	}
	app.Get("/alerts", asAdmin, h.GetAlerts)
	app.Post("/alerts/:id/ack", asAdmin, h.AcknowledgeAlert)

	return &alertTestEnv{app: app, repo: repo, vesselID: vessel.ID, name: "Alert Handler Vessel " + suffix, adminID: admin.ID}
}

func (e *alertTestEnv) raise(t *testing.T, level, kind string) *models.Alert {
	t.Helper()
	a, err := e.repo.Create(context.Background(), repository.CreateAlertParams{
		VesselID: e.vesselID, VesselName: e.name, Level: level, Kind: kind, Message: kind + " " + e.name})
	if err != nil || a == nil {
		t.Fatalf("create %s/%s alert: %v, %v", level, kind, a, err)
	}
	return a
}

func (e *alertTestEnv) do(t *testing.T, method, path string) (int, []byte) {
	t.Helper()
	resp, err := e.app.Test(httptest.NewRequest(method, path, nil), -1)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, body
}

func (e *alertTestEnv) mine(t *testing.T, body []byte) []models.Alert {
	t.Helper()
	var all []models.Alert
	if err := json.Unmarshal(body, &all); err != nil {
		t.Fatalf("response isn't a JSON array of alerts: %v\n%s", err, body)
	}
	var out []models.Alert
	for _, a := range all {
		if a.VesselName == e.name {
			out = append(out, a)
		}
	}
	return out
}

func TestGetAlerts_OpenByDefaultAndAllOnRequest(t *testing.T) {
	e := newAlertTestEnv(t)
	seen := e.raise(t, "INFO", "ARRIVED")
	e.raise(t, "CRITICAL", "OUT_OF_FUEL")
	if _, err := e.repo.Acknowledge(context.Background(), seen.ID, e.adminID); err != nil {
		t.Fatalf("acknowledge: %v", err)
	}

	status, body := e.do(t, "GET", "/alerts?limit=200")
	if status != http.StatusOK {
		t.Fatalf("GET /alerts = %d: %s", status, body)
	}
	if open := e.mine(t, body); len(open) != 1 || open[0].Kind != "OUT_OF_FUEL" {
		t.Errorf("default listing = %+v, want only the unacknowledged OUT_OF_FUEL", open)
	}

	_, body = e.do(t, "GET", "/alerts?status=all&limit=200")
	if all := e.mine(t, body); len(all) != 2 {
		t.Errorf("status=all returned %d of this test's alerts, want 2", len(all))
	}

	_, body = e.do(t, "GET", "/alerts?status=all&limit=1")
	var one []models.Alert
	json.Unmarshal(body, &one)
	if len(one) != 1 {
		t.Errorf("limit=1 returned %d alerts", len(one))
	}
}

func TestGetAlerts_RejectsBadParameters(t *testing.T) {
	e := newAlertTestEnv(t)
	for _, path := range []string{"/alerts?status=bogus", "/alerts?limit=0", "/alerts?limit=-3", "/alerts?limit=abc"} {
		if status, _ := e.do(t, "GET", path); status != http.StatusBadRequest {
			t.Errorf("GET %s = %d, want 400", path, status)
		}
	}
	// A huge limit is capped, not an error.
	if status, _ := e.do(t, "GET", "/alerts?limit=99999999"); status != http.StatusOK {
		t.Errorf("GET /alerts?limit=99999999 = %d, want 200 (capped)", status)
	}
}

func TestAcknowledgeAlert(t *testing.T) {
	e := newAlertTestEnv(t)
	alert := e.raise(t, "CRITICAL", "OUT_OF_FUEL")

	status, body := e.do(t, "POST", "/alerts/"+alert.ID+"/ack")
	if status != http.StatusOK {
		t.Fatalf("ack = %d: %s", status, body)
	}
	var got models.Alert
	json.Unmarshal(body, &got)
	if got.AcknowledgedAt == nil || got.AcknowledgedBy == nil || *got.AcknowledgedBy != e.adminID {
		t.Errorf("acknowledged by/at = %v / %v, want the requesting admin (taken from the token) and a time", got.AcknowledgedBy, got.AcknowledgedAt)
	}

	if status, _ := e.do(t, "POST", "/alerts/"+alert.ID+"/ack"); status != http.StatusOK {
		t.Errorf("acknowledging twice = %d, want 200 (idempotent)", status)
	}

	for _, id := range []string{"00000000-0000-0000-0000-000000000000", "not-a-uuid"} {
		status, body := e.do(t, "POST", "/alerts/"+id+"/ack")
		if status != http.StatusNotFound || !strings.Contains(string(body), "Alert not found") {
			t.Errorf("ack of %q = %d %s, want 404 'Alert not found' (and never a 500)", id, status, body)
		}
	}
}
