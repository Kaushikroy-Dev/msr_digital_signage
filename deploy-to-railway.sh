#!/bin/bash

# Deployment Script for GitHub and Railway
# This script helps push code to GitHub and check Railway deployment status

set -e

echo "🚀 Digital Signage Deployment Script"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check git status
echo -e "${YELLOW}Step 1: Checking git status...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ You have uncommitted changes. Please commit them first.${NC}"
    git status
    exit 1
fi

# Step 2: Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}⚠️  You're on branch: $CURRENT_BRANCH (not main)${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 3: Push to GitHub
echo -e "${YELLOW}Step 2: Pushing to GitHub...${NC}"
echo "Attempting to push to origin/main..."

if git push origin main 2>&1; then
    echo -e "${GREEN}✅ Successfully pushed to GitHub!${NC}"
else
    echo -e "${RED}❌ Failed to push to GitHub${NC}"
    echo ""
    echo "Authentication options:"
    echo "1. Use GitHub Personal Access Token:"
    echo "   git push https://<YOUR_TOKEN>@github.com/Kaushikroy-Dev/msr_digital_signage.git main"
    echo ""
    echo "2. Set up SSH key (see DEPLOY_INSTRUCTIONS.md)"
    echo ""
    echo "3. Use GitHub Desktop or VS Code Git extension"
    exit 1
fi

# Step 4: Check Railway CLI
echo ""
echo -e "${YELLOW}Step 3: Checking Railway deployment...${NC}"

# Try to use Railway CLI if available
if command -v railway &> /dev/null; then
    echo "Railway CLI found, checking status..."
    railway status || echo "Could not get Railway status (may need to login: railway login)"
elif [ -f "node_modules/.bin/railway" ]; then
    echo "Using local Railway CLI..."
    npx railway status || echo "Could not get Railway status (may need to login: npx railway login)"
else
    echo -e "${YELLOW}⚠️  Railway CLI not found${NC}"
    echo ""
    echo "To check Railway deployment:"
    echo "1. Visit: https://railway.app/dashboard"
    echo "2. Click on your project"
    echo "3. Check deployment status for each service"
    echo ""
    echo "To install Railway CLI:"
    echo "  npm install -g @railway/cli"
    echo "  railway login"
fi

# Step 5: Summary
echo ""
echo -e "${GREEN}✅ Deployment process initiated!${NC}"
echo ""
echo "Next steps:"
echo "1. Railway should auto-deploy after GitHub push"
echo "2. Check Railway dashboard: https://railway.app/dashboard"
echo "3. Monitor service logs for any errors"
echo "4. Verify environment variables are set correctly"
echo "5. Test Create Playlist functionality in production"
echo ""
echo "For detailed instructions, see: DEPLOY_INSTRUCTIONS.md"
