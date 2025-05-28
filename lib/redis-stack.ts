import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elasticache from "aws-cdk-lib/aws-elasticache";

export class RedisStack extends cdk.NestedStack {
  public readonly redisCluster: elasticache.CfnCacheCluster;
  public readonly redisSecurityGroup: ec2.SecurityGroup;

  constructor(
    scope: Construct,
    id: string,
    vpc: ec2.Vpc,
    props?: cdk.NestedStackProps & { eksSecurityGroup?: ec2.SecurityGroup }
  ) {
    super(scope, id, props);

    // Create a security group for Redis
    this.redisSecurityGroup = new ec2.SecurityGroup(
      this,
      "RedisSecurityGroup",
      {
        vpc,
        description: "Security group for Redis",
        allowAllOutbound: true,
      }
    );

    // Allow inbound access from within the VPC
    this.redisSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(6379),
      "Allow Redis access from within the VPC"
    );

    // Allow inbound access from the EKS security group if provided
    if (props?.eksSecurityGroup) {
      this.redisSecurityGroup.addIngressRule(
        ec2.Peer.securityGroupId(props.eksSecurityGroup.securityGroupId),
        ec2.Port.tcp(5432),
        "Allow Redis access from EKS cluster"
      );
    }

    // Create a subnet group for Redis
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(
      this,
      "RedisSubnetGroup",
      {
        description: "Subnet group for Redis",
        subnetIds: vpc.privateSubnets.map((subnet) => subnet.subnetId),
      }
    );

    // Create a Redis parameter group
    const redisParameterGroup = new elasticache.CfnParameterGroup(
      this,
      "RedisParameterGroup",
      {
        cacheParameterGroupFamily: "redis6.x",
        description: "Parameter group for Redis 6.x",
        properties: {
          "maxmemory-policy": "volatile-lru",
        },
      }
    );

    // Create the Redis cluster
    this.redisCluster = new elasticache.CfnCacheCluster(this, "RedisCluster", {
      cacheNodeType: "cache.t3.small",
      engine: "redis",
      numCacheNodes: 1,
      autoMinorVersionUpgrade: true,
      cacheParameterGroupName: redisParameterGroup.ref,
      cacheSubnetGroupName: redisSubnetGroup.ref,
      vpcSecurityGroupIds: [this.redisSecurityGroup.securityGroupId],
      engineVersion: "6.2",
    });

    // Output the Redis endpoint
    new cdk.CfnOutput(this, "RedisEndpoint", {
      value: this.redisCluster.attrRedisEndpointAddress,
      description: "The endpoint of the Redis cluster",
    });

    // Output the Redis port
    new cdk.CfnOutput(this, "RedisPort", {
      value: this.redisCluster.attrRedisEndpointPort,
      description: "The port of the Redis cluster",
    });
  }
}
