#!/bin/bash

# Start All Services Locally
# This script starts all backend services and frontend for local development

echo "🚀 Starting Digital Signage Platform (Local Mode)"
echo "=================================================="
echo ""

# Check if infrastructure is running
echo "🔍 Checking infrastructure services..."
if ! docker ps | grep -q "ds-postgres\|ds-redis\|ds-rabbitmq"; then
    echo "⚠️  Infrastructure services not detected."
    echo "   Starting infrastructure services..."
    ./start-infrastructure.sh
    sleep 3
fi

echo "✅ Infrastructure services running"
echo ""

# Check if database is initialized
export PGPASSWORD=${DATABASE_PASSWORD:-postgres}
if ! psql -h ${DATABASE_HOST:-localhost} -p ${DATABASE_PORT:-5432} -U ${DATABASE_USER:-postgres} -d ${DATABASE_NAME:-digital_signage} -c "SELECT 1" > /dev/null 2>&1; then
    echo "⚠️  Database not initialized. Running initialization..."
    ./init-database.sh
fi
unset PGPASSWORD

echo ""
echo "🎯 Starting services..."
echo ""
echo "📌 Service Ports:"
echo "   - API Gateway: http://localhost:3000"
echo "   - Auth Service: http://localhost:3001"
echo "   - Content Service: http://localhost:3002"
echo "   - Template Service: http://localhost:3003"
echo "   - Scheduling Service: http://localhost:3004"
echo "   - Device Service: http://localhost:3005"
echo "   - Frontend: http://localhost:5173"
echo ""
echo "💡 Press Ctrl+C to stop all services"
echo ""

# Start all services using npm workspaces
npm run dev
