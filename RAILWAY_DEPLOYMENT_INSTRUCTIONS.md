# Railway Deployment Instructions - Android TV WebView Player System

## 🚀 Deployment Steps

### 1. Database Migrations (CRITICAL - Run First!)

Before deploying services, you **MUST** run the database migrations:

```sql
-- Connect to your Railway PostgreSQL database
-- Run these migrations in order:

-- 1. Add player_id support
\i database/migrations/add_player_id_support.sql

-- 2. Enhance pairing codes
\i database/migrations/enhance_pairing_codes.sql
```

**Or via Railway CLI:**
```bash
# Connect to Railway database
railway connect

# Run migrations
psql $DATABASE_URL -f database/migrations/add_player_id_support.sql
psql $DATABASE_URL -f database/migrations/enhance_pairing_codes.sql
```

**Or via Railway Dashboard:**
1. Go to your PostgreSQL service in Railway
2. Open the "Data" tab
3. Use the SQL editor to run the migration files

### 2. Service Deployments

Railway should automatically deploy when code is pushed to `main` branch. However, you may need to manually trigger deployments:

#### Device Service
- **New Dependency**: `express-rate-limit@^7.1.5`
- Railway will automatically install this during build
- **New Endpoints**: `/device/init` and `/device/config`
- **Health Check**: Already configured at `/health`

#### API Gateway
- **New Route**: `/api/device/*` → routes to device-service
- No new dependencies required
- Should deploy automatically

#### Frontend
- **New Files**: `frontend/src/utils/offlineCache.js`
- **Modified**: DevicePlayer, Devices, Organization pages
- **No new dependencies**: Uses existing IndexedDB API
- Should deploy automatically

### 3. Verify Deployments

After deployments complete, verify:

#### Check Device Service:
```bash
curl https://api-gateway-production-d887.up.railway.app/api/device/init \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"player_id": "test-123"}'
```

Expected response:
```json
{
  "status": "UNPAIRED",
  "pairing_required": true,
  "message": "Device not registered. Please pair device.",
  "player_id": "test-123"
}
```

#### Check API Gateway Routing:
```bash
curl https://api-gateway-production-d887.up.railway.app/api/device/config?player_id=test-123
```

Expected: 400 Bad Request (player_id not found) or proper error message

#### Check Frontend:
1. Visit: `https://frontend-production-73c0.up.railway.app/player?player_id=test-123`
2. Should show "Device Not Paired" message (if test-123 doesn't exist)
3. Should NOT require authentication

### 4. Environment Variables

Verify these environment variables are set in Railway:

#### Device Service:
- `DATABASE_URL` or `PGHOST`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`
- `JWT_SECRET`
- `CORS_ORIGIN` (should include frontend URL)
- `PORT` (auto-set by Railway)

#### API Gateway:
- `CORS_ORIGIN` (should include frontend URL)
- `DEVICE_SERVICE_URL` (internal service URL)

#### Frontend:
- `VITE_API_URL` (should be API Gateway URL: `https://api-gateway-production-d887.up.railway.app`)

### 5. Testing Checklist

After deployment:

- [ ] Database migrations completed successfully
- [ ] Device service is running and responding to `/health`
- [ ] `/api/device/init` endpoint is accessible (public, no auth)
- [ ] `/api/device/config` endpoint is accessible (public, no auth)
- [ ] Frontend loads player page with `?player_id=xxx`
- [ ] Player shows "Device Not Paired" for unpaired player_id
- [ ] Admin portal shows player_id in Devices page
- [ ] Pairing flow shows player_id after claiming code

### 6. Troubleshooting

#### If device service fails to start:
- Check logs: `railway logs device-service`
- Verify `express-rate-limit` is installed
- Check database connection

#### If API Gateway routing fails:
- Verify `/api/device/*` route is configured
- Check CORS settings
- Verify device-service URL is correct

#### If frontend shows errors:
- Clear browser cache (Ctrl+Shift+R)
- Check browser console for errors
- Verify `VITE_API_URL` is set correctly
- Check Network tab for API calls

#### If database migrations fail:
- Check PostgreSQL connection
- Verify user has ALTER TABLE permissions
- Check for existing columns (migrations use `IF NOT EXISTS`)

### 7. Rollback Plan

If issues occur:

1. **Database Rollback**: The migrations are additive, so you can manually remove columns if needed:
   ```sql
   ALTER TABLE devices DROP COLUMN IF EXISTS player_id;
   ALTER TABLE devices DROP COLUMN IF EXISTS device_token;
   ALTER TABLE devices DROP COLUMN IF EXISTS token_expiry;
   ALTER TABLE pairing_codes DROP COLUMN IF EXISTS player_id;
   ```

2. **Code Rollback**: Revert to previous commit:
   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Service Rollback**: Use Railway's deployment history to rollback individual services

## 📝 Post-Deployment

After successful deployment:

1. **Test Android TV App**:
   - Build APK with updated `PLAYER_URL`
   - Install on Android TV device
   - Verify player_id is generated
   - Test pairing flow

2. **Monitor Logs**:
   - Watch for errors in device-service logs
   - Monitor API Gateway for routing issues
   - Check frontend for console errors

3. **Performance**:
   - Monitor device init endpoint response times
   - Check rate limiting is working (should see 429 errors after 10 requests/min)
   - Verify offline caching is working

## ✅ Success Indicators

- ✅ Database migrations completed without errors
- ✅ All services deployed successfully
- ✅ `/api/device/init` returns expected responses
- ✅ Frontend player page loads without authentication
- ✅ Admin portal displays player_id
- ✅ Pairing flow works end-to-end

---

**Note**: Railway typically auto-deploys within 2-5 minutes after pushing to `main` branch. Check Railway dashboard for deployment status.
