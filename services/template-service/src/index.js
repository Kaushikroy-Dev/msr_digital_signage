const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : ['http://localhost:5173'];
app.use(cors({
    origin: corsOrigins,
    credentials: true
}));
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

// Support both Railway (PG*) and custom (DATABASE_*) environment variables
const pool = new Pool({
    host: process.env.DATABASE_HOST || process.env.PGHOST || 'localhost',
    port: process.env.DATABASE_PORT || process.env.PGPORT || 5432,
    database: process.env.DATABASE_NAME || process.env.PGDATABASE || 'railway',
    user: process.env.DATABASE_USER || process.env.PGUSER || 'postgres',
    password: process.env.DATABASE_PASSWORD || process.env.PGPASSWORD || 'postgres',
});

// Get all templates with filtering, search, and sorting
app.get('/templates', authenticateToken, async (req, res) => {
    try {
        const { tenantId, category, tags, search, propertyId, zoneId, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
        const tenant = tenantId || req.user.tenantId;
        const { role, userId } = req.user;
        
        let query = `SELECT * FROM public.templates WHERE tenant_id = $1`;
        const params = [tenant];
        let paramIndex = 2;

        // Apply property/zone filtering based on role
        if (role === 'super_admin') {
            // Super admin can filter by propertyId/zoneId if provided
            if (propertyId) {
                query += ` AND (property_id = $${paramIndex} OR (is_shared = true AND shared_with_properties IS NOT NULL AND $${paramIndex} = ANY(shared_with_properties)))`;
                params.push(propertyId);
                paramIndex++;
            }
            if (zoneId) {
                query += ` AND (zone_id = $${paramIndex} OR zone_id IS NULL)`;
                params.push(zoneId);
                paramIndex++;
            }
        } else if (role === 'property_admin') {
            // Filter by assigned properties, include shared content
            query += ` AND (
                property_id IN (SELECT property_id FROM public.user_property_access WHERE user_id = $${paramIndex})
                OR (is_shared = true AND EXISTS (
                    SELECT 1 FROM public.user_property_access upa 
                    WHERE upa.user_id = $${paramIndex} 
                    AND shared_with_properties IS NOT NULL
                    AND upa.property_id = ANY(shared_with_properties)
                ))
            )`;
            params.push(userId);
            paramIndex++;
            if (zoneId) {
                query += ` AND (zone_id = $${paramIndex} OR zone_id IS NULL)`;
                params.push(zoneId);
                paramIndex++;
            }
        } else if (role === 'zone_admin') {
            // Filter by assigned zones, include shared content for their property
            query += ` AND (
                zone_id IN (SELECT zone_id FROM public.user_zone_access WHERE user_id = $${paramIndex})
                OR (is_shared = true AND EXISTS (
                    SELECT 1 FROM public.zones z
                    JOIN public.user_zone_access uza ON z.id = uza.zone_id
                    WHERE uza.user_id = $${paramIndex}
                    AND shared_with_properties IS NOT NULL
                    AND z.property_id = ANY(shared_with_properties)
                ))
            )`;
            params.push(userId);
            paramIndex++;
        } else {
            // content_editor - same logic as property_admin
            const propertyAccess = await pool.query(
                'SELECT property_id FROM public.user_property_access WHERE user_id = $1',
                [userId]
            );
            if (propertyAccess.rows.length > 0) {
                const propertyIds = propertyAccess.rows.map(r => r.property_id);
                query += ` AND (
                    property_id = ANY($${paramIndex}::UUID[])
                    OR (is_shared = true AND EXISTS (
                        SELECT 1 FROM unnest($${paramIndex}::UUID[]) AS prop_id
                        WHERE shared_with_properties IS NOT NULL
                        AND prop_id = ANY(shared_with_properties)
                    ))
                )`;
                params.push(propertyIds);
                paramIndex++;
            } else {
                // Check zone access
                const zoneAccess = await pool.query(
                    'SELECT zone_id FROM public.user_zone_access WHERE user_id = $1',
                    [userId]
                );
                if (zoneAccess.rows.length > 0) {
                    const zoneIds = zoneAccess.rows.map(r => r.zone_id);
                    query += ` AND zone_id = ANY($${paramIndex}::UUID[])`;
                    params.push(zoneIds);
                    paramIndex++;
                } else {
                    return res.status(403).json({ error: 'No property or zone access' });
                }
            }
        }

        // Filter by category
        if (category) {
            query += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        // Filter by tags (JSONB contains)
        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : [tags];
            query += ` AND tags @> $${paramIndex}::jsonb`;
            params.push(JSON.stringify(tagArray));
            paramIndex++;
        }

        // Search by name or description
        if (search) {
            query += ` AND (
                to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $${paramIndex})
                OR name ILIKE $${paramIndex + 1}
                OR description ILIKE $${paramIndex + 1}
            )`;
            params.push(search);
            params.push(`%${search}%`);
            paramIndex += 2;
        }

        // Validate sortBy to prevent SQL injection
        const validSortColumns = ['name', 'created_at', 'updated_at', 'category'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        query += ` ORDER BY ${sortColumn} ${sortDirection}`;

        const result = await pool.query(query, params);
        
        // Transform snake_case to camelCase for frontend consistency
        const templates = result.rows.map(template => ({
            ...template,
            sharedWithProperties: template.shared_with_properties || [],
            propertyId: template.property_id,
            zoneId: template.zone_id,
            isShared: template.is_shared
        }));
        
        res.json({ templates });
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
            `SELECT * FROM public.templates WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Transform snake_case to camelCase for frontend consistency
        const template = result.rows[0];
        res.json({
            ...template,
            sharedWithProperties: template.shared_with_properties || [],
            propertyId: template.property_id,
            zoneId: template.zone_id,
            isShared: template.is_shared
        });
    } catch (error) {
        console.error('Get template error:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

// Create template
app.post('/templates', authenticateToken, async (req, res) => {
    try {
        const { name, description, category, tags, variables, width, height, orientation, zones, background_color, background_image_id, propertyId, zoneId } = req.body;
        const { tenantId, userId, role } = req.user;

        if (role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot create templates' });
        }

        // Property/Zone assignment based on role (same logic as media upload)
        let finalPropertyId = propertyId;
        let finalZoneId = zoneId || null;

        if (role === 'super_admin') {
            if (!propertyId) {
                return res.status(400).json({ error: 'Property ID is required' });
            }
        } else if (role === 'property_admin') {
            const propertyAccess = await pool.query(
                'SELECT property_id FROM public.user_property_access WHERE user_id = $1 LIMIT 1',
                [userId]
            );
            if (propertyAccess.rows.length === 0) {
                return res.status(403).json({ error: 'No property access assigned' });
            }
            finalPropertyId = propertyAccess.rows[0].property_id;
            if (!zoneId) {
                return res.status(400).json({ error: 'Zone ID is required for property admins' });
            }
            const zoneCheck = await pool.query(
                'SELECT id FROM public.zones WHERE id = $1 AND property_id = $2',
                [zoneId, finalPropertyId]
            );
            if (zoneCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Zone does not belong to your assigned property' });
            }
        } else if (role === 'zone_admin') {
            const zoneAccess = await pool.query(
                `SELECT z.id as zone_id, z.property_id 
                 FROM public.user_zone_access uza
                 JOIN public.zones z ON uza.zone_id = z.id
                 WHERE uza.user_id = $1 LIMIT 1`,
                [userId]
            );
            if (zoneAccess.rows.length === 0) {
                return res.status(403).json({ error: 'No zone access assigned' });
            }
            finalPropertyId = zoneAccess.rows[0].property_id;
            finalZoneId = zoneAccess.rows[0].zone_id;
        } else {
            // content_editor
            const propertyAccess = await pool.query(
                'SELECT property_id FROM public.user_property_access WHERE user_id = $1 LIMIT 1',
                [userId]
            );
            if (propertyAccess.rows.length > 0) {
                finalPropertyId = propertyAccess.rows[0].property_id;
                if (!zoneId) {
                    return res.status(400).json({ error: 'Zone ID is required' });
                }
            } else {
                const zoneAccess = await pool.query(
                    `SELECT z.id as zone_id, z.property_id 
                     FROM public.user_zone_access uza
                     JOIN public.zones z ON uza.zone_id = z.id
                     WHERE uza.user_id = $1 LIMIT 1`,
                    [userId]
                );
                if (zoneAccess.rows.length > 0) {
                    finalPropertyId = zoneAccess.rows[0].property_id;
                    finalZoneId = zoneAccess.rows[0].zone_id;
                } else {
                    return res.status(403).json({ error: 'No property or zone access assigned' });
                }
            }
        }

        // Prepare data for insertion
        const tagsValue = Array.isArray(tags) ? tags : (tags ? JSON.parse(JSON.stringify(tags)) : []);
        const variablesValue = variables || {};
        const zonesValue = zones || [];

        const result = await pool.query(
            `INSERT INTO public.templates (tenant_id, created_by, property_id, zone_id, name, description, category, tags, variables, width, height, orientation, zones, background_color, background_image_id, is_shared, shared_with_properties)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, $13::jsonb, $14, $15, $16, $17)
             RETURNING *`,
            [
                tenantId, 
                userId,
                finalPropertyId,
                finalZoneId,
                name, 
                description || '', 
                category || 'custom',
                JSON.stringify(tagsValue), // JSONB accepts JSON string
                JSON.stringify(variablesValue), // JSONB accepts JSON string
                width, 
                height, 
                orientation || 'landscape', 
                JSON.stringify(zonesValue), // JSONB accepts JSON string
                background_color || '#ffffff',
                background_image_id || null,
                false,
                []
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create template error:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            detail: error.detail,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'Failed to create template',
            details: error.message,
            code: error.code
        });
    }
});

// Update template
app.put('/templates/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category, tags, variables, width, height, orientation, zones, background_color, background_image_id, propertyId, zoneId } = req.body;
        const { tenantId, userId, role } = req.user;

        if (role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot update templates' });
        }

        // Check if template exists and belongs to tenant
        const checkResult = await pool.query(
            `SELECT id FROM public.templates WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Check if preview_image_path is being updated
        const { preview_image_path } = req.body;
        
        // Handle property/zone updates (only for super_admin)
        let finalPropertyId = propertyId;
        let finalZoneId = zoneId || null;
        
        if (role === 'super_admin' && propertyId) {
            // Super admin can update property/zone
            finalPropertyId = propertyId;
            finalZoneId = zoneId || null;
        } else if (role !== 'super_admin') {
            // For other roles, keep existing property/zone
            const existingTemplate = await pool.query(
                'SELECT property_id, zone_id FROM public.templates WHERE id = $1',
                [id]
            );
            if (existingTemplate.rows.length > 0) {
                finalPropertyId = existingTemplate.rows[0].property_id;
                finalZoneId = existingTemplate.rows[0].zone_id;
            }
        }
        
        // If only preview_image_path is provided, do a simple update
        if (preview_image_path !== undefined && Object.keys(req.body).length === 1) {
            const result = await pool.query(
                `UPDATE public.templates 
                 SET preview_image_path = $1, updated_at = NOW()
                 WHERE id = $2 AND tenant_id = $3
                 RETURNING *`,
                [preview_image_path, id, tenantId]
            );
            return res.json(result.rows[0]);
        }

        // Get existing template to preserve values if not provided
        const existingResult = await pool.query(
            `SELECT * FROM public.templates WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );
        const existing = existingResult.rows[0];

        const updateFields = [
            'name = $1',
            'description = $2',
            'category = $3',
            'tags = $4',
            'variables = $5',
            'width = $6',
            'height = $7',
            'orientation = $8',
            'zones = $9',
            'background_color = $10',
            'background_image_id = $11',
            'property_id = $12',
            'zone_id = $13',
            'updated_at = NOW()'
        ];
        const updateParams = [
            name !== undefined ? name : existing.name,
            description !== undefined ? (description || '') : (existing.description || ''),
            category !== undefined ? (category || 'custom') : (existing.category || 'custom'),
            JSON.stringify(tags !== undefined ? (tags || []) : (existing.tags || [])),
            JSON.stringify(variables !== undefined ? (variables || {}) : (existing.variables || {})),
            width !== undefined ? width : existing.width,
            height !== undefined ? height : existing.height,
            orientation !== undefined ? orientation : existing.orientation,
            JSON.stringify(zones !== undefined ? (zones || []) : (existing.zones || [])),
            background_color !== undefined ? (background_color || '#ffffff') : (existing.background_color || '#ffffff'),
            background_image_id !== undefined ? background_image_id : (existing.background_image_id || null),
            finalPropertyId,
            finalZoneId
        ];

        if (preview_image_path !== undefined) {
            updateFields.push(`preview_image_path = $${updateParams.length + 1}`);
            updateParams.push(preview_image_path);
        }

        updateParams.push(id, tenantId);

        const result = await pool.query(
            `UPDATE public.templates 
             SET ${updateFields.join(', ')}
             WHERE id = $${updateParams.length - 1} AND tenant_id = $${updateParams.length}
             RETURNING *`,
            updateParams
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
            `DELETE FROM public.templates WHERE id = $1 AND tenant_id = $2 RETURNING id`,
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
            `SELECT * FROM public.templates WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        if (originalResult.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const original = originalResult.rows[0];

        // Create duplicate - check if version columns exist
        const versionColumnsCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'templates' 
            AND column_name IN ('version', 'parent_template_id')
        `);
        const hasVersion = versionColumnsCheck.rows.some(r => r.column_name === 'version');
        const hasParentTemplateId = versionColumnsCheck.rows.some(r => r.column_name === 'parent_template_id');

        let insertQuery, insertParams;
        if (hasVersion && hasParentTemplateId) {
            insertQuery = `INSERT INTO public.templates (tenant_id, created_by, property_id, zone_id, name, description, category, tags, variables, width, height, orientation, zones, background_color, background_image_id, version, parent_template_id, is_shared, shared_with_properties)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
             RETURNING *`;
            insertParams = [
                tenantId,
                userId,
                original.property_id,
                original.zone_id,
                `${original.name} (Copy)`,
                original.description || '',
                original.category || 'custom',
                original.tags || JSON.stringify([]),
                original.variables || JSON.stringify({}),
                original.width,
                original.height,
                original.orientation,
                original.zones,
                original.background_color || '#ffffff',
                original.background_image_id || null,
                1,
                id, // Link to original as parent
                false, // is_shared
                [] // shared_with_properties
            ];
        } else {
            insertQuery = `INSERT INTO public.templates (tenant_id, created_by, property_id, zone_id, name, description, category, tags, variables, width, height, orientation, zones, background_color, background_image_id, is_shared, shared_with_properties)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
             RETURNING *`;
            insertParams = [
                tenantId,
                userId,
                original.property_id,
                original.zone_id,
                `${original.name} (Copy)`,
                original.description || '',
                original.category || 'custom',
                original.tags || JSON.stringify([]),
                original.variables || JSON.stringify({}),
                original.width,
                original.height,
                original.orientation,
                original.zones,
                original.background_color || '#ffffff',
                original.background_image_id || null,
                false, // is_shared
                [] // shared_with_properties
            ];
        }

        const result = await pool.query(insertQuery, insertParams);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Duplicate template error:', error);
        res.status(500).json({ error: 'Failed to duplicate template' });
    }
});

// Save As (Create new template from existing)
app.post('/templates/:id/save-as', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const { tenantId, userId, role } = req.user;

        if (role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot create templates' });
        }

        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Template name is required' });
        }

        // Get original template
        const originalResult = await pool.query(
            `SELECT * FROM public.templates WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        if (originalResult.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const original = originalResult.rows[0];

        // Check if version columns exist
        const versionColumnsCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'templates' 
            AND column_name IN ('version', 'parent_template_id')
        `);
        const hasVersion = versionColumnsCheck.rows.some(r => r.column_name === 'version');
        const hasParentTemplateId = versionColumnsCheck.rows.some(r => r.column_name === 'parent_template_id');

        let insertQuery, insertParams;
        if (hasVersion && hasParentTemplateId) {
            insertQuery = `INSERT INTO public.templates (tenant_id, created_by, property_id, zone_id, name, description, category, tags, variables, width, height, orientation, zones, background_color, background_image_id, version, parent_template_id, is_shared, shared_with_properties)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
             RETURNING *`;
            insertParams = [
                tenantId,
                userId,
                original.property_id,
                original.zone_id,
                name,
                description || original.description,
                original.category || 'custom',
                original.tags || JSON.stringify([]),
                original.variables || JSON.stringify({}),
                original.width,
                original.height,
                original.orientation,
                original.zones,
                original.background_color,
                original.background_image_id,
                1,
                id, // Link to original as parent
                original.is_shared || false,
                original.shared_with_properties || []
            ];
        } else {
            insertQuery = `INSERT INTO public.templates (tenant_id, created_by, property_id, zone_id, name, description, category, tags, variables, width, height, orientation, zones, background_color, background_image_id, is_shared, shared_with_properties)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
             RETURNING *`;
            insertParams = [
                tenantId,
                userId,
                original.property_id,
                original.zone_id,
                name,
                description || original.description,
                original.category || 'custom',
                original.tags || JSON.stringify([]),
                original.variables || JSON.stringify({}),
                original.width,
                original.height,
                original.orientation,
                original.zones,
                original.background_color,
                original.background_image_id,
                original.is_shared || false,
                original.shared_with_properties || []
            ];
        }

        const result = await pool.query(insertQuery, insertParams);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Save As error:', error);
        res.status(500).json({ error: 'Failed to save template' });
    }
});

// Save version (Create version snapshot)
app.post('/templates/:id/versions', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId, userId, role } = req.user;

        if (role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot create versions' });
        }

        // Get current template
        const templateResult = await pool.query(
            `SELECT * FROM public.templates WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        if (templateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const template = templateResult.rows[0];

        // Get next version number
        const versionResult = await pool.query(
            `SELECT MAX(version) as max_version FROM template_versions WHERE template_id = $1`,
            [id]
        );
        const nextVersion = (versionResult.rows[0]?.max_version || template.version || 0) + 1;

        // Create version snapshot
        const result = await pool.query(
            `INSERT INTO template_versions (template_id, version, name, description, zones, background_color, background_image_id, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                id,
                nextVersion,
                template.name,
                template.description,
                template.zones,
                template.background_color,
                template.background_image_id,
                userId
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Save version error:', error);
        res.status(500).json({ error: 'Failed to save version' });
    }
});

// Get template versions
app.get('/templates/:id/versions', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.user;

        // Verify template belongs to tenant
        const templateCheck = await pool.query(
            `SELECT id FROM public.templates WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        if (templateCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const result = await pool.query(
            `SELECT tv.*, u.email as created_by_email
             FROM template_versions tv
             LEFT JOIN users u ON tv.created_by = u.id
             WHERE tv.template_id = $1
             ORDER BY tv.version DESC`,
            [id]
        );

        res.json({ versions: result.rows });
    } catch (error) {
        console.error('Get versions error:', error);
        res.status(500).json({ error: 'Failed to fetch versions' });
    }
});

// Restore template version
app.post('/templates/:id/versions/:versionId/restore', authenticateToken, async (req, res) => {
    try {
        const { id, versionId } = req.params;
        const { tenantId, userId, role } = req.user;

        if (role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot restore versions' });
        }

        // Get version
        const versionResult = await pool.query(
            `SELECT tv.* FROM template_versions tv
             INNER JOIN templates t ON tv.template_id = t.id
             WHERE tv.id = $1 AND t.tenant_id = $2 AND tv.template_id = $3`,
            [versionId, tenantId, id]
        );

        if (versionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Version not found' });
        }

        const version = versionResult.rows[0];

        // Save current state as a version before restoring
        const currentTemplateResult = await pool.query(
            `SELECT * FROM public.templates WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );
        const currentTemplate = currentTemplateResult.rows[0];

        // Create version of current state
        await pool.query(
            `INSERT INTO template_versions (template_id, version, name, description, zones, background_color, background_image_id, created_by)
             VALUES ($1, (SELECT COALESCE(MAX(version), 0) + 1 FROM template_versions WHERE template_id = $1), $2, $3, $4, $5, $6, $7)
             ON CONFLICT DO NOTHING`,
            [
                id,
                currentTemplate.name,
                currentTemplate.description,
                currentTemplate.zones,
                currentTemplate.background_color,
                currentTemplate.background_image_id,
                userId
            ]
        );

        // Restore version
        const restoreResult = await pool.query(
            `UPDATE public.templates 
             SET name = $1, 
                 description = $2, 
                 zones = $3,
                 background_color = $4,
                 background_image_id = $5,
                 updated_at = NOW()
             WHERE id = $6 AND tenant_id = $7
             RETURNING *`,
            [
                version.name,
                version.description,
                version.zones,
                version.background_color,
                version.background_image_id,
                id,
                tenantId
            ]
        );

        res.json(restoreResult.rows[0]);
    } catch (error) {
        console.error('Restore version error:', error);
        res.status(500).json({ error: 'Failed to restore version' });
    }
});

// Widget Settings Endpoints

// Get all widget settings for tenant
app.get('/settings/widgets', authenticateToken, async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { widgetType } = req.query;

        let query = `SELECT * FROM widget_settings WHERE tenant_id = $1`;
        const params = [tenantId];

        if (widgetType) {
            query += ` AND widget_type = $2`;
            params.push(widgetType);
        }

        query += ` ORDER BY widget_type, setting_key`;

        const result = await pool.query(query, params);
        res.json({ settings: result.rows });
    } catch (error) {
        console.error('Get widget settings error:', error);
        res.status(500).json({ error: 'Failed to fetch widget settings' });
    }
});

// Get specific widget setting
app.get('/settings/widgets/:key', authenticateToken, async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { key } = req.params;
        const { widgetType } = req.query;

        let query = `SELECT * FROM widget_settings WHERE tenant_id = $1 AND setting_key = $2`;
        const params = [tenantId, key];

        if (widgetType) {
            query += ` AND widget_type = $3`;
            params.push(widgetType);
        } else {
            query += ` AND widget_type IS NULL`;
        }

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get widget setting error:', error);
        res.status(500).json({ error: 'Failed to fetch widget setting' });
    }
});

// Create or update widget setting
app.put('/settings/widgets/:key', authenticateToken, async (req, res) => {
    try {
        const { tenantId, role } = req.user;
        const { key } = req.params;
        const { setting_value, widget_type } = req.body;

        if (role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot modify widget settings' });
        }

        // Check if setting exists
        const checkResult = await pool.query(
            `SELECT id FROM widget_settings WHERE tenant_id = $1 AND setting_key = $2 AND (widget_type = $3 OR (widget_type IS NULL AND $3 IS NULL))`,
            [tenantId, key, widget_type || null]
        );

        if (checkResult.rows.length > 0) {
            // Update existing
            const result = await pool.query(
                `UPDATE widget_settings 
                 SET setting_value = $1, updated_at = NOW()
                 WHERE tenant_id = $2 AND setting_key = $3 AND (widget_type = $4 OR (widget_type IS NULL AND $4 IS NULL))
                 RETURNING *`,
                [JSON.stringify(setting_value), tenantId, key, widget_type || null]
            );
            res.json(result.rows[0]);
        } else {
            // Create new
            const result = await pool.query(
                `INSERT INTO widget_settings (tenant_id, setting_key, setting_value, widget_type)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [tenantId, key, JSON.stringify(setting_value), widget_type || null]
            );
            res.status(201).json(result.rows[0]);
        }
    } catch (error) {
        console.error('Update widget setting error:', error);
        res.status(500).json({ error: 'Failed to update widget setting' });
    }
});

// Delete widget setting
app.delete('/settings/widgets/:key', authenticateToken, async (req, res) => {
    try {
        const { tenantId, role } = req.user;
        const { key } = req.params;
        const { widgetType } = req.query;

        if (role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot delete widget settings' });
        }

        let query = `DELETE FROM widget_settings WHERE tenant_id = $1 AND setting_key = $2`;
        const params = [tenantId, key];

        if (widgetType) {
            query += ` AND widget_type = $3`;
            params.push(widgetType);
        } else {
            query += ` AND widget_type IS NULL`;
        }

        query += ` RETURNING id`;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        res.json({ message: 'Setting deleted successfully' });
    } catch (error) {
        console.error('Delete widget setting error:', error);
        res.status(500).json({ error: 'Failed to delete widget setting' });
    }
});

// Get template analytics
app.get('/templates/:id/analytics', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.user;

        // Verify template belongs to tenant
        const templateCheck = await pool.query(
            `SELECT id FROM public.templates WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        if (templateCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Get playlist usage count
        const playlistUsageResult = await pool.query(
            `SELECT COUNT(DISTINCT playlist_id) as count
             FROM playlist_items
             WHERE content_type = 'template' AND template_id = $1`,
            [id]
        );
        const playlistUsage = parseInt(playlistUsageResult.rows[0]?.count || 0);

        // Get device count (devices that have playlists using this template)
        const deviceCountResult = await pool.query(
            `SELECT COUNT(DISTINCT d.id) as count
             FROM devices d
             INNER JOIN schedules s ON s.device_id = d.id
             INNER JOIN playlist_items pi ON pi.playlist_id = s.playlist_id
             WHERE pi.content_type = 'template' AND pi.template_id = $1
             AND d.zone_id IN (
                 SELECT z.id FROM public.zones z
                 INNER JOIN properties p ON p.id = z.property_id
                 WHERE p.tenant_id = $2
             )`,
            [id, tenantId]
        );
        const deviceCount = parseInt(deviceCountResult.rows[0]?.count || 0);

        // Get last used date (from schedules)
        const lastUsedResult = await pool.query(
            `SELECT MAX(s.updated_at) as last_used
             FROM schedules s
             INNER JOIN playlist_items pi ON pi.playlist_id = s.playlist_id
             WHERE pi.content_type = 'template' AND pi.template_id = $1`,
            [id]
        );
        const lastUsed = lastUsedResult.rows[0]?.last_used || null;

        // Get performance metrics (placeholder - would need actual performance tracking)
        const analytics = {
            playlistUsage,
            deviceCount,
            lastUsed,
            loadTime: null, // Would be tracked separately
            errors: [] // Would be tracked separately
        };

        res.json(analytics);
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Data Sources API
app.get('/data-sources', authenticateToken, async (req, res) => {
    try {
        const { tenantId } = req.query;
        const result = await pool.query(
            `SELECT * FROM data_sources WHERE tenant_id = $1 AND is_active = true ORDER BY created_at DESC`,
            [tenantId || req.user.tenantId]
        );
        res.json({ sources: result.rows });
    } catch (error) {
        console.error('Get data sources error:', error);
        res.status(500).json({ error: 'Failed to fetch data sources' });
    }
});

app.post('/data-sources', authenticateToken, async (req, res) => {
    try {
        const { name, source_type, config, authentication, refresh_interval, tenantId } = req.body;
        const { userId, role } = req.user;

        if (role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot create data sources' });
        }

        const result = await pool.query(
            `INSERT INTO data_sources (tenant_id, created_by, name, source_type, config, authentication, refresh_interval)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                tenantId || req.user.tenantId,
                userId,
                name,
                source_type,
                JSON.stringify(config || {}),
                JSON.stringify(authentication || {}),
                refresh_interval || 60
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create data source error:', error);
        res.status(500).json({ error: 'Failed to create data source' });
    }
});

app.post('/data-sources/:id/test', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.user;

        const result = await pool.query(
            `SELECT * FROM data_sources WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Data source not found' });
        }

        const source = result.rows[0];
        // TODO: Implement actual data fetching based on source_type
        // For now, return mock data
        res.json({ 
            success: true, 
            sample: { message: 'Connection test successful', source_type: source.source_type }
        });
    } catch (error) {
        console.error('Test data source error:', error);
        res.status(500).json({ error: 'Failed to test data source' });
    }
});

// Zone Data Binding API
app.put('/templates/:templateId/zones/:zoneId/data-binding', authenticateToken, async (req, res) => {
    try {
        const { templateId, zoneId } = req.params;
        const { tenantId } = req.user;
        const bindingData = req.body;

        // Verify template belongs to tenant
        const templateCheck = await pool.query(
            `SELECT id, zones FROM public.templates WHERE id = $1 AND tenant_id = $2`,
            [templateId, tenantId]
        );

        if (templateCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const template = templateCheck.rows[0];
        let zones = typeof template.zones === 'string' ? JSON.parse(template.zones) : template.zones;

        // Update zone with data binding
        zones = zones.map(zone => {
            if (zone.id === zoneId) {
                return { ...zone, dataBinding: bindingData };
            }
            return zone;
        });

        // Update template
        await pool.query(
            `UPDATE public.templates SET zones = $1, updated_at = NOW() WHERE id = $2`,
            [JSON.stringify(zones), templateId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Update zone data binding error:', error);
        res.status(500).json({ error: 'Failed to update data binding' });
    }
});

// Scheduled Content API
app.get('/templates/:id/scheduled-content', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.user;

        // Verify template belongs to tenant
        const templateCheck = await pool.query(
            `SELECT id FROM public.templates WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        if (templateCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Get scheduled content for this template
        const result = await pool.query(
            `SELECT * FROM scheduled_content 
             WHERE template_id = $1 AND is_active = true
             ORDER BY priority DESC, created_at ASC`,
            [id]
        );

        res.json({ scheduledContent: result.rows });
    } catch (error) {
        console.error('Get scheduled content error:', error);
        res.status(500).json({ error: 'Failed to fetch scheduled content' });
    }
});

app.post('/templates/:id/scheduled-content', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { zone_id, content_type, schedule_type, schedule_config, content_data, priority } = req.body;
        const { tenantId, userId, role } = req.user;

        if (role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot create scheduled content' });
        }

        // Verify template belongs to tenant
        const templateCheck = await pool.query(
            `SELECT id FROM public.templates WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        if (templateCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const result = await pool.query(
            `INSERT INTO scheduled_content (template_id, zone_id, content_type, schedule_type, schedule_config, content_data, priority)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                id,
                zone_id,
                content_type,
                schedule_type,
                JSON.stringify(schedule_config || {}),
                JSON.stringify(content_data || {}),
                priority || 0
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create scheduled content error:', error);
        res.status(500).json({ error: 'Failed to create scheduled content' });
    }
});

// Template Sharing API
app.post('/templates/:id/share', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { sharedWithUserId, sharedWithTenantId, permission, isPublic } = req.body;
        const { userId, tenantId, role } = req.user;

        if (role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot share templates' });
        }

        // Verify template belongs to user's tenant
        const templateCheck = await pool.query(
            `SELECT id, tenant_id FROM public.templates WHERE id = $1`,
            [id]
        );

        if (templateCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const template = templateCheck.rows[0];
        if (template.tenant_id !== tenantId && role !== 'super_admin') {
            return res.status(403).json({ error: 'Permission denied' });
        }

        // Validate sharing parameters
        if (isPublic) {
            // Public sharing
            const result = await pool.query(
                `INSERT INTO template_shares (template_id, shared_by, is_public, permission)
                 VALUES ($1, $2, true, $3)
                 ON CONFLICT DO NOTHING
                 RETURNING *`,
                [id, userId, permission || 'view']
            );
            res.status(201).json(result.rows[0] || { message: 'Template already shared publicly' });
        } else if (sharedWithTenantId) {
            // Share with entire tenant
            const result = await pool.query(
                `INSERT INTO template_shares (template_id, shared_by, shared_with_tenant_id, permission)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT DO NOTHING
                 RETURNING *`,
                [id, userId, sharedWithTenantId, permission || 'view']
            );
            res.status(201).json(result.rows[0] || { message: 'Template already shared with tenant' });
        } else if (sharedWithUserId) {
            // Share with specific user
            const result = await pool.query(
                `INSERT INTO template_shares (template_id, shared_by, shared_with_user_id, permission)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT DO NOTHING
                 RETURNING *`,
                [id, userId, sharedWithUserId, permission || 'view']
            );
            res.status(201).json(result.rows[0] || { message: 'Template already shared with user' });
        } else {
            return res.status(400).json({ error: 'Must specify sharedWithUserId, sharedWithTenantId, or isPublic' });
        }
    } catch (error) {
        console.error('Share template error:', error);
        res.status(500).json({ error: 'Failed to share template' });
    }
});

app.get('/templates/shared', authenticateToken, async (req, res) => {
    try {
        const { userId, tenantId } = req.user;
        const { type = 'all' } = req.query; // 'all', 'with-me', 'by-me', 'public'

        let query = '';
        let params = [];

        if (type === 'with-me') {
            // Templates shared with me (as user or tenant member)
            query = `
                SELECT DISTINCT t.*, ts.permission, ts.shared_by, ts.created_at as shared_at
                FROM public.templates t
                JOIN template_shares ts ON t.id = ts.template_id
                WHERE (
                    ts.shared_with_user_id = $1 OR
                    ts.shared_with_tenant_id = $2 OR
                    ts.is_public = true
                )
                AND t.tenant_id != $2
                ORDER BY ts.created_at DESC
            `;
            params = [userId, tenantId];
        } else if (type === 'by-me') {
            // Templates I shared
            query = `
                SELECT DISTINCT t.*, ts.permission, ts.shared_with_user_id, ts.shared_with_tenant_id, ts.is_public, ts.created_at as shared_at
                FROM public.templates t
                JOIN template_shares ts ON t.id = ts.template_id
                WHERE ts.shared_by = $1
                ORDER BY ts.created_at DESC
            `;
            params = [userId];
        } else if (type === 'public') {
            // Public templates
            query = `
                SELECT DISTINCT t.*, ts.permission, ts.shared_by, ts.created_at as shared_at
                FROM public.templates t
                JOIN template_shares ts ON t.id = ts.template_id
                WHERE ts.is_public = true
                ORDER BY ts.created_at DESC
            `;
            params = [];
        } else {
            // All shared templates (with-me + by-me + public)
            query = `
                SELECT DISTINCT t.*, ts.permission, ts.shared_by, ts.shared_with_user_id, ts.shared_with_tenant_id, ts.is_public, ts.created_at as shared_at
                FROM public.templates t
                JOIN template_shares ts ON t.id = ts.template_id
                WHERE (
                    ts.shared_by = $1 OR
                    ts.shared_with_user_id = $1 OR
                    ts.shared_with_tenant_id = $2 OR
                    ts.is_public = true
                )
                ORDER BY ts.created_at DESC
            `;
            params = [userId, tenantId];
        }

        const result = await pool.query(query, params);
        res.json({ templates: result.rows });
    } catch (error) {
        console.error('Get shared templates error:', error);
        res.status(500).json({ error: 'Failed to fetch shared templates' });
    }
});

app.delete('/templates/:id/share', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { shareId } = req.query;
        const { userId, tenantId, role } = req.user;

        if (role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot unshare templates' });
        }

        // Verify template belongs to user's tenant or user is the one who shared
        const shareCheck = await pool.query(
            `SELECT ts.*, t.tenant_id
             FROM template_shares ts
             JOIN templates t ON ts.template_id = t.id
             WHERE ts.id = $1`,
            [shareId]
        );

        if (shareCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Share not found' });
        }

        const share = shareCheck.rows[0];
        if (share.shared_by !== userId && share.tenant_id !== tenantId && role !== 'super_admin') {
            return res.status(403).json({ error: 'Permission denied' });
        }

        await pool.query(
            `DELETE FROM template_shares WHERE id = $1`,
            [shareId]
        );

        res.json({ message: 'Template unshared successfully' });
    } catch (error) {
        console.error('Unshare template error:', error);
        res.status(500).json({ error: 'Failed to unshare template' });
    }
});

// Template Comments API
app.post('/templates/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;
        const { userId } = req.user;

        // Verify template exists and user has access
        const templateCheck = await pool.query(
            `SELECT id FROM public.templates WHERE id = $1`,
            [id]
        );

        if (templateCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const result = await pool.query(
            `INSERT INTO template_comments (template_id, user_id, comment)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [id, userId, comment]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

app.get('/templates/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT tc.*, u.name as user_name, u.email as user_email
             FROM template_comments tc
             JOIN users u ON tc.user_id = u.id
             WHERE tc.template_id = $1
             ORDER BY tc.created_at ASC`,
            [id]
        );

        res.json({ comments: result.rows });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// Template Export API
app.get('/templates/:id/export', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { includeMedia = false } = req.query;
        const { tenantId } = req.user;

        // Verify template belongs to tenant or is shared
        const templateCheck = await pool.query(
            `SELECT t.*, 
                    CASE 
                        WHEN t.tenant_id = $1 THEN true
                        WHEN EXISTS (
                            SELECT 1 FROM template_shares ts 
                            WHERE ts.template_id = t.id 
                            AND (ts.shared_with_user_id = $2 OR ts.shared_with_tenant_id = $1 OR ts.is_public = true)
                        ) THEN true
                        ELSE false
                    END as has_access
             FROM public.templates t
             WHERE t.id = $1`,
            [id, tenantId, req.user.userId]
        );

        if (templateCheck.rows.length === 0 || !templateCheck.rows[0].has_access) {
            return res.status(404).json({ error: 'Template not found or access denied' });
        }

        const template = templateCheck.rows[0];
        const exportData = {
            name: template.name,
            description: template.description,
            category: template.category,
            tags: template.tags,
            width: template.width,
            height: template.height,
            orientation: template.orientation,
            background_color: template.background_color,
            zones: typeof template.zones === 'string' ? JSON.parse(template.zones) : template.zones,
            variables: typeof template.variables === 'string' ? JSON.parse(template.variables) : (template.variables || []),
            version: template.version,
            exportedAt: new Date().toISOString(),
            exportedBy: req.user.userId
        };

        // Include media assets if requested
        if (includeMedia === 'true') {
            const zones = exportData.zones || [];
            const mediaZoneIds = zones
                .filter(zone => zone.contentType === 'media' && zone.mediaAssetId)
                .map(zone => zone.mediaAssetId);

            if (mediaZoneIds.length > 0) {
                // Fetch media assets (would need to call content-service or have access to media_assets table)
                // For now, just include the IDs
                exportData.mediaAssets = mediaZoneIds;
            }
        }

        res.json({ template: exportData });
    } catch (error) {
        console.error('Export template error:', error);
        res.status(500).json({ error: 'Failed to export template' });
    }
});

// Template Import API
app.post('/templates/import', authenticateToken, async (req, res) => {
    try {
        const { template, mediaAssets, propertyId, zoneId } = req.body;
        const { userId, tenantId, role } = req.user;

        if (role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot import templates' });
        }

        // Validate required fields
        if (!template.name || !template.width || !template.height) {
            return res.status(400).json({ error: 'Missing required fields: name, width, height' });
        }

        // Property/Zone assignment (same logic as create)
        let finalPropertyId = propertyId;
        let finalZoneId = zoneId || null;

        if (role === 'super_admin') {
            if (!propertyId) {
                return res.status(400).json({ error: 'Property ID is required' });
            }
        } else if (role === 'property_admin') {
            const propertyAccess = await pool.query(
                'SELECT property_id FROM public.user_property_access WHERE user_id = $1 LIMIT 1',
                [userId]
            );
            if (propertyAccess.rows.length === 0) {
                return res.status(403).json({ error: 'No property access assigned' });
            }
            finalPropertyId = propertyAccess.rows[0].property_id;
            if (!zoneId) {
                return res.status(400).json({ error: 'Zone ID is required for property admins' });
            }
        } else if (role === 'zone_admin') {
            const zoneAccess = await pool.query(
                `SELECT z.id as zone_id, z.property_id 
                 FROM public.user_zone_access uza
                 JOIN public.zones z ON uza.zone_id = z.id
                 WHERE uza.user_id = $1 LIMIT 1`,
                [userId]
            );
            if (zoneAccess.rows.length === 0) {
                return res.status(403).json({ error: 'No zone access assigned' });
            }
            finalPropertyId = zoneAccess.rows[0].property_id;
            finalZoneId = zoneAccess.rows[0].zone_id;
        }

        // Create new template from imported data
        const result = await pool.query(
            `INSERT INTO public.templates (tenant_id, created_by, property_id, zone_id, name, description, category, tags, width, height, orientation, zones, background_color, background_image_id, variables, version, parent_template_id, is_shared, shared_with_properties)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 1, NULL, $16, $17)
             RETURNING *`,
            [
                tenantId,
                userId,
                finalPropertyId,
                finalZoneId,
                template.name,
                template.description || '',
                template.category || 'custom',
                JSON.stringify(template.tags || []),
                template.width,
                template.height,
                template.orientation || (template.width > template.height ? 'landscape' : 'portrait'),
                JSON.stringify(template.zones || []),
                template.background_color || '#ffffff',
                null, // background_image_id would need to be mapped if mediaAssets are imported
                JSON.stringify(template.variables || []),
                false, // is_shared
                [] // shared_with_properties
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Import template error:', error);
        res.status(500).json({ error: 'Failed to import template' });
    }
});

// Share template with other properties
app.post('/templates/:id/share', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { propertyIds } = req.body;
        const { role, userId } = req.user;

        if (role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super admins can share content' });
        }

        if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
            return res.status(400).json({ error: 'propertyIds array is required' });
        }

        const templateCheck = await pool.query(
            'SELECT id, tenant_id FROM public.templates WHERE id = $1',
            [id]
        );

        if (templateCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        if (templateCheck.rows[0].tenant_id !== req.user.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const propertyCheck = await pool.query(
            'SELECT id FROM properties WHERE id = ANY($1::UUID[]) AND tenant_id = $2',
            [propertyIds, req.user.tenantId]
        );

        if (propertyCheck.rows.length !== propertyIds.length) {
            return res.status(400).json({ error: 'One or more properties not found or belong to different tenant' });
        }

        await pool.query(
            `UPDATE public.templates 
             SET is_shared = true, shared_with_properties = $1
             WHERE id = $2`,
            [propertyIds, id]
        );

        res.json({ message: 'Template shared successfully', propertyIds });
    } catch (error) {
        console.error('Share template error:', error);
        res.status(500).json({ error: 'Failed to share template' });
    }
});

// Unshare template from all properties
app.delete('/templates/:id/share', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.user;

        if (role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super admins can unshare content' });
        }

        const templateCheck = await pool.query(
            'SELECT id, tenant_id FROM public.templates WHERE id = $1',
            [id]
        );

        if (templateCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        if (templateCheck.rows[0].tenant_id !== req.user.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await pool.query(
            `UPDATE public.templates 
             SET is_shared = false, shared_with_properties = ARRAY[]::UUID[]
             WHERE id = $1`,
            [id]
        );

        res.json({ message: 'Template unshared successfully' });
    } catch (error) {
        console.error('Unshare template error:', error);
        res.status(500).json({ error: 'Failed to unshare template' });
    }
});

// Unshare template from specific property
app.delete('/templates/:id/share/:propertyId', authenticateToken, async (req, res) => {
    try {
        const { id, propertyId } = req.params;
        const { role } = req.user;

        if (role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super admins can unshare content' });
        }

        const templateCheck = await pool.query(
            'SELECT id, tenant_id, shared_with_properties FROM public.templates WHERE id = $1',
            [id]
        );

        if (templateCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        if (templateCheck.rows[0].tenant_id !== req.user.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const currentShared = templateCheck.rows[0].shared_with_properties || [];
        const updatedShared = currentShared.filter(pId => pId !== propertyId);

        await pool.query(
            `UPDATE public.templates 
             SET shared_with_properties = $1, is_shared = $2
             WHERE id = $3`,
            [updatedShared, updatedShared.length > 0, id]
        );

        res.json({ message: 'Property removed from sharing', propertyId });
    } catch (error) {
        console.error('Unshare template from property error:', error);
        res.status(500).json({ error: 'Failed to unshare template from property' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'template-service' });
});

const PORT = process.env.PORT || process.env.TEMPLATE_SERVICE_PORT || 3003;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Template Service running on port ${PORT}`);
});

module.exports = app;
