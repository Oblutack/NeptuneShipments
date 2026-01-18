package simulator

import (
	"context"
	"log"
	"time"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/navigation"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
)

type Engine struct {
	vesselRepo    *repository.VesselRepository
	shipmentRepo *repository.ShipmentRepository
}

func NewEngine(vRepo *repository.VesselRepository, sRepo *repository.ShipmentRepository) *Engine {
    return &Engine{
        vesselRepo:   vRepo, 
        shipmentRepo: sRepo,
    }
}

// Start begins the simulation loop in a background goroutine
func (e *Engine) Start() {
	// Ticker triggers every 5 seconds
	ticker := time.NewTicker(5 * time.Second)
	
	go func() {
		for range ticker.C {
			e.tick()
		}
	}()
	log.Println("🌊 Simulation Engine Started (Tick: 5s)")
}

// tick is one frame of the simulation
func (e *Engine) tick() {
	ctx := context.Background()
	
	// 1. Get all ships
	// (In a real huge app, we would cache this in Redis)
	vessels, err := e.vesselRepo.GetAll(ctx)
	if err != nil {
		log.Printf("Sim Error: Failed to fetch vessels: %v", err)
		return
	}

	// 2. Move each ship
	for _, v := range vessels {
		if v.Status == "AT_SEA" && v.SpeedKnots > 0 {
			e.moveVessel(ctx, v)
		}
	}
}

func (e *Engine) moveVessel(ctx context.Context, v models.Vessel) {
	// Check if ship has a route
	if v.CurrentRouteID != nil {
		
		// Case 1: Route is finished (Arrived)
		if v.RouteProgress >= 1.0 {
			// Stop the ship if it hasn't been stopped yet
			if v.Status == "AT_SEA" {
				log.Printf("🚢 Ship %s has arrived at destination!", v.Name)
				err := e.vesselRepo.SetDocked(ctx, v.ID)
				if err != nil {
					log.Printf("Sim Error: Failed to dock ship: %v", err)
				}
			}
			return // Do nothing else
		}

		// Case 2: Moving along the route
		// Simple logic: Add 0.5% progress every tick (for demo)
		increment := 0.005 
		newProgress := v.RouteProgress + increment

		if newProgress > 1.0 {
			newProgress = 1.0
		}

		// Update DB Position
		err := e.vesselRepo.UpdateProgress(ctx, v.ID, newProgress)
		if err != nil {
			log.Printf("Sim Error: Failed to update progress: %v", err)
		}

		// Update ETA
		e.shipmentRepo.UpdateETAForVessel(ctx, v.ID, *v.CurrentRouteID, newProgress, v.SpeedKnots)
		
		return // Crucial: Return so we don't run Strategy B
	}

	// Strategy B: Free Roam (Only if NO route assigned)
	newLat, newLon := navigation.CalculateNextPosition(
		v.Latitude, v.Longitude, v.SpeedKnots, v.Heading, 5.0,
	)
	e.vesselRepo.UpdatePosition(ctx, v.ID, newLat, newLon)
}

