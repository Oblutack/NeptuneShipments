package main

import (
	"strings"
	"time"

	"github.com/Oblutack/NeptuneShipments/backend/internal/handlers"
	"github.com/Oblutack/NeptuneShipments/backend/internal/middleware"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	jwtware "github.com/gofiber/contrib/jwt"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/websocket/v2"
)

// routeDeps is everything registerRoutes needs. Kept as a struct so the
// route table can be built in a test with handlers that were constructed
// around nil repositories - the middleware chain is what's under test
// there, not what the handlers do once a request gets through it.
type routeDeps struct {
	jwtSecret      string
	allowedOrigins string
	auditRepo      *repository.AuditRepository

	vessel     *handlers.VesselHandler
	port       *handlers.PortHandler
	shipment   *handlers.ShipmentHandler
	auth       *handlers.AuthHandler
	tank       *handlers.TankHandler
	route      *handlers.RouteHandler
	terminal   *handlers.TerminalHandler
	component  *handlers.ComponentHandler
	crew       *handlers.CrewHandler
	finance    *handlers.FinanceHandler
	ws         *handlers.WebSocketHandler
	allocation *handlers.AllocationHandler
	auditLog   *handlers.AuditHandler
	simulation *handlers.SimulationHandler
}

// registerRoutes wires every /api and /ws route. Fiber matches routes in
// registration order, and everything registered after api.Use(requireAuth)
// is protected - so where a route sits in this function IS its auth rule.
func registerRoutes(app *fiber.App, d routeDeps) {
	api := app.Group("/api")

	// --- MIDDLEWARE ---
	// Built here, ahead of route registration, because one route below
	// needs it applied explicitly rather than through the usual
	// api.Use(...) split further down - see the comment on
	// /vessels/template for why.
	requireAuth := jwtware.New(jwtware.Config{
		SigningKey: jwtware.SigningKey{Key: []byte(d.jwtSecret)},
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		},
	})
	requireAdmin := middleware.RequireRole("ADMIN")
	audit := func(action, entityType string) fiber.Handler {
		return middleware.AuditLog(d.auditRepo, action, entityType)
	}

	// Browsers can't set custom headers on a native WebSocket handshake,
	// so /ws/fleet takes its token as a query param instead of a header.
	requireAuthWS := jwtware.New(jwtware.Config{
		SigningKey:  jwtware.SigningKey{Key: []byte(d.jwtSecret)},
		TokenLookup: "query:token",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		},
	})

	// Tighter limit on login specifically - brute-force protection.
	loginLimiter := limiter.New(limiter.Config{
		Max:        10,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "Too many login attempts, try again shortly"})
		},
	})

	// PUBLIC ROUTES
	api.Post("/auth/login", loginLimiter, d.auth.Login)
	api.Get("/shipments/:trackingNumber", d.shipment.GetShipmentByTracking)
	api.Get("/shipments/:trackingNumber/events", d.shipment.GetShipmentEvents)

	// Fiber matches GET routes at the same path depth in registration
	// order, not by specificity - so this has to be registered before
	// the public /vessels/:id below, or a request for "/vessels/template"
	// would be handed to GetVesselByID with id="template" instead. Still
	// protected: requireAuth is applied directly since it's ahead of the
	// api.Use(requireAuth) call that protects everything else.
	api.Get("/vessels/template", requireAuth, d.vessel.DownloadVesselsTemplate)
	api.Get("/vessels/:id", d.vessel.GetVesselByID)

	// --- ROUTING ENGINE ---
	api.Get("/routes/network", d.route.GetNetworkMesh)

	// Active Fleet Routes
	api.Get("/routes/active", d.route.GetActiveRoutes)

	api.Get("/routes/:id", d.route.GetRoute)

	api.Use(requireAuth)

	// PRIVATE ROUTES
	//
	// A CLIENT account is authenticated but is a customer, not fleet
	// operations: what it can reach is its own shipments, the port list
	// (needed to book), 2FA on its own account, and the public tracking
	// endpoints above. Everything that exposes the company's fleet,
	// crew, schedules, or finances is requireAdmin.

	// Vessels
	vessels := api.Group("/vessels")
	vessels.Post("/", requireAdmin, audit("CREATE", "vessel"), d.vessel.CreateVessel)
	vessels.Get("/", requireAdmin, d.vessel.GetAllVessels)
	vessels.Put("/:id", requireAdmin, audit("UPDATE", "vessel"), d.vessel.UpdateVessel)
	vessels.Delete("/:id", requireAdmin, audit("DELETE", "vessel"), d.vessel.DeleteVessel)
	vessels.Post("/import", requireAdmin, audit("IMPORT", "vessel"), d.vessel.UploadVesselsCSV)
	vessels.Get("/:vesselId/tanks", requireAdmin, d.tank.GetTanks)
	vessels.Get("/:vesselId/shipments", requireAdmin, d.shipment.GetShipmentsByVessel)
	vessels.Get("/:vesselId/components", requireAdmin, d.component.GetComponents)
	vessels.Get("/:id/crew", requireAdmin, d.crew.GetCrewByVessel)
	vessels.Post("/:id/refuel", requireAdmin, audit("REFUEL", "vessel"), d.vessel.RefuelVessel)

	// Ports
	ports := api.Group("/ports")
	ports.Get("/", d.port.GetAllPorts)
	ports.Get("/stats", requireAdmin, d.port.GetPortStats)
	ports.Post("/", requireAdmin, audit("CREATE", "port"), d.port.CreatePort)
	ports.Put("/:id", requireAdmin, audit("UPDATE", "port"), d.port.UpdatePort)
	ports.Delete("/:id", requireAdmin, audit("DELETE", "port"), d.port.DeletePort)
	ports.Post("/import", requireAdmin, audit("IMPORT", "port"), d.port.UploadPortsCSV)
	ports.Get("/template", d.port.DownloadPortsTemplate)
	ports.Get("/:portId/terminals", requireAdmin, d.terminal.GetPortTerminals)

	// Components
	components := api.Group("/components")
	components.Post("/:id/maintain", requireAdmin, audit("MAINTAIN", "component"), d.component.PerformMaintenance)

	// Route calculation runs a pgRouting Dijkstra query per call and is a
	// dev/ops tool (nothing in the app calls it), so it's admin-only with
	// its own tight cap. requireAdmin runs first so rejected requests
	// don't use up an admin's quota.
	calculateLimiter := limiter.New(limiter.Config{
		Max:        20,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "Too many route calculations, try again shortly"})
		},
	})
	api.Post("/routes/calculate", requireAdmin, calculateLimiter, d.route.CalculateRoute)

	// Audit log (admin-only, read-only)
	api.Get("/audit", requireAdmin, d.auditLog.GetAuditLog)

	// Simulation reset (admin-only, destructive)
	api.Post("/simulation/reset", requireAdmin, audit("RESET", "simulation"), d.simulation.ResetSimulation)

	// 2FA - any authenticated user can set this up on their own account
	api.Post("/auth/totp/setup", d.auth.SetupTOTP)
	api.Post("/auth/totp/verify", d.auth.VerifyTOTP)
	api.Post("/auth/totp/disable", d.auth.DisableTOTP)

	// Crew
	crew := api.Group("/crew")
	crew.Get("/", requireAdmin, d.crew.GetAllCrew)
	crew.Put("/:id/assign", requireAdmin, audit("ASSIGN", "crew"), d.crew.AssignCrew)

	// Finance
	finance := api.Group("/finance", requireAdmin)
	finance.Get("/stats", d.finance.GetStats)
	finance.Get("/revenue-trend", d.finance.GetRevenueTrend)

	// Shipments
	// Create/read stay open to any authenticated user (a client booking
	// or tracking their own shipment); delete/update are administrative
	// actions the same way vessel/port mutations are.
	shipments := api.Group("/shipments")
	shipments.Post("/", d.shipment.CreateShipment)
	shipments.Get("/", d.shipment.GetAllShipments)
	shipments.Get("/:trackingNumber/bol", d.shipment.DownloadBOL)
	shipments.Delete("/:id", requireAdmin, audit("DELETE", "shipment"), d.shipment.DeleteShipment)
	shipments.Put("/:id", requireAdmin, audit("UPDATE", "shipment"), d.shipment.UpdateShipment)

	// Berth allocations
	// NOTE: these three used to be registered on `app` instead of `api`,
	// which skipped the JWT middleware entirely - anyone could hit them
	// with no token. Moved under the protected group like everything else.
	ports.Get("/:portId/schedule", requireAdmin, d.allocation.GetSchedule)
	allocations := api.Group("/allocations")
	allocations.Post("/", requireAdmin, audit("CREATE", "allocation"), d.allocation.CreateAllocation)
	allocations.Get("/unassigned", requireAdmin, d.allocation.GetUnassignedVessels)

	wsOrigins := strings.Split(d.allowedOrigins, ",")
	for i := range wsOrigins {
		wsOrigins[i] = strings.TrimSpace(wsOrigins[i])
	}
	app.Use("/ws", func(c *fiber.Ctx) error {
		// Set CORS headers for WebSocket
		c.Set("Access-Control-Allow-Origin", wsOrigins[0])
		c.Set("Access-Control-Allow-Credentials", "true")
		c.Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")

		// Handle preflight
		if c.Method() == "OPTIONS" {
			return c.SendStatus(fiber.StatusOK)
		}

		// Allow WebSocket upgrade
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	// This used to be wide open - anyone could connect and stream the
	// full live fleet with no token at all. requireAuthWS is the query-
	// param variant since a browser's native WebSocket API can't set an
	// Authorization header on the handshake. The stream is the whole
	// fleet's live state, so it's admin-only like the REST fleet reads.
	app.Get("/ws/fleet", requireAuthWS, requireAdmin, websocket.New(d.ws.HandleFleetStream, websocket.Config{
		Origins: wsOrigins,
	}))
}
