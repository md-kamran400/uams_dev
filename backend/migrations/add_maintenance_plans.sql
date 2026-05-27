-- Maintenance Plans: named plan grouping multiple assets/equipment
CREATE TYPE maintenance_plan_status AS ENUM ('Draft', 'Active', 'Inactive', 'Archived');

CREATE TABLE IF NOT EXISTS maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  status maintenance_plan_status NOT NULL DEFAULT 'Draft',
  description TEXT,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_plan_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES maintenance_plans(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  equipment_no TEXT,
  equipment_desc TEXT,
  frequencies JSONB NOT NULL DEFAULT '[]',
  year INTEGER NOT NULL,
  remarks TEXT,
  actuals JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_entries_plan_id ON maintenance_plan_entries(plan_id);
CREATE INDEX IF NOT EXISTS idx_mp_entries_asset_id ON maintenance_plan_entries(asset_id);
