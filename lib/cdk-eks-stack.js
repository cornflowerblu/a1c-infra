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
                // amazonq-ignore-next-line
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSClusterPolicy"),
            ],
        });
        // Create the EKS cluster
        this.cluster = new eks.Cluster(this, "A1CProjectEksCluster10", {
            version: eks.KubernetesVersion.V1_32,
            kubectlLayer: new lambda_layer_kubectl_v32_1.KubectlV32Layer(this, "1.32.4"),
            vpc: props.vpc,
            defaultCapacity: 0, // We'll define our own node groups
            role: clusterRole,
            clusterName: "a1c-project-cluster10",
            albController: {
                version: eks.AlbControllerVersion.V2_8_2,
            },
            outputClusterName: true,
            outputConfigCommand: true,
            endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE,
            outputMastersRoleArn: true,
            mastersRole: clusterRole,
            // Add CloudWatch logging configuration
            clusterLogging: [
                eks.ClusterLoggingTypes.API,
                eks.ClusterLoggingTypes.AUDIT,
                eks.ClusterLoggingTypes.AUTHENTICATOR,
                eks.ClusterLoggingTypes.CONTROLLER_MANAGER,
                eks.ClusterLoggingTypes.SCHEDULER,
            ],
        });
        // Create a security group for the EKS cluster
        this.securityGroup = new ec2.SecurityGroup(this, "A1C-EKSSecurityGroup10", {
            vpc: props.vpc,
            allowAllOutbound: true,
            description: "Security group for A1C EKS cluster10",
        });
        this.cluster.addNodegroupCapacity("standard-nodes", {
            instanceTypes: [new ec2.InstanceType("m5.large")],
            minSize: 2,
            desiredSize: 2,
            maxSize: 4,
            diskSize: 50,
            // Use spot instances for cost savings during testing
            capacityType: eks.CapacityType.SPOT,
            // Add labels to identify these nodes
            labels: {
                role: "general",
                "workload-type": "temporary",
            },
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
        // Deploy NGINX sample with ALB Ingress
        // deployNginxSample(this.cluster);
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
        new ec2.InterfaceVpcEndpoint(this, "StsEndpoint", {
            vpc,
            service: ec2.InterfaceVpcEndpointAwsService.STS,
            privateDnsEnabled: true,
            securityGroups: [vpcEndpointSecurityGroup],
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        new ec2.InterfaceVpcEndpoint(this, "EcrDockerEndpoint", {
            vpc,
            service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
            privateDnsEnabled: true,
            securityGroups: [vpcEndpointSecurityGroup],
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        new ec2.InterfaceVpcEndpoint(this, "EcrApiEndpoint", {
            vpc,
            service: ec2.InterfaceVpcEndpointAwsService.ECR,
            privateDnsEnabled: true,
            securityGroups: [vpcEndpointSecurityGroup],
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        new ec2.InterfaceVpcEndpoint(this, "ElasticLoadBalancingEndpoint", {
            vpc,
            service: ec2.InterfaceVpcEndpointAwsService.ELASTIC_LOAD_BALANCING,
            privateDnsEnabled: true,
            securityGroups: [vpcEndpointSecurityGroup],
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        // S3 Gateway endpoint (doesn't need security group)
        new ec2.GatewayVpcEndpoint(this, "S3Endpoint", {
            vpc,
            service: ec2.GatewayVpcEndpointAwsService.S3,
        });
        // Add CoreDNS add-on
        try {
            // Add CoreDNS add-on
            this.addEksAddon("CoreDNSAddon", "coredns");
            // Add kube-proxy add-on
            this.addEksAddon("KubeProxyAddon", "kube-proxy");
            // Add VPC CNI add-on
            this.addEksAddon("VpcCniAddon", "vpc-cni");
        }
        catch (error) {
            // Log detailed error information
            console.error("Failed to add EKS add-ons:", error instanceof Error ? error.message : String(error));
            // Continue deployment without failing
            // You might want to add a CloudFormation output to indicate the failure
            new cdk.CfnOutput(this, "AddonsWarning", {
                value: "EKS add-ons installation failed, check logs for details",
                description: "Warning about EKS add-ons installation",
            });
        }
        // Output the cluster name - moved outside try/catch since this should always run
        new cdk.CfnOutput(this, "ClusterName", {
            value: this.cluster.clusterName,
            description: "The name of the EKS cluster",
        });
    }
    addEksAddon(id, addonName) {
        try {
            new eks.CfnAddon(this, id, {
                addonName: addonName,
                clusterName: this.cluster.clusterName,
                resolveConflicts: "OVERWRITE",
            });
        }
        catch (error) {
            console.error(`Failed to add ${addonName} add-on:`, error instanceof Error ? error.message : String(error));
        }
    }
}
exports.CdkEksStack = CdkEksStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RrLWVrcy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNkay1la3Mtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFFbkMseURBQTJDO0FBQzNDLHlEQUEyQztBQUMzQyx5REFBMkM7QUFDM0MsZ0ZBQW9FO0FBUXBFLE1BQWEsV0FBWSxTQUFRLEdBQUcsQ0FBQyxXQUFXO0lBQzlCLE9BQU8sQ0FBYztJQUNyQixhQUFhLENBQW9CO0lBRWpELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBdUI7UUFDL0QsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIseUNBQXlDO1FBQ3pDLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3BELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQztZQUN4RCxlQUFlLEVBQUU7Z0JBQ2YsMkJBQTJCO2dCQUMzQixHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLHdCQUF3QixDQUFDO2FBQ3JFO1NBQ0YsQ0FBQyxDQUFDO1FBRUgseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUM3RCxPQUFPLEVBQUUsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEtBQUs7WUFDcEMsWUFBWSxFQUFFLElBQUksMENBQWUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDO1lBQ2pELEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRztZQUNkLGVBQWUsRUFBRSxDQUFDLEVBQUUsbUNBQW1DO1lBQ3ZELElBQUksRUFBRSxXQUFXO1lBQ2pCLFdBQVcsRUFBRSx1QkFBdUI7WUFDcEMsYUFBYSxFQUFFO2dCQUNi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Q3RDLHdFQUF3RTtZQUN4RSxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtnQkFDdkMsS0FBSyxFQUFFLHlEQUF5RDtnQkFDaEUsV0FBVyxFQUFFLHdDQUF3QzthQUN0RCxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsaUZBQWlGO1FBQ2pGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3JDLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDL0IsV0FBVyxFQUFFLDZCQUE2QjtTQUMzQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sV0FBVyxDQUFDLEVBQVUsRUFBRSxTQUFpQjtRQUMvQyxJQUFJLENBQUM7WUFDSCxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRTtnQkFDekIsU0FBUyxFQUFFLFNBQVM7Z0JBQ3BCLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVc7Z0JBQ3JDLGdCQUFnQixFQUFFLFdBQVc7YUFDOUIsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUNYLGlCQUFpQixTQUFTLFVBQVUsRUFDcEMsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUN2RCxDQUFDO1FBQ0osQ0FBQztJQUNILENBQUM7Q0FDRjtBQWxORCxrQ0FrTkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWMyXCI7XG5pbXBvcnQgKiBhcyBla3MgZnJvbSBcImF3cy1jZGstbGliL2F3cy1la3NcIjtcbmltcG9ydCAqIGFzIGlhbSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWlhbVwiO1xuaW1wb3J0IHsgS3ViZWN0bFYzMkxheWVyIH0gZnJvbSBcIkBhd3MtY2RrL2xhbWJkYS1sYXllci1rdWJlY3RsLXYzMlwiO1xuLy8gaW1wb3J0IHsgZGVwbG95TmdpbnhTYW1wbGUgfSBmcm9tIFwiLi9hbGItc2VydmljZS10ZXN0XCI7XG5cblxuaW50ZXJmYWNlIENka0Vrc1N0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHZwYzogZWMyLlZwYztcbn1cblxuZXhwb3J0IGNsYXNzIENka0Vrc1N0YWNrIGV4dGVuZHMgY2RrLk5lc3RlZFN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGNsdXN0ZXI6IGVrcy5DbHVzdGVyO1xuICBwdWJsaWMgcmVhZG9ubHkgc2VjdXJpdHlHcm91cDogZWMyLlNlY3VyaXR5R3JvdXA7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IENka0Vrc1N0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIENyZWF0ZSBhbiBJQU0gcm9sZSBmb3IgdGhlIEVLUyBjbHVzdGVyXG4gICAgY29uc3QgY2x1c3RlclJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgXCJDbHVzdGVyUm9sZVwiLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbChcImVrcy5hbWF6b25hd3MuY29tXCIpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIC8vIGFtYXpvbnEtaWdub3JlLW5leHQtbGluZVxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoXCJBbWF6b25FS1NDbHVzdGVyUG9saWN5XCIpLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSB0aGUgRUtTIGNsdXN0ZXJcbiAgICB0aGlzLmNsdXN0ZXIgPSBuZXcgZWtzLkNsdXN0ZXIodGhpcywgXCJBMUNQcm9qZWN0RWtzQ2x1c3RlcjEwXCIsIHtcbiAgICAgIHZlcnNpb246IGVrcy5LdWJlcm5ldGVzVmVyc2lvbi5WMV8zMixcbiAgICAgIGt1YmVjdGxMYXllcjogbmV3IEt1YmVjdGxWMzJMYXllcih0aGlzLCBcIjEuMzIuNFwiKSxcbiAgICAgIHZwYzogcHJvcHMudnBjLFxuICAgICAgZGVmYXVsdENhcGFjaXR5OiAwLCAvLyBXZSdsbCBkZWZpbmUgb3VyIG93biBub2RlIGdyb3Vwc1xuICAgICAgcm9sZTogY2x1c3RlclJvbGUsXG4gICAgICBjbHVzdGVyTmFtZTogXCJhMWMtcHJvamVjdC1jbHVzdGVyMTBcIixcbiAgICAgIGFsYkNvbnRyb2xsZXI6IHtcbiAgICAgICAgdmVyc2lvbjogZWtzLkFsYkNvbnRyb2xsZXJWZXJzaW9uLlYyXzhfMixcbiAgICAgIH0sXG4gICAgICBvdXRwdXRDbHVzdGVyTmFtZTogdHJ1ZSxcbiAgICAgIG91dHB1dENvbmZpZ0NvbW1hbmQ6IHRydWUsXG4gICAgICBlbmRwb2ludEFjY2VzczogZWtzLkVuZHBvaW50QWNjZXNzLlBVQkxJQ19BTkRfUFJJVkFURSxcbiAgICAgIG91dHB1dE1hc3RlcnNSb2xlQXJuOiB0cnVlLFxuICAgICAgbWFzdGVyc1JvbGU6IGNsdXN0ZXJSb2xlLFxuICAgICAgLy8gQWRkIENsb3VkV2F0Y2ggbG9nZ2luZyBjb25maWd1cmF0aW9uXG4gICAgICBjbHVzdGVyTG9nZ2luZzogW1xuICAgICAgICBla3MuQ2x1c3RlckxvZ2dpbmdUeXBlcy5BUEksXG4gICAgICAgIGVrcy5DbHVzdGVyTG9nZ2luZ1R5cGVzLkFVRElULFxuICAgICAgICBla3MuQ2x1c3RlckxvZ2dpbmdUeXBlcy5BVVRIRU5USUNBVE9SLFxuICAgICAgICBla3MuQ2x1c3RlckxvZ2dpbmdUeXBlcy5DT05UUk9MTEVSX01BTkFHRVIsXG4gICAgICAgIGVrcy5DbHVzdGVyTG9nZ2luZ1R5cGVzLlNDSEVEVUxFUixcbiAgICAgIF0sXG4gICAgfSk7XG5cblxuXG4gICAgLy8gQ3JlYXRlIGEgc2VjdXJpdHkgZ3JvdXAgZm9yIHRoZSBFS1MgY2x1c3RlclxuICAgIHRoaXMuc2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCBcIkExQy1FS1NTZWN1cml0eUdyb3VwMTBcIiwge1xuICAgICAgdnBjOiBwcm9wcy52cGMsXG4gICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246IFwiU2VjdXJpdHkgZ3JvdXAgZm9yIEExQyBFS1MgY2x1c3RlcjEwXCIsXG4gICAgfSk7XG5cbiAgICB0aGlzLmNsdXN0ZXIuYWRkTm9kZWdyb3VwQ2FwYWNpdHkoXCJzdGFuZGFyZC1ub2Rlc1wiLCB7XG4gICAgICBpbnN0YW5jZVR5cGVzOiBbbmV3IGVjMi5JbnN0YW5jZVR5cGUoXCJtNS5sYXJnZVwiKV0sXG4gICAgICBtaW5TaXplOiAyLFxuICAgICAgZGVzaXJlZFNpemU6IDIsXG4gICAgICBtYXhTaXplOiA0LFxuICAgICAgZGlza1NpemU6IDUwLFxuICAgICAgLy8gVXNlIHNwb3QgaW5zdGFuY2VzIGZvciBjb3N0IHNhdmluZ3MgZHVyaW5nIHRlc3RpbmdcbiAgICAgIGNhcGFjaXR5VHlwZTogZWtzLkNhcGFjaXR5VHlwZS5TUE9ULFxuICAgICAgLy8gQWRkIGxhYmVscyB0byBpZGVudGlmeSB0aGVzZSBub2Rlc1xuICAgICAgbGFiZWxzOiB7XG4gICAgICAgIHJvbGU6IFwiZ2VuZXJhbFwiLFxuICAgICAgICBcIndvcmtsb2FkLXR5cGVcIjogXCJ0ZW1wb3JhcnlcIixcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBBc3NvY2lhdGUgdGhlIHNlY3VyaXR5IGdyb3VwIHdpdGggdGhlIGNsdXN0ZXJcbiAgICB0aGlzLmNsdXN0ZXIuY29ubmVjdGlvbnMuYWRkU2VjdXJpdHlHcm91cCh0aGlzLnNlY3VyaXR5R3JvdXApO1xuXG4gICAgLy8gQ3JlYXRlIFZQQyBlbmRwb2ludHMgZm9yIEFXUyBzZXJ2aWNlc1xuICAgIHRoaXMuY3JlYXRlVnBjRW5kcG9pbnRzKHByb3BzLnZwYyk7XG5cbiAgICAvLyBBZGQgRmFyZ2F0ZSBwcm9maWxlIGZvciB0aGUgYXBwbGljYXRpb25cbiAgICB0aGlzLmNsdXN0ZXIuYWRkRmFyZ2F0ZVByb2ZpbGUoXCJEZWZhdWx0RmFyZ2F0ZVByb2ZpbGVcIiwge1xuICAgICAgc2VsZWN0b3JzOiBbXG4gICAgICAgIHsgbmFtZXNwYWNlOiBcImRlZmF1bHRcIiB9LFxuICAgICAgICB7IG5hbWVzcGFjZTogXCJrdWJlLXN5c3RlbVwiIH0sXG4gICAgICAgIHsgbmFtZXNwYWNlOiBcImt1YmUtc3lzdGVtXCIsIGxhYmVsczogeyBcIms4cy1hcHBcIjogXCJrdWJlLWRuc1wiIH0gfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICBcbiAgICAvLyBBZGQgS3ViZXJuZXRlcyBtYW5pZmVzdHMgZm9yIGNvbW1vbiBzZXJ2aWNlc1xuICAgIC8vIEV4YW1wbGU6IERlcGxveSBtZXRyaWNzIHNlcnZlclxuICAgIHRoaXMuY2x1c3Rlci5hZGRIZWxtQ2hhcnQoXCJNZXRyaWNzU2VydmVyXCIsIHtcbiAgICAgIGNoYXJ0OiBcIm1ldHJpY3Mtc2VydmVyXCIsXG4gICAgICByZXBvc2l0b3J5OiBcImh0dHBzOi8va3ViZXJuZXRlcy1zaWdzLmdpdGh1Yi5pby9tZXRyaWNzLXNlcnZlci9cIixcbiAgICAgIG5hbWVzcGFjZTogXCJrdWJlLXN5c3RlbVwiLFxuICAgICAgdmFsdWVzOiB7XG4gICAgICAgIGFyZ3M6IFtcbiAgICAgICAgICBcIi0ta3ViZWxldC1wcmVmZXJyZWQtYWRkcmVzcy10eXBlcz1JbnRlcm5hbElQXCIsXG4gICAgICAgICAgXCItLWt1YmVsZXQtdXNlLW5vZGUtc3RhdHVzLXBvcnRcIixcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBPdXRwdXQgdGhlIGt1YmVjdGwgY29uZmlnIGNvbW1hbmRcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIkt1YmVjdGxDb25maWdDb21tYW5kXCIsIHtcbiAgICAgIHZhbHVlOiBgYXdzIGVrcyB1cGRhdGUta3ViZWNvbmZpZyAtLW5hbWUgJHt0aGlzLmNsdXN0ZXIuY2x1c3Rlck5hbWV9IC0tcmVnaW9uICR7dGhpcy5yZWdpb259YCxcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkNvbW1hbmQgdG8gdXBkYXRlIGt1YmVjdGwgY29uZmlnIGZvciB0aGUgY2x1c3RlclwiLFxuICAgIH0pO1xuXG4gICAgLy8gRGVwbG95IE5HSU5YIHNhbXBsZSB3aXRoIEFMQiBJbmdyZXNzXG4gICAgLy8gZGVwbG95TmdpbnhTYW1wbGUodGhpcy5jbHVzdGVyKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlVnBjRW5kcG9pbnRzKHZwYzogZWMyLlZwYyk6IHZvaWQge1xuICAgIC8vIENyZWF0ZSBzZWN1cml0eSBncm91cCBmb3IgVlBDIGVuZHBvaW50c1xuICAgIGNvbnN0IHZwY0VuZHBvaW50U2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cChcbiAgICAgIHRoaXMsXG4gICAgICBcIlZwY0VuZHBvaW50U2VjdXJpdHlHcm91cFwiLFxuICAgICAge1xuICAgICAgICB2cGMsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBcIlNlY3VyaXR5IGdyb3VwIGZvciBWUEMgZW5kcG9pbnRzXCIsXG4gICAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IHRydWUsXG4gICAgICB9XG4gICAgKTtcblxuICAgIC8vIEFsbG93IEhUVFBTIHRyYWZmaWMgZnJvbSB3aXRoaW4gdGhlIFZQQ1xuICAgIHZwY0VuZHBvaW50U2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcbiAgICAgIGVjMi5QZWVyLmlwdjQodnBjLnZwY0NpZHJCbG9jayksXG4gICAgICBlYzIuUG9ydC50Y3AoNDQzKSxcbiAgICAgIFwiQWxsb3cgSFRUUFMgdHJhZmZpYyBmcm9tIHdpdGhpbiB0aGUgVlBDXCJcbiAgICApO1xuXG4gICAgLy8gQ3JlYXRlIFZQQyBlbmRwb2ludHMgZm9yIEFXUyBzZXJ2aWNlcyBuZWVkZWQgYnkgdGhlIEFMQiBjb250cm9sbGVyIGFuZCBvdGhlciBjb21wb25lbnRzXG4gICAgbmV3IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludCh0aGlzLCBcIlN0c0VuZHBvaW50XCIsIHtcbiAgICAgIHZwYyxcbiAgICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuU1RTLFxuICAgICAgcHJpdmF0ZURuc0VuYWJsZWQ6IHRydWUsXG4gICAgICBzZWN1cml0eUdyb3VwczogW3ZwY0VuZHBvaW50U2VjdXJpdHlHcm91cF0sXG4gICAgICBzdWJuZXRzOiB7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MgfSxcbiAgICB9KTtcblxuICAgIG5ldyBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnQodGhpcywgXCJFY3JEb2NrZXJFbmRwb2ludFwiLCB7XG4gICAgICB2cGMsXG4gICAgICBzZXJ2aWNlOiBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLkVDUl9ET0NLRVIsXG4gICAgICBwcml2YXRlRG5zRW5hYmxlZDogdHJ1ZSxcbiAgICAgIHNlY3VyaXR5R3JvdXBzOiBbdnBjRW5kcG9pbnRTZWN1cml0eUdyb3VwXSxcbiAgICAgIHN1Ym5ldHM6IHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyB9LFxuICAgIH0pO1xuXG4gICAgbmV3IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludCh0aGlzLCBcIkVjckFwaUVuZHBvaW50XCIsIHtcbiAgICAgIHZwYyxcbiAgICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuRUNSLFxuICAgICAgcHJpdmF0ZURuc0VuYWJsZWQ6IHRydWUsXG4gICAgICBzZWN1cml0eUdyb3VwczogW3ZwY0VuZHBvaW50U2VjdXJpdHlHcm91cF0sXG4gICAgICBzdWJuZXRzOiB7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MgfSxcbiAgICB9KTtcblxuICAgIG5ldyBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnQodGhpcywgXCJFbGFzdGljTG9hZEJhbGFuY2luZ0VuZHBvaW50XCIsIHtcbiAgICAgIHZwYyxcbiAgICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuRUxBU1RJQ19MT0FEX0JBTEFOQ0lORyxcbiAgICAgIHByaXZhdGVEbnNFbmFibGVkOiB0cnVlLFxuICAgICAgc2VjdXJpdHlHcm91cHM6IFt2cGNFbmRwb2ludFNlY3VyaXR5R3JvdXBdLFxuICAgICAgc3VibmV0czogeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTIH0sXG4gICAgfSk7XG5cbiAgICAvLyBTMyBHYXRld2F5IGVuZHBvaW50IChkb2Vzbid0IG5lZWQgc2VjdXJpdHkgZ3JvdXApXG4gICAgbmV3IGVjMi5HYXRld2F5VnBjRW5kcG9pbnQodGhpcywgXCJTM0VuZHBvaW50XCIsIHtcbiAgICAgIHZwYyxcbiAgICAgIHNlcnZpY2U6IGVjMi5HYXRld2F5VnBjRW5kcG9pbnRBd3NTZXJ2aWNlLlMzLFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIENvcmVETlMgYWRkLW9uXG4gICAgdHJ5IHtcbiAgICAgIC8vIEFkZCBDb3JlRE5TIGFkZC1vblxuICAgICAgdGhpcy5hZGRFa3NBZGRvbihcIkNvcmVETlNBZGRvblwiLCBcImNvcmVkbnNcIik7XG5cbiAgICAgIC8vIEFkZCBrdWJlLXByb3h5IGFkZC1vblxuICAgICAgdGhpcy5hZGRFa3NBZGRvbihcIkt1YmVQcm94eUFkZG9uXCIsIFwia3ViZS1wcm94eVwiKTtcblxuICAgICAgLy8gQWRkIFZQQyBDTkkgYWRkLW9uXG4gICAgICB0aGlzLmFkZEVrc0FkZG9uKFwiVnBjQ25pQWRkb25cIiwgXCJ2cGMtY25pXCIpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBMb2cgZGV0YWlsZWQgZXJyb3IgaW5mb3JtYXRpb25cbiAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgIFwiRmFpbGVkIHRvIGFkZCBFS1MgYWRkLW9uczpcIixcbiAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXG4gICAgICApO1xuXG4gICAgICAvLyBDb250aW51ZSBkZXBsb3ltZW50IHdpdGhvdXQgZmFpbGluZ1xuICAgICAgLy8gWW91IG1pZ2h0IHdhbnQgdG8gYWRkIGEgQ2xvdWRGb3JtYXRpb24gb3V0cHV0IHRvIGluZGljYXRlIHRoZSBmYWlsdXJlXG4gICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIkFkZG9uc1dhcm5pbmdcIiwge1xuICAgICAgICB2YWx1ZTogXCJFS1MgYWRkLW9ucyBpbnN0YWxsYXRpb24gZmFpbGVkLCBjaGVjayBsb2dzIGZvciBkZXRhaWxzXCIsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBcIldhcm5pbmcgYWJvdXQgRUtTIGFkZC1vbnMgaW5zdGFsbGF0aW9uXCIsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBPdXRwdXQgdGhlIGNsdXN0ZXIgbmFtZSAtIG1vdmVkIG91dHNpZGUgdHJ5L2NhdGNoIHNpbmNlIHRoaXMgc2hvdWxkIGFsd2F5cyBydW5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIkNsdXN0ZXJOYW1lXCIsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmNsdXN0ZXIuY2x1c3Rlck5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogXCJUaGUgbmFtZSBvZiB0aGUgRUtTIGNsdXN0ZXJcIixcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkRWtzQWRkb24oaWQ6IHN0cmluZywgYWRkb25OYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0cnkge1xuICAgICAgbmV3IGVrcy5DZm5BZGRvbih0aGlzLCBpZCwge1xuICAgICAgICBhZGRvbk5hbWU6IGFkZG9uTmFtZSxcbiAgICAgICAgY2x1c3Rlck5hbWU6IHRoaXMuY2x1c3Rlci5jbHVzdGVyTmFtZSxcbiAgICAgICAgcmVzb2x2ZUNvbmZsaWN0czogXCJPVkVSV1JJVEVcIixcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICBgRmFpbGVkIHRvIGFkZCAke2FkZG9uTmFtZX0gYWRkLW9uOmAsXG4gICAgICAgIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKVxuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==