-- Migration: Add minValue and maxValue columns to ut_alert_rules
-- Enables single-boundary (above/below) and range (min+max) alert thresholds

ALTER TABLE ut_alert_rules ADD COLUMN IF NOT EXISTS min_value TEXT;
ALTER TABLE ut_alert_rules ADD COLUMN IF NOT EXISTS max_value TEXT;
