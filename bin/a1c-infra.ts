#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { A1CInfraStack } from '../lib/a1c-infra-stack';

const app = new cdk.App();
new A1CInfraStack(app, 'A1CInfraStack', {
  /* Using environment variables for account and region */
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
  },
  
  /* Add stack tags for better organization */
  tags: {
    Project: 'A1C-Project',
    Environment: 'Development',
    Owner: 'YourName'
  }
});
