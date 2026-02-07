# 🔧 403 Forbidden Error Fix

## Issues Identified

### Issue 1: Frontend Still Using localhost:3000
**Symptom:** Browser console shows API calls to `http://localhost:3000/api/...`

**Root Cause:**
- Frontend deployment may not have completed yet
- Browser cache is serving old build
- VITE_API_URL is set but frontend hasn't been rebuilt

**Solution:**
1. Wait for frontend deployment to complete
2. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Or use Incognito/Private mode
4. Verify deployment completed successfully in Railway dashboard

### Issue 2: 403 Forbidden Errors
**Symptom:** All API calls return 403 Forbidden

**Possible Causes:**
1. ✅ JWT_SECRET matches across all services (verified)
2. ⚠️ CORS configuration may be blocking requests
3. ⚠️ Frontend calling localhost:3000 (which doesn't exist in production)
4. ⚠️ Token not being sent correctly

## ✅ Fixes Applied

### 1. Updated CORS_ORIGIN in API Gateway
Set to include:
- `https://frontend-production-73c0.up.railway.app` (production frontend)
- `http://localhost:5173` (local dev)
- `http://localhost:3000` (fallback)

### 2. Triggered Frontend Redeployment
- Frontend will rebuild with `VITE_API_URL=https://api-gateway-production-d887.up.railway.app`
- This ensures API calls go to Railway domain, not localhost

### 3. Triggered API Gateway Redeployment
- API Gateway will restart with updated CORS settings

## 🔍 Verification Steps

### Step 1: Check Frontend Deployment
1. Open Railway Dashboard
2. Go to **frontend** service
3. Check **Deployments** tab
4. Verify latest deployment shows **SUCCESS**
5. Check build logs to confirm `VITE_API_URL` was used

### Step 2: Clear Browser Cache
**Critical:** The old build is cached in your browser!

1. **Hard Refresh:**
   - Windows: `Ctrl+Shift+R` or `Ctrl+F5`
   - Mac: `Cmd+Shift+R`
   - Linux: `Ctrl+Shift+R`

2. **Or Use Incognito/Private Mode:**
   - Chrome: `Ctrl+Shift+N` (Windows) or `Cmd+Shift+N` (Mac)
   - Firefox: `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)

3. **Or Clear Cache Manually:**
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - Firefox: Settings → Privacy → Clear Data → Cached Web Content

### Step 3: Verify API Calls
After clearing cache, check browser console:

**Should see:**
- ✅ API calls to: `https://api-gateway-production-d887.up.railway.app/api/...`
- ✅ No calls to `localhost:3000`
- ✅ No CORS errors

**Should NOT see:**
- ❌ `localhost:3000/api/...`
- ❌ CORS errors
- ❌ 403 Forbidden (after login)

### Step 4: Test Login
1. Clear browser cache (critical!)
2. Go to login page
3. Enter credentials
4. Check browser console for API calls
5. Verify login works

## 🐛 Troubleshooting

### If Still Seeing localhost:3000

**Check 1: Frontend Deployment Status**
```bash
cd frontend
npx @railway/cli service status
```

**Check 2: Verify VITE_API_URL in Build**
- Railway Dashboard → frontend → Latest Deployment → Build Logs
- Search for `VITE_API_URL` in logs
- Should show: `https://api-gateway-production-d887.up.railway.app`

**Check 3: Browser Cache**
- Must clear cache or use Incognito mode
- Old build is definitely cached

### If Still Getting 403 After Login

**Check 1: Verify Token is Being Sent**
- Browser DevTools → Network tab
- Click on failed request
- Check **Headers** → **Request Headers**
- Should see: `Authorization: Bearer <token>`

**Check 2: Verify JWT_SECRET**
All services should have the same JWT_SECRET:
```bash
# Check each service
cd services/api-gateway && npx @railway/cli variables | grep JWT_SECRET
cd ../content-service && npx @railway/cli variables | grep JWT_SECRET
cd ../scheduling-service && npx @railway/cli variables | grep JWT_SECRET
```

**Check 3: Check API Gateway Logs**
- Railway Dashboard → api-gateway → Logs
- Look for authentication errors
- Check if token is being received

**Check 4: Verify CORS**
- Browser DevTools → Network tab
- Check failed request → **Response Headers**
- Should see: `Access-Control-Allow-Origin: https://frontend-production-73c0.up.railway.app`

### If CORS Errors Persist

**Update CORS_ORIGIN:**
```bash
cd services/api-gateway
npx @railway/cli variable set "CORS_ORIGIN=https://frontend-production-73c0.up.railway.app"
npx @railway/cli service redeploy --yes
```

## ✅ Success Indicators

After fixes:
- ✅ Frontend calls Railway API Gateway (not localhost)
- ✅ No CORS errors in console
- ✅ Login works successfully
- ✅ API calls return 200 OK (not 403)
- ✅ Data loads correctly

## 📋 Quick Checklist

- [ ] Frontend deployment completed successfully
- [ ] Browser cache cleared (hard refresh)
- [ ] API calls show Railway domain (not localhost)
- [ ] No CORS errors
- [ ] Login works
- [ ] API calls return 200 OK

## 🚨 Most Common Issue

**Browser Cache!** The old build with `localhost:3000` is cached. You MUST:
1. Hard refresh: `Ctrl+Shift+R` or `Cmd+Shift+R`
2. Or use Incognito/Private mode
3. Or clear browser cache completely

The frontend deployment completed, but your browser is still serving the old cached version!
