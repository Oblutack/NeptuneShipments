package main

import (
	"fmt"
	"log"
	"os"

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
	financeRepo := repository.NewFinanceRepository(db)
	allocationRepo := repository.NewAllocationRepository(db)

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
	
	shipmentHandler := handlers.NewShipmentHandler(
		shipmentRepo,
		portRepo,
		routingEngineRepo,
		routeRepo,
		vesselRepo,
		pdfService,
	)

	authHandler := handlers.NewAuthHandler(userRepo)
	tankHandler := handlers.NewTankHandler(tankRepo)
	routeHandler := handlers.NewRouteHandler(routeRepo, routingEngineRepo)
	terminalHandler := handlers.NewTerminalHandler(terminalRepo)
	componentHandler := handlers.NewComponentHandler(componentRepo)
	crewHandler := handlers.NewCrewHandler(crewRepo)
	financeHandler := handlers.NewFinanceHandler(financeRepo)
	wsHandler := handlers.NewWebSocketHandler(hub, vesselRepo)
	allocationHandler := handlers.NewAllocationHandler(allocationRepo) 

	// Initialize Fiber
	app := fiber.New()

	//CORS
	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://localhost:5173, http://127.0.0.1:5173",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",              
    	AllowCredentials: true,
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
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "neptune_secret_key_12345"
	}
	requireAuth := jwtware.New(jwtware.Config{
		SigningKey: jwtware.SigningKey{Key: []byte(jwtSecret)},
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		},
	})
	requireAdmin := middleware.RequireRole("ADMIN")

	// Browsers can't set custom headers on a native WebSocket handshake,
	// so /ws/fleet takes its token as a query param instead of a header.
	requireAuthWS := jwtware.New(jwtware.Config{
		SigningKey:  jwtware.SigningKey{Key: []byte(jwtSecret)},
		TokenLookup: "query:token",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		},
	})

	// PUBLIC ROUTES
	api.Post("/auth/login", authHandler.Login)
	api.Get("/shipments/:trackingNumber", shipmentHandler.GetShipmentByTracking)

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
	vessels.Post("/", requireAdmin, vesselHandler.CreateVessel)
	vessels.Get("/", vesselHandler.GetAllVessels)
	vessels.Put("/:id", requireAdmin, vesselHandler.UpdateVessel)
	vessels.Delete("/:id", requireAdmin, vesselHandler.DeleteVessel)
	vessels.Post("/import", requireAdmin, vesselHandler.UploadVesselsCSV)
	vessels.Get("/:vesselId/tanks", tankHandler.GetTanks)
	vessels.Get("/:vesselId/shipments", shipmentHandler.GetShipmentsByVessel)
	vessels.Get("/:vesselId/components", componentHandler.GetComponents)
	vessels.Get("/:id/crew", crewHandler.GetCrewByVessel)
	vessels.Post("/:id/refuel", requireAdmin, vesselHandler.RefuelVessel)

	// Ports
	ports := api.Group("/ports")
	ports.Get("/", portHandler.GetAllPorts)
	ports.Get("/stats", portHandler.GetPortStats)
	ports.Post("/", requireAdmin, portHandler.CreatePort)
	ports.Put("/:id", requireAdmin, portHandler.UpdatePort)
	ports.Delete("/:id", requireAdmin, portHandler.DeletePort)
	ports.Post("/import", requireAdmin, portHandler.UploadPortsCSV)
	ports.Get("/template", portHandler.DownloadPortsTemplate)
	ports.Get("/:portId/terminals", terminalHandler.GetPortTerminals)


	// Components
	components := api.Group("/components")
    components.Post("/:id/maintain", requireAdmin, componentHandler.PerformMaintenance)

	// Crew
	crew := api.Group("/crew")
    crew.Get("/", crewHandler.GetAllCrew)
    crew.Put("/:id/assign", requireAdmin, crewHandler.AssignCrew)

	// Finance
    finance := api.Group("/finance")
    finance.Get("/stats", financeHandler.GetStats)

	// Shipments
	// Create/read stay open to any authenticated user (a client booking
	// or tracking their own shipment); delete/update are administrative
	// actions the same way vessel/port mutations are.
	shipments := api.Group("/shipments")
	shipments.Post("/", shipmentHandler.CreateShipment)
	shipments.Get("/", shipmentHandler.GetAllShipments)
	shipments.Get("/:trackingNumber/bol", shipmentHandler.DownloadBOL)
	shipments.Delete("/:id", requireAdmin, shipmentHandler.DeleteShipment)
	shipments.Put("/:id", requireAdmin, shipmentHandler.UpdateShipment)

	// Berth allocations
	// NOTE: these three used to be registered on `app` instead of `api`,
	// which skipped the JWT middleware entirely - anyone could hit them
	// with no token. Moved under the protected group like everything else.
	ports.Get("/:portId/schedule", allocationHandler.GetSchedule)
	allocations := api.Group("/allocations")
	allocations.Post("/", requireAdmin, allocationHandler.CreateAllocation)
	allocations.Get("/unassigned", allocationHandler.GetUnassignedVessels)

	app.Use("/ws", func(c *fiber.Ctx) error {
    // Set CORS headers for WebSocket
    c.Set("Access-Control-Allow-Origin", "http://localhost:5173")
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
		Origins: []string{"http://localhost:5173", "http://127.0.0.1:5173"},
	}))

	simEngine := simulator.NewEngine(vesselRepo, shipmentRepo, componentRepo, allocationRepo, hub)
	simEngine.Start()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Printf("Access via: http://localhost:%s or http://127.0.0.1:%s", port, port)
	log.Fatal(app.Listen(fmt.Sprintf("0.0.0.0:%s", port)))
}