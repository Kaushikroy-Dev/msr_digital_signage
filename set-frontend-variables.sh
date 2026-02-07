#!/bin/bash

# Script to set frontend environment variables in Railway
# This requires Railway CLI and manual steps

set -e

echo "🔧 Setting Frontend Environment Variables in Railway"
echo "===================================================="
echo ""

PROJECT_ID="23694457-f6c3-42f1-ab45-2172f39ded1e"
DASHBOARD_URL="https://railway.com/project/$PROJECT_ID"

echo "📋 Steps to Set Variables:"
echo ""
echo "1. Get API Gateway Public Domain:"
echo "   - Open: $DASHBOARD_URL"
echo "   - Click on 'api-gateway' service"
echo "   - Go to Settings → Networking"
echo "   - Copy the Public Domain (e.g., api-gateway-production-xxxx.up.railway.app)"
echo ""
echo "2. Set Frontend VITE_API_URL:"
echo "   - Click on 'frontend' service"
echo "   - Go to Settings → Variables"
echo "   - Click '+ New Variable'"
echo "   - Name: VITE_API_URL"
echo "   - Value: https://[API_GATEWAY_DOMAIN]"
echo "   - Click Save"
echo ""
echo "3. Set API Gateway CORS_ORIGIN:"
echo "   - Click on 'api-gateway' service"
echo "   - Go to Settings → Variables"
echo "   - Find or add: CORS_ORIGIN"
echo "   - Value: https://frontend-production-73c0.up.railway.app"
echo "   - Or use: \${{frontend.RAILWAY_PUBLIC_DOMAIN}}"
echo "   - Click Save"
echo ""
echo "4. Redeploy Services:"
echo "   - Frontend: Deployments → Redeploy (rebuilds with new VITE_API_URL)"
echo "   - API Gateway: Deployments → Redeploy (picks up CORS changes)"
echo ""

# Try to get API Gateway URL if possible
echo "🔍 Attempting to get API Gateway URL..."
cd services/api-gateway
if npx @railway/cli variables 2>&1 | grep -q "RAILWAY_PUBLIC_DOMAIN"; then
    API_GATEWAY_URL=$(npx @railway/cli variables 2>&1 | grep "RAILWAY_PUBLIC_DOMAIN" | awk '{print $NF}' | head -1)
    if [ ! -z "$API_GATEWAY_URL" ]; then
        echo ""
        echo "✅ Found API Gateway URL: $API_GATEWAY_URL"
        echo ""
        echo "Quick Set Command (if Railway CLI supports it):"
        echo "  cd frontend"
        echo "  npx @railway/cli variables set VITE_API_URL=https://$API_GATEWAY_URL"
    fi
fi

echo ""
echo "⚠️  Note: Railway CLI may not support setting variables directly."
echo "   Use Railway Dashboard for reliable variable configuration."
echo ""
