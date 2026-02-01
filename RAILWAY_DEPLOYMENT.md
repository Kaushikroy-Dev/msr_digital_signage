# Railway Deployment Guide

This guide will help you deploy the Digital Signage Platform to Railway.

## Prerequisites

1. Railway account (sign up at https://railway.app)
2. GitHub repository connected
3. Railway CLI installed (optional but recommended)

## Quick Start

### Option 1: Using Railway Web UI (Recommended for First Time)

1. Go to https://railway.app and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository: `Kaushikroy-Dev/msr_digital_signage`
4. Railway will detect the services automatically

### Option 2: Using Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link to existing project or create new
railway link

# Deploy
railway up
```

## Service Deployment Order

Deploy services in this order:

1. **PostgreSQL Database** (Railway managed service)
2. **Redis** (Optional - Railway managed or external)
3. **API Gateway**
4. **Auth Service**
5. **Content Service**
6. **Template Service**
7. **Scheduling Service**
8. **Device Service**
9. **Frontend**

## Environment Variables Setup

### Step 1: Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Save this value - you'll use it for all services.

### Step 2: Set Environment Variables

For each service, set the environment variables as shown in `.railway.env.template`.

**Important**: Use Railway's service references:
- `${{Postgres.PGHOST}}` for database host
- `${{service-name.RAILWAY_PUBLIC_DOMAIN}}` for service URLs

## Database Migrations

After PostgreSQL is deployed:

1. Get connection string from Railway PostgreSQL service
2. Run migrations:

```bash
# Using psql
psql $DATABASE_URL -f database/schema.sql
psql $DATABASE_URL -f database/migrations/*.sql

# Or use Railway's PostgreSQL web interface
```

## Service Configuration

### API Gateway

- **Root Directory**: `services/api-gateway`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Port**: 3000

### Auth Service

- **Root Directory**: `services/auth-service`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Port**: 3001

### Content Service

- **Root Directory**: `services/content-service`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Port**: 3002

### Template Service

- **Root Directory**: `services/template-service`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Port**: 3003

### Scheduling Service

- **Root Directory**: `services/scheduling-service`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Port**: 3004

### Device Service

- **Root Directory**: `services/device-service`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Port**: 3005

### Frontend

- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run preview`
- **Environment**: Set `VITE_API_URL` to API Gateway's public domain

## Custom Domains

1. For each service, go to Settings → Generate Domain
2. Update `VITE_API_URL` in frontend to use API Gateway domain
3. Update CORS settings in API Gateway

## Troubleshooting

### Service Won't Start
- Check logs in Railway dashboard
- Verify all environment variables are set
- Ensure database is accessible

### Database Connection Issues
- Verify PostgreSQL service is running
- Check environment variables match Railway's provided values
- Ensure network access is enabled

### Services Can't Communicate
- Use Railway service references: `${{service-name.RAILWAY_PUBLIC_DOMAIN}}`
- Verify all services are deployed
- Check service URLs in environment variables

## Monitoring

- View logs: Railway dashboard → Service → Logs
- Monitor metrics: Railway dashboard → Service → Metrics
- Check health: Visit `/health` endpoint on API Gateway

## Next Steps

After deployment:
1. Run database migrations
2. Create initial admin user
3. Test API endpoints
4. Configure custom domains
5. Set up monitoring alerts
