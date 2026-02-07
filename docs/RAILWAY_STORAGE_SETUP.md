# Railway Local Storage Setup Guide

## Overview
We've reverted from AWS S3 to **Railway's local persistent storage** for media uploads. This is simpler, faster, and doesn't require external AWS configuration.

## What Changed

### Code Changes
- **S3 is now DISABLED** by default (`USE_S3 = false`)
- All media files are stored in Railway's persistent volume at `/app/storage`
- Removed all S3/CloudFront complexity
- Simplified storage configuration

### Storage Location
```
/app/storage/
├── {tenant-id}/
│   ├── media/
│   │   ├── {uuid}.jpg
│   │   ├── {uuid}.mp4
│   │   └── ...
│   └── thumbnails/
│       ├── {uuid}_thumb.jpg
│       └── ...
```

## Railway Configuration Required

### Step 1: Add Persistent Volume to content-service

1. Go to **Railway Dashboard** → Your Project → **content-service**
2. Click on **Settings** tab
3. Scroll to **Volumes** section
4. Click **+ New Volume**
5. Configure:
   - **Mount Path**: `/app/storage`
   - **Name**: `content-storage` (or any name you prefer)
6. Click **Add**

### Step 2: Remove AWS Environment Variables (Optional)

Since we're not using S3 anymore, you can remove these from Railway:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET_NAME`
- `S3_CDN_URL`

**Note:** Removing these is optional - the code will ignore them since `USE_S3 = false`.

### Step 3: Redeploy

After adding the volume:
1. Railway will automatically redeploy the service
2. Or manually trigger: **Settings** → **Redeploy**

## Verification

### Check Logs
After deployment, you should see in Railway logs:

```
[Storage] Using Railway local file storage at: /app/storage
[Storage] S3 is DISABLED - all media stored locally
```

### Test Upload
1. Go to your admin panel
2. Navigate to Media Library
3. Upload an image or video
4. Should upload quickly and work immediately

## Media URLs

Media will be served from your content-service URL:

```
https://content-service-production-xxxx.up.railway.app/uploads/{tenant-id}/media/{filename}
```

Example:
```
https://content-service-production-xxxx.up.railway.app/uploads/8062450b-a6b0-457d-81a7-94d3f0371eb3/media/abc123.jpg
```

## Performance Considerations

### Advantages of Railway Storage
✅ **Faster uploads** - No external API calls to AWS
✅ **Simpler setup** - No AWS configuration needed
✅ **Lower latency** - Files served directly from Railway
✅ **No costs** - No S3 storage or data transfer fees
✅ **Easier debugging** - All logs in one place

### Limitations
⚠️ **Volume size** - Railway volumes have size limits (check your plan)
⚠️ **No CDN** - Files served directly (not via CloudFront)
⚠️ **Single region** - Files stored in Railway's region only

### Optimization Tips

1. **Enable HTTP caching** (already configured):
   - Images: 1 year cache
   - Videos: 1 year cache with range requests
   - Thumbnails: 7 days cache

2. **Monitor volume usage**:
   - Check Railway dashboard for storage usage
   - Set up alerts if approaching limit

3. **Compress images** (already configured):
   - Thumbnails are automatically generated at 400x300
   - Original images are stored as-is

## Volume Persistence

**Important:** Railway volumes are **persistent** across deployments:
- ✅ Files survive redeployments
- ✅ Files survive service restarts
- ❌ Files are lost if volume is deleted
- ❌ Files are lost if service is deleted (unless volume is detached first)

## Backup Strategy (Recommended)

Since files are only stored on Railway, consider:

1. **Regular backups** to external storage (S3, Google Cloud Storage, etc.)
2. **Database backup** includes file paths but not actual files
3. **Volume snapshots** (if Railway supports it in your plan)

## Troubleshooting

### Issue: "No such file or directory" errors

**Solution:** Ensure volume is mounted at `/app/storage`
- Check Railway → content-service → Settings → Volumes
- Verify mount path is exactly `/app/storage`

### Issue: Uploads work but files disappear after redeploy

**Solution:** Volume not properly configured
- Volume must be added BEFORE first upload
- Check that volume is attached to the service

### Issue: "Disk full" errors

**Solution:** Volume size limit reached
- Check Railway dashboard for volume usage
- Upgrade Railway plan for larger volumes
- Or implement file cleanup/archival

### Issue: Slow file serving

**Solution:** Enable caching (already configured)
- Check browser caches responses (look for `Cache-Control` headers)
- Consider adding a CDN in front of Railway (Cloudflare, etc.)

## Migration from S3 (If Needed Later)

If you need to migrate back to S3 in the future:

1. Change `USE_S3 = false` to use the environment variable check
2. Set AWS credentials in Railway
3. Files will automatically start uploading to S3
4. Old files in `/app/storage` will still be accessible
5. Gradually migrate old files to S3 if needed

## Summary

✅ **Reverted to Railway local storage**
✅ **S3 disabled by default**
✅ **Simpler configuration**
✅ **Faster uploads**
✅ **No AWS dependencies**

**Next Steps:**
1. Add persistent volume in Railway
2. Redeploy content-service
3. Test media upload
4. Verify files persist across redeploys
