package handlers

import (
	"bytes"
	"encoding/base64"
	"image/png"
	"time"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	repo      *repository.UserRepository
	jwtSecret string
}

// jwtSecret is passed in rather than re-read from the environment here, so
// there is exactly one place (main.go) that decides the signing key and
// enforces that it's actually set in production.
func NewAuthHandler(repo *repository.UserRepository, jwtSecret string) *AuthHandler {
	return &AuthHandler{repo: repo, jwtSecret: jwtSecret}
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var input models.LoginInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	// Find User
	user, err := h.repo.GetByEmail(c.Context(), input.Email)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	if user == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	// Check Password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	// If 2FA is enabled, the password alone isn't enough - require a
	// valid TOTP code too. A missing code gets a distinct response so
	// the frontend knows to prompt for one instead of showing a generic
	// "wrong password" error.
	if user.TOTPEnabled {
		if input.TOTPCode == "" {
			return c.Status(401).JSON(fiber.Map{"error": "2FA code required", "totp_required": true})
		}
		if user.TOTPSecret == nil || !totp.Validate(input.TOTPCode, *user.TOTPSecret) {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid 2FA code", "totp_required": true})
		}
	}

	// Generate JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,
		"role":    user.Role,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	})

	t, err := token.SignedString([]byte(h.jwtSecret))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not generate token"})
	}

	// Return Token + User Info
	return c.JSON(fiber.Map{
		"token": t,
		"user":  user,
	})
}

// currentUserID pulls the user_id claim out of the JWT the auth
// middleware already validated - these endpoints always run behind
// requireAuth, so c.Locals("user") is guaranteed to be populated.
func currentUserID(c *fiber.Ctx) (string, bool) {
	token, ok := c.Locals("user").(*jwt.Token)
	if !ok {
		return "", false
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", false
	}
	userID, ok := claims["user_id"].(string)
	return userID, ok
}

// currentUserRoleAndID is the same lookup, also returning the role claim -
// used wherever a handler needs to branch behavior by role (e.g. an
// ADMIN seeing every shipment vs. a CLIENT seeing only their own).
func currentUserRoleAndID(c *fiber.Ctx) (role string, userID string) {
	token, ok := c.Locals("user").(*jwt.Token)
	if !ok {
		return "", ""
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", ""
	}
	role, _ = claims["role"].(string)
	userID, _ = claims["user_id"].(string)
	return role, userID
}

// SetupTOTP generates a new (not-yet-enabled) TOTP secret for the
// authenticated user and returns it as both a scannable QR code and a
// manual-entry secret. Calling this again before verifying replaces the
// pending secret - nothing is enabled until VerifyTOTP succeeds.
func (h *AuthHandler) SetupTOTP(c *fiber.Ctx) error {
	userID, ok := currentUserID(c)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}
	user, err := h.repo.GetByID(c.Context(), userID)
	if err != nil || user == nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "NeptuneOS",
		AccountName: user.Email,
	})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate 2FA secret"})
	}

	if err := h.repo.SetTOTPSecret(c.Context(), userID, key.Secret()); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save 2FA secret"})
	}

	img, err := key.Image(256, 256)
	var qrDataURI string
	if err == nil {
		var buf bytes.Buffer
		if encErr := png.Encode(&buf, img); encErr == nil {
			qrDataURI = "data:image/png;base64," + base64.StdEncoding.EncodeToString(buf.Bytes())
		}
	}

	return c.JSON(fiber.Map{
		"secret":   key.Secret(),
		"otp_url":  key.String(),
		"qr_image": qrDataURI,
	})
}

// VerifyTOTP checks a code against the pending secret from SetupTOTP and,
// if valid, actually enables 2FA on the account.
func (h *AuthHandler) VerifyTOTP(c *fiber.Ctx) error {
	userID, ok := currentUserID(c)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}
	var input struct {
		Code string `json:"code"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	user, err := h.repo.GetByID(c.Context(), userID)
	if err != nil || user == nil || user.TOTPSecret == nil {
		return c.Status(400).JSON(fiber.Map{"error": "No pending 2FA setup found"})
	}

	if !totp.Validate(input.Code, *user.TOTPSecret) {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid code"})
	}

	if err := h.repo.EnableTOTP(c.Context(), userID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to enable 2FA"})
	}

	return c.JSON(fiber.Map{"message": "2FA enabled"})
}

// DisableTOTP turns 2FA off. Requires a currently-valid code, the same
// way a password confirmation would be required elsewhere - a stolen
// JWT alone shouldn't be enough to silently turn off account protection.
func (h *AuthHandler) DisableTOTP(c *fiber.Ctx) error {
	userID, ok := currentUserID(c)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}
	var input struct {
		Code string `json:"code"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	user, err := h.repo.GetByID(c.Context(), userID)
	if err != nil || user == nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}
	if !user.TOTPEnabled || user.TOTPSecret == nil {
		return c.Status(400).JSON(fiber.Map{"error": "2FA is not enabled"})
	}
	if !totp.Validate(input.Code, *user.TOTPSecret) {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid code"})
	}

	if err := h.repo.DisableTOTP(c.Context(), userID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to disable 2FA"})
	}

	return c.JSON(fiber.Map{"message": "2FA disabled"})
}
