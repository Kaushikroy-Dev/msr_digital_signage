const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const Jimp = require('jimp');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
require('dotenv').config();

const app = express();
const jwt = require('jsonwebtoken');

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

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : ['http://localhost:5173'];
app.use(cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type']
}));


// Body parsing - but skip for multipart/form-data (multer handles it)
app.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
        return next(); // Skip JSON parsing for multipart
    }
    express.json()(req, res, next);
});

// Database connection
// Support both Railway (PG*) and custom (DATABASE_*) environment variables
const dbHost = process.env.DATABASE_HOST || process.env.PGHOST || (process.env.DOCKER_ENV ? 'postgres' : 'localhost');
// Prioritize DATABASE_NAME over PGDATABASE (Railway sets PGDATABASE to 'railway' by default)
const dbName = process.env.DATABASE_NAME || 'digital_signage';
const pool = new Pool({
    host: dbHost,
    port: process.env.DATABASE_PORT || process.env.PGPORT || 5432,
    database: dbName,
    user: process.env.DATABASE_USER || process.env.PGUSER || 'postgres',
    password: process.env.DATABASE_PASSWORD || process.env.PGPASSWORD || 'postgres',
    // Force schema refresh and set search path
    options: '-c search_path=public -c timezone=UTC'
});

console.log('[DB] Connecting to:', {
    host: dbHost,
    port: process.env.DATABASE_PORT || process.env.PGPORT || 5432,
    database: dbName,
    user: process.env.DATABASE_USER || process.env.PGUSER || 'postgres'
});

// Test connection and verify schema on startup
pool.query('SELECT current_database(), current_schema()')
    .then(result => {
        console.log('[DB] Connected to:', result.rows[0]);
        // Verify columns exist - use public schema explicitly
        return pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'media_assets' 
            AND column_name IN ('property_id', 'zone_id', 'is_shared', 'shared_with_properties')
            ORDER BY column_name
        `);
    })
    .then(result => {
        const columns = result.rows.map(r => r.column_name);
        console.log('[DB] Verified columns:', columns);
        if (columns.length !== 4) {
            console.error('[DB] WARNING: Missing columns! Expected 4, found:', columns.length);
            console.error('[DB] Found columns:', columns);
            // Try a direct query to see if columns are accessible
            return pool.query('SELECT property_id, zone_id, is_shared, shared_with_properties FROM public.media_assets LIMIT 1')
                .then(() => {
                    console.log('[DB] Direct query successful - columns are accessible!');
                })
                .catch(err => {
                    console.error('[DB] Direct query failed:', err.message);
                });
        } else {
            console.log('[DB] All required columns verified successfully!');
        }
    })
    .catch(err => {
        console.error('[DB] Connection error:', err);
    });

// Check if using S3 or local storage
// Only use S3 if credentials are provided AND are not placeholder values
const USE_S3 = process.env.AWS_ACCESS_KEY_ID && 
                process.env.AWS_SECRET_ACCESS_KEY &&
                process.env.AWS_ACCESS_KEY_ID !== 'your_access_key' &&
                process.env.AWS_SECRET_ACCESS_KEY !== 'your_secret_key' &&
                process.env.AWS_ACCESS_KEY_ID.trim() !== '' &&
                process.env.AWS_SECRET_ACCESS_KEY.trim() !== '';
// Use /app/storage when running in Docker, otherwise use uploads in current directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || (fs.existsSync('/app/storage') ? '/app/storage' : path.join(process.cwd(), 'uploads'));

// Create uploads directory if using local storage
if (!USE_S3) {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    if (!fs.existsSync(path.join(UPLOAD_DIR, 'thumbnails'))) {
        fs.mkdirSync(path.join(UPLOAD_DIR, 'thumbnails'), { recursive: true });
    }
    console.log('Using local file storage at:', UPLOAD_DIR);
}

// S3 Client configuration (only if credentials provided)
let s3Client;
if (USE_S3) {
    s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });
    console.log('Using S3 storage');
}

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'digital-signage-media';
const CDN_URL = process.env.S3_CDN_URL || `https://${BUCKET_NAME}.s3.amazonaws.com`;

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|mov|avi|pdf|doc|docx|ppt|pptx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        const error = new Error(`Invalid file type. Allowed: images (jpeg, jpg, png, gif, webp), videos (mp4, webm, mov, avi), documents (pdf, doc, docx, ppt, pptx)`);
        req.fileValidationError = error.message;
        cb(error);
    }
});

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
    if (err) {
        console.error('[Upload] Multer error:', err.message);
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 500MB.' });
        }
        if (err.message === 'Invalid file type') {
            return res.status(400).json({ error: err.message });
        }
        return res.status(400).json({ error: 'File upload error: ' + err.message });
    }
    next();
};

// Upload media asset - RESTRUCTURED FOR RELIABILITY
app.post('/upload', authenticateToken, upload.single('file'), handleMulterError, async (req, res) => {
    let assetId = null;
    
    try {
        console.log('[Upload] Request received:', {
            hasFile: !!req.file,
            hasBody: !!req.body,
            bodyKeys: req.body ? Object.keys(req.body) : [],
            bodyContent: req.body,
            contentType: req.headers['content-type'],
            user: req.user ? { id: req.user.userId, role: req.user.role } : 'none'
        });

        // Check for multer validation errors
        if (req.fileValidationError) {
            console.error('[Upload] Validation error:', req.fileValidationError);
            return res.status(400).json({ error: req.fileValidationError });
        }
        
        if (!req.file) {
            console.error('[Upload] No file received');
            return res.status(400).json({ 
                error: 'No file uploaded', 
                details: 'Please ensure the file field is named "file" and the file is valid.'
            });
        }

        const { tenantId, userId, tags, propertyId, zoneId } = req.body;
        
        console.log('[Upload] Extracted form fields:', {
            tenantId,
            userId,
            tags,
            propertyId,
            zoneId,
            role: req.user.role
        });

        // RBAC: Check if user is allowed to upload
        if (req.user.role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot upload content' });
        }

        const targetTenantId = tenantId || req.user.tenantId;
        const targetUserId = userId || req.user.userId;
        const { role, userId: authUserId } = req.user;

        // Property/Zone assignment based on role
        let finalPropertyId = propertyId;
        let finalZoneId = zoneId || null;

        console.log('[Upload] Role-based assignment - role:', role, 'propertyId:', propertyId, 'zoneId:', zoneId);

        if (role === 'super_admin') {
            // Super admin must provide propertyId
            if (!propertyId) {
                console.error('[Upload] Super admin missing propertyId');
                return res.status(400).json({ error: 'Property ID is required' });
            }
        } else if (role === 'property_admin') {
            // Auto-assign from user_property_access, require zoneId
            const propertyAccess = await pool.query(
                'SELECT property_id FROM user_property_access WHERE user_id = $1 LIMIT 1',
                [authUserId]
            );
            if (propertyAccess.rows.length === 0) {
                return res.status(403).json({ error: 'No property access assigned' });
            }
            finalPropertyId = propertyAccess.rows[0].property_id;
            if (!zoneId) {
                return res.status(400).json({ error: 'Zone ID is required for property admins' });
            }
            // Verify zone belongs to assigned property
            const zoneCheck = await pool.query(
                'SELECT id FROM zones WHERE id = $1 AND property_id = $2',
                [zoneId, finalPropertyId]
            );
            if (zoneCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Zone does not belong to your assigned property' });
            }
        } else if (role === 'zone_admin') {
            // Auto-assign from user_zone_access
            const zoneAccess = await pool.query(
                `SELECT z.id as zone_id, z.property_id 
                 FROM user_zone_access uza
                 JOIN zones z ON uza.zone_id = z.id
                 WHERE uza.user_id = $1 LIMIT 1`,
                [authUserId]
            );
            if (zoneAccess.rows.length === 0) {
                return res.status(403).json({ error: 'No zone access assigned' });
            }
            finalPropertyId = zoneAccess.rows[0].property_id;
            finalZoneId = zoneAccess.rows[0].zone_id;
        } else {
            // content_editor - same as property_admin
            const propertyAccess = await pool.query(
                'SELECT property_id FROM user_property_access WHERE user_id = $1 LIMIT 1',
                [authUserId]
            );
            if (propertyAccess.rows.length > 0) {
                finalPropertyId = propertyAccess.rows[0].property_id;
                if (!zoneId) {
                    return res.status(400).json({ error: 'Zone ID is required' });
                }
            } else {
                // Check zone access
                const zoneAccess = await pool.query(
                    `SELECT z.id as zone_id, z.property_id 
                     FROM user_zone_access uza
                     JOIN zones z ON uza.zone_id = z.id
                     WHERE uza.user_id = $1 LIMIT 1`,
                    [authUserId]
                );
                if (zoneAccess.rows.length > 0) {
                    finalPropertyId = zoneAccess.rows[0].property_id;
                    finalZoneId = zoneAccess.rows[0].zone_id;
                } else {
                    return res.status(403).json({ error: 'No property or zone access assigned' });
                }
            }
        }

        if (!targetTenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        console.log('[Upload] Processing file:', {
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            tenantId: targetTenantId,
            userId: targetUserId
        });

        const fileExt = path.extname(req.file.originalname);
        const fileName = `${uuidv4()}${fileExt}`;
        const storagePath = `${targetTenantId}/media/${fileName}`;

        // Determine file type
        let fileType = 'document';
        if (req.file.mimetype.startsWith('image/')) fileType = 'image';
        else if (req.file.mimetype.startsWith('video/')) fileType = 'video';

        let fileBuffer = req.file.buffer;
        let width = null;
        let height = null;
        let thumbnailPath = null;
        let thumbnailName = null;

        // Process images and videos
        if (fileType === 'image') {
            try {
                // Use Jimp for image processing (pure JavaScript, no native dependencies)
                const image = await Jimp.read(fileBuffer);
                width = image.getWidth();
                height = image.getHeight();

                // Generate thumbnail - resize maintaining aspect ratio
                const thumbnail = image.clone();
                thumbnail.cover(400, 300); // Resize to cover 400x300, maintaining aspect ratio

                // Convert to buffer
                const thumbnailBuffer = await thumbnail.getBufferAsync(Jimp.MIME_JPEG);

                thumbnailName = `${uuidv4()}_thumb.jpg`;
                thumbnailPath = `${targetTenantId}/thumbnails/${thumbnailName}`;

                if (USE_S3) {
                    await s3Client.send(new PutObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: thumbnailPath,
                        Body: thumbnailBuffer,
                        ContentType: 'image/jpeg'
                    }));
                    console.log('[Upload] Thumbnail uploaded to S3');
                } else {
                    // Save thumbnail locally with tenant directory
                    const tenantThumbnailDir = path.join(UPLOAD_DIR, targetTenantId, 'thumbnails');
                    if (!fs.existsSync(tenantThumbnailDir)) {
                        fs.mkdirSync(tenantThumbnailDir, { recursive: true });
                    }
                    const localThumbnailPath = path.join(tenantThumbnailDir, thumbnailName);
                    fs.writeFileSync(localThumbnailPath, thumbnailBuffer);
                    console.log('[Upload] Thumbnail saved locally:', localThumbnailPath);
                }
            } catch (imageError) {
                console.error('[Upload] Image processing error:', imageError);
                // Continue without thumbnail if image processing fails
            }
        } else if (fileType === 'video') {
            // For videos, we'll generate a thumbnail using ffmpeg if available
            try {
                // Save video to temp file first
                const tempVideoPath = path.join(UPLOAD_DIR, targetTenantId, `temp_${uuidv4()}${fileExt}`);
                const tempVideoDir = path.dirname(tempVideoPath);
                if (!fs.existsSync(tempVideoDir)) {
                    fs.mkdirSync(tempVideoDir, { recursive: true });
                }
                fs.writeFileSync(tempVideoPath, fileBuffer);
                
                // Generate thumbnail at 1 second mark
                thumbnailName = `${uuidv4()}_thumb.jpg`;
                const tempThumbnailPath = path.join(UPLOAD_DIR, targetTenantId, 'thumbnails', thumbnailName);
                const tenantThumbnailDir = path.dirname(tempThumbnailPath);
                if (!fs.existsSync(tenantThumbnailDir)) {
                    fs.mkdirSync(tenantThumbnailDir, { recursive: true });
                }
                
                try {
                    // Try ffmpeg to extract frame at 1 second mark
                    console.log('[Upload] Generating video thumbnail with ffmpeg...');
                    console.log('[Upload] Temp video path:', tempVideoPath);
                    console.log('[Upload] Temp thumbnail path:', tempThumbnailPath);
                    
                    // Use -y to overwrite, redirect stderr to stdout, and ignore errors in stderr
                    const ffmpegCommand = `ffmpeg -i "${tempVideoPath}" -ss 00:00:01 -vframes 1 -vf "scale=400:300:force_original_aspect_ratio=decrease" -y "${tempThumbnailPath}" 2>&1`;
                    
                    try {
                        const { stdout, stderr } = await execAsync(ffmpegCommand);
                        console.log('[Upload] FFmpeg output:', stdout.substring(0, 200));
                    } catch (execError) {
                        // FFmpeg often writes to stderr even on success, so check if file was created
                        if (!fs.existsSync(tempThumbnailPath)) {
                            throw execError;
                        }
                        // If file exists, it's probably fine even if execAsync threw an error
                        console.log('[Upload] FFmpeg completed (may have warnings in stderr)');
                    }
                    
                    // Wait a bit to ensure file is written
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Check if thumbnail file was created
                    if (!fs.existsSync(tempThumbnailPath)) {
                        throw new Error('Thumbnail file was not created by ffmpeg');
                    }
                    
                    // Read the generated thumbnail
                    const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);
                    if (thumbnailBuffer.length === 0) {
                        throw new Error('Generated thumbnail is empty');
                    }
                    
                    console.log('[Upload] Thumbnail generated, size:', thumbnailBuffer.length, 'bytes');
                    thumbnailPath = `${targetTenantId}/thumbnails/${thumbnailName}`;
                    
                    if (USE_S3) {
                        await s3Client.send(new PutObjectCommand({
                            Bucket: BUCKET_NAME,
                            Key: thumbnailPath,
                            Body: thumbnailBuffer,
                            ContentType: 'image/jpeg'
                        }));
                        console.log('[Upload] Video thumbnail uploaded to S3');
                    } else {
                        console.log('[Upload] Video thumbnail saved locally:', tempThumbnailPath);
                    }
                    
                    console.log('[Upload] Video thumbnail generated successfully');
                    
                    // Clean up temp video file
                    if (fs.existsSync(tempVideoPath)) {
                        fs.unlinkSync(tempVideoPath);
                    }
                } catch (ffmpegError) {
                    console.error('[Upload] FFmpeg error details:', {
                        message: ffmpegError.message,
                        stdout: ffmpegError.stdout,
                        stderr: ffmpegError.stderr,
                        code: ffmpegError.code
                    });
                    // Clean up temp files
                    if (fs.existsSync(tempVideoPath)) {
                        try { fs.unlinkSync(tempVideoPath); } catch (e) {}
                    }
                    if (fs.existsSync(tempThumbnailPath)) {
                        try { fs.unlinkSync(tempThumbnailPath); } catch (e) {}
                    }
                }
            } catch (videoError) {
                console.error('[Upload] Video thumbnail generation error:', videoError);
                // Continue without thumbnail if video processing fails
            }
        }

        // Save original file
        if (USE_S3) {
            await s3Client.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: storagePath,
                Body: fileBuffer,
                ContentType: req.file.mimetype
            }));
            console.log('[Upload] File uploaded to S3');
        } else {
            const tenantDir = path.join(UPLOAD_DIR, targetTenantId, 'media');
            if (!fs.existsSync(tenantDir)) {
                fs.mkdirSync(tenantDir, { recursive: true });
            }
            const localFilePath = path.join(tenantDir, fileName);
            fs.writeFileSync(localFilePath, fileBuffer);
            console.log('[Upload] File saved locally:', localFilePath);
        }

        // Save to database - explicitly use public schema
        const result = await pool.query(
            `INSERT INTO public.media_assets 
       (tenant_id, uploaded_by, property_id, zone_id, file_name, original_name, file_type, mime_type, 
        file_size_bytes, storage_path, thumbnail_path, width, height, tags, status, is_shared, shared_with_properties)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
            [
                targetTenantId, targetUserId, finalPropertyId, finalZoneId, fileName, req.file.originalname, fileType,
                req.file.mimetype, req.file.size, storagePath, thumbnailPath,
                width, height, tags ? (Array.isArray(tags) ? tags : tags.split(',')) : null, 'active',
                false, []
            ]
        );

        const asset = result.rows[0];
        assetId = asset.id;
        console.log('[Upload] Asset saved to database:', assetId);

        // Log audit (non-blocking)
        pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id)
       VALUES ($1, $2, $3, $4, $5)`,
            [targetTenantId, targetUserId, 'upload_media', 'media', asset.id]
        ).catch(err => console.error('[Upload] Audit log error:', err));

        // Generate URLs based on storage type
        const fileUrl = USE_S3
            ? `${CDN_URL}/${storagePath}`
            : `/uploads/${targetTenantId}/media/${fileName}`;
        const thumbnailUrl = thumbnailPath
            ? (USE_S3 
                ? `${CDN_URL}/${thumbnailPath}` 
                : `/uploads/${targetTenantId}/thumbnails/${thumbnailName}`)
            : null;

        console.log('[Upload] Success:', {
            assetId: asset.id,
            fileUrl,
            thumbnailUrl
        });

        res.status(201).json({
            id: asset.id,
            fileName: asset.file_name,
            originalName: asset.original_name,
            fileType: asset.file_type,
            fileSize: asset.file_size_bytes,
            url: fileUrl,
            thumbnailUrl: thumbnailUrl,
            width,
            height,
            createdAt: asset.created_at
        });
    } catch (error) {
        console.error('[Upload] Error:', {
            message: error.message,
            stack: error.stack,
            assetId
        });
        
        // If we created an asset but failed later, try to clean up
        if (assetId) {
            try {
                await pool.query('UPDATE public.media_assets SET status = $1 WHERE id = $2', ['failed', assetId]);
            } catch (cleanupError) {
                console.error('[Upload] Cleanup error:', cleanupError);
            }
        }
        
        res.status(500).json({ 
            error: 'Upload failed', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Get media assets
app.get('/assets', authenticateToken, async (req, res) => {
    let query = '';
    let params = [];
    
    try {
        const { tenantId, fileType, propertyId, zoneId, limit: limitParam = 50, offset: offsetParam = 0 } = req.query;
        // Convert limit and offset to numbers
        const limit = parseInt(limitParam, 10) || 50;
        const offset = parseInt(offsetParam, 10) || 0;
        const targetTenantId = tenantId || req.user.tenantId;
        const { role, userId } = req.user;

        // Build base query with property/zone filtering
        // Explicitly use public schema to avoid any search_path issues
        query = `
            SELECT id, file_name, original_name, file_type, mime_type, file_size_bytes,
                   storage_path, thumbnail_path, width, height, tags, status, created_at,
                   property_id, zone_id, is_shared, shared_with_properties
            FROM public.media_assets
            WHERE tenant_id = $1 AND status = 'active'
        `;
        params = [targetTenantId];
        let paramIndex = 2;

        // Apply property/zone filtering based on role
        if (role === 'super_admin') {
            // Super admin can filter by propertyId/zoneId if provided
            // If no filters provided, show all assets for the tenant
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
            // If no propertyId/zoneId provided, show all assets (no additional filter)
        } else if (role === 'property_admin') {
            // Filter by assigned properties, include shared content
            // Content is visible if: it belongs to user's assigned properties OR it's shared with user's properties
            query += ` AND (
                property_id IN (SELECT property_id FROM user_property_access WHERE user_id = $${paramIndex})
                OR (is_shared = true AND EXISTS (
                    SELECT 1 FROM user_property_access upa 
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
                zone_id IN (SELECT zone_id FROM user_zone_access WHERE user_id = $${paramIndex})
                OR (is_shared = true AND EXISTS (
                    SELECT 1 FROM zones z
                    JOIN user_zone_access uza ON z.id = uza.zone_id
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
                'SELECT property_id FROM user_property_access WHERE user_id = $1',
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
                    'SELECT zone_id FROM user_zone_access WHERE user_id = $1',
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

        if (fileType) {
            query += ` AND file_type = $${paramIndex}`;
            params.push(fileType);
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        console.log('[Get Assets] Executing query:', {
            paramCount: params.length,
            limit,
            offset,
            role,
            hasPropertyId: !!propertyId,
            hasZoneId: !!zoneId,
            queryPreview: query.substring(0, 200) + '...'
        });

        const result = await pool.query(query, params);
        
        console.log('[Get Assets] Query executed successfully, rows returned:', result.rows.length);

        const assets = result.rows.map(asset => {
            // Generate URLs based on storage type
            const fileUrl = USE_S3
                ? `${CDN_URL}/${asset.storage_path}`
                : `/uploads/${asset.storage_path}`;
            
            // Extract tenant ID and thumbnail name from thumbnail_path
            let thumbnailUrl = null;
            if (asset.thumbnail_path) {
                if (USE_S3) {
                    thumbnailUrl = `${CDN_URL}/${asset.thumbnail_path}`;
                } else {
                    // thumbnail_path format: tenantId/thumbnails/thumbnailName
                    const parts = asset.thumbnail_path.split('/');
                    if (parts.length >= 3) {
                        const tenantId = parts[0];
                        const thumbnailName = parts[2];
                        thumbnailUrl = `/uploads/${tenantId}/thumbnails/${thumbnailName}`;
                    } else {
                        // Fallback for old format
                        thumbnailUrl = `/uploads/thumbnails/${path.basename(asset.thumbnail_path)}`;
                    }
                }
            }

            return {
                id: asset.id,
                fileName: asset.file_name,
                originalName: asset.original_name,
                fileType: asset.file_type,
                mimeType: asset.mime_type,
                fileSize: asset.file_size_bytes,
                url: fileUrl,
                thumbnailUrl: thumbnailUrl,
                width: asset.width,
                height: asset.height,
                tags: asset.tags,
                propertyId: asset.property_id,
                zoneId: asset.zone_id,
                isShared: asset.is_shared,
                sharedWithProperties: asset.shared_with_properties || [],
                createdAt: asset.created_at
            };
        });

        res.json({ assets, total: assets.length });
    } catch (error) {
        console.error('Get assets error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            query: query,
            params: params,
            paramCount: params.length,
            queryLength: query.length
        });
        // Log the full query for debugging
        console.error('Full SQL query:', query);
        console.error('Query parameters:', params.map((p, i) => `$${i + 1} = ${typeof p === 'object' ? JSON.stringify(p) : p}`).join(', '));
        res.status(500).json({ 
            error: 'Failed to fetch assets',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            query: process.env.NODE_ENV === 'development' ? query.substring(0, 500) : undefined
        });
    }
});

// Delete media asset
app.delete('/assets/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId, userId } = req.query;
        const targetTenantId = tenantId || req.user.tenantId;
        const targetUserId = userId || req.user.userId;

        // RBAC: Check permissions
        if (req.user.role !== 'super_admin') {
            const assetCheck = await pool.query(
                `SELECT uploaded_by FROM public.media_assets WHERE id = $1`,
                [id]
            );

            if (assetCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Asset not found' });
            }

            // Only allow deleting own assets if not super_admin
            // Property admins and zone admins might need broader access, but for now strict ownership or super_admin
            if (assetCheck.rows[0].uploaded_by !== req.user.userId) {
                return res.status(403).json({ error: 'Permission denied to delete this asset' });
            }
        }

        // Soft delete
        await pool.query(
            `UPDATE public.media_assets SET status = 'archived' 
       WHERE id = $1 AND tenant_id = $2`,
            [id, targetTenantId]
        );

        // Log audit
        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id)
       VALUES ($1, $2, $3, $4, $5)`,
            [targetTenantId, targetUserId, 'delete_media', 'media', id]
        );

        res.json({ message: 'Asset deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete asset' });
    }
});

// Share media asset with other properties
app.post('/assets/:id/share', authenticateToken, async (req, res) => {
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

        // Verify asset exists and belongs to tenant
        const assetCheck = await pool.query(
            'SELECT id, tenant_id FROM public.media_assets WHERE id = $1',
            [id]
        );

        if (assetCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Media asset not found' });
        }

        if (assetCheck.rows[0].tenant_id !== req.user.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Verify all property IDs belong to the same tenant
        const propertyCheck = await pool.query(
            'SELECT id FROM properties WHERE id = ANY($1::UUID[]) AND tenant_id = $2',
            [propertyIds, req.user.tenantId]
        );

        if (propertyCheck.rows.length !== propertyIds.length) {
            return res.status(400).json({ error: 'One or more properties not found or belong to different tenant' });
        }

        // Update sharing settings
        await pool.query(
            `UPDATE public.media_assets 
             SET is_shared = true, shared_with_properties = $1
             WHERE id = $2`,
            [propertyIds, id]
        );

        res.json({ message: 'Media shared successfully', propertyIds });
    } catch (error) {
        console.error('Share media error:', error);
        res.status(500).json({ error: 'Failed to share media' });
    }
});

// Unshare media asset from all properties
app.delete('/assets/:id/share', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.user;

        if (role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super admins can unshare content' });
        }

        // Verify asset exists and belongs to tenant
        const assetCheck = await pool.query(
            'SELECT id, tenant_id FROM public.media_assets WHERE id = $1',
            [id]
        );

        if (assetCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Media asset not found' });
        }

        if (assetCheck.rows[0].tenant_id !== req.user.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Remove sharing
        await pool.query(
            `UPDATE public.media_assets 
             SET is_shared = false, shared_with_properties = ARRAY[]::UUID[]
             WHERE id = $1`,
            [id]
        );

        res.json({ message: 'Media unshared successfully' });
    } catch (error) {
        console.error('Unshare media error:', error);
        res.status(500).json({ error: 'Failed to unshare media' });
    }
});

// Unshare media asset from specific property
app.delete('/assets/:id/share/:propertyId', authenticateToken, async (req, res) => {
    try {
        const { id, propertyId } = req.params;
        const { role } = req.user;

        if (role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super admins can unshare content' });
        }

        // Get current sharing settings
        const assetCheck = await pool.query(
            'SELECT id, tenant_id, shared_with_properties FROM public.media_assets WHERE id = $1',
            [id]
        );

        if (assetCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Media asset not found' });
        }

        if (assetCheck.rows[0].tenant_id !== req.user.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const currentShared = assetCheck.rows[0].shared_with_properties || [];
        const updatedShared = currentShared.filter(pId => pId !== propertyId);

        // Update sharing settings
        await pool.query(
            `UPDATE public.media_assets 
             SET shared_with_properties = $1, is_shared = $2
             WHERE id = $3`,
            [updatedShared, updatedShared.length > 0, id]
        );

        res.json({ message: 'Property removed from sharing', propertyId });
    } catch (error) {
        console.error('Unshare media from property error:', error);
        res.status(500).json({ error: 'Failed to unshare media from property' });
    }
});

// Regenerate thumbnail for existing video
app.post('/assets/:id/regenerate-thumbnail', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.user;
        
        // Get video asset
        const assetResult = await pool.query(
            'SELECT * FROM public.media_assets WHERE id = $1 AND tenant_id = $2 AND file_type = $3',
            [id, tenantId, 'video']
        );
        
        if (assetResult.rows.length === 0) {
            return res.status(404).json({ error: 'Video asset not found' });
        }
        
        const asset = assetResult.rows[0];
        
        // Get video file path
        let videoFilePath;
        if (USE_S3) {
            return res.status(400).json({ error: 'S3 video thumbnail regeneration not yet supported' });
        } else {
            // Local storage - extract tenant and filename from storage_path
            const parts = asset.storage_path.split('/');
            if (parts.length >= 3) {
                const tenantIdFromPath = parts[0];
                const fileName = parts[2];
                videoFilePath = path.join(UPLOAD_DIR, tenantIdFromPath, 'media', fileName);
            } else {
                videoFilePath = path.join(UPLOAD_DIR, asset.storage_path);
            }
        }
        
        if (!fs.existsSync(videoFilePath)) {
            return res.status(404).json({ error: 'Video file not found at: ' + videoFilePath });
        }
        
        // Generate thumbnail
        const thumbnailName = `${uuidv4()}_thumb.jpg`;
        const tempThumbnailPath = path.join(UPLOAD_DIR, tenantId, 'thumbnails', thumbnailName);
        const tenantThumbnailDir = path.dirname(tempThumbnailPath);
        if (!fs.existsSync(tenantThumbnailDir)) {
            fs.mkdirSync(tenantThumbnailDir, { recursive: true });
        }
        
        try {
            const ffmpegCommand = `ffmpeg -i "${videoFilePath}" -ss 00:00:01 -vframes 1 -vf "scale=400:300:force_original_aspect_ratio=decrease" -y "${tempThumbnailPath}" 2>&1`;
            
            try {
                await execAsync(ffmpegCommand);
            } catch (execError) {
                // FFmpeg writes to stderr even on success, so check if file was created
                if (!fs.existsSync(tempThumbnailPath)) {
                    throw execError;
                }
            }
            
            // Wait a bit to ensure file is written
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (!fs.existsSync(tempThumbnailPath)) {
                throw new Error('Thumbnail file was not created');
            }
            
            const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);
            const thumbnailPath = `${tenantId}/thumbnails/${thumbnailName}`;
            
            // Update database
            await pool.query(
                'UPDATE public.media_assets SET thumbnail_path = $1 WHERE id = $2',
                [thumbnailPath, id]
            );
            
            console.log('[Regenerate] Video thumbnail generated for asset:', id);
            res.json({ 
                success: true, 
                thumbnailUrl: `/uploads/${thumbnailPath}`,
                message: 'Thumbnail regenerated successfully'
            });
        } catch (error) {
            console.error('[Regenerate] FFmpeg error:', error);
            res.status(500).json({ error: 'Failed to generate thumbnail: ' + error.message });
        }
    } catch (error) {
        console.error('[Regenerate] Error:', error);
        res.status(500).json({ error: 'Failed to regenerate thumbnail: ' + error.message });
    }
});

// Serve uploaded files (for local storage)
if (!USE_S3) {
    app.use('/uploads', express.static(UPLOAD_DIR));
    // CORS is already handled by the middleware above - don't set it again
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'content-service' });
});

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
    console.error('[FATAL] Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    // Don't exit - log and continue
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    // Don't exit - log and continue
});

const PORT = process.env.PORT || process.env.CONTENT_SERVICE_PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Content Service running on port ${PORT}`);
});

module.exports = app;
