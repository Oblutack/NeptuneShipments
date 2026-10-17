-- An encrypted secret cannot be turned back into the plaintext seed in SQL,
-- and would not fit the old VARCHAR(64) anyway - so accounts that have an
-- encrypted secret get 2FA switched off here (they can set it up again).
UPDATE users SET totp_secret = NULL, totp_enabled = FALSE WHERE totp_secret LIKE 'v1:%';
ALTER TABLE users ALTER COLUMN totp_secret TYPE VARCHAR(64);
