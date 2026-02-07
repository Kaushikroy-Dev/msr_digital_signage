const { Pool } = require('pg');

// Get database connection from environment variables
const pool = new Pool({
    host: process.env.DATABASE_HOST || process.env.PGHOST,
    port: process.env.DATABASE_PORT || process.env.PGPORT || 5432,
    database: process.env.DATABASE_NAME || process.env.PGDATABASE || 'railway',
    user: process.env.DATABASE_USER || process.env.PGUSER || 'postgres',
    password: process.env.DATABASE_PASSWORD || process.env.PGPASSWORD,
});

async function runMigrations() {
    const client = await pool.connect();
    try {
        console.log('Starting migrations...');
        
        // Migration 1: Add player_id support to devices table
        console.log('Running migration: add_player_id_support.sql');
        
        await client.query(`
            ALTER TABLE devices 
            ADD COLUMN IF NOT EXISTS player_id VARCHAR(255);
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_devices_player_id ON devices(player_id);
        `);
        
        // Add unique constraint
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'devices_player_id_key'
                ) THEN
                    ALTER TABLE devices ADD CONSTRAINT devices_player_id_key UNIQUE (player_id);
                END IF;
            END $$;
        `);
        
        await client.query(`
            ALTER TABLE devices 
            ADD COLUMN IF NOT EXISTS device_token VARCHAR(255);
        `);
        
        await client.query(`
            ALTER TABLE devices 
            ADD COLUMN IF NOT EXISTS token_expiry TIMESTAMP WITH TIME ZONE;
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_devices_device_token ON devices(device_token);
        `);
        
        await client.query(`
            UPDATE devices 
            SET player_id = id::text 
            WHERE player_id IS NULL;
        `);
        
        console.log('✓ Migration 1 completed: add_player_id_support');
        
        // Migration 2: Enhance pairing_codes table
        console.log('Running migration: enhance_pairing_codes.sql');
        
        await client.query(`
            ALTER TABLE pairing_codes 
            ADD COLUMN IF NOT EXISTS player_id VARCHAR(255);
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_pairing_codes_player_id ON pairing_codes(player_id);
        `);
        
        console.log('✓ Migration 2 completed: enhance_pairing_codes');
        
        console.log('All migrations completed successfully!');
        
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();
