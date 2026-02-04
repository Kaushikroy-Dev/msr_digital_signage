-- Migration: Add Player ID Support for Android TV App
-- This migration adds player_id, device_token, and token_expiry columns to support
-- Android TV app WebView player integration

-- Add player_id column to devices table (for Android app)
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS player_id VARCHAR(255);

-- Add unique constraint on player_id (after adding column)
-- First, create index, then add constraint
CREATE INDEX IF NOT EXISTS idx_devices_player_id ON devices(player_id);

-- Add unique constraint (will fail if duplicates exist, so handle carefully)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'devices_player_id_key'
    ) THEN
        ALTER TABLE devices ADD CONSTRAINT devices_player_id_key UNIQUE (player_id);
    END IF;
END $$;

-- Add device_token for authentication
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS device_token VARCHAR(255);

-- Add token_expiry
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS token_expiry TIMESTAMP WITH TIME ZONE;

-- Create index for device_token lookups
CREATE INDEX IF NOT EXISTS idx_devices_device_token ON devices(device_token);

-- Update existing devices to generate player_id from id (if not set)
-- This ensures backward compatibility
UPDATE devices 
SET player_id = id::text 
WHERE player_id IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN devices.player_id IS 'Unique player identifier for Android TV app. Can be UUID or custom string.';
COMMENT ON COLUMN devices.device_token IS 'Authentication token for device API access. Generated after pairing.';
COMMENT ON COLUMN devices.token_expiry IS 'Expiration timestamp for device_token. Tokens expire after 30 days.';
