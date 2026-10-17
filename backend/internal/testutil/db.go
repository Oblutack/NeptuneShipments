// Package testutil provides shared helpers for tests that need a real
// database. These are integration tests, not mocks: the repository
// layer talks to Postgres+PostGIS+pgRouting through hand-written SQL,
// and mocking that out would mean testing a fake SQL dialect instead of
// the real one.
package testutil

import (
	"os"
	"testing"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/joho/godotenv"
)

// RequireDB loads backend/.env (so a local `go test ./...` picks up the
// same DB_URL the running app uses) and connects, or skips the calling
// test if DB_URL still isn't set. DB-backed tests always run when a
// Postgres is reachable at DB_URL - in local dev that's the docker-compose
// instance, in CI it's a migrated instance the workflow provisions.
func RequireDB(t *testing.T) *database.Service {
	t.Helper()

	_ = godotenv.Load("../../.env") // backend/.env, relative to any internal/<pkg> test
	if os.Getenv("DB_URL") == "" {
		t.Skip("DB_URL not set - skipping database-backed test")
	}

	db, err := database.New()
	if err != nil {
		t.Skipf("could not connect to database: %v", err)
	}
	t.Cleanup(db.Close)
	return db
}
