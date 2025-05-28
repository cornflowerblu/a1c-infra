import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
interface CdkEksStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
}
export declare class CdkEksStack extends cdk.NestedStack {
    readonly cluster: eks.Cluster;
    readonly securityGroup: ec2.SecurityGroup;
    constructor(scope: Construct, id: string, props: CdkEksStackProps);
    private createVpcEndpoints;
}
export {};
