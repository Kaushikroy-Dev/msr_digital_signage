# 🔧 Railway Sharp Module Fix

## ❌ Issue

Content service keeps crashing with:
```
Error: Could not load the "sharp" module using the linuxmusl-x64 runtime
```

## 🔍 Root Cause

Railway might be:
1. Using cached builds with Alpine (musl)
2. Not properly using the Dockerfile
3. Building on a platform that detects musl instead of glibc

## ✅ Solution Applied

### Updated Dockerfile:
- Changed from `node:18-slim` to `node:18` (full Debian, not slim)
- Explicitly install sharp with platform flags: `--platform=linux --arch=x64`
- Set npm config to install optional dependencies
- Add verification step to ensure sharp loads

## 🔧 If Still Failing

### Option 1: Verify Railway is Using Dockerfile

1. Go to Railway dashboard
2. Click on `content-service`
3. Go to **Settings** → **Build**
4. Verify:
   - **Builder**: `DOCKERFILE` (not NIXPACKS)
   - **Dockerfile Path**: `Dockerfile`
   - **Root Directory**: `services/content-service`

### Option 2: Clear Build Cache

1. In Railway dashboard
2. Go to content-service → **Settings** → **Build**
3. Look for "Clear Cache" or "Rebuild" option
4. Or delete and recreate the service

### Option 3: Use Multi-Stage Build

If the issue persists, we can use a multi-stage build that explicitly builds sharp from source.

### Option 4: Check Railway Build Logs

Check the build logs to see:
- What base image is actually being used
- If sharp is being installed correctly
- What platform is detected

## 📋 Verification

After redeploy, check logs for:
- ✅ `Sharp version: ...`
- ✅ `Sharp loaded successfully`
- ❌ Should NOT see: `linuxmusl-x64 runtime`

## 🚀 Next Steps

1. Push the updated Dockerfile (already done)
2. Railway should auto-redeploy
3. Check build logs to verify the correct base image is used
4. If still failing, try Option 1-4 above

---

**Status**: Updated Dockerfile with explicit platform flags and full Debian base image.
