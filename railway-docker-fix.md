# 🔧 Railway Docker Fix (Use Docker Instead of Nixpacks)

If you want to stick with Railway but avoid Nixpacks issues, configure Railway to use Docker directly.

## ✅ Solution: Use Dockerfiles Instead of Nixpacks

Railway can use your existing Dockerfiles instead of Nixpacks auto-detection.

## 📋 Steps

### Step 1: Update Railway.json for Each Service

Create/update `railway.json` in each service directory to use Docker:

#### `services/api-gateway/railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### `services/auth-service/railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Repeat for all services (content-service, template-service, scheduling-service, device-service).

#### `frontend/railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "npm run preview",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Step 2: Verify Dockerfiles

Make sure all Dockerfiles are production-ready:

#### Example: `services/api-gateway/Dockerfile`
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Step 3: Update Root railway.json

Update root `railway.json` to specify Docker builds:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "numReplicas": 1,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300
  },
  "services": [
    {
      "name": "api-gateway",
      "path": "services/api-gateway",
      "build": {
        "builder": "DOCKERFILE",
        "dockerfilePath": "Dockerfile"
      }
    },
    {
      "name": "auth-service",
      "path": "services/auth-service",
      "build": {
        "builder": "DOCKERFILE",
        "dockerfilePath": "Dockerfile"
      }
    },
    {
      "name": "content-service",
      "path": "services/content-service",
      "build": {
        "builder": "DOCKERFILE",
        "dockerfilePath": "Dockerfile"
      }
    },
    {
      "name": "template-service",
      "path": "services/template-service",
      "build": {
        "builder": "DOCKERFILE",
        "dockerfilePath": "Dockerfile"
      }
    },
    {
      "name": "scheduling-service",
      "path": "services/scheduling-service",
      "build": {
        "builder": "DOCKERFILE",
        "dockerfilePath": "Dockerfile"
      }
    },
    {
      "name": "device-service",
      "path": "services/device-service",
      "build": {
        "builder": "DOCKERFILE",
        "dockerfilePath": "Dockerfile"
      }
    },
    {
      "name": "frontend",
      "path": "frontend",
      "build": {
        "builder": "DOCKERFILE",
        "dockerfilePath": "Dockerfile"
      }
    }
  ]
}
```

### Step 4: Alternative - Configure in Railway Dashboard

If Railway.json doesn't work, configure in dashboard:

1. Go to Railway dashboard
2. For each service:
   - Click service → Settings → Build
   - Change "Build Command" to: (leave empty - uses Dockerfile)
   - Change "Dockerfile Path" to: `Dockerfile` (or relative path)
   - Save

### Step 5: Deploy

1. Push changes to GitHub
2. Railway will detect Dockerfile and use it
3. Builds should succeed!

## ✅ Benefits

- ✅ Uses your existing Dockerfiles (already tested locally)
- ✅ No Nixpacks issues
- ✅ Same build process as local
- ✅ More control over build process

## 🚀 Next Steps

1. I can create the railway.json files for you
2. Or switch to Render.com (easier, no config needed)

**Which do you prefer?**
