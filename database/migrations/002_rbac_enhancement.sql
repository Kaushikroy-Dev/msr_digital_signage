-- RBAC Enhancement Migration
-- Adds zone-level access control and updates user roles

-- Update users table to support zone_admin role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('super_admin', 'property_admin', 'zone_admin', 'content_editor', 'viewer'));

-- Create user_zone_access table for zone-level permissions
CREATE TABLE IF NOT EXISTS user_zone_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, zone_id)
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_zone_access_user ON user_zone_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_zone_access_zone ON user_zone_access(zone_id);
CREATE INDEX IF NOT EXISTS idx_user_property_access_user ON user_property_access(user_id);

-- Add pairing_codes table if not exists (for device pairing)
CREATE TABLE IF NOT EXISTS pairing_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(8) UNIQUE NOT NULL,
    device_info JSONB,
    assigned_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pairing_codes_code ON pairing_codes(code);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_expires ON pairing_codes(expires_at);

COMMIT;
