package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// newTestApp builds a tiny app that stands in for jwtware: it stashes
// whatever claims the test wants under c.Locals("user") (same key/shape
// jwtware itself uses), then runs RequireRole, then a handler that just
// returns 200 if it's reached at all.
func newTestApp(claims jwt.MapClaims, skipLocals bool) *fiber.App {
	app := fiber.New()
	app.Get("/protected", func(c *fiber.Ctx) error {
		if !skipLocals {
			c.Locals("user", &jwt.Token{Claims: claims})
		}
		return c.Next()
	}, RequireRole("ADMIN"), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})
	return app
}

func TestRequireRole_AllowsMatchingRole(t *testing.T) {
	app := newTestApp(jwt.MapClaims{"role": "ADMIN"}, false)
	resp, err := app.Test(httptest.NewRequest("GET", "/protected", nil))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("status = %d, want 200", resp.StatusCode)
	}
}

func TestRequireRole_BlocksWrongRole(t *testing.T) {
	app := newTestApp(jwt.MapClaims{"role": "CLIENT"}, false)
	resp, err := app.Test(httptest.NewRequest("GET", "/protected", nil))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusForbidden {
		t.Errorf("status = %d, want 403", resp.StatusCode)
	}
}

func TestRequireRole_BlocksMissingRoleClaim(t *testing.T) {
	app := newTestApp(jwt.MapClaims{"user_id": "abc"}, false)
	resp, err := app.Test(httptest.NewRequest("GET", "/protected", nil))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusForbidden {
		t.Errorf("status = %d, want 403", resp.StatusCode)
	}
}

func TestRequireRole_BlocksMissingToken(t *testing.T) {
	// Simulates RequireRole somehow running without jwtware having run
	// first - should fail closed (401), never open.
	app := newTestApp(nil, true)
	resp, err := app.Test(httptest.NewRequest("GET", "/protected", nil))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("status = %d, want 401", resp.StatusCode)
	}
}
