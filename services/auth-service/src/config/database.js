const { Pool } = require('pg');

// Support both Railway (PG*) and custom (DATABASE_*) environment variables
const pool = new Pool({
    host: process.env.DATABASE_HOST || process.env.PGHOST || 'localhost',
    port: process.env.DATABASE_PORT || process.env.PGPORT || 5432,
    database: process.env.DATABASE_NAME || process.env.PGDATABASE || 'digital_signage',
    user: process.env.DATABASE_USER || process.env.PGUSER || 'postgres',
    password: process.env.DATABASE_PASSWORD || process.env.PGPASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
});

module.exports = pool;
