#!/bin/bash
# Migration runner script for Docker
# This script runs all migrations in order

set -e

MIGRATION_DIR="/docker-entrypoint-initdb.d/migrations"
DB_NAME=${POSTGRES_DB:-digital_signage}

echo "🔄 Running database migrations..."

# Run migrations in alphabetical order
for migration in $(ls -1 $MIGRATION_DIR/*.sql 2>/dev/null | sort); do
    if [ -f "$migration" ]; then
        echo "   Applying: $(basename $migration)"
        psql -U postgres -d $DB_NAME -f "$migration"
    fi
done

echo "✅ Migrations applied"
