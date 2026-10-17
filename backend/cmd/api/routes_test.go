package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Oblutack/NeptuneShipments/backend/internal/handlers"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/golang-jwt/jwt/v5"
)

const testJWTSecret = "routes-test-secret"

// newRouteTestApp builds the real route table with handlers constructed
// around nil repositories. A request that is stopped by the auth/role
// middleware never reaches a handler, so nil is fine for those; a request
// that is let through does reach one, hits the nil repo, and panics - the
// recover middleware turns that into a 500, which is still enough to tell
// "was let through" apart from "was blocked" (401/403).
func newRouteTestApp() *fiber.App {
	app := fiber.New()
	app.Use(recover.New())
	registerRoutes(app, routeDeps{
		jwtSecret:      testJWTSecret,
		allowedOrigins: "http://localhost:5173",
		vessel:         handlers.NewVesselHandler(nil, nil),
		port:           handlers.NewPortHandler(nil, nil),
		shipment:       handlers.NewShipmentHandler(nil, nil, nil, nil, nil, nil, nil),
		auth:           handlers.NewAuthHandler(nil, testJWTSecret),
		tank:           handlers.NewTankHandler(nil),
		route:          handlers.NewRouteHandler(nil, nil),
		terminal:       handlers.NewTerminalHandler(nil),
		component:      handlers.NewComponentHandler(nil),
		crew:           handlers.NewCrewHandler(nil),
		finance:        handlers.NewFinanceHandler(nil),
		ws:             handlers.NewWebSocketHandler(nil, nil),
		allocation:     handlers.NewAllocationHandler(nil),
		auditLog:       handlers.NewAuditHandler(nil),
		simulation:     handlers.NewSimulationHandler(nil),
	})
	return app
}

func tokenFor(t *testing.T, role string) string {
	t.Helper()
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": "00000000-0000-0000-0000-000000000001",
		"role":    role,
	}).SignedString([]byte(testJWTSecret))
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return signed
}

func statusFor(t *testing.T, app *fiber.App, method, path, token string) int {
	t.Helper()
	req := httptest.NewRequest(method, path, nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	defer resp.Body.Close()
	return resp.StatusCode
}

// adminOnly lists every protected route that exposes fleet operations,
// crew data, schedules, finances or administrative actions. If a new
// route like this is added without requireAdmin, add it here and this
// test fails until it's gated.
var adminOnly = []struct{ method, path string }{
	{"GET", "/api/vessels"},
	{"POST", "/api/vessels"},
	{"PUT", "/api/vessels/x"},
	{"DELETE", "/api/vessels/x"},
	{"POST", "/api/vessels/import"},
	{"GET", "/api/vessels/x/tanks"},
	{"GET", "/api/vessels/x/components"},
	{"GET", "/api/vessels/x/crew"},
	{"GET", "/api/vessels/x/shipments"},
	{"POST", "/api/vessels/x/refuel"},
	{"GET", "/api/ports/stats"},
	{"POST", "/api/ports"},
	{"PUT", "/api/ports/x"},
	{"DELETE", "/api/ports/x"},
	{"POST", "/api/ports/import"},
	{"GET", "/api/ports/x/terminals"},
	{"GET", "/api/ports/x/schedule"},
	{"POST", "/api/components/x/maintain"},
	{"GET", "/api/audit"},
	{"POST", "/api/simulation/reset"},
	{"GET", "/api/crew"},
	{"PUT", "/api/crew/x/assign"},
	{"GET", "/api/finance/stats"},
	{"GET", "/api/finance/revenue-trend"},
	{"PUT", "/api/shipments/x"},
	{"DELETE", "/api/shipments/x"},
	{"POST", "/api/allocations"},
	{"GET", "/api/allocations/unassigned"},
	{"POST", "/api/routes/calculate"},
}

// anyAuthenticated are the routes a CLIENT account legitimately uses.
var anyAuthenticated = []struct{ method, path string }{
	{"GET", "/api/ports"},
	{"GET", "/api/shipments"},
	{"POST", "/api/shipments"},
	{"GET", "/api/shipments/TRK-1/bol"},
	{"POST", "/api/auth/totp/setup"},
}

func TestRoutes_AdminOnlyRoutesRejectClients(t *testing.T) {
	app := newRouteTestApp()
	client := tokenFor(t, "CLIENT")
	for _, r := range adminOnly {
		if got := statusFor(t, app, r.method, r.path, client); got != http.StatusForbidden {
			t.Errorf("%s %s as CLIENT = %d, want 403", r.method, r.path, got)
		}
	}
}

func TestRoutes_AdminOnlyRoutesRejectAnonymous(t *testing.T) {
	app := newRouteTestApp()
	for _, r := range adminOnly {
		if got := statusFor(t, app, r.method, r.path, ""); got != http.StatusUnauthorized {
			t.Errorf("%s %s with no token = %d, want 401", r.method, r.path, got)
		}
	}
}

func TestRoutes_AdminOnlyRoutesAdmitAdmins(t *testing.T) {
	app := newRouteTestApp()
	admin := tokenFor(t, "ADMIN")
	for _, r := range adminOnly {
		got := statusFor(t, app, r.method, r.path, admin)
		if got == http.StatusUnauthorized || got == http.StatusForbidden {
			t.Errorf("%s %s as ADMIN = %d, want it let through to the handler", r.method, r.path, got)
		}
	}
}

func TestRoutes_ClientRoutesAdmitClients(t *testing.T) {
	app := newRouteTestApp()
	client := tokenFor(t, "CLIENT")
	for _, r := range anyAuthenticated {
		got := statusFor(t, app, r.method, r.path, client)
		if got == http.StatusUnauthorized || got == http.StatusForbidden {
			t.Errorf("%s %s as CLIENT = %d, want it let through (a client's own routes)", r.method, r.path, got)
		}
	}
}

// The live fleet stream needs the same treatment as the REST fleet reads:
// a CLIENT with a perfectly valid token must not be able to stream it.
func TestRoutes_FleetStreamRejectsClients(t *testing.T) {
	app := newRouteTestApp()
	req := httptest.NewRequest("GET", "/ws/fleet?token="+tokenFor(t, "CLIENT"), nil)
	req.Header.Set("Connection", "Upgrade")
	req.Header.Set("Upgrade", "websocket")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("ws request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("GET /ws/fleet as CLIENT = %d, want 403", resp.StatusCode)
	}
}

// Every call to /routes/calculate runs a pgRouting Dijkstra query, so even
// an admin gets a tight cap on it.
func TestRoutes_CalculateIsRateLimited(t *testing.T) {
	app := newRouteTestApp()
	admin := tokenFor(t, "ADMIN")

	limited := 0
	for i := 0; i < 40; i++ {
		if statusFor(t, app, "POST", "/api/routes/calculate", admin) == http.StatusTooManyRequests {
			limited++
		}
	}
	if limited == 0 {
		t.Error("40 rapid calls to /api/routes/calculate were never rate limited")
	}
	if limited == 40 {
		t.Error("every call was rate limited - the cap is below any sensible usage")
	}
}
