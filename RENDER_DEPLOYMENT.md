# 🚀 Render.com Deployment Guide (EASIEST OPTION)

This guide will deploy your Digital Signage Platform to Render.com using Docker Compose.

## ✅ Prerequisites

1. GitHub repo: `Kaushikroy-Dev/msr_digital_signage` (already done ✅)
2. Render.com account: https://render.com (sign up - free tier available)

## 📋 Step-by-Step Deployment

### Step 1: Create Render Account

1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub (easiest - connects your repo automatically)

### Step 2: Create New Blueprint

1. In Render dashboard, click **"New +"** → **"Blueprint"**
2. Connect GitHub repository: `Kaushikroy-Dev/msr_digital_signage`
3. Render will auto-detect your `docker-compose.yml`
4. Click **"Apply"**

### Step 3: Add Managed Services

Render will create services from your `docker-compose.yml`, but you need to add managed services:

#### 3.1 Add PostgreSQL

1. In Render dashboard, click **"New +"** → **"PostgreSQL"**
2. Name: `digital-signage-db`
3. Plan: **Free** (or Starter for production)
4. Click **"Create Database"**
5. **Save the connection string** - you'll need it!

#### 3.2 Add Redis

1. Click **"New +"** → **"Redis"**
2. Name: `digital-signage-redis`
3. Plan: **Free** (or Starter for production)
4. Click **"Create Redis"**
5. **Save the connection string**

#### 3.3 Add RabbitMQ (or use CloudAMQP)

**Option A: CloudAMQP (Free tier)**
1. Go to https://www.cloudamqp.com
2. Sign up (free tier: 1M messages/month)
3. Create instance
4. Copy connection URL

**Option B: Deploy RabbitMQ as Docker service on Render**
- Render will create it from docker-compose.yml

### Step 4: Configure Services

For each service created from docker-compose.yml:

#### API Gateway

1. Click on `api-gateway` service
2. Go to **"Environment"** tab
3. Add variables:
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_HOST=<from PostgreSQL service>
   DATABASE_PORT=5432
   DATABASE_NAME=<from PostgreSQL service>
   DATABASE_USER=<from PostgreSQL service>
   DATABASE_PASSWORD=<from PostgreSQL service>
   REDIS_HOST=<from Redis service>
   REDIS_PORT=6379
   RABBITMQ_HOST=<from RabbitMQ>
   RABBITMQ_PORT=5672
   RABBITMQ_USER=guest
   RABBITMQ_PASS=guest
   AUTH_SERVICE_URL=<auth-service internal URL>
   CONTENT_SERVICE_URL=<content-service internal URL>
   TEMPLATE_SERVICE_URL=<template-service internal URL>
   SCHEDULING_SERVICE_URL=<scheduling-service internal URL>
   DEVICE_SERVICE_URL=<device-service internal URL>
   CORS_ORIGIN=<frontend public URL>
   JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
   JWT_EXPIRY=24h
   ```

#### Auth Service

1. Click on `auth-service`
2. Add environment variables:
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_HOST=<from PostgreSQL>
   DATABASE_PORT=5432
   DATABASE_NAME=<from PostgreSQL>
   DATABASE_USER=<from PostgreSQL>
   DATABASE_PASSWORD=<from PostgreSQL>
   REDIS_HOST=<from Redis>
   REDIS_PORT=6379
   JWT_SECRET=<same as API Gateway>
   JWT_EXPIRY=24h
   ```

#### Content Service

1. Click on `content-service`
2. Add environment variables:
   ```
   NODE_ENV=production
   PORT=3002
   DATABASE_HOST=<from PostgreSQL>
   DATABASE_PORT=5432
   DATABASE_NAME=<from PostgreSQL>
   DATABASE_USER=<from PostgreSQL>
   DATABASE_PASSWORD=<from PostgreSQL>
   REDIS_HOST=<from Redis>
   REDIS_PORT=6379
   RABBITMQ_HOST=<from RabbitMQ>
   RABBITMQ_PORT=5672
   RABBITMQ_USER=guest
   RABBITMQ_PASS=guest
   UPLOAD_DIR=/app/storage
   JWT_SECRET=<same as API Gateway>
   ```

#### Template Service

1. Click on `template-service`
2. Add environment variables:
   ```
   NODE_ENV=production
   PORT=3003
   DATABASE_HOST=<from PostgreSQL>
   DATABASE_PORT=5432
   DATABASE_NAME=<from PostgreSQL>
   DATABASE_USER=<from PostgreSQL>
   DATABASE_PASSWORD=<from PostgreSQL>
   REDIS_HOST=<from Redis>
   REDIS_PORT=6379
   JWT_SECRET=<same as API Gateway>
   ```

#### Scheduling Service

1. Click on `scheduling-service`
2. Add environment variables:
   ```
   NODE_ENV=production
   PORT=3004
   DATABASE_HOST=<from PostgreSQL>
   DATABASE_PORT=5432
   DATABASE_NAME=<from PostgreSQL>
   DATABASE_USER=<from PostgreSQL>
   DATABASE_PASSWORD=<from PostgreSQL>
   REDIS_HOST=<from Redis>
   REDIS_PORT=6379
   JWT_SECRET=<same as API Gateway>
   ```

#### Device Service

1. Click on `device-service`
2. Add environment variables:
   ```
   NODE_ENV=production
   PORT=3005
   DATABASE_HOST=<from PostgreSQL>
   DATABASE_PORT=5432
   DATABASE_NAME=<from PostgreSQL>
   DATABASE_USER=<from PostgreSQL>
   DATABASE_PASSWORD=<from PostgreSQL>
   REDIS_HOST=<from Redis>
   REDIS_PORT=6379
   RABBITMQ_HOST=<from RabbitMQ>
   RABBITMQ_PORT=5672
   RABBITMQ_USER=guest
   RABBITMQ_PASS=guest
   JWT_SECRET=<same as API Gateway>
   ```

#### Frontend

1. Click on `frontend` service
2. Add environment variables:
   ```
   VITE_API_URL=<API Gateway public URL>
   ```
3. **Important**: Set build command to: `npm install && npm run build`
4. Set start command to: `npm run preview`

### Step 5: Initialize Database

1. Get PostgreSQL connection string from Render dashboard
2. Connect to database:
   ```bash
   psql <connection-string>
   ```
3. Run schema:
   ```sql
   \i database/schema.sql
   ```
4. Run migrations:
   ```sql
   \i database/migrations/add_device_is_playing.sql
   -- Add other migrations
   ```
5. Seed data (optional):
   ```sql
   \i database/seed.sql
   ```

### Step 6: Deploy

1. In Render dashboard, click **"Manual Deploy"** on each service
2. Or push to GitHub - Render auto-deploys on push
3. Wait for builds to complete (~5-10 minutes)

### Step 7: Test

1. Get frontend URL from Render dashboard
2. Visit the URL
3. Login with:
   - Email: `demo@example.com`
   - Password: `password123`

## 🔧 Troubleshooting

### Services Not Starting

1. Check logs in Render dashboard
2. Verify environment variables are set
3. Check service URLs are correct

### Database Connection Issues

1. Verify PostgreSQL connection string
2. Check database is accessible from services
3. Verify DATABASE_HOST, DATABASE_PORT, etc.

### Frontend Not Loading

1. Check VITE_API_URL is set correctly
2. Verify API Gateway is running
3. Check CORS_ORIGIN in API Gateway

## 💰 Cost Estimate

**Free Tier**:
- PostgreSQL: Free (limited)
- Redis: Free (limited)
- Services: Free (750 hours/month)
- Total: **$0/month** (for testing)

**Starter Plan**:
- PostgreSQL: $7/month
- Redis: $7/month
- Services: $7/month each (or free if under limits)
- Total: **~$30-50/month** (for production)

## ✅ Next Steps

1. Sign up for Render.com
2. Follow steps above
3. Let me know if you need help with any step!

---

**Status**: Ready to deploy! 🚀
