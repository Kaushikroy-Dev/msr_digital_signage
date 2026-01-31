const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
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

// CORS middleware - allow requests from frontend
// IMPORTANT: Only set CORS once - the cors() middleware handles everything
app.use(cors({
    origin: 'http://localhost:5173', // Single origin to avoid duplicate headers
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
const pool = new Pool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 5432,
    database: process.env.DATABASE_NAME || 'digital_signage',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
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

        const { tenantId, userId, tags } = req.body;

        // RBAC: Check if user is allowed to upload
        if (req.user.role === 'viewer') {
            return res.status(403).json({ error: 'Viewers cannot upload content' });
        }

        const targetTenantId = tenantId || req.user.tenantId;
        const targetUserId = userId || req.user.userId;

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

        // Process images
        if (fileType === 'image') {
            try {
                const metadata = await sharp(fileBuffer).metadata();
                width = metadata.width;
                height = metadata.height;

                // Generate thumbnail
                const thumbnailBuffer = await sharp(fileBuffer)
                    .resize(400, 300, { fit: 'inside' })
                    .toBuffer();

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

        // Save to database
        const result = await pool.query(
            `INSERT INTO media_assets 
       (tenant_id, uploaded_by, file_name, original_name, file_type, mime_type, 
        file_size_bytes, storage_path, thumbnail_path, width, height, tags, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
            [
                targetTenantId, targetUserId, fileName, req.file.originalname, fileType,
                req.file.mimetype, req.file.size, storagePath, thumbnailPath,
                width, height, tags ? (Array.isArray(tags) ? tags : tags.split(',')) : null, 'active'
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
                await pool.query('UPDATE media_assets SET status = $1 WHERE id = $2', ['failed', assetId]);
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
    try {
        const { tenantId, fileType, limit = 50, offset = 0 } = req.query;
        const targetTenantId = tenantId || req.user.tenantId;

        let query = `
      SELECT id, file_name, original_name, file_type, mime_type, file_size_bytes,
             storage_path, thumbnail_path, width, height, tags, status, created_at
      FROM media_assets
      WHERE tenant_id = $1 AND status = 'active'
    `;
        const params = [targetTenantId];

        if (fileType) {
            query += ` AND file_type = $${params.length + 1}`;
            params.push(fileType);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

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
                createdAt: asset.created_at
            };
        });

        res.json({ assets, total: assets.length });
    } catch (error) {
        console.error('Get assets error:', error);
        res.status(500).json({ error: 'Failed to fetch assets' });
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
                `SELECT uploaded_by FROM media_assets WHERE id = $1`,
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
            `UPDATE media_assets SET status = 'archived' 
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

// Serve uploaded files (for local storage)
if (!USE_S3) {
    app.use('/uploads', express.static(UPLOAD_DIR));
    // CORS is already handled by the middleware above - don't set it again
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'content-service' });
});

const PORT = process.env.CONTENT_SERVICE_PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Content Service running on port ${PORT}`);
});

module.exports = app;
