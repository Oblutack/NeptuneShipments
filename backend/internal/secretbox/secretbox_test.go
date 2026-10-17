package secretbox

import (
	"bytes"
	"encoding/base64"
	"strings"
	"testing"
)

func testBox(t *testing.T, fill byte) *Box {
	t.Helper()
	b, err := New(bytes.Repeat([]byte{fill}, 32))
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	return b
}

func TestRoundTrip(t *testing.T) {
	b := testBox(t, 1)
	const secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"
	enc, err := b.Encrypt(secret)
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	if !IsEncrypted(enc) {
		t.Errorf("Encrypt output %q isn't recognised as encrypted", enc)
	}
	if strings.Contains(enc, secret) {
		t.Errorf("ciphertext %q contains the plaintext", enc)
	}
	got, err := b.Decrypt(enc)
	if err != nil || got != secret {
		t.Errorf("Decrypt = %q, %v; want %q", got, err, secret)
	}
}

func TestEncryptIsRandomised(t *testing.T) {
	b := testBox(t, 1)
	a, _ := b.Encrypt("same")
	c, _ := b.Encrypt("same")
	if a == c {
		t.Error("encrypting the same value twice produced identical output - the nonce isn't random")
	}
}

func TestDecryptRejectsTamperingAndWrongKey(t *testing.T) {
	b := testBox(t, 1)
	enc, _ := b.Encrypt("secret")

	raw, _ := base64.StdEncoding.DecodeString(strings.TrimPrefix(enc, version))
	raw[len(raw)-1] ^= 0xff
	tampered := version + base64.StdEncoding.EncodeToString(raw)
	if _, err := b.Decrypt(tampered); err == nil {
		t.Error("a tampered ciphertext decrypted successfully")
	}
	if _, err := testBox(t, 2).Decrypt(enc); err == nil {
		t.Error("decrypting under a different key succeeded")
	}
	for _, bad := range []string{"", "JBSWY3DP", "v1:", "v1:!!!notbase64", "v1:AAAA"} {
		if _, err := b.Decrypt(bad); err == nil {
			t.Errorf("Decrypt(%q) succeeded, want an error", bad)
		}
	}
}

func TestNewAndKeyFromBase64ValidateLength(t *testing.T) {
	if _, err := New(make([]byte, 16)); err == nil {
		t.Error("New accepted a 16-byte key")
	}
	good := base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{9}, 32))
	if key, err := KeyFromBase64(good + "\n"); err != nil || len(key) != 32 {
		t.Errorf("KeyFromBase64(valid) = %d bytes, %v", len(key), err)
	}
	short := base64.StdEncoding.EncodeToString(make([]byte, 16))
	for _, bad := range []string{"", "not base64 at all!", short} {
		if _, err := KeyFromBase64(bad); err == nil {
			t.Errorf("KeyFromBase64(%q) succeeded, want an error", bad)
		}
	}
}

func TestDevKeyIsStableAndSeeded(t *testing.T) {
	if !bytes.Equal(DevKey("a"), DevKey("a")) {
		t.Error("DevKey isn't deterministic")
	}
	if bytes.Equal(DevKey("a"), DevKey("b")) {
		t.Error("different seeds gave the same key")
	}
	if _, err := New(DevKey("a")); err != nil {
		t.Errorf("DevKey isn't a valid key: %v", err)
	}
}
