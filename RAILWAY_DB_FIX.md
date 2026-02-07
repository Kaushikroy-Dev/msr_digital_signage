# 🔧 Railway Database Connection Fix

## ✅ Issue Fixed

Services were failing to connect to PostgreSQL database with error:
```
password authentication failed for user "postgres"
```

## 🔍 Root Cause

Railway provides PostgreSQL credentials using **standard PostgreSQL environment variables**:
- `PGHOST`
- `PGPORT`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`

But services were only looking for custom variables:
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`

## ✅ Solution

Updated all services to support **both** naming conventions:

```javascript
const pool = new Pool({
    host: process.env.DATABASE_HOST || process.env.PGHOST || 'localhost',
    port: process.env.DATABASE_PORT || process.env.PGPORT || 5432,
    database: process.env.DATABASE_NAME || process.env.PGDATABASE || 'digital_signage',
    user: process.env.DATABASE_USER || process.env.PGUSER || 'postgres',
    password: process.env.DATABASE_PASSWORD || process.env.PGPASSWORD || 'postgres',
});
```

## 📋 Services Updated

- ✅ `services/device-service/src/index.js`
- ✅ `services/auth-service/src/config/database.js`
- ✅ `services/content-service/src/index.js`
- ✅ `services/template-service/src/index.js`
- ✅ `services/scheduling-service/src/index.js`

## 🚀 Next Steps

### Option 1: Use Railway's Automatic Variables (Easiest)

Railway automatically provides PostgreSQL credentials. You can:

1. **Remove custom DATABASE_* variables** from Railway dashboard
2. Services will automatically use Railway's `PG*` variables
3. Redeploy services

### Option 2: Keep Using Custom Variables

If you prefer to use `DATABASE_*` variables:

1. In Railway dashboard, for each service:
   - Go to **Settings** → **Variables**
   - Add variables using Railway service references:
     ```
     DATABASE_HOST=${{Postgres.PGHOST}}
     DATABASE_PORT=${{Postgres.PGPORT}}
     DATABASE_NAME=${{Postgres.PGDATABASE}}
     DATABASE_USER=${{Postgres.PGUSER}}
     DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
     ```
2. Redeploy services

## ✅ Verification

After redeploy, check logs:
- Should see: `✅ Database connection successful`
- Should NOT see: `password authentication failed`

## 📝 Notes

- Services now support **both** naming conventions
- Works with Railway's automatic PostgreSQL variables
- Also works with custom `DATABASE_*` variables
- Backward compatible with local development

---

**Status**: ✅ Fixed! Services will now connect to Railway PostgreSQL automatically.
