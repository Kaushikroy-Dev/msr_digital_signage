# 🚀 Quick Start Reference

## ✅ Current Status

All services are **RUNNING** and ready to use!

## 📍 Access URLs

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | http://localhost:5173 | ✅ Running |
| **API Gateway** | http://localhost:3000 | ✅ Running |
| **Auth Service** | http://localhost:3001 | ✅ Running |
| **Content Service** | http://localhost:3002 | ✅ Running |
| **Template Service** | http://localhost:3003 | ✅ Running |
| **Scheduling Service** | http://localhost:3004 | ✅ Running |
| **Device Service** | http://localhost:3005 | ✅ Running |
| **RabbitMQ Management** | http://localhost:15672 | ✅ Running |

## 🔐 Login Credentials

- **Email**: `demo@example.com`
- **Password**: `password123`

## 🛠️ Common Commands

### Start Everything
```bash
# Start infrastructure (PostgreSQL, Redis, RabbitMQ)
./start-infrastructure.sh

# Start all application services
npm run dev
```

### Stop Services
```bash
# Stop Node.js services: Press Ctrl+C in the terminal running npm run dev

# Stop infrastructure services
docker-compose stop postgres redis rabbitmq
```

### Check Service Status
```bash
# Infrastructure services
docker-compose ps

# Application services (check ports)
lsof -ti:3000,3001,3002,3003,3004,3005,5173
```

### View Logs
```bash
# Infrastructure logs
docker-compose logs -f postgres redis rabbitmq

# Application logs are in the terminal running npm run dev
```

### Reset Database
```bash
./init-database.sh
# Answer 'y' when prompted to drop existing database
```

## 📚 Documentation

- **Local Setup Guide**: [LOCAL_SETUP.md](./LOCAL_SETUP.md)
- **Main README**: [README.md](./README.md)
- **RBAC Implementation**: [RBAC_IMPLEMENTATION.md](./RBAC_IMPLEMENTATION.md)

## 🐛 Troubleshooting

### Services Not Starting
1. Check Docker is running: `docker info`
2. Check infrastructure: `docker-compose ps`
3. Check ports are available: `lsof -ti:3000`

### Database Issues
1. Verify PostgreSQL is running: `docker ps | grep postgres`
2. Test connection: `psql -h localhost -U postgres -d digital_signage -c "SELECT 1"`
3. Re-initialize: `./init-database.sh`

### Port Conflicts
```bash
# Find process using port
lsof -ti:3000

# Kill process (replace PID)
kill -9 <PID>
```

---

**Last Updated**: Services are currently running and accessible!
