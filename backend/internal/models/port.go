package models

import "time"

type Port struct {
    ID        string    `json:"id"`
    UnLocode  string    `json:"un_locode"`
    Name      string    `json:"name"`
    Country   string    `json:"country"`
    Latitude  float64   `json:"latitude"`
    Longitude float64   `json:"longitude"`
    CreatedAt time.Time `json:"created_at"`
    Type      string    `json:"type,omitempty"` // ✅ Optional field (not in all tables)
    UpdatedAt time.Time `json:"updated_at,omitempty"` // ✅ Optional field (not in all tables)
}