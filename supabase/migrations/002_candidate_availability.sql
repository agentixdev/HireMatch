-- Add candidate availability fields
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS available_now BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS notice_period TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS available_from DATE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS open_to_relocation BOOLEAN NOT NULL DEFAULT false;
