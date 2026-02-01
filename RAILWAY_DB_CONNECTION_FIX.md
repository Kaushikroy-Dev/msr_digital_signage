# 🔧 Railway Database Connection Fix - Device Service

## ❌ Issue

Device service is crashing with:
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

But the service might not be receiving them correctly, or Railway service references might not be set up.

## ✅ Solution Applied

1. **Updated code** to support both `PG*` and `DATABASE_*` variables ✅
2. **Added debug logging** to see what environment variables are available ✅

## 🔧 How to Fix in Railway Dashboard

### Step 1: Verify PostgreSQL Service is Created

1. Go to Railway dashboard
2. Check if you have a **PostgreSQL** service
3. If not, create one: **"+ New"** → **"Database"** → **"Add PostgreSQL"**

### Step 2: Link PostgreSQL to Device Service

1. Click on **device-service**
2. Go to **Settings** → **Variables**
3. Check if Railway automatically added PostgreSQL variables
4. If not, add them manually using service references:

```env
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
```

**OR** Railway should automatically provide:
- `PGHOST`
- `PGPORT`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`

### Step 3: Check Debug Logs

After redeploy, check the logs. You should see:
```
🔍 Database Config: {
  host: '...',
  port: 5432,
  database: '...',
  user: '...',
  passwordSet: true,
  passwordLength: ...,
  envVars: {
    hasDATABASE_HOST: true/false,
    hasPGHOST: true/false,
    ...
  }
}
```

This will tell you:
- Which environment variables are available
- What values are being used
- If password is set correctly

### Step 4: Verify Service References

In Railway, when you add a PostgreSQL database:
1. Railway automatically creates service references
2. Other services can reference them using: `${{Postgres.PGHOST}}`
3. Or Railway automatically injects `PG*` variables

## 📋 Quick Checklist

- [ ] PostgreSQL service exists in Railway
- [ ] Device service is linked to PostgreSQL (or using service references)
- [ ] Environment variables are set (check Settings → Variables)
- [ ] Check debug logs to see what env vars are available
- [ ] Verify password is not empty

## 🚀 Next Steps

1. **Check Railway Dashboard**:
   - Verify PostgreSQL service exists
   - Check device-service environment variables
   - Ensure service references are set up

2. **Check Logs**:
   - Look for the debug output showing database config
   - See which environment variables are available
   - Verify password is set

3. **If Still Failing**:
   - Manually set environment variables using service references
   - Or use Railway's automatic `PG*` variables
   - Check that PostgreSQL service is running

---

**Status**: ✅ Code updated with debug logging. Check Railway dashboard to ensure PostgreSQL is linked correctly.
