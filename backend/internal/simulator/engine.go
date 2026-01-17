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
	repo *repository.VesselRepository
}

func NewEngine(repo *repository.VesselRepository) *Engine {
	return &Engine{repo: repo}
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
	vessels, err := e.repo.GetAll(ctx)
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
	// Calculate new position based on 5 seconds of travel
	newLat, newLon := navigation.CalculateNextPosition(
		v.Latitude, 
		v.Longitude, 
		v.SpeedKnots, 
		v.Heading, 
		5.0, // Duration in seconds
	)

	// Update DB
	err := e.repo.UpdatePosition(ctx, v.ID, newLat, newLon)
	if err != nil {
		log.Printf("Sim Error: Failed to move ship %s: %v", v.Name, err)
	}
}