# Local Development Setup Guide

This guide will help you set up and run the Digital Signage Platform locally without Docker for the application services (infrastructure services still use Docker).

## 📋 Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- **PostgreSQL Client** (optional, for manual database operations)
- **npm 9+** (comes with Node.js)

## 🏗️ Architecture Overview

The platform consists of:

### Infrastructure Services (Docker)
- **PostgreSQL** (port 5432) - Database
- **Redis** (port 6379) - Cache
- **RabbitMQ** (port 5672) - Message Queue

### Backend Services (Node.js - Run Locally)
- **API Gateway** (port 3000) - Routes requests and WebSocket server
- **Auth Service** (port 3001) - Authentication & RBAC
- **Content Service** (port 3002) - Media management
- **Template Service** (port 3003) - Template engine
- **Scheduling Service** (port 3004) - Playlist & scheduling
- **Device Service** (port 3005) - Device monitoring
- **Media Processor Worker** - Background media processing

### Frontend (React + Vite)
- **Frontend** (port 5173) - React application

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# 1. Run setup script (installs all dependencies)
./setup-local.sh

# 2. Start infrastructure services (PostgreSQL, Redis, RabbitMQ)
./start-infrastructure.sh

# 3. Initialize database
./init-database.sh

# 4. Start all services
./start-local.sh
```

### Option 2: Manual Setup

#### Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install service dependencies
cd services/api-gateway && npm install && cd ../..
cd services/auth-service && npm install && cd ../..
cd services/content-service && npm install && cd ../..
cd services/template-service && npm install && cd ../..
cd services/scheduling-service && npm install && cd ../..
cd services/device-service && npm install && cd ../..
cd workers/media-processor && npm install && cd ../..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

#### Step 2: Configure Environment

Create a `.env` file in the root directory:

```bash
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=digital_signage
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# RabbitMQ Configuration
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=24h

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
CONTENT_SERVICE_URL=http://localhost:3002
TEMPLATE_SERVICE_URL=http://localhost:3003
SCHEDULING_SERVICE_URL=http://localhost:3004
DEVICE_SERVICE_URL=http://localhost:3005

# API Gateway
API_GATEWAY_PORT=3000
CORS_ORIGIN=http://localhost:5173

# Service Ports
AUTH_SERVICE_PORT=3001
CONTENT_SERVICE_PORT=3002
TEMPLATE_SERVICE_PORT=3003
SCHEDULING_SERVICE_PORT=3004
DEVICE_SERVICE_PORT=3005

# Node Environment
NODE_ENV=development
```

#### Step 3: Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, and RabbitMQ
docker-compose up -d postgres redis rabbitmq

# Verify services are running
docker-compose ps
```

#### Step 4: Initialize Database

```bash
# Run database schema and seed data
./init-database.sh

# Or manually:
# psql -h localhost -U postgres -d digital_signage -f database/schema.sql
# psql -h localhost -U postgres -d digital_signage -f database/seed.sql
```

#### Step 5: Start Services

**Option A: Start all services at once (using npm workspaces)**
```bash
npm run dev
```

**Option B: Start services individually**

Terminal 1 - API Gateway:
```bash
cd services/api-gateway
npm run dev
```

Terminal 2 - Auth Service:
```bash
cd services/auth-service
npm run dev
```

Terminal 3 - Content Service:
```bash
cd services/content-service
npm run dev
```

Terminal 4 - Template Service:
```bash
cd services/template-service
npm run dev
```

Terminal 5 - Scheduling Service:
```bash
cd services/scheduling-service
npm run dev
```

Terminal 6 - Device Service:
```bash
cd services/device-service
npm run dev
```

Terminal 7 - Frontend:
```bash
cd frontend
npm run dev
```

## 🔍 Verify Setup

1. **Check Infrastructure Services:**
   ```bash
   docker-compose ps
   ```

2. **Check API Gateway:**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Check Auth Service:**
   ```bash
   curl http://localhost:3001/health
   ```

4. **Access Frontend:**
   - Open browser: http://localhost:5173

5. **Login Credentials:**
   - Email: `demo@example.com`
   - Password: `password123`

## 📊 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React application |
| API Gateway | http://localhost:3000 | Main API endpoint |
| Auth Service | http://localhost:3001 | Authentication |
| Content Service | http://localhost:3002 | Media management |
| Template Service | http://localhost:3003 | Templates |
| Scheduling Service | http://localhost:3004 | Scheduling |
| Device Service | http://localhost:3005 | Device management |
| RabbitMQ Management | http://localhost:15672 | Message queue UI (guest/guest) |

## 🛠️ Troubleshooting

### Docker Services Not Starting

```bash
# Check Docker is running
docker info

# Start Docker Desktop, then:
docker-compose up -d postgres redis rabbitmq
```

### Database Connection Errors

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -h localhost -U postgres -d digital_signage -c "SELECT 1"

# If connection fails, check .env file has correct credentials
```

### Port Already in Use

If a port is already in use:

1. Find the process:
   ```bash
   lsof -i :3000  # Replace with your port
   ```

2. Kill the process or change the port in `.env`

### Services Not Connecting

1. Ensure infrastructure services are running:
   ```bash
   docker-compose ps
   ```

2. Check service logs:
   ```bash
   # For Docker services
   docker-compose logs postgres
   docker-compose logs redis
   
   # For Node services, check terminal output
   ```

### Database Not Initialized

```bash
# Re-run initialization
./init-database.sh

# Or manually:
psql -h localhost -U postgres -d digital_signage -f database/schema.sql
psql -h localhost -U postgres -d digital_signage -f database/seed.sql
```

## 🧹 Cleanup

### Stop All Services

```bash
# Stop Node.js services: Press Ctrl+C in terminals

# Stop Docker services
docker-compose stop postgres redis rabbitmq

# Or stop all
docker-compose down
```

### Reset Database

```bash
# Drop and recreate database
./init-database.sh
# (Answer 'y' when prompted to drop existing database)
```

### Remove All Data

```bash
# Stop and remove containers and volumes
docker-compose down -v
```

## 📝 Development Tips

1. **Hot Reload**: All services support hot reload with `nodemon` (backend) and Vite (frontend)

2. **Database Migrations**: Run migrations from `database/migrations/` directory

3. **Logs**: Each service logs to console. Use separate terminals for easier debugging

4. **Environment Variables**: Update `.env` file and restart services

5. **API Testing**: Use the API Gateway at http://localhost:3000/api/* for all requests

## 🔐 Security Notes

- Change `JWT_SECRET` in production
- Use strong database passwords
- Don't commit `.env` file to version control
- Use environment-specific configurations

## 📚 Additional Resources

- [API Documentation](./README.md#api-endpoints)
- [Database Schema](./database/schema.sql)
- [RBAC Implementation](./RBAC_IMPLEMENTATION.md)

---

**Need Help?** Check the main [README.md](./README.md) or service-specific documentation.
