const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:4173'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || corsOrigins.indexOf(origin) !== -1 || origin.endsWith('.railway.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
const jwt = require('jsonwebtoken');
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('[Auth] Request received:', {
        path: req.path,
        method: req.method,
        hasAuthHeader: !!authHeader,
        authHeaderPrefix: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
        hasToken: !!token,
        jwtSecretLength: JWT_SECRET ? JWT_SECRET.length : 0,
        jwtSecretPrefix: JWT_SECRET ? JWT_SECRET.substring(0, 5) + '...' : 'undefined'
    });

    if (!token) {
        console.warn('[Auth] No token provided in Authorization header');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('[Auth] Device service JWT Verification failed:', {
                message: err.message,
                name: err.name,
                expiredAt: err.expiredAt,
                secretUsedLength: JWT_SECRET ? JWT_SECRET.length : 0
            });
            return res.status(401).json({
                error: 'Unauthorized',
                details: err.message,
                hint: 'Try logging out and in again. This could also be a configuration mismatch between services.'
            });
        }
        console.log('[Auth] Device service Token verified successfully for user:', user.userId || user.id);
        req.user = user;
        next();
    });
}

// Comprehensive database configuration - supports all Railway formats
function getDatabaseConfig() {
    // Priority 1: DATABASE_URL (Railway sometimes provides this)
    if (process.env.DATABASE_URL) {
        console.log('✅ Using DATABASE_URL from environment');
        return {
            connectionString: process.env.DATABASE_URL,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        };
    }

    // Priority 2: Railway's standard PostgreSQL variables (PG*)
    // Priority 3: Custom variables (DATABASE_*)
    // Priority 4: Defaults (for local development only)
    const config = {
        host: process.env.PGHOST || process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.PGPORT || process.env.DATABASE_PORT || '5432'),
        database: process.env.DATABASE_NAME || process.env.PGDATABASE || 'railway',
        user: process.env.PGUSER || process.env.DATABASE_USER || 'postgres',
        password: process.env.PGPASSWORD || process.env.DATABASE_PASSWORD || 'postgres',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    };

    // Validate we have required credentials (in production, don't use defaults)
    const isProduction = process.env.NODE_ENV === 'production';
    const hasCredentials = (
        (process.env.PGHOST || process.env.DATABASE_HOST) &&
        (process.env.PGPASSWORD || process.env.DATABASE_PASSWORD)
    );

    if (isProduction && !hasCredentials && !process.env.DATABASE_URL) {
        console.warn('⚠️ WARNING: Missing database credentials in production!');
        console.warn('📋 Available environment variables:');
        console.warn('   DATABASE_URL:', !!process.env.DATABASE_URL);
        console.warn('   PGHOST:', !!process.env.PGHOST);
        console.warn('   DATABASE_HOST:', !!process.env.DATABASE_HOST);
        console.warn('   PGPASSWORD:', !!process.env.PGPASSWORD);
        console.warn('   DATABASE_PASSWORD:', !!process.env.DATABASE_PASSWORD);
        console.warn('');
        console.warn('🔧 FIX REQUIRED: In Railway dashboard, link your database or');
        console.warn('   manually add PGPASSWORD/DATABASE_PASSWORD to your variables.');
    }


    // Log database config (without password) for debugging
    console.log('🔍 Database Config:', {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        passwordSet: !!config.password && config.password !== 'postgres',
        passwordLength: config.password ? config.password.length : 0,
        source: process.env.DATABASE_URL ? 'DATABASE_URL' :
            process.env.PGHOST ? 'PG* variables' :
                process.env.DATABASE_HOST ? 'DATABASE_* variables' : 'defaults',
        envVars: {
            hasDATABASE_URL: !!process.env.DATABASE_URL,
            hasPGHOST: !!process.env.PGHOST,
            hasDATABASE_HOST: !!process.env.DATABASE_HOST,
            hasPGUSER: !!process.env.PGUSER,
            hasDATABASE_USER: !!process.env.DATABASE_USER,
            hasPGPASSWORD: !!process.env.PGPASSWORD,
            hasDATABASE_PASSWORD: !!process.env.DATABASE_PASSWORD,
        }
    });

    return config;
}

const dbConfig = getDatabaseConfig();
const pool = new Pool(dbConfig);

// Test database connection with retry logic and better error handling
async function testDatabaseConnection(retries = 5, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            const client = await pool.connect();
            const result = await client.query('SELECT version(), current_database(), current_user');
            client.release();

            console.log('✅ Database connection successful');
            console.log('   Database:', result.rows[0].current_database);
            console.log('   User:', result.rows[0].current_user);
            console.log('   PostgreSQL:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
            return true;
        } catch (error) {
            const errorMsg = error.message;
            console.error(`❌ Database connection attempt ${i + 1}/${retries} failed:`, errorMsg);

            // Provide helpful error messages
            if (errorMsg.includes('password authentication failed')) {
                console.error('   💡 This usually means:');
                console.error('      - Database credentials are incorrect');
                console.error('      - Environment variables are not set in Railway');
                console.error('      - PostgreSQL service is not linked to this service');
                console.error('   🔧 Fix: Set DATABASE_* or PG* variables in Railway dashboard');
            } else if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('getaddrinfo ENOTFOUND')) {
                console.error('   💡 This usually means:');
                console.error('      - Database host is incorrect or unreachable');
                console.error('      - PostgreSQL service is not running');
                console.error('   🔧 Fix: Verify PostgreSQL service is running and host is correct');
            }

            if (i < retries - 1) {
                console.log(`⏳ Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    console.error('❌ Failed to connect to database after all retries');
    console.error('');
    console.error('🔧 TROUBLESHOOTING STEPS:');
    console.error('   1. Go to Railway dashboard → device-service → Settings → Variables');
    console.error('   2. Verify PostgreSQL service exists and is running');
    console.error('   3. Add environment variables using service references:');
    console.error('      DATABASE_HOST=${{Postgres.PGHOST}}');
    console.error('      DATABASE_PORT=${{Postgres.PGPORT}}');
    console.error('      DATABASE_NAME=${{Postgres.PGDATABASE}}');
    console.error('      DATABASE_USER=${{Postgres.PGUSER}}');
    console.error('      DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}');
    console.error('   4. Or check if Railway auto-provides PGHOST, PGPORT, etc.');
    console.error('   5. Redeploy the service after setting variables');
    return false;
}

// Handle pool errors
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
});

// Get all devices
app.get('/devices', authenticateToken, async (req, res) => {
    try {
        const { tenantId, zoneId, propertyId } = req.query;
        const { role, userId } = req.user;

        let query = `
            SELECT 
                d.*,
                z.name as zone_name, 
                p.name as property_name,
                COALESCE(d.is_playing, false) as is_playing,
                CASE 
                    WHEN d.last_heartbeat IS NULL THEN 'offline'
                    WHEN d.last_heartbeat > NOW() - INTERVAL '2 minutes' THEN 'online'
                    WHEN d.last_heartbeat > NOW() - INTERVAL '5 minutes' THEN 'online'
                    ELSE 'offline'
                END as calculated_status
            FROM public.devices d
            LEFT JOIN public.zones z ON d.zone_id = z.id
            LEFT JOIN public.properties p ON z.property_id = p.id
            WHERE p.tenant_id = $1
        `;
        let params = [tenantId || req.user.tenantId];

        // RBAC filtering
        if (role === 'property_admin') {
            query += ` AND p.id IN (SELECT property_id FROM user_property_access WHERE user_id = $${params.length + 1})`;
            params.push(userId);
        } else if (role === 'zone_admin') {
            query += ` AND d.zone_id IN (SELECT zone_id FROM user_zone_access WHERE user_id = $${params.length + 1})`;
            params.push(userId);
        }

        // Additional filters
        if (zoneId) {
            query += ` AND d.zone_id = $${params.length + 1}`;
            params.push(zoneId);
        }
        if (propertyId) {
            query += ` AND z.property_id = $${params.length + 1}`;
            params.push(propertyId);
        }

        query += ` ORDER BY d.created_at DESC`;

        console.log('[DeviceService] Fetching devices with query:', { role, userId, tenantId, zoneId, propertyId });
        const result = await pool.query(query, params);
        console.log(`[DeviceService] Found ${result.rows.length} devices`);

        // Transform snake_case to camelCase and ensure status is accurate
        const devices = result.rows.map(device => ({
            ...device,
            status: device.calculated_status || device.status || 'offline',
            isPlaying: device.is_playing !== null ? device.is_playing : false,
            is_playing: device.is_playing !== null ? device.is_playing : false,
            lastHeartbeat: device.last_heartbeat,
            deviceName: device.device_name,
            deviceCode: device.device_code,
            zoneId: device.zone_id,
            propertyName: device.property_name,
            zoneName: device.zone_name
        }));

        res.json({ devices });
    } catch (error) {
        console.error('[DeviceService] Get devices error:', error);
        res.status(500).json({ error: 'Failed to fetch devices', details: error.message });
    }
});

// Register a new device
app.post('/devices', authenticateToken, async (req, res) => {
    try {
        const { name, deviceCode, zoneId, platform, orientation } = req.body;
        const { role, userId } = req.user;

        // Zone admins cannot create devices
        if (role === 'zone_admin') {
            return res.status(403).json({ error: 'Zone admins cannot add devices. Please contact a Super Admin or Organization Admin.' });
        }

        // Verify user has access to this zone
        if (role !== 'super_admin') {
            let hasAccess = false;
            if (role === 'property_admin') {
                const accessCheck = await pool.query(
                    `SELECT 1 FROM user_property_access upa
                     JOIN zones z ON upa.property_id = z.property_id
                     WHERE upa.user_id = $1 AND z.id = $2`,
                    [userId, zoneId]
                );
                hasAccess = accessCheck.rows.length > 0;
            }

            if (!hasAccess) {
                return res.status(403).json({ error: 'Permission denied to this area' });
            }
        }

        const result = await pool.query(
            `INSERT INTO devices (device_name, device_code, zone_id, platform, orientation, status)
             VALUES ($1, $2, $3, $4, $5, 'offline')
             RETURNING *`,
            [name, deviceCode, zoneId, platform || 'webos', orientation || 'landscape']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Register device error:', error);
        res.status(500).json({ error: 'Failed to register device' });
    }
});

// ============================================
// PROPERTIES MANAGEMENT
// ============================================

// Get all properties for a tenant
app.get('/properties', authenticateToken, async (req, res) => {
    try {
        const { tenantId } = req.query;
        const { role, userId } = req.user;

        let query = 'SELECT * FROM public.properties WHERE tenant_id = $1';
        let params = [tenantId || req.user.tenantId];

        if (role === 'property_admin') {
            query += ' AND id IN (SELECT property_id FROM user_property_access WHERE user_id = $2)';
            params.push(userId);
        } else if (role === 'zone_admin') {
            query += ' AND id IN (SELECT property_id FROM public.zones WHERE id IN (SELECT zone_id FROM user_zone_access WHERE user_id = $2))';
            params.push(userId);
        }

        query += ' ORDER BY name';

        const result = await pool.query(query, params);
        res.json({ properties: result.rows });
    } catch (error) {
        console.error('Get properties error:', error);
        res.status(500).json({ error: 'Failed to fetch properties' });
    }
});

// Create a new property
app.post('/properties', authenticateToken, async (req, res) => {
    try {
        console.log('Received create property request:', req.body);
        console.log('User:', req.user);

        if (req.user.role !== 'super_admin') {
            console.log('Permission denied: User is not super_admin');
            return res.status(403).json({ error: 'Only super admins can create properties' });
        }

        const { tenantId, name, address, city, state, country, timezone } = req.body;
        const targetTenantId = tenantId || req.user.tenantId;

        console.log('Target Tenant ID:', targetTenantId);

        const result = await pool.query(
            `INSERT INTO properties (tenant_id, name, address, city, state, country, timezone)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [targetTenantId, name, address, city, state, country, timezone || 'UTC']
        );

        console.log('Property created:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create property error details:', error);
        res.status(500).json({ error: 'Failed to create property', details: error.message });
    }
});

// Update a property
app.put('/properties/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super admins can update properties' });
        }
        const { id } = req.params;
        const { name, address, city, state, country, timezone } = req.body;

        const result = await pool.query(
            `UPDATE properties 
             SET name = $1, address = $2, city = $3, state = $4, country = $5, timezone = $6, updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [name, address, city, state, country, timezone, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Property not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update property error:', error);
        res.status(500).json({ error: 'Failed to update property' });
    }
});

// Delete a property
app.delete('/properties/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super admins can delete properties' });
        }
        const { id } = req.params;

        const result = await pool.query('DELETE FROM public.properties WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Property not found' });
        }

        res.json({ message: 'Property deleted successfully' });
    } catch (error) {
        console.error('Delete property error:', error);
        res.status(500).json({ error: 'Failed to delete property' });
    }
});

// ============================================
// ZONES MANAGEMENT
// ============================================

// Get zones for a property
app.get('/zones', authenticateToken, async (req, res) => {
    try {
        const { propertyId } = req.query;
        const { role, userId } = req.user;

        let query = 'SELECT * FROM public.zones WHERE property_id = $1';
        let params = [propertyId];

        if (role === 'zone_admin') {
            query += ' AND id IN (SELECT zone_id FROM user_zone_access WHERE user_id = $2)';
            params.push(userId);
        } else if (role === 'property_admin') {
            // Verify access to this property
            const accessCheck = await pool.query(
                'SELECT 1 FROM user_property_access WHERE user_id = $1 AND property_id = $2',
                [userId, propertyId]
            );
            if (accessCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }

        query += ' ORDER BY name';
        const result = await pool.query(query, params);
        res.json({ zones: result.rows });
    } catch (error) {
        console.error('Get zones error:', error);
        res.status(500).json({ error: 'Failed to fetch zones' });
    }
});

// Get all zones for a tenant (across all properties)
app.get('/all-zones', authenticateToken, async (req, res) => {
    try {
        const { tenantId } = req.query;
        const { role, userId } = req.user;

        let query = `
            SELECT z.* FROM public.zones z
            INNER JOIN properties p ON z.property_id = p.id
            WHERE p.tenant_id = $1
        `;
        let params = [tenantId || req.user.tenantId];

        if (role === 'property_admin') {
            query += ' AND p.id IN (SELECT property_id FROM user_property_access WHERE user_id = $2)';
            params.push(userId);
        } else if (role === 'zone_admin') {
            query += ' AND z.id IN (SELECT zone_id FROM user_zone_access WHERE user_id = $2)';
            params.push(userId);
        }

        query += ' ORDER BY z.name';
        const result = await pool.query(query, params);
        res.json({ zones: result.rows });
    } catch (error) {
        console.error('Get all zones error:', error);
        res.status(500).json({ error: 'Failed to fetch zones' });
    }
});

// Create a new zone
app.post('/zones', authenticateToken, async (req, res) => {
    try {
        const { propertyId, name, description, zone_type } = req.body;
        const { role, userId } = req.user;

        // Verify permission to create zone in this property
        if (role !== 'super_admin') {
            const accessCheck = await pool.query(
                'SELECT 1 FROM user_property_access WHERE user_id = $1 AND property_id = $2',
                [userId, propertyId]
            );
            if (accessCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Permission denied to create area in this property' });
            }
        }

        const result = await pool.query(
            `INSERT INTO zones (property_id, name, description, zone_type)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [propertyId, name, description, zone_type]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create zone error:', error);
        res.status(500).json({ error: 'Failed to create zone' });
    }
});

// Update a zone
app.put('/zones/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, zone_type } = req.body;
        const { role, userId } = req.user;

        // Verify permission to update zone
        if (role !== 'super_admin') {
            // Must be property admin of the parent property
            const zoneQuery = await pool.query('SELECT property_id FROM public.zones WHERE id = $1', [id]);
            if (zoneQuery.rows.length === 0) return res.status(404).json({ error: 'Area not found' });

            const propertyId = zoneQuery.rows[0].property_id;
            const accessCheck = await pool.query(
                'SELECT 1 FROM user_property_access WHERE user_id = $1 AND property_id = $2',
                [userId, propertyId]
            );
            if (accessCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Permission denied to update this area' });
            }
        }

        const result = await pool.query(
            `UPDATE zones 
             SET name = $1, description = $2, zone_type = $3, updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [name, description, zone_type, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Zone not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update zone error:', error);
        res.status(500).json({ error: 'Failed to update zone' });
    }
});

// Delete a zone
app.delete('/zones/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { role, userId } = req.user;

        // Verify permission to delete zone
        if (role !== 'super_admin') {
            // Must be property admin of the parent property
            const zoneQuery = await pool.query('SELECT property_id FROM public.zones WHERE id = $1', [id]);
            if (zoneQuery.rows.length === 0) return res.status(404).json({ error: 'Area not found' });

            const propertyId = zoneQuery.rows[0].property_id;
            const accessCheck = await pool.query(
                'SELECT 1 FROM user_property_access WHERE user_id = $1 AND property_id = $2',
                [userId, propertyId]
            );
            if (accessCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Permission denied to delete this area' });
            }
        }

        const result = await pool.query('DELETE FROM public.zones WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Zone not found' });
        }

        res.json({ message: 'Zone deleted successfully' });
    } catch (error) {
        console.error('Delete zone error:', error);
        res.status(500).json({ error: 'Failed to delete zone' });
    }
});

// Get device heartbeats
app.get('/devices/:id/heartbeats', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT * FROM device_heartbeats 
       WHERE device_id = $1 
       ORDER BY created_at DESC 
       LIMIT 100`,
            [id]
        );
        res.json({ heartbeats: result.rows });
    } catch (error) {
        console.error('Get heartbeats error:', error);
        res.status(500).json({ error: 'Failed to fetch heartbeats' });
    }
});
// Update device heartbeat
app.post('/devices/:id/heartbeat', async (req, res) => {
    try {
        const { id } = req.params;
        const { cpuUsage, memoryUsage, storageUsedGb, storageTotalGb, networkStatus, isPlaying } = req.body;

        await pool.query('BEGIN');

        // 1. Update device status, last_heartbeat and is_playing
        await pool.query(
            `UPDATE public.devices 
             SET status = 'online', last_heartbeat = NOW(), is_playing = $2, updated_at = NOW()
             WHERE id = $1`,
            [id, isPlaying !== undefined ? isPlaying : true]
        );

        // 2. Insert heartbeat record
        await pool.query(
            `INSERT INTO device_heartbeats (device_id, cpu_usage, memory_usage, storage_used_gb, storage_total_gb, network_status)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, cpuUsage || 0, memoryUsage || 0, storageUsedGb || 0, storageTotalGb || 0, networkStatus || 'online']
        );

        await pool.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Heartbeat error:', error);
        res.status(500).json({ error: 'Failed to process heartbeat' });
    }
});

// Helper to generate random 8-digit code (for pairing)
function generatePairingCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Clear set
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Generate new pairing code (Called by Player)
app.post('/pairing/generate', async (req, res) => {
    try {
        const { platform, deviceInfo, player_id } = req.body;

        // Validate and normalize platform
        const validPlatforms = ['windows', 'android', 'tizen', 'webos', 'brightsign', 'linux'];
        const normalizedPlatform = validPlatforms.includes(platform?.toLowerCase())
            ? platform.toLowerCase()
            : 'android';

        // Merge platform into deviceInfo
        const enhancedDeviceInfo = {
            ...(deviceInfo || {}),
            platform: normalizedPlatform,
            detectedAt: new Date().toISOString(),
            player_id: player_id || null
        };

        const code = generatePairingCode();

        // Insert pairing code with player_id if provided
        const result = await pool.query(
            `INSERT INTO pairing_codes (code, device_info, player_id)
             VALUES ($1, $2, $3)
             RETURNING code, expires_at, player_id`,
            [code, JSON.stringify(enhancedDeviceInfo), player_id || null]
        );

        console.log('[Pairing] Generated code:', { code, player_id: player_id || 'none' });

        res.status(201).json({
            code: result.rows[0].code,
            expires_at: result.rows[0].expires_at,
            player_id: result.rows[0].player_id
        });
    } catch (error) {
        console.error('Generate pairing code error:', error);
        res.status(500).json({ error: 'Failed to generate pairing code' });
    }
});

// Check pairing status (Polled by Player)
app.get('/pairing/status/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const cleanCode = code.toUpperCase().replace(/[^A-Z2-9]/g, '');

        const result = await pool.query(
            `SELECT assigned_device_id FROM pairing_codes WHERE code = $1 AND expires_at > NOW()`,
            [cleanCode]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pairing code not found or expired' });
        }

        res.json({ assignedDeviceId: result.rows[0].assigned_device_id });
    } catch (error) {
        console.error('Check pairing status error:', error);
        res.status(500).json({ error: 'Failed to check status' });
    }
});

// Claim pairing code (Called by Portal)
app.post('/pairing/claim', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { code, name, zoneId, platform } = req.body;
        const { role } = req.user;
        const cleanCode = code.toUpperCase().replace(/[^A-Z2-9]/g, '');

        // Zone admins cannot claim devices
        if (role === 'zone_admin') {
            client.release();
            return res.status(403).json({ error: 'Zone admins cannot add devices. Please contact a Super Admin or Organization Admin.' });
        }

        await client.query('BEGIN');

        // 1. Verify code
        const codeResult = await client.query(
            'SELECT * FROM pairing_codes WHERE code = $1 AND assigned_device_id IS NULL AND expires_at > NOW()',
            [cleanCode]
        );

        if (codeResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid or expired pairing code' });
        }

        // 2. Validate zone exists
        const zoneCheck = await client.query('SELECT id FROM public.zones WHERE id = $1', [zoneId]);
        if (zoneCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid zone ID' });
        }

        // 3. Validate and normalize platform
        const validPlatforms = ['windows', 'android', 'tizen', 'webos', 'brightsign', 'linux'];
        const normalizedPlatform = validPlatforms.includes(platform) ? platform : 'android';

        // 4. Get player_id from pairing code if available
        const pairingCodeData = codeResult.rows[0];
        const playerIdFromCode = pairingCodeData.player_id || null;
        
        // 5. Create device with player_id if available
        const deviceCode = `PLAYER-${cleanCode}`;
        const deviceResult = await client.query(
            `INSERT INTO devices (device_name, device_code, zone_id, platform, status, player_id)
             VALUES ($1, $2, $3, $4, 'online', $5)
             RETURNING id, player_id`,
            [name, deviceCode, zoneId, normalizedPlatform, playerIdFromCode]
        );

        const deviceId = deviceResult.rows[0].id;
        const finalPlayerId = deviceResult.rows[0].player_id || deviceId;

        // 6. Update pairing code
        await client.query(
            'UPDATE pairing_codes SET assigned_device_id = $1 WHERE code = $2',
            [deviceId, cleanCode]
        );

        await client.query('COMMIT');
        
        console.log('[Pairing Claim] Device created:', { deviceId, playerId: finalPlayerId });
        
        res.json({ 
            deviceId: deviceId,
            playerId: finalPlayerId,
            message: 'Device paired successfully'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Claim pairing code error:', error);
        console.error('Error details:', error.message, error.stack);

        // Provide more specific error messages
        if (error.code === '23503') { // Foreign key violation
            res.status(400).json({ error: 'Invalid zone ID. Please select a valid area.' });
        } else if (error.code === '23505') { // Unique violation
            res.status(400).json({ error: 'Device code already exists' });
        } else if (error.code === '23514') { // Check constraint violation
            res.status(400).json({ error: 'Invalid platform or status value' });
        } else {
            res.status(500).json({ error: 'Failed to claim code', details: error.message });
        }
    } finally {
        client.release();
    }
});

// Delete device
app.delete('/devices/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { role, userId } = req.user;

        // Zone admins cannot delete devices
        if (role === 'zone_admin') {
            return res.status(403).json({ error: 'Zone admins cannot remove devices. Please contact a Super Admin or Organization Admin.' });
        }

        // Check if user has permission to delete this device
        if (role !== 'super_admin') {
            const deviceCheck = await pool.query(
                `SELECT d.*, z.property_id 
                 FROM public.devices d 
                 JOIN zones z ON d.zone_id = z.id 
                 WHERE d.id = $1`,
                [id]
            );

            if (deviceCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Device not found' });
            }

            const propertyId = deviceCheck.rows[0].property_id;

            if (role === 'property_admin') {
                const accessCheck = await pool.query(
                    'SELECT 1 FROM user_property_access WHERE user_id = $1 AND property_id = $2',
                    [userId, propertyId]
                );
                if (accessCheck.rows.length === 0) {
                    return res.status(403).json({ error: 'Permission denied' });
                }
            } else {
                return res.status(403).json({ error: 'Permission denied' });
            }
        }

        console.log(`[DeviceService] Deleting device: ${id}`);
        const result = await pool.query('DELETE FROM public.devices WHERE id = $1', [id]);
        console.log(`[DeviceService] Delete result: ${result.rowCount} rows affected`);
        res.json({ message: 'Device deleted successfully' });
    } catch (error) {
        console.error('[DeviceService] Delete device error:', error);
        res.status(500).json({ error: 'Failed to delete device' });
    }
});

// Send remote command
app.post('/devices/:id/commands', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { commandType } = req.body;
        const { role, userId } = req.user;

        console.log(`[DeviceService] Command received for ${id}: ${commandType} (by ${userId})`);

        // Check if user has permission to send commands to this device
        if (role !== 'super_admin') {
            const deviceCheck = await pool.query(
                `SELECT d.*, z.property_id 
                 FROM public.devices d 
                 JOIN zones z ON d.zone_id = z.id 
                 WHERE d.id = $1`,
                [id]
            );

            if (deviceCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Device not found' });
            }

            const propertyId = deviceCheck.rows[0].property_id;

            if (role === 'property_admin') {
                const accessCheck = await pool.query(
                    'SELECT 1 FROM user_property_access WHERE user_id = $1 AND property_id = $2',
                    [userId, propertyId]
                );
                if (accessCheck.rows.length === 0) {
                    return res.status(403).json({ error: 'Permission denied' });
                }
            } else if (role === 'zone_admin') {
                const accessCheck = await pool.query(
                    'SELECT 1 FROM user_zone_access WHERE user_id = $1 AND zone_id = $2',
                    [userId, deviceCheck.rows[0].zone_id]
                );
                if (accessCheck.rows.length === 0) {
                    return res.status(403).json({ error: 'Permission denied' });
                }
            } else {
                return res.status(403).json({ error: 'Permission denied' });
            }
        }

        const result = await pool.query(
            `INSERT INTO device_commands (device_id, command_type, issued_by, status)
             VALUES ($1, $2, $3, 'sent')
             RETURNING *`,
            [id, commandType, userId]
        );

        // Return success - API Gateway will handle WebSocket broadcast
        res.status(201).json({ ...result.rows[0], success: true });
    } catch (error) {
        console.error('[DeviceService] Send command error:', error);
        res.status(500).json({ error: 'Failed to send command' });
    }
});

// ============================================
// ANALYTICS - DASHBOARD STATS
// ============================================

// Get dashboard statistics
app.get('/analytics/dashboard-stats', authenticateToken, async (req, res) => {
    try {
        const { tenantId, propertyId } = req.query;
        const { role, userId } = req.user;
        const targetTenantId = tenantId || req.user.tenantId;

        // Build RBAC filter for devices query
        let deviceQuery = `
            SELECT 
                COUNT(*) as total_devices,
                COUNT(*) FILTER (WHERE d.status = 'online') as online_devices
            FROM public.devices d
            LEFT JOIN zones z ON d.zone_id = z.id
            LEFT JOIN properties p ON z.property_id = p.id
            WHERE p.tenant_id = $1
        `;
        let deviceParams = [targetTenantId];

        // Apply property filtering for super_admin
        if (role === 'super_admin' && propertyId) {
            deviceQuery += ` AND p.id = $${deviceParams.length + 1}`;
            deviceParams.push(propertyId);
        }

        // Apply RBAC filtering for devices
        if (role === 'property_admin') {
            deviceQuery += ` AND p.id IN (SELECT property_id FROM user_property_access WHERE user_id = $${deviceParams.length + 1})`;
            deviceParams.push(userId);
        } else if (role === 'zone_admin') {
            deviceQuery += ` AND d.zone_id IN (SELECT zone_id FROM user_zone_access WHERE user_id = $${deviceParams.length + 1})`;
            deviceParams.push(userId);
        }

        // Build media query - tenant level (media is shared across properties)
        let mediaQuery = 'SELECT COUNT(*) as total_media FROM media_assets WHERE tenant_id = $1';
        let mediaParams = [targetTenantId];

        // Build playlists query - tenant level
        let playlistsQuery = 'SELECT COUNT(*) as total_playlists FROM playlists WHERE tenant_id = $1';
        let playlistsParams = [targetTenantId];

        // Build schedules query
        let schedulesQuery = `
            SELECT COUNT(DISTINCT s.id) as active_schedules
            FROM schedules s
            WHERE s.tenant_id = $1 AND s.is_active = true
        `;
        let schedulesParams = [targetTenantId];

        // Apply property filtering for schedules if propertyId is provided and user is super_admin
        if (role === 'super_admin' && propertyId) {
            schedulesQuery += ` AND EXISTS (
                SELECT 1 FROM schedule_devices sd 
                WHERE sd.schedule_id = s.id 
                AND sd.property_id = $${schedulesParams.length + 1}
            )`;
            schedulesParams.push(propertyId);
        } else if (role === 'zone_admin') {
            // Filter schedules by zones assigned to zone_admin
            schedulesQuery += ` AND EXISTS (
                SELECT 1 FROM schedule_devices sd 
                WHERE sd.schedule_id = s.id 
                AND sd.zone_id IN (SELECT zone_id FROM user_zone_access WHERE user_id = $${schedulesParams.length + 1})
            )`;
            schedulesParams.push(userId);
        } else if (role === 'property_admin') {
            // Filter schedules by properties assigned to property_admin
            schedulesQuery += ` AND EXISTS (
                SELECT 1 FROM schedule_devices sd 
                WHERE sd.schedule_id = s.id 
                AND (sd.property_id IN (SELECT property_id FROM user_property_access WHERE user_id = $${schedulesParams.length + 1})
                     OR sd.zone_id IN (SELECT z.id FROM public.zones z WHERE z.property_id IN (SELECT property_id FROM user_property_access WHERE user_id = $${schedulesParams.length + 1})))
            )`;
            schedulesParams.push(userId);
        }

        // Execute all queries in parallel
        const [devicesResult, mediaResult, playlistsResult, schedulesResult] = await Promise.all([
            // Devices count
            pool.query(deviceQuery, deviceParams),
            // Media assets count
            pool.query(mediaQuery, mediaParams),
            // Playlists count
            pool.query(playlistsQuery, playlistsParams),
            // Active schedules count
            pool.query(schedulesQuery, schedulesParams)
        ]);

        const stats = {
            totalDevices: parseInt(devicesResult.rows[0].total_devices) || 0,
            onlineDevices: parseInt(devicesResult.rows[0].online_devices) || 0,
            totalMedia: parseInt(mediaResult.rows[0].total_media) || 0,
            totalPlaylists: parseInt(playlistsResult.rows[0].total_playlists) || 0,
            activeSchedules: parseInt(schedulesResult.rows[0].active_schedules) || 0
        };

        res.json(stats);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

// Health check endpoint - must be available immediately
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'device-service',
        timestamp: new Date().toISOString()
    });
});

// Async startup function
async function startServer() {
    const PORT = process.env.PORT || process.env.DEVICE_SERVICE_PORT || 3005;

    console.log('🚀 Starting Device Service...');

    // Start HTTP server FIRST (before database check)
    // This allows health checks to pass while DB connects
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Device Service running on port ${PORT}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${PORT} is already in use`);
        } else {
            console.error('❌ Server error:', err);
        }
        process.exit(1);
    });

    // Test database connection AFTER server starts
    // This prevents Railway from killing the container during startup
    try {
        const dbConnected = await testDatabaseConnection();
        if (!dbConnected) {
            console.error('⚠️  Database connection failed, but server is running');
            console.error('⚠️  Health check will still respond, but DB operations may fail');
            // Don't exit - let the service run and retry DB connection
        }
    } catch (error) {
        console.error('⚠️  Database connection error during startup:', error.message);
        console.error('⚠️  Service will continue running, DB will retry on first request');
    }
}

// Start the server
startServer().catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});

module.exports = app;
