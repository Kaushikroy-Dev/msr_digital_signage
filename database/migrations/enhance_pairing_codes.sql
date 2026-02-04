-- Migration: Enhance Pairing Codes for Android TV App
-- This migration adds player_id support to pairing_codes table

-- Add player_id to pairing_codes for Android app flow
ALTER TABLE pairing_codes 
ADD COLUMN IF NOT EXISTS player_id VARCHAR(255);

-- Create index for fast player_id lookups in pairing_codes
CREATE INDEX IF NOT EXISTS idx_pairing_codes_player_id ON pairing_codes(player_id);

-- Add comment for documentation
COMMENT ON COLUMN pairing_codes.player_id IS 'Player ID from Android app. Used to link pairing code to specific device instance.';
