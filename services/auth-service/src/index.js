const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const pool = require('./config/database');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// DATABASE INITIALIZATION (Auto-create Admin)
// ============================================
async function initializeAdmin() {
    let client;
    try {
        console.log('🔍 [Initialization] Checking for administrative users...');
        const result = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['super_admin']);
        const count = parseInt(result.rows[0].count);

        if (count === 0) {
            console.log('🌱 [Initialization] No super admin found. Initializing system...');

            client = await pool.connect();
            await client.query('BEGIN');

            // 1. Ensure a tenant exists
            let tenantId;
            const tenants = await client.query('SELECT id FROM tenants LIMIT 1');
            if (tenants.rows.length > 0) {
                tenantId = tenants.rows[0].id;
                console.log(`📡 [Initialization] Using existing tenant: ${tenantId}`);
            } else {
                const newTenant = await client.query(`
                    INSERT INTO tenants (name, subdomain, subscription_tier)
                    VALUES ($1, $2, $3)
                    RETURNING id
                `, ['System Admin Organization', 'admin', 'enterprise']);
                tenantId = newTenant.rows[0].id;
                console.log(`🏢 [Initialization] Created new tenant: ${tenantId}`);
            }

            // 2. Create the super admin user
            const email = 'admin@admin.com';
            const password = 'password123'; // Default password for initial setup
            const passwordHash = await bcrypt.hash(password, 10);

            await client.query(`
                INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [tenantId, email, passwordHash, 'System', 'Admin', 'super_admin']);

            await client.query('COMMIT');
            console.log('====================================================');
            console.log('✅ SYSTEM INITIALIZED SUCCESSFULLY');
            console.log(`✅ Default Super Admin: ${email}`);
            console.log(`✅ Default Password: ${password}`);
            console.log('====================================================');
        } else {
            console.log(`✅ [Initialization] System already has ${count} super admin(s).`);
        }
    } catch (error) {
        if (client) {
            try { await client.query('ROLLBACK'); } catch (e) { }
        }
        console.error('❌ [Initialization] Database initialization failed:', error);
        // We don't exit the process because the app might still work if DB is temporarily down
    } finally {
        if (client) client.release();
    }
}

// Run initialization with a slight delay to ensure DB connection is stable
setTimeout(initializeAdmin, 3000);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// Validation schemas
const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    tenantId: Joi.string().uuid().required(),
    role: Joi.string().valid('super_admin', 'property_admin', 'content_editor', 'viewer').default('viewer')
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

// Register new user
app.post('/register', async (req, res) => {
    try {
        const { error, value } = registerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { email, password, firstName, lastName, tenantId, role } = value;

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const result = await pool.query(
            `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, role, created_at`,
            [tenantId, email, passwordHash, firstName, lastName, role]
        );

        const user = result.rows[0];

        // Log audit
        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
            [tenantId, user.id, 'register', 'user', req.ip]
        );

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
app.post('/login', async (req, res) => {
    try {
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { email, password } = value;

        // Get user
        const result = await pool.query(
            `SELECT u.*, t.name as tenant_name, t.subdomain
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1 AND u.is_active = true`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Log audit
        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [user.tenant_id, user.id, 'login', 'user', req.ip, req.get('user-agent')]
        );

        // Generate JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                tenantId: user.tenant_id,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                tenantId: user.tenant_id,
                tenantName: user.tenant_name,
                subdomain: user.subdomain
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Verify token (middleware endpoint)
app.post('/verify', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.replace('Bearer ', '');

        console.log('[Auth] Verify request received:', {
            hasAuthHeader: !!authHeader,
            hasToken: !!token,
            jwtSecretLength: JWT_SECRET ? JWT_SECRET.length : 0
        });

        if (!token) {
            console.warn('[Auth] No token provided in /verify');
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('[Auth] Token decoded successfully for /verify:', {
            userId: decoded.userId,
            role: decoded.role
        });

        // Get fresh user data
        const result = await pool.query(
            `SELECT id, email, first_name, last_name, role, tenant_id, is_active
       FROM users WHERE id = $1`,
            [decoded.userId]
        );

        if (result.rows.length === 0 || !result.rows[0].is_active) {
            console.warn('[Auth] User not found or inactive in /verify:', decoded.userId);
            return res.status(401).json({ error: 'Invalid token' });
        }

        res.json({
            valid: true,
            user: {
                id: result.rows[0].id,
                email: result.rows[0].email,
                firstName: result.rows[0].first_name,
                lastName: result.rows[0].last_name,
                role: result.rows[0].role,
                tenantId: result.rows[0].tenant_id
            }
        });
    } catch (error) {
        console.error('[Auth] Verification error in /verify:', {
            name: error.name,
            message: error.message,
            secretLength: JWT_SECRET ? JWT_SECRET.length : 0
        });
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user profile
app.get('/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.tenant_id, u.created_at,
              t.name as tenant_name, t.subdomain
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1`,
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        res.json({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            tenantId: user.tenant_id,
            tenantName: user.tenant_name,
            subdomain: user.subdomain,
            createdAt: user.created_at
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// USER MANAGEMENT (Super Admin Only)
// ============================================

// Get all users for a tenant
app.get('/users', async (req, res) => {
    try {
        const { tenantId } = req.query;

        const result = await pool.query(
            `SELECT id, email, first_name, last_name, role, is_active, last_login, created_at
             FROM users
             WHERE tenant_id = $1
             ORDER BY created_at DESC`,
            [tenantId]
        );

        res.json({ users: result.rows });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Create a new user
app.post('/users', async (req, res) => {
    const client = await pool.connect();
    try {
        const { tenantId, email, password, firstName, lastName, role, propertyAccess, zoneAccess } = req.body;

        // Check if user exists
        const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        await client.query('BEGIN');

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const userResult = await client.query(
            `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, email, first_name, last_name, role, created_at`,
            [tenantId, email, passwordHash, firstName, lastName, role]
        );

        const user = userResult.rows[0];

        // Set property access if property_admin
        if (role === 'property_admin' && propertyAccess && propertyAccess.length > 0) {
            for (const propertyId of propertyAccess) {
                await client.query(
                    'INSERT INTO user_property_access (user_id, property_id) VALUES ($1, $2)',
                    [user.id, propertyId]
                );
            }
        }

        // Set zone access if zone_admin
        if (role === 'zone_admin' && zoneAccess && zoneAccess.length > 0) {
            for (const zoneId of zoneAccess) {
                await client.query(
                    'INSERT INTO user_zone_access (user_id, zone_id) VALUES ($1, $2)',
                    [user.id, zoneId]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json(user);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    } finally {
        client.release();
    }
});

// Update a user
app.put('/users/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { email, password, firstName, lastName, role, propertyAccess, zoneAccess } = req.body;

        await client.query('BEGIN');

        // Update user basic info
        let query = `UPDATE users SET first_name = $1, last_name = $2, role = $3, updated_at = NOW()`;
        let params = [firstName, lastName, role];

        // Update password if provided
        if (password) {
            const passwordHash = await bcrypt.hash(password, 10);
            query += `, password_hash = $${params.length + 1}`;
            params.push(passwordHash);
        }

        query += ` WHERE id = $${params.length + 1} RETURNING id, email, first_name, last_name, role`;
        params.push(id);

        const result = await client.query(query, params);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }

        // Update property access
        if (role === 'property_admin' && propertyAccess !== undefined) {
            await client.query('DELETE FROM user_property_access WHERE user_id = $1', [id]);
            for (const propertyId of propertyAccess) {
                await client.query(
                    'INSERT INTO user_property_access (user_id, property_id) VALUES ($1, $2)',
                    [id, propertyId]
                );
            }
        } else if (role !== 'property_admin') {
            await client.query('DELETE FROM user_property_access WHERE user_id = $1', [id]);
        }

        // Update zone access
        if (role === 'zone_admin' && zoneAccess !== undefined) {
            await client.query('DELETE FROM user_zone_access WHERE user_id = $1', [id]);
            for (const zoneId of zoneAccess) {
                await client.query(
                    'INSERT INTO user_zone_access (user_id, zone_id) VALUES ($1, $2)',
                    [id, zoneId]
                );
            }
        } else if (role !== 'zone_admin') {
            await client.query('DELETE FROM user_zone_access WHERE user_id = $1', [id]);
        }

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    } finally {
        client.release();
    }
});

// Delete a user
app.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Get user's property access
app.get('/users/:id/property-access', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT property_id FROM user_property_access WHERE user_id = $1',
            [id]
        );

        res.json({ propertyIds: result.rows.map(r => r.property_id) });
    } catch (error) {
        console.error('Get property access error:', error);
        res.status(500).json({ error: 'Failed to fetch property access' });
    }
});

// Get user's zone access
app.get('/users/:id/zone-access', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT zone_id FROM user_zone_access WHERE user_id = $1',
            [id]
        );

        res.json({ zoneIds: result.rows.map(r => r.zone_id) });
    } catch (error) {
        console.error('Get zone access error:', error);
        res.status(500).json({ error: 'Failed to fetch zone access' });
    }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');

    console.log('[Auth] Middleware request received:', {
        path: req.path,
        method: req.method,
        hasAuthHeader: !!authHeader,
        hasToken: !!token
    });

    if (!token) {
        console.warn('[Auth] No token provided in middleware');
        return res.status(401).json({ error: 'Access denied' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('[Auth] Middleware Token verified for user:', decoded.userId);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('[Auth] Middleware JWT Verification failed:', error.message);
        return res.status(403).json({ error: 'Invalid token' });
    }
}

// ============================================
// ANALYTICS - ACTIVITY LOGS
// ============================================

// Get recent activity logs
app.get('/analytics/activity', authenticateToken, async (req, res) => {
    try {
        const { tenantId } = req.query;
        const targetTenantId = tenantId || req.user.tenantId;

        // Fetch recent audit logs with user information
        const result = await pool.query(
            `SELECT 
                al.id,
                al.action,
                al.resource_type,
                al.resource_id,
                al.details,
                al.created_at,
                COALESCE(u.first_name || ' ' || u.last_name, 'System') as user_name,
                u.email as user_email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.tenant_id = $1
            ORDER BY al.created_at DESC
            LIMIT 50`,
            [targetTenantId]
        );

        // Format timestamps as relative time
        const now = new Date();
        const activities = result.rows.map(row => {
            const createdAt = new Date(row.created_at);
            const diffMs = now - createdAt;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            let timeAgo;
            if (diffMins < 1) {
                timeAgo = 'just now';
            } else if (diffMins < 60) {
                timeAgo = `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
            } else if (diffHours < 24) {
                timeAgo = `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
            } else {
                timeAgo = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
            }

            // Format action text
            let actionText = row.action
                .replace(/_/g, ' ') // Replace all underscores with spaces
                .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word

            if (row.resource_type) {
                actionText = `${actionText} ${row.resource_type}`;
            }

            return {
                id: row.id,
                action: actionText,
                user: row.user_name,
                time: timeAgo,
                createdAt: row.created_at
            };
        });

        res.json({ activities });
    } catch (error) {
        console.error('Activity logs error:', error);
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'auth-service' });
});

const PORT = process.env.PORT || process.env.AUTH_SERVICE_PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Auth Service running on port ${PORT}`);
});

module.exports = app;
