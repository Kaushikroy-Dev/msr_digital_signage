-- Comprehensive Seed Data for Digital Signage Platform
-- This script populates the hierarchy for testing RBAC

BEGIN;

-- 1. Ensure Tenant exists
INSERT INTO tenants (name, subdomain, status, subscription_tier)
VALUES ('Demo Organization', 'demo', 'active', 'enterprise')
ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name;

-- Get Tenant ID
DO $$
DECLARE
    t_id UUID;
    p1_id UUID;
    p2_id UUID;
    z1_id UUID;
    z2_id UUID;
    z3_id UUID;
    u_super_id UUID;
    u_padmin_id UUID;
    u_zadmin_id UUID;
BEGIN
    SELECT id INTO t_id FROM tenants WHERE subdomain = 'demo';

    -- 2. Create Properties
    INSERT INTO properties (tenant_id, name, address, city, state, country, timezone)
    VALUES (t_id, 'HQ Building', '123 Tech Ave', 'New York', 'NY', 'USA', 'America/New_York')
    ON CONFLICT DO NOTHING
    RETURNING id INTO p1_id;

    IF p1_id IS NULL THEN
        SELECT id INTO p1_id FROM properties WHERE name = 'HQ Building' AND tenant_id = t_id;
    END IF;

    INSERT INTO properties (tenant_id, name, address, city, state, country, timezone)
    VALUES (t_id, 'London Office', '45 Regent St', 'London', NULL, 'UK', 'Europe/London')
    ON CONFLICT DO NOTHING
    RETURNING id INTO p2_id;

    IF p2_id IS NULL THEN
        SELECT id INTO p2_id FROM properties WHERE name = 'London Office' AND tenant_id = t_id;
    END IF;

    -- 3. Create Zones (Areas)
    INSERT INTO zones (property_id, name, description, zone_type)
    VALUES (p1_id, 'Main Lobby', 'HQ Entrance', 'lobby')
    ON CONFLICT DO NOTHING
    RETURNING id INTO z1_id;

    IF z1_id IS NULL THEN
        SELECT id INTO z1_id FROM zones WHERE name = 'Main Lobby' AND property_id = p1_id;
    END IF;

    INSERT INTO zones (property_id, name, description, zone_type)
    VALUES (p1_id, 'Employee Cafe', '2nd Floor Breakroom', 'bar')
    ON CONFLICT DO NOTHING
    RETURNING id INTO z2_id;

    IF z2_id IS NULL THEN
        SELECT id INTO z2_id FROM zones WHERE name = 'Employee Cafe' AND property_id = p1_id;
    END IF;

    INSERT INTO zones (property_id, name, description, zone_type)
    VALUES (p2_id, 'Reception', 'London Ground Floor', 'lobby')
    ON CONFLICT DO NOTHING
    RETURNING id INTO z3_id;

    IF z3_id IS NULL THEN
        SELECT id INTO z3_id FROM zones WHERE name = 'Reception' AND property_id = p2_id;
    END IF;

    -- 4. Create Users (Password: password123)
    -- Super Admin
    INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
    VALUES (t_id, 'super@example.com', '$2a$10$ybDhHHVaO0LfA8mTTRLg1.e2H77bpgECKE8H7DCyoxmk9k/CoTUfO', 'Super', 'Admin', 'super_admin')
    ON CONFLICT (email) DO UPDATE SET role = 'super_admin'
    RETURNING id INTO u_super_id;

    -- Property Admin (HQ Only)
    INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
    VALUES (t_id, 'hq-admin@example.com', '$2a$10$ybDhHHVaO0LfA8mTTRLg1.e2H77bpgECKE8H7DCyoxmk9k/CoTUfO', 'HQ', 'Manager', 'property_admin')
    ON CONFLICT (email) DO UPDATE SET role = 'property_admin'
    RETURNING id INTO u_padmin_id;

    -- Area Admin (Lobby Only)
    INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
    VALUES (t_id, 'lobby-admin@example.com', '$2a$10$ybDhHHVaO0LfA8mTTRLg1.e2H77bpgECKE8H7DCyoxmk9k/CoTUfO', 'Lobby', 'Staff', 'zone_admin')
    ON CONFLICT (email) DO UPDATE SET role = 'zone_admin'
    RETURNING id INTO u_zadmin_id;

    -- 5. Assign Access
    INSERT INTO user_property_access (user_id, property_id)
    VALUES (u_padmin_id, p1_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO user_zone_access (user_id, zone_id)
    VALUES (u_zadmin_id, z1_id)
    ON CONFLICT DO NOTHING;

    -- 6. Create Devices
    INSERT INTO devices (zone_id, device_name, device_code, platform, status)
    VALUES (z1_id, 'Lobby Welcome Screen', 'HQ-LOB-01', 'webos', 'online')
    ON CONFLICT (device_code) DO NOTHING;

    INSERT INTO devices (zone_id, device_name, device_code, platform, status)
    VALUES (z1_id, 'Lobby Directory', 'HQ-LOB-02', 'webos', 'online')
    ON CONFLICT (device_code) DO NOTHING;

    INSERT INTO devices (zone_id, device_name, device_code, platform, status)
    VALUES (z2_id, 'Cafe Menu North', 'HQ-CAF-01', 'android', 'online')
    ON CONFLICT (device_code) DO NOTHING;

    INSERT INTO devices (zone_id, device_name, device_code, platform, status)
    VALUES (z3_id, 'London Rec 01', 'LON-REC-01', 'tizen', 'online')
    ON CONFLICT (device_code) DO NOTHING;

END $$;

COMMIT;
