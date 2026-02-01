-- Migrate existing content to first property/zone for each tenant
-- This ensures all existing content has property_id and zone_id assigned

-- ============================================
-- MIGRATE MEDIA ASSETS
-- ============================================

UPDATE media_assets ma
SET 
    property_id = (
        SELECT p.id 
        FROM properties p 
        WHERE p.tenant_id = ma.tenant_id 
        ORDER BY p.created_at ASC 
        LIMIT 1
    ),
    zone_id = (
        SELECT z.id 
        FROM zones z 
        JOIN properties p ON z.property_id = p.id 
        WHERE p.tenant_id = ma.tenant_id 
        ORDER BY z.created_at ASC 
        LIMIT 1
    ),
    is_shared = false,
    shared_with_properties = ARRAY[]::UUID[]
WHERE ma.property_id IS NULL;

-- ============================================
-- MIGRATE TEMPLATES
-- ============================================

UPDATE templates t
SET 
    property_id = (
        SELECT p.id 
        FROM properties p 
        WHERE p.tenant_id = t.tenant_id 
        ORDER BY p.created_at ASC 
        LIMIT 1
    ),
    zone_id = (
        SELECT z.id 
        FROM zones z 
        JOIN properties p ON z.property_id = p.id 
        WHERE p.tenant_id = t.tenant_id 
        ORDER BY z.created_at ASC 
        LIMIT 1
    ),
    is_shared = false,
    shared_with_properties = ARRAY[]::UUID[]
WHERE t.property_id IS NULL;

-- ============================================
-- MIGRATE PLAYLISTS
-- ============================================

UPDATE playlists pl
SET 
    property_id = (
        SELECT p.id 
        FROM properties p 
        WHERE p.tenant_id = pl.tenant_id 
        ORDER BY p.created_at ASC 
        LIMIT 1
    ),
    zone_id = (
        SELECT z.id 
        FROM zones z 
        JOIN properties p ON z.property_id = p.id 
        WHERE p.tenant_id = pl.tenant_id 
        ORDER BY z.created_at ASC 
        LIMIT 1
    ),
    is_shared = false,
    shared_with_properties = ARRAY[]::UUID[]
WHERE pl.property_id IS NULL;

-- ============================================
-- MIGRATE SCHEDULES
-- ============================================

UPDATE schedules s
SET 
    property_id = (
        SELECT p.id 
        FROM properties p 
        WHERE p.tenant_id = s.tenant_id 
        ORDER BY p.created_at ASC 
        LIMIT 1
    ),
    zone_id = (
        SELECT z.id 
        FROM zones z 
        JOIN properties p ON z.property_id = p.id 
        WHERE p.tenant_id = s.tenant_id 
        ORDER BY z.created_at ASC 
        LIMIT 1
    )
WHERE s.property_id IS NULL;

-- ============================================
-- CREATE DEFAULT PROPERTIES/ZONES FOR TENANTS WITHOUT ANY
-- ============================================

-- Insert default property for tenants that have content but no properties
INSERT INTO properties (tenant_id, name, created_at)
SELECT DISTINCT ma.tenant_id, 'Default Property', NOW()
FROM media_assets ma
WHERE NOT EXISTS (
    SELECT 1 FROM properties p WHERE p.tenant_id = ma.tenant_id
)
ON CONFLICT DO NOTHING;

-- Insert default zone for properties that have content but no zones
INSERT INTO zones (property_id, name, created_at)
SELECT DISTINCT p.id, 'Default Zone', NOW()
FROM properties p
WHERE NOT EXISTS (
    SELECT 1 FROM zones z WHERE z.property_id = p.id
)
ON CONFLICT DO NOTHING;

-- Update any remaining NULL values with the newly created defaults
UPDATE media_assets ma
SET 
    property_id = (
        SELECT p.id 
        FROM properties p 
        WHERE p.tenant_id = ma.tenant_id 
        ORDER BY p.created_at ASC 
        LIMIT 1
    ),
    zone_id = (
        SELECT z.id 
        FROM zones z 
        JOIN properties p ON z.property_id = p.id 
        WHERE p.tenant_id = ma.tenant_id 
        ORDER BY z.created_at ASC 
        LIMIT 1
    )
WHERE ma.property_id IS NULL;

UPDATE templates t
SET 
    property_id = (
        SELECT p.id 
        FROM properties p 
        WHERE p.tenant_id = t.tenant_id 
        ORDER BY p.created_at ASC 
        LIMIT 1
    ),
    zone_id = (
        SELECT z.id 
        FROM zones z 
        JOIN properties p ON z.property_id = p.id 
        WHERE p.tenant_id = t.tenant_id 
        ORDER BY z.created_at ASC 
        LIMIT 1
    )
WHERE t.property_id IS NULL;

UPDATE playlists pl
SET 
    property_id = (
        SELECT p.id 
        FROM properties p 
        WHERE p.tenant_id = pl.tenant_id 
        ORDER BY p.created_at ASC 
        LIMIT 1
    ),
    zone_id = (
        SELECT z.id 
        FROM zones z 
        JOIN properties p ON z.property_id = p.id 
        WHERE p.tenant_id = pl.tenant_id 
        ORDER BY z.created_at ASC 
        LIMIT 1
    )
WHERE pl.property_id IS NULL;

UPDATE schedules s
SET 
    property_id = (
        SELECT p.id 
        FROM properties p 
        WHERE p.tenant_id = s.tenant_id 
        ORDER BY p.created_at ASC 
        LIMIT 1
    ),
    zone_id = (
        SELECT z.id 
        FROM zones z 
        JOIN properties p ON z.property_id = p.id 
        WHERE p.tenant_id = s.tenant_id 
        ORDER BY z.created_at ASC 
        LIMIT 1
    )
WHERE s.property_id IS NULL;
