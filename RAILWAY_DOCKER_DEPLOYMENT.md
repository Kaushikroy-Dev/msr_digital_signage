# 🚀 Railway Deployment with Docker

Complete guide to deploy your Digital Signage Platform to Railway using Docker.

## ✅ Prerequisites

1. Railway account: https://railway.app (you already have one ✅)
2. GitHub repo: `Kaushikroy-Dev/msr_digital_signage` ✅
3. All Dockerfiles are production-ready ✅

## 🎯 What Changed

- ✅ All `railway.json` files updated to use `DOCKERFILE` instead of `NIXPACKS`
- ✅ All services configured to use their Dockerfiles
- ✅ Root `railway.json` updated for Docker builds

## 📋 Step-by-Step Deployment

### Step 1: Link Your Project to Railway

If not already linked:

```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link
```

Or use Railway dashboard:
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose: `Kaushikroy-Dev/msr_digital_signage`

### Step 2: Add PostgreSQL Database

1. In Railway dashboard, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Wait for provisioning (1-2 minutes)
4. **Save connection details**:
   - Railway provides these automatically as environment variables:
     - `PGHOST`
     - `PGPORT`
     - `PGDATABASE`
     - `PGUSER`
     - `PGPASSWORD`

### Step 3: Add Redis (Optional but Recommended)

1. Click **"+ New"**
2. Select **"Database"** → **"Add Redis"**
3. Wait for provisioning
4. **Save connection details**:
   - `REDIS_HOST`
   - `REDIS_PORT`
   - `REDIS_PASSWORD` (if set)

### Step 4: Create Services

Railway should auto-detect services from your repo. If not, create them manually:

#### 4.1 API Gateway

1. Click **"+ New"** → **"GitHub Repo"**
2. Select: `Kaushikroy-Dev/msr_digital_signage`
3. Set **Root Directory**: `services/api-gateway`
4. Railway will detect `railway.json` and use Dockerfile

#### 4.2 Auth Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select: `Kaushikroy-Dev/msr_digital_signage`
3. Set **Root Directory**: `services/auth-service`

#### 4.3 Content Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select: `Kaushikroy-Dev/msr_digital_signage`
3. Set **Root Directory**: `services/content-service`

#### 4.4 Template Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select: `Kaushikroy-Dev/msr_digital_signage`
3. Set **Root Directory**: `services/template-service`

#### 4.5 Scheduling Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select: `Kaushikroy-Dev/msr_digital_signage`
3. Set **Root Directory**: `services/scheduling-service`

#### 4.6 Device Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select: `Kaushikroy-Dev/msr_digital_signage`
3. Set **Root Directory**: `services/device-service`

#### 4.7 Frontend

1. Click **"+ New"** → **"GitHub Repo"**
2. Select: `Kaushikroy-Dev/msr_digital_signage`
3. Set **Root Directory**: `frontend`

#### 4.8 Media Processor Worker (Optional)

1. Click **"+ New"** → **"GitHub Repo"**
2. Select: `Kaushikroy-Dev/msr_digital_signage`
3. Set **Root Directory**: `workers/media-processor`

### Step 5: Configure Environment Variables

For each service, go to **Settings** → **Variables** → **"New Variable"**

#### API Gateway Variables

```env
NODE_ENV=production
PORT=3000
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
RABBITMQ_HOST=<your-rabbitmq-host>
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASS=guest
AUTH_SERVICE_URL=${{auth-service.RAILWAY_PRIVATE_DOMAIN}}
CONTENT_SERVICE_URL=${{content-service.RAILWAY_PRIVATE_DOMAIN}}
TEMPLATE_SERVICE_URL=${{template-service.RAILWAY_PRIVATE_DOMAIN}}
SCHEDULING_SERVICE_URL=${{scheduling-service.RAILWAY_PRIVATE_DOMAIN}}
DEVICE_SERVICE_URL=${{device-service.RAILWAY_PRIVATE_DOMAIN}}
CORS_ORIGIN=${{frontend.RAILWAY_PUBLIC_DOMAIN}}
JWT_SECRET=7c45fbc61aa4d22b440e4d4a16ca0698f1a9c26b5f1af59dce79846032f8efd3aeaf88da99553322e2860940165123fcad885894ea4b0e9620b974a06ad942b9
JWT_EXPIRY=24h
```

#### Auth Service Variables

```env
NODE_ENV=production
PORT=3001
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
JWT_SECRET=7c45fbc61aa4d22b440e4d4a16ca0698f1a9c26b5f1af59dce79846032f8efd3aeaf88da99553322e2860940165123fcad885894ea4b0e9620b974a06ad942b9
JWT_EXPIRY=24h
```

#### Content Service Variables

```env
NODE_ENV=production
PORT=3002
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
RABBITMQ_HOST=<your-rabbitmq-host>
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASS=guest
UPLOAD_DIR=/app/storage
JWT_SECRET=7c45fbc61aa4d22b440e4d4a16ca0698f1a9c26b5f1af59dce79846032f8efd3aeaf88da99553322e2860940165123fcad885894ea4b0e9620b974a06ad942b9
```

#### Template Service Variables

```env
NODE_ENV=production
PORT=3003
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
JWT_SECRET=7c45fbc61aa4d22b440e4d4a16ca0698f1a9c26b5f1af59dce79846032f8efd3aeaf88da99553322e2860940165123fcad885894ea4b0e9620b974a06ad942b9
```

#### Scheduling Service Variables

```env
NODE_ENV=production
PORT=3004
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
JWT_SECRET=7c45fbc61aa4d22b440e4d4a16ca0698f1a9c26b5f1af59dce79846032f8efd3aeaf88da99553322e2860940165123fcad885894ea4b0e9620b974a06ad942b9
```

#### Device Service Variables

```env
NODE_ENV=production
PORT=3005
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
RABBITMQ_HOST=<your-rabbitmq-host>
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASS=guest
JWT_SECRET=7c45fbc61aa4d22b440e4d4a16ca0698f1a9c26b5f1af59dce79846032f8efd3aeaf88da99553322e2860940165123fcad885894ea4b0e9620b974a06ad942b9
```

#### Frontend Variables

```env
VITE_API_URL=${{api-gateway.RAILWAY_PUBLIC_DOMAIN}}
```

#### Media Processor Variables

```env
NODE_ENV=production
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
RABBITMQ_HOST=<your-rabbitmq-host>
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASS=guest
```

### Step 6: Add RabbitMQ

Railway doesn't provide RabbitMQ as a managed service. Options:

**Option A: CloudAMQP (Free tier)**
1. Go to https://www.cloudamqp.com
2. Sign up (free tier: 1M messages/month)
3. Create instance
4. Copy connection URL
5. Use the host, port, user, and password in your environment variables

**Option B: Deploy RabbitMQ as a Railway Service**
- Create a new service with RabbitMQ Docker image
- Or skip RabbitMQ if not critical for your use case

### Step 7: Verify Docker Configuration

For each service, verify Railway is using Docker:

1. Go to service → **Settings** → **Build**
2. Check that:
   - **Builder**: `DOCKERFILE`
   - **Dockerfile Path**: `Dockerfile` (or relative path)
3. If not, change it manually

### Step 8: Deploy Services

1. **Automatic**: Railway will auto-deploy on git push
2. **Manual**: Click **"Deploy"** button for each service
3. Monitor build logs for each service

### Step 9: Initialize Database

1. Get PostgreSQL connection string from Railway dashboard
2. Connect using Railway's PostgreSQL web interface or CLI:

```bash
# Using Railway CLI
railway connect postgres

# Or use psql
psql $DATABASE_URL
```

3. Run schema:
```sql
\i database/schema.sql
```

4. Run migrations:
```sql
\i database/migrations/add_device_is_playing.sql
\i database/migrations/add_template_versioning.sql
\i database/migrations/add_template_sharing.sql
\i database/migrations/add_template_variables.sql
\i database/migrations/add_template_categories_tags.sql
\i database/migrations/add_widget_settings.sql
\i database/migrations/add_property_zone_content_isolation.sql
\i database/migrations/add_data_binding.sql
\i database/migrations/002_rbac_enhancement.sql
```

5. Seed data (optional):
```sql
\i database/seed.sql
```

### Step 10: Test Deployment

1. Get frontend URL from Railway dashboard
2. Visit the URL
3. Login with:
   - Email: `demo@example.com`
   - Password: `password123`

## 🔧 Troubleshooting

### Build Fails with "Dockerfile not found"

**Solution**: 
- Verify `railway.json` has correct `dockerfilePath`
- Check that Dockerfile exists in the service directory
- Ensure Root Directory is set correctly in Railway

### Services Can't Connect to Database

**Solution**:
- Verify environment variables use Railway service references: `${{Postgres.PGHOST}}`
- Check that PostgreSQL service is running
- Verify database credentials

### Services Can't Communicate

**Solution**:
- Use `RAILWAY_PRIVATE_DOMAIN` for internal service communication
- Use `RAILWAY_PUBLIC_DOMAIN` for external access
- Check that service URLs are correct

### Docker Build Takes Too Long

**Solution**:
- Railway caches Docker layers
- First build will be slower
- Subsequent builds should be faster

## 💰 Cost

**Free Tier**:
- $5 credit/month
- Pay only for what you use beyond free tier
- PostgreSQL: Included in free tier
- Redis: Included in free tier
- Services: Pay per usage

## ✅ Verification Checklist

- [ ] All services created in Railway
- [ ] PostgreSQL database added
- [ ] Redis added (optional)
- [ ] RabbitMQ configured (CloudAMQP or Railway service)
- [ ] All environment variables set
- [ ] All services using Docker (check Settings → Build)
- [ ] All services deployed successfully
- [ ] Database initialized (schema + migrations)
- [ ] Frontend accessible
- [ ] API Gateway responding
- [ ] Can login to application

## 🚀 Next Steps

1. Push your code to GitHub (Railway will auto-deploy)
2. Monitor build logs
3. Test all services
4. Set up custom domains (optional)

---

**Status**: ✅ Ready to deploy! All services configured for Docker builds.
