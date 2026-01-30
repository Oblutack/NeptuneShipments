package websocket

import (
	"log"
	"time"

	ws "github.com/gofiber/websocket/v2"
)

const (
    writeWait      = 10 * time.Second
    pongWait       = 60 * time.Second
    pingPeriod     = (pongWait * 9) / 10
    maxMessageSize = 512
)

// Client represents a WebSocket connection
type Client struct {
    hub  *Hub
    conn *ws.Conn
    send chan []byte
}

// NewClient creates a new WebSocket client
func NewClient(hub *Hub, conn *ws.Conn) *Client {
    return &Client{
        hub:  hub,
        conn: conn,
        send: make(chan []byte, 256),
    }
}

// Send returns the send channel (for external access)
func (c *Client) Send() chan []byte {
    return c.send
}

// ReadPump pumps messages from the WebSocket connection to the hub
func (c *Client) ReadPump() {
    defer func() {
        c.hub.unregister <- c
        c.conn.Close()
    }()

    c.conn.SetReadDeadline(time.Now().Add(pongWait))
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })

    for {
        _, _, err := c.conn.ReadMessage()
        if err != nil {
            if ws.IsUnexpectedCloseError(err, ws.CloseGoingAway, ws.CloseAbnormalClosure) {
                log.Printf("WebSocket error: %v", err)
            }
            break
        }
    }
}

// WritePump pumps messages from the hub to the WebSocket connection
func (c *Client) WritePump() {
    ticker := time.NewTicker(pingPeriod)
    defer func() {
        ticker.Stop()
        c.conn.Close()
    }()

    for {
        select {
        case message, ok := <-c.send:
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if !ok {
                c.conn.WriteMessage(ws.CloseMessage, []byte{})
                return
            }

            err := c.conn.WriteMessage(ws.TextMessage, message)
            if err != nil {
                return
            }

        case <-ticker.C:
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if err := c.conn.WriteMessage(ws.PingMessage, nil); err != nil {
                return
            }
        }
    }
}