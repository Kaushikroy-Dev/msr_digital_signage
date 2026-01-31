# Upload Storage Information

## Current Setup

**Content Service is running LOCALLY (not in Docker)**

- **Upload Directory**: `services/content-service/uploads/`
- **Files are saved to**: Local filesystem, not Docker volume
- **Docker Volume**: `media_storage:/app/storage` (only used when running in Docker)

## Where Files Are Saved

### When Running Locally (Current Setup)
```
/Users/kaushik/Desktop/Digital Signedge/services/content-service/uploads/
├── {tenantId}/
│   └── media/
│       └── {fileName}
└── {tenantId}/
    └── thumbnails/
        └── {thumbnailName}
```

### When Running in Docker
```
Docker Volume: media_storage
Container Path: /app/storage
Host Path: Managed by Docker (check with: docker volume inspect digital-signage-network_media_storage)
```

## How to Check Current Status

```bash
# Check if running in Docker
docker ps | grep content-service

# Check if running locally
lsof -i :3002

# Check upload directory
ls -la services/content-service/uploads/
```

## To Switch to Docker

1. **Stop local services:**
   ```bash
   pkill -f 'content-service'
   ```

2. **Start Docker service:**
   ```bash
   docker-compose up -d content-service
   ```

3. **Files will then be saved to Docker volume**

## Troubleshooting Upload Errors

If you're getting upload errors:

1. **Check browser console** for the exact error message
2. **Check content service logs** - should show detailed upload logs
3. **Verify authentication** - token must be valid
4. **Check file type** - must be: images (jpeg, jpg, png, gif, webp), videos (mp4, webm, mov, avi), documents (pdf, doc, docx, ppt, pptx)
5. **Check file size** - max 500MB

## Current Error?

Please check:
- Browser console (F12 → Console tab)
- Network tab (F12 → Network tab → find the upload request)
- Content service terminal/logs for detailed error messages

The service logs should show:
- `[Upload] Request received:` - confirms request reached the service
- `[Upload] Processing file:` - confirms file was received
- `[Upload] Error:` - shows the actual error
