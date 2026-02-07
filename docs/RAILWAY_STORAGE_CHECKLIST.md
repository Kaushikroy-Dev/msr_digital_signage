# Quick Setup Checklist - Railway Storage

## ✅ Immediate Steps (Do This Now)

### 1. Add Persistent Volume in Railway
- [ ] Go to Railway Dashboard
- [ ] Select your project → **content-service**
- [ ] Click **Settings** tab
- [ ] Scroll to **Volumes** section
- [ ] Click **+ New Volume**
- [ ] Set **Mount Path**: `/app/storage`
- [ ] Set **Name**: `content-storage`
- [ ] Click **Add**

### 2. Wait for Auto-Deploy
- [ ] Railway will automatically redeploy after adding volume
- [ ] Wait 2-3 minutes for deployment to complete
- [ ] Check **Deployments** tab for status

### 3. Verify in Logs
- [ ] Go to **Logs** tab in Railway
- [ ] Look for these messages:
  ```
  [Storage] Using Railway local file storage at: /app/storage
  [Storage] S3 is DISABLED - all media stored locally
  ```

### 4. Test Upload
- [ ] Go to your admin panel
- [ ] Navigate to Media Library
- [ ] Upload a test image
- [ ] Should upload quickly (< 5 seconds)
- [ ] Image should display immediately

### 5. Verify Persistence
- [ ] After successful upload, trigger a manual redeploy in Railway
- [ ] After redeploy completes, check if uploaded media still loads
- [ ] If yes, volume is working correctly ✅

## 🔧 Optional Cleanup

### Remove AWS Environment Variables (Optional)
Since we're not using S3 anymore, you can remove these from Railway content-service:
- [ ] `AWS_ACCESS_KEY_ID`
- [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] `AWS_REGION`
- [ ] `S3_BUCKET_NAME`
- [ ] `S3_CDN_URL`

**Note:** This is optional - the code will ignore them anyway.

## 📊 Expected Results

### Before (S3 - Not Working)
❌ Upload fails with "bucket must be addressed using specified endpoint"
❌ 500 errors
❌ Complex AWS configuration required

### After (Railway Storage - Working)
✅ Upload succeeds immediately
✅ Fast uploads (< 5 seconds for images)
✅ No external dependencies
✅ Simple configuration
✅ Files persist across redeploys

## 🚨 Important Notes

1. **Volume MUST be added** before uploads will work
2. **Volume size** is limited by your Railway plan
3. **Files are persistent** - they survive redeploys
4. **No CDN** - files served directly from Railway (still fast enough)

## 📝 What Was Changed in Code

1. Set `USE_S3 = false` (hardcoded)
2. Removed all S3 client initialization
3. Simplified storage configuration
4. All files now go to `/app/storage`
5. Files served via `/uploads/` route

## ⏱️ Timeline

- **Now**: Push code to GitHub (in progress)
- **+2 min**: Railway auto-deploys
- **+5 min**: Add volume in Railway dashboard
- **+7 min**: Railway redeploys with volume
- **+10 min**: Test upload - should work!

## 🆘 If Something Goes Wrong

### Upload still fails?
1. Check Railway logs for errors
2. Verify volume is mounted at `/app/storage`
3. Check that deployment completed successfully

### Files disappear after redeploy?
1. Volume not properly configured
2. Add volume BEFORE uploading files
3. Check Railway → Settings → Volumes

### Need help?
- Check `docs/RAILWAY_STORAGE_SETUP.md` for detailed guide
- Check Railway logs for specific errors
- Verify volume mount path is exactly `/app/storage`
