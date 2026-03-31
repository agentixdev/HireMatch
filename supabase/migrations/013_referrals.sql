-- Add referral tracking
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS referred_by TEXT;
