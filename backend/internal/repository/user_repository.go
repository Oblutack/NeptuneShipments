package repository

import (
	"context"
	"errors"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

type UserRepository struct {
	db *database.Service
}

func NewUserRepository(db *database.Service) *UserRepository {
	return &UserRepository{db: db}
}

// GetByEmail finds a user by email
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, company_name, role, created_at, totp_secret, totp_enabled
		FROM users
		WHERE email = $1
	`
	var user models.User
	err := r.db.GetPool().QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.FullName,
		&user.CompanyName, &user.Role, &user.CreatedAt, &user.TOTPSecret, &user.TOTPEnabled,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetByID finds a user by id - used by the TOTP setup/verify/disable
// endpoints, which only have the JWT's user_id claim to go on.
func (r *UserRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, company_name, role, created_at, totp_secret, totp_enabled
		FROM users
		WHERE id = $1
	`
	var user models.User
	err := r.db.GetPool().QueryRow(ctx, query, id).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.FullName,
		&user.CompanyName, &user.Role, &user.CreatedAt, &user.TOTPSecret, &user.TOTPEnabled,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// SetTOTPSecret stores a pending (not-yet-verified) TOTP secret.
func (r *UserRepository) SetTOTPSecret(ctx context.Context, userID string, secret string) error {
	_, err := r.db.GetPool().Exec(ctx,
		`UPDATE users SET totp_secret = $1, totp_enabled = FALSE WHERE id = $2`,
		secret, userID,
	)
	return err
}

// EnableTOTP flips totp_enabled on after the user has proven they can
// generate a valid code with the pending secret.
func (r *UserRepository) EnableTOTP(ctx context.Context, userID string) error {
	_, err := r.db.GetPool().Exec(ctx,
		`UPDATE users SET totp_enabled = TRUE WHERE id = $1`,
		userID,
	)
	return err
}

// DisableTOTP clears the secret entirely, not just the flag, so a
// re-enable always starts from a fresh secret.
func (r *UserRepository) DisableTOTP(ctx context.Context, userID string) error {
	_, err := r.db.GetPool().Exec(ctx,
		`UPDATE users SET totp_secret = NULL, totp_enabled = FALSE WHERE id = $1`,
		userID,
	)
	return err
}

// Create registers a new user (for Admin use)
func (r *UserRepository) Create(ctx context.Context, u *models.User) error {
	query := `
		INSERT INTO users (email, password_hash, full_name, company_name, role)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	err := r.db.GetPool().QueryRow(
		ctx, query,
		u.Email, u.PasswordHash, u.FullName, u.CompanyName, u.Role,
	).Scan(&u.ID, &u.CreatedAt)

	return err
}

func (r *UserRepository) CreateOrUpdate(ctx context.Context, u *models.User) error {
	query := `
        INSERT INTO users (email, password_hash, full_name, company_name, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE 
        SET full_name = EXCLUDED.full_name, company_name = EXCLUDED.company_name
        RETURNING id
    `
	// We only update name/company on conflict, keeping password/role stable
	err := r.db.GetPool().QueryRow(ctx, query, u.Email, u.PasswordHash, u.FullName, u.CompanyName, u.Role).Scan(&u.ID)
	return err
}
