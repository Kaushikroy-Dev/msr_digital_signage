# 🚀 DigitalOcean Droplet Deployment (EASIEST - Single Server)

Deploy all services in **one place** using Docker Compose on a DigitalOcean Droplet.

## ✅ Why This is Easiest

- ✅ **One server** - All services in one place
- ✅ **One command** - `docker-compose up -d` deploys everything
- ✅ **Works exactly like local** - Same docker-compose.yml
- ✅ **Full control** - No platform limitations
- ✅ **Cheap** - Only $5/month

## 📋 Prerequisites

1. DigitalOcean account: https://www.digitalocean.com (sign up - $5/month)
2. GitHub repo: `Kaushikroy-Dev/msr_digital_signage` ✅

## 🚀 Step-by-Step Deployment

### Step 1: Create DigitalOcean Droplet

1. Go to https://cloud.digitalocean.com/droplets/new
2. Choose:
   - **Image**: Ubuntu 22.04 (LTS)
   - **Plan**: Basic - Regular Intel with SSD - **$5/month** (1GB RAM, 1 vCPU)
   - **Datacenter**: Choose closest to you
   - **Authentication**: SSH keys (recommended) or Password
3. Click **"Create Droplet"**
4. Wait 1-2 minutes for droplet to be created
5. **Save the IP address** (e.g., `157.230.123.45`)

### Step 2: Connect to Your Server

```bash
# SSH into your server
ssh root@YOUR_DROPLET_IP

# Or if using password authentication
ssh root@YOUR_DROPLET_IP
# Enter password when prompted
```

### Step 3: Install Docker & Docker Compose

Once connected to your server, run:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Verify installation
docker --version
docker-compose --version

# Add current user to docker group (if needed)
usermod -aG docker $USER
```

### Step 4: Clone Your Repository

```bash
# Install git if not already installed
apt install git -y

# Clone your repository
git clone https://github.com/Kaushikroy-Dev/msr_digital_signage.git
cd msr_digital_signage
```

### Step 5: Create Production Environment File

```bash
# Create .env file for production
nano .env
```

Copy and paste this (update with your values):

```env
# Node Environment
NODE_ENV=production

# Database Configuration
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=digital_signage
DATABASE_USER=postgres
DATABASE_PASSWORD=CHANGE_THIS_PASSWORD

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# RabbitMQ Configuration
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASS=guest

# JWT Configuration
JWT_SECRET=7c45fbc61aa4d22b440e4d4a16ca0698f1a9c26b5f1af59dce79846032f8efd3aeaf88da99553322e2860940165123fcad885894ea4b0e9620b974a06ad942b9
JWT_EXPIRY=24h

# Service URLs (internal - Docker network)
AUTH_SERVICE_URL=http://auth-service:3001
CONTENT_SERVICE_URL=http://content-service:3002
TEMPLATE_SERVICE_URL=http://template-service:3003
SCHEDULING_SERVICE_URL=http://scheduling-service:3004
DEVICE_SERVICE_URL=http://device-service:3005

# API Gateway
PORT=3000
CORS_ORIGIN=http://YOUR_DROPLET_IP:5173

# Frontend
VITE_API_URL=http://YOUR_DROPLET_IP:3000
```

**Important**: 
- Replace `CHANGE_THIS_PASSWORD` with a strong password
- Replace `YOUR_DROPLET_IP` with your actual droplet IP (e.g., `157.230.123.45`)

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

### Step 6: Update docker-compose.yml for Production

The docker-compose.yml is already set up, but we need to make a small change for production. I'll create a production version:

```bash
# Copy docker-compose.yml to docker-compose.prod.yml
cp docker-compose.yml docker-compose.prod.yml
```

### Step 7: Start All Services

```bash
# Start all services with docker-compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 8: Initialize Database

```bash
# Wait for PostgreSQL to be ready (30 seconds)
sleep 30

# Run database schema
docker exec -i ds-postgres psql -U postgres -d digital_signage < database/schema.sql

# Run migrations
docker exec -i ds-postgres psql -U postgres -d digital_signage < database/migrations/add_device_is_playing.sql
docker exec -i ds-postgres psql -U postgres -d digital_signage < database/migrations/add_template_versioning.sql
docker exec -i ds-postgres psql -U postgres -d digital_signage < database/migrations/add_template_sharing.sql
docker exec -i ds-postgres psql -U postgres -d digital_signage < database/migrations/add_template_variables.sql
docker exec -i ds-postgres psql -U postgres -d digital_signage < database/migrations/add_template_categories_tags.sql
docker exec -i ds-postgres psql -U postgres -d digital_signage < database/migrations/add_widget_settings.sql
docker exec -i ds-postgres psql -U postgres -d digital_signage < database/migrations/add_property_zone_content_isolation.sql
docker exec -i ds-postgres psql -U postgres -d digital_signage < database/migrations/add_data_binding.sql
docker exec -i ds-postgres psql -U postgres -d digital_signage < database/migrations/002_rbac_enhancement.sql

# Seed data (optional)
docker exec -i ds-postgres psql -U postgres -d digital_signage < database/seed.sql
```

### Step 9: Set Up Firewall (UFW)

```bash
# Install UFW if not installed
apt install ufw -y

# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow your application ports
ufw allow 3000/tcp  # API Gateway
ufw allow 5173/tcp  # Frontend

# Enable firewall
ufw enable

# Check status
ufw status
```

### Step 10: Access Your Application

1. **Frontend**: `http://YOUR_DROPLET_IP:5173`
2. **API Gateway**: `http://YOUR_DROPLET_IP:3000`
3. **RabbitMQ Management**: `http://YOUR_DROPLET_IP:15672` (guest/guest)

**Login Credentials:**
- Email: `demo@example.com`
- Password: `password123`

## 🔧 Useful Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-gateway
docker-compose logs -f frontend
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart api-gateway
```

### Stop Services
```bash
docker-compose down
```

### Start Services
```bash
docker-compose up -d
```

### Update Services (After Code Changes)
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

## 🔒 Security Recommendations

1. **Change default passwords** in `.env` file
2. **Set up SSL/HTTPS** using Let's Encrypt (I can help with this)
3. **Use SSH keys** instead of passwords
4. **Regular updates**: `apt update && apt upgrade`
5. **Firewall**: Already configured above

## 💰 Cost

- **Droplet**: $5/month (1GB RAM, 1 vCPU)
- **Total**: **$5/month** ✅

## ✅ Next Steps

1. Create DigitalOcean Droplet
2. Follow steps above
3. Your app will be live!

---

**Status**: Ready to deploy! 🚀
