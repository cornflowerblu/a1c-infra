import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { CdkEksStack } from './cdk-eks-stack';

export class DatabaseStack extends cdk.NestedStack {
  public readonly dbCluster: rds.DatabaseCluster;
  public readonly dbSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, vpc: ec2.Vpc, props?: cdk.NestedStackProps & { eksSecurityGroup?: ec2.SecurityGroup }) {
    super(scope, id, props);

    // Create a security group for the database
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora Serverless PostgreSQL',
      allowAllOutbound: true,
      securityGroupName: 'aurora-serverless-sg',      
    });

    // Allow inbound access from within the VPC
    dbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from within the VPC'  
    );

    // Allow inbound access from the EKS security group if provided
    if (props?.eksSecurityGroup) {
      dbSecurityGroup.addIngressRule(
        ec2.Peer.securityGroupId(props.eksSecurityGroup.securityGroupId),
        ec2.Port.tcp(5432),
        'Allow PostgreSQL access from EKS cluster'
      );
    }

    // Create a secret for the database credentials
    this.dbSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      secretName: 'a1c-project/database-credentials',
      description: 'Credentials for the A1C Project Aurora Serverless PostgreSQL database',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 16,
      },
    });

    // Create the Aurora Serverless v2 PostgreSQL cluster
    this.dbCluster = new rds.DatabaseCluster(this, 'DatabaseCluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_3,
      }), 
        vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        securityGroups: [dbSecurityGroup],
      serverlessV2MinCapacity: 0.5, // Minimum ACU (0.5 is the minimum)
      serverlessV2MaxCapacity: 4,   // Maximum ACU
      writer: rds.ClusterInstance.serverlessV2('Cluster Writer', {
        instanceIdentifier: (ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.MEDIUM),
        publiclyAccessible: false,
        autoMinorVersionUpgrade: true,                 
      }),
      readers: [
        rds.ClusterInstance.serverlessV2('Reader', {
          instanceIdentifier: (ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.SMALL),
          publiclyAccessible: false,
          autoMinorVersionUpgrade: true,
          scaleWithWriter: true,
        }),
      ],
      defaultDatabaseName: 'a1cproject',
      credentials: rds.Credentials.fromSecret(this.dbSecret),
      deletionProtection: false, // Set to true for production
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT, // Create a snapshot before deleting
    });

    // Output the database endpoint
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.dbCluster.clusterEndpoint.hostname,
      description: 'The endpoint of the Aurora Serverless PostgreSQL cluster',
    });

    // Output the secret ARN
    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.dbSecret.secretArn,
      description: 'The ARN of the database credentials secret',
    });
  }
}
