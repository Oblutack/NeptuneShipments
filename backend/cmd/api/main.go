package main

import (
	"fmt"
	"log"
	"os"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/handlers"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/Oblutack/NeptuneShipments/backend/internal/simulator"
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

	// Connect to db
	db, err := database.New()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Initialize repository and handler
	vesselRepo := repository.NewVesselRepository(db.GetPool())
	vesselHandler := handlers.NewVesselHandler(vesselRepo)

	portRepo := repository.NewPortRepository(db)
	portHandler := handlers.NewPortHandler(portRepo)

	shipmentRepo := repository.NewShipmentRepository(db) 
	shipmentHandler := handlers.NewShipmentHandler(shipmentRepo)

	routeRepo := repository.NewRouteRepository(db) // <--- NEW
    routeHandler := handlers.NewRouteHandler(routeRepo)

	// Initialize Fiber
	app := fiber.New()

	//CORS
	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://localhost:5173, http://127.0.0.1:5173",
		AllowHeaders: "Origin, Content-Type, Accept",
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
		})
	})

	// API routes
	api := app.Group("/api")

	// Vessel routes
	vessels := api.Group("/vessels")
	vessels.Post("/", vesselHandler.CreateVessel)
	vessels.Get("/", vesselHandler.GetAllVessels)
	vessels.Get("/:id", vesselHandler.GetVesselByID)

	api.Get("/ports", portHandler.GetAllPorts)

	shipments := api.Group("/shipments")
	shipments.Post("/", shipmentHandler.CreateShipment)
	shipments.Get("/", shipmentHandler.GetAllShipments)
	shipments.Get("/:trackingNumber", shipmentHandler.GetShipmentByTracking)

	routesGroup := api.Group("/routes")
    routesGroup.Get("/:id", routeHandler.GetRoute)

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



