# 🔧 Railway Services Deployment Fix

## Issues Identified

### 1. Frontend Service - `serve: not found` Error
**Error:** `/bin/sh: 1: serve: not found`

**Root Cause:** The `serve` command was not found in PATH even though it's installed in `node_modules`.

**Fix Applied:**
- Changed Dockerfile CMD from `serve -s dist -l $PORT` to `npx serve -s dist -l $PORT`
- `npx` ensures the command is found in `node_modules/.bin`
- Committed and pushed fix

### 2. Latest Deployment Failed
**Status:** Latest deployment (commit 0793d00) failed 18 minutes ago

**Action:** Fixed frontend Dockerfile and triggered new deployment

## ✅ Fixes Applied

### Frontend Dockerfile Fix
```dockerfile
# Before (failing):
CMD serve -s dist -l $PORT

# After (fixed):
CMD npx serve -s dist -l $PORT
```

**Why this works:**
- `npx` looks for executables in `node_modules/.bin`
- `serve` is installed as a dependency in `package.json`
- `npx` ensures it's found even if not in system PATH

## 🔍 Check All Services

### Services to Verify in Railway Dashboard:
1. **frontend** ✅ (fix applied, redeploying)
2. **api-gateway**
3. **auth-service**
4. **content-service** ✅ (working - logs show successful connection)
5. **template-service**
6. **scheduling-service**
7. **device-service**

### For Each Service, Verify:

#### 1. GitHub Connection
- Go to service → **Settings** → **Source**
- Verify: Connected to `Kaushikroy-Dev/msr_digital_signage`
- Branch: `main`
- Auto-deploy: ✅ Enabled

#### 2. Latest Deployment
- Go to **Deployments** tab
- Check latest deployment:
  - ✅ Status: SUCCESS
  - ✅ Commit: Latest (c9e2526 or newer)
  - ✅ Time: Recent

#### 3. Service Status
- Check **Metrics** or **Overview**
- Verify: Service is **RUNNING**
- Check **Logs** for errors

#### 4. Environment Variables
- Go to **Settings** → **Variables**
- Verify all required variables are set (see RAILWAY_ENV_SETUP.md)

## 📋 Service-Specific Checks

### Frontend Service
**Status:** Fix applied, redeploying

**Check:**
- ✅ Dockerfile uses `npx serve`
- ✅ Latest commit includes Dockerfile fix
- ✅ Build completes successfully
- ✅ Service starts without `serve: not found` error

**Environment Variables:**
```env
NODE_ENV=production
VITE_API_URL=${{api-gateway.RAILWAY_PUBLIC_DOMAIN}}
```

### Content Service
**Status:** ✅ Working (from logs)

**Logs show:**
- ✅ Database connected successfully
- ✅ Using production database: `railway`
- ✅ Service running on port 3002
- ✅ All required columns verified

### Other Services
**Action Required:**
- Check each service in Railway dashboard
- Verify GitHub connection
- Check deployment status
- Review logs for errors

## 🚀 Deployment Status

### Latest Deployments:
- **9c28cebf** - SUCCESS (2026-02-03 12:19:29) - Previous deployment
- **6d164947** - REMOVED (2026-02-03 12:16:11) - Frontend build (failed)
- **New deployment** - Triggered after Dockerfile fix

### Next Steps:
1. ✅ Frontend Dockerfile fixed
2. ✅ Code pushed to GitHub
3. ⏳ Wait for Railway auto-deploy (or manual trigger)
4. ⏳ Monitor frontend deployment
5. ⏳ Verify all services are updated

## 🐛 Troubleshooting

### If Frontend Still Fails:
1. Check build logs in Railway dashboard
2. Verify `serve` is in `package.json` dependencies (it is)
3. Check if `npm install` completed successfully
4. Verify `dist` folder exists after build
5. Check PORT environment variable is set

### If Other Services Fail:
1. Check service logs in Railway dashboard
2. Verify GitHub connection
3. Check environment variables
4. Verify database connection (for backend services)
5. Check build/start commands are correct

### If Services Not Updating:
1. Verify GitHub connection in service settings
2. Enable auto-deploy
3. Check if branch is set to `main`
4. Trigger manual deployment if needed

## ✅ Success Indicators

- ✅ Frontend service starts without `serve: not found` error
- ✅ All services show latest commit in deployments
- ✅ All services status: RUNNING
- ✅ No errors in service logs
- ✅ Frontend UI shows new Create Playlist modal (not prompt)

## 📞 Quick Commands

```bash
# Check deployment status
npx @railway/cli deployment list

# View service logs
npx @railway/cli logs

# Trigger frontend deployment
cd frontend
npx @railway/cli up --detach

# Open Railway dashboard
npx @railway/cli open
```
