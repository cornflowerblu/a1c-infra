#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Check for required environment variables
if [ -z "$AWS_REGION" ] || [ -z "$APP_NAME" ] || [ -z "$ENVIRONMENT" ]; then
  echo "Error: Required environment variables are missing."
  echo "Please make sure AWS_REGION, APP_NAME, and ENVIRONMENT are set in your .env file."
  exit 1
fi

# Set up Clerk secrets
echo "Setting up Clerk secrets..."

# Check if Clerk keys are set
if [ -z "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ] || [ -z "$CLERK_SECRET_KEY" ] || [ -z "$CLERK_WEBHOOK_SECRET" ]; then
  echo "Error: Clerk API keys are missing."
  echo "Please make sure NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, and CLERK_WEBHOOK_SECRET are set in your .env file."
  exit 1
fi

# Update Clerk publishable key
aws secretsmanager update-secret --secret-id "${APP_NAME}/${ENVIRONMENT}/clerk-publishable" \
  --secret-string "{\"publishableKey\":\"${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}\"}" \
  --region ${AWS_REGION}

# Update Clerk secret key
aws secretsmanager update-secret --secret-id "${APP_NAME}/${ENVIRONMENT}/clerk-secret" \
  --secret-string "{\"secretKey\":\"${CLERK_SECRET_KEY}\"}" \
  --region ${AWS_REGION}

# Update Clerk webhook secret
aws secretsmanager update-secret --secret-id "${APP_NAME}/${ENVIRONMENT}/clerk-webhook" \
  --secret-string "{\"webhookSecret\":\"${CLERK_WEBHOOK_SECRET}\"}" \
  --region ${AWS_REGION}

echo "Secrets updated successfully!"
