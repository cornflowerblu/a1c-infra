import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elasticache from "aws-cdk-lib/aws-elasticache";
export declare class RedisStack extends cdk.NestedStack {
    readonly redisCluster: elasticache.CfnCacheCluster;
    readonly redisSecurityGroup: ec2.SecurityGroup;
    constructor(scope: Construct, id: string, vpc: ec2.Vpc, props?: cdk.NestedStackProps & {
        eksSecurityGroup?: ec2.SecurityGroup;
    });
}
