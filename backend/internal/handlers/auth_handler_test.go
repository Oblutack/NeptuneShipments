package handlers

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// TestCurrentUserRoleAndID covers the claim-extraction helper every
// role-gated handler (e.g. ShipmentHandler.GetAllShipments) relies on -
// get this wrong and a CLIENT could see an ADMIN's data or vice versa.
func TestCurrentUserRoleAndID(t *testing.T) {
	app := fiber.New()
	app.Get("/test", func(c *fiber.Ctx) error {
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"user_id": "user-abc-123",
			"role":    "CLIENT",
		})
		c.Locals("user", token)

		role, userID := currentUserRoleAndID(c)
		if role != "CLIENT" {
			t.Errorf("expected role %q, got %q", "CLIENT", role)
		}
		if userID != "user-abc-123" {
			t.Errorf("expected user_id %q, got %q", "user-abc-123", userID)
		}
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	if _, err := app.Test(req); err != nil {
		t.Fatalf("request failed: %v", err)
	}
}

// TestCurrentUserRoleAndID_NoToken ensures the helper fails closed (empty
// role/ID) rather than panicking when called outside an authenticated
// request - it should never be reachable in production since every
// caller sits behind requireAuth, but a safe default matters here.
func TestCurrentUserRoleAndID_NoToken(t *testing.T) {
	app := fiber.New()
	app.Get("/test", func(c *fiber.Ctx) error {
		role, userID := currentUserRoleAndID(c)
		if role != "" || userID != "" {
			t.Errorf("expected empty role/userID with no token, got role=%q userID=%q", role, userID)
		}
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	if _, err := app.Test(req); err != nil {
		t.Fatalf("request failed: %v", err)
	}
}

// TestCurrentUserID mirrors the above for the single-value helper used
// by the TOTP setup/verify/disable endpoints.
func TestCurrentUserID(t *testing.T) {
	app := fiber.New()
	app.Get("/test", func(c *fiber.Ctx) error {
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"user_id": "user-xyz-789",
		})
		c.Locals("user", token)

		userID, ok := currentUserID(c)
		if !ok {
			t.Error("expected ok=true with a valid token in Locals")
		}
		if userID != "user-xyz-789" {
			t.Errorf("expected user_id %q, got %q", "user-xyz-789", userID)
		}
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	if _, err := app.Test(req); err != nil {
		t.Fatalf("request failed: %v", err)
	}
}
