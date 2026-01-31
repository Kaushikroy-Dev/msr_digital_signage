#!/bin/bash

# Local Development Setup Script
# This script sets up the environment for local development

set -e

echo "🔧 Digital Signage Platform - Local Setup"
echo "=========================================="
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please review and update if needed."
else
    echo "✅ .env file already exists"
fi
echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install
echo ""

# Install service dependencies
echo "📦 Installing service dependencies..."
echo "  - API Gateway..."
cd services/api-gateway && npm install && cd ../..
echo "  - Auth Service..."
cd services/auth-service && npm install && cd ../..
echo "  - Content Service..."
cd services/content-service && npm install && cd ../..
echo "  - Template Service..."
cd services/template-service && npm install && cd ../..
echo "  - Scheduling Service..."
cd services/scheduling-service && npm install && cd ../..
echo "  - Device Service..."
cd services/device-service && npm install && cd ../..
echo "  - Media Processor..."
cd workers/media-processor && npm install && cd ../..
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..
echo ""

echo "✅ All dependencies installed!"
echo ""
echo "📋 Next Steps:"
echo "   1. Start infrastructure services: ./start-infrastructure.sh"
echo "   2. Initialize database: ./init-database.sh"
echo "   3. Start backend services: npm run dev:services"
echo "   4. Start frontend: npm run dev:frontend"
echo ""
echo "   Or use: npm run dev (starts everything)"
echo ""
