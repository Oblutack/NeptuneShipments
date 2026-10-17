package main

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/handlers"
	"github.com/Oblutack/NeptuneShipments/backend/internal/middleware"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/Oblutack/NeptuneShipments/backend/internal/services"
	"github.com/Oblutack/NeptuneShipments/backend/internal/simulator"
	internalWs "github.com/Oblutack/NeptuneShipments/backend/internal/websocket"
	jwtware "github.com/gofiber/contrib/jwt"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/websocket/v2"
	"github.com/joho/godotenv"
)

func main() {
	if os.Getenv("ENVIRONMENT") != "production" {
		if err := godotenv.Load(); err != nil {
			log.Println("Warning: .env file not found")
		}
	}

	db, err := database.New()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Resolved once, here, and passed into whatever needs it - the one
	// place that decides the signing key and enforces it's actually set
	// in production.
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		if os.Getenv("ENVIRONMENT") == "production" {
			log.Fatal("JWT_SECRET must be set when ENVIRONMENT=production")
		}
		log.Println("Warning: JWT_SECRET not set, using an insecure default for local dev only")
		jwtSecret = "neptune_secret_key_12345"
	}

	pdfService := services.NewPDFService()

	hub := internalWs.NewHub()
	go hub.Run()

	vesselRepo := repository.NewVesselRepository(db.GetPool())
	portRepo := repository.NewPortRepository(db)
	shipmentRepo := repository.NewShipmentRepository(db)
	userRepo := repository.NewUserRepository(db)
	tankRepo := repository.NewTankRepository(db)

	routingEngineRepo := repository.NewRoutingRepository(db)
	routeRepo := repository.NewRouteRepository(db)

	terminalRepo := repository.NewTerminalRepository(db)

	componentRepo := repository.NewComponentRepository(db.GetPool())
	crewRepo := repository.NewCrewRepository(db)
	oilPriceSvc := repository.NewOilPriceService()
	fxRateSvc := repository.NewFXRateService()
	financeRepo := repository.NewFinanceRepository(db, oilPriceSvc, fxRateSvc)
	allocationRepo := repository.NewAllocationRepository(db)
	auditRepo := repository.NewAuditRepository(db)
	simulationRepo := repository.NewSimulationRepository(db)

	importerService := services.NewImporterService(
		portRepo,
		userRepo,
		vesselRepo,
		routeRepo,
		shipmentRepo,
		routingEngineRepo,
		crewRepo,
	)

	vesselHandler := handlers.NewVesselHandler(vesselRepo, importerService)
	portHandler := handlers.NewPortHandler(portRepo, importerService)

	shipmentEventRepo := repository.NewShipmentEventRepository(db)
	shipmentHandler := handlers.NewShipmentHandler(
		shipmentRepo,
		portRepo,
		routingEngineRepo,
		routeRepo,
		vesselRepo,
		shipmentEventRepo,
		pdfService,
	)

	authHandler := handlers.NewAuthHandler(userRepo, jwtSecret)
	tankHandler := handlers.NewTankHandler(tankRepo)
	routeHandler := handlers.NewRouteHandler(routeRepo, routingEngineRepo)
	terminalHandler := handlers.NewTerminalHandler(terminalRepo)
	componentHandler := handlers.NewComponentHandler(componentRepo)
	crewHandler := handlers.NewCrewHandler(crewRepo)
	financeHandler := handlers.NewFinanceHandler(financeRepo)
	wsHandler := handlers.NewWebSocketHandler(hub, vesselRepo)
	allocationHandler := handlers.NewAllocationHandler(allocationRepo)
	auditHandler := handlers.NewAuditHandler(auditRepo)
	simulationHandler := handlers.NewSimulationHandler(simulationRepo)

	// Initialize Fiber
	app := fiber.New()

	// CORS - allowed origins come from config, not a hardcoded string, so
	// this doesn't need a code change to deploy anywhere but localhost.
	allowedOrigins := os.Getenv("CORS_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:5173,http://127.0.0.1:5173"
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	// Global rate limit - generous, just there to blunt abuse/scraping.
	app.Use(limiter.New(limiter.Config{
		Max:        120,
		Expiration: 1 * time.Minute,
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "Too many requests"})
		},
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
		})
	})

	// API routes group
	api := app.Group("/api")

	// --- MIDDLEWARE ---
	// Built here, ahead of route registration, because one route below
	// needs it applied explicitly rather than through the usual
	// api.Use(...) split further down - see the comment on
	// /vessels/template for why.
	requireAuth := jwtware.New(jwtware.Config{
		SigningKey: jwtware.SigningKey{Key: []byte(jwtSecret)},
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		},
	})
	requireAdmin := middleware.RequireRole("ADMIN")
	audit := func(action, entityType string) fiber.Handler {
		return middleware.AuditLog(auditRepo, action, entityType)
	}

	// Browsers can't set custom headers on a native WebSocket handshake,
	// so /ws/fleet takes its token as a query param instead of a header.
	requireAuthWS := jwtware.New(jwtware.Config{
		SigningKey:  jwtware.SigningKey{Key: []byte(jwtSecret)},
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
	api.Post("/auth/login", loginLimiter, authHandler.Login)
	api.Get("/shipments/:trackingNumber", shipmentHandler.GetShipmentByTracking)
	api.Get("/shipments/:trackingNumber/events", shipmentHandler.GetShipmentEvents)

	// Fiber matches GET routes at the same path depth in registration
	// order, not by specificity - so this has to be registered before
	// the public /vessels/:id below, or a request for "/vessels/template"
	// would be handed to GetVesselByID with id="template" instead. Still
	// protected: requireAuth is applied directly since it's ahead of the
	// api.Use(requireAuth) call that protects everything else.
	api.Get("/vessels/template", requireAuth, vesselHandler.DownloadVesselsTemplate)
	api.Get("/vessels/:id", vesselHandler.GetVesselByID)

	// --- ROUTING ENGINE ---
	api.Get("/routes/network", routeHandler.GetNetworkMesh)
	api.Post("/routes/calculate", routeHandler.CalculateRoute)

	// Active Fleet Routes
	api.Get("/routes/active", routeHandler.GetActiveRoutes)

	api.Get("/routes/:id", routeHandler.GetRoute)

	api.Use(requireAuth)

	// PRIVATE ROUTES
	// Vessels
	vessels := api.Group("/vessels")
	vessels.Post("/", requireAdmin, audit("CREATE", "vessel"), vesselHandler.CreateVessel)
	vessels.Get("/", vesselHandler.GetAllVessels)
	vessels.Put("/:id", requireAdmin, audit("UPDATE", "vessel"), vesselHandler.UpdateVessel)
	vessels.Delete("/:id", requireAdmin, audit("DELETE", "vessel"), vesselHandler.DeleteVessel)
	vessels.Post("/import", requireAdmin, audit("IMPORT", "vessel"), vesselHandler.UploadVesselsCSV)
	vessels.Get("/:vesselId/tanks", tankHandler.GetTanks)
	vessels.Get("/:vesselId/shipments", requireAdmin, shipmentHandler.GetShipmentsByVessel)
	vessels.Get("/:vesselId/components", componentHandler.GetComponents)
	vessels.Get("/:id/crew", crewHandler.GetCrewByVessel)
	vessels.Post("/:id/refuel", requireAdmin, audit("REFUEL", "vessel"), vesselHandler.RefuelVessel)

	// Ports
	ports := api.Group("/ports")
	ports.Get("/", portHandler.GetAllPorts)
	ports.Get("/stats", portHandler.GetPortStats)
	ports.Post("/", requireAdmin, audit("CREATE", "port"), portHandler.CreatePort)
	ports.Put("/:id", requireAdmin, audit("UPDATE", "port"), portHandler.UpdatePort)
	ports.Delete("/:id", requireAdmin, audit("DELETE", "port"), portHandler.DeletePort)
	ports.Post("/import", requireAdmin, audit("IMPORT", "port"), portHandler.UploadPortsCSV)
	ports.Get("/template", portHandler.DownloadPortsTemplate)
	ports.Get("/:portId/terminals", terminalHandler.GetPortTerminals)

	// Components
	components := api.Group("/components")
	components.Post("/:id/maintain", requireAdmin, audit("MAINTAIN", "component"), componentHandler.PerformMaintenance)

	// Audit log (admin-only, read-only)
	api.Get("/audit", requireAdmin, auditHandler.GetAuditLog)

	// Simulation reset (admin-only, destructive)
	api.Post("/simulation/reset", requireAdmin, audit("RESET", "simulation"), simulationHandler.ResetSimulation)

	// 2FA - any authenticated user can set this up on their own account
	api.Post("/auth/totp/setup", authHandler.SetupTOTP)
	api.Post("/auth/totp/verify", authHandler.VerifyTOTP)
	api.Post("/auth/totp/disable", authHandler.DisableTOTP)

	// Crew
	crew := api.Group("/crew")
	crew.Get("/", crewHandler.GetAllCrew)
	crew.Put("/:id/assign", requireAdmin, audit("ASSIGN", "crew"), crewHandler.AssignCrew)

	// Finance
	finance := api.Group("/finance")
	finance.Get("/stats", financeHandler.GetStats)
	finance.Get("/revenue-trend", financeHandler.GetRevenueTrend)

	// Shipments
	// Create/read stay open to any authenticated user (a client booking
	// or tracking their own shipment); delete/update are administrative
	// actions the same way vessel/port mutations are.
	shipments := api.Group("/shipments")
	shipments.Post("/", shipmentHandler.CreateShipment)
	shipments.Get("/", shipmentHandler.GetAllShipments)
	shipments.Get("/:trackingNumber/bol", shipmentHandler.DownloadBOL)
	shipments.Delete("/:id", requireAdmin, audit("DELETE", "shipment"), shipmentHandler.DeleteShipment)
	shipments.Put("/:id", requireAdmin, audit("UPDATE", "shipment"), shipmentHandler.UpdateShipment)

	// Berth allocations
	// NOTE: these three used to be registered on `app` instead of `api`,
	// which skipped the JWT middleware entirely - anyone could hit them
	// with no token. Moved under the protected group like everything else.
	ports.Get("/:portId/schedule", allocationHandler.GetSchedule)
	allocations := api.Group("/allocations")
	allocations.Post("/", requireAdmin, audit("CREATE", "allocation"), allocationHandler.CreateAllocation)
	allocations.Get("/unassigned", allocationHandler.GetUnassignedVessels)

	wsOrigins := strings.Split(allowedOrigins, ",")
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
	// Authorization header on the handshake.
	app.Get("/ws/fleet", requireAuthWS, websocket.New(wsHandler.HandleFleetStream, websocket.Config{
		Origins: wsOrigins,
	}))

	simEngine := simulator.NewEngine(vesselRepo, shipmentRepo, componentRepo, allocationRepo, shipmentEventRepo, hub)
	simEngine.Start()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Printf("Access via: http://localhost:%s or http://127.0.0.1:%s", port, port)
	log.Fatal(app.Listen(fmt.Sprintf("0.0.0.0:%s", port)))
}
