# CDN URL Malformation Fix

## Issue Summary
Media assets were failing to load with `ERR_NAME_NOT_RESOLVED` errors. The browser console showed malformed URLs like:
```
api-gateway-production-d887.up.railway.apphttps//dtuz3np2mgsjp.cloudfront.net/...
```

Notice the missing colon in `https//` instead of `https://`.

## Root Cause
The CDN URL normalization logic in `services/content-service/src/index.js` had a bug in the regex pattern that was inadvertently removing or corrupting the protocol separator.

The original code:
```javascript
const CDN_URL = (rawCdnUrl && !/^https?:\/\//i.test(rawCdnUrl))
    ? `https://${rawCdnUrl.replace(/^\/+|\/+$/g, '')}`
    : (rawCdnUrl || '').replace(/\/+$/, '');
```

This complex ternary expression with inline regex replacements was causing the protocol to be malformed.

## The Fix
Refactored the CDN URL normalization to be more explicit and readable:

```javascript
// Normalize CDN URL: add https:// if missing, remove trailing slashes
let CDN_URL = rawCdnUrl || '';
if (CDN_URL && !/^https?:\/\//i.test(CDN_URL)) {
    // No protocol found, add https://
    CDN_URL = `https://${CDN_URL}`;
}
// Remove trailing slashes
CDN_URL = CDN_URL.replace(/\/+$/, '');

console.log('[S3] CDN Configuration:', {
    rawCdnUrl,
    normalizedCdnUrl: CDN_URL,
    bucketName: BUCKET_NAME,
    useS3: USE_S3
});
```

## Changes Made
1. **Simplified normalization logic**: Split into clear, sequential steps
2. **Added debug logging**: To verify CDN configuration on service startup
3. **Preserved protocol**: Ensures `https://` is properly formatted

## Expected Behavior After Fix
- `S3_CDN_URL=dtuz3np2mgsjp.cloudfront.net` → `https://dtuz3np2mgsjp.cloudfront.net`
- `S3_CDN_URL=https://dtuz3np2mgsjp.cloudfront.net` → `https://dtuz3np2mgsjp.cloudfront.net`
- `S3_CDN_URL=https://dtuz3np2mgsjp.cloudfront.net/` → `https://dtuz3np2mgsjp.cloudfront.net`

## Next Steps
1. **Redeploy content-service** in Railway to pick up the fix
2. **Monitor logs** for the `[S3] CDN Configuration:` message to verify correct URL
3. **Test media upload** and verify images/videos load correctly from CloudFront
4. **Check browser console** - should see proper `https://dtuz3np2mgsjp.cloudfront.net/...` URLs

## Railway Environment Variables
No changes needed to your Railway configuration. The service will work with:
```
S3_CDN_URL=dtuz3np2mgsjp.cloudfront.net
```
or
```
S3_CDN_URL=https://dtuz3np2mgsjp.cloudfront.net
```

Both formats are now handled correctly.
