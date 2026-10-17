package testutil

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// TwoRealPorts returns two stably-seeded ports' id/lat/lon, or skips the
// test if fewer than two exist. Filters out anything named like a test
// fixture ("Test %", the prefix every throwaway port in this test suite
// uses) and orders deterministically - `go test ./...` runs each
// package as a separate process against the same shared database, so an
// unfiltered, unordered `LIMIT 2` can race with another package's test:
// it's possible to pick up a short-lived port another test created and
// have it deleted out from under you by the time you use it.
func TwoRealPorts(t *testing.T, pool *pgxpool.Pool) (id1, id2 string, lat1, lon1, lat2, lon2 float64) {
	t.Helper()
	ctx := context.Background()

	rows, err := pool.Query(ctx, `
		SELECT id, ST_Y(location::geometry), ST_X(location::geometry)
		FROM ports
		WHERE name NOT LIKE 'Test %'
		ORDER BY created_at
		LIMIT 2
	`)
	if err != nil {
		t.Fatalf("failed to fetch ports: %v", err)
	}
	defer rows.Close()

	type port struct {
		id       string
		lat, lon float64
	}
	var ports []port
	for rows.Next() {
		var p port
		if err := rows.Scan(&p.id, &p.lat, &p.lon); err != nil {
			t.Fatalf("failed to scan port: %v", err)
		}
		ports = append(ports, p)
	}
	if len(ports) < 2 {
		t.Skip("need at least 2 seeded (non-test-fixture) ports for this test")
	}
	return ports[0].id, ports[1].id, ports[0].lat, ports[0].lon, ports[1].lat, ports[1].lon
}
