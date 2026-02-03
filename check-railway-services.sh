#!/bin/bash

# Check Railway Services Deployment Status

echo "🔍 Checking Railway Services Status"
echo "===================================="
echo ""

PROJECT_ID="23694457-f6c3-42f1-ab45-2172f39ded1e"
DASHBOARD_URL="https://railway.com/project/$PROJECT_ID"

echo "📊 Project: bubbly-quietude"
echo "🔗 Dashboard: $DASHBOARD_URL"
echo ""

echo "Services to check:"
echo "  - frontend (CRITICAL - UI fixes)"
echo "  - api-gateway"
echo "  - auth-service"
echo "  - content-service"
echo "  - template-service"
echo "  - scheduling-service"
echo "  - device-service"
echo ""

echo "⚠️  IMPORTANT: Check Railway Dashboard manually"
echo "   $DASHBOARD_URL"
echo ""
echo "For each service, verify:"
echo "  1. Service exists and is connected to GitHub"
echo "  2. Auto-deploy is enabled (Settings → Source → GitHub)"
echo "  3. Latest deployment shows recent commits"
echo "  4. Build status is SUCCESS"
echo "  5. Service is RUNNING"
echo ""
echo "🔧 If frontend is not deploying:"
echo "  1. Go to frontend service in Railway"
echo "  2. Settings → Source → Connect to GitHub"
echo "  3. Select branch: main"
echo "  4. Enable auto-deploy"
echo "  5. Trigger manual deployment if needed"
echo ""
