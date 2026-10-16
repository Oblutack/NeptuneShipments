package middleware

import (
	"context"
	"log"

	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// AuditLog returns middleware that records a mutating action to the audit
// log after it succeeds. Must run after the JWT validation middleware.
// Runs the handler chain first (c.Next()), then only writes a log entry
// if the response wasn't an error - a failed/forbidden attempt shouldn't
// be recorded as if the action actually happened.
func AuditLog(auditRepo *repository.AuditRepository, action, entityType string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		err := c.Next()

		if c.Response().StatusCode() >= 400 {
			return err
		}

		token, ok := c.Locals("user").(*jwt.Token)
		if !ok {
			return err
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return err
		}

		actorID, _ := claims["user_id"].(string)
		actorEmail, _ := claims["email"].(string)
		if actorEmail == "" {
			actorEmail = actorID
		}

		entityID := c.Params("id")
		var entityIDPtr *string
		if entityID != "" {
			entityIDPtr = &entityID
		}
		var actorIDPtr *string
		if actorID != "" {
			actorIDPtr = &actorID
		}

		// Fire-and-forget: an audit write failure must never fail the
		// actual request, which has already succeeded by this point.
		go func() {
			writeErr := auditRepo.Create(context.Background(), repository.CreateAuditEntryParams{
				ActorID:    actorIDPtr,
				ActorEmail: actorEmail,
				Action:     action,
				EntityType: entityType,
				EntityID:   entityIDPtr,
			})
			if writeErr != nil {
				log.Printf("audit log write failed: %v", writeErr)
			}
		}()

		return err
	}
}
