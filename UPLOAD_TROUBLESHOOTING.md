# Upload Troubleshooting Guide

## Current Issue
Getting "No file uploaded" error - file isn't reaching multer.

## What We've Fixed

1. ✅ API Gateway - Skips body parsing for multipart/form-data
2. ✅ Content Service - Skips body parsing for multipart/form-data
3. ✅ Frontend - Removed manual Content-Type header
4. ✅ Proxy - Configured to stream multipart requests

## Debugging Steps

### 1. Check Terminal Logs

**API Gateway logs** (should show):
```
[Gateway] Multipart upload - preserving headers, streaming body
```

**Content Service logs** (should show):
```
[Upload] Request received: { contentType: 'multipart/form-data; boundary=...', hasFile: false }
[Upload] No file received. Full request details: ...
```

### 2. Check Browser Network Tab

1. Open DevTools (F12) → Network tab
2. Upload a file
3. Click the failed request
4. Check:
   - **Request Headers**: Content-Type should have `boundary=----WebKitFormBoundary...`
   - **Request Payload**: Should show FormData with file
   - **Response**: Should show detailed error message

### 3. Test Direct Connection

Try bypassing the API Gateway temporarily:

```javascript
// In frontend/src/lib/api.js, temporarily change:
const API_BASE_URL = 'http://localhost:3002'; // Direct to content service
```

If this works, the issue is with the proxy.

## Possible Root Causes

1. **Stream Consumption**: Request body stream is being consumed before reaching multer
2. **Header Issues**: Content-Type boundary is being lost
3. **Proxy Buffering**: http-proxy-middleware is buffering instead of streaming
4. **Middleware Order**: Body parsing middleware might be running before the check

## Next Steps

If upload still fails after all fixes:

1. **Check the exact error message** in browser Response tab
2. **Check terminal logs** for [Gateway] and [Upload] messages
3. **Try direct connection** to content service (bypass gateway)
4. **Check if file is in FormData** in browser Network tab

## Alternative Solution

If proxy continues to be problematic, we could:
- Route uploads directly to content service (bypass gateway)
- Use a different proxy library
- Handle uploads in the gateway itself (not recommended)

---

**Please share the terminal logs and browser Network tab details to continue debugging.**
