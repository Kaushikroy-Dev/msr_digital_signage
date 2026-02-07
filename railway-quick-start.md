# Railway Quick Start Guide

## 🚀 Fast Deployment Steps

### Step 1: Create Railway Account & Project

1. Go to https://railway.app
2. Sign in with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose: `Kaushikroy-Dev/msr_digital_signage`
6. Click **"Deploy Now"**

### Step 2: Add PostgreSQL Database

1. In Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Wait for it to provision
4. Note the connection variables (you'll need them)

### Step 3: Add Services (Repeat for each)

For each service below, click **"+ New"** → **"GitHub Repo"** → Select your repo:

#### API Gateway
- **Name**: `api-gateway`
- **Root Directory**: `services/api-gateway`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

#### Auth Service
- **Name**: `auth-service`
- **Root Directory**: `services/auth-service`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

#### Content Service
- **Name**: `content-service`
- **Root Directory**: `services/content-service`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

#### Template Service
- **Name**: `template-service`
- **Root Directory**: `services/template-service`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

#### Scheduling Service
- **Name**: `scheduling-service`
- **Root Directory**: `services/scheduling-service`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

#### Device Service
- **Name**: `device-service`
- **Root Directory**: `services/device-service`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

#### Frontend
- **Name**: `frontend`
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run preview`

### Step 4: Generate JWT Secret

Run this locally:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Save the output - you'll use it for all services.

### Step 5: Set Environment Variables

For each service, go to **Settings** → **Variables** and add:

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
JWT_SECRET=<your-generated-secret>
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
JWT_SECRET=<same-as-api-gateway>
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
JWT_SECRET=<same-as-api-gateway>
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
JWT_SECRET=<same-as-api-gateway>
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
JWT_SECRET=<same-as-api-gateway>
```

#### Frontend Variables:
```
NODE_ENV=production
VITE_API_URL=${{api-gateway.RAILWAY_PUBLIC_DOMAIN}}
```

**Important**: Replace `<same-as-api-gateway>` and `<your-generated-secret>` with your actual JWT secret.

### Step 6: Run Database Migrations

1. Get PostgreSQL connection string from Railway
2. Run migrations:

```bash
# Option 1: Using Railway's PostgreSQL web interface
# Go to PostgreSQL service → Connect → Use the connection string

# Option 2: Using psql locally
psql $DATABASE_URL -f database/schema.sql
psql $DATABASE_URL -f database/migrations/*.sql
```

### Step 7: Generate Domains

For each service:
1. Click on the service
2. Go to **Settings** → **Generate Domain**
3. Update `VITE_API_URL` in frontend to use API Gateway domain

### Step 8: Test Deployment

1. Visit frontend domain
2. Check API Gateway: `https://your-api-gateway-domain.railway.app/health`
3. View logs in Railway dashboard

## ✅ Checklist

- [ ] Railway project created
- [ ] PostgreSQL database added
- [ ] All 7 services deployed
- [ ] Environment variables set
- [ ] JWT_SECRET generated and added
- [ ] Database migrations run
- [ ] Domains generated
- [ ] Frontend accessible
- [ ] API Gateway health check passes

## 🆘 Troubleshooting

**Service won't start?**
- Check logs in Railway dashboard
- Verify all environment variables are set
- Ensure database is accessible

**Can't connect to database?**
- Verify PostgreSQL service is running
- Check environment variables match Railway's values
- Ensure `${{Postgres.*}}` references are correct

**Services can't communicate?**
- Use Railway service references: `${{service-name.RAILWAY_PUBLIC_DOMAIN}}`
- Verify all services are deployed
- Check service URLs in environment variables
