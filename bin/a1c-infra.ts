#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { A1CInfraStack10 } from '../lib/a1c-infra-stack';
import { CdkEksStack } from '../lib/cdk-eks-stack';

const app = new cdk.App();
const eksOnly = app.node.tryGetContext('eks-only') === 'true';
const vpcId = app.node.tryGetContext('vpc-id');

if (eksOnly) {
  // Deploy only the EKS stack (assuming it's an update to existing resources)
  const eksStack = new cdk.Stack(app, 'EksOnlyStackv2', {
    env: { account: '510985353423', region: 'us-west-1' },
  });
  
  // Always use an existing VPC for EKS-only mode
  const vpcIdToUse = vpcId || app.node.tryGetContext('default-vpc-id');
  
  if (!vpcIdToUse) {
    throw new Error('VPC ID must be provided for EKS-only mode using --context vpc-id=vpc-xxxxxxxx');
  }
  
  // Look up the existing VPC
  const vpc = ec2.Vpc.fromLookup(eksStack, 'ImportedVpc', { vpcId: vpcIdToUse });
  
  // Create the EKS stack as a nested stack
  //@ts-ignore
  new CdkEksStack(eksStack, 'EksCluster', { vpc });
} else {
  // Deploy the full stack
  new A1CInfraStack10(app, 'A1CInfraStack10', {
    env: { account: '510985353423', region: 'us-west-1' }
  });
}
