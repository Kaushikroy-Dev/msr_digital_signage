#!/bin/bash

# Check Railway project builds
# Project ID: dc8c7d92-b6a2-435f-b882-812bc0a8b4f6

PROJECT_ID="dc8c7d92-b6a2-435f-b882-812bc0a8b4f6"

echo "🔍 Checking Railway Project Builds"
echo "===================================="
echo "Project ID: $PROJECT_ID"
echo ""

# Check if logged in
if ! npx @railway/cli whoami &> /dev/null; then
    echo "❌ Not logged in. Run: npx @railway/cli login"
    exit 1
fi

echo "✅ Logged in to Railway"
echo ""

# Open the project dashboard
echo "🌐 Opening project dashboard..."
echo "   URL: https://railway.com/project/$PROJECT_ID"
echo ""

# Try to link to the project (interactive)
echo "📋 To check logs via CLI:"
echo "   1. Run: npx @railway/cli link"
echo "   2. Select project: $PROJECT_ID"
echo "   3. Then run: npx @railway/cli logs --build --latest"
echo ""

# Open dashboard
npx @railway/cli open

echo ""
echo "📊 In the Railway dashboard:"
echo "   1. Click on each service"
echo "   2. Go to 'Deployments' tab"
echo "   3. Click on latest deployment"
echo "   4. Check 'Build Logs' for errors"
echo ""
echo "🔍 Look for:"
echo "   - npm-9 errors (should be fixed)"
echo "   - Build stage failures"
echo "   - Missing dependencies"
echo "   - Port configuration issues"
