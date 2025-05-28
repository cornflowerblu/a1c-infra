import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
export declare class DatabaseStack extends cdk.NestedStack {
    readonly dbCluster: rds.DatabaseCluster;
    readonly dbSecret: secretsmanager.Secret;
    constructor(scope: Construct, id: string, vpc: ec2.Vpc, props?: cdk.NestedStackProps & {
        eksSecurityGroup?: ec2.SecurityGroup;
    });
}
