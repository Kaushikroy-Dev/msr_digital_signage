const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authentication middleware
async function authenticate(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        // Verify user is still active
        const result = await pool.query(
            'SELECT id, email, role, tenant_id, is_active FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0 || !result.rows[0].is_active) {
            return res.status(401).json({ error: 'Invalid token or user inactive' });
        }

        req.user = {
            userId: result.rows[0].id,
            email: result.rows[0].email,
            role: result.rows[0].role,
            tenantId: result.rows[0].tenant_id
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Role-based access control middleware
function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Forbidden. Insufficient permissions.',
                requiredRoles: allowedRoles,
                userRole: req.user.role
            });
        }

        next();
    };
}

// Tenant isolation middleware
function tenantIsolation(req, res, next) {
    // Ensure users can only access data from their own tenant
    req.tenantId = req.user.tenantId;
    next();
}

// Property access control (for property_admin role)
async function checkPropertyAccess(req, res, next) {
    try {
        if (req.user.role === 'super_admin') {
            // Super admins have access to all properties
            return next();
        }

        if (req.user.role === 'property_admin') {
            const propertyId = req.params.propertyId || req.body.propertyId;

            if (!propertyId) {
                return res.status(400).json({ error: 'Property ID required' });
            }

            // Check if user has access to this property
            const result = await pool.query(
                `SELECT 1 FROM user_property_access 
         WHERE user_id = $1 AND property_id = $2`,
                [req.user.userId, propertyId]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({ error: 'Access denied to this property' });
            }
        }

        next();
    } catch (error) {
        console.error('Property access check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    authenticate,
    authorize,
    tenantIsolation,
    checkPropertyAccess
};
