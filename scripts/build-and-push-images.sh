#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Check for required environment variables
if [ -z "$AWS_REGION" ] || [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "Error: Required environment variables are missing."
  echo "Please make sure AWS_REGION and AWS_ACCOUNT_ID are set in your .env file."
  exit 1
fi

# Set variables
ECR_REPO_FRONTEND="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-frontend"
ECR_REPO_BACKEND="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-backend"
TAG=$(git rev-parse --short HEAD)

# Login to ECR
echo "Logging in to Amazon ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Create repositories if they don't exist
echo "Creating ECR repositories if they don't exist..."
aws ecr describe-repositories --repository-names ${APP_NAME}-frontend --region ${AWS_REGION} || aws ecr create-repository --repository-name ${APP_NAME}-frontend --region ${AWS_REGION}
aws ecr describe-repositories --repository-names ${APP_NAME}-backend --region ${AWS_REGION} || aws ecr create-repository --repository-name ${APP_NAME}-backend --region ${AWS_REGION}

# Build and push frontend image
echo "Building and pushing frontend image..."
docker build -t ${ECR_REPO_FRONTEND}:${TAG} -t ${ECR_REPO_FRONTEND}:latest -f Dockerfile.frontend ..
docker push ${ECR_REPO_FRONTEND}:${TAG}
docker push ${ECR_REPO_FRONTEND}:latest

# Build and push backend image
echo "Building and pushing backend image..."
docker build -t ${ECR_REPO_BACKEND}:${TAG} -t ${ECR_REPO_BACKEND}:latest -f Dockerfile.backend ..
docker push ${ECR_REPO_BACKEND}:${TAG}
docker push ${ECR_REPO_BACKEND}:latest

echo "Images built and pushed successfully!"
echo "Frontend image: ${ECR_REPO_FRONTEND}:${TAG}"
echo "Backend image: ${ECR_REPO_BACKEND}:${TAG}"

# Update the CDK stack with the new image tags
echo "Updating image tags in CDK stack..."
sed -i '' "s|image: ecs.ContainerImage.fromRegistry('your-frontend-image:latest')|image: ecs.ContainerImage.fromRegistry('${ECR_REPO_FRONTEND}:${TAG}')|g" ../lib/a1c-infra-stack.ts
sed -i '' "s|image: ecs.ContainerImage.fromRegistry('your-backend-image:latest')|image: ecs.ContainerImage.fromRegistry('${ECR_REPO_BACKEND}:${TAG}')|g" ../lib/a1c-infra-stack.ts

echo "CDK stack updated with new image tags!"
