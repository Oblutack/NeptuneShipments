-- STCW (Standards of Training, Certification and Watchkeeping) is a real
-- IMO convention - every real seafarer's certificate of competency has a
-- genuine expiry date that has to be tracked and renewed.
ALTER TABLE crew ADD COLUMN cert_expiry_date DATE;

-- Seed plausible expiry dates - most valid for a while, a few expiring
-- soon so the "expiring soon" alert actually has something to show.
UPDATE crew SET cert_expiry_date = CURRENT_DATE + (30 + floor(random() * 700))::int * INTERVAL '1 day';
