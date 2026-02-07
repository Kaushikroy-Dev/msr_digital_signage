/**
 * Script to update user password using Railway database connection
 * Usage: node scripts/update-password-railway.js <email> <newPassword>
 * Example: node scripts/update-password-railway.js demo@example.com Test@123
 * 
 * Connection details from Railway:
 * - Host: shortline.proxy.rlwy.net
 * - Port: 23932
 * - Database: railway (or digital_signage_db)
 * - User: postgres
 * - Password: GcRvCNYVIMwOlZSPAKWarhXPXvYCRcoW
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Railway database connection
const pool = new Pool({
    host: 'shortline.proxy.rlwy.net',
    port: 23932,
    database: 'railway', // Try 'railway' first, might need 'digital_signage_db'
    user: 'postgres',
    password: 'GcRvCNYVIMwOlZSPAKWarhXPXvYCRcoW',
    ssl: {
        rejectUnauthorized: false // Railway uses SSL
    }
});

async function updatePassword(email, newPassword) {
    const client = await pool.connect();
    try {
        console.log(`\n🔐 Connecting to Railway database...`);
        console.log(`📧 Updating password for: ${email}`);
        
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
        console.log(`✅ User found: ID ${userId}`);

        // Hash new password
        console.log(`🔒 Hashing new password...`);
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        await client.query('BEGIN');
        console.log(`💾 Updating password in database...`);
        await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);

        // Clear password history (allows reuse of this password) - only if table exists
        try {
            console.log(`🗑️  Clearing password history...`);
            await client.query('DELETE FROM password_history WHERE user_id = $1', [userId]);
            
            // Save new password to history
            console.log(`📝 Saving to password history...`);
            await client.query(
                'INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)',
                [userId, passwordHash]
            );
        } catch (historyError) {
            // Password history table might not exist yet - that's okay
            console.log(`⚠️  Password history table not found (this is okay if migrations haven't run yet)`);
        }

        await client.query('COMMIT');

        console.log(`\n✅ Password updated successfully!`);
        console.log(`\n📋 Login Credentials:`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${newPassword}\n`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`\n❌ Error: ${error.message}`);
        
        // If database name error, try alternative
        if (error.message.includes('database') || error.message.includes('does not exist')) {
            console.log(`\n💡 Tip: If you see a database error, the database name might be 'digital_signage_db' instead of 'railway'`);
            console.log(`   Edit the script and change: database: 'railway' to database: 'digital_signage_db'`);
        }
        
        process.exit(1);
    } finally {
        client.release();
    }
}

// Get command line arguments
const email = process.argv[2] || 'demo@example.com';
const password = process.argv[3] || 'Test@123';

console.log(`\n🚀 Railway Password Update Script`);
console.log(`=====================================\n`);

updatePassword(email, password)
    .then(() => {
        pool.end();
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        pool.end();
        process.exit(1);
    });
