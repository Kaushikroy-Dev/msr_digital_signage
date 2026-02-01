-- Add is_playing column to devices table
-- This column tracks whether the device is currently playing content

ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS is_playing BOOLEAN DEFAULT false;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_devices_is_playing ON public.devices(is_playing);

-- Update existing devices to have is_playing = false by default
UPDATE public.devices SET is_playing = false WHERE is_playing IS NULL;
