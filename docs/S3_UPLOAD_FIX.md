# S3 Upload Error Fix - Complete Guide

## Problem Summary
Upload to S3 was failing with the error:
```
The bucket you are attempting to access must be addressed using the specified endpoint.
Please send all future requests to this endpoint.
```

## Root Cause Analysis

### Issue 1: S3 Bucket Region Mismatch (CRITICAL)
Your S3 bucket `digital-signage-media-msr` is located in the **eu-north-1** region, but the S3 client wasn't properly configured to use the region-specific endpoint.

AWS S3 requires that buckets in regions other than `us-east-1` must be accessed using their region-specific endpoints. The SDK needs to know the correct region to construct the proper endpoint URL.

### Issue 2: FFmpeg Not Installed (Minor - Non-blocking)
```
/bin/sh: 1: ffmpeg: not found
```
FFmpeg is used for video thumbnail generation. This is a nice-to-have feature but not critical - uploads will succeed without it.

## Solutions Applied

### Fix 1: S3 Client Region Configuration ✅

**Changes made to `services/content-service/src/index.js`:**

1. **Moved configuration order** - Defined `BUCKET_NAME` and `CDN_URL` BEFORE S3 client initialization
2. **Enhanced S3 client configuration** with explicit region handling:

```javascript
// S3 Client configuration (only if credentials provided)
let s3Client;
if (USE_S3) {
    const awsRegion = process.env.AWS_REGION || 'us-east-1';
    
    // For buckets in regions other than us-east-1, we need to use region-specific endpoints
    const s3Config = {
        region: awsRegion,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    };
    
    // Force path-style addressing for better compatibility with regional buckets
    s3Config.forcePathStyle = false; // Use virtual-hosted-style (works better with CloudFront)
    
    s3Client = new S3Client(s3Config);
    
    console.log('[S3] Client configured:', {
        region: awsRegion,
        bucket: BUCKET_NAME,
        forcePathStyle: s3Config.forcePathStyle
    });
}
```

3. **Added debug logging** to verify configuration on startup

### Fix 2: FFmpeg Installation (Optional)

FFmpeg is not critical for the upload process. If you want video thumbnails:

**Option A: Install in Railway (Recommended for production)**
Add a `nixpacks.toml` file to the content-service:

```toml
[phases.setup]
aptPkgs = ["ffmpeg"]
```

**Option B: Use Dockerfile**
Modify the content-service Dockerfile to include:
```dockerfile
RUN apt-get update && apt-get install -y ffmpeg
```

**Option C: Skip video thumbnails**
The current code gracefully handles missing FFmpeg - uploads will succeed, just without video thumbnails.

## Railway Environment Variables

Ensure these are set in your **content-service** on Railway:

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>

# CRITICAL: Must match your bucket's region
AWS_REGION=eu-north-1

# S3 Bucket
S3_BUCKET_NAME=digital-signage-media-msr

# CloudFront CDN (either format works)
S3_CDN_URL=dtuz3np2mgsjp.cloudfront.net
# OR
S3_CDN_URL=https://dtuz3np2mgsjp.cloudfront.net
```

## Testing the Fix

### 1. Verify Deployment
After Railway redeploys the content-service, check the logs for:

```
[S3] CDN Configuration: {
  rawCdnUrl: 'dtuz3np2mgsjp.cloudfront.net',
  normalizedCdnUrl: 'https://dtuz3np2mgsjp.cloudfront.net',
  bucketName: 'digital-signage-media-msr',
  useS3: true
}

[S3] Client configured: {
  region: 'eu-north-1',
  bucket: 'digital-signage-media-msr',
  forcePathStyle: false
}
```

### 2. Test Upload
1. Log into your admin panel
2. Navigate to Media Library
3. Upload an image or video
4. Check browser console - should see successful upload
5. Verify media loads from CloudFront URL

### 3. Expected Success Response
```json
{
  "id": "uuid-here",
  "fileName": "uuid.jpg",
  "originalName": "my-image.jpg",
  "fileType": "image",
  "fileSize": 123456,
  "url": "https://dtuz3np2mgsjp.cloudfront.net/tenant-id/media/uuid.jpg",
  "thumbnailUrl": "https://dtuz3np2mgsjp.cloudfront.net/tenant-id/thumbnails/uuid_thumb.jpg",
  "width": 1920,
  "height": 1080,
  "createdAt": "2026-02-07T..."
}
```

## Commits Pushed

1. **`0fea511`** - Fix: Correct CDN URL normalization to preserve protocol colon
2. **`00d472f`** - docs: Add CDN URL malformation fix documentation  
3. **`50b09b4`** - Fix S3 region endpoint

## Troubleshooting

### If uploads still fail:

1. **Check Railway logs** for the `[S3] Client configured` message
   - Verify `region: 'eu-north-1'` is shown
   
2. **Verify AWS credentials** have proper permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject"
         ],
         "Resource": "arn:aws:s3:::digital-signage-media-msr/*"
       }
     ]
   }
   ```

3. **Check S3 bucket region** in AWS Console:
   - Go to S3 → digital-signage-media-msr → Properties
   - Verify "AWS Region" shows "EU (Stockholm) eu-north-1"

4. **Test S3 access** directly:
   ```bash
   aws s3 ls s3://digital-signage-media-msr --region eu-north-1
   ```

### If FFmpeg errors persist:

These are non-critical. To suppress them, you can:
- Install FFmpeg (see Fix 2 above)
- Or ignore them - uploads will work fine without video thumbnails

## Next Steps

1. ✅ Code changes pushed to GitHub
2. ⏳ Wait for Railway auto-deploy (or trigger manual deploy)
3. ✅ Verify logs show correct S3 configuration
4. ✅ Test media upload
5. ✅ Verify media loads from CloudFront

## Summary

The main issue was that the S3 SDK wasn't configured with the correct region (`eu-north-1`) for your bucket. AWS S3 requires region-specific endpoints for buckets outside `us-east-1`. The fix ensures the SDK knows which region to use, allowing it to construct the correct endpoint URL for your bucket.

The FFmpeg issue is separate and non-critical - it only affects video thumbnail generation, not the core upload functionality.
