-- Migration: Add engineer team assignment and revision history to tickets

-- Engineer team fields on tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS engineer_head_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS additional_engineer_ids UUID[] DEFAULT '{}';

-- Ticket revision history table
CREATE TABLE IF NOT EXISTS ticket_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  submitted_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  filled_values JSONB DEFAULT '{}',
  note TEXT,
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_revisions_ticket_id ON ticket_revisions(ticket_id);
