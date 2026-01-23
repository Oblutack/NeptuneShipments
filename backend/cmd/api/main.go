package main

import (
	"fmt"
	"log"
	"os"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/handlers"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/Oblutack/NeptuneShipments/backend/internal/services"
	"github.com/Oblutack/NeptuneShipments/backend/internal/simulator"
	jwtware "github.com/gofiber/contrib/jwt"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
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

	vesselRepo := repository.NewVesselRepository(db.GetPool())
	portRepo := repository.NewPortRepository(db)
	shipmentRepo := repository.NewShipmentRepository(db)
	userRepo := repository.NewUserRepository(db)
	tankRepo := repository.NewTankRepository(db)
	
	routingEngineRepo := repository.NewRoutingRepository(db)
	routeRepo := repository.NewRouteRepository(db)

	vesselHandler := handlers.NewVesselHandler(vesselRepo)
	portHandler := handlers.NewPortHandler(portRepo)
	
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

	// Initialize Fiber
	app := fiber.New()

	//CORS
	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://localhost:5173, http://127.0.0.1:5173",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
		})
	})

	// API routes group
	api := app.Group("/api")

	// PUBLIC ROUTES
	api.Post("/auth/login", authHandler.Login)
	api.Get("/shipments/:trackingNumber", shipmentHandler.GetShipmentByTracking)

	api.Get("/vessels/:id", vesselHandler.GetVesselByID)
	api.Get("/routes/:id", routeHandler.GetRoute)

	api.Post("/routes/calculate", routeHandler.CalculateRoute)
	api.Get("/routes/network", routeHandler.GetNetworkMesh)

	// --- MIDDLEWARE ---
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "neptune_secret_key_12345" 
	}

	api.Use(jwtware.New(jwtware.Config{
		SigningKey: jwtware.SigningKey{Key: []byte(jwtSecret)},
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		},
	}))

	// PRIVATE ROUTES
	// Vessels
	vessels := api.Group("/vessels")
	vessels.Post("/", vesselHandler.CreateVessel)
	vessels.Get("/", vesselHandler.GetAllVessels)
	vessels.Get("/:vesselId/tanks", tankHandler.GetTanks)
	vessels.Post("/:id/refuel", vesselHandler.RefuelVessel)

	// Route lines
	api.Get("/routes/network", routeHandler.GetNetworkMesh)

	// Ports
	api.Get("/ports", portHandler.GetAllPorts)

	// Shipments
	shipments := api.Group("/shipments")
	shipments.Post("/", shipmentHandler.CreateShipment)
	shipments.Get("/", shipmentHandler.GetAllShipments)
	shipments.Get("/:trackingNumber/bol", shipmentHandler.DownloadBOL)

	simEngine := simulator.NewEngine(vesselRepo, shipmentRepo)
	simEngine.Start()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Printf("Access via: http://localhost:%s or http://127.0.0.1:%s", port, port)
	log.Fatal(app.Listen(fmt.Sprintf("0.0.0.0:%s", port)))
}