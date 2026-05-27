-- Migration: Add per-utility analytics layout config
-- Stores admin-curated chart positions/sizes/visibility/chart-type override
-- for the per-utility Analytics tab.

CREATE TABLE IF NOT EXISTS ut_analytics_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utility_type_id uuid NOT NULL UNIQUE REFERENCES utility_types(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by_id uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
