# 🚀 Railway Deployment Checklist - Create Playlist Fix

## ✅ Code Status
- ✅ Code committed to local repository
- ⚠️  **Action Required**: Push to GitHub manually (authentication needed)
  ```bash
  git push origin main
  ```

## 🗄️ Database Configuration Verification

All services are configured to use Railway's production database automatically:

### Database Connection Priority (All Services)
1. `DATABASE_NAME` environment variable (if set)
2. `PGDATABASE` environment variable (Railway auto-provides this)
3. Default: `'railway'` (Railway's default database name)

### Services Using Production Database:
- ✅ `auth-service` - Uses `process.env.DATABASE_NAME || process.env.PGDATABASE || 'railway'`
- ✅ `content-service` - Uses `process.env.DATABASE_NAME || process.env.PGDATABASE || 'railway'`
- ✅ `template-service` - Uses `process.env.DATABASE_NAME || process.env.PGDATABASE || 'railway'`
- ✅ `scheduling-service` - Uses `process.env.DATABASE_NAME || process.env.PGDATABASE || 'railway'`
- ✅ `device-service` - Uses `process.env.DATABASE_NAME || process.env.PGDATABASE || 'railway'`

## 📋 Railway Environment Variables Checklist

### For Each Service, Verify These Variables Are Set:

#### 1. PostgreSQL Connection (Use Service References)
```env
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
```

**OR** Railway may auto-provide these as:
```env
PGHOST
PGPORT
PGDATABASE
PGUSER
PGPASSWORD
```

#### 2. JWT Configuration (Same for ALL services)
```env
JWT_SECRET=e0145426455c4529060cd5272701e97d5f87fbfe9a45e003410c0fe76fb3506a3b42900c9f85a775a3b85546ff1c5c31924922d27f455e4da80210e4ce4778ac
JWT_EXPIRY=24h
```

#### 3. Service-Specific Variables

**API Gateway:**
```env
NODE_ENV=production
PORT=3000
AUTH_SERVICE_URL=${{auth-service.RAILWAY_PUBLIC_DOMAIN}}
CONTENT_SERVICE_URL=${{content-service.RAILWAY_PUBLIC_DOMAIN}}
TEMPLATE_SERVICE_URL=${{template-service.RAILWAY_PUBLIC_DOMAIN}}
SCHEDULING_SERVICE_URL=${{scheduling-service.RAILWAY_PUBLIC_DOMAIN}}
DEVICE_SERVICE_URL=${{device-service.RAILWAY_PUBLIC_DOMAIN}}
CORS_ORIGIN=${{frontend.RAILWAY_PUBLIC_DOMAIN}}
```

**Auth Service:**
```env
NODE_ENV=production
PORT=3001
```

**Content Service:**
```env
NODE_ENV=production
PORT=3002
UPLOAD_DIR=/app/storage
```

**Template Service:**
```env
NODE_ENV=production
PORT=3003
```

**Scheduling Service:**
```env
NODE_ENV=production
PORT=3004
```

**Device Service:**
```env
NODE_ENV=production
PORT=3005
```

**Frontend:**
```env
NODE_ENV=production
VITE_API_URL=${{api-gateway.RAILWAY_PUBLIC_DOMAIN}}
```

## 🔍 Verification Steps

### Step 1: Push Code to GitHub
```bash
git push origin main
```

### Step 2: Verify Railway Auto-Deploy
- Railway should automatically detect the push and start deploying
- Check Railway dashboard for deployment status

### Step 3: Verify Database Connection
For each service, check logs for:
- ✅ "Database connected successfully"
- ❌ If you see "password authentication failed" → Database variables not set correctly
- ❌ If you see "database 'digital_signage' does not exist" → Service is using wrong database name

### Step 4: Verify Environment Variables
In Railway dashboard for each service:
1. Go to **Settings** → **Variables**
2. Verify `DATABASE_NAME` is set to `${{Postgres.PGDATABASE}}` OR
3. Verify `PGDATABASE` is available (Railway auto-provides this)

### Step 5: Test Create Playlist
1. Log in to the application
2. Navigate to Playlists page
3. Click "Create Playlist"
4. Fill in:
   - Playlist name (required)
   - Property (if super_admin)
   - Zone (if property_admin)
5. Click "Create Playlist"
6. Verify playlist is created successfully

## 🐛 Troubleshooting

### Issue: "password authentication failed"
**Solution**: Verify database connection variables are set using service references:
- `DATABASE_HOST=${{Postgres.PGHOST}}`
- `DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}`
- etc.

### Issue: "database 'digital_signage' does not exist"
**Solution**: This means service is using local database name. Verify:
- `DATABASE_NAME` is set to `${{Postgres.PGDATABASE}}` OR
- `PGDATABASE` is available (Railway auto-provides this)

### Issue: "403 Forbidden" when creating playlist
**Solution**: Verify `JWT_SECRET` is the same for all services:
- auth-service
- content-service
- template-service
- scheduling-service
- device-service
- api-gateway

### Issue: Services not deploying
**Solution**: 
1. Check Railway dashboard for build errors
2. Verify `railway.json` or service configuration is correct
3. Check service logs for errors

## 📝 Notes

- **Database Name**: Railway's PostgreSQL uses `'railway'` as the default database name
- **Service References**: Use `${{ServiceName.VARIABLE}}` syntax in Railway
- **Auto-Deploy**: Railway automatically deploys when code is pushed to the connected branch
- **Local vs Production**: Local uses `digital_signage`, Production uses `railway` (via PGDATABASE)

## ✅ Deployment Complete When:

1. ✅ Code pushed to GitHub
2. ✅ All services deployed successfully in Railway
3. ✅ All services connected to Railway PostgreSQL database
4. ✅ Create Playlist functionality works in production
5. ✅ No authentication errors in logs
6. ✅ No database connection errors in logs
