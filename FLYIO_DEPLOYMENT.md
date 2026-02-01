# 🚀 Fly.io Deployment Guide (FREE TIER)

Fly.io offers the **best free tier** for deploying your Digital Signage Platform.

## ✅ Why Fly.io?

- ✅ **FREE tier**: 3 shared VMs, 160GB outbound data/month
- ✅ Excellent Docker support
- ✅ Perfect for microservices
- ✅ Global edge network
- ✅ Easy deployment

## 📋 Prerequisites

1. Fly.io account: https://fly.io (sign up - free)
2. Fly CLI installed (I'll help with this)
3. GitHub repo: `Kaushikroy-Dev/msr_digital_signage` ✅

## 🚀 Step-by-Step Deployment

### Step 1: Install Fly CLI

```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Or using Homebrew
brew install flyctl

# Verify installation
fly version
```

### Step 2: Login to Fly.io

```bash
fly auth login
```

This will open a browser for authentication.

### Step 3: Create Fly Apps

I'll create `fly.toml` files for each service. For now, let's create the apps:

```bash
# Create apps for each service
fly apps create api-gateway
fly apps create auth-service
fly apps create content-service
fly apps create template-service
fly apps create scheduling-service
fly apps create device-service
fly apps create frontend
fly apps create media-processor
```

### Step 4: Add PostgreSQL (Managed)

Fly.io doesn't have managed PostgreSQL, so we'll use:

**Option A: Supabase (FREE)**
- Sign up: https://supabase.com
- Create project
- Get connection string

**Option B: Railway PostgreSQL (FREE)**
- Use your existing Railway account
- Create PostgreSQL service
- Get connection string

**Option C: Deploy PostgreSQL on Fly.io**
- I'll create a fly.toml for PostgreSQL

### Step 5: Add Redis (Managed)

**Option A: Upstash Redis (FREE)**
- Sign up: https://upstash.com
- Create Redis database
- Get connection string

**Option B: Deploy Redis on Fly.io**
- I'll create a fly.toml for Redis

### Step 6: Add RabbitMQ

**Option A: CloudAMQP (FREE)**
- Sign up: https://www.cloudamqp.com
- Create instance (free tier: 1M messages/month)
- Get connection URL

**Option B: Deploy RabbitMQ on Fly.io**
- I'll create a fly.toml for RabbitMQ

### Step 7: Deploy Services

Once I create the `fly.toml` files, deploy each service:

```bash
# Deploy API Gateway
cd services/api-gateway
fly deploy

# Deploy Auth Service
cd ../auth-service
fly deploy

# Deploy Content Service
cd ../content-service
fly deploy

# Deploy Template Service
cd ../template-service
fly deploy

# Deploy Scheduling Service
cd ../scheduling-service
fly deploy

# Deploy Device Service
cd ../device-service
fly deploy

# Deploy Frontend
cd ../../frontend
fly deploy

# Deploy Media Processor
cd ../workers/media-processor
fly deploy
```

## 📝 Configuration Files Needed

I'll create:
- `services/api-gateway/fly.toml`
- `services/auth-service/fly.toml`
- `services/content-service/fly.toml`
- `services/template-service/fly.toml`
- `services/scheduling-service/fly.toml`
- `services/device-service/fly.toml`
- `frontend/fly.toml`
- `workers/media-processor/fly.toml`

## 🔧 Environment Variables

Set secrets for each service:

```bash
# API Gateway
fly secrets set -a api-gateway \
  NODE_ENV=production \
  PORT=3000 \
  DATABASE_HOST=<postgres-host> \
  DATABASE_PORT=5432 \
  DATABASE_NAME=digital_signage \
  DATABASE_USER=<user> \
  DATABASE_PASSWORD=<password> \
  REDIS_HOST=<redis-host> \
  REDIS_PORT=6379 \
  RABBITMQ_HOST=<rabbitmq-host> \
  RABBITMQ_PORT=5672 \
  RABBITMQ_USER=<user> \
  RABBITMQ_PASS=<password> \
  JWT_SECRET=<your-jwt-secret> \
  JWT_EXPIRY=24h

# Repeat for other services...
```

## 💰 Cost

**FREE Tier Includes:**
- 3 shared VMs
- 160GB outbound data/month
- 3GB persistent storage
- **Total: $0/month** ✅

**If you exceed free tier:**
- Pay only for what you use
- Very affordable pricing

## ✅ Next Steps

1. Install Fly CLI
2. Login to Fly.io
3. I'll create all `fly.toml` files
4. Deploy services
5. Set environment variables
6. Test deployment

---

**Status**: Ready to set up! 🚀
