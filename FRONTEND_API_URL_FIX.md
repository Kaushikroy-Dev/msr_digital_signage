# 🔧 Frontend API URL Configuration Fix

## Issue
Frontend is trying to connect to `http://localhost:3000` instead of Railway API Gateway, causing:
- CORS errors
- Login failures
- All API calls failing

## Root Cause
The `VITE_API_URL` environment variable is not set in the Railway frontend service, so it defaults to `http://localhost:3000`.

## ✅ Solution

### Step 1: Get API Gateway Public Domain

1. Open Railway Dashboard: https://railway.com/project/23694457-f6c3-42f1-ab45-2172f39ded1e
2. Click on **api-gateway** service
3. Go to **Settings** → **Networking**
4. Find **Public Domain** (e.g., `api-gateway-production-xxxx.up.railway.app`)
5. Copy the full URL (include `https://`)

### Step 2: Set Frontend Environment Variable

1. In Railway Dashboard, click on **frontend** service
2. Go to **Settings** → **Variables**
3. Click **"+ New Variable"**
4. Add:
   ```
   VITE_API_URL=https://api-gateway-production-xxxx.up.railway.app
   ```
   (Replace with your actual API Gateway domain)
5. Click **Save**

### Step 3: Update API Gateway CORS

1. Click on **api-gateway** service
2. Go to **Settings** → **Variables**
3. Find or add `CORS_ORIGIN` variable
4. Set value to:
   ```
   https://frontend-production-73c0.up.railway.app
   ```
   (Or use Railway service reference: `${{frontend.RAILWAY_PUBLIC_DOMAIN}}`)
5. Click **Save**

### Step 4: Redeploy Services

After setting environment variables:

1. **Frontend Service:**
   - Go to **Deployments** tab
   - Click **"Redeploy"** or trigger new deployment
   - This rebuilds with the new `VITE_API_URL`

2. **API Gateway Service:**
   - Go to **Deployments** tab
   - Click **"Redeploy"** to pick up new CORS settings

## 🔍 Verification

### Check Environment Variables

**Frontend Service:**
```bash
cd frontend
npx @railway/cli variables
```

Should show:
```
VITE_API_URL=https://api-gateway-production-xxxx.up.railway.app
```

**API Gateway Service:**
```bash
cd services/api-gateway
npx @railway/cli variables
```

Should show:
```
CORS_ORIGIN=https://frontend-production-73c0.up.railway.app
```

### Test After Deployment

1. Clear browser cache (`Ctrl+Shift+R` or `Cmd+Shift+R`)
2. Open frontend URL
3. Try to login
4. Check browser console - should see API calls to Railway domain (not localhost)
5. Verify no CORS errors

## 🐛 Troubleshooting

### If Still Using localhost:3000

1. **Check if VITE_API_URL is set:**
   - Railway Dashboard → frontend → Settings → Variables
   - Verify `VITE_API_URL` exists and has correct value

2. **Check if frontend was rebuilt:**
   - Environment variables are baked into the build
   - Must redeploy frontend after setting `VITE_API_URL`
   - Check deployment logs to verify build used the variable

3. **Check build logs:**
   - Railway Dashboard → frontend → Deployments → Latest → Build Logs
   - Look for `VITE_API_URL` in build output

### If CORS Errors Persist

1. **Verify CORS_ORIGIN includes frontend domain:**
   - API Gateway → Settings → Variables → `CORS_ORIGIN`
   - Should match frontend's public domain exactly

2. **Check API Gateway logs:**
   - Look for CORS-related errors
   - Verify CORS middleware is working

3. **Try using service reference:**
   ```
   CORS_ORIGIN=${{frontend.RAILWAY_PUBLIC_DOMAIN}}
   ```

## 📋 Quick Reference

### Frontend Environment Variables
```env
NODE_ENV=production
VITE_API_URL=${{api-gateway.RAILWAY_PUBLIC_DOMAIN}}
```

### API Gateway Environment Variables
```env
NODE_ENV=production
PORT=3000
CORS_ORIGIN=${{frontend.RAILWAY_PUBLIC_DOMAIN}}
# ... other variables
```

## ✅ Success Indicators

- ✅ Frontend makes API calls to Railway domain (not localhost)
- ✅ No CORS errors in browser console
- ✅ Login works successfully
- ✅ All API endpoints accessible
- ✅ Data loads correctly
