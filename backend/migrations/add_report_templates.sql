-- Migration: Add admin-configurable report templates
-- Replaces the hardcoded report list in backend/src/lib/reports/data.ts with
-- per-utility-type templates the admin builds in Config → Reports.
--
-- Tables:
--   ut_report_templates          — one row per template (e.g. "Daily Operation")
--   ut_report_sections           — one row per section within a template
--   ut_report_section_columns    — one row per column within a section

CREATE TABLE IF NOT EXISTS ut_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utility_type_id UUID NOT NULL REFERENCES utility_types(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,                  -- stable id used by older clients; unique per utility
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'file-text',
  default_scope TEXT NOT NULL DEFAULT 'both',  -- 'asset' | 'utility' | 'both'
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(utility_type_id, slug)
);

CREATE TABLE IF NOT EXISTS ut_report_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES ut_report_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source TEXT NOT NULL,                -- 'submissions' | 'breakdowns' | 'pm_plans' | 'tickets' | 'spare_consumption' | 'computed'
  grouping TEXT NOT NULL DEFAULT 'row', -- 'none' | 'row' | 'date' | 'shift' | 'date_shift' | 'month' | 'status' | 'asset' | 'priority'
  filters JSONB DEFAULT '{}'::jsonb,    -- { status?: string[], priority?: string[], shift?: string[] }
  utility_scope_behavior TEXT NOT NULL DEFAULT 'append_asset_col',
                                        -- 'append_asset_col' | 'collapse_per_asset' | 'skip'
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS ut_report_section_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES ut_report_sections(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  -- Stable key used by formula columns + PDF/Excel/CSV output. Snake-case-ish.
  key TEXT NOT NULL,
  kind TEXT NOT NULL,                  -- 'builtin' | 'field' | 'aggregate' | 'formula'
  -- For kind='builtin': one of 'date','shift','operator','status','asset_name','priority','number','nature','task','frequency','last_done','next_due','assigned_to','reporter','created_at','downtime_hours','labor_hours','part_code','spare_name','qty'
  builtin TEXT,
  -- For kind='field' or 'aggregate': source utField (resolved by name OR id)
  field_id UUID REFERENCES ut_fields(id) ON DELETE SET NULL,
  field_name TEXT,                     -- denormalized snapshot so deletes don't break rendering
  -- For kind='aggregate': sum | avg | min | max | last | count
  aggregate TEXT,
  -- For kind='formula': expression referencing other column keys in this section
  formula TEXT,
  width INTEGER NOT NULL DEFAULT 80,
  align TEXT NOT NULL DEFAULT 'left',  -- 'left' | 'right' | 'center'
  -- Optional formatting hints: { digits?: number, dateFormat?: 'short'|'long' }
  format JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ut_report_templates_utility ON ut_report_templates(utility_type_id);
CREATE INDEX IF NOT EXISTS idx_ut_report_sections_template ON ut_report_sections(template_id);
CREATE INDEX IF NOT EXISTS idx_ut_report_section_columns_section ON ut_report_section_columns(section_id);
