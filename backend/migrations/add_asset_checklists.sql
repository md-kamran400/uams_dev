-- Migration: Add asset_checklists and asset_checklist_items tables
-- Run this on the PostgreSQL database

CREATE TABLE IF NOT EXISTS asset_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(asset_id, frequency)
);

CREATE TABLE IF NOT EXISTS asset_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES asset_checklists(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL,
  checking_method TEXT NOT NULL DEFAULT 'Visual',
  standard TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_asset_checklists_asset_id ON asset_checklists(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_checklist_items_checklist_id ON asset_checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_asset_checklist_items_asset_id ON asset_checklist_items(asset_id);
