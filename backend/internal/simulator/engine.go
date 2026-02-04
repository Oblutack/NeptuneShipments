package simulator

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/navigation"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/Oblutack/NeptuneShipments/backend/internal/websocket"
)

type Engine struct {
	vesselRepo    *repository.VesselRepository
	shipmentRepo *repository.ShipmentRepository
	componentRepo *repository.ComponentRepository
	hub           *websocket.Hub
	alertsSent    map[string]bool // Track which vessels have already sent alerts
}

// WebSocketMessage wraps all messages sent via WebSocket
type WebSocketMessage struct {
    Type    string      `json:"type"`    
    Payload interface{} `json:"payload"`
}

func NewEngine(vRepo *repository.VesselRepository, sRepo *repository.ShipmentRepository, componentRepo *repository.ComponentRepository, hub *websocket.Hub,) *Engine {
    return &Engine{
        vesselRepo:   vRepo, 
        shipmentRepo: sRepo,
		componentRepo: componentRepo,
		hub:           hub,
		alertsSent:    make(map[string]bool), // Initialize alert tracking
    }
}

// AlertPayload represents a notification sent to clients
type AlertPayload struct {
    Level     string `json:"level"`     
    Message   string `json:"message"`
    Timestamp string `json:"timestamp"`
    VesselID  string `json:"vessel_id"`
    VesselName string `json:"vessel_name"`
}


// broadcastAlert sends a notification to all connected clients
func (e *Engine) broadcastAlert(level, message, vesselID, vesselName string) {
	// Create a unique key for this alert type + vessel
	alertKey := level + ":" + vesselID

	// Check if we've already sent this alert
	if e.alertsSent[alertKey] {
		log.Printf("⚠️ Alert already sent for %s, skipping duplicate", alertKey)
		return
	}

	// Mark this alert as sent
	e.alertsSent[alertKey] = true

    alert := AlertPayload{
        Level:      level,
        Message:    message,
        Timestamp:  time.Now().Format(time.RFC3339),
        VesselID:   vesselID,
        VesselName: vesselName,
    }

    wsMessage := WebSocketMessage{
        Type:    "ALERT",
        Payload: alert,
    }

    jsonData, err := json.Marshal(wsMessage)
    if err != nil {
        log.Printf("Failed to marshal alert: %v", err)
        return
    }

    // Broadcast to all connected WebSocket clients
    e.hub.Broadcast(jsonData)

    log.Printf("📢 Alert Broadcast: [%s] %s", level, message)
}

// clearAlertForVessel removes the alert tracking for a vessel (e.g., after refueling)
func (e *Engine) clearAlertForVessel(vesselID string) {
	delete(e.alertsSent, "CRITICAL:"+vesselID)
	delete(e.alertsSent, "INFO:"+vesselID)
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
	log.Println("Simulation Engine Started (Tick: 5s)")
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

	// 2. Recover DISTRESS vessels that have been refueled/repaired
	for _, v := range vessels {
		if v.Status == "DISTRESS" {
			e.checkDistressRecovery(ctx, v)
		}
	}

	// 3. Move each ship
	for _, v := range vessels {
		if v.Status == "AT_SEA" && v.SpeedKnots > 0 {
			e.moveVessel(ctx, v)
		}
	}
}

// checkDistressRecovery checks if a DISTRESS vessel can be recovered
func (e *Engine) checkDistressRecovery(ctx context.Context, v models.Vessel) {
	// Check if vessel has fuel
	if v.FuelLevel <= 0 {
		return // Still out of fuel
	}

	// Check for critical component failures
	hasCriticalFailure, err := e.componentRepo.CheckCriticalFailure(ctx, v.ID)
	if err != nil || hasCriticalFailure {
		return // Still has critical failures
	}

	// Vessel can be recovered!
	log.Printf("✅ %s has recovered from DISTRESS (Fuel: %.0f)", v.Name, v.FuelLevel)
	
	// Set to ANCHORED (safe state) with 0 speed
	if err := e.vesselRepo.RecoverFromDistress(ctx, v.ID); err != nil {
		log.Printf("Failed to recover %s: %v", v.Name, err)
		return
	}

	// Clear the alert tracking
	e.clearAlertForVessel(v.ID)

	// Broadcast recovery notification
	e.broadcastAlert(
		"INFO",
		v.Name+" has been recovered and is now anchored.",
		v.ID,
		v.Name,
	)
}

func (e *Engine) moveVessel(ctx context.Context, v models.Vessel) {
	// 1. Calculate Fuel Burn
	// Base burn: 0.5 tons per tick. Increases with speed.
	burnRate := 0.5 * (v.SpeedKnots / 20.0)
	newFuel := v.FuelLevel - burnRate

	// 2. Check for Empty Tank
	if newFuel <= 0 {
		newFuel = 0
		if v.Status != "DISTRESS" {
			log.Printf("MAYDAY! Ship %s has run out of fuel!", v.Name)
			// Fix 1: Use the repository method instead of raw SQL
			e.vesselRepo.SetDistress(ctx, v.ID)

			
            e.broadcastAlert(
                "CRITICAL",
                v.Name+" has run out of fuel and is stranded at sea!",
                v.ID,
                v.Name,
			)
		}
		return // Ship stops moving
	}

	// Strategy A: If on a route, follow the line
	if v.CurrentRouteID != nil {
		
		// Case 1: Route is finished (Arrived)
		if v.RouteProgress >= 1.0 {
			if v.Status == "AT_SEA" {
				log.Printf("🚢 Ship %s has arrived at destination!", v.Name)
				
				// Dock the vessel (updates status, moves to port, activates berth)
				if err := e.vesselRepo.SetDockedWithRoute(ctx, v.ID, *v.CurrentRouteID); err != nil {
					log.Printf("Failed to dock %s: %v", v.Name, err)
					return
				}

				e.broadcastAlert(
                    "INFO",
                    v.Name+" has successfully arrived at the destination port.",
                    v.ID,
                    v.Name,
				)
                
				// Update shipments to DELIVERED
				e.shipmentRepo.UpdateETAForVessel(ctx, v.ID, *v.CurrentRouteID, 1.0, 0)
			}
			return
		}

		// Case 2: Moving along the route
		increment := 0.002 // Speed of progress
		newProgress := v.RouteProgress + increment

		if newProgress > 1.0 {
			newProgress = 1.0
		}

		// Fix 2: Pass newFuel to UpdateProgress (It needs 4 arguments now)
		err := e.vesselRepo.UpdateProgress(ctx, v.ID, newProgress, newFuel)
		if err != nil {
			log.Printf("Sim Error: Failed to update progress: %v", err)
		}

		// Update ETA
		e.shipmentRepo.UpdateETAForVessel(ctx, v.ID, *v.CurrentRouteID, newProgress, v.SpeedKnots)
		
		return
	}

	// Strategy B: Free Roam
	newLat, newLon := navigation.CalculateNextPosition(
		v.Latitude, v.Longitude, v.SpeedKnots, v.Heading, 5.0,
	)
	// Note: We should probably update fuel here too for Strategy B, 
	// but let's stick to Strategy A for now.
	e.vesselRepo.UpdatePosition(ctx, v.ID, newLat, newLon)

	// 1. Degrade components by 0.1% per tick
    if err := e.componentRepo.DegradeComponents(ctx, v.ID, 0.1); err != nil {
        log.Printf("Failed to degrade components for %s: %v", v.Name, err)
        // Continue execution - don't stop simulation for this
    }

    // 2. Check for critical failures
    hasCriticalFailure, err := e.componentRepo.CheckCriticalFailure(ctx, v.ID)
    if err != nil {
        log.Printf("Failed to check critical failure for %s: %v", v.Name, err)
        // Continue execution
    }

    // 3. If critical failure detected, set vessel to distress
    if hasCriticalFailure {
        log.Printf("🔥 %s has a CRITICAL MECHANICAL FAILURE at (%.4f, %.4f)!", v.Name, newLat, newLon)
        if err := e.vesselRepo.SetDistress(ctx, v.ID); err != nil {
            log.Printf("Failed to set distress for %s: %v", v.Name, err)
        }

		e.broadcastAlert(
            "CRITICAL",
            v.Name+" has experienced a critical mechanical failure!",
            v.ID,
            v.Name,
        )

		
        return
    }
}

