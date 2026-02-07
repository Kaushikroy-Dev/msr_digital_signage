#!/bin/bash

# Database Initialization Script
# This script initializes the PostgreSQL database with schema and seed data

set -e

echo "🗄️  Database Initialization"
echo "============================"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DB_HOST=${DATABASE_HOST:-localhost}
DB_PORT=${DATABASE_PORT:-5432}
DB_NAME=${DATABASE_NAME:-digital_signage}
DB_USER=${DATABASE_USER:-postgres}
DB_PASSWORD=${DATABASE_PASSWORD:-postgres}

echo "📊 Database Configuration:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Check if PostgreSQL is accessible
echo "🔍 Checking PostgreSQL connection..."
export PGPASSWORD=$DB_PASSWORD

if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ Cannot connect to PostgreSQL. Please ensure:"
    echo "   1. PostgreSQL is running"
    echo "   2. Docker services are started: ./start-infrastructure.sh"
    echo "   3. Connection details in .env are correct"
    exit 1
fi

echo "✅ PostgreSQL connection successful"
echo ""

# Check if database exists
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo "⚠️  Database '$DB_NAME' already exists."
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Dropping existing database..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
        echo "✅ Database recreated"
    else
        echo "⏭️  Skipping database creation"
    fi
else
    echo "📝 Creating database '$DB_NAME'..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
    echo "✅ Database created"
fi

echo ""

# Run schema
echo "📋 Running database schema..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database/schema.sql
echo "✅ Schema applied"
echo ""

# Run seed data
if [ -f database/seed.sql ]; then
    echo "🌱 Seeding database with initial data..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database/seed.sql
    echo "✅ Seed data applied"
    echo ""
fi

# Run migrations if any
if [ -d database/migrations ]; then
    echo "🔄 Running migrations..."
    for migration in database/migrations/*.sql; do
        if [ -f "$migration" ]; then
            echo "   Applying: $(basename $migration)"
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration"
        fi
    done
    echo "✅ Migrations applied"
    echo ""
fi

echo "✅ Database initialization complete!"
echo ""
echo "📝 Demo Credentials:"
echo "   Email: demo@example.com"
echo "   Password: password123"
echo ""

unset PGPASSWORD
