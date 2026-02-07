# ✅ Railway Deployment - Complete Setup Guide

## 🎯 Current Status

✅ **Railway CLI Connected**
- Logged in as: kaushik_roy@msrlimited.com
- Project: considerate-vitality
- Project URL: https://railway.com/project/1d8d96b3-9998-4524-85c3-616678aa8773

✅ **API Gateway Deployed**
- Service created and building

🔄 **Other Services**
- Services detected by Railway
- Need to be configured via Railway Dashboard

## 🚀 Complete Deployment via Railway Web UI

### Step 1: Open Railway Dashboard

Visit: https://railway.com/project/1d8d96b3-9998-4524-85c3-616678aa8773

Or run: `npx @railway/cli open`

### Step 2: Verify/Create Services

In the Railway dashboard, you should see services. For any missing services:

1. Click **"+ New"**
2. Select **"GitHub Repo"**
3. Choose: `Kaushikroy-Dev/msr_digital_signage`
4. Configure each service:

| Service | Root Directory | Build Command | Start Command |
|---------|---------------|---------------|---------------|
| api-gateway | `services/api-gateway` | `npm install` | `npm start` |
| auth-service | `services/auth-service` | `npm install` | `npm start` |
| content-service | `services/content-service` | `npm install` | `npm start` |
| template-service | `services/template-service` | `npm install` | `npm start` |
| scheduling-service | `services/scheduling-service` | `npm install` | `npm start` |
| device-service | `services/device-service` | `npm install` | `npm start` |
| frontend | `frontend` | `npm install && npm run build` | `npm run preview` |

### Step 3: Add PostgreSQL Database

1. Click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Wait for provisioning (1-2 minutes)
4. Railway will automatically provide connection variables

### Step 4: Set Environment Variables

For each service, go to **Settings** → **Variables** → **"New Variable"**

#### API Gateway Variables:
```
NODE_ENV=production
PORT=3000
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
AUTH_SERVICE_URL=${{auth-service.RAILWAY_PUBLIC_DOMAIN}}
CONTENT_SERVICE_URL=${{content-service.RAILWAY_PUBLIC_DOMAIN}}
TEMPLATE_SERVICE_URL=${{template-service.RAILWAY_PUBLIC_DOMAIN}}
SCHEDULING_SERVICE_URL=${{scheduling-service.RAILWAY_PUBLIC_DOMAIN}}
DEVICE_SERVICE_URL=${{device-service.RAILWAY_PUBLIC_DOMAIN}}
JWT_SECRET=e0145426455c4529060cd5272701e97d5f87fbfe9a45e003410c0fe76fb3506a3b42900c9f85a775a3b85546ff1c5c31924922d27f455e4da80210e4ce4778ac
JWT_EXPIRY=24h
CORS_ORIGIN=${{frontend.RAILWAY_PUBLIC_DOMAIN}}
```

#### Auth Service Variables:
```
NODE_ENV=production
PORT=3001
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
JWT_SECRET=e0145426455c4529060cd5272701e97d5f87fbfe9a45e003410c0fe76fb3506a3b42900c9f85a775a3b85546ff1c5c31924922d27f455e4da80210e4ce4778ac
JWT_EXPIRY=24h
```

#### Content Service Variables:
```
NODE_ENV=production
PORT=3002
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
UPLOAD_DIR=/app/storage
```

#### Template Service Variables:
```
NODE_ENV=production
PORT=3003
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
JWT_SECRET=e0145426455c4529060cd5272701e97d5f87fbfe9a45e003410c0fe76fb3506a3b42900c9f85a775a3b85546ff1c5c31924922d27f455e4da80210e4ce4778ac
```

#### Scheduling Service Variables:
```
NODE_ENV=production
PORT=3004
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
JWT_SECRET=e0145426455c4529060cd5272701e97d5f87fbfe9a45e003410c0fe76fb3506a3b42900c9f85a775a3b85546ff1c5c31924922d27f455e4da80210e4ce4778ac
```

#### Device Service Variables:
```
NODE_ENV=production
PORT=3005
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
JWT_SECRET=e0145426455c4529060cd5272701e97d5f87fbfe9a45e003410c0fe76fb3506a3b42900c9f85a775a3b85546ff1c5c31924922d27f455e4da80210e4ce4778ac
```

#### Frontend Variables:
```
NODE_ENV=production
VITE_API_URL=${{api-gateway.RAILWAY_PUBLIC_DOMAIN}}
```

**Important Notes:**
- Use Railway's service references: `${{Postgres.PGHOST}}`, `${{service-name.RAILWAY_PUBLIC_DOMAIN}}`
- These references are available after services are deployed
- Update `VITE_API_URL` in frontend after API Gateway gets a domain

### Step 5: Run Database Migrations

After PostgreSQL is ready:

1. Go to PostgreSQL service in Railway
2. Click **"Connect"** → **"PostgreSQL"**
3. Copy the connection string
4. Run migrations:

```bash
# Option 1: Using Railway's PostgreSQL web interface
# Go to PostgreSQL service → Connect → Use the SQL editor

# Option 2: Using psql locally
psql $DATABASE_URL -f database/schema.sql

# Run all migrations
for file in database/migrations/*.sql; do
    psql $DATABASE_URL -f "$file"
done
```

### Step 6: Generate Domains

For each service:
1. Click on the service
2. Go to **Settings** → **Networking**
3. Click **"Generate Domain"**
4. Copy the domain
5. Update `VITE_API_URL` in frontend to use API Gateway's domain
6. Update `CORS_ORIGIN` in API Gateway to use frontend's domain

### Step 7: Verify Deployment

1. **Check API Gateway Health:**
   ```
   https://your-api-gateway-domain.railway.app/health
   ```
   Should return: `{"status":"healthy","timestamp":"..."}`

2. **Check Frontend:**
   ```
   https://your-frontend-domain.railway.app
   ```
   Should load the login page

3. **Check Service Logs:**
   - Go to each service → **"Logs"** tab
   - Verify no errors
   - Check for successful startup messages

## ✅ Final Checklist

- [ ] All 7 services deployed
- [ ] PostgreSQL database added
- [ ] Environment variables set for all services
- [ ] JWT_SECRET added to all services
- [ ] Database migrations run
- [ ] Service domains generated
- [ ] Frontend VITE_API_URL updated
- [ ] API Gateway CORS_ORIGIN updated
- [ ] Health check passing
- [ ] Frontend accessible

## 🆘 Troubleshooting

**Service won't start?**
- Check logs in Railway dashboard
- Verify all environment variables are set
- Ensure database is accessible

**Can't connect to database?**
- Verify PostgreSQL service is running
- Check environment variables use Railway references: `${{Postgres.*}}`
- Ensure database migrations are run

**Services can't communicate?**
- Use Railway service references: `${{service-name.RAILWAY_PUBLIC_DOMAIN}}`
- Verify all services are deployed
- Check service URLs in environment variables
- Wait a few minutes for domains to propagate

**Frontend can't connect to API?**
- Verify `VITE_API_URL` is set correctly
- Check API Gateway domain is accessible
- Verify CORS settings in API Gateway

## 📞 Quick Commands

```bash
# Open Railway dashboard
npx @railway/cli open

# View service logs
npx @railway/cli logs

# Check service status
npx @railway/cli status

# Connect to PostgreSQL
npx @railway/cli connect postgres
```

---

**Status**: 🚀 Ready for final configuration - Complete setup via Railway Dashboard
