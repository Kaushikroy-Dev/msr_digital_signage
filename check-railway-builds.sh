#!/bin/bash

# Check Railway build status and logs
# This script helps diagnose build failures

echo "🔍 Checking Railway Build Status"
echo "================================"
echo ""

# Check if logged in
if ! npx @railway/cli whoami &> /dev/null; then
    echo "❌ Not logged in. Run: npx @railway/cli login"
    exit 1
fi

echo "✅ Logged in to Railway"
echo ""

# Get project info
echo "📦 Project Information:"
npx @railway/cli status
echo ""

# Open dashboard
echo "🌐 Opening Railway Dashboard..."
echo "   Please check the build logs in the dashboard for detailed error information"
echo ""
npx @railway/cli open

echo ""
echo "📋 To check logs via CLI:"
echo "   1. Go to Railway dashboard"
echo "   2. Click on a service"
echo "   3. Note the service name/ID"
echo "   4. Run: npx @railway/cli logs --service <service-name> --build --latest"
echo ""
echo "🔍 Common Build Issues:"
echo "   - npm-9 error: Fixed in latest commit (simplified nixpacks.toml)"
echo "   - Missing dependencies: Check package.json"
echo "   - Port conflicts: Check PORT environment variable"
echo "   - Database connection: Verify DATABASE_HOST variables"
