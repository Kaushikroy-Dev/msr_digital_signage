#!/bin/bash

# Deploy remaining services to Railway
# Run this from the project root

set -e

echo "🚀 Deploying Remaining Services to Railway"
echo "=========================================="

BASE_DIR="/Users/kaushik/Desktop/Digital Signedge"

# Services to deploy (excluding api-gateway which is already deployed)
SERVICES=(
    "services/auth-service"
    "services/content-service"
    "services/template-service"
    "services/scheduling-service"
    "services/device-service"
    "frontend"
)

for service_dir in "${SERVICES[@]}"; do
    service_name=$(basename "$service_dir")
    echo ""
    echo "🚀 Deploying $service_name..."
    echo "   Directory: $service_dir"
    
    cd "$BASE_DIR/$service_dir"
    
    # Deploy the service
    echo "   Uploading and deploying..."
    npx @railway/cli up --detach 2>&1 | tail -10 || {
        echo "   ⚠️  Deployment may have issues. Check Railway dashboard."
    }
    
    echo "   ✅ $service_name deployment initiated"
    sleep 2  # Small delay between deployments
done

cd "$BASE_DIR"

echo ""
echo "✅ All services deployment initiated!"
echo ""
echo "📊 Check deployment status:"
echo "   npx @railway/cli open"
echo ""
echo "📋 Next steps:"
echo "1. Add PostgreSQL database in Railway dashboard"
echo "2. Set environment variables (see RAILWAY_ENV_SETUP.md)"
echo "3. Run database migrations"
echo "4. Generate domains for each service"
