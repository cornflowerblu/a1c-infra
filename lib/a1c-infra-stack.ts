import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { CdkEksStack } from "./cdk-eks-stack";
import { DatabaseStack } from "./database-stack";
import { RedisStack } from "./redis-stack";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class A1CInfraStack10 extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //Create a new VPC for all resources
    const vpc = new ec2.Vpc(this, "A1CProjectVPC10", {
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

    const cfnVpc = vpc.node.defaultChild as ec2.CfnVPC;
    cfnVpc.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.RETAIN;

    // Create the EKS cluster stack
    const eksStack = new CdkEksStack(this, "EksStack", {
      env: props?.env,
      vpc: vpc,
    });

    // Set deletion policy for the EKS cluster
    const cfnEksStack = eksStack.node.defaultChild as cdk.CfnResource;
    if (cfnEksStack) {
      cfnEksStack.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.RETAIN;
    }
    
    // Create the Aurora Serverless PostgreSQL stack
    const dbStack = new DatabaseStack(this, "DatabaseStack", vpc, {
      eksSecurityGroup: eksStack.securityGroup,
    });

    const cfnDbstack = dbStack.node.defaultChild as cdk.CfnResource;
    if (cfnDbstack) {
      cfnDbstack.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.RETAIN;
    }

    // Create the Redis stack
    const redisStack = new RedisStack(this, "RedisStack", vpc, {
      eksSecurityGroup: eksStack.securityGroup,
    });

    const cfnRedisStack = redisStack.node.defaultChild as cdk.CfnResource;
    if (cfnRedisStack) {
      cfnRedisStack.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.RETAIN;
    }

    // Output the VPC ID
    new cdk.CfnOutput(this, "VpcId", {
      value: vpc.vpcId,
      description: "The ID of the VPC",
    });
  }
}
