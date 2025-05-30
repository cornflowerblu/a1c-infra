import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import { KubectlV32Layer } from "@aws-cdk/lambda-layer-kubectl-v32";

interface CdkEksStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

export class CdkEksStack extends cdk.NestedStack {
  public readonly cluster: eks.Cluster;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: CdkEksStackProps) {
    super(scope, id, props);

    // Create an IAM role for the EKS cluster
    const clusterRole = new iam.Role(this, "EksClusterRole", {
      assumedBy: new iam.ServicePrincipal("eks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSClusterPolicy"),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonEKSVPCResourceController"
        ),
      ],
    });

    // Check if this is an update to an existing cluster
    const isUpdate = this.node.tryGetContext("eks-only") === "true";
    const clusterName = "a1c-project-cluster10";

    const kubectlLayer = new KubectlV32Layer(this, "KubectlLayer");
    // Create a role for kubectl operations
    const kubectlRole = new iam.Role(this, "KubectlRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSClusterPolicy"),
      ],
    });
    

    if (isUpdate) {
      // Import the existing cluster
      this.cluster = eks.Cluster.fromClusterAttributes(
        this,
        "ImportedEksCluster",
        {
          clusterName: clusterName,
          vpc: props.vpc,
          kubectlRoleArn: kubectlRole.roleArn,
          kubectlLayer: kubectlLayer,          
        }
      ) as any as eks.Cluster;
    } else {
      // Create a new EKS cluster
      this.cluster = new eks.Cluster(this, "A1CProjectEksCluster10", {
        version: eks.KubernetesVersion.V1_32,
        kubectlLayer: kubectlLayer,
        kubectlLambdaRole: kubectlRole,
        vpc: props.vpc,
        defaultCapacity: 0, // We'll define our own node groups
        role: clusterRole,
        clusterName: clusterName,
        albController: {
          version: eks.AlbControllerVersion.V2_8_2,
        },
        outputClusterName: true,
        outputConfigCommand: true,
        endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE,
        outputMastersRoleArn: true,
        mastersRole: clusterRole,
        bootstrapClusterCreatorAdminPermissions: true,
        // Add CloudWatch logging configuration
        clusterLogging: [
          eks.ClusterLoggingTypes.API,
          eks.ClusterLoggingTypes.AUDIT,
          eks.ClusterLoggingTypes.AUTHENTICATOR,
          eks.ClusterLoggingTypes.CONTROLLER_MANAGER,
          eks.ClusterLoggingTypes.SCHEDULER,
        ],
      });
    }
    
    // Add masters role from day one
    if(!isUpdate) {
      this.cluster.awsAuth.addMastersRole(kubectlRole)
    }
    

    // Create a security group for the EKS cluster
    this.securityGroup = new ec2.SecurityGroup(this, "A1C-EKSSecurityGroup10", {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: "Security group for A1C EKS cluster10",
    });

    // Create IAM role for node group with CloudWatch Container Insights permissions
    const nodeRole = new iam.Role(this, "EksNodeRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSWorkerNodePolicy"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKS_CNI_Policy"),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonEC2ContainerRegistryReadOnly"
        ),
        // Add CloudWatch policy for Container Insights
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "CloudWatchAgentServerPolicy"
        ),
        // Add SSM policy for Application Insights
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "CloudWatchAgentServerPolicy"
        ),
      ],
    });

    // Only add node group if we're not in update mode
    if (!this.node.tryGetContext("eks-only")) {
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
        },
        nodeRole: nodeRole,
      });
    }

    // Associate the security group with the cluster
    this.cluster.connections.addSecurityGroup(this.securityGroup);

    // Create VPC endpoints for AWS services
    this.createVpcEndpoints(props.vpc);

    // Create Fargate execution role with CloudWatch permissions
    const fargateExecutionRole = new iam.Role(this, "FargateExecutionRole", {
      assumedBy: new iam.ServicePrincipal("eks-fargate-pods.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonEKSFargatePodExecutionRolePolicy"
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "CloudWatchAgentServerPolicy"
        ),
      ],
    });

    // Only add Fargate profile if we're not in update mode
    if (!this.node.tryGetContext("eks-only")) {
      this.cluster.addFargateProfile("DefaultFargateProfile", {
        selectors: [
          { namespace: "default" },
          { namespace: "kube-system" },
          { namespace: "kube-system", labels: { "k8s-app": "kube-dns" } },
          { namespace: "amazon-cloudwatch" }, // Add namespace for CloudWatch
        ],
        podExecutionRole: fargateExecutionRole,
      });
    }

    // Only add Helm charts if we're not in update mode or if explicitly requested
    const updateHelm = this.node.tryGetContext("update-helm") === "true";

    if (!isUpdate || updateHelm) {
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

      // Deploy CloudWatch Container Insights
      this.cluster.addHelmChart("CloudWatchAgent", {
        chart: "cloudwatch-agent",
        repository: "https://aws.github.io/eks-charts",
        namespace: "amazon-cloudwatch",
        createNamespace: true,
        values: {
          clusterName: this.cluster.clusterName,
          fargate: {
            enabled: true,
          },
        },
      });

      // Deploy Fluent Bit for Container Insights logs
      this.cluster.addHelmChart("FluentBit", {
        chart: "aws-for-fluent-bit",
        repository: "https://aws.github.io/eks-charts",
        namespace: "amazon-cloudwatch",
        createNamespace: true,
        values: {
          cloudWatch: {
            enabled: true,
            region: this.region,
            logGroupName: `/aws/containerinsights/${this.cluster.clusterName}/application`,
          },
          firehose: { enabled: false },
          kinesis: { enabled: false },
          elasticsearch: { enabled: false },
          fargate: true,
        },
      });
    }


    // Output the kubectl config command
    new cdk.CfnOutput(this, "KubectlConfigCommand", {
      value: `aws eks update-kubeconfig --name ${this.cluster.clusterName} --region ${this.region}`,
      description: "Command to update kubectl config for the cluster",
    });
  }

  // Functions
  private createVpcEndpoints(vpc: ec2.Vpc): void {
    // Check if this is an update to an existing cluster
    const isEksUpdate = this.node.tryGetContext("eks-only") === "true";

    // Skip VPC endpoint creation if this is an update
    if (isEksUpdate) {
      console.log("Skipping VPC endpoint creation for EKS update");
      return;
    }

    // Create security group for VPC endpoints
    const vpcEndpointSecurityGroup = new ec2.SecurityGroup(
      this,
      "VpcEndpointSecurityGroup",
      {
        vpc,
        description: "Security group for VPC endpoints",
        allowAllOutbound: true,
      }
    );

    // Allow HTTPS traffic from within the VPC
    vpcEndpointSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      "Allow HTTPS traffic from within the VPC"
    );

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

    new ec2.InterfaceVpcEndpoint(this, "ElbEndpoint", {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.ELASTIC_LOAD_BALANCING,
      privateDnsEnabled: true,
      securityGroups: [vpcEndpointSecurityGroup],
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // Add SSM endpoints required for Application Insights
    new ec2.InterfaceVpcEndpoint(this, "SsmEndpoint", {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
      privateDnsEnabled: true,
      securityGroups: [vpcEndpointSecurityGroup],
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    new ec2.InterfaceVpcEndpoint(this, "SsmMessagesEndpoint", {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
      privateDnsEnabled: true,
      securityGroups: [vpcEndpointSecurityGroup],
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    new ec2.InterfaceVpcEndpoint(this, "Ec2MessagesEndpoint", {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
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
    // Only add EKS add-ons if we're not in update mode or if explicitly requested
    const isUpdate = this.node.tryGetContext("eks-only") === "true";
    const updateAddons = this.node.tryGetContext("update-addons") === "true";

    if (!isUpdate || updateAddons) {
      try {
        // Add CoreDNS add-on
        this.addEksAddon("CoreDNSAddon", "coredns");

        // Add kube-proxy add-on
        this.addEksAddon("KubeProxyAddon", "kube-proxy");

        // Add VPC CNI add-on
        this.addEksAddon("VpcCniAddon", "vpc-cni");

        // Add EKS Pod Identity Agent add-on
        this.addEksAddon("PodIdentityAgentAddon", "eks-pod-identity-agent");

        // Add CloudWatch Observability add-on
        this.addEksAddon(
          "CloudWatchObservabilityAddon",
          "amazon-cloudwatch-observability"
        );
      } catch (error) {
        // Log detailed error information
        console.error(
          "Failed to add EKS add-ons:",
          error instanceof Error ? error.message : String(error)
        );

        // Continue deployment without failing
        // You might want to add a CloudFormation output to indicate the failure
        new cdk.CfnOutput(this, "AddonsWarning", {
          value: "EKS add-ons installation failed, check logs for details",
          description: "Warning about EKS add-ons installation",
        });
      }
    }

    // Output the cluster name - moved outside try/catch since this should always run
    new cdk.CfnOutput(this, "ClusterName", {
      value: this.cluster.clusterName,
      description: "The name of the EKS cluster",
    });
  }

  private addEksAddon(id: string, addonName: string): void {
    try {
      new eks.CfnAddon(this, id, {
        addonName: addonName,
        clusterName: this.cluster.clusterName,
        resolveConflicts: "OVERWRITE",
      });
    } catch (error) {
      console.error(
        `Failed to add ${addonName} add-on:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
