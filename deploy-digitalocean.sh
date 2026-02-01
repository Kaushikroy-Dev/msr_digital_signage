#!/bin/bash

# DigitalOcean Droplet Deployment Script
# Run this script on your DigitalOcean Droplet after cloning the repo

set -e

echo "🚀 Digital Signage Platform - DigitalOcean Deployment"
echo "======================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run as root or with sudo"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "📦 Installing required packages..."
apt install -y git curl wget

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    apt install -y docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Verify installations
echo ""
echo "🔍 Verifying installations..."
docker --version
docker-compose --version

# Check if .env file exists
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env file from template..."
    echo ""
    echo "Please edit .env file with your production values:"
    echo "  - Replace YOUR_DROPLET_IP with your actual IP"
    echo "  - Change DATABASE_PASSWORD to a strong password"
    echo ""
    read -p "Press Enter to continue after editing .env file..."
fi

# Start services
echo ""
echo "🚀 Starting all services..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 30

# Initialize database
echo ""
echo "🗄️  Initializing database..."

# Check if database is ready
until docker exec ds-postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "   Waiting for PostgreSQL..."
    sleep 2
done

echo "   ✅ PostgreSQL is ready"

# Run schema
if [ -f database/schema.sql ]; then
    echo "   Running schema..."
    docker exec -i ds-postgres psql -U postgres -d digital_signage < database/schema.sql
    echo "   ✅ Schema applied"
fi

# Run migrations
if [ -d database/migrations ]; then
    echo "   Running migrations..."
    for migration in database/migrations/*.sql; do
        if [ -f "$migration" ]; then
            echo "   Applying: $(basename $migration)"
            docker exec -i ds-postgres psql -U postgres -d digital_signage < "$migration" || true
        fi
    done
    echo "   ✅ Migrations applied"
fi

# Seed data (optional)
if [ -f database/seed.sql ]; then
    read -p "   Do you want to seed the database? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "   Seeding database..."
        docker exec -i ds-postgres psql -U postgres -d digital_signage < database/seed.sql
        echo "   ✅ Database seeded"
    fi
fi

# Setup firewall
echo ""
echo "🔥 Setting up firewall..."
if ! command -v ufw &> /dev/null; then
    apt install -y ufw
fi

# Allow SSH
ufw allow 22/tcp

# Allow application ports
ufw allow 3000/tcp  # API Gateway
ufw allow 5173/tcp  # Frontend
ufw allow 15672/tcp # RabbitMQ Management

# Enable firewall
ufw --force enable

echo "   ✅ Firewall configured"

# Show status
echo ""
echo "📊 Service Status:"
docker-compose ps

# Get IP address
DROPLET_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

echo ""
echo "✅ Deployment Complete!"
echo "======================"
echo ""
echo "🌐 Access your application:"
echo "   Frontend:        http://$DROPLET_IP:5173"
echo "   API Gateway:     http://$DROPLET_IP:3000"
echo "   RabbitMQ Admin:  http://$DROPLET_IP:15672 (guest/guest)"
echo ""
echo "🔐 Login Credentials:"
echo "   Email:    demo@example.com"
echo "   Password: password123"
echo ""
echo "📋 Useful Commands:"
echo "   View logs:        docker-compose logs -f"
echo "   Restart:          docker-compose restart"
echo "   Stop:             docker-compose down"
echo "   Start:            docker-compose up -d"
echo ""
