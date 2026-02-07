#!/bin/bash

# Railway Deployment Script for Digital Signage Platform
# This script helps deploy all services to Railway

set -e

echo "🚀 Digital Signage Platform - Railway Deployment"
echo "================================================"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli || {
        echo "⚠️  Could not install Railway CLI globally."
        echo "   Please install manually: npm install -g @railway/cli"
        echo "   Or use: npx @railway/cli"
        exit 1
    }
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway..."
    railway login
fi

# Generate JWT Secret
echo ""
echo "🔑 Generating JWT Secret..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
echo "JWT_SECRET=$JWT_SECRET"
echo ""
echo "⚠️  IMPORTANT: Save this JWT_SECRET - you'll need it for all services!"
echo ""

# Create or link to project
echo "📦 Setting up Railway project..."
read -p "Do you want to create a new project or link to existing? (new/link): " project_choice

if [ "$project_choice" = "new" ]; then
    railway init
else
    railway link
fi

# Add PostgreSQL
echo ""
echo "🗄️  Adding PostgreSQL database..."
read -p "Add PostgreSQL database? (y/n): " add_db
if [ "$add_db" = "y" ]; then
    railway add postgres
    echo "✅ PostgreSQL added. Note the connection details from Railway dashboard."
fi

# Add Redis (optional)
echo ""
echo "💾 Adding Redis (optional)..."
read -p "Add Redis? (y/n): " add_redis
if [ "$add_redis" = "y" ]; then
    railway add redis || echo "⚠️  Redis not available, skipping..."
fi

echo ""
echo "📋 Next Steps:"
echo "=============="
echo "1. Go to Railway dashboard: https://railway.app"
echo "2. For each service, create a new service from GitHub repo:"
echo "   - api-gateway (root: services/api-gateway)"
echo "   - auth-service (root: services/auth-service)"
echo "   - content-service (root: services/content-service)"
echo "   - template-service (root: services/template-service)"
echo "   - scheduling-service (root: services/scheduling-service)"
echo "   - device-service (root: services/device-service)"
echo "   - frontend (root: frontend)"
echo ""
echo "3. Set environment variables for each service (see .railway.env.template)"
echo "4. Use JWT_SECRET: $JWT_SECRET"
echo "5. Run database migrations after PostgreSQL is ready"
echo ""
echo "📖 See RAILWAY_DEPLOYMENT.md for detailed instructions"
