-- Migration: Add form sections, section-fields, and per-asset form config tables
-- Run this on the VPS PostgreSQL database
-- Safe to run multiple times (IF NOT EXISTS on all statements)

-- ut_forms may or may not already exist; create it if missing
CREATE TABLE IF NOT EXISTS ut_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utility_type_id UUID NOT NULL REFERENCES utility_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL DEFAULT 'engineer',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Form sections (groups of fields within a form)
CREATE TABLE IF NOT EXISTS ut_form_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES ut_forms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Junction: which fields belong to which section of which form
CREATE TABLE IF NOT EXISTS ut_form_section_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES ut_forms(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES ut_form_sections(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES ut_fields(id) ON DELETE CASCADE,
  required_override BOOLEAN,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Per-asset overrides: hide/show a field or change required for a specific asset
CREATE TABLE IF NOT EXISTS asset_form_field_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  form_section_field_id UUID NOT NULL REFERENCES ut_form_section_fields(id) ON DELETE CASCADE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  required_override BOOLEAN,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(asset_id, form_section_field_id)
);

-- Per-asset extra fields: fields added only for a specific asset (not in the utility template)
CREATE TABLE IF NOT EXISTS asset_extra_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  utility_type_id UUID NOT NULL REFERENCES utility_types(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES ut_forms(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES ut_form_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type field_type NOT NULL DEFAULT 'number',
  unit TEXT DEFAULT '',
  required BOOLEAN NOT NULL DEFAULT TRUE,
  computed BOOLEAN NOT NULL DEFAULT FALSE,
  formula TEXT,
  options JSONB DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ut_form_sections_form_id ON ut_form_sections(form_id);
CREATE INDEX IF NOT EXISTS idx_ut_form_section_fields_form_id ON ut_form_section_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_ut_form_section_fields_section_id ON ut_form_section_fields(section_id);
CREATE INDEX IF NOT EXISTS idx_asset_form_field_overrides_asset_id ON asset_form_field_overrides(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_extra_fields_asset_id ON asset_extra_fields(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_extra_fields_form_id ON asset_extra_fields(form_id);
