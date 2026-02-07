# 🔧 SIGTERM Error Fix - Scheduling & Device Services

## Issue
Both services were getting SIGTERM errors and being killed by Railway:
```
npm error signal SIGTERM
npm error command sh -c node src/index.js
```

## Root Cause
Railway was killing the containers because:
1. **Health checks were failing** - Services weren't responding to `/health` in time
2. **Device service startup delay** - Database connection check happened BEFORE HTTP server started
3. **Missing health check config** - Railway didn't know where to check health

## ✅ Fixes Applied

### 1. Scheduling Service

**railway.json:**
```json
{
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300
  }
}
```

**index.js:**
- Improved health endpoint with timestamp
- Better startup logging

### 2. Device Service (Critical Fix)

**railway.json:**
```json
{
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300
  }
}
```

**index.js - Startup Order Changed:**
```javascript
// BEFORE (causing SIGTERM):
async function startServer() {
    // Test DB connection FIRST (takes time)
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) process.exit(1);
    
    // Start HTTP server AFTER (too late for health check)
    app.listen(PORT, ...);
}

// AFTER (fixed):
async function startServer() {
    // Start HTTP server FIRST (immediate health check response)
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Device Service running on port ${PORT}`);
    });
    
    // Test DB connection AFTER (doesn't block health checks)
    try {
        const dbConnected = await testDatabaseConnection();
        // Log warning but don't exit
    } catch (error) {
        // Log error but continue running
    }
}
```

## Why This Fixes SIGTERM

1. **Health Check Configuration:**
   - Railway now knows to check `/health` endpoint
   - 300 second timeout gives enough time for startup

2. **Immediate Health Response:**
   - HTTP server starts immediately
   - `/health` endpoint responds right away
   - Railway health checks pass during startup

3. **Non-Blocking Database Check:**
   - Database connection happens AFTER server starts
   - Service can respond to health checks even if DB is slow
   - DB operations will retry on first request if needed

## 🚀 Deployment Status

- ✅ Code committed and pushed to GitHub
- ✅ Scheduling service redeployed
- ✅ Device service redeployed
- ⏳ Wait for deployments to complete

## 🔍 Verification

After deployment, check logs:

**Scheduling Service:**
```bash
cd services/scheduling-service
npx @railway/cli logs --tail 50
```

Should see:
- ✅ `Scheduling Service running on port 3004`
- ✅ `Health check available at http://0.0.0.0:3004/health`
- ✅ No SIGTERM errors

**Device Service:**
```bash
cd services/device-service
npx @railway/cli logs --tail 50
```

Should see:
- ✅ `Device Service running on port 3005`
- ✅ Database connection successful (or warning if slow)
- ✅ No SIGTERM errors

## 📋 Railway Dashboard Check

1. Go to Railway dashboard
2. Check scheduling-service:
   - Status should be RUNNING (not restarting)
   - No recent SIGTERM errors
   - Health check should be passing

3. Check device-service:
   - Status should be RUNNING (not restarting)
   - No recent SIGTERM errors
   - Health check should be passing

## ✅ Success Indicators

- ✅ Services stay running (no SIGTERM)
- ✅ Health checks pass
- ✅ Services respond to API requests
- ✅ No restart loops
- ✅ Logs show successful startup

## 🐛 If Still Getting SIGTERM

1. **Check health endpoint:**
   ```bash
   curl https://scheduling-service-production-xxxx.up.railway.app/health
   curl https://device-service-production-xxxx.up.railway.app/health
   ```
   Should return: `{"status":"healthy","service":"..."}`

2. **Check Railway variables:**
   - Verify PORT is set correctly
   - Verify database variables are set

3. **Check startup time:**
   - If database connection takes > 300s, increase timeout
   - Or optimize database connection

4. **Check logs:**
   - Look for any errors before SIGTERM
   - Check if health endpoint is accessible

## 📝 Notes

- Health checks are critical for Railway deployments
- Services must respond to `/health` within timeout period
- Starting HTTP server before DB check ensures health checks pass
- Database connection failures won't kill the service anymore
