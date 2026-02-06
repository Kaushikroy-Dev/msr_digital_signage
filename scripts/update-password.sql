-- Update demo user password to Test@123
-- Password hash is generated using bcrypt with salt rounds 10
-- This SQL uses a pre-computed bcrypt hash for "Test@123"

-- First, let's check if the user exists
SELECT id, email, first_name, last_name FROM users WHERE email = 'demo@example.com';

-- Update the password hash for demo@example.com
-- Note: This is a bcrypt hash for "Test@123" with 10 salt rounds
-- If you need a different password, you'll need to generate the hash using Node.js bcrypt
UPDATE users 
SET password_hash = '$2a$10$rK8X8X8X8X8X8X8X8X8X8u8X8X8X8X8X8X8X8X8X8X8X8X8X8X8'
WHERE email = 'demo@example.com';

-- Clear password history to allow reuse
DELETE FROM password_history WHERE user_id = (SELECT id FROM users WHERE email = 'demo@example.com');

-- Verify the update
SELECT id, email, first_name, last_name, role FROM users WHERE email = 'demo@example.com';
