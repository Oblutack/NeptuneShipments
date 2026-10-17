-- Encrypted TOTP secrets ("v1:" + base64 of nonce, ciphertext and tag) are
-- about 83 characters, well over the old VARCHAR(64) that held the plaintext
-- base32 seed. Existing plaintext rows are encrypted by the API on startup.
ALTER TABLE users ALTER COLUMN totp_secret TYPE TEXT;
