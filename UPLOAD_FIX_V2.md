# Media Upload Fix V2 - Browser Testing ✅

## Additional Issues Found

1. **Frontend Content-Type Header**: The frontend was manually setting `Content-Type: multipart/form-data` which removes the boundary parameter that axios needs to add automatically.

2. **API Gateway Body Parsing**: The body parsing middleware was interfering with multipart/form-data streams. The proxy needs the raw stream to forward file uploads correctly.

## Additional Fixes Applied

### 1. Fixed Frontend Upload
- Removed manual `Content-Type` header setting
- Let axios automatically set the Content-Type with the boundary parameter
- Added timeout and size limits for large file uploads

### 2. Fixed API Gateway Body Parsing
- Added conditional body parsing that skips multipart/form-data requests
- Multipart requests now stream through untouched to the content service
- JSON and URL-encoded requests still parse correctly

## Files Modified

1. **frontend/src/pages/MediaLibrary.jsx**
   - Removed manual Content-Type header
   - Added timeout and size limits

2. **services/api-gateway/src/index.js**
   - Added conditional body parsing middleware
   - Skip parsing for multipart/form-data requests
   - Preserve Content-Type header with boundary in proxy

## Testing in Browser

1. **Open Browser Console** (F12)
2. **Navigate to Media Library**: http://localhost:5173
3. **Try uploading a file**:
   - Drag and drop an image/video
   - Or click to select a file
4. **Check Network Tab**:
   - Look for POST request to `/api/content/upload`
   - Check if Content-Type includes boundary: `multipart/form-data; boundary=----WebKitFormBoundary...`
   - Check response status (should be 201 for success)

## Expected Behavior

### Success
- File uploads successfully
- File appears in media grid
- No errors in console
- Network request returns 201 with file metadata

### Common Issues

1. **"No file uploaded" error**:
   - Check if Content-Type header has boundary parameter
   - Check if file is actually in FormData

2. **"Forbidden" error**:
   - Check if user has upload permissions (not viewer role)
   - Check if JWT token is valid

3. **"Service unavailable" error**:
   - Check if content service is running (port 3002)
   - Check API Gateway logs

4. **Timeout errors**:
   - File might be too large (>500MB)
   - Network might be slow

## Debug Steps

1. **Check Browser Console**:
   ```javascript
   // In browser console, check the request
   // Look for errors in Network tab
   ```

2. **Check API Gateway Logs**:
   ```bash
   # Should see proxy requests
   # Should NOT see body parsing for multipart requests
   ```

3. **Check Content Service Logs**:
   ```bash
   # Should see upload requests
   # Should see file processing
   ```

4. **Test Direct Upload**:
   ```bash
   curl -X POST http://localhost:3002/upload \
     -H "Authorization: Bearer <valid-token>" \
     -F "file=@test.jpg" \
     -F "tenantId=<tenant-id>"
   ```

## Notes

- Multipart/form-data requests must NOT be parsed by body-parser
- The boundary parameter in Content-Type is critical for file uploads
- axios automatically handles FormData and sets the correct Content-Type
- The proxy streams multipart requests directly to the content service
- File size limit: 500MB (configurable in content service)

---

**Status**: Upload should now work in the browser! ✅

Try uploading a file and check the browser console/network tab for any errors.
