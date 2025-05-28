"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdkEksStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const eks = __importStar(require("aws-cdk-lib/aws-eks"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const lambda_layer_kubectl_v32_1 = require("@aws-cdk/lambda-layer-kubectl-v32");
class CdkEksStack extends cdk.NestedStack {
    cluster;
    securityGroup;
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create an IAM role for the EKS cluster
        const clusterRole = new iam.Role(this, "ClusterRole", {
            assumedBy: new iam.ServicePrincipal("eks.amazonaws.com"),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSClusterPolicy"),
            ],
        });
        // Create the EKS cluster
        this.cluster = new eks.Cluster(this, "A1CProjectEksCluster", {
            version: eks.KubernetesVersion.V1_27,
            kubectlLayer: new lambda_layer_kubectl_v32_1.KubectlV32Layer(this, "1.32.4"),
            vpc: props.vpc,
            defaultCapacity: 0, // We'll define our own node groups
            role: clusterRole,
            clusterName: "a1c-project-cluster",
            outputClusterName: true,
            outputConfigCommand: true,
            endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE,
            outputMastersRoleArn: true,
            mastersRole: clusterRole,
            bootstrapClusterCreatorAdminPermissions: true,
        });
        // Create a security group for the EKS cluster
        this.securityGroup = new ec2.SecurityGroup(this, "A1C-EKSSecurityGroup", {
            vpc: props.vpc,
            allowAllOutbound: true,
            description: "Security group for A1C EKS cluster",
        });
        this.cluster.addNodegroupCapacity('standard-nodes', {
            instanceTypes: [new ec2.InstanceType('m5.large')],
            minSize: 2,
            desiredSize: 2,
            maxSize: 4,
            diskSize: 50,
            // Use spot instances for cost savings during testing
            capacityType: eks.CapacityType.SPOT,
            // Add labels to identify these nodes
            labels: {
                'role': 'general',
                'workload-type': 'temporary'
            }
        });
        // Associate the security group with the cluster
        this.cluster.connections.addSecurityGroup(this.securityGroup);
        // Create VPC endpoints for AWS services
        this.createVpcEndpoints(props.vpc);
        // Add Fargate profile for the application
        this.cluster.addFargateProfile("DefaultFargateProfile", {
            selectors: [
                { namespace: "default" },
                { namespace: "kube-system" },
                { namespace: "kube-system", labels: { "k8s-app": "kube-dns" } },
            ],
        });
        // ALB Controller Service Account
        const albServiceAccount = this.cluster.addServiceAccount("ALBControllerSA", {
            name: "aws-load-balancer-controller",
            namespace: "kube-system",
        });
        albServiceAccount.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSLoadBalancingPolicy"));
        // Deploy the AWS Load Balancer Controller via Helm
        this.cluster.addHelmChart("ALBController", {
            chart: "aws-load-balancer-controller",
            repository: "https://aws.github.io/eks-charts",
            namespace: "kube-system",
            release: "alb-controller",
            values: {
                clusterName: this.cluster.clusterName,
                serviceAccount: {
                    create: true,
                    name: albServiceAccount.serviceAccountName,
                },
                region: this.region,
            },
        });
        // Add Kubernetes manifests for common services
        // Example: Deploy metrics server
        this.cluster.addHelmChart("MetricsServer", {
            chart: "metrics-server",
            repository: "https://kubernetes-sigs.github.io/metrics-server/",
            namespace: "kube-system",
            values: {
                args: [
                    "--kubelet-preferred-address-types=InternalIP",
                    "--kubelet-use-node-status-port",
                ],
            },
        });
        // Output the kubectl config command
        new cdk.CfnOutput(this, "KubectlConfigCommand", {
            value: `aws eks update-kubeconfig --name ${this.cluster.clusterName} --region ${this.region}`,
            description: "Command to update kubectl config for the cluster",
        });
    }
    createVpcEndpoints(vpc) {
        // Create security group for VPC endpoints
        const vpcEndpointSecurityGroup = new ec2.SecurityGroup(this, "VpcEndpointSecurityGroup", {
            vpc,
            description: "Security group for VPC endpoints",
            allowAllOutbound: true,
        });
        // Allow HTTPS traffic from within the VPC
        vpcEndpointSecurityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(443), "Allow HTTPS traffic from within the VPC");
        // Create VPC endpoints for AWS services needed by the ALB controller and other components
        //   new ec2.InterfaceVpcEndpoint(this, 'StsEndpoint', {
        //     vpc,
        //     service: ec2.InterfaceVpcEndpointAwsService.STS,
        //     privateDnsEnabled: true,
        //     securityGroups: [vpcEndpointSecurityGroup],
        //     subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        //   });
        //   new ec2.InterfaceVpcEndpoint(this, 'EcrDockerEndpoint', {
        //     vpc,
        //     service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
        //     privateDnsEnabled: true,
        //     securityGroups: [vpcEndpointSecurityGroup],
        //     subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        //   });
        //   new ec2.InterfaceVpcEndpoint(this, 'EcrApiEndpoint', {
        //     vpc,
        //     service: ec2.InterfaceVpcEndpointAwsService.ECR,
        //     privateDnsEnabled: true,
        //     securityGroups: [vpcEndpointSecurityGroup],
        //     subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        //   });
        //   new ec2.InterfaceVpcEndpoint(this, 'ElasticLoadBalancingEndpoint', {
        //     vpc,
        //     service: ec2.InterfaceVpcEndpointAwsService.ELASTIC_LOAD_BALANCING,
        //     privateDnsEnabled: true,
        //     securityGroups: [vpcEndpointSecurityGroup],
        //     subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        //   });
        //   // S3 Gateway endpoint (doesn't need security group)
        //   new ec2.GatewayVpcEndpoint(this, 'S3Endpoint', {
        //     vpc,
        //     service: ec2.GatewayVpcEndpointAwsService.S3,
        //   });
        // Add CoreDNS add-on
        new eks.CfnAddon(this, "CoreDNSAddon", {
            addonName: "coredns",
            clusterName: this.cluster.clusterName,
            resolveConflicts: "OVERWRITE",
            // addonVersion: 'v1.10.1-eksbuild.1', // Optional
        });
        // Add kube-proxy add-on
        new eks.CfnAddon(this, "KubeProxyAddon", {
            addonName: "kube-proxy",
            clusterName: this.cluster.clusterName,
            resolveConflicts: "OVERWRITE",
        });
        // Add VPC CNI add-on
        new eks.CfnAddon(this, "VpcCniAddon", {
            addonName: "vpc-cni",
            clusterName: this.cluster.clusterName,
            resolveConflicts: "OVERWRITE",
        });
        // Output the cluster name
        new cdk.CfnOutput(this, "ClusterName", {
            value: this.cluster.clusterName,
            description: "The name of the EKS cluster",
        });
    }
}
exports.CdkEksStack = CdkEksStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RrLWVrcy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNkay1la3Mtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFFbkMseURBQTJDO0FBQzNDLHlEQUEyQztBQUMzQyx5REFBMkM7QUFDM0MsZ0ZBQW9FO0FBTXBFLE1BQWEsV0FBWSxTQUFRLEdBQUcsQ0FBQyxXQUFXO0lBQzlCLE9BQU8sQ0FBYztJQUNyQixhQUFhLENBQW9CO0lBRWpELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBdUI7UUFDL0QsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIseUNBQXlDO1FBQ3pDLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3BELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQztZQUN4RCxlQUFlLEVBQUU7Z0JBQ2YsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyx3QkFBd0IsQ0FBQzthQUNyRTtTQUNGLENBQUMsQ0FBQztRQUVILHlCQUF5QjtRQUN6QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDM0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLO1lBQ3BDLFlBQVksRUFBRSxJQUFJLDBDQUFlLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQztZQUNqRCxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUc7WUFDZCxlQUFlLEVBQUUsQ0FBQyxFQUFFLG1DQUFtQztZQUN2RCxJQUFJLEVBQUUsV0FBVztZQUNqQixXQUFXLEVBQUUscUJBQXFCO1lBQ2xDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsbUJBQW1C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O1FBQ25FLFFBQVE7UUFFUix5REFBeUQ7UUFDekQscURBQXFEO1FBQ3JELFdBQVc7UUFDWCxvREFBb0Q7UUFDcEQsUUFBUTtRQUNQLHFCQUFxQjtRQUN0QixJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUNyQyxTQUFTLEVBQUUsU0FBUztZQUNwQixXQUFXLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ3JDLGdCQUFnQixFQUFFLFdBQVc7WUFDN0Isa0RBQWtEO1NBQ25ELENBQUMsQ0FBQztRQUVILHdCQUF3QjtRQUN4QixJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3ZDLFNBQVMsRUFBRSxZQUFZO1lBQ3ZCLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDckMsZ0JBQWdCLEVBQUUsV0FBVztTQUM5QixDQUFDLENBQUM7UUFFSCxxQkFBcUI7UUFDckIsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDcEMsU0FBUyxFQUFFLFNBQVM7WUFDcEIsV0FBVyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNyQyxnQkFBZ0IsRUFBRSxXQUFXO1NBQzlCLENBQUMsQ0FBQztRQUVILDBCQUEwQjtRQUMxQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNyQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQy9CLFdBQVcsRUFBRSw2QkFBNkI7U0FDM0MsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBL01ELGtDQStNQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSBcImF3cy1jZGstbGliL2F3cy1lYzJcIjtcbmltcG9ydCAqIGFzIGVrcyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVrc1wiO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgeyBLdWJlY3RsVjMyTGF5ZXIgfSBmcm9tIFwiQGF3cy1jZGsvbGFtYmRhLWxheWVyLWt1YmVjdGwtdjMyXCI7XG5cbmludGVyZmFjZSBDZGtFa3NTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICB2cGM6IGVjMi5WcGM7XG59XG5cbmV4cG9ydCBjbGFzcyBDZGtFa3NTdGFjayBleHRlbmRzIGNkay5OZXN0ZWRTdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBjbHVzdGVyOiBla3MuQ2x1c3RlcjtcbiAgcHVibGljIHJlYWRvbmx5IHNlY3VyaXR5R3JvdXA6IGVjMi5TZWN1cml0eUdyb3VwO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDZGtFa3NTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBDcmVhdGUgYW4gSUFNIHJvbGUgZm9yIHRoZSBFS1MgY2x1c3RlclxuICAgIGNvbnN0IGNsdXN0ZXJSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsIFwiQ2x1c3RlclJvbGVcIiwge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoXCJla3MuYW1hem9uYXdzLmNvbVwiKSxcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoXCJBbWF6b25FS1NDbHVzdGVyUG9saWN5XCIpLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSB0aGUgRUtTIGNsdXN0ZXJcbiAgICB0aGlzLmNsdXN0ZXIgPSBuZXcgZWtzLkNsdXN0ZXIodGhpcywgXCJBMUNQcm9qZWN0RWtzQ2x1c3RlclwiLCB7XG4gICAgICB2ZXJzaW9uOiBla3MuS3ViZXJuZXRlc1ZlcnNpb24uVjFfMjcsXG4gICAgICBrdWJlY3RsTGF5ZXI6IG5ldyBLdWJlY3RsVjMyTGF5ZXIodGhpcywgXCIxLjMyLjRcIiksXG4gICAgICB2cGM6IHByb3BzLnZwYyxcbiAgICAgIGRlZmF1bHRDYXBhY2l0eTogMCwgLy8gV2UnbGwgZGVmaW5lIG91ciBvd24gbm9kZSBncm91cHNcbiAgICAgIHJvbGU6IGNsdXN0ZXJSb2xlLFxuICAgICAgY2x1c3Rlck5hbWU6IFwiYTFjLXByb2plY3QtY2x1c3RlclwiLFxuICAgICAgb3V0cHV0Q2x1c3Rlck5hbWU6IHRydWUsXG4gICAgICBvdXRwdXRDb25maWdDb21tYW5kOiB0cnVlLFxuICAgICAgZW5kcG9pbnRBY2Nlc3M6IGVrcy5FbmRwb2ludEFjY2Vzcy5QVUJMSUNfQU5EX1BSSVZBVEUsXG4gICAgICBvdXRwdXRNYXN0ZXJzUm9sZUFybjogdHJ1ZSxcbiAgICAgIG1hc3RlcnNSb2xlOiBjbHVzdGVyUm9sZSxcbiAgICAgIGJvb3RzdHJhcENsdXN0ZXJDcmVhdG9yQWRtaW5QZXJtaXNzaW9uczogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBhIHNlY3VyaXR5IGdyb3VwIGZvciB0aGUgRUtTIGNsdXN0ZXJcbiAgICB0aGlzLnNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgXCJBMUMtRUtTU2VjdXJpdHlHcm91cFwiLCB7XG4gICAgICB2cGM6IHByb3BzLnZwYyxcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogXCJTZWN1cml0eSBncm91cCBmb3IgQTFDIEVLUyBjbHVzdGVyXCIsXG4gICAgfSk7XG5cbiAgICAgdGhpcy5jbHVzdGVyLmFkZE5vZGVncm91cENhcGFjaXR5KCdzdGFuZGFyZC1ub2RlcycsIHtcbiAgICAgIGluc3RhbmNlVHlwZXM6IFtuZXcgZWMyLkluc3RhbmNlVHlwZSgnbTUubGFyZ2UnKV0sXG4gICAgICBtaW5TaXplOiAyLFxuICAgICAgZGVzaXJlZFNpemU6IDIsXG4gICAgICBtYXhTaXplOiA0LFxuICAgICAgZGlza1NpemU6IDUwLFxuICAgICAgLy8gVXNlIHNwb3QgaW5zdGFuY2VzIGZvciBjb3N0IHNhdmluZ3MgZHVyaW5nIHRlc3RpbmdcbiAgICAgIGNhcGFjaXR5VHlwZTogZWtzLkNhcGFjaXR5VHlwZS5TUE9ULFxuICAgICAgLy8gQWRkIGxhYmVscyB0byBpZGVudGlmeSB0aGVzZSBub2Rlc1xuICAgICAgbGFiZWxzOiB7XG4gICAgICAgICdyb2xlJzogJ2dlbmVyYWwnLFxuICAgICAgICAnd29ya2xvYWQtdHlwZSc6ICd0ZW1wb3JhcnknXG4gICAgICB9XG4gICAgICB9KTtcblxuICAgIC8vIEFzc29jaWF0ZSB0aGUgc2VjdXJpdHkgZ3JvdXAgd2l0aCB0aGUgY2x1c3RlclxuICAgIHRoaXMuY2x1c3Rlci5jb25uZWN0aW9ucy5hZGRTZWN1cml0eUdyb3VwKHRoaXMuc2VjdXJpdHlHcm91cCk7XG5cbiAgICAvLyBDcmVhdGUgVlBDIGVuZHBvaW50cyBmb3IgQVdTIHNlcnZpY2VzXG4gICAgdGhpcy5jcmVhdGVWcGNFbmRwb2ludHMocHJvcHMudnBjKTtcblxuICAgIC8vIEFkZCBGYXJnYXRlIHByb2ZpbGUgZm9yIHRoZSBhcHBsaWNhdGlvblxuICAgIHRoaXMuY2x1c3Rlci5hZGRGYXJnYXRlUHJvZmlsZShcIkRlZmF1bHRGYXJnYXRlUHJvZmlsZVwiLCB7XG4gICAgICBzZWxlY3RvcnM6IFtcbiAgICAgICAgeyBuYW1lc3BhY2U6IFwiZGVmYXVsdFwiIH0sXG4gICAgICAgIHsgbmFtZXNwYWNlOiBcImt1YmUtc3lzdGVtXCIgfSxcbiAgICAgICAgeyBuYW1lc3BhY2U6IFwia3ViZS1zeXN0ZW1cIiwgbGFiZWxzOiB7IFwiazhzLWFwcFwiOiBcImt1YmUtZG5zXCIgfSB9LFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIEFMQiBDb250cm9sbGVyIFNlcnZpY2UgQWNjb3VudFxuICAgIGNvbnN0IGFsYlNlcnZpY2VBY2NvdW50ID0gdGhpcy5jbHVzdGVyLmFkZFNlcnZpY2VBY2NvdW50KFxuICAgICAgXCJBTEJDb250cm9sbGVyU0FcIixcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJhd3MtbG9hZC1iYWxhbmNlci1jb250cm9sbGVyXCIsXG4gICAgICAgIG5hbWVzcGFjZTogXCJrdWJlLXN5c3RlbVwiLFxuICAgICAgfVxuICAgICk7XG5cbiAgICBhbGJTZXJ2aWNlQWNjb3VudC5yb2xlLmFkZE1hbmFnZWRQb2xpY3koXG4gICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoXCJBbWF6b25FS1NMb2FkQmFsYW5jaW5nUG9saWN5XCIpXG4gICAgKTtcblxuICAgIC8vIERlcGxveSB0aGUgQVdTIExvYWQgQmFsYW5jZXIgQ29udHJvbGxlciB2aWEgSGVsbVxuICAgIHRoaXMuY2x1c3Rlci5hZGRIZWxtQ2hhcnQoXCJBTEJDb250cm9sbGVyXCIsIHtcbiAgICAgIGNoYXJ0OiBcImF3cy1sb2FkLWJhbGFuY2VyLWNvbnRyb2xsZXJcIixcbiAgICAgIHJlcG9zaXRvcnk6IFwiaHR0cHM6Ly9hd3MuZ2l0aHViLmlvL2Vrcy1jaGFydHNcIixcbiAgICAgIG5hbWVzcGFjZTogXCJrdWJlLXN5c3RlbVwiLFxuICAgICAgcmVsZWFzZTogXCJhbGItY29udHJvbGxlclwiLFxuICAgICAgdmFsdWVzOiB7XG4gICAgICAgIGNsdXN0ZXJOYW1lOiB0aGlzLmNsdXN0ZXIuY2x1c3Rlck5hbWUsXG4gICAgICAgIHNlcnZpY2VBY2NvdW50OiB7XG4gICAgICAgICAgY3JlYXRlOiB0cnVlLFxuICAgICAgICAgIG5hbWU6IGFsYlNlcnZpY2VBY2NvdW50LnNlcnZpY2VBY2NvdW50TmFtZSxcbiAgICAgICAgfSxcbiAgICAgICAgcmVnaW9uOiB0aGlzLnJlZ2lvbixcbiAgICAgIH0sXG4gICAgfSk7XG5cblxuXG4gICAgLy8gQWRkIEt1YmVybmV0ZXMgbWFuaWZlc3RzIGZvciBjb21tb24gc2VydmljZXNcbiAgICAvLyBFeGFtcGxlOiBEZXBsb3kgbWV0cmljcyBzZXJ2ZXJcbiAgICB0aGlzLmNsdXN0ZXIuYWRkSGVsbUNoYXJ0KFwiTWV0cmljc1NlcnZlclwiLCB7XG4gICAgICBjaGFydDogXCJtZXRyaWNzLXNlcnZlclwiLFxuICAgICAgcmVwb3NpdG9yeTogXCJodHRwczovL2t1YmVybmV0ZXMtc2lncy5naXRodWIuaW8vbWV0cmljcy1zZXJ2ZXIvXCIsXG4gICAgICBuYW1lc3BhY2U6IFwia3ViZS1zeXN0ZW1cIixcbiAgICAgIHZhbHVlczoge1xuICAgICAgICBhcmdzOiBbXG4gICAgICAgICAgXCItLWt1YmVsZXQtcHJlZmVycmVkLWFkZHJlc3MtdHlwZXM9SW50ZXJuYWxJUFwiLFxuICAgICAgICAgIFwiLS1rdWJlbGV0LXVzZS1ub2RlLXN0YXR1cy1wb3J0XCIsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gXG5cbiAgICAvLyBPdXRwdXQgdGhlIGt1YmVjdGwgY29uZmlnIGNvbW1hbmRcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIkt1YmVjdGxDb25maWdDb21tYW5kXCIsIHtcbiAgICAgIHZhbHVlOiBgYXdzIGVrcyB1cGRhdGUta3ViZWNvbmZpZyAtLW5hbWUgJHt0aGlzLmNsdXN0ZXIuY2x1c3Rlck5hbWV9IC0tcmVnaW9uICR7dGhpcy5yZWdpb259YCxcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkNvbW1hbmQgdG8gdXBkYXRlIGt1YmVjdGwgY29uZmlnIGZvciB0aGUgY2x1c3RlclwiLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVWcGNFbmRwb2ludHModnBjOiBlYzIuVnBjKTogdm9pZCB7XG4gICAgLy8gQ3JlYXRlIHNlY3VyaXR5IGdyb3VwIGZvciBWUEMgZW5kcG9pbnRzXG4gICAgY29uc3QgdnBjRW5kcG9pbnRTZWN1cml0eUdyb3VwID0gbmV3IGVjMi5TZWN1cml0eUdyb3VwKFxuICAgICAgdGhpcyxcbiAgICAgIFwiVnBjRW5kcG9pbnRTZWN1cml0eUdyb3VwXCIsXG4gICAgICB7XG4gICAgICAgIHZwYyxcbiAgICAgICAgZGVzY3JpcHRpb246IFwiU2VjdXJpdHkgZ3JvdXAgZm9yIFZQQyBlbmRwb2ludHNcIixcbiAgICAgICAgYWxsb3dBbGxPdXRib3VuZDogdHJ1ZSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgLy8gQWxsb3cgSFRUUFMgdHJhZmZpYyBmcm9tIHdpdGhpbiB0aGUgVlBDXG4gICAgdnBjRW5kcG9pbnRTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgZWMyLlBlZXIuaXB2NCh2cGMudnBjQ2lkckJsb2NrKSxcbiAgICAgIGVjMi5Qb3J0LnRjcCg0NDMpLFxuICAgICAgXCJBbGxvdyBIVFRQUyB0cmFmZmljIGZyb20gd2l0aGluIHRoZSBWUENcIlxuICAgICk7XG5cbiAgICAvLyBDcmVhdGUgVlBDIGVuZHBvaW50cyBmb3IgQVdTIHNlcnZpY2VzIG5lZWRlZCBieSB0aGUgQUxCIGNvbnRyb2xsZXIgYW5kIG90aGVyIGNvbXBvbmVudHNcbiAgICAvLyAgIG5ldyBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnQodGhpcywgJ1N0c0VuZHBvaW50Jywge1xuICAgIC8vICAgICB2cGMsXG4gICAgLy8gICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuU1RTLFxuICAgIC8vICAgICBwcml2YXRlRG5zRW5hYmxlZDogdHJ1ZSxcbiAgICAvLyAgICAgc2VjdXJpdHlHcm91cHM6IFt2cGNFbmRwb2ludFNlY3VyaXR5R3JvdXBdLFxuICAgIC8vICAgICBzdWJuZXRzOiB7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MgfSxcbiAgICAvLyAgIH0pO1xuXG4gICAgLy8gICBuZXcgZWMyLkludGVyZmFjZVZwY0VuZHBvaW50KHRoaXMsICdFY3JEb2NrZXJFbmRwb2ludCcsIHtcbiAgICAvLyAgICAgdnBjLFxuICAgIC8vICAgICBzZXJ2aWNlOiBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLkVDUl9ET0NLRVIsXG4gICAgLy8gICAgIHByaXZhdGVEbnNFbmFibGVkOiB0cnVlLFxuICAgIC8vICAgICBzZWN1cml0eUdyb3VwczogW3ZwY0VuZHBvaW50U2VjdXJpdHlHcm91cF0sXG4gICAgLy8gICAgIHN1Ym5ldHM6IHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyB9LFxuICAgIC8vICAgfSk7XG5cbiAgICAvLyAgIG5ldyBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnQodGhpcywgJ0VjckFwaUVuZHBvaW50Jywge1xuICAgIC8vICAgICB2cGMsXG4gICAgLy8gICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuRUNSLFxuICAgIC8vICAgICBwcml2YXRlRG5zRW5hYmxlZDogdHJ1ZSxcbiAgICAvLyAgICAgc2VjdXJpdHlHcm91cHM6IFt2cGNFbmRwb2ludFNlY3VyaXR5R3JvdXBdLFxuICAgIC8vICAgICBzdWJuZXRzOiB7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MgfSxcbiAgICAvLyAgIH0pO1xuXG4gICAgLy8gICBuZXcgZWMyLkludGVyZmFjZVZwY0VuZHBvaW50KHRoaXMsICdFbGFzdGljTG9hZEJhbGFuY2luZ0VuZHBvaW50Jywge1xuICAgIC8vICAgICB2cGMsXG4gICAgLy8gICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuRUxBU1RJQ19MT0FEX0JBTEFOQ0lORyxcbiAgICAvLyAgICAgcHJpdmF0ZURuc0VuYWJsZWQ6IHRydWUsXG4gICAgLy8gICAgIHNlY3VyaXR5R3JvdXBzOiBbdnBjRW5kcG9pbnRTZWN1cml0eUdyb3VwXSxcbiAgICAvLyAgICAgc3VibmV0czogeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTIH0sXG4gICAgLy8gICB9KTtcblxuICAgIC8vICAgLy8gUzMgR2F0ZXdheSBlbmRwb2ludCAoZG9lc24ndCBuZWVkIHNlY3VyaXR5IGdyb3VwKVxuICAgIC8vICAgbmV3IGVjMi5HYXRld2F5VnBjRW5kcG9pbnQodGhpcywgJ1MzRW5kcG9pbnQnLCB7XG4gICAgLy8gICAgIHZwYyxcbiAgICAvLyAgICAgc2VydmljZTogZWMyLkdhdGV3YXlWcGNFbmRwb2ludEF3c1NlcnZpY2UuUzMsXG4gICAgLy8gICB9KTtcbiAgICAgLy8gQWRkIENvcmVETlMgYWRkLW9uXG4gICAgbmV3IGVrcy5DZm5BZGRvbih0aGlzLCBcIkNvcmVETlNBZGRvblwiLCB7XG4gICAgICBhZGRvbk5hbWU6IFwiY29yZWRuc1wiLFxuICAgICAgY2x1c3Rlck5hbWU6IHRoaXMuY2x1c3Rlci5jbHVzdGVyTmFtZSxcbiAgICAgIHJlc29sdmVDb25mbGljdHM6IFwiT1ZFUldSSVRFXCIsXG4gICAgICAvLyBhZGRvblZlcnNpb246ICd2MS4xMC4xLWVrc2J1aWxkLjEnLCAvLyBPcHRpb25hbFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIGt1YmUtcHJveHkgYWRkLW9uXG4gICAgbmV3IGVrcy5DZm5BZGRvbih0aGlzLCBcIkt1YmVQcm94eUFkZG9uXCIsIHtcbiAgICAgIGFkZG9uTmFtZTogXCJrdWJlLXByb3h5XCIsXG4gICAgICBjbHVzdGVyTmFtZTogdGhpcy5jbHVzdGVyLmNsdXN0ZXJOYW1lLFxuICAgICAgcmVzb2x2ZUNvbmZsaWN0czogXCJPVkVSV1JJVEVcIixcbiAgICB9KTtcblxuICAgIC8vIEFkZCBWUEMgQ05JIGFkZC1vblxuICAgIG5ldyBla3MuQ2ZuQWRkb24odGhpcywgXCJWcGNDbmlBZGRvblwiLCB7XG4gICAgICBhZGRvbk5hbWU6IFwidnBjLWNuaVwiLFxuICAgICAgY2x1c3Rlck5hbWU6IHRoaXMuY2x1c3Rlci5jbHVzdGVyTmFtZSxcbiAgICAgIHJlc29sdmVDb25mbGljdHM6IFwiT1ZFUldSSVRFXCIsXG4gICAgfSk7XG5cbiAgICAvLyBPdXRwdXQgdGhlIGNsdXN0ZXIgbmFtZVxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiQ2x1c3Rlck5hbWVcIiwge1xuICAgICAgdmFsdWU6IHRoaXMuY2x1c3Rlci5jbHVzdGVyTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlRoZSBuYW1lIG9mIHRoZSBFS1MgY2x1c3RlclwiLFxuICAgIH0pO1xuICB9XG59XG4iXX0=