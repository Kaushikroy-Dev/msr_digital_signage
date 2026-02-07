# 🔧 CORS Preflight Fix - API Gateway

## Issue
Login was failing with CORS error:
```
Access to XMLHttpRequest at 'https://api-gateway-production-d887.up.railway.app/api/auth/login' 
from origin 'https://frontend-production-73c0.up.railway.app' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause
The API Gateway's CORS middleware wasn't properly handling OPTIONS preflight requests. The preflight request (sent before the actual POST request) wasn't getting the required CORS headers.

## ✅ Fixes Applied

### 1. Enhanced CORS Configuration

**Before:**
```javascript
app.use(cors({
  origin: function (origin, callback) { ... },
  credentials: true
}));
```

**After:**
```javascript
app.use(cors({
  origin: function (origin, callback) { ... },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));
```

### 2. Explicit OPTIONS Handler

Added explicit handler for preflight requests **before** the proxy middleware:

```javascript
// Explicit OPTIONS handler for all /api routes (preflight requests)
app.options('/api/*', (req, res) => {
  const origin = req.headers.origin;
  
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(200).end();
  } else {
    res.status(403).end();
  }
});
```

**Why this is critical:**
- OPTIONS requests must be handled **before** they reach the proxy middleware
- The proxy middleware was intercepting OPTIONS requests and not returning proper CORS headers
- This explicit handler ensures preflight requests get proper CORS headers immediately

### 3. Improved onProxyRes Callback

Enhanced the proxy response handler to set all required CORS headers:

```javascript
onProxyRes: (proxyRes, req, res) => {
  const origin = req.headers.origin;
  
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }
}
```

### 4. Helper Function

Added `isOriginAllowed()` helper for consistent origin validation:

```javascript
function isOriginAllowed(origin) {
  if (!origin) return true;
  
  const isLocalhost = origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1') ||
    origin.startsWith('http://192.168.');
  
  const isRailway = origin.endsWith('.railway.app') || origin.endsWith('up.railway.app');
  
  return corsOrigins.indexOf(origin) !== -1 || isRailway || isLocalhost;
}
```

## 🚀 Deployment Status

- ✅ Code committed and pushed to GitHub (commit `8901b3f`)
- ✅ API Gateway service redeployed
- ⏳ Wait for deployment to complete (~1-2 minutes)

## 🔍 Verification Steps

### 1. Test Preflight Request

```bash
curl -X OPTIONS https://api-gateway-production-d887.up.railway.app/api/auth/login \
  -H "Origin: https://frontend-production-73c0.up.railway.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -i
```

**Expected Response:**
```
HTTP/2 200
Access-Control-Allow-Origin: https://frontend-production-73c0.up.railway.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

### 2. Test Login in Browser

1. Open browser DevTools → Network tab
2. Navigate to login page
3. Submit login form
4. Check Network tab:
   - Should see OPTIONS request (preflight) return 200
   - Should see POST request succeed
   - Both should have CORS headers

### 3. Check Browser Console

- No CORS errors
- Login should work correctly
- Network tab shows successful requests

## 📋 Railway Variables Check

**API Gateway Service:**
- ✅ `CORS_ORIGIN`: Should include `https://frontend-production-73c0.up.railway.app`
- ✅ All service URLs configured (AUTH_SERVICE_URL, etc.)

## ✅ Success Indicators

- ✅ OPTIONS preflight requests return 200 with CORS headers
- ✅ POST requests succeed without CORS errors
- ✅ Login works correctly
- ✅ No "No 'Access-Control-Allow-Origin' header" errors
- ✅ Network tab shows proper CORS headers

## 🐛 If Still Getting CORS Errors

1. **Check Deployment Status:**
   ```bash
   cd services/api-gateway
   npx @railway/cli logs --tail 50
   ```
   Look for: `[CORS] Preflight request handled for origin: ...`

2. **Verify CORS_ORIGIN Variable:**
   ```bash
   cd services/api-gateway
   npx @railway/cli variables | grep CORS_ORIGIN
   ```
   Should include frontend URL

3. **Test Preflight Manually:**
   Use the curl command above to test preflight

4. **Check Browser Console:**
   - Look for OPTIONS request in Network tab
   - Check if it returns 200
   - Verify CORS headers are present

## 📝 Notes

- Preflight requests are sent automatically by browsers for cross-origin requests
- The OPTIONS handler must be **before** the proxy middleware
- CORS headers must be set on both preflight (OPTIONS) and actual (POST) responses
- The `Access-Control-Max-Age` header caches preflight responses for 24 hours
