#!/bin/bash

# Start Infrastructure Services (PostgreSQL, Redis, RabbitMQ)
# This script starts only the infrastructure services using Docker Compose

echo "🚀 Starting Infrastructure Services..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Start only infrastructure services
docker-compose up -d postgres redis rabbitmq

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check service health
echo ""
echo "📊 Service Status:"
docker-compose ps postgres redis rabbitmq

echo ""
echo "✅ Infrastructure services started!"
echo ""
echo "📍 Service URLs:"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis: localhost:6379"
echo "   - RabbitMQ: localhost:5672"
echo "   - RabbitMQ Management: http://localhost:15672 (guest/guest)"
echo ""
echo "💡 To stop services: docker-compose stop postgres redis rabbitmq"
echo "💡 To view logs: docker-compose logs -f postgres redis rabbitmq"
