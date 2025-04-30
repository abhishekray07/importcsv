#!/bin/bash
set -e

echo "Starting database migration..."

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL is not set"
    exit 1
fi

# Run migrations
alembic upgrade head

if [ $? -eq 0 ]; then
    echo "Database migration completed successfully"
else
    echo "Database migration failed"
    exit 1
fi