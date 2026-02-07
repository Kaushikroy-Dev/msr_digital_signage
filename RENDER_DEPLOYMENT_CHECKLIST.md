# ✅ Render.com Deployment Checklist

Use this checklist to ensure a smooth deployment to Render.com.

## 📋 Pre-Deployment

- [ ] All Dockerfiles updated to use `npm start` (production commands)
- [ ] All services have `npm start` script in package.json
- [ ] `render.yaml` file created (optional - can use Blueprint instead)
- [ ] Environment variables template ready (`.render.env.template`)

## 🚀 Step 1: Render.com Setup

- [ ] Sign up for Render.com account: https://render.com
- [ ] Connect GitHub account to Render
- [ ] Verify repository access: `Kaushikroy-Dev/msr_digital_signage`

## 🗄️ Step 2: Create Managed Services

### PostgreSQL Database
- [ ] Click "New +" → "PostgreSQL"
- [ ] Name: `digital-signage-db`
- [ ] Plan: **Free** (or Starter for production)
- [ ] Click "Create Database"
- [ ] **Save connection details** (host, port, database, user, password)

### Redis Cache
- [ ] Click "New +" → "Redis"
- [ ] Name: `digital-signage-redis`
- [ ] Plan: **Free** (or Starter for production)
- [ ] Click "Create Redis"
- [ ] **Save connection details** (host, port)

### RabbitMQ
- [ ] **Option A**: Sign up for CloudAMQP (free tier): https://www.cloudamqp.com
  - [ ] Create instance
  - [ ] Copy connection URL
  - [ ] Save credentials (host, port, user, password)
- [ ] **Option B**: Deploy RabbitMQ as Web Service from docker-compose.yml

## 🏗️ Step 3: Deploy Application Services

### Option A: Use Blueprint (Easiest)
- [ ] Click "New +" → "Blueprint"
- [ ] Connect GitHub repo: `Kaushikroy-Dev/msr_digital_signage`
- [ ] Render auto-detects `docker-compose.yml`
- [ ] Review services
- [ ] Click "Apply"
- [ ] Wait for services to be created

### Option B: Manual Service Creation
- [ ] Create API Gateway service
- [ ] Create Auth Service
- [ ] Create Content Service
- [ ] Create Template Service
- [ ] Create Scheduling Service
- [ ] Create Device Service
- [ ] Create Frontend service
- [ ] Create Media Processor worker

## ⚙️ Step 4: Configure Environment Variables

### Generate JWT Secret
- [ ] Run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- [ ] **Save the output** - use for ALL services

### For Each Service, Set Environment Variables:

#### API Gateway
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `DATABASE_HOST` (from PostgreSQL service)
- [ ] `DATABASE_PORT=5432`
- [ ] `DATABASE_NAME` (from PostgreSQL service)
- [ ] `DATABASE_USER` (from PostgreSQL service)
- [ ] `DATABASE_PASSWORD` (from PostgreSQL service)
- [ ] `REDIS_HOST` (from Redis service)
- [ ] `REDIS_PORT=6379`
- [ ] `RABBITMQ_HOST` (from CloudAMQP)
- [ ] `RABBITMQ_PORT=5672`
- [ ] `RABBITMQ_USER` (from CloudAMQP)
- [ ] `RABBITMQ_PASS` (from CloudAMQP)
- [ ] `AUTH_SERVICE_URL` (internal URL from auth-service)
- [ ] `CONTENT_SERVICE_URL` (internal URL from content-service)
- [ ] `TEMPLATE_SERVICE_URL` (internal URL from template-service)
- [ ] `SCHEDULING_SERVICE_URL` (internal URL from scheduling-service)
- [ ] `DEVICE_SERVICE_URL` (internal URL from device-service)
- [ ] `CORS_ORIGIN` (frontend public URL)
- [ ] `JWT_SECRET` (generated value)
- [ ] `JWT_EXPIRY=24h`

#### Auth Service
- [ ] `NODE_ENV=production`
- [ ] `PORT=3001`
- [ ] `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`
- [ ] `REDIS_HOST`, `REDIS_PORT`
- [ ] `JWT_SECRET` (same as API Gateway)
- [ ] `JWT_EXPIRY=24h`

#### Content Service
- [ ] `NODE_ENV=production`
- [ ] `PORT=3002`
- [ ] Database variables
- [ ] Redis variables
- [ ] RabbitMQ variables
- [ ] `UPLOAD_DIR=/app/storage`
- [ ] `JWT_SECRET` (same as API Gateway)

#### Template Service
- [ ] `NODE_ENV=production`
- [ ] `PORT=3003`
- [ ] Database variables
- [ ] Redis variables
- [ ] `JWT_SECRET` (same as API Gateway)

#### Scheduling Service
- [ ] `NODE_ENV=production`
- [ ] `PORT=3004`
- [ ] Database variables
- [ ] Redis variables
- [ ] `JWT_SECRET` (same as API Gateway)

#### Device Service
- [ ] `NODE_ENV=production`
- [ ] `PORT=3005`
- [ ] Database variables
- [ ] Redis variables
- [ ] RabbitMQ variables
- [ ] `JWT_SECRET` (same as API Gateway)

#### Frontend
- [ ] `VITE_API_URL` (API Gateway public URL)

#### Media Processor Worker
- [ ] `NODE_ENV=production`
- [ ] Database variables
- [ ] RabbitMQ variables

## 🗄️ Step 5: Initialize Database

- [ ] Get PostgreSQL connection string from Render dashboard
- [ ] Connect to database (using psql or Render's web interface)
- [ ] Run schema: `\i database/schema.sql`
- [ ] Run migrations:
  - [ ] `database/migrations/add_device_is_playing.sql`
  - [ ] `database/migrations/add_template_versioning.sql`
  - [ ] `database/migrations/add_template_sharing.sql`
  - [ ] `database/migrations/add_template_variables.sql`
  - [ ] `database/migrations/add_template_categories_tags.sql`
  - [ ] `database/migrations/add_widget_settings.sql`
  - [ ] `database/migrations/add_property_zone_content_isolation.sql`
  - [ ] `database/migrations/add_data_binding.sql`
  - [ ] `database/migrations/002_rbac_enhancement.sql`
- [ ] Seed data (optional): `\i database/seed.sql`

## 🚀 Step 6: Deploy Services

- [ ] For each service, click "Manual Deploy" or wait for auto-deploy
- [ ] Monitor build logs for errors
- [ ] Wait for all services to be "Live"
- [ ] Check service health endpoints

## ✅ Step 7: Verify Deployment

- [ ] Get frontend URL from Render dashboard
- [ ] Visit frontend URL in browser
- [ ] Test login:
  - [ ] Email: `demo@example.com`
  - [ ] Password: `password123`
- [ ] Test API Gateway: `https://<api-gateway-url>/health`
- [ ] Test service connectivity
- [ ] Check service logs for errors

## 🔧 Step 8: Post-Deployment

- [ ] Update DNS (if using custom domain)
- [ ] Set up SSL certificates (Render handles automatically)
- [ ] Configure monitoring/alerts
- [ ] Set up backups for PostgreSQL
- [ ] Document service URLs

## 🐛 Troubleshooting

### Services Not Starting
- [ ] Check build logs in Render dashboard
- [ ] Verify environment variables are set correctly
- [ ] Check service dependencies (database, redis, etc.)
- [ ] Verify Dockerfiles are correct

### Database Connection Issues
- [ ] Verify PostgreSQL connection string
- [ ] Check database is accessible from services
- [ ] Verify DATABASE_HOST, DATABASE_PORT, etc. are correct
- [ ] Check firewall/network settings

### Frontend Not Loading
- [ ] Check VITE_API_URL is set correctly
- [ ] Verify API Gateway is running
- [ ] Check CORS_ORIGIN in API Gateway
- [ ] Check browser console for errors

### Service Communication Issues
- [ ] Verify service URLs are correct
- [ ] Check internal service discovery
- [ ] Verify network connectivity between services

## 📝 Notes

- **Service URLs**: Render provides both public and internal URLs
  - Use **internal URLs** for service-to-service communication
  - Use **public URLs** for frontend and external access

- **JWT Secret**: Generate once and use the same value for all services

- **Database Migrations**: Run migrations before deploying services that need the database

- **Free Tier Limits**: 
  - Services sleep after 15 minutes of inactivity (free tier)
  - Upgrade to paid plan for always-on services

---

**Status**: ✅ Ready for deployment!
