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
exports.DatabaseStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const rds = __importStar(require("aws-cdk-lib/aws-rds"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
class DatabaseStack extends cdk.NestedStack {
    dbCluster;
    dbSecret;
    constructor(scope, id, vpc, props) {
        super(scope, id, props);
        // Create a security group for the database
        const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
            vpc,
            description: 'Security group for Aurora Serverless PostgreSQL',
            allowAllOutbound: true,
            securityGroupName: 'aurora-serverless-sg',
        });
        // Allow inbound access from within the VPC
        dbSecurityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(5432), 'Allow PostgreSQL access from within the VPC');
        // Allow inbound access from the EKS security group if provided
        if (props?.eksSecurityGroup) {
            dbSecurityGroup.addIngressRule(ec2.Peer.securityGroupId(props.eksSecurityGroup.securityGroupId), ec2.Port.tcp(5432), 'Allow PostgreSQL access from EKS cluster');
        }
        // Create a secret for the database credentials
        this.dbSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
            secretName: 'a1c-project/database-credentials',
            description: 'Credentials for the A1C Project Aurora Serverless PostgreSQL database',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: 'postgres' }),
                generateStringKey: 'password',
                excludePunctuation: true,
                includeSpace: false,
                passwordLength: 16,
            },
        });
        // Create the Aurora Serverless v2 PostgreSQL cluster
        this.dbCluster = new rds.DatabaseCluster(this, 'DatabaseCluster', {
            engine: rds.DatabaseClusterEngine.auroraPostgres({
                version: rds.AuroraPostgresEngineVersion.VER_15_3,
            }),
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [dbSecurityGroup],
            serverlessV2MinCapacity: 0.5, // Minimum ACU (0.5 is the minimum)
            serverlessV2MaxCapacity: 4, // Maximum ACU
            writer: rds.ClusterInstance.serverlessV2('Cluster Writer', {
                instanceIdentifier: (ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.MEDIUM),
                publiclyAccessible: false,
                autoMinorVersionUpgrade: true,
            }),
            readers: [
                rds.ClusterInstance.serverlessV2('Reader', {
                    instanceIdentifier: (ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.SMALL),
                    publiclyAccessible: false,
                    autoMinorVersionUpgrade: true,
                    scaleWithWriter: true,
                }),
            ],
            defaultDatabaseName: 'a1cproject',
            credentials: rds.Credentials.fromSecret(this.dbSecret),
            deletionProtection: false, // Set to true for production
            removalPolicy: cdk.RemovalPolicy.SNAPSHOT, // Create a snapshot before deleting
        });
        // Output the database endpoint
        new cdk.CfnOutput(this, 'DatabaseEndpoint', {
            value: this.dbCluster.clusterEndpoint.hostname,
            description: 'The endpoint of the Aurora Serverless PostgreSQL cluster',
        });
        // Output the secret ARN
        new cdk.CfnOutput(this, 'DatabaseSecretArn', {
            value: this.dbSecret.secretArn,
            description: 'The ARN of the database credentials secret',
        });
    }
}
exports.DatabaseStack = DatabaseStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWJhc2Utc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkYXRhYmFzZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUVuQyx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLCtFQUFpRTtBQUdqRSxNQUFhLGFBQWMsU0FBUSxHQUFHLENBQUMsV0FBVztJQUNoQyxTQUFTLENBQXNCO0lBQy9CLFFBQVEsQ0FBd0I7SUFFaEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxHQUFZLEVBQUUsS0FBdUU7UUFDN0gsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsMkNBQTJDO1FBQzNDLE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDM0UsR0FBRztZQUNILFdBQVcsRUFBRSxpREFBaUQ7WUFDOUQsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0QixpQkFBaUIsRUFBRSxzQkFBc0I7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsMkNBQTJDO1FBQzNDLGVBQWUsQ0FBQyxjQUFjLENBQzVCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFDL0IsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQ2xCLDZDQUE2QyxDQUM5QyxDQUFDO1FBRUYsK0RBQStEO1FBQy9ELElBQUksS0FBSyxFQUFFLGdCQUFnQixFQUFFLENBQUM7WUFDNUIsZUFBZSxDQUFDLGNBQWMsQ0FDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxFQUNoRSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFDbEIsMENBQTBDLENBQzNDLENBQUM7UUFDSixDQUFDO1FBRUQsK0NBQStDO1FBQy9DLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUNoRSxVQUFVLEVBQUUsa0NBQWtDO1lBQzlDLFdBQVcsRUFBRSx1RUFBdUU7WUFDcEYsb0JBQW9CLEVBQUU7Z0JBQ3BCLG9CQUFvQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLENBQUM7Z0JBQzlELGlCQUFpQixFQUFFLFVBQVU7Z0JBQzdCLGtCQUFrQixFQUFFLElBQUk7Z0JBQ3hCLFlBQVksRUFBRSxLQUFLO2dCQUNuQixjQUFjLEVBQUUsRUFBRTthQUNuQjtTQUNGLENBQUMsQ0FBQztRQUVILHFEQUFxRDtRQUNyRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDaEUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUM7Z0JBQy9DLE9BQU8sRUFBRSxHQUFHLENBQUMsMkJBQTJCLENBQUMsUUFBUTthQUNsRCxDQUFDO1lBQ0EsR0FBRztZQUNILFVBQVUsRUFBRTtnQkFDVixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxtQkFBbUI7YUFDL0M7WUFDRCxjQUFjLEVBQUUsQ0FBQyxlQUFlLENBQUM7WUFDbkMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFLG1DQUFtQztZQUNqRSx1QkFBdUIsRUFBRSxDQUFDLEVBQUksY0FBYztZQUM1QyxNQUFNLEVBQUUsR0FBRyxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUU7Z0JBQ3pELGtCQUFrQixFQUFFLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQztnQkFDcEYsa0JBQWtCLEVBQUUsS0FBSztnQkFDekIsdUJBQXVCLEVBQUUsSUFBSTthQUM5QixDQUFDO1lBQ0YsT0FBTyxFQUFFO2dCQUNQLEdBQUcsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRTtvQkFDekMsa0JBQWtCLEVBQUUsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO29CQUNuRixrQkFBa0IsRUFBRSxLQUFLO29CQUN6Qix1QkFBdUIsRUFBRSxJQUFJO29CQUM3QixlQUFlLEVBQUUsSUFBSTtpQkFDdEIsQ0FBQzthQUNIO1lBQ0QsbUJBQW1CLEVBQUUsWUFBWTtZQUNqQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUN0RCxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsNkJBQTZCO1lBQ3hELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxvQ0FBb0M7U0FDaEYsQ0FBQyxDQUFDO1FBRUgsK0JBQStCO1FBQy9CLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDMUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLFFBQVE7WUFDOUMsV0FBVyxFQUFFLDBEQUEwRDtTQUN4RSxDQUFDLENBQUM7UUFFSCx3QkFBd0I7UUFDeEIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUMzQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTO1lBQzlCLFdBQVcsRUFBRSw0Q0FBNEM7U0FDMUQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBdkZELHNDQXVGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCAqIGFzIHJkcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtcmRzJztcbmltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcic7XG5pbXBvcnQgeyBDZGtFa3NTdGFjayB9IGZyb20gJy4vY2RrLWVrcy1zdGFjayc7XG5cbmV4cG9ydCBjbGFzcyBEYXRhYmFzZVN0YWNrIGV4dGVuZHMgY2RrLk5lc3RlZFN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGRiQ2x1c3RlcjogcmRzLkRhdGFiYXNlQ2x1c3RlcjtcbiAgcHVibGljIHJlYWRvbmx5IGRiU2VjcmV0OiBzZWNyZXRzbWFuYWdlci5TZWNyZXQ7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgdnBjOiBlYzIuVnBjLCBwcm9wcz86IGNkay5OZXN0ZWRTdGFja1Byb3BzICYgeyBla3NTZWN1cml0eUdyb3VwPzogZWMyLlNlY3VyaXR5R3JvdXAgfSkge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gQ3JlYXRlIGEgc2VjdXJpdHkgZ3JvdXAgZm9yIHRoZSBkYXRhYmFzZVxuICAgIGNvbnN0IGRiU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnRGF0YWJhc2VTZWN1cml0eUdyb3VwJywge1xuICAgICAgdnBjLFxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgQXVyb3JhIFNlcnZlcmxlc3MgUG9zdGdyZVNRTCcsXG4gICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxuICAgICAgc2VjdXJpdHlHcm91cE5hbWU6ICdhdXJvcmEtc2VydmVybGVzcy1zZycsICAgICAgXG4gICAgfSk7XG5cbiAgICAvLyBBbGxvdyBpbmJvdW5kIGFjY2VzcyBmcm9tIHdpdGhpbiB0aGUgVlBDXG4gICAgZGJTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgZWMyLlBlZXIuaXB2NCh2cGMudnBjQ2lkckJsb2NrKSxcbiAgICAgIGVjMi5Qb3J0LnRjcCg1NDMyKSxcbiAgICAgICdBbGxvdyBQb3N0Z3JlU1FMIGFjY2VzcyBmcm9tIHdpdGhpbiB0aGUgVlBDJyAgXG4gICAgKTtcblxuICAgIC8vIEFsbG93IGluYm91bmQgYWNjZXNzIGZyb20gdGhlIEVLUyBzZWN1cml0eSBncm91cCBpZiBwcm92aWRlZFxuICAgIGlmIChwcm9wcz8uZWtzU2VjdXJpdHlHcm91cCkge1xuICAgICAgZGJTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgICBlYzIuUGVlci5zZWN1cml0eUdyb3VwSWQocHJvcHMuZWtzU2VjdXJpdHlHcm91cC5zZWN1cml0eUdyb3VwSWQpLFxuICAgICAgICBlYzIuUG9ydC50Y3AoNTQzMiksXG4gICAgICAgICdBbGxvdyBQb3N0Z3JlU1FMIGFjY2VzcyBmcm9tIEVLUyBjbHVzdGVyJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYSBzZWNyZXQgZm9yIHRoZSBkYXRhYmFzZSBjcmVkZW50aWFsc1xuICAgIHRoaXMuZGJTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdEYXRhYmFzZVNlY3JldCcsIHtcbiAgICAgIHNlY3JldE5hbWU6ICdhMWMtcHJvamVjdC9kYXRhYmFzZS1jcmVkZW50aWFscycsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NyZWRlbnRpYWxzIGZvciB0aGUgQTFDIFByb2plY3QgQXVyb3JhIFNlcnZlcmxlc3MgUG9zdGdyZVNRTCBkYXRhYmFzZScsXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xuICAgICAgICBzZWNyZXRTdHJpbmdUZW1wbGF0ZTogSlNPTi5zdHJpbmdpZnkoeyB1c2VybmFtZTogJ3Bvc3RncmVzJyB9KSxcbiAgICAgICAgZ2VuZXJhdGVTdHJpbmdLZXk6ICdwYXNzd29yZCcsXG4gICAgICAgIGV4Y2x1ZGVQdW5jdHVhdGlvbjogdHJ1ZSxcbiAgICAgICAgaW5jbHVkZVNwYWNlOiBmYWxzZSxcbiAgICAgICAgcGFzc3dvcmRMZW5ndGg6IDE2LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSB0aGUgQXVyb3JhIFNlcnZlcmxlc3MgdjIgUG9zdGdyZVNRTCBjbHVzdGVyXG4gICAgdGhpcy5kYkNsdXN0ZXIgPSBuZXcgcmRzLkRhdGFiYXNlQ2x1c3Rlcih0aGlzLCAnRGF0YWJhc2VDbHVzdGVyJywge1xuICAgICAgZW5naW5lOiByZHMuRGF0YWJhc2VDbHVzdGVyRW5naW5lLmF1cm9yYVBvc3RncmVzKHtcbiAgICAgICAgdmVyc2lvbjogcmRzLkF1cm9yYVBvc3RncmVzRW5naW5lVmVyc2lvbi5WRVJfMTVfMyxcbiAgICAgIH0pLCBcbiAgICAgICAgdnBjLFxuICAgICAgICB2cGNTdWJuZXRzOiB7XG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcbiAgICAgICAgfSxcbiAgICAgICAgc2VjdXJpdHlHcm91cHM6IFtkYlNlY3VyaXR5R3JvdXBdLFxuICAgICAgc2VydmVybGVzc1YyTWluQ2FwYWNpdHk6IDAuNSwgLy8gTWluaW11bSBBQ1UgKDAuNSBpcyB0aGUgbWluaW11bSlcbiAgICAgIHNlcnZlcmxlc3NWMk1heENhcGFjaXR5OiA0LCAgIC8vIE1heGltdW0gQUNVXG4gICAgICB3cml0ZXI6IHJkcy5DbHVzdGVySW5zdGFuY2Uuc2VydmVybGVzc1YyKCdDbHVzdGVyIFdyaXRlcicsIHtcbiAgICAgICAgaW5zdGFuY2VJZGVudGlmaWVyOiAoZWMyLkluc3RhbmNlQ2xhc3MuQlVSU1RBQkxFNF9HUkFWSVRPTiwgZWMyLkluc3RhbmNlU2l6ZS5NRURJVU0pLFxuICAgICAgICBwdWJsaWNseUFjY2Vzc2libGU6IGZhbHNlLFxuICAgICAgICBhdXRvTWlub3JWZXJzaW9uVXBncmFkZTogdHJ1ZSwgICAgICAgICAgICAgICAgIFxuICAgICAgfSksXG4gICAgICByZWFkZXJzOiBbXG4gICAgICAgIHJkcy5DbHVzdGVySW5zdGFuY2Uuc2VydmVybGVzc1YyKCdSZWFkZXInLCB7XG4gICAgICAgICAgaW5zdGFuY2VJZGVudGlmaWVyOiAoZWMyLkluc3RhbmNlQ2xhc3MuQlVSU1RBQkxFNF9HUkFWSVRPTiwgZWMyLkluc3RhbmNlU2l6ZS5TTUFMTCksXG4gICAgICAgICAgcHVibGljbHlBY2Nlc3NpYmxlOiBmYWxzZSxcbiAgICAgICAgICBhdXRvTWlub3JWZXJzaW9uVXBncmFkZTogdHJ1ZSxcbiAgICAgICAgICBzY2FsZVdpdGhXcml0ZXI6IHRydWUsXG4gICAgICAgIH0pLFxuICAgICAgXSxcbiAgICAgIGRlZmF1bHREYXRhYmFzZU5hbWU6ICdhMWNwcm9qZWN0JyxcbiAgICAgIGNyZWRlbnRpYWxzOiByZHMuQ3JlZGVudGlhbHMuZnJvbVNlY3JldCh0aGlzLmRiU2VjcmV0KSxcbiAgICAgIGRlbGV0aW9uUHJvdGVjdGlvbjogZmFsc2UsIC8vIFNldCB0byB0cnVlIGZvciBwcm9kdWN0aW9uXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5TTkFQU0hPVCwgLy8gQ3JlYXRlIGEgc25hcHNob3QgYmVmb3JlIGRlbGV0aW5nXG4gICAgfSk7XG5cbiAgICAvLyBPdXRwdXQgdGhlIGRhdGFiYXNlIGVuZHBvaW50XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RhdGFiYXNlRW5kcG9pbnQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5kYkNsdXN0ZXIuY2x1c3RlckVuZHBvaW50Lmhvc3RuYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdUaGUgZW5kcG9pbnQgb2YgdGhlIEF1cm9yYSBTZXJ2ZXJsZXNzIFBvc3RncmVTUUwgY2x1c3RlcicsXG4gICAgfSk7XG5cbiAgICAvLyBPdXRwdXQgdGhlIHNlY3JldCBBUk5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGF0YWJhc2VTZWNyZXRBcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy5kYlNlY3JldC5zZWNyZXRBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ1RoZSBBUk4gb2YgdGhlIGRhdGFiYXNlIGNyZWRlbnRpYWxzIHNlY3JldCcsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==