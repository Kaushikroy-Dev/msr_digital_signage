const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const jwt = require('jsonwebtoken');
app.use(express.json());

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
            console.error('[Auth] JWT Verification failed:', {
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
        console.log('[Auth] Token verified successfully for user:', user.userId || user.id);
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

// Get playlists
app.get('/playlists', authenticateToken, async (req, res) => {
    try {
        const { tenantId, propertyId, zoneId } = req.query;
        const { role, userId } = req.user;
        const targetTenantId = tenantId || req.user.tenantId;

        let query = `
            SELECT 
                p.*,
                COALESCE(ps.item_count, 0) as item_count,
                COALESCE(ps.total_duration, 0) as total_duration,
                ps.thumbnails
            FROM playlists p
            LEFT JOIN (
                SELECT 
                    pi.playlist_id,
                    COUNT(pi.id) as item_count,
                    SUM(pi.duration_seconds) as total_duration,
                    ARRAY_AGG(
                        CASE 
                            WHEN pi.content_type = 'media' THEN ma.thumbnail_path
                            ELSE NULL 
                        END 
                        ORDER BY pi.sequence_order
                    ) FILTER (WHERE pi.content_type = 'media' AND ma.thumbnail_path IS NOT NULL) as thumbnails
                FROM playlist_items pi
                LEFT JOIN media_assets ma ON pi.media_asset_id = ma.id
                GROUP BY pi.playlist_id
            ) ps ON p.id = ps.playlist_id
            WHERE p.tenant_id = $1
        `;
        const params = [targetTenantId];
        let paramIndex = 2;

        // Apply property/zone filtering based on role (same logic as media assets)
        if (role === 'super_admin') {
            if (propertyId) {
                query += ` AND (p.property_id = $${paramIndex} OR (p.is_shared = true AND p.shared_with_properties IS NOT NULL AND $${paramIndex} = ANY(p.shared_with_properties)))`;
                params.push(propertyId);
                paramIndex++;
            }
            if (zoneId) {
                query += ` AND (p.zone_id = $${paramIndex} OR p.zone_id IS NULL)`;
                params.push(zoneId);
                paramIndex++;
            }
        } else if (role === 'property_admin') {
            query += ` AND (
                p.property_id IN (SELECT property_id FROM user_property_access WHERE user_id = $${paramIndex})
                OR (p.is_shared = true AND EXISTS (
                    SELECT 1 FROM user_property_access upa 
                    WHERE upa.user_id = $${paramIndex} 
                    AND p.shared_with_properties IS NOT NULL
                    AND upa.property_id = ANY(p.shared_with_properties)
                ))
            )`;
            params.push(userId);
            paramIndex++;
            if (zoneId) {
                query += ` AND (p.zone_id = $${paramIndex} OR p.zone_id IS NULL)`;
                params.push(zoneId);
                paramIndex++;
            }
        } else if (role === 'zone_admin') {
            query += ` AND (
                p.zone_id IN (SELECT zone_id FROM user_zone_access WHERE user_id = $${paramIndex})
                OR (p.is_shared = true AND EXISTS (
                    SELECT 1 FROM zones z
                    JOIN user_zone_access uza ON z.id = uza.zone_id
                    WHERE uza.user_id = $${paramIndex}
                    AND p.shared_with_properties IS NOT NULL
                    AND z.property_id = ANY(p.shared_with_properties)
                ))
            )`;
            params.push(userId);
            paramIndex++;
        } else {
            // content_editor
            const propertyAccess = await pool.query(
                'SELECT property_id FROM user_property_access WHERE user_id = $1',
                [userId]
            );
            if (propertyAccess.rows.length > 0) {
                const propertyIds = propertyAccess.rows.map(r => r.property_id);
                query += ` AND (
                    p.property_id = ANY($${paramIndex}::UUID[])
                    OR (p.is_shared = true AND EXISTS (
                        SELECT 1 FROM unnest($${paramIndex}::UUID[]) AS prop_id
                        WHERE p.shared_with_properties IS NOT NULL
                        AND prop_id = ANY(p.shared_with_properties)
                    ))
                )`;
                params.push(propertyIds);
                paramIndex++;
            } else {
                const zoneAccess = await pool.query(
                    'SELECT zone_id FROM user_zone_access WHERE user_id = $1',
                    [userId]
                );
                if (zoneAccess.rows.length > 0) {
                    const zoneIds = zoneAccess.rows.map(r => r.zone_id);
                    query += ` AND p.zone_id = ANY($${paramIndex}::UUID[])`;
                    params.push(zoneIds);
                    paramIndex++;
                } else {
                    return res.status(403).json({ error: 'No property or zone access' });
                }
            }
        }

        query += ` ORDER BY p.created_at DESC`;

        const result = await pool.query(query, params);

        // Transform snake_case to camelCase and process stats
        const playlists = result.rows.map(playlist => ({
            ...playlist,
            sharedWithProperties: playlist.shared_with_properties || [],
            propertyId: playlist.property_id,
            zoneId: playlist.zone_id,
            isShared: playlist.is_shared,
            itemCount: parseInt(playlist.item_count),
            totalDuration: parseInt(playlist.total_duration),
            thumbnails: (playlist.thumbnails || []).map(path => {
                if (!path) return null;
                const parts = path.split('/');
                if (parts.length >= 3) {
                    return `/uploads/${parts[0]}/thumbnails/${parts[2]}`;
                }
                return `/uploads/${path}`;
            }).filter(Boolean)
        }));

        res.json({ playlists });
    } catch (error) {
        console.error('Get playlists error:', error);
        res.status(500).json({ error: 'Failed to fetch playlists' });
    }
});

// Create playlist
app.post('/playlists', authenticateToken, async (req, res) => {
    try {
        const { name, description, transitionEffect, transitionDuration, propertyId, zoneId } = req.body;
        const { tenantId, userId, role } = req.user;

        console.log('[Create Playlist] Request received:', {
            name,
            propertyId,
            zoneId,
            role,
            userId,
            tenantId,
            hasPropertyId: !!propertyId,
            hasZoneId: !!zoneId
        });

        // Property/Zone assignment based on role (same logic as media/templates)
        let finalPropertyId = propertyId;
        let finalZoneId = zoneId || null;

        if (role === 'super_admin') {
            if (!propertyId) {
                console.log('[Create Playlist] Error: super_admin missing propertyId');
                return res.status(400).json({ error: 'Property ID is required' });
            }
        } else if (role === 'property_admin') {
            const propertyAccess = await pool.query(
                'SELECT property_id FROM user_property_access WHERE user_id = $1 LIMIT 1',
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
                'SELECT id FROM zones WHERE id = $1 AND property_id = $2',
                [zoneId, finalPropertyId]
            );
            if (zoneCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Zone does not belong to your assigned property' });
            }
        } else if (role === 'zone_admin') {
            const zoneAccess = await pool.query(
                `SELECT z.id as zone_id, z.property_id 
                 FROM user_zone_access uza
                 JOIN zones z ON uza.zone_id = z.id
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
                'SELECT property_id FROM user_property_access WHERE user_id = $1 LIMIT 1',
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
                     FROM user_zone_access uza
                     JOIN zones z ON uza.zone_id = z.id
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

        console.log('[Create Playlist] Inserting playlist:', {
            tenantId,
            userId,
            finalPropertyId,
            finalZoneId,
            name
        });

        const result = await pool.query(
            `INSERT INTO playlists (tenant_id, created_by, property_id, zone_id, name, description, transition_effect, transition_duration_ms, is_shared, shared_with_properties)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [tenantId, userId, finalPropertyId, finalZoneId, name, description, transitionEffect || 'fade', transitionDuration || 1000, false, []]
        );

        console.log('[Create Playlist] Successfully created playlist:', result.rows[0].id);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('[Create Playlist] Error:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            detail: error.detail
        });
        res.status(500).json({ error: 'Failed to create playlist', details: error.message });
    }
});

// Update playlist
app.put('/playlists/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, transitionEffect, transitionDuration } = req.body;
        const { tenantId } = req.user;

        // Verify playlist belongs to tenant
        const checkResult = await pool.query(
            'SELECT id FROM playlists WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        const result = await pool.query(
            `UPDATE playlists 
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 transition_effect = COALESCE($3, transition_effect),
                 transition_duration_ms = COALESCE($4, transition_duration_ms),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 AND tenant_id = $6
             RETURNING *`,
            [name, description, transitionEffect, transitionDuration, id, tenantId]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update playlist error:', error);
        res.status(500).json({ error: 'Failed to update playlist' });
    }
});

// Delete playlist
app.delete('/playlists/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.user;

        // Verify playlist belongs to tenant
        const checkResult = await pool.query(
            'SELECT id FROM playlists WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        // Delete playlist (CASCADE will delete playlist_items and schedules)
        await pool.query(
            'DELETE FROM playlists WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        res.json({ message: 'Playlist deleted successfully' });
    } catch (error) {
        console.error('Delete playlist error:', error);
        res.status(500).json({ error: 'Failed to delete playlist' });
    }
});

// Get schedules
app.get('/schedules', authenticateToken, async (req, res) => {
    try {
        const { tenantId, propertyId, zoneId } = req.query;
        const { role, userId } = req.user;
        const targetTenantId = tenantId || req.user.tenantId;

        let query = `
            SELECT DISTINCT s.*, p.name as playlist_name 
            FROM schedules s
            JOIN playlists p ON s.playlist_id = p.id
            LEFT JOIN schedule_devices sd ON s.id = sd.schedule_id
            WHERE s.tenant_id = $1
        `;
        let params = [targetTenantId];
        let paramIndex = 2;

        // Apply property/zone filtering based on role
        if (role === 'super_admin') {
            if (propertyId) {
                query += ` AND (s.property_id = $${paramIndex} OR sd.property_id = $${paramIndex})`;
                params.push(propertyId);
                paramIndex++;
            }
            if (zoneId) {
                query += ` AND (s.zone_id = $${paramIndex} OR s.zone_id IS NULL OR sd.zone_id = $${paramIndex})`;
                params.push(zoneId);
                paramIndex++;
            }
        } else if (role === 'property_admin') {
            query += ` AND (
                s.property_id IN (SELECT property_id FROM user_property_access WHERE user_id = $${paramIndex})
                OR sd.property_id IN (SELECT property_id FROM user_property_access WHERE user_id = $${paramIndex})
                OR sd.zone_id IN (SELECT z.id FROM zones z WHERE z.property_id IN (SELECT property_id FROM user_property_access WHERE user_id = $${paramIndex}))
                OR sd.device_id IN (SELECT d.id FROM devices d JOIN zones z ON d.zone_id = z.id WHERE z.property_id IN (SELECT property_id FROM user_property_access WHERE user_id = $${paramIndex}))
            )`;
            params.push(userId);
            paramIndex++;
            if (zoneId) {
                query += ` AND (s.zone_id = $${paramIndex} OR s.zone_id IS NULL OR sd.zone_id = $${paramIndex})`;
                params.push(zoneId);
                paramIndex++;
            }
        } else if (role === 'zone_admin') {
            query += ` AND (
                s.zone_id IN (SELECT zone_id FROM user_zone_access WHERE user_id = $${paramIndex})
                OR sd.zone_id IN (SELECT zone_id FROM user_zone_access WHERE user_id = $${paramIndex})
                OR sd.device_id IN (SELECT d.id FROM devices d WHERE d.zone_id IN (SELECT zone_id FROM user_zone_access WHERE user_id = $${paramIndex}))
            )`;
            params.push(userId);
            paramIndex++;
        }

        query += ` ORDER BY s.created_at DESC`;

        const result = await pool.query(query, params);
        res.json({ schedules: result.rows });
    } catch (error) {
        console.error('Get schedules error:', error);
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
});

// Create schedule
app.post('/schedules', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { name, playlistId, startDate, endDate, startTime, endTime, daysOfWeek, recurrencePattern, deviceIds, propertyId, zoneId } = req.body;
        const { tenantId, userId, role } = req.user;

        // Property/Zone assignment based on role
        let finalPropertyId = propertyId;
        let finalZoneId = zoneId || null;

        if (role === 'super_admin') {
            if (!propertyId) {
                return res.status(400).json({ error: 'Property ID is required' });
            }
        } else if (role === 'property_admin') {
            const propertyAccess = await client.query(
                'SELECT property_id FROM user_property_access WHERE user_id = $1 LIMIT 1',
                [userId]
            );
            if (propertyAccess.rows.length === 0) {
                return res.status(403).json({ error: 'No property access assigned' });
            }
            finalPropertyId = propertyAccess.rows[0].property_id;
            // Zone is optional for schedules
        } else if (role === 'zone_admin') {
            const zoneAccess = await client.query(
                `SELECT z.id as zone_id, z.property_id 
                 FROM user_zone_access uza
                 JOIN zones z ON uza.zone_id = z.id
                 WHERE uza.user_id = $1 LIMIT 1`,
                [userId]
            );
            if (zoneAccess.rows.length === 0) {
                return res.status(403).json({ error: 'No zone access assigned' });
            }
            finalPropertyId = zoneAccess.rows[0].property_id;
            finalZoneId = zoneAccess.rows[0].zone_id;
        }

        // RBAC: Verify access to devices
        if (role !== 'super_admin' && deviceIds && deviceIds.length > 0) {
            let hasAccess = false;
            if (role === 'property_admin') {
                const accessCheck = await client.query(
                    `SELECT COUNT(*) FROM devices d
                     JOIN zones z ON d.zone_id = z.id
                     WHERE d.id = ANY($1) AND z.property_id IN (SELECT property_id FROM user_property_access WHERE user_id = $2)`,
                    [deviceIds, userId]
                );
                hasAccess = parseInt(accessCheck.rows[0].count) === deviceIds.length;
            } else if (role === 'zone_admin') {
                const accessCheck = await client.query(
                    `SELECT COUNT(*) FROM devices WHERE id = ANY($1) AND zone_id IN (SELECT zone_id FROM user_zone_access WHERE user_id = $2)`,
                    [deviceIds, userId]
                );
                hasAccess = parseInt(accessCheck.rows[0].count) === deviceIds.length;
            }

            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied to one or more selected devices' });
            }
        }

        await client.query('BEGIN');

        // Clean up empty strings to null for database
        const cleanStartDate = startDate === '' ? null : startDate;
        const cleanEndDate = endDate === '' ? null : endDate;
        const cleanStartTime = startTime === '' ? null : startTime;
        const cleanEndTime = endTime === '' ? null : endTime;

        const result = await client.query(
            `INSERT INTO schedules (tenant_id, created_by, property_id, zone_id, name, playlist_id, start_date, end_date, start_time, end_time, days_of_week, recurrence_pattern)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [tenantId, userId, finalPropertyId, finalZoneId, name, playlistId, cleanStartDate, cleanEndDate, cleanStartTime, cleanEndTime, daysOfWeek, recurrencePattern]
        );

        const scheduleId = result.rows[0].id;

        // Insert device assignments if any
        if (deviceIds && deviceIds.length > 0) {
            console.log('[Schedule] Assigning devices:', deviceIds, 'to schedule:', scheduleId);
            // Use parameterized query for each device to avoid SQL injection
            for (const deviceId of deviceIds) {
                await client.query(
                    `INSERT INTO schedule_devices (schedule_id, device_id) VALUES ($1, $2)`,
                    [scheduleId, deviceId]
                );
            }
            console.log('[Schedule] Successfully assigned', deviceIds.length, 'devices');
        } else {
            console.log('[Schedule] No devices to assign');
        }

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create schedule error:', error);
        res.status(500).json({ error: 'Failed to create schedule' });
    } finally {
        client.release();
    }
});

// Update schedule
app.put('/schedules/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { name, playlistId, startDate, endDate, startTime, endTime, daysOfWeek, recurrencePattern, deviceIds, isActive } = req.body;
        const { tenantId, userId, role } = req.user;

        // Verify schedule belongs to tenant
        const checkResult = await client.query(
            'SELECT id FROM schedules WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        // RBAC: Verify access to devices if updating device assignments
        if (deviceIds && deviceIds.length > 0 && role !== 'super_admin') {
            let hasAccess = false;
            if (role === 'property_admin') {
                const accessCheck = await client.query(
                    `SELECT COUNT(*) FROM devices d
                     JOIN zones z ON d.zone_id = z.id
                     WHERE d.id = ANY($1) AND z.property_id IN (SELECT property_id FROM user_property_access WHERE user_id = $2)`,
                    [deviceIds, userId]
                );
                hasAccess = parseInt(accessCheck.rows[0].count) === deviceIds.length;
            } else if (role === 'zone_admin') {
                const accessCheck = await client.query(
                    `SELECT COUNT(*) FROM devices WHERE id = ANY($1) AND zone_id IN (SELECT zone_id FROM user_zone_access WHERE user_id = $2)`,
                    [deviceIds, userId]
                );
                hasAccess = parseInt(accessCheck.rows[0].count) === deviceIds.length;
            }

            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied to one or more selected devices' });
            }
        }

        await client.query('BEGIN');

        // Clean up empty strings to null
        const cleanStartDate = startDate === '' ? null : startDate;
        const cleanEndDate = endDate === '' ? null : endDate;
        const cleanStartTime = startTime === '' ? null : startTime;
        const cleanEndTime = endTime === '' ? null : endTime;

        // Update schedule
        const result = await client.query(
            `UPDATE schedules 
             SET name = COALESCE($1, name),
                 playlist_id = COALESCE($2, playlist_id),
                 start_date = $3,
                 end_date = $4,
                 start_time = $5,
                 end_time = $6,
                 days_of_week = COALESCE($7, days_of_week),
                 recurrence_pattern = COALESCE($8, recurrence_pattern),
                 is_active = COALESCE($9, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $10 AND tenant_id = $11
             RETURNING *`,
            [name, playlistId, cleanStartDate, cleanEndDate, cleanStartTime, cleanEndTime, daysOfWeek, recurrencePattern, isActive, id, tenantId]
        );

        // Update device assignments if provided
        if (deviceIds !== undefined) {
            await client.query('DELETE FROM schedule_devices WHERE schedule_id = $1', [id]);

            if (deviceIds.length > 0) {
                const values = deviceIds.map((deviceId, index) =>
                    `($1, $${index + 2})`
                ).join(', ');

                await client.query(
                    `INSERT INTO schedule_devices (schedule_id, device_id) VALUES ${values}`,
                    [id, ...deviceIds]
                );
            }
        }

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update schedule error:', error);
        res.status(500).json({ error: 'Failed to update schedule' });
    } finally {
        client.release();
    }
});

// Delete schedule
app.delete('/schedules/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.user;

        // Verify schedule belongs to tenant
        const checkResult = await pool.query(
            'SELECT id FROM schedules WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        // Delete schedule (CASCADE will delete schedule_devices)
        await pool.query(
            'DELETE FROM schedules WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        console.error('Delete schedule error:', error);
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
});

// Get playlist items
app.get('/playlists/:id/items', async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.query;

        const result = await pool.query(
            `SELECT 
                pi.*,
                ma.original_name as content_name,
                ma.file_type,
                ma.storage_path,
                ma.thumbnail_path,
                t.name as template_name,
                t.width as template_width,
                t.height as template_height,
                t.zones as template_zones,
                t.background_color as template_background_color,
                t.background_image_id as template_background_image_id
             FROM playlist_items pi
             LEFT JOIN media_assets ma ON pi.media_asset_id = ma.id AND pi.content_type = 'media'
             LEFT JOIN templates t ON pi.template_id = t.id AND pi.content_type = 'template'
             WHERE pi.playlist_id = $1 
             ORDER BY pi.sequence_order ASC`,
            [id]
        );

        // Transform to match frontend expectations
        const items = result.rows.map(item => ({
            id: item.id,
            playlist_id: item.playlist_id,
            content_type: item.content_type,
            content_id: item.media_asset_id || item.template_id,
            content_name: item.content_name || item.template_name || 'Untitled',
            file_type: item.file_type,
            url: item.storage_path ? `/uploads/${item.storage_path}` : null,
            thumbnail_url: item.thumbnail_path ? `/uploads/${item.thumbnail_path}` : null,
            duration_ms: item.duration_seconds * 1000,
            duration_seconds: item.duration_seconds,
            order_index: item.sequence_order,
            created_at: item.created_at,
            // Template data
            template: item.content_type === 'template' ? {
                id: item.template_id,
                name: item.template_name,
                width: item.template_width,
                height: item.template_height,
                zones: item.template_zones,
                background_color: item.template_background_color,
                background_image_id: item.template_background_image_id
            } : null
        }));

        res.json({ items });
    } catch (error) {
        console.error('Get playlist items error:', error);
        res.status(500).json({ error: 'Failed to fetch playlist items' });
    }
});

// Add item to playlist
app.post('/playlists/:id/items', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { contentType, contentId, duration, tenantId } = req.body;

        // Validate content type
        if (contentType !== 'media' && contentType !== 'template') {
            return res.status(400).json({ error: 'Invalid content type. Must be "media" or "template"' });
        }

        // Get the next sequence order
        const orderResult = await pool.query(
            `SELECT COALESCE(MAX(sequence_order), 0) + 1 as next_order FROM playlist_items WHERE playlist_id = $1`,
            [id]
        );
        const nextOrder = orderResult.rows[0].next_order;

        // Convert duration from ms to seconds (if provided in ms) or use as seconds
        const durationSeconds = duration >= 1000 ? Math.floor(duration / 1000) : duration;

        // Insert based on content type
        let result;
        if (contentType === 'media') {
            result = await pool.query(
                `INSERT INTO playlist_items (playlist_id, content_type, media_asset_id, duration_seconds, sequence_order)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [id, contentType, contentId, durationSeconds, nextOrder]
            );
        } else if (contentType === 'template') {
            result = await pool.query(
                `INSERT INTO playlist_items (playlist_id, content_type, template_id, duration_seconds, sequence_order)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [id, contentType, contentId, durationSeconds, nextOrder]
            );
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Add playlist item error:', error);
        res.status(500).json({ error: 'Failed to add item to playlist' });
    }
});

// Update playlist item duration
app.put('/playlists/:playlistId/items/:itemId', authenticateToken, async (req, res) => {
    try {
        const { playlistId, itemId } = req.params;
        const { duration } = req.body; // duration in seconds

        if (!duration || duration < 1 || duration > 3600) {
            return res.status(400).json({ error: 'Duration must be between 1 and 3600 seconds' });
        }

        await pool.query(
            `UPDATE playlist_items SET duration_seconds = $1 WHERE id = $2 AND playlist_id = $3`,
            [duration, itemId, playlistId]
        );

        res.json({ message: 'Item duration updated successfully' });
    } catch (error) {
        console.error('Update playlist item error:', error);
        res.status(500).json({ error: 'Failed to update item duration' });
    }
});

// Delete playlist item
app.delete('/playlists/:playlistId/items/:itemId', authenticateToken, async (req, res) => {
    try {
        const { playlistId, itemId } = req.params;

        await pool.query(
            `DELETE FROM playlist_items WHERE id = $1 AND playlist_id = $2`,
            [itemId, playlistId]
        );

        res.json({ message: 'Item removed successfully' });
    } catch (error) {
        console.error('Delete playlist item error:', error);
        res.status(500).json({ error: 'Failed to remove item' });
    }
});

// Assign devices to schedule
app.post('/schedules/:id/devices', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { deviceIds } = req.body;

        // Delete existing assignments
        await pool.query('DELETE FROM schedule_devices WHERE schedule_id = $1', [id]);

        // Insert new assignments
        if (deviceIds && deviceIds.length > 0) {
            const values = deviceIds.map((deviceId, index) =>
                `($1, $${index + 2})`
            ).join(', ');

            await pool.query(
                `INSERT INTO schedule_devices (schedule_id, device_id) VALUES ${values}`,
                [id, ...deviceIds]
            );
        }

        res.json({ message: 'Devices assigned successfully' });
    } catch (error) {
        console.error('Assign devices error:', error);
        res.status(500).json({ error: 'Failed to assign devices' });
    }
});

// Quick assign playlist to devices (creates a default always-on schedule)
app.post('/playlists/:playlistId/assign-devices', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { playlistId } = req.params;
        const { deviceIds } = req.body;
        const { tenantId, userId } = req.user;

        if (!deviceIds || deviceIds.length === 0) {
            return res.status(400).json({ error: 'At least one device must be selected' });
        }

        await client.query('BEGIN');

        // Check if playlist exists and belongs to tenant
        const playlistCheck = await client.query(
            'SELECT id, property_id, zone_id, name FROM playlists WHERE id = $1 AND tenant_id = $2',
            [playlistId, tenantId]
        );

        if (playlistCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Playlist not found' });
        }

        // Get playlist property/zone for the schedule
        const playlistPropertyId = playlistCheck.rows[0].property_id;
        const playlistZoneId = playlistCheck.rows[0].zone_id;

        // Create a default always-on schedule for this playlist
        const scheduleResult = await client.query(
            `INSERT INTO schedules (tenant_id, created_by, property_id, zone_id, name, playlist_id, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, true)
             RETURNING id`,
            [tenantId, userId, playlistPropertyId, playlistZoneId, `Auto: ${playlistCheck.rows[0].name || 'Playlist'}`, playlistId]
        );

        const scheduleId = scheduleResult.rows[0].id;

        // Assign devices to schedule
        if (deviceIds.length > 0) {
            const values = deviceIds.map((deviceId, index) =>
                `($1, $${index + 2})`
            ).join(', ');

            await client.query(
                `INSERT INTO schedule_devices (schedule_id, device_id) VALUES ${values}`,
                [scheduleId, ...deviceIds]
            );
        }

        await client.query('COMMIT');
        res.json({
            message: 'Playlist assigned to devices successfully',
            scheduleId: scheduleId
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Assign playlist to devices error:', error);
        res.status(500).json({ error: 'Failed to assign playlist to devices' });
    } finally {
        client.release();
    }
});

// Get devices assigned to a playlist (via schedules)
app.get('/playlists/:playlistId/devices', authenticateToken, async (req, res) => {
    try {
        const { playlistId } = req.params;
        const { tenantId } = req.user;

        const result = await pool.query(
            `SELECT DISTINCT d.id, d.device_name, d.status, z.name as zone_name, p.name as property_name
             FROM devices d
             JOIN schedule_devices sd ON d.id = sd.device_id
             JOIN schedules s ON sd.schedule_id = s.id
             LEFT JOIN zones z ON d.zone_id = z.id
             LEFT JOIN properties p ON z.property_id = p.id
             WHERE s.playlist_id = $1 AND s.tenant_id = $2 AND s.is_active = true
             ORDER BY d.device_name`,
            [playlistId, tenantId]
        );

        res.json({ devices: result.rows });
    } catch (error) {
        console.error('Get playlist devices error:', error);
        res.status(500).json({ error: 'Failed to fetch assigned devices' });
    }
});

// Get assigned devices for a schedule
app.get('/schedules/:id/devices', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT d.* FROM devices d
             JOIN schedule_devices sd ON d.id = sd.device_id
             WHERE sd.schedule_id = $1`,
            [id]
        );

        res.json({ devices: result.rows });
    } catch (error) {
        console.error('Get assigned devices error:', error);
        res.status(500).json({ error: 'Failed to fetch assigned devices' });
    }
});

// Get all devices for device selection
app.get('/devices', authenticateToken, async (req, res) => {
    try {
        const { tenantId } = req.query;
        const { role, userId } = req.user;

        let query = `
            SELECT d.id, d.device_name, d.status, d.zone_id, d.created_at, d.last_heartbeat, 
                   z.name as zone_name, p.name as property_name
            FROM devices d
            JOIN zones z ON d.zone_id = z.id
            JOIN properties p ON z.property_id = p.id
            WHERE p.tenant_id = $1
        `;
        let params = [tenantId || req.user.tenantId];

        if (role === 'property_admin') {
            query += ` AND p.id IN (SELECT property_id FROM user_property_access WHERE user_id = $2)`;
            params.push(userId);
        } else if (role === 'zone_admin') {
            query += ` AND d.zone_id IN (SELECT zone_id FROM user_zone_access WHERE user_id = $2)`;
            params.push(userId);
        }

        query += ` ORDER BY d.device_name`;

        const result = await pool.query(query, params);
        res.json({ devices: result.rows });
    } catch (error) {
        console.error('Get devices error:', error);
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
});

// Get current content for device player
app.get('/player/:deviceId/content', async (req, res) => {
    try {
        const { deviceId } = req.params;

        // Basic UUID validation to prevent crash
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(deviceId)) {
            return res.status(400).json({ error: 'Invalid device ID format' });
        }

        // Get current day and time
        const now = new Date();
        const currentDay = now.getDay(); // 0 = Sunday
        const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
        const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

        console.log('[Player] Fetching content for device:', deviceId);
        console.log('[Player] Current time:', currentDate, currentTime, 'Day:', currentDay);

        // Check schedule_devices directly for debugging
        const deviceSchedules = await pool.query(
            'SELECT schedule_id FROM schedule_devices WHERE device_id = $1',
            [deviceId]
        );
        console.log('[Player] Found', deviceSchedules.rows.length, 'schedule assignments for device');

        // Find active schedule for this device
        // More lenient query: if time/date fields are NULL, they don't restrict
        // Handle schedules that span midnight (end_time < start_time means it goes past midnight)
        const scheduleResult = await pool.query(
            `SELECT s.*, p.name as playlist_name, p.transition_effect, p.transition_duration_ms
             FROM schedules s
             JOIN schedule_devices sd ON s.id = sd.schedule_id
             JOIN playlists p ON s.playlist_id = p.id
             WHERE sd.device_id = $1
             AND s.is_active = true
             AND (s.start_date IS NULL OR s.start_date <= $2::date)
             AND (s.end_date IS NULL OR s.end_date >= $2::date)
             AND (
                 s.start_time IS NULL AND s.end_time IS NULL
                 OR (s.start_time IS NULL AND s.end_time::time >= $3::time)
                 OR (s.end_time IS NULL AND s.start_time::time <= $3::time)
                 OR (
                     s.start_time::time <= s.end_time::time 
                     AND s.start_time::time <= $3::time 
                     AND s.end_time::time >= $3::time
                 )
                 OR (
                     s.start_time::time > s.end_time::time 
                     AND (s.start_time::time <= $3::time OR s.end_time::time >= $3::time)
                 )
             )
             AND (s.days_of_week IS NULL OR array_length(s.days_of_week, 1) IS NULL OR $4 = ANY(s.days_of_week))
             ORDER BY COALESCE(s.priority, 0) DESC
             LIMIT 1`,
            [deviceId, currentDate, currentTime, currentDay]
        );

        console.log('[Player] Found', scheduleResult.rows.length, 'matching schedules');

        if (scheduleResult.rows.length === 0) {
            return res.json({ playlist: null, items: [] });
        }

        const schedule = scheduleResult.rows[0];

        // Get playlist items with media and template details
        const itemsResult = await pool.query(
            `SELECT 
                pi.*,
                ma.original_name,
                ma.file_type,
                ma.storage_path as url,
                ma.thumbnail_path as thumbnail_url,
                ma.width,
                ma.height,
                t.name as template_name,
                t.width as template_width,
                t.height as template_height,
                t.zones as template_zones,
                t.background_color,
                t.background_image_id
             FROM playlist_items pi
             LEFT JOIN media_assets ma ON pi.media_asset_id = ma.id AND pi.content_type = 'media'
             LEFT JOIN templates t ON pi.template_id = t.id AND pi.content_type = 'template'
             WHERE pi.playlist_id = $1
             ORDER BY pi.sequence_order ASC`,
            [schedule.playlist_id]
        );

        res.json({
            playlist: {
                id: schedule.playlist_id,
                name: schedule.playlist_name,
                transition_effect: schedule.transition_effect,
                transition_duration_ms: schedule.transition_duration_ms
            },
            items: itemsResult.rows.map(item => ({
                id: item.id,
                content_type: item.content_type,
                content_id: item.media_asset_id || item.template_id,
                // Media fields
                name: item.original_name,
                file_type: item.file_type,
                url: item.url ? `/uploads/${item.url}` : null,
                thumbnail_url: item.thumbnail_url ? `/uploads/thumbnails/${path.basename(item.thumbnail_url)}` : null,
                width: item.width,
                height: item.height,
                // Template fields (when content_type = 'template')
                template: item.content_type === 'template' ? {
                    id: item.template_id,
                    name: item.template_name,
                    width: item.template_width,
                    height: item.template_height,
                    zones: item.template_zones,
                    background_color: item.background_color,
                    background_image_id: item.background_image_id
                } : null,
                duration_seconds: item.duration_seconds,
                sequence_order: item.sequence_order
            }))
        });
    } catch (error) {
        console.error('Get player content error:', error);
        res.status(500).json({ error: 'Failed to fetch player content' });
    }
});

// Share playlist with other properties
app.post('/playlists/:id/share', authenticateToken, async (req, res) => {
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

        const playlistCheck = await pool.query(
            'SELECT id, tenant_id FROM playlists WHERE id = $1',
            [id]
        );

        if (playlistCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        if (playlistCheck.rows[0].tenant_id !== req.user.tenantId) {
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
            `UPDATE playlists 
             SET is_shared = true, shared_with_properties = $1
             WHERE id = $2`,
            [propertyIds, id]
        );

        res.json({ message: 'Playlist shared successfully', propertyIds });
    } catch (error) {
        console.error('Share playlist error:', error);
        res.status(500).json({ error: 'Failed to share playlist' });
    }
});

// Unshare playlist from all properties
app.delete('/playlists/:id/share', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.user;

        if (role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super admins can unshare content' });
        }

        const playlistCheck = await pool.query(
            'SELECT id, tenant_id FROM playlists WHERE id = $1',
            [id]
        );

        if (playlistCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        if (playlistCheck.rows[0].tenant_id !== req.user.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await pool.query(
            `UPDATE playlists 
             SET is_shared = false, shared_with_properties = ARRAY[]::UUID[]
             WHERE id = $1`,
            [id]
        );

        res.json({ message: 'Playlist unshared successfully' });
    } catch (error) {
        console.error('Unshare playlist error:', error);
        res.status(500).json({ error: 'Failed to unshare playlist' });
    }
});

// Unshare playlist from specific property
app.delete('/playlists/:id/share/:propertyId', authenticateToken, async (req, res) => {
    try {
        const { id, propertyId } = req.params;
        const { role } = req.user;

        if (role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super admins can unshare content' });
        }

        const playlistCheck = await pool.query(
            'SELECT id, tenant_id, shared_with_properties FROM playlists WHERE id = $1',
            [id]
        );

        if (playlistCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        if (playlistCheck.rows[0].tenant_id !== req.user.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const currentShared = playlistCheck.rows[0].shared_with_properties || [];
        const updatedShared = currentShared.filter(pId => pId !== propertyId);

        await pool.query(
            `UPDATE playlists 
             SET shared_with_properties = $1, is_shared = $2
             WHERE id = $3`,
            [updatedShared, updatedShared.length > 0, id]
        );

        res.json({ message: 'Property removed from sharing', propertyId });
    } catch (error) {
        console.error('Unshare playlist from property error:', error);
        res.status(500).json({ error: 'Failed to unshare playlist from property' });
    }
});

// Health check endpoint - must be available immediately
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'scheduling-service',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || process.env.SCHEDULING_SERVICE_PORT || 3004;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Scheduling Service running on port ${PORT}`);
    console.log(`✅ Health check available at http://0.0.0.0:${PORT}/health`);
});

module.exports = app;
