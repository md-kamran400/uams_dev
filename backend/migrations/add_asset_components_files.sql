-- Migration: Add asset_components and asset_files tables
-- Run this on the VPS PostgreSQL database

CREATE TABLE IF NOT EXISTS asset_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "group" TEXT NOT NULL DEFAULT 'General',
  part_number TEXT DEFAULT '',
  condition TEXT NOT NULL DEFAULT 'Good',
  last_checked DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS asset_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  size_bytes INTEGER DEFAULT 0,
  uploaded_by_id UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL,
  url TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_asset_components_asset_id ON asset_components(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_files_asset_id ON asset_files(asset_id);

-- Seed some demo components for existing DG Set assets (optional)
-- Replace 'YOUR-DG-ASSET-ID' with an actual asset UUID from your assets table
-- INSERT INTO asset_components (asset_id, name, "group", part_number, condition, last_checked)
-- SELECT id, 'Engine Block', 'Engine', 'EB-KG2-001', 'Good', '2025-02-01' FROM assets WHERE name LIKE 'DG%' LIMIT 1;
