import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

export class A1CInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Parameters
    const appName = 'a1c-project';
    const environment = 'dev'; // Change to 'prod' for production
    const domainName = 'example.com'; // Replace with your domain
    
    // VPC
    const vpc = new ec2.Vpc(this, `${appName}-vpc`, {
      maxAzs: 2,
      natGateways: 1, // Use 2 for production
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Security Groups
    const albSg = new ec2.SecurityGroup(this, `${appName}-alb-sg`, {
      vpc,
      description: 'Security group for ALB',
      allowAllOutbound: true,
    });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');

    const serviceSg = new ec2.SecurityGroup(this, `${appName}-service-sg`, {
      vpc,
      description: 'Security group for ECS services',
      allowAllOutbound: true,
    });
    serviceSg.addIngressRule(albSg, ec2.Port.tcp(3000), 'Allow traffic from ALB to Next.js');
    serviceSg.addIngressRule(albSg, ec2.Port.tcp(3333), 'Allow traffic from ALB to NestJS API');
    serviceSg.addIngressRule(serviceSg, ec2.Port.allTcp(), 'Allow all traffic between services');

    const dbSg = new ec2.SecurityGroup(this, `${appName}-db-sg`, {
      vpc,
      description: 'Security group for RDS',
      allowAllOutbound: false,
    });
    dbSg.addIngressRule(serviceSg, ec2.Port.tcp(5432), 'Allow PostgreSQL traffic from services');

    const redisSg = new ec2.SecurityGroup(this, `${appName}-redis-sg`, {
      vpc,
      description: 'Security group for Redis',
      allowAllOutbound: false,
    });
    redisSg.addIngressRule(serviceSg, ec2.Port.tcp(6379), 'Allow Redis traffic from services');

    // Database
    const dbCredentials = new secretsmanager.Secret(this, `${appName}-db-credentials`, {
      secretName: `${appName}/${environment}/db-credentials`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 16,
      },
    });

    const dbInstance = new rds.DatabaseInstance(this, `${appName}-db`, {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      credentials: rds.Credentials.fromSecret(dbCredentials),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSg],
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      deletionProtection: environment === 'prod',
      databaseName: 'a1c_project',
      publiclyAccessible: false,
    });

    // Redis for Bull queue
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, `${appName}-redis-subnet-group`, {
      description: 'Subnet group for Redis',
      subnetIds: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      }).subnetIds,
    });

    const redisCluster = new elasticache.CfnCacheCluster(this, `${appName}-redis`, {
      cacheNodeType: 'cache.t4g.micro',
      engine: 'redis',
      numCacheNodes: 1,
      autoMinorVersionUpgrade: true,
      cacheSubnetGroupName: redisSubnetGroup.ref,
      vpcSecurityGroupIds: [redisSg.securityGroupId],
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, `${appName}-cluster`, {
      vpc,
      containerInsights: true,
    });

    // Log groups
    const frontendLogGroup = new logs.LogGroup(this, `${appName}-frontend-logs`, {
      logGroupName: `/ecs/${appName}-frontend-${environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const backendLogGroup = new logs.LogGroup(this, `${appName}-backend-logs`, {
      logGroupName: `/ecs/${appName}-backend-${environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Task execution role
    const executionRole = new iam.Role(this, `${appName}-execution-role`, {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Allow task execution role to read secrets
    dbCredentials.grantRead(executionRole);

    // Create secrets for the application
    const jwtSecret = new secretsmanager.Secret(this, `${appName}-jwt-secret`, {
      secretName: `${appName}/${environment}/jwt-secret`,
      generateSecretString: {
        passwordLength: 32,
        excludeCharacters: '\\/@"',
      },
    });
    jwtSecret.grantRead(executionRole);

    const clerkSecretKey = new secretsmanager.Secret(this, `${appName}-clerk-secret`, {
      secretName: `${appName}/${environment}/clerk-secret`,
      generateSecretString: {
        generateStringKey: 'secretKey',
        secretStringTemplate: JSON.stringify({ placeholder: 'replace-with-actual-clerk-secret' }),
      },
    });
    clerkSecretKey.grantRead(executionRole);

    const clerkWebhookSecret = new secretsmanager.Secret(this, `${appName}-clerk-webhook-secret`, {
      secretName: `${appName}/${environment}/clerk-webhook`,
      generateSecretString: {
        generateStringKey: 'webhookSecret',
        secretStringTemplate: JSON.stringify({ placeholder: 'replace-with-actual-webhook-secret' }),
      },
    });
    clerkWebhookSecret.grantRead(executionRole);

    const clerkPublishableKey = new secretsmanager.Secret(this, `${appName}-clerk-publishable`, {
      secretName: `${appName}/${environment}/clerk-publishable`,
      generateSecretString: {
        generateStringKey: 'publishableKey',
        secretStringTemplate: JSON.stringify({ placeholder: 'replace-with-actual-publishable-key' }),
      },
    });
    clerkPublishableKey.grantRead(executionRole);

    // Backend API Task Definition
    const backendTaskDef = new ecs.FargateTaskDefinition(this, `${appName}-backend-task`, {
      memoryLimitMiB: 1024,
      cpu: 512,
      executionRole,
    });

    // Create a connection string for the database
    const dbConnectionString = `postgresql://postgres:${dbCredentials.secretValueFromJson('password').toString()}@${dbInstance.dbInstanceEndpointAddress}:5432/a1c_project`;
    
    // Store the connection string in a secret
    const dbConnectionSecret = new secretsmanager.Secret(this, `${appName}-db-connection`, {
      secretName: `${appName}/${environment}/db-connection`,
      secretStringValue: cdk.SecretValue.unsafePlainText(dbConnectionString),
    });
    dbConnectionSecret.grantRead(executionRole);

    // Backend container
    const backendContainer = backendTaskDef.addContainer(`${appName}-backend-container`, {
      image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'), // Replace with your actual image
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'backend',
        logGroup: backendLogGroup,
      }),
      environment: {
        NODE_ENV: environment,
        API_PORT: '3333',
        API_HOST: '0.0.0.0',
        API_PREFIX: 'api',
        FRONTEND_URL: environment === 'prod' ? `https://${domainName}` : 'http://localhost:4200',
        REDIS_HOST: redisCluster.attrRedisEndpointAddress,
        REDIS_PORT: redisCluster.attrRedisEndpointPort,
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(dbConnectionSecret),
        JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
        CLERK_SECRET_KEY: ecs.Secret.fromSecretsManager(clerkSecretKey, 'secretKey'),
        CLERK_WEBHOOK_SECRET: ecs.Secret.fromSecretsManager(clerkWebhookSecret, 'webhookSecret'),
      },
    });

    backendContainer.addPortMappings({
      containerPort: 3333,
      hostPort: 3333,
      protocol: ecs.Protocol.TCP,
    });

    // Frontend Task Definition
    const frontendTaskDef = new ecs.FargateTaskDefinition(this, `${appName}-frontend-task`, {
      memoryLimitMiB: 1024,
      cpu: 512,
      executionRole,
    });

    // Frontend container
    const frontendContainer = frontendTaskDef.addContainer(`${appName}-frontend-container`, {
      image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'), // Replace with your actual image
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'frontend',
        logGroup: frontendLogGroup,
      }),
      environment: {
        NODE_ENV: environment,
        NEXT_PUBLIC_API_URL: environment === 'prod' ? `https://api.${domainName}` : 'http://localhost:3333',
      },
      secrets: {
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ecs.Secret.fromSecretsManager(clerkPublishableKey, 'publishableKey'),
      },
    });

    frontendContainer.addPortMappings({
      containerPort: 3000,
      hostPort: 3000,
      protocol: ecs.Protocol.TCP,
    });

    // ALB
    const alb = new elbv2.ApplicationLoadBalancer(this, `${appName}-alb`, {
      vpc,
      internetFacing: true,
      securityGroup: albSg,
    });

    // Backend Service
    const backendService = new ecs.FargateService(this, `${appName}-backend-service`, {
      cluster,
      taskDefinition: backendTaskDef,
      desiredCount: 2,
      securityGroups: [serviceSg],
      assignPublicIp: false,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    // Backend Target Group
    const backendTargetGroup = new elbv2.ApplicationTargetGroup(this, `${appName}-backend-tg`, {
      vpc,
      port: 3333,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/api/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    backendTargetGroup.addTarget(backendService);

    // Frontend Service
    const frontendService = new ecs.FargateService(this, `${appName}-frontend-service`, {
      cluster,
      taskDefinition: frontendTaskDef,
      desiredCount: 2,
      securityGroups: [serviceSg],
      assignPublicIp: false,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    // Frontend Target Group
    const frontendTargetGroup = new elbv2.ApplicationTargetGroup(this, `${appName}-frontend-tg`, {
      vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    frontendTargetGroup.addTarget(frontendService);

    // ALB Listeners
    const httpListener = alb.addListener('HttpListener', {
      port: 80,
      open: true,
      defaultAction: elbv2.ListenerAction.forward([frontendTargetGroup]),
    });

    // Add rule for API traffic
    httpListener.addTargetGroups('BackendTargetGroup', {
      targetGroups: [backendTargetGroup],
      priority: 10,
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/api/*']),
      ],
    });

    // For production, we would set up HTTPS with certificates and CloudFront
    if (environment === 'prod') {
      // This is a placeholder for production setup
      // You would need to create or import certificates and set up CloudFront
      
      // Example of setting up CloudFront (commented out as it requires certificates)
      /*
      const certificate = acm.Certificate.fromCertificateArn(
        this,
        'Certificate',
        'YOUR_CERTIFICATE_ARN' // Replace with your certificate ARN
      );

      const distribution = new cloudfront.Distribution(this, `${appName}-distribution`, {
        defaultBehavior: {
          origin: new origins.LoadBalancerV2Origin(alb, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
        additionalBehaviors: {
          '/api/*': {
            origin: new origins.LoadBalancerV2Origin(alb, {
              protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            }),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
            originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
          },
          '/_next/static/*': {
            origin: new origins.LoadBalancerV2Origin(alb, {
              protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            }),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
            cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          },
        },
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        enabled: true,
        certificate: certificate,
        domainNames: [domainName, `www.${domainName}`],
      });
      */
    }

    // Auto Scaling for services
    const backendScaling = backendService.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 10,
    });

    backendScaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    const frontendScaling = frontendService.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 10,
    });

    frontendScaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: alb.loadBalancerDnsName,
      description: 'The DNS name of the load balancer',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: dbInstance.dbInstanceEndpointAddress,
      description: 'The endpoint of the database',
    });

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: redisCluster.attrRedisEndpointAddress,
      description: 'The endpoint of the Redis cluster',
    });
  }
}
