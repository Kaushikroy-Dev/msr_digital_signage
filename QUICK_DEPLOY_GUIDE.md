# 🚀 Quick Deploy Guide - DigitalOcean (EASIEST)

**Deploy all services in ONE place with ONE command!**

## ✅ Why This is Easiest

- ✅ **Single server** - Everything in one place
- ✅ **One command** - `docker-compose up -d`
- ✅ **Works like local** - Same docker-compose.yml
- ✅ **Only $5/month**

## 📋 Quick Steps (15 minutes)

### 1. Create Droplet (2 min)

1. Go to: https://cloud.digitalocean.com/droplets/new
2. Choose: **Ubuntu 22.04**, **$5/month** plan
3. Click **"Create Droplet"**
4. **Save the IP address**

### 2. Connect to Server (1 min)

```bash
ssh root@YOUR_DROPLET_IP
```

### 3. Run Deployment Script (5 min)

```bash
# Clone repo
git clone https://github.com/Kaushikroy-Dev/msr_digital_signage.git
cd msr_digital_signage

# Run deployment script
chmod +x deploy-digitalocean.sh
./deploy-digitalocean.sh
```

The script will:
- ✅ Install Docker & Docker Compose
- ✅ Start all services
- ✅ Initialize database
- ✅ Set up firewall
- ✅ Show you the URLs

### 4. Create .env File (2 min)

```bash
# Copy template
cp .env.production.template .env

# Edit with your values
nano .env
```

**Update:**
- `YOUR_DROPLET_IP` → Your actual IP (e.g., `157.230.123.45`)
- `CHANGE_THIS_PASSWORD` → Strong password

### 5. Start Services (1 min)

```bash
# Use production docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 6. Access Your App! (1 min)

- **Frontend**: `http://YOUR_DROPLET_IP:5173`
- **API**: `http://YOUR_DROPLET_IP:3000`
- **Login**: `demo@example.com` / `password123`

## 🎯 That's It!

Your entire platform is now live on one server!

## 📋 Useful Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart
docker-compose -f docker-compose.prod.yml restart

# Stop
docker-compose -f docker-compose.prod.yml down

# Update (after code changes)
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

## 💰 Cost

**$5/month** - That's it!

---

**Ready?** Follow the steps above! 🚀
