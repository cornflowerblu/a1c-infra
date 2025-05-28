import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { CdkEksStack } from "./cdk-eks-stack";
import { DatabaseStack } from "./database-stack";
import { RedisStack } from "./redis-stack";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class A1CInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //Create a new VPC for all resources
    const vpc = new ec2.Vpc(this, "A1CProjectVPC", {
      maxAzs: 3, // Use up to 3 Availability Zones for high availability
      natGateways: 1, // Use 1 NAT Gateway to save costs (use 3 for production)
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Create the EKS cluster stack
    const eksStack = new CdkEksStack(this, "EksStack", {
      env: props?.env,
      vpc: vpc,
    });

    // Create the Aurora Serverless PostgreSQL stack
    const dbStack = new DatabaseStack(this, "DatabaseStack", vpc, {
      eksSecurityGroup: eksStack.securityGroup,
    });

    // Create the Redis stack
    const redisStack = new RedisStack(this, "RedisStack", vpc, {
      eksSecurityGroup: eksStack.securityGroup,
    });

    // Output the VPC ID
    new cdk.CfnOutput(this, "VpcId", {
      value: vpc.vpcId,
      description: "The ID of the VPC",
    });
  }
}
