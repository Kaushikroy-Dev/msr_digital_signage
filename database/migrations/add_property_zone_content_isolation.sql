-- Add property and zone isolation to content tables
-- This migration adds property_id, zone_id, is_shared, and shared_with_properties columns

-- ============================================
-- MEDIA ASSETS
-- ============================================

ALTER TABLE media_assets 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_with_properties UUID[] DEFAULT ARRAY[]::UUID[];

-- ============================================
-- TEMPLATES
-- ============================================

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_with_properties UUID[] DEFAULT ARRAY[]::UUID[];

-- ============================================
-- PLAYLISTS
-- ============================================

ALTER TABLE playlists 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_with_properties UUID[] DEFAULT ARRAY[]::UUID[];

-- ============================================
-- SCHEDULES
-- ============================================

ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id) ON DELETE SET NULL;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_media_assets_property ON media_assets(property_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_zone ON media_assets(zone_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_shared ON media_assets(is_shared) WHERE is_shared = true;

CREATE INDEX IF NOT EXISTS idx_templates_property ON templates(property_id);
CREATE INDEX IF NOT EXISTS idx_templates_zone ON templates(zone_id);
CREATE INDEX IF NOT EXISTS idx_templates_shared ON templates(is_shared) WHERE is_shared = true;

CREATE INDEX IF NOT EXISTS idx_playlists_property ON playlists(property_id);
CREATE INDEX IF NOT EXISTS idx_playlists_zone ON playlists(zone_id);
CREATE INDEX IF NOT EXISTS idx_playlists_shared ON playlists(is_shared) WHERE is_shared = true;

CREATE INDEX IF NOT EXISTS idx_schedules_property ON schedules(property_id);
CREATE INDEX IF NOT EXISTS idx_schedules_zone ON schedules(zone_id);

-- GIN indexes for array searches (shared_with_properties)
CREATE INDEX IF NOT EXISTS idx_media_assets_shared_properties ON media_assets USING GIN(shared_with_properties);
CREATE INDEX IF NOT EXISTS idx_templates_shared_properties ON templates USING GIN(shared_with_properties);
CREATE INDEX IF NOT EXISTS idx_playlists_shared_properties ON playlists USING GIN(shared_with_properties);
