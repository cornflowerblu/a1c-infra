import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import { KubectlV32Layer } from '@aws-cdk/lambda-layer-kubectl-v32';

interface CdkEksStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

export class CdkEksStack extends cdk.NestedStack {
  public readonly cluster: eks.Cluster;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: CdkEksStackProps) {
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
      kubectlLayer: new KubectlV32Layer(this, '1.32.4'),
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
