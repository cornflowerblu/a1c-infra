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

# Build the CDK app
echo "Building CDK app..."
npm run build

# Synthesize CloudFormation template
echo "Synthesizing CloudFormation template..."
cdk synth

# Deploy the stack
echo "Deploying stack to AWS..."
cdk deploy --require-approval never

echo "Deployment completed successfully!"
