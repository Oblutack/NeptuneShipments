package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/secretbox"
	"github.com/jackc/pgx/v5"
)

type UserRepository struct {
	db *database.Service
	// box encrypts TOTP secrets at rest. Nil is allowed for callers that
	// never touch 2FA (the seeder, most tests); anything that would need
	// to encrypt or decrypt a secret then returns an error instead.
	box *secretbox.Box
}

func NewUserRepository(db *database.Service, box *secretbox.Box) *UserRepository {
	return &UserRepository{db: db, box: box}
}

// openTOTPSecret decrypts a stored secret in place. A value without the
// encrypted marker is a plaintext secret from before encryption existed
// (the startup pass re-encrypts those), and is returned as is so 2FA
// logins keep working in the meantime.
func (r *UserRepository) openTOTPSecret(u *models.User) error {
	if u.TOTPSecret == nil || !secretbox.IsEncrypted(*u.TOTPSecret) {
		return nil
	}
	if r.box == nil {
		return errors.New("user has an encrypted TOTP secret but no encryption key is configured")
	}
	plain, err := r.box.Decrypt(*u.TOTPSecret)
	if err != nil {
		return fmt.Errorf("decrypt TOTP secret: %w", err)
	}
	u.TOTPSecret = &plain
	return nil
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
	if err := r.openTOTPSecret(&user); err != nil {
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
	if err := r.openTOTPSecret(&user); err != nil {
		return nil, err
	}
	return &user, nil
}

// SetTOTPSecret stores a pending (not-yet-verified) TOTP secret, encrypted.
func (r *UserRepository) SetTOTPSecret(ctx context.Context, userID string, secret string) error {
	if r.box == nil {
		return errors.New("cannot store a TOTP secret: no encryption key is configured")
	}
	encrypted, err := r.box.Encrypt(secret)
	if err != nil {
		return err
	}
	_, err = r.db.GetPool().Exec(ctx,
		`UPDATE users SET totp_secret = $1, totp_enabled = FALSE WHERE id = $2`,
		encrypted, userID,
	)
	return err
}

// EncryptLegacyTOTPSecretFor encrypts one user's TOTP secret if it is
// still stored as plaintext. Reports whether it changed anything.
func (r *UserRepository) EncryptLegacyTOTPSecretFor(ctx context.Context, userID string) (bool, error) {
	if r.box == nil {
		return false, errors.New("no encryption key is configured")
	}
	var stored *string
	if err := r.db.GetPool().QueryRow(ctx, `SELECT totp_secret FROM users WHERE id = $1`, userID).Scan(&stored); err != nil {
		return false, err
	}
	if stored == nil || secretbox.IsEncrypted(*stored) {
		return false, nil
	}
	encrypted, err := r.box.Encrypt(*stored)
	if err != nil {
		return false, err
	}
	// Matching on the old value keeps this safe against a concurrent
	// SetTOTPSecret writing a newer secret between the read and the write.
	tag, err := r.db.GetPool().Exec(ctx,
		`UPDATE users SET totp_secret = $1 WHERE id = $2 AND totp_secret = $3`,
		encrypted, userID, *stored)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

// EncryptLegacyTOTPSecrets encrypts every TOTP secret still stored as
// plaintext - run once at startup so no plaintext seed outlives the
// upgrade. Returns how many rows it encrypted.
func (r *UserRepository) EncryptLegacyTOTPSecrets(ctx context.Context) (int, error) {
	rows, err := r.db.GetPool().Query(ctx,
		`SELECT id FROM users WHERE totp_secret IS NOT NULL AND totp_secret NOT LIKE 'v1:%'`)
	if err != nil {
		return 0, err
	}
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return 0, err
		}
		ids = append(ids, id)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, err
	}

	n := 0
	for _, id := range ids {
		changed, err := r.EncryptLegacyTOTPSecretFor(ctx, id)
		if err != nil {
			return n, fmt.Errorf("encrypt TOTP secret for user %s: %w", id, err)
		}
		if changed {
			n++
		}
	}
	return n, nil
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
