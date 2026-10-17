package repository

import (
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/secretbox"
	"github.com/Oblutack/NeptuneShipments/backend/internal/testutil"
)

func testSecretBox(t *testing.T, fill byte) *secretbox.Box {
	t.Helper()
	box, err := secretbox.New(bytes.Repeat([]byte{fill}, 32))
	if err != nil {
		t.Fatalf("secretbox.New: %v", err)
	}
	return box
}

// TOTP seeds must not sit in the database in the clear: a leaked dump or
// backup would otherwise hand over working 2FA for every account that
// uses it. This checks the actual stored column, not just that the
// repository round-trips.
func TestUserRepository_TOTPSecretIsEncryptedAtRest(t *testing.T) {
	db := testutil.RequireDB(t)
	ctx := context.Background()
	pool := db.GetPool()
	repo := NewUserRepository(db, testSecretBox(t, 1))

	suffix := testutil.UniqueSuffix()
	user := &models.User{Email: "test-totp-" + suffix + "@example.com", PasswordHash: "x", FullName: "TOTP Test", Role: "ADMIN"}
	if err := repo.Create(ctx, user); err != nil {
		t.Fatalf("create user: %v", err)
	}
	t.Cleanup(func() { pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, user.ID) })

	const seed = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"
	if err := repo.SetTOTPSecret(ctx, user.ID, seed); err != nil {
		t.Fatalf("SetTOTPSecret: %v", err)
	}

	var raw string
	if err := pool.QueryRow(ctx, `SELECT totp_secret FROM users WHERE id = $1`, user.ID).Scan(&raw); err != nil {
		t.Fatalf("read raw column: %v", err)
	}
	if strings.Contains(raw, seed) || !secretbox.IsEncrypted(raw) {
		t.Errorf("stored totp_secret = %q, want an encrypted value that doesn't contain the seed", raw)
	}

	for name, load := range map[string]func() (*models.User, error){
		"GetByID":    func() (*models.User, error) { return repo.GetByID(ctx, user.ID) },
		"GetByEmail": func() (*models.User, error) { return repo.GetByEmail(ctx, user.Email) },
	} {
		got, err := load()
		if err != nil || got == nil || got.TOTPSecret == nil || *got.TOTPSecret != seed {
			t.Errorf("%s: secret = %v, err = %v; want the original seed back", name, got, err)
		}
	}

	// A repository holding a different key must fail loudly, not hand back
	// garbage that would then be compared against a user's 2FA code.
	if _, err := NewUserRepository(db, testSecretBox(t, 2)).GetByID(ctx, user.ID); err == nil {
		t.Error("GetByID with the wrong key succeeded, want a decryption error")
	}
	if _, err := NewUserRepository(db, nil).GetByID(ctx, user.ID); err == nil {
		t.Error("GetByID with no key succeeded on an encrypted secret, want an error")
	}
}

// Rows written before encryption existed hold the plaintext seed. They
// must keep working until the startup pass encrypts them, and that pass
// must actually encrypt them. Scoped to this test's own user: the
// all-users pass would also rewrite any real account in a shared dev DB.
func TestUserRepository_LegacyPlaintextSecretIsReadableThenEncrypted(t *testing.T) {
	db := testutil.RequireDB(t)
	ctx := context.Background()
	pool := db.GetPool()
	repo := NewUserRepository(db, testSecretBox(t, 1))

	suffix := testutil.UniqueSuffix()
	user := &models.User{Email: "test-legacy-totp-" + suffix + "@example.com", PasswordHash: "x", FullName: "Legacy", Role: "ADMIN"}
	if err := repo.Create(ctx, user); err != nil {
		t.Fatalf("create user: %v", err)
	}
	t.Cleanup(func() { pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, user.ID) })

	const seed = "KRSXG5CTMVRXEZLUKRSXG5CTMVRXEZLU"
	if _, err := pool.Exec(ctx, `UPDATE users SET totp_secret = $1, totp_enabled = TRUE WHERE id = $2`, seed, user.ID); err != nil {
		t.Fatalf("write legacy plaintext row: %v", err)
	}

	got, err := repo.GetByID(ctx, user.ID)
	if err != nil || got.TOTPSecret == nil || *got.TOTPSecret != seed {
		t.Fatalf("legacy plaintext row: secret = %v, err = %v; want it readable as is", got, err)
	}

	changed, err := repo.EncryptLegacyTOTPSecretFor(ctx, user.ID)
	if err != nil || !changed {
		t.Fatalf("EncryptLegacyTOTPSecretFor = %v, %v; want true, nil", changed, err)
	}
	var raw string
	pool.QueryRow(ctx, `SELECT totp_secret FROM users WHERE id = $1`, user.ID).Scan(&raw)
	if strings.Contains(raw, seed) || !secretbox.IsEncrypted(raw) {
		t.Errorf("after the startup pass totp_secret = %q, want encrypted", raw)
	}
	if got, err := repo.GetByID(ctx, user.ID); err != nil || *got.TOTPSecret != seed || !got.TOTPEnabled {
		t.Errorf("after encryption: secret/enabled = %v, err = %v; want the same seed and 2FA still enabled", got, err)
	}

	if changed, err := repo.EncryptLegacyTOTPSecretFor(ctx, user.ID); err != nil || changed {
		t.Errorf("second run = %v, %v; want false, nil (already encrypted)", changed, err)
	}
}
