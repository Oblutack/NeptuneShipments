// Package secretbox encrypts small secrets (such as TOTP seeds) for storage
// in the database, so a leaked database dump or backup alone doesn't hand
// over working 2FA seeds.
package secretbox

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
)

// version prefixes every stored value. It both marks a value as encrypted
// (the secrets it replaces are uppercase base32, which can never contain a
// colon) and leaves room to change the scheme or rotate keys later.
const version = "v1:"

const keySize = 32 // AES-256

type Box struct {
	aead cipher.AEAD
}

// New builds a Box from a 32-byte key.
func New(key []byte) (*Box, error) {
	if len(key) != keySize {
		return nil, fmt.Errorf("secretbox: key must be %d bytes, got %d", keySize, len(key))
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &Box{aead: aead}, nil
}

// KeyFromBase64 decodes a base64 (standard or URL-safe) 32-byte key, as
// produced by `openssl rand -base64 32`.
func KeyFromBase64(s string) ([]byte, error) {
	s = strings.TrimSpace(s)
	key, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		var urlErr error
		if key, urlErr = base64.URLEncoding.DecodeString(s); urlErr != nil {
			return nil, errors.New("secretbox: key is not valid base64")
		}
	}
	if len(key) != keySize {
		return nil, fmt.Errorf("secretbox: key must decode to %d bytes, got %d", keySize, len(key))
	}
	return key, nil
}

// DevKey derives a stable key from another secret. Only for local
// development, where requiring a second secret just to run the app would
// be friction: it's exactly as strong as the secret it's derived from.
func DevKey(seed string) []byte {
	sum := sha256.Sum256([]byte("neptune-secretbox-dev|" + seed))
	return sum[:]
}

// IsEncrypted reports whether a stored value was produced by Encrypt.
func IsEncrypted(s string) bool {
	return strings.HasPrefix(s, version)
}

// Encrypt returns "v1:" + base64(nonce || ciphertext). A fresh random
// nonce per call means encrypting the same secret twice gives different
// output.
func (b *Box) Encrypt(plaintext string) (string, error) {
	nonce := make([]byte, b.aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", fmt.Errorf("secretbox: generate nonce: %w", err)
	}
	sealed := b.aead.Seal(nonce, nonce, []byte(plaintext), nil)
	return version + base64.StdEncoding.EncodeToString(sealed), nil
}

// Decrypt reverses Encrypt. It fails (rather than returning garbage) if the
// value was tampered with or encrypted under a different key.
func (b *Box) Decrypt(stored string) (string, error) {
	if !IsEncrypted(stored) {
		return "", errors.New("secretbox: value is not encrypted")
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(stored, version))
	if err != nil {
		return "", errors.New("secretbox: malformed encrypted value")
	}
	ns := b.aead.NonceSize()
	if len(raw) < ns+b.aead.Overhead() {
		return "", errors.New("secretbox: encrypted value too short")
	}
	plain, err := b.aead.Open(nil, raw[:ns], raw[ns:], nil)
	if err != nil {
		return "", errors.New("secretbox: decryption failed (wrong key or tampered value)")
	}
	return string(plain), nil
}
