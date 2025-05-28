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
        const clusterRole = new iam.Role(this, 'ClusterRole', {
            assumedBy: new iam.ServicePrincipal('eks.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy'),
            ],
        });
        // Create the EKS cluster
        this.cluster = new eks.Cluster(this, 'A1CProjectEksCluster', {
            version: eks.KubernetesVersion.V1_26,
            kubectlLayer: new lambda_layer_kubectl_v32_1.KubectlV32Layer(this, '1.32.4'),
            vpc: props.vpc,
            defaultCapacity: 0, // We'll define our own node groups
            role: clusterRole,
            clusterName: 'a1c-project-cluster',
            outputClusterName: true,
            outputConfigCommand: true,
            endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE,
            albController: {
                version: eks.AlbControllerVersion.V2_4_1,
            },
            outputMastersRoleArn: true,
            mastersRole: clusterRole,
            bootstrapClusterCreatorAdminPermissions: true,
        });
        // Create a security group for the EKS cluster
        this.securityGroup = new ec2.SecurityGroup(this, 'A1C-EKSSecurityGroup', {
            vpc: props.vpc,
            allowAllOutbound: true,
            description: 'Security group for A1C EKS cluster',
        });
        // Associate the security group with the cluster
        this.cluster.connections.addSecurityGroup(this.securityGroup);
        // Add Fargate profile for the application
        this.cluster.addFargateProfile('DefaultFargateProfile', {
            selectors: [
                { namespace: 'default' },
                { namespace: 'kube-system' }
            ],
            subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
        });
        // Add Kubernetes manifests for common services
        // Example: Deploy metrics server
        this.cluster.addHelmChart('MetricsServer', {
            chart: 'metrics-server',
            repository: 'https://kubernetes-sigs.github.io/metrics-server/',
            namespace: 'kube-system',
            values: {
                args: [
                    '--kubelet-preferred-address-types=InternalIP',
                    '--kubelet-use-node-status-port',
                ],
            },
        });
        // Output the cluster name
        new cdk.CfnOutput(this, 'ClusterName', {
            value: this.cluster.clusterName,
            description: 'The name of the EKS cluster',
        });
        // Output the kubectl config command
        new cdk.CfnOutput(this, 'KubectlConfigCommand', {
            value: `aws eks update-kubeconfig --name ${this.cluster.clusterName} --region ${this.region}`,
            description: 'Command to update kubectl config for the cluster',
        });
    }
}
exports.CdkEksStack = CdkEksStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RrLWVrcy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNkay1la3Mtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFFbkMseURBQTJDO0FBQzNDLHlEQUEyQztBQUMzQyx5REFBMkM7QUFDM0MsZ0ZBQW9FO0FBTXBFLE1BQWEsV0FBWSxTQUFRLEdBQUcsQ0FBQyxXQUFXO0lBQzlCLE9BQU8sQ0FBYztJQUNyQixhQUFhLENBQW9CO0lBRWpELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBdUI7UUFDL0QsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIseUNBQXlDO1FBQ3pDLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3BELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQztZQUN4RCxlQUFlLEVBQUU7Z0JBQ2YsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyx3QkFBd0IsQ0FBQzthQUNyRTtTQUNGLENBQUMsQ0FBQztRQUVILHlCQUF5QjtRQUN6QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDM0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLO1lBQ3BDLFlBQVksRUFBRSxJQUFJLDBDQUFlLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQztZQUNqRCxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUc7WUFDZCxlQUFlLEVBQUUsQ0FBQyxFQUFFLG1DQUFtQztZQUN2RCxJQUFJLEVBQUUsV0FBVztZQUNqQixXQUFXLEVBQUUscUJBQXFCO1lBQ2xDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixjQUFjLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxrQkFBa0I7WUFDckQsYUFBYSxFQUFFO2dCQUNiLE9BQU8sRUFBRSxHQUFHLENBQUMsb0JBQW9CLENBQUMsTUFBTTthQUN6QztZQUNELG9CQUFvQixFQUFFLElBQUk7WUFDMUIsV0FBVyxFQUFFLFdBQVc7WUFDeEIsdUNBQXVDLEVBQUUsSUFBSTtTQUM5QyxDQUFDLENBQUM7UUFFSCw4Q0FBOEM7UUFDOUMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQ3ZFLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRztZQUNkLGdCQUFnQixFQUFFLElBQUk7WUFDdEIsV0FBVyxFQUFFLG9DQUFvQztTQUNsRCxDQUFDLENBQUM7UUFFSCxnREFBZ0Q7UUFDaEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRzlELDBDQUEwQztRQUMxQyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixFQUFFO1lBQ3RELFNBQVMsRUFBRTtnQkFDVCxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7Z0JBQ3hCLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRTthQUM3QjtZQUNELGVBQWUsRUFBRSxFQUFFLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLG1CQUFtQixFQUFFO1NBQ3BFLENBQUMsQ0FBQztRQUdILCtDQUErQztRQUMvQyxpQ0FBaUM7UUFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFO1lBQ3pDLEtBQUssRUFBRSxnQkFBZ0I7WUFDdkIsVUFBVSxFQUFFLG1EQUFtRDtZQUMvRCxTQUFTLEVBQUUsYUFBYTtZQUN4QixNQUFNLEVBQUU7Z0JBQ04sSUFBSSxFQUFFO29CQUNKLDhDQUE4QztvQkFDOUMsZ0NBQWdDO2lCQUNqQzthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsMEJBQTBCO1FBQzFCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3JDLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDL0IsV0FBVyxFQUFFLDZCQUE2QjtTQUMzQyxDQUFDLENBQUM7UUFFSCxvQ0FBb0M7UUFDcEMsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUM5QyxLQUFLLEVBQUUsb0NBQW9DLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxhQUFhLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDN0YsV0FBVyxFQUFFLGtEQUFrRDtTQUNoRSxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFqRkQsa0NBaUZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgZWtzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgS3ViZWN0bFYzMkxheWVyIH0gZnJvbSAnQGF3cy1jZGsvbGFtYmRhLWxheWVyLWt1YmVjdGwtdjMyJztcblxuaW50ZXJmYWNlIENka0Vrc1N0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHZwYzogZWMyLlZwYztcbn1cblxuZXhwb3J0IGNsYXNzIENka0Vrc1N0YWNrIGV4dGVuZHMgY2RrLk5lc3RlZFN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGNsdXN0ZXI6IGVrcy5DbHVzdGVyO1xuICBwdWJsaWMgcmVhZG9ubHkgc2VjdXJpdHlHcm91cDogZWMyLlNlY3VyaXR5R3JvdXA7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IENka0Vrc1N0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIENyZWF0ZSBhbiBJQU0gcm9sZSBmb3IgdGhlIEVLUyBjbHVzdGVyXG4gICAgY29uc3QgY2x1c3RlclJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0NsdXN0ZXJSb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2Vrcy5hbWF6b25hd3MuY29tJyksXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25FS1NDbHVzdGVyUG9saWN5JyksXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBFS1MgY2x1c3RlclxuICAgIHRoaXMuY2x1c3RlciA9IG5ldyBla3MuQ2x1c3Rlcih0aGlzLCAnQTFDUHJvamVjdEVrc0NsdXN0ZXInLCB7XG4gICAgICB2ZXJzaW9uOiBla3MuS3ViZXJuZXRlc1ZlcnNpb24uVjFfMjYsXG4gICAgICBrdWJlY3RsTGF5ZXI6IG5ldyBLdWJlY3RsVjMyTGF5ZXIodGhpcywgJzEuMzIuNCcpLFxuICAgICAgdnBjOiBwcm9wcy52cGMsXG4gICAgICBkZWZhdWx0Q2FwYWNpdHk6IDAsIC8vIFdlJ2xsIGRlZmluZSBvdXIgb3duIG5vZGUgZ3JvdXBzXG4gICAgICByb2xlOiBjbHVzdGVyUm9sZSxcbiAgICAgIGNsdXN0ZXJOYW1lOiAnYTFjLXByb2plY3QtY2x1c3RlcicsXG4gICAgICBvdXRwdXRDbHVzdGVyTmFtZTogdHJ1ZSxcbiAgICAgIG91dHB1dENvbmZpZ0NvbW1hbmQ6IHRydWUsXG4gICAgICBlbmRwb2ludEFjY2VzczogZWtzLkVuZHBvaW50QWNjZXNzLlBVQkxJQ19BTkRfUFJJVkFURSxcbiAgICAgIGFsYkNvbnRyb2xsZXI6IHtcbiAgICAgICAgdmVyc2lvbjogZWtzLkFsYkNvbnRyb2xsZXJWZXJzaW9uLlYyXzRfMSxcbiAgICAgIH0sXG4gICAgICBvdXRwdXRNYXN0ZXJzUm9sZUFybjogdHJ1ZSxcbiAgICAgIG1hc3RlcnNSb2xlOiBjbHVzdGVyUm9sZSxcbiAgICAgIGJvb3RzdHJhcENsdXN0ZXJDcmVhdG9yQWRtaW5QZXJtaXNzaW9uczogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBhIHNlY3VyaXR5IGdyb3VwIGZvciB0aGUgRUtTIGNsdXN0ZXJcbiAgICB0aGlzLnNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0ExQy1FS1NTZWN1cml0eUdyb3VwJywge1xuICAgICAgdnBjOiBwcm9wcy52cGMsXG4gICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgQTFDIEVLUyBjbHVzdGVyJyxcbiAgICB9KTtcblxuICAgIC8vIEFzc29jaWF0ZSB0aGUgc2VjdXJpdHkgZ3JvdXAgd2l0aCB0aGUgY2x1c3RlclxuICAgIHRoaXMuY2x1c3Rlci5jb25uZWN0aW9ucy5hZGRTZWN1cml0eUdyb3VwKHRoaXMuc2VjdXJpdHlHcm91cCk7XG5cbiAgICBcbiAgICAvLyBBZGQgRmFyZ2F0ZSBwcm9maWxlIGZvciB0aGUgYXBwbGljYXRpb25cbiAgICB0aGlzLmNsdXN0ZXIuYWRkRmFyZ2F0ZVByb2ZpbGUoJ0RlZmF1bHRGYXJnYXRlUHJvZmlsZScsIHtcbiAgICAgIHNlbGVjdG9yczogW1xuICAgICAgICB7IG5hbWVzcGFjZTogJ2RlZmF1bHQnIH0sXG4gICAgICAgIHsgbmFtZXNwYWNlOiAna3ViZS1zeXN0ZW0nIH1cbiAgICAgIF0sXG4gICAgICBzdWJuZXRTZWxlY3Rpb246IHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyB9XG4gICAgfSk7XG5cblxuICAgIC8vIEFkZCBLdWJlcm5ldGVzIG1hbmlmZXN0cyBmb3IgY29tbW9uIHNlcnZpY2VzXG4gICAgLy8gRXhhbXBsZTogRGVwbG95IG1ldHJpY3Mgc2VydmVyXG4gICAgdGhpcy5jbHVzdGVyLmFkZEhlbG1DaGFydCgnTWV0cmljc1NlcnZlcicsIHtcbiAgICAgIGNoYXJ0OiAnbWV0cmljcy1zZXJ2ZXInLFxuICAgICAgcmVwb3NpdG9yeTogJ2h0dHBzOi8va3ViZXJuZXRlcy1zaWdzLmdpdGh1Yi5pby9tZXRyaWNzLXNlcnZlci8nLFxuICAgICAgbmFtZXNwYWNlOiAna3ViZS1zeXN0ZW0nLFxuICAgICAgdmFsdWVzOiB7XG4gICAgICAgIGFyZ3M6IFtcbiAgICAgICAgICAnLS1rdWJlbGV0LXByZWZlcnJlZC1hZGRyZXNzLXR5cGVzPUludGVybmFsSVAnLFxuICAgICAgICAgICctLWt1YmVsZXQtdXNlLW5vZGUtc3RhdHVzLXBvcnQnLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIE91dHB1dCB0aGUgY2x1c3RlciBuYW1lXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NsdXN0ZXJOYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuY2x1c3Rlci5jbHVzdGVyTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIG5hbWUgb2YgdGhlIEVLUyBjbHVzdGVyJyxcbiAgICB9KTtcblxuICAgIC8vIE91dHB1dCB0aGUga3ViZWN0bCBjb25maWcgY29tbWFuZFxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdLdWJlY3RsQ29uZmlnQ29tbWFuZCcsIHtcbiAgICAgIHZhbHVlOiBgYXdzIGVrcyB1cGRhdGUta3ViZWNvbmZpZyAtLW5hbWUgJHt0aGlzLmNsdXN0ZXIuY2x1c3Rlck5hbWV9IC0tcmVnaW9uICR7dGhpcy5yZWdpb259YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29tbWFuZCB0byB1cGRhdGUga3ViZWN0bCBjb25maWcgZm9yIHRoZSBjbHVzdGVyJyxcbiAgICB9KTtcbiAgfVxufVxuIl19