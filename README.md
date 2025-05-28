# A1C Project Infrastructure

This repository contains the AWS CDK infrastructure code for the A1C Project.

## Architecture

The infrastructure consists of:

- **VPC** with public, private, and isolated subnets
- **ECS Cluster** with Fargate for containerized services
- **Frontend Service** running Next.js with SSR capabilities
- **Backend Service** running NestJS API
- **RDS PostgreSQL** for database storage
- **ElastiCache Redis** for Bull queue and caching
- **Application Load Balancer** for routing traffic
- **CloudFront** (in production) for edge caching and CDN
- **Security Groups** for network isolation
- **Auto Scaling** for both frontend and backend services

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 18 or later
- AWS CDK v2 installed globally (`npm install -g aws-cdk`)

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Bootstrap your AWS environment (if not already done):
   ```
   cdk bootstrap
   ```

3. Update the configuration in `lib/a1c-infra-stack.ts`:
   - Set your domain name
   - Configure environment (dev/prod)
   - Adjust instance sizes if needed

4. Deploy the stack:
   ```
   cdk deploy
   ```

## Docker Image Setup

Before deploying, you need to build and push your Docker images to a container registry:

1. Build your frontend image:
   ```
   cd ../a1c-project/web
   docker build -t your-registry/a1c-frontend:latest .
   docker push your-registry/a1c-frontend:latest
   ```

2. Build your backend image:
   ```
   cd ../a1c-project/api
   docker build -t your-registry/a1c-backend:latest .
   docker push your-registry/a1c-backend:latest
   ```

3. Update the image references in `lib/a1c-infra-stack.ts`

## Secrets Management

After deployment, you need to update the secrets in AWS Secrets Manager:

1. Update the Clerk API keys in the following secrets:
   - `a1c-project/dev/clerk-secret`
   - `a1c-project/dev/clerk-webhook`
   - `a1c-project/dev/clerk-publishable`

## Production Deployment

For production deployment:

1. Update the environment variable to 'prod' in `lib/a1c-infra-stack.ts`
2. Create or import SSL certificates in ACM
3. Update the CloudFront distribution configuration with your certificate ARN
4. Configure your Route53 hosted zone ID and domain name

## Useful Commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
