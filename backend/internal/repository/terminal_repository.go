package repository

import (
	"context"
	"fmt"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
)

type TerminalRepository struct {
    db *database.Service
}

func NewTerminalRepository(db *database.Service) *TerminalRepository {
    return &TerminalRepository{db: db}
}

// GetByPortID retrieves all terminals for a specific port with nested berths
func (r *TerminalRepository) GetByPortID(ctx context.Context, portID string) ([]models.Terminal, error) {
    // Step 1: Fetch all terminals for the port
    terminalQuery := `
        SELECT id, port_id, name, type, created_at
        FROM terminals
        WHERE port_id = $1
        ORDER BY name ASC
    `

    rows, err := r.db.GetPool().Query(ctx, terminalQuery, portID)
    if err != nil {
        return nil, fmt.Errorf("failed to fetch terminals: %w", err)
    }
    defer rows.Close()

    var terminals []models.Terminal
    var terminalIDs []string

    for rows.Next() {
        var t models.Terminal
        err := rows.Scan(
            &t.ID,
            &t.PortID,
            &t.Name,
            &t.Type,
            &t.CreatedAt,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan terminal: %w", err)
        }
        
        // Initialize empty berths slice
        t.Berths = []models.Berth{}
        terminals = append(terminals, t)
        terminalIDs = append(terminalIDs, t.ID)
    }

    // Step 2: Fetch all berths for these terminals (batch query for efficiency)
    if len(terminalIDs) > 0 {
        berthQuery := `
            SELECT id, terminal_id, name, length_meters, is_occupied, current_vessel_id, created_at
            FROM berths
            WHERE terminal_id = ANY($1)
            ORDER BY name ASC
        `

        berthRows, err := r.db.GetPool().Query(ctx, berthQuery, terminalIDs)
        if err != nil {
            return nil, fmt.Errorf("failed to fetch berths: %w", err)
        }
        defer berthRows.Close()

        // Create a map to group berths by terminal_id
        berthsByTerminal := make(map[string][]models.Berth)

        for berthRows.Next() {
            var b models.Berth
            err := berthRows.Scan(
                &b.ID,
                &b.TerminalID,
                &b.Name,
                &b.LengthMeters,
                &b.IsOccupied,
                &b.CurrentVesselID,
                &b.CreatedAt,
            )
            if err != nil {
                return nil, fmt.Errorf("failed to scan berth: %w", err)
            }

            berthsByTerminal[b.TerminalID] = append(berthsByTerminal[b.TerminalID], b)
        }

        // Step 3: Attach berths to their parent terminals
        for i := range terminals {
            if berths, exists := berthsByTerminal[terminals[i].ID]; exists {
                terminals[i].Berths = berths
            }
        }
    }

    // Return empty array instead of nil if no terminals found
    if terminals == nil {
        terminals = []models.Terminal{}
    }

    return terminals, nil
}