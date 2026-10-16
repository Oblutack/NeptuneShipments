package models

import "time"

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"full_name"`
	CompanyName  string    `json:"company_name"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
	TOTPSecret   *string   `json:"-"`
	TOTPEnabled  bool      `json:"totp_enabled"`
}

type RegisterInput struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	FullName    string `json:"full_name"`
	CompanyName string `json:"company_name"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	TOTPCode string `json:"totp_code"`
}
