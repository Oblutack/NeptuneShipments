package simulator

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"os"
	"strconv"
	"time"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/navigation"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/Oblutack/NeptuneShipments/backend/internal/websocket"
)

// tickInterval is real time between simulation ticks.
const tickInterval = 5 * time.Second

// DefaultTimeScale is how many simulated seconds pass per real second.
// At 1000 a tick (5 real seconds) covers about 1.4 simulated hours, so a
// 10,000 nm voyage at 15 kn (about 28 simulated days) plays out in roughly
// 40 real minutes.
const DefaultTimeScale = 1000.0

// TimeScaleFromEnv reads SIM_TIME_SCALE, falling back to DefaultTimeScale
// if it is unset or not a positive number.
func TimeScaleFromEnv() float64 {
	raw := os.Getenv("SIM_TIME_SCALE")
	if raw == "" {
		return DefaultTimeScale
	}
	scale, err := strconv.ParseFloat(raw, 64)
	if err != nil || scale <= 0 || math.IsInf(scale, 0) || math.IsNaN(scale) {
		log.Printf("Warning: SIM_TIME_SCALE=%q isn't a positive number, using %v", raw, DefaultTimeScale)
		return DefaultTimeScale
	}
	return scale
}

// fuelBurnTons is the fuel a vessel burns over simHours of steaming at its
// current speed. Burn at design speed is the vessel's design consumption;
// at other speeds it scales with the cube of the speed ratio (the real
// propeller law): sailing at half speed burns an eighth as fast, which is
// why slow steaming saves so much fuel.
func fuelBurnTons(v models.Vessel, simHours float64) float64 {
	if v.SpeedKnots <= 0 || v.DesignSpeedKnots <= 0 || v.DesignConsumptionTPD <= 0 {
		return 0
	}
	ratio := v.SpeedKnots / v.DesignSpeedKnots
	return v.DesignConsumptionTPD / 24.0 * simHours * ratio * ratio * ratio
}

type Engine struct {
	vesselRepo     *repository.VesselRepository
	shipmentRepo   *repository.ShipmentRepository
	componentRepo  *repository.ComponentRepository
	allocationRepo *repository.AllocationRepository
	eventRepo      *repository.ShipmentEventRepository
	alertRepo      *repository.AlertRepository
	hub            *websocket.Hub

	// timeScale is simulated seconds per real second; simHoursPerTick is
	// the simulated time one tick represents.
	timeScale       float64
	simHoursPerTick float64
}

// WebSocketMessage wraps all messages sent via WebSocket
type WebSocketMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

func NewEngine(vRepo *repository.VesselRepository, sRepo *repository.ShipmentRepository, componentRepo *repository.ComponentRepository, aRepo *repository.AllocationRepository, eventRepo *repository.ShipmentEventRepository, alertRepo *repository.AlertRepository, hub *websocket.Hub, timeScale float64) *Engine {
	return &Engine{
		vesselRepo:      vRepo,
		shipmentRepo:    sRepo,
		componentRepo:   componentRepo,
		allocationRepo:  aRepo,
		eventRepo:       eventRepo,
		alertRepo:       alertRepo,
		hub:             hub,
		timeScale:       timeScale,
		simHoursPerTick: tickInterval.Seconds() * timeScale / 3600.0,
	}
}

// AlertPayload represents a notification sent to clients
type AlertPayload struct {
	ID         string `json:"id"`
	Kind       string `json:"kind"`
	Level      string `json:"level"`
	Message    string `json:"message"`
	Timestamp  string `json:"timestamp"`
	VesselID   string `json:"vessel_id"`
	VesselName string `json:"vessel_name"`
}

func outOfFuelMessage(vesselName string) string {
	return vesselName + " has run out of fuel and is stranded at sea!"
}

func mechanicalFailureMessage(vesselName string) string {
	return vesselName + " has experienced a critical mechanical failure!"
}

// raiseAlert records an alert and tells every connected client about it.
//
// The database is the source of truth: a CRITICAL condition that already
// has an open alert for this vessel (the engine will try to raise "out of
// fuel" on every tick the vessel stays stranded) is a duplicate and is
// neither stored nor broadcast again. INFO events are always new.
func (e *Engine) raiseAlert(ctx context.Context, level, kind, message, vesselID, vesselName string) {
	alert, err := e.alertRepo.Create(ctx, repository.CreateAlertParams{
		VesselID:   vesselID,
		VesselName: vesselName,
		Level:      level,
		Kind:       kind,
		Message:    message,
	})
	if err != nil {
		// Still tell operators - an unrecorded alert beats a silent one.
		log.Printf("Failed to record alert (%s/%s for %s): %v", level, kind, vesselName, err)
	} else if alert == nil {
		return // already open for this vessel
	}

	payload := AlertPayload{
		Kind:       kind,
		Level:      level,
		Message:    message,
		Timestamp:  time.Now().Format(time.RFC3339),
		VesselID:   vesselID,
		VesselName: vesselName,
	}
	if alert != nil {
		payload.ID = alert.ID
		payload.Timestamp = alert.CreatedAt.Format(time.RFC3339)
	}

	jsonData, err := json.Marshal(WebSocketMessage{Type: "ALERT", Payload: payload})
	if err != nil {
		log.Printf("Failed to marshal alert: %v", err)
		return
	}
	e.hub.Broadcast(jsonData)

	log.Printf("📢 Alert Broadcast: [%s] %s", level, message)
}

// Start begins the simulation loop in a background goroutine
func (e *Engine) Start() {
	ticker := time.NewTicker(tickInterval)

	go func() {
		for range ticker.C {
			e.tick()
		}
	}()
	log.Printf("Simulation Engine Started (tick: %s, time scale: %vx)", tickInterval, e.timeScale)
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

	// 2. Close alerts for vessels that are out of DISTRESS (however they
	// got out - see ResolveForRecoveredVessels), then recover DISTRESS
	// vessels that have been refueled/repaired; any that stay in DISTRESS
	// are guaranteed an open alert. That last part matters after a restart
	// or a failed write: the alert is raised where the vessel fails, but
	// the vessel's state is what's really true.
	if _, err := e.alertRepo.ResolveForRecoveredVessels(ctx); err != nil {
		log.Printf("Sim Error: Failed to resolve alerts: %v", err)
	}
	for _, v := range vessels {
		if v.Status != "DISTRESS" {
			continue
		}
		if !e.checkDistressRecovery(ctx, v) {
			e.ensureDistressAlert(ctx, v)
		}
	}

	// 3. Move each ship
	for _, v := range vessels {
		if v.Status == "AT_SEA" && v.SpeedKnots > 0 {
			e.moveVessel(ctx, v)
		}
	}

	// 4. Check for berth activations (vessels arriving at port with scheduled allocations)
	for _, v := range vessels {
		e.checkBerthActivation(ctx, v)
	}
}

// ensureDistressAlert makes sure a vessel in DISTRESS has an open alert,
// working out which kind from its state. A no-op when one already exists.
func (e *Engine) ensureDistressAlert(ctx context.Context, v models.Vessel) {
	if v.FuelLevel <= 0 {
		e.raiseAlert(ctx, models.AlertLevelCritical, models.AlertKindOutOfFuel, outOfFuelMessage(v.Name), v.ID, v.Name)
		return
	}
	e.raiseAlert(ctx, models.AlertLevelCritical, models.AlertKindMechanicalFailed, mechanicalFailureMessage(v.Name), v.ID, v.Name)
}

// checkDistressRecovery checks if a DISTRESS vessel can be recovered, and
// reports whether it was.
func (e *Engine) checkDistressRecovery(ctx context.Context, v models.Vessel) bool {
	// Check if vessel has fuel
	if v.FuelLevel <= 0 {
		return false // Still out of fuel
	}

	// Check for critical component failures
	hasCriticalFailure, err := e.componentRepo.CheckCriticalFailure(ctx, v.ID)
	if err != nil || hasCriticalFailure {
		return false // Still has critical failures
	}

	// Vessel can be recovered!
	log.Printf("✅ %s has recovered from DISTRESS (Fuel: %.0f)", v.Name, v.FuelLevel)

	// Set to ANCHORED (safe state) with 0 speed
	if err := e.vesselRepo.RecoverFromDistress(ctx, v.ID); err != nil {
		log.Printf("Failed to recover %s: %v", v.Name, err)
		return false
	}

	e.raiseAlert(ctx, models.AlertLevelInfo, models.AlertKindRecovered,
		v.Name+" has been recovered and is now anchored.", v.ID, v.Name)
	return true
}

func (e *Engine) moveVessel(ctx context.Context, v models.Vessel) {
	// 0. Safety Check: If vessel is AT_SEA, ensure all PENDING shipments are IN_TRANSIT
	// This catches any edge cases where shipments didn't transition properly
	if v.Status == "AT_SEA" && v.CurrentRouteID != nil {
		ids, err := e.shipmentRepo.UpdateStatusByVessel(ctx, v.ID, "PENDING", "IN_TRANSIT")
		if err != nil {
			log.Printf("Warning: Failed to update shipment statuses for vessel %s: %v", v.Name, err)
		}
		for _, id := range ids {
			e.eventRepo.Create(ctx, id, "DEPARTED", fmt.Sprintf("Departed aboard %s", v.Name))
		}
	}

	// 1. Calculate Fuel Burn - depends on the vessel's size (its design
	// consumption) and the cube of its speed relative to design speed. A
	// vessel only burns for the part of the tick it actually sails: all of
	// it, except on the final leg of a route, where it stops at the end.
	// Charging a full tick there would overstate fuel use (and wrongly
	// strand a vessel with just enough fuel left to arrive).
	tickFraction := 1.0
	if v.CurrentRouteID != nil {
		fullTickNM := v.SpeedKnots * e.simHoursPerTick
		remainingNM := math.Max((1.0-v.RouteProgress)*v.RouteLengthNM, 0)
		if v.RouteProgress >= 1.0 {
			tickFraction = 0 // already at the end - this tick only docks it
		} else if fullTickNM > 0 && remainingNM < fullTickNM {
			tickFraction = remainingNM / fullTickNM
		}
	}
	burnRate := fuelBurnTons(v, e.simHoursPerTick*tickFraction)
	newFuel := v.FuelLevel - burnRate

	// 2. Check for Empty Tank
	if newFuel <= 0 {
		newFuel = 0
		if v.Status != "DISTRESS" {
			log.Printf("MAYDAY! Ship %s has run out of fuel!", v.Name)
			e.vesselRepo.SetDistressOutOfFuel(ctx, v.ID)

			e.raiseAlert(ctx, models.AlertLevelCritical, models.AlertKindOutOfFuel, outOfFuelMessage(v.Name), v.ID, v.Name)
		}
		return // Ship stops moving
	}

	// Strategy A: If on a route, follow the line
	if v.CurrentRouteID != nil {

		// Case 1: Route is finished (Arrived)
		if v.RouteProgress >= 1.0 {
			if v.Status == "AT_SEA" {
				// Dock the vessel (updates status, moves to port, activates berth)
				if err := e.vesselRepo.SetDockedWithRoute(ctx, v.ID, *v.CurrentRouteID); err != nil {
					log.Printf("Failed to dock %s: %v", v.Name, err)
					return
				}

				// Only log success after successful docking
				log.Printf("🚢 Ship %s has arrived at destination!", v.Name)

				e.raiseAlert(ctx, models.AlertLevelInfo, models.AlertKindArrived,
					v.Name+" has successfully arrived at the destination port.", v.ID, v.Name)

				// Update shipments to DELIVERED
				e.shipmentRepo.UpdateETAForVessel(ctx, v.ID, *v.CurrentRouteID, 1.0, 0, e.timeScale)
			}
			return
		}

		// Case 2: Moving along the route
		//
		// Progress is distance sailed over distance to sail, so a voyage
		// lasts as long as its length and the vessel's speed say it
		// should - not a fixed number of ticks, which used to make a
		// 300 nm hop and an 11,000 nm crossing take the same time.
		distanceThisTickNM := v.SpeedKnots * e.simHoursPerTick
		remainingNM := (1.0 - v.RouteProgress) * v.RouteLengthNM
		newProgress := 1.0
		if v.RouteLengthNM > 0 && distanceThisTickNM < remainingNM {
			newProgress = v.RouteProgress + distanceThisTickNM/v.RouteLengthNM
		} else {
			// Final leg (or a degenerate zero-length route): only the
			// distance actually left counts, so totals don't overshoot.
			distanceThisTickNM = math.Max(remainingNM, 0)
		}

		err := e.vesselRepo.UpdateProgress(ctx, v.ID, newProgress, newFuel, burnRate, distanceThisTickNM)
		if err != nil {
			log.Printf("Sim Error: Failed to update progress: %v", err)
		}

		// Update ETA
		e.shipmentRepo.UpdateETAForVessel(ctx, v.ID, *v.CurrentRouteID, newProgress, v.SpeedKnots, e.timeScale)

		// Component wear needs to happen on every tick a vessel is
		// actually moving, not just while free-roaming below - almost
		// every vessel has a route (AssignRoute sets one on every
		// shipment creation), so degradation used to essentially never
		// run during a normal voyage.
		e.applyMechanicalWear(ctx, v)
		return
	}

	// Strategy B: Free Roam - no route to follow, but the vessel still
	// burns fuel and covers distance like any other.
	newLat, newLon := navigation.CalculateNextPosition(
		v.Latitude, v.Longitude, v.SpeedKnots, v.Heading, tickInterval.Seconds()*e.timeScale,
	)
	if err := e.vesselRepo.UpdateFreeRoam(ctx, v.ID, newLat, newLon, newFuel, burnRate, v.SpeedKnots*e.simHoursPerTick); err != nil {
		log.Printf("Sim Error: Failed to update free-roaming vessel %s: %v", v.Name, err)
	}

	e.applyMechanicalWear(ctx, v)
}

// applyMechanicalWear degrades a moving vessel's components a little each
// tick and puts it into DISTRESS if that results in a critical failure.
// Shared between both movement strategies above - see the comment where
// it's called from the route-following branch for why that matters.
func (e *Engine) applyMechanicalWear(ctx context.Context, v models.Vessel) {
	if err := e.componentRepo.DegradeComponents(ctx, v.ID, 0.1); err != nil {
		log.Printf("Failed to degrade components for %s: %v", v.Name, err)
		return
	}

	hasCriticalFailure, err := e.componentRepo.CheckCriticalFailure(ctx, v.ID)
	if err != nil {
		log.Printf("Failed to check critical failure for %s: %v", v.Name, err)
		return
	}

	if hasCriticalFailure {
		log.Printf("🔥 %s has a CRITICAL MECHANICAL FAILURE!", v.Name)
		if err := e.vesselRepo.SetDistress(ctx, v.ID); err != nil {
			log.Printf("Failed to set distress for %s: %v", v.Name, err)
			return
		}
		e.raiseAlert(ctx, models.AlertLevelCritical, models.AlertKindMechanicalFailed, mechanicalFailureMessage(v.Name), v.ID, v.Name)
	}
}

// checkBerthActivation checks if a vessel with a SCHEDULED allocation is near its destination port
// and automatically activates the allocation if within 10km
func (e *Engine) checkBerthActivation(ctx context.Context, v models.Vessel) {
	// Only check for AT_SEA vessels
	if v.Status != "AT_SEA" {
		return
	}

	// Check if vessel has a scheduled allocation
	allocation, err := e.allocationRepo.GetScheduledAllocationByVesselID(ctx, v.ID)
	if err != nil {
		log.Printf("Failed to check scheduled allocation for %s: %v", v.Name, err)
		return
	}

	// No scheduled allocation found
	if allocation == nil {
		return
	}

	// Check if vessel is near any port
	nearbyPort, err := e.vesselRepo.GetNearbyPort(ctx, v.Latitude, v.Longitude)
	if err != nil {
		log.Printf("Failed to check nearby port for %s: %v", v.Name, err)
		return
	}

	// Not near any port
	if nearbyPort == nil {
		return
	}

	// Get the berth's terminal to find the port ID
	terminalPortID, err := e.allocationRepo.GetBerthPortID(ctx, allocation.BerthID)
	if err != nil {
		log.Printf("Failed to get berth's port for %s: %v", v.Name, err)
		return
	}

	// Check if the nearby port matches the allocation's port
	if nearbyPort.ID != terminalPortID {
		// Vessel is near a different port
		return
	}

	// ✅ Vessel is near the correct port with a scheduled allocation!
	// Activate the berth allocation
	log.Printf("🚢 %s has arrived at %s! Activating berth allocation at %s", v.Name, nearbyPort.Name, allocation.BerthName)

	// Begin transaction to update vessel, allocation, and berth atomically
	tx, err := e.vesselRepo.GetPool().Begin(ctx)
	if err != nil {
		log.Printf("Failed to begin transaction for %s: %v", v.Name, err)
		return
	}
	defer tx.Rollback(ctx)

	// 1. Update vessel status to DOCKED and move to port coordinates
	updateVesselQuery := `
		UPDATE vessels 
		SET 
			status = 'DOCKED',
			speed_knots = 0,
			location = ST_SetSRID(ST_MakePoint($2, $3), 4326),
			current_berth_id = $4,
			last_updated = NOW()
		WHERE id = $1
	`
	_, err = tx.Exec(ctx, updateVesselQuery, v.ID, nearbyPort.Longitude, nearbyPort.Latitude, allocation.BerthID)
	if err != nil {
		log.Printf("Failed to dock vessel %s: %v", v.Name, err)
		return
	}

	// 2. Activate the berth allocation
	updateAllocationQuery := `
		UPDATE berth_allocations
		SET status = 'ACTIVE', updated_at = NOW()
		WHERE id = $1
	`
	_, err = tx.Exec(ctx, updateAllocationQuery, allocation.ID)
	if err != nil {
		log.Printf("Failed to activate allocation for %s: %v", v.Name, err)
		return
	}

	// 3. Mark berth as occupied
	updateBerthQuery := `
		UPDATE berths
		SET is_occupied = true, current_vessel_id = $1
		WHERE id = $2
	`
	_, err = tx.Exec(ctx, updateBerthQuery, v.ID, allocation.BerthID)
	if err != nil {
		log.Printf("Failed to mark berth as occupied for %s: %v", v.Name, err)
		return
	}

	// 4. Update shipments to DELIVERED
	updateShipmentsQuery := `
		UPDATE shipments
		SET status = 'DELIVERED', updated_at = NOW()
		WHERE vessel_id = $1 AND status = 'IN_TRANSIT'
		RETURNING id
	`
	var deliveredShipmentIDs []string
	deliveredRows, err := tx.Query(ctx, updateShipmentsQuery, v.ID)
	if err != nil {
		log.Printf("Warning: Failed to update shipments for %s: %v", v.Name, err)
		// Not critical, continue
	} else {
		for deliveredRows.Next() {
			var id string
			if err := deliveredRows.Scan(&id); err == nil {
				deliveredShipmentIDs = append(deliveredShipmentIDs, id)
			}
		}
		deliveredRows.Close()
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		log.Printf("Failed to commit docking transaction for %s: %v", v.Name, err)
		return
	}

	for _, id := range deliveredShipmentIDs {
		e.eventRepo.Create(ctx, id, "DELIVERED",
			fmt.Sprintf("Arrived and delivered at %s, berth %s", nearbyPort.Name, allocation.BerthName))
	}

	// ✅ Success! Broadcast notification
	e.raiseAlert(ctx, models.AlertLevelInfo, models.AlertKindArrived,
		fmt.Sprintf("%s has arrived at %s and docked at %s", v.Name, nearbyPort.Name, allocation.BerthName),
		v.ID, v.Name)

	log.Printf("✅ Successfully docked %s at berth %s", v.Name, allocation.BerthName)
}
