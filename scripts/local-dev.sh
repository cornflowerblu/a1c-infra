#!/bin/bash

# Exit on error
set -e

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Start the local development environment
echo "Starting local development environment..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 5

# Run database migrations
echo "Running database migrations..."
docker-compose exec backend npx prisma migrate deploy

# Show service status
echo "Services are running:"
docker-compose ps

echo "Local development environment is ready!"
echo "Frontend: http://localhost:4200"
echo "Backend API: http://localhost:3333"
echo "PostgreSQL: localhost:5432"
echo "Redis: localhost:6379"
