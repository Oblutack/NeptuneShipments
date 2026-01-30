package websocket

import (
	"log"
	"sync"
)

type Hub struct {
    clients    map[*Client]bool
    broadcast  chan []byte
    register   chan *Client
    unregister chan *Client
    mu         sync.RWMutex
}

func NewHub() *Hub {
    return &Hub{
        clients:    make(map[*Client]bool),
        broadcast:  make(chan []byte, 256),
        register:   make(chan *Client),
        unregister: make(chan *Client),
    }
}

// Register adds a client to the hub
func (h *Hub) Register(client *Client) {
    h.register <- client
}

// Run starts the hub's main loop
func (h *Hub) Run() {
    log.Println("✅ WebSocket Hub Running")
    for {
        select {
        case client := <-h.register:
            h.mu.Lock()
            h.clients[client] = true
            h.mu.Unlock()
            log.Printf("🔌 Client connected (Total: %d)", len(h.clients))

        case client := <-h.unregister:
            h.mu.Lock()
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                close(client.send)
            }
            h.mu.Unlock()
    		log.Printf("🔌 Client disconnected (Total: %d)", len(h.clients))

        case message := <-h.broadcast:
            h.mu.Lock()
            for client := range h.clients {
                select {
                case client.send <- message:
                    // Message sent successfully
                default:
                    // Channel is full or closed, remove client
                    delete(h.clients, client)
                    close(client.send)
                }
            }
            h.mu.Unlock()
        }
    }
}

// Broadcast sends a message to all connected clients
func (h *Hub) Broadcast(message []byte) {
    h.broadcast <- message
}

// ClientCount returns the number of connected clients
func (h *Hub) ClientCount() int {
    h.mu.RLock()
    defer h.mu.RUnlock()
    return len(h.clients)
}