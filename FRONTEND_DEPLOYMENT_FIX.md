# 🔧 Frontend Deployment Fix - Railway

## Issue
Frontend UI fixes are not displaying in production - still seeing old UI.

## Root Cause
The frontend service in Railway may not be:
1. Connected to GitHub for auto-deploy
2. Deploying from the correct branch (main)
3. Auto-deploy enabled

## ✅ Solution Applied

### 1. Code Status
- ✅ Code pushed to GitHub (commits: c9e2526, 0793d00)
- ✅ Frontend fixes included in commit c9e2526
- ✅ Manual deployment triggered for frontend service

### 2. Manual Deployment Triggered
```bash
cd frontend
npx @railway/cli up --detach
```

**Deployment URL:** https://railway.com/project/23694457-f6c3-42f1-ab45-2172f39ded1e/service/bc7e2611-c1c2-40d5-ae62-83dd8fc9d1b9

## 🔍 Verification Steps

### Step 1: Check Railway Dashboard
1. Open: https://railway.com/project/23694457-f6c3-42f1-ab45-2172f39ded1e
2. Find the **frontend** service
3. Click on it to view details

### Step 2: Verify GitHub Connection
1. Go to **Settings** → **Source**
2. Verify it shows:
   - **Repository:** `Kaushikroy-Dev/msr_digital_signage`
   - **Branch:** `main`
   - **Auto Deploy:** ✅ Enabled

### Step 3: Check Latest Deployment
1. Go to **Deployments** tab
2. Verify latest deployment shows:
   - **Commit:** `c9e2526` or `0793d00`
   - **Status:** `SUCCESS` or `BUILDING`
   - **Time:** Recent (within last few minutes)

### Step 4: Check Build Logs
1. Click on the latest deployment
2. View **Build Logs**
3. Verify:
   - ✅ `npm install` completed
   - ✅ `npm run build` completed successfully
   - ✅ No build errors
   - ✅ Docker image built successfully

### Step 5: Verify Service is Running
1. Check **Metrics** tab
2. Verify service status is **RUNNING**
3. Check **Logs** for any runtime errors

## 🔧 If Frontend Service is Not Connected to GitHub

### Option 1: Connect via Railway Dashboard
1. Go to frontend service
2. **Settings** → **Source**
3. Click **"Connect GitHub"**
4. Select repository: `Kaushikroy-Dev/msr_digital_signage`
5. Select branch: `main`
6. Enable **Auto Deploy**
7. Click **Save**

### Option 2: Recreate Service with GitHub
1. Delete existing frontend service (if needed)
2. Click **"+ New"** → **"GitHub Repo"**
3. Select: `Kaushikroy-Dev/msr_digital_signage`
4. Configure:
   - **Root Directory:** `frontend`
   - **Build Command:** (auto-detected from Dockerfile)
   - **Start Command:** (auto-detected from Dockerfile)
5. Set environment variables:
   - `NODE_ENV=production`
   - `VITE_API_URL=${{api-gateway.RAILWAY_PUBLIC_DOMAIN}}`
6. Enable auto-deploy

## 🧪 Testing After Deployment

### 1. Clear Browser Cache
- **Chrome/Edge:** `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Firefox:** `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
- Or use Incognito/Private mode

### 2. Verify Frontend URL
- Check Railway dashboard for frontend service's public domain
- Visit the URL in browser
- Verify you see the new UI

### 3. Test Create Playlist
1. Log in to the application
2. Navigate to **Playlists** page
3. Click **"Create Playlist"** button
4. Verify:
   - ✅ Modal opens (not browser prompt)
   - ✅ Property/Zone selector appears (for super_admin/property_admin)
   - ✅ Form fields are visible
   - ✅ "Create Playlist" button works

## 📋 Check All Services

Verify all services are updated:

```bash
# Check each service in Railway dashboard:
- frontend ✅ (just deployed)
- api-gateway
- auth-service
- content-service
- template-service
- scheduling-service
- device-service
```

For each service:
1. Check **Deployments** tab
2. Verify latest commit is `c9e2526` or newer
3. Verify status is **SUCCESS**
4. Verify service is **RUNNING**

## 🐛 Troubleshooting

### Issue: Frontend still shows old UI
**Solutions:**
1. Hard refresh browser: `Ctrl+Shift+R` or `Cmd+Shift+R`
2. Clear browser cache completely
3. Use Incognito/Private mode
4. Check if frontend service actually deployed (check Railway logs)
5. Verify frontend URL is correct

### Issue: Frontend service not deploying
**Solutions:**
1. Check if GitHub connection is set up
2. Verify auto-deploy is enabled
3. Check build logs for errors
4. Verify Dockerfile is correct
5. Check environment variables are set

### Issue: Build fails
**Solutions:**
1. Check build logs for specific error
2. Verify `package.json` is correct
3. Check if all dependencies are available
4. Verify Node.js version matches (18-bullseye)
5. Check if `serve` package is installed

## ✅ Success Indicators

- ✅ Frontend service shows latest commit in deployments
- ✅ Build status is SUCCESS
- ✅ Service is RUNNING
- ✅ Browser shows new UI after cache clear
- ✅ Create Playlist button opens modal (not prompt)
- ✅ Property/Zone selector appears for appropriate roles

## 📞 Quick Commands

```bash
# Check frontend deployment status
cd frontend
npx @railway/cli status

# View frontend logs
npx @railway/cli logs

# Trigger manual deployment
npx @railway/cli up --detach

# Open Railway dashboard
npx @railway/cli open
```
