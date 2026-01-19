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
		SELECT id, email, password_hash, full_name, company_name, role, created_at 
		FROM users 
		WHERE email = $1
	`
	var user models.User
	err := r.db.GetPool().QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.FullName, 
		&user.CompanyName, &user.Role, &user.CreatedAt,
	)
	
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil 
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
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