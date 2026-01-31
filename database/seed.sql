-- Create demo user
-- Password: password123 (hashed with bcrypt)
INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
VALUES (
  (SELECT id FROM tenants WHERE name = 'Demo Organization' LIMIT 1),
  'demo@example.com',
  '$2a$10$ybDhHHVaO0LfA8mTTRLg1.e2H77bpgECKE8H7DCyoxmk9k/CoTUfO',
  'Demo',
  'User',
  'super_admin'
) ON CONFLICT (email) DO NOTHING;

-- Create additional demo users
INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
VALUES 
  (
    (SELECT id FROM tenants WHERE name = 'Demo Organization' LIMIT 1),
    'admin@example.com',
    '$2a$10$ybDhHHVaO0LfA8mTTRLg1.e2H77bpgECKE8H7DCyoxmk9k/CoTUfO',
    'Admin',
    'User',
    'property_admin'
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Demo Organization' LIMIT 1),
    'editor@example.com',
    '$2a$10$ybDhHHVaO0LfA8mTTRLg1.e2H77bpgECKE8H7DCyoxmk9k/CoTUfO',
    'Content',
    'Editor',
    'content_editor'
  )
ON CONFLICT (email) DO NOTHING;

COMMIT;
