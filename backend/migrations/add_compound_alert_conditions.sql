-- Migration: Add compound OR conditions to alert rules
-- Enables rules like "< 5 OR > 10" (e.g., value out of a safe range)

ALTER TABLE ut_alert_rules ADD COLUMN IF NOT EXISTS condition2 condition;
ALTER TABLE ut_alert_rules ADD COLUMN IF NOT EXISTS value2 text;

ALTER TABLE asset_extra_alert_rules ADD COLUMN IF NOT EXISTS condition2 condition;
ALTER TABLE asset_extra_alert_rules ADD COLUMN IF NOT EXISTS value2 text;
