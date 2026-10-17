-- Classification society survey / dry-dock due date, a real maritime
-- compliance concept (periodic hull/machinery inspection every vessel
-- actually needs to keep its class certificate current).
ALTER TABLE vessels ADD COLUMN next_survey_due DATE;

-- Seed a plausible due date for existing vessels so the feature has
-- something to show immediately - spread across the next ~18 months.
UPDATE vessels SET next_survey_due = CURRENT_DATE + (floor(random() * 540))::int * INTERVAL '1 day';
