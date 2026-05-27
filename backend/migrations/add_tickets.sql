-- Add ticket_type enum
DO $$ BEGIN
  CREATE TYPE ticket_type AS ENUM ('Data Entry', 'PM Plan', 'Breakdown');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add ticket_status enum
DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('Open', 'Assigned', 'In Progress', 'Submitted', 'Approved', 'Rejected', 'Closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  type ticket_type NOT NULL,
  priority VARCHAR(10) NOT NULL DEFAULT 'Medium',
  status ticket_status NOT NULL DEFAULT 'Open',

  -- Scope
  utility_type_id UUID REFERENCES utility_types(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,

  -- For Data Entry tickets
  form_id UUID REFERENCES ut_forms(id) ON DELETE SET NULL,

  -- For PM Plan tickets
  pm_plan_id UUID REFERENCES pm_plans(id) ON DELETE SET NULL,

  -- For Breakdown tickets
  breakdown_id UUID REFERENCES breakdowns(id) ON DELETE SET NULL,

  -- Submission (filled by engineer)
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,

  -- People
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  submitted_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,

  -- Submission values stored directly for non-submission types
  filled_values JSONB DEFAULT '{}',

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type);
CREATE INDEX IF NOT EXISTS idx_tickets_utility_type ON tickets(utility_type_id);
