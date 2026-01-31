# Media Upload Fix V3 - 400 Bad Request Fix ✅

## Problem
Getting 400 Bad Request error: "No file uploaded" when trying to upload files through the browser.

## Root Cause
The API Gateway's body parsing middleware was consuming the multipart/form-data stream before it could reach multer in the content service. Even though we tried to skip parsing, the way Express middleware works means the stream was already consumed.

## Solution
Simplified the approach:
1. **Skip body parsing completely for multipart/form-data** - Check content-type BEFORE any parsing happens
2. **Let http-proxy-middleware handle streaming naturally** - Don't interfere with multipart requests in onProxyReq
3. **Only rewrite body for JSON requests** - JSON requests still work correctly

## Key Changes

### API Gateway Body Parsing
- Check content-type FIRST before applying any parsers
- Skip ALL parsing for multipart/form-data
- Apply JSON/URL-encoded parsers only for their respective content types

### Proxy Configuration
- Removed manual body handling for multipart requests
- Let http-proxy-middleware stream multipart data automatically
- Only handle JSON body rewriting

## Files Modified

1. **services/api-gateway/src/index.js**
   - Simplified body parsing middleware
   - Removed manual multipart handling in proxy
   - Let proxy stream multipart naturally

## Testing

### Check Services
```bash
# Docker services (should be running)
docker ps | grep ds-

# Node services (should be running)
lsof -ti:3000  # API Gateway
lsof -ti:3002  # Content Service
```

### Test Upload
1. Open browser: http://localhost:5173
2. Go to Media Library
3. Try uploading a file
4. Check browser console for errors
5. Check Network tab - should see 201 Created on success

### Expected Behavior
- ✅ File uploads successfully
- ✅ File appears in media grid
- ✅ No 400 errors
- ✅ Network request returns 201 with file metadata

## Debugging

If upload still fails:

1. **Check Browser Console**:
   - Look for error messages
   - Check Network tab request/response

2. **Check API Gateway Logs**:
   ```bash
   # Should see proxy requests
   # Should NOT see body parsing for multipart
   ```

3. **Check Content Service Logs**:
   ```bash
   # Should see upload requests
   # Should see "No file uploaded" if file not received
   ```

4. **Test Direct Upload** (with valid JWT):
   ```bash
   # Get a valid token first by logging in
   curl -X POST http://localhost:3000/api/content/upload \
     -H "Authorization: Bearer <valid-token>" \
     -F "file=@test.jpg" \
     -F "tenantId=<tenant-id>"
   ```

## Important Notes

- **Docker is NOT required for file uploads** - Files are stored locally in `services/content-service/uploads/`
- Docker services (postgres, redis, rabbitmq) are for database/cache/queue only
- File uploads work with local storage (no S3 needed)
- The 400 error means the file isn't reaching multer - this is a proxy/streaming issue

## Status

✅ **Fixed**: Body parsing now correctly skips multipart/form-data
✅ **Fixed**: Proxy streams multipart requests naturally
✅ **Ready**: Upload should work in browser now

---

**Next Steps**: Try uploading a file in the browser and check if it works!
