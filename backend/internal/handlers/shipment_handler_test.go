package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/Oblutack/NeptuneShipments/backend/internal/services"
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

	suffix := testutil.UniqueSuffix()

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
	originID, destID, _, _, _, _ := testutil.TwoRealPorts(t, db.GetPool())

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

// TestCreateShipment_AdminDispatchesVesselAndAutoRoutes exercises the
// full multi-step orchestration CreateShipment runs for an ADMIN booking
// with a vessel attached: port lookup -> pgRouting path calculation ->
// route persisted -> vessel assigned and dispatched -> shipment flipped
// to IN_TRANSIT. This had zero coverage before - the most complex
// handler-embedded logic in the app, spanning five repositories and
// several failure-return paths, was previously only ever checked by
// hand. Needs the real ocean_network pgRouting graph the seeder builds,
// so it skips (not fails) against a migrations-only database with no
// seed data, such as a bare CI run.
func TestCreateShipment_AdminDispatchesVesselAndAutoRoutes(t *testing.T) {
	db := testutil.RequireDB(t)
	ctx := context.Background()

	portRepo := repository.NewPortRepository(db)
	vesselRepo := repository.NewVesselRepository(db.GetPool())
	shipmentRepo := repository.NewShipmentRepository(db)
	eventRepo := repository.NewShipmentEventRepository(db)
	routingRepo := repository.NewRoutingRepository(db)
	routeRepo := repository.NewRouteRepository(db)

	suffix := testutil.UniqueSuffix()

	originID, destID, originLat, originLon, _, _ := testutil.TwoRealPorts(t, db.GetPool())

	vessel := &models.Vessel{
		Name: "Test Admin Vessel " + suffix, IMONumber: "IMOTEST" + suffix[len(suffix)-6:],
		FlagCountry: "XX", Type: "CONTAINER", Status: "DOCKED",
		Latitude: originLat, Longitude: originLon,
	}
	if err := vesselRepo.Create(ctx, vessel); err != nil {
		t.Fatalf("create vessel: %v", err)
	}
	t.Cleanup(func() { vesselRepo.Delete(ctx, vessel.ID) })

	h := NewShipmentHandler(shipmentRepo, portRepo, routingRepo, routeRepo, vesselRepo, eventRepo, nil)

	app := fiber.New()
	app.Post("/shipments", func(c *fiber.Ctx) error {
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"user_id": "admin-under-test-" + suffix,
			"role":    "ADMIN",
		})
		c.Locals("user", token)
		return h.CreateShipment(c)
	})

	body, _ := json.Marshal(map[string]any{
		"tracking_number":     "TEST-ADMIN-ROUTE-" + suffix,
		"customer_name":       "Admin Route Test",
		"origin_port_id":      originID,
		"destination_port_id": destID,
		"weight_kg":           2000,
		"vessel_id":           vessel.ID,
	})

	req := httptest.NewRequest("POST", "/shipments", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode == fiber.StatusBadGateway {
		t.Skipf("routing failed (likely no ocean_network graph in this database): %s", respBody)
	}
	if resp.StatusCode != fiber.StatusCreated {
		t.Fatalf("status = %d, want 201, body = %s", resp.StatusCode, respBody)
	}

	var got models.Shipment
	if err := json.Unmarshal(respBody, &got); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	t.Cleanup(func() { shipmentRepo.Delete(ctx, got.ID) })
	t.Cleanup(func() {
		// The route must be unlinked from the vessel before it can be
		// deleted (vessels.current_route_id has no ON DELETE action).
		v, err := vesselRepo.GetByID(ctx, vessel.ID)
		if err != nil || v.CurrentRouteID == nil {
			return
		}
		routeID := *v.CurrentRouteID
		db.GetPool().Exec(ctx, `UPDATE vessels SET current_route_id = NULL WHERE id = $1`, vessel.ID)
		db.GetPool().Exec(ctx, `DELETE FROM routes WHERE id = $1`, routeID)
	})

	if got.Status != "IN_TRANSIT" {
		t.Errorf("Status = %q, want IN_TRANSIT", got.Status)
	}
	if got.VesselID == nil || *got.VesselID != vessel.ID {
		t.Errorf("VesselID = %v, want %q", got.VesselID, vessel.ID)
	}

	v, err := vesselRepo.GetByID(ctx, vessel.ID)
	if err != nil {
		t.Fatalf("GetByID(vessel) after dispatch: %v", err)
	}
	if v.Status != "AT_SEA" {
		t.Errorf("vessel status = %q, want AT_SEA (dispatched)", v.Status)
	}
	if v.CurrentRouteID == nil {
		t.Error("vessel CurrentRouteID = nil, want a real route assigned")
	}
	if v.FuelLevel != v.FuelCapacity {
		t.Errorf("vessel FuelLevel = %v, want full (%v) - AssignRoute refuels on dispatch", v.FuelLevel, v.FuelCapacity)
	}

	events, err := eventRepo.GetByShipmentID(ctx, got.ID)
	if err != nil {
		t.Fatalf("GetByShipmentID: %v", err)
	}
	var hasBooked, hasDeparted bool
	for _, e := range events {
		if e.EventType == "BOOKED" {
			hasBooked = true
		}
		if e.EventType == "DEPARTED" {
			hasDeparted = true
		}
	}
	if !hasBooked || !hasDeparted {
		t.Errorf("shipment events = %+v, want both a BOOKED and a DEPARTED event", events)
	}
}

// TestGetShipmentByTracking_PublicResponseLeaksNothingPrivate is a
// regression test for the unauthenticated tracking endpoint returning the
// whole shipment record - customer name, account id, and every manifest
// line with its value and dangerous-goods class - to anyone who could
// guess or be handed a tracking number. It must expose only what
// following a shipment needs.
func TestGetShipmentByTracking_PublicResponseLeaksNothingPrivate(t *testing.T) {
	db := testutil.RequireDB(t)
	ctx := context.Background()

	portRepo := repository.NewPortRepository(db)
	vesselRepo := repository.NewVesselRepository(db.GetPool())
	shipmentRepo := repository.NewShipmentRepository(db)
	eventRepo := repository.NewShipmentEventRepository(db)
	routingRepo := repository.NewRoutingRepository(db)
	routeRepo := repository.NewRouteRepository(db)
	userRepo := repository.NewUserRepository(db)

	suffix := testutil.UniqueSuffix()
	owner := &models.User{Email: "test-owner-" + suffix + "@example.com", PasswordHash: "x", FullName: "Owner", CompanyName: "Secret Co", Role: "CLIENT"}
	if err := userRepo.Create(ctx, owner); err != nil {
		t.Fatalf("create owner: %v", err)
	}
	t.Cleanup(func() { db.GetPool().Exec(ctx, `DELETE FROM users WHERE id = $1`, owner.ID) })

	originID, destID, _, _, _, _ := testutil.TwoRealPorts(t, db.GetPool())
	shipment := &models.Shipment{
		TrackingNumber: "TEST-PUBLIC-" + suffix, CustomerName: "Highly Confidential Customer",
		OriginPortID: originID, DestinationPortID: destID,
		CustomerUserID: &owner.ID, WeightKG: 1234, Status: "PENDING",
		ContainerNumber: "MSKU1234567",
		ManifestItems: models.ManifestItems{{
			SKU: "SECRET-SKU", Description: "Confidential cargo", Quantity: 3,
			UnitValue: 9999, TotalValue: 29997, IMDGClass: "1",
		}},
	}
	if err := shipmentRepo.Create(ctx, shipment); err != nil {
		t.Fatalf("create shipment: %v", err)
	}
	t.Cleanup(func() { shipmentRepo.Delete(ctx, shipment.ID) })

	h := NewShipmentHandler(shipmentRepo, portRepo, routingRepo, routeRepo, vesselRepo, eventRepo, nil)
	app := fiber.New()
	app.Get("/track/:trackingNumber", h.GetShipmentByTracking) // no auth, like the real route

	resp, err := app.Test(httptest.NewRequest("GET", "/track/"+shipment.TrackingNumber, nil), -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("status = %d, want 200, body = %s", resp.StatusCode, body)
	}

	var got map[string]any
	if err := json.Unmarshal(body, &got); err != nil {
		t.Fatalf("decode: %v", err)
	}

	for _, field := range []string{"id", "customer_name", "customer_user_id", "manifest_items", "description", "origin_port_id", "destination_port_id"} {
		if _, present := got[field]; present {
			t.Errorf("public response contains %q - it must not", field)
		}
	}
	for _, secret := range []string{"Highly Confidential Customer", "SECRET-SKU", "Confidential cargo", "Secret Co", owner.ID} {
		if bytes.Contains(body, []byte(secret)) {
			t.Errorf("public response body leaks %q", secret)
		}
	}

	for _, field := range []string{"tracking_number", "status", "origin_port_name", "destination_port_name", "weight_kg", "container_number", "created_at"} {
		if _, present := got[field]; !present {
			t.Errorf("public response is missing %q, which the tracking page needs", field)
		}
	}
	if got["tracking_number"] != shipment.TrackingNumber {
		t.Errorf("tracking_number = %v, want %q", got["tracking_number"], shipment.TrackingNumber)
	}
}

// TestDownloadBOL_OnlyOwnerOrAdmin is a regression test for the Bill of
// Lading download serving any shipment's BOL - customer and cargo details
// included - to any logged-in user who knew its tracking number. A
// stranger gets the same 404 as a tracking number that doesn't exist, so
// the endpoint can't be used to probe which numbers are real.
func TestDownloadBOL_OnlyOwnerOrAdmin(t *testing.T) {
	db := testutil.RequireDB(t)
	ctx := context.Background()

	portRepo := repository.NewPortRepository(db)
	vesselRepo := repository.NewVesselRepository(db.GetPool())
	shipmentRepo := repository.NewShipmentRepository(db)
	eventRepo := repository.NewShipmentEventRepository(db)
	routingRepo := repository.NewRoutingRepository(db)
	routeRepo := repository.NewRouteRepository(db)
	userRepo := repository.NewUserRepository(db)

	suffix := testutil.UniqueSuffix()
	mkClient := func(name string) *models.User {
		u := &models.User{Email: "test-" + name + "-" + suffix + "@example.com", PasswordHash: "x", FullName: name, Role: "CLIENT"}
		if err := userRepo.Create(ctx, u); err != nil {
			t.Fatalf("create %s: %v", name, err)
		}
		t.Cleanup(func() { db.GetPool().Exec(ctx, `DELETE FROM users WHERE id = $1`, u.ID) })
		return u
	}
	owner, stranger := mkClient("owner"), mkClient("stranger")

	originID, destID, _, _, _, _ := testutil.TwoRealPorts(t, db.GetPool())
	shipment := &models.Shipment{
		TrackingNumber: "TEST-BOL-" + suffix, CustomerName: "BOL Test",
		OriginPortID: originID, DestinationPortID: destID,
		CustomerUserID: &owner.ID, WeightKG: 500, Status: "PENDING",
	}
	if err := shipmentRepo.Create(ctx, shipment); err != nil {
		t.Fatalf("create shipment: %v", err)
	}
	t.Cleanup(func() { shipmentRepo.Delete(ctx, shipment.ID) })

	h := NewShipmentHandler(shipmentRepo, portRepo, routingRepo, routeRepo, vesselRepo, eventRepo, services.NewPDFService())

	asUser := func(userID, role, tracking string) *http.Response {
		app := fiber.New()
		app.Get("/bol/:trackingNumber", func(c *fiber.Ctx) error {
			c.Locals("user", jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"user_id": userID, "role": role}))
			return h.DownloadBOL(c)
		})
		resp, err := app.Test(httptest.NewRequest("GET", "/bol/"+tracking, nil), -1)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		return resp
	}

	if resp := asUser(owner.ID, "CLIENT", shipment.TrackingNumber); resp.StatusCode != fiber.StatusOK {
		t.Errorf("owner: status = %d, want 200", resp.StatusCode)
	} else if ct := resp.Header.Get("Content-Type"); ct != "application/pdf" {
		t.Errorf("owner: Content-Type = %q, want application/pdf", ct)
	}
	if resp := asUser("admin-under-test", "ADMIN", shipment.TrackingNumber); resp.StatusCode != fiber.StatusOK {
		t.Errorf("admin: status = %d, want 200", resp.StatusCode)
	}

	strangerResp := asUser(stranger.ID, "CLIENT", shipment.TrackingNumber)
	if strangerResp.StatusCode != fiber.StatusNotFound {
		t.Errorf("other client: status = %d, want 404", strangerResp.StatusCode)
	}
	missingResp := asUser(stranger.ID, "CLIENT", "TEST-DOES-NOT-EXIST-"+suffix)
	strangerBody, _ := io.ReadAll(strangerResp.Body)
	missingBody, _ := io.ReadAll(missingResp.Body)
	if missingResp.StatusCode != fiber.StatusNotFound || !bytes.Equal(strangerBody, missingBody) {
		t.Errorf("a stranger's response (%d %s) must be indistinguishable from a missing shipment's (%d %s)",
			strangerResp.StatusCode, strangerBody, missingResp.StatusCode, missingBody)
	}

	// A CLIENT token with no user id at all must not match an unowned
	// (admin-created, customer_user_id NULL) shipment by accident.
	unowned := &models.Shipment{
		TrackingNumber: "TEST-BOL-UNOWNED-" + suffix, CustomerName: "Unowned",
		OriginPortID: originID, DestinationPortID: destID, WeightKG: 1, Status: "PENDING",
	}
	if err := shipmentRepo.Create(ctx, unowned); err != nil {
		t.Fatalf("create unowned shipment: %v", err)
	}
	t.Cleanup(func() { shipmentRepo.Delete(ctx, unowned.ID) })
	if resp := asUser("", "CLIENT", unowned.TrackingNumber); resp.StatusCode != fiber.StatusNotFound {
		t.Errorf("CLIENT with empty user id on an unowned shipment: status = %d, want 404", resp.StatusCode)
	}
}
