-- Add 'Needs Revision' and 'Resubmitted' to ticket_status enum
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'Needs Revision';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'Resubmitted';

-- Add asset_id to spares table (per-asset inventory)
ALTER TABLE spares ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_spares_asset_id ON spares(asset_id);
