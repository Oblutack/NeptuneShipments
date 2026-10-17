package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/handlers"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/Oblutack/NeptuneShipments/backend/internal/secretbox"
	"github.com/Oblutack/NeptuneShipments/backend/internal/services"
	"github.com/Oblutack/NeptuneShipments/backend/internal/simulator"
	internalWs "github.com/Oblutack/NeptuneShipments/backend/internal/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
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

	// TOTP seeds are encrypted at rest with this key. Like JWT_SECRET it's
	// required in production; in local dev a key is derived from the JWT
	// secret so the app runs with no extra setup.
	var totpKey []byte
	if raw := os.Getenv("TOTP_ENCRYPTION_KEY"); raw != "" {
		totpKey, err = secretbox.KeyFromBase64(raw)
		if err != nil {
			log.Fatal("TOTP_ENCRYPTION_KEY is invalid (want 32 random bytes, base64 - e.g. `openssl rand -base64 32`): ", err)
		}
	} else {
		if os.Getenv("ENVIRONMENT") == "production" {
			log.Fatal("TOTP_ENCRYPTION_KEY must be set when ENVIRONMENT=production (e.g. `openssl rand -base64 32`)")
		}
		log.Println("Warning: TOTP_ENCRYPTION_KEY not set, deriving an insecure dev key from JWT_SECRET for local dev only")
		totpKey = secretbox.DevKey(jwtSecret)
	}
	secrets, err := secretbox.New(totpKey)
	if err != nil {
		log.Fatal("Failed to set up secret encryption: ", err)
	}

	pdfService := services.NewPDFService()

	hub := internalWs.NewHub()
	go hub.Run()

	vesselRepo := repository.NewVesselRepository(db.GetPool())
	portRepo := repository.NewPortRepository(db)
	shipmentRepo := repository.NewShipmentRepository(db)
	userRepo := repository.NewUserRepository(db, secrets)
	if n, err := userRepo.EncryptLegacyTOTPSecrets(context.Background()); err != nil {
		log.Fatal("Failed to encrypt existing TOTP secrets (have migrations been run?): ", err)
	} else if n > 0 {
		log.Printf("Encrypted %d existing plaintext TOTP secret(s)", n)
	}
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

	registerRoutes(app, routeDeps{
		jwtSecret:      jwtSecret,
		allowedOrigins: allowedOrigins,
		auditRepo:      auditRepo,
		vessel:         vesselHandler,
		port:           portHandler,
		shipment:       shipmentHandler,
		auth:           authHandler,
		tank:           tankHandler,
		route:          routeHandler,
		terminal:       terminalHandler,
		component:      componentHandler,
		crew:           crewHandler,
		finance:        financeHandler,
		ws:             wsHandler,
		allocation:     allocationHandler,
		auditLog:       auditHandler,
		simulation:     simulationHandler,
	})

	simEngine := simulator.NewEngine(vesselRepo, shipmentRepo, componentRepo, allocationRepo, shipmentEventRepo, hub, simulator.TimeScaleFromEnv())
	simEngine.Start()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Printf("Access via: http://localhost:%s or http://127.0.0.1:%s", port, port)
	log.Fatal(app.Listen(fmt.Sprintf("0.0.0.0:%s", port)))
}
