-- Migration: Add end_date column to maintenance_plans and 'Paused' to status enum
-- Enables admins to set a plan termination date and to temporarily pause ticket generation

ALTER TYPE maintenance_plan_status ADD VALUE IF NOT EXISTS 'Paused' BEFORE 'Inactive';

ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS end_date DATE;
