package handlers

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/Oblutack/NeptuneShipments/backend/internal/websocket"
	ws "github.com/gofiber/websocket/v2"
)

type WebSocketHandler struct {
    hub        *websocket.Hub
    vesselRepo *repository.VesselRepository
}

func NewWebSocketHandler(hub *websocket.Hub, vesselRepo *repository.VesselRepository) *WebSocketHandler {
    return &WebSocketHandler{
        hub:        hub,
        vesselRepo: vesselRepo,
    }
}

type FleetUpdate struct {
    Type    string      `json:"type"`
    Payload interface{} `json:"payload"`
}

// HandleFleetStream handles WebSocket connections for real-time fleet updates
func (h *WebSocketHandler) HandleFleetStream(c *ws.Conn) {
    log.Println("🔌 New WebSocket connection attempt")
    
    // Create a new WebSocket client
    client := websocket.NewClient(h.hub, c)

    // Register client with hub
    h.hub.Register(client)

    // Send initial data immediately (blocking)
    h.sendInitialFleetData(client)

    // Start goroutines for reading and writing
    go client.WritePump()
    client.ReadPump() // ✅ This blocks until connection closes
}

// sendInitialFleetData sends the current fleet state when client connects
func (h *WebSocketHandler) sendInitialFleetData(client *websocket.Client) {
    ctx := context.Background()

    vessels, err := h.vesselRepo.GetAll(ctx)
    if err != nil {
        log.Printf("Failed to fetch vessels for WebSocket: %v", err)
        return
    }

    update := FleetUpdate{
        Type:    "FLEET_UPDATE",
        Payload: vessels,
    }

    data, err := json.Marshal(update)
    if err != nil {
        log.Printf("Failed to marshal fleet update: %v", err)
        return
    }

    // Send directly to the client channel
    select {
    case client.Send() <- data:
        log.Println("📡 Sent initial fleet data to new client")
    case <-time.After(2 * time.Second):
        log.Println("⚠️ Timeout sending initial data")
    }
}