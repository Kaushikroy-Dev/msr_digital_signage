/**
 * Script to reset user password directly in the database
 * Usage: node scripts/reset-user-password.js <email> <newPassword>
 * Example: node scripts/reset-user-password.js demo@example.com Test@123
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'postgres'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'digital_signage'}`,
});

async function resetPassword(email, newPassword) {
    const client = await pool.connect();
    try {
        console.log(`\n🔐 Resetting password for: ${email}`);
        
        // Validate password meets requirements
        if (!newPassword || newPassword.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }
        if (!/[A-Z]/.test(newPassword)) {
            throw new Error('Password must contain at least one uppercase letter');
        }
        if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newPassword)) {
            throw new Error('Password must contain at least one special character');
        }
        if (!/[0-9]/.test(newPassword)) {
            throw new Error('Password must contain at least one numeric digit');
        }

        // Check if user exists
        const userResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            throw new Error(`User with email ${email} not found`);
        }

        const userId = userResult.rows[0].id;

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        await client.query('BEGIN');
        await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);

        // Clear password history (optional - allows reuse of this password)
        await client.query('DELETE FROM password_history WHERE user_id = $1', [userId]);

        // Save new password to history
        await client.query(
            'INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)',
            [userId, passwordHash]
        );

        await client.query('COMMIT');

        console.log(`✅ Password reset successfully for ${email}`);
        console.log(`   New password: ${newPassword}`);
        console.log(`\n⚠️  You can now login with these credentials:`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${newPassword}\n`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    } finally {
        client.release();
    }
}

// Get command line arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.error('Usage: node scripts/reset-user-password.js <email> <newPassword>');
    console.error('Example: node scripts/reset-user-password.js demo@example.com Test@123');
    process.exit(1);
}

resetPassword(email, password)
    .then(() => {
        pool.end();
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        pool.end();
        process.exit(1);
    });
