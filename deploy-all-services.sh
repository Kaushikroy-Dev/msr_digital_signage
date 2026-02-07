#!/bin/bash

# Deploy all services to Railway
# This script deploys each service from its directory

set -e

echo "🚀 Deploying Digital Signage Platform to Railway"
echo "================================================"

# Check if logged in
if ! npx @railway/cli whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run: npx @railway/cli login"
    exit 1
fi

echo "✅ Logged in to Railway"
echo ""

# Get current project
PROJECT=$(npx @railway/cli status 2>&1 | grep "Project:" | awk '{print $2}' || echo "")
if [ -z "$PROJECT" ]; then
    echo "⚠️  No project linked. Please link a project first:"
    echo "   npx @railway/cli link"
    exit 1
fi

echo "📦 Project: $PROJECT"
echo ""

# Services to deploy
SERVICES=(
    "services/api-gateway:api-gateway"
    "services/auth-service:auth-service"
    "services/content-service:content-service"
    "services/template-service:template-service"
    "services/scheduling-service:scheduling-service"
    "services/device-service:device-service"
    "frontend:frontend"
)

echo "📋 Services to deploy:"
for service in "${SERVICES[@]}"; do
    echo "   - ${service#*:}"
done
echo ""

read -p "Continue with deployment? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "Deployment cancelled."
    exit 0
fi

# Deploy each service
for service in "${SERVICES[@]}"; do
    DIR="${service%:*}"
    NAME="${service#*:}"
    
    echo ""
    echo "🚀 Deploying $NAME..."
    echo "   Directory: $DIR"
    
    cd "$DIR"
    
    # Check if service exists, if not create it
    SERVICE_EXISTS=$(npx @railway/cli service 2>&1 | grep -q "$NAME" && echo "yes" || echo "no")
    
    if [ "$SERVICE_EXISTS" = "no" ]; then
        echo "   Creating new service: $NAME"
        # Railway CLI doesn't have a direct service create command
        # Services are created automatically on first deploy
    fi
    
    # Deploy the service
    echo "   Deploying..."
    npx @railway/cli up --detach 2>&1 | tail -5 || {
        echo "   ⚠️  Deployment may have issues. Check Railway dashboard."
    }
    
    cd - > /dev/null
    echo "   ✅ $NAME deployment initiated"
done

echo ""
echo "✅ All services deployment initiated!"
echo ""
echo "📊 Next steps:"
echo "1. Go to Railway dashboard to monitor deployments"
echo "2. Set environment variables for each service (see RAILWAY_ENV_SETUP.md)"
echo "3. Add PostgreSQL database if not already added"
echo "4. Run database migrations"
echo ""
echo "🌐 Open dashboard: npx @railway/cli open"
