package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/Oblutack/NeptuneShipments/backend/internal/testutil"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// TestCreateShipment_ClientCannotDispatchAVessel is a regression test for
// a real access-control bug: CreateShipment used to let ANY authenticated
// user - including a CLIENT - supply an arbitrary vessel_id and trigger
// real dispatch side effects (AssignRoute sets the vessel AT_SEA,
// refuels it, and recalculates its route via pgRouting). A client
// account could effectively command any vessel in the fleet. The fix:
// a CLIENT's booking always starts unassigned (PENDING, no vessel),
// and customer_user_id is taken from the verified JWT, never the
// request body, so this test also would catch customer_user_id spoofing.
func TestCreateShipment_ClientCannotDispatchAVessel(t *testing.T) {
	db := testutil.RequireDB(t)
	ctx := context.Background()

	portRepo := repository.NewPortRepository(db)
	vesselRepo := repository.NewVesselRepository(db.GetPool())
	shipmentRepo := repository.NewShipmentRepository(db)
	eventRepo := repository.NewShipmentEventRepository(db)
	routingRepo := repository.NewRoutingRepository(db)
	routeRepo := repository.NewRouteRepository(db)
	userRepo := repository.NewUserRepository(db)

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())

	// customer_user_id is a real FK to users(id), so the "client" in this
	// test needs to be a real row, not an arbitrary string.
	client := &models.User{Email: "test-client-" + suffix + "@example.com", PasswordHash: "x", FullName: "Test Client", CompanyName: "Test Co", Role: "CLIENT"}
	if err := userRepo.Create(ctx, client); err != nil {
		t.Fatalf("create client user: %v", err)
	}
	t.Cleanup(func() { db.GetPool().Exec(ctx, `DELETE FROM users WHERE id = $1`, client.ID) })

	// Reuse two existing seeded ports rather than creating throwaway ones
	// - origin/destination are never actually looked up in this test's
	// code path (the vessel stays nil, so CreateShipment's routing block
	// never runs), and un_locode is only varchar(5), too narrow to
	// reliably generate a unique one per test run.
	var portIDs []string
	rows, err := db.GetPool().Query(ctx, `SELECT id FROM ports LIMIT 2`)
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

	vessel := &models.Vessel{
		Name: "Test Vessel " + suffix, IMONumber: "IMOTEST" + suffix[len(suffix)-6:],
		FlagCountry: "XX", Type: "CONTAINER", Status: "DOCKED",
		Latitude: 1, Longitude: 1,
	}
	if err := vesselRepo.Create(ctx, vessel); err != nil {
		t.Fatalf("create vessel: %v", err)
	}
	t.Cleanup(func() { vesselRepo.Delete(ctx, vessel.ID) })

	h := NewShipmentHandler(shipmentRepo, portRepo, routingRepo, routeRepo, vesselRepo, eventRepo, nil)

	app := fiber.New()
	app.Post("/shipments", func(c *fiber.Ctx) error {
		// Simulates the jwtware middleware having already validated a
		// real CLIENT token, the same shape currentUserRoleAndID reads.
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"user_id": client.ID,
			"role":    "CLIENT",
		})
		c.Locals("user", token)
		return h.CreateShipment(c)
	})

	body, _ := json.Marshal(map[string]any{
		"tracking_number":     "TEST-CLIENT-DISPATCH-" + suffix,
		"customer_name":       "Attempted Spoof Inc",
		"origin_port_id":      originID,
		"destination_port_id": destID,
		"weight_kg":           1000,
		"vessel_id":           vessel.ID,                              // attempting to dispatch a specific vessel
		"customer_user_id":    "00000000-0000-0000-0000-000000000099", // attempting to spoof ownership to a different account
	})

	req := httptest.NewRequest("POST", "/shipments", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		t.Fatalf("status = %d, want 201, body = %s", resp.StatusCode, respBody)
	}

	var got models.Shipment
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	t.Cleanup(func() { shipmentRepo.Delete(ctx, got.ID) })

	if got.VesselID != nil {
		t.Errorf("VesselID = %v, want nil - a CLIENT booking must never dispatch a vessel directly", *got.VesselID)
	}
	if got.Status != "PENDING" {
		t.Errorf("Status = %q, want PENDING", got.Status)
	}
	if got.CustomerUserID == nil || *got.CustomerUserID != client.ID {
		t.Errorf("CustomerUserID = %v, want the requester's own JWT user_id (not the spoofed value from the body)", got.CustomerUserID)
	}

	// The vessel itself must be untouched - no dispatch side effects.
	v, err := vesselRepo.GetByID(ctx, vessel.ID)
	if err != nil {
		t.Fatalf("GetByID(vessel): %v", err)
	}
	if v.Status != "DOCKED" {
		t.Errorf("vessel status = %q, want unchanged DOCKED (a client booking must not dispatch it)", v.Status)
	}
}
