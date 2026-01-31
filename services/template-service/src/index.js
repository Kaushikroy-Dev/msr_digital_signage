const express = require('express');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
}

const pool = new Pool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 5432,
    database: process.env.DATABASE_NAME || 'digital_signage',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
});

// Get all templates
app.get('/templates', authenticateToken, async (req, res) => {
    try {
        const { tenantId } = req.query;
        const result = await pool.query(
            `SELECT * FROM templates WHERE tenant_id = $1 ORDER BY created_at DESC`,
            [tenantId || req.user.tenantId]
        );
        res.json({ templates: result.rows });
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// Get single template
app.get('/templates/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.user;

        const result = await pool.query(
            `SELECT * FROM templates WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get template error:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

// Create template
app.post('/templates', authenticateToken, async (req, res) => {
    try {
        const { name, description, category, width, height, orientation, zones, background_color, background_image_id } = req.body;
        const { tenantId, userId, role } = req.user;

        if (role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot create templates' });
        }

        const result = await pool.query(
            `INSERT INTO templates (tenant_id, created_by, name, description, category, width, height, orientation, zones, background_color, background_image_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                tenantId, 
                userId, 
                name, 
                description || '', 
                category || 'custom', 
                width, 
                height, 
                orientation, 
                JSON.stringify(zones || []),
                background_color || '#ffffff',
                background_image_id || null
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create template error:', error);
        res.status(500).json({ error: 'Failed to create template' });
    }
});

// Update template
app.put('/templates/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category, width, height, orientation, zones, background_color, background_image_id } = req.body;
        const { tenantId, userId, role } = req.user;

        if (role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot update templates' });
        }

        // Check if template exists and belongs to tenant
        const checkResult = await pool.query(
            `SELECT id FROM templates WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const result = await pool.query(
            `UPDATE templates 
             SET name = $1, 
                 description = $2, 
                 category = $3, 
                 width = $4, 
                 height = $5, 
                 orientation = $6, 
                 zones = $7,
                 background_color = $8,
                 background_image_id = $9,
                 updated_at = NOW()
             WHERE id = $10 AND tenant_id = $11
             RETURNING *`,
            [
                name,
                description || '',
                category || 'custom',
                width,
                height,
                orientation,
                JSON.stringify(zones || []),
                background_color || '#ffffff',
                background_image_id || null,
                id,
                tenantId
            ]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update template error:', error);
        res.status(500).json({ error: 'Failed to update template' });
    }
});

// Delete template
app.delete('/templates/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId, role } = req.user;

        if (role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot delete templates' });
        }

        const result = await pool.query(
            `DELETE FROM templates WHERE id = $1 AND tenant_id = $2 RETURNING id`,
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Delete template error:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

// Duplicate template
app.post('/templates/:id/duplicate', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId, userId, role } = req.user;

        if (role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot duplicate templates' });
        }

        // Get original template
        const originalResult = await pool.query(
            `SELECT * FROM templates WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        if (originalResult.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const original = originalResult.rows[0];

        // Create duplicate
        const result = await pool.query(
            `INSERT INTO templates (tenant_id, created_by, name, description, category, width, height, orientation, zones, background_color, background_image_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                tenantId,
                userId,
                `${original.name} (Copy)`,
                original.description,
                original.category,
                original.width,
                original.height,
                original.orientation,
                original.zones,
                original.background_color,
                original.background_image_id
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Duplicate template error:', error);
        res.status(500).json({ error: 'Failed to duplicate template' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'template-service' });
});

const PORT = process.env.TEMPLATE_SERVICE_PORT || 3003;
app.listen(PORT, () => {
    console.log(`Template Service running on port ${PORT}`);
});

module.exports = app;
