# 🎥 Video Playback Issue - Root Cause Analysis

## Executive Summary

**Issue:** Video content is not displaying on the player after assigning a device with a playlist.  
**Status:** ❌ **CRITICAL - Media files missing on production server**  
**Root Cause:** The video file referenced in the playlist does not exist at the expected path on the production server.

---

## 🔍 Investigation Results

### Player URL Tested
```
https://frontend-production-73c0.up.railway.app/player/aabc2085-98ef-4327-aa00-fe242c62b281
```

### What We Found

#### ✅ **Working Components:**
1. **WebSocket Connection** - Successfully connected and registered device
2. **Playlist API** - Returns playlist data with 1 item for tenant `8062450b-a6b0-457d-81a7-94d3f0371eb3`
3. **Player Interface** - Loads correctly with fallback clock display
4. **Video Element** - Created in DOM and attempting to load media

#### ❌ **Failing Component:**
**Media File Delivery** - The video file does not exist on the server

### Error Details

**Video URL Attempted:**
```
https://api-gateway-production-d887.up.railway.app/uploads/8062450b-a6b0-457d-81a7-94d3f0371eb3/media/3abf2983-73f7-48c4-b25b-a471198cf7ad.mp4
```

**HTTP Response:** `404 Not Found`  
**Browser Error:** `MEDIA_ERR_SRC_NOT_SUPPORTED` (Error Code 4)  
**Reason:** Server returns HTML error page instead of video file

---

## 🏗️ Architecture Analysis

### How Media Files Should Work

#### 1. **Upload Flow** (Content Service)
```javascript
// File: services/content-service/src/index.js

// Files are stored in tenant-specific directories:
const storagePath = `${tenantId}/media/${fileName}`;
// Example: 8062450b-a6b0-457d-81a7-94d3f0371eb3/media/3abf2983-73f7-48c4-b25b-a471198cf7ad.mp4

// Saved to local filesystem:
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/storage';
// Full path: /app/storage/8062450b-a6b0-457d-81a7-94d3f0371eb3/media/3abf2983-73f7-48c4-b25b-a471198cf7ad.mp4
```

#### 2. **Static File Serving** (Content Service)
```javascript
// File: services/content-service/src/index.js (Line 181)

app.use('/uploads', express.static(UPLOAD_DIR, {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        if (path.match(/\.(mp4|webm|mov|avi|m4v)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('Accept-Ranges', 'bytes'); // Enable video streaming
        }
    }
}));
```

#### 3. **Proxy Routing** (API Gateway)
```javascript
// File: services/api-gateway/src/index.js (Line 413)

app.use('/uploads', createProxyMiddleware({
    target: services.content, // Content Service URL
    pathRewrite: { '^/uploads': '/uploads' }
}));
```

#### 4. **Player Consumption** (Frontend)
```javascript
// File: frontend/src/components/MediaPlayer.jsx (Line 116)

const apiUrl = API_BASE_URL;
const mediaUrl = `${apiUrl}${media.url}`;
// Constructs: https://api-gateway-production-d887.up.railway.app/uploads/8062450b-a6b0-457d-81a7-94d3f0371eb3/media/3abf2983-73f7-48c4-b25b-a471198cf7ad.mp4
```

---

## 🐛 Root Cause

### The Problem: Missing Media Files on Production

The video file **does not exist** on the production content service at the expected path:
```
/app/storage/8062450b-a6b0-457d-81a7-94d3f0371eb3/media/3abf2983-73f7-48c4-b25b-a471198cf7ad.mp4
```

### Why This Happens

#### Scenario 1: **Files Uploaded Locally, Not in Production**
- Media was uploaded to **local development environment**
- Database records were migrated to production
- **But the actual files were not transferred**

#### Scenario 2: **Railway Volume/Storage Not Configured**
- Railway ephemeral filesystem loses files on redeploy
- No persistent volume configured for `/app/storage`
- Files uploaded before redeploy are lost

#### Scenario 3: **S3 Configuration Mismatch**
- Code expects S3 storage (`USE_S3 = true`)
- But S3 credentials not configured properly
- Files saved to local storage instead
- Local storage wiped on container restart

---

## 🔧 Solutions

### Option 1: **Re-upload Media Files** (Quick Fix)
**Best for:** Testing and immediate resolution

1. Navigate to Media Library in production admin portal
2. Delete the broken media reference
3. Re-upload the video file
4. Re-assign to playlist
5. Verify playback

**Pros:**
- Immediate fix
- No code changes needed

**Cons:**
- Manual process
- Doesn't prevent future occurrences

---

### Option 2: **Configure Persistent Storage on Railway** (Recommended)
**Best for:** Production deployment

Railway containers have **ephemeral filesystems** - files are lost on redeploy. You need persistent storage.

#### Implementation Steps:

1. **Add Railway Volume** (via Railway Dashboard)
   ```
   Service: content-service
   Mount Path: /app/storage
   Size: 10GB (or as needed)
   ```

2. **Update Environment Variables**
   ```bash
   UPLOAD_DIR=/app/storage
   ```

3. **Verify Volume Mount**
   - Redeploy content-service
   - Check logs for: `Using local file storage at: /app/storage`
   - Upload a test file
   - Redeploy again
   - Verify file persists

**Pros:**
- Files persist across deployments
- No code changes needed
- Scalable

**Cons:**
- Costs money (Railway volume pricing)
- Single point of failure (if volume fails)

---

### Option 3: **Migrate to S3 Storage** (Best for Scale)
**Best for:** Production at scale

#### Implementation Steps:

1. **Create S3 Bucket**
   ```bash
   Bucket Name: digital-signage-media-prod
   Region: us-east-1 (or your preferred region)
   Public Access: Block all (use signed URLs or CloudFront)
   ```

2. **Create IAM User with S3 Access**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::digital-signage-media-prod",
           "arn:aws:s3:::digital-signage-media-prod/*"
         ]
       }
     ]
   }
   ```

3. **Configure Environment Variables** (Railway)
   ```bash
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=digital-signage-media-prod
   S3_CDN_URL=https://digital-signage-media-prod.s3.amazonaws.com
   ```

4. **Migrate Existing Files** (if any)
   ```bash
   # From local development
   aws s3 sync ./uploads s3://digital-signage-media-prod/ --recursive
   ```

5. **Update Database URLs** (if needed)
   ```sql
   -- If storage_path is stored as full URL, update to relative path
   UPDATE media_assets 
   SET storage_path = REPLACE(storage_path, '/uploads/', '')
   WHERE storage_path LIKE '/uploads/%';
   ```

**Pros:**
- Highly scalable
- Durable (99.999999999% durability)
- Can use CloudFront CDN for faster delivery
- No storage limits

**Cons:**
- Additional cost (S3 + data transfer)
- More complex setup
- Requires AWS account

---

## 🧪 Verification Steps

### After Implementing Fix:

1. **Upload Test Video**
   ```bash
   # Via Admin Portal
   1. Login to https://frontend-production-73c0.up.railway.app
   2. Navigate to Media Library
   3. Upload a small test video (e.g., 5MB MP4)
   4. Note the media ID
   ```

2. **Verify File Exists**
   ```bash
   # For Railway Volume:
   curl -I https://api-gateway-production-d887.up.railway.app/uploads/{tenantId}/media/{fileName}.mp4
   # Should return: 200 OK
   
   # For S3:
   aws s3 ls s3://digital-signage-media-prod/{tenantId}/media/
   ```

3. **Create Test Playlist**
   ```bash
   1. Create new playlist
   2. Add the test video
   3. Assign to device
   ```

4. **Test Playback**
   ```bash
   # Open player URL
   https://frontend-production-73c0.up.railway.app/player/{deviceId}
   
   # Expected: Video plays automatically
   # Check browser console for errors
   ```

5. **Verify After Redeploy**
   ```bash
   # Redeploy content-service
   # Verify video still plays (tests persistence)
   ```

---

## 📊 Current State vs Expected State

| Component | Current State | Expected State |
|-----------|---------------|----------------|
| **Database Record** | ✅ Exists | ✅ Exists |
| **Playlist Assignment** | ✅ Exists | ✅ Exists |
| **API Response** | ✅ Returns URL | ✅ Returns URL |
| **Media File** | ❌ **404 Not Found** | ✅ File accessible |
| **Player Display** | ❌ Clock fallback | ✅ Video playback |

---

## 🚨 Immediate Action Required

### Priority 1: **Identify Storage Strategy**
**Decision needed:** Railway Volume vs S3?

**Recommendation:** 
- **Short-term:** Railway Volume (easier setup)
- **Long-term:** S3 (better scalability)

### Priority 2: **Re-upload Media**
Until persistent storage is configured, you'll need to:
1. Re-upload all media files in production
2. Avoid redeploying content-service (will lose files)

### Priority 3: **Document Upload Process**
Create a workflow for content team:
1. Upload media via admin portal (not direct file copy)
2. Verify file accessibility before assigning to playlist
3. Test playback on at least one device

---

## 📝 Code Locations

| File | Purpose | Line |
|------|---------|------|
| `services/content-service/src/index.js` | Upload handler | 259 |
| `services/content-service/src/index.js` | Static file serving | 181 |
| `services/api-gateway/src/index.js` | Proxy to content service | 413 |
| `frontend/src/components/MediaPlayer.jsx` | Video player | 116 |
| `frontend/src/pages/DevicePlayer.jsx` | Player page | 697 |

---

## 🔗 Related Issues

- **Upload Storage Info:** `UPLOAD_STORAGE_INFO.md`
- **Upload Fix:** `UPLOAD_FIX_FINAL.md`
- **Device Fix:** `DEVICE_FIX_SUMMARY.md`

---

## ✅ Next Steps

1. **Choose storage solution** (Railway Volume or S3)
2. **Configure persistent storage**
3. **Re-upload media files**
4. **Test playback**
5. **Document process** for content team
6. **Monitor** for 404 errors in production logs

---

**Status:** 🔴 **CRITICAL - Requires immediate attention**  
**Impact:** All video playback is broken in production  
**ETA to Fix:** 1-2 hours (Railway Volume) or 3-4 hours (S3 migration)
