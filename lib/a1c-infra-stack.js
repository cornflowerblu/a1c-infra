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
exports.A1CInfraStack10 = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const cdk_eks_stack_1 = require("./cdk-eks-stack");
const database_stack_1 = require("./database-stack");
const redis_stack_1 = require("./redis-stack");
// import * as sqs from 'aws-cdk-lib/aws-sqs';
class A1CInfraStack10 extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        cdk.CfnDeletionPolicy.RETAIN;
        //Create a new VPC for all resources
        const vpc = new ec2.Vpc(this, "A1CProjectVPC10", {
            maxAzs: 3, // Use up to 3 Availability Zones for high availability
            natGateways: 1, // Use 1 NAT Gateway to save costs (use 3 for production)
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: "public",
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: "private",
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
            ],
        });
        // Create the EKS cluster stack
        const eksStack = new cdk_eks_stack_1.CdkEksStack(this, "EksStack", {
            env: props?.env,
            vpc: vpc,
        });
        // Create the Aurora Serverless PostgreSQL stack
        const dbStack = new database_stack_1.DatabaseStack(this, "DatabaseStack", vpc, {
            eksSecurityGroup: eksStack.securityGroup,
        });
        // Create the Redis stack
        const redisStack = new redis_stack_1.RedisStack(this, "RedisStack", vpc, {
            eksSecurityGroup: eksStack.securityGroup,
        });
        // Output the VPC ID
        new cdk.CfnOutput(this, "VpcId", {
            value: vpc.vpcId,
            description: "The ID of the VPC",
        });
    }
}
exports.A1CInfraStack10 = A1CInfraStack10;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYTFjLWluZnJhLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYTFjLWluZnJhLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHlEQUEyQztBQUUzQyxtREFBOEM7QUFDOUMscURBQWlEO0FBQ2pELCtDQUEyQztBQUMzQyw4Q0FBOEM7QUFFOUMsTUFBYSxlQUFnQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzVDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFHeEIsR0FBRyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQTtRQUU1QixvQ0FBb0M7UUFDcEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUMvQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLHVEQUF1RDtZQUNsRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLHlEQUF5RDtZQUN6RSxtQkFBbUIsRUFBRTtnQkFDbkI7b0JBQ0UsUUFBUSxFQUFFLEVBQUU7b0JBQ1osSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTTtpQkFDbEM7Z0JBQ0Q7b0JBQ0UsUUFBUSxFQUFFLEVBQUU7b0JBQ1osSUFBSSxFQUFFLFNBQVM7b0JBQ2YsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsbUJBQW1CO2lCQUMvQzthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsK0JBQStCO1FBQy9CLE1BQU0sUUFBUSxHQUFHLElBQUksMkJBQVcsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQ2pELEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRztZQUNmLEdBQUcsRUFBRSxHQUFHO1NBQ1QsQ0FBQyxDQUFDO1FBRUgsZ0RBQWdEO1FBQ2hELE1BQU0sT0FBTyxHQUFHLElBQUksOEJBQWEsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFLEdBQUcsRUFBRTtZQUM1RCxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsYUFBYTtTQUN6QyxDQUFDLENBQUM7UUFFSCx5QkFBeUI7UUFDekIsTUFBTSxVQUFVLEdBQUcsSUFBSSx3QkFBVSxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFO1lBQ3pELGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxhQUFhO1NBQ3pDLENBQUMsQ0FBQztRQUVILG9CQUFvQjtRQUNwQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRTtZQUMvQixLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUs7WUFDaEIsV0FBVyxFQUFFLG1CQUFtQjtTQUNqQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUEvQ0QsMENBK0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWMyXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgQ2RrRWtzU3RhY2sgfSBmcm9tIFwiLi9jZGstZWtzLXN0YWNrXCI7XG5pbXBvcnQgeyBEYXRhYmFzZVN0YWNrIH0gZnJvbSBcIi4vZGF0YWJhc2Utc3RhY2tcIjtcbmltcG9ydCB7IFJlZGlzU3RhY2sgfSBmcm9tIFwiLi9yZWRpcy1zdGFja1wiO1xuLy8gaW1wb3J0ICogYXMgc3FzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zcXMnO1xuXG5leHBvcnQgY2xhc3MgQTFDSW5mcmFTdGFjazEwIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgXG4gICAgY2RrLkNmbkRlbGV0aW9uUG9saWN5LlJFVEFJTlxuICAgICAgXG4gICAgLy9DcmVhdGUgYSBuZXcgVlBDIGZvciBhbGwgcmVzb3VyY2VzXG4gICAgY29uc3QgdnBjID0gbmV3IGVjMi5WcGModGhpcywgXCJBMUNQcm9qZWN0VlBDMTBcIiwge1xuICAgICAgbWF4QXpzOiAzLCAvLyBVc2UgdXAgdG8gMyBBdmFpbGFiaWxpdHkgWm9uZXMgZm9yIGhpZ2ggYXZhaWxhYmlsaXR5XG4gICAgICBuYXRHYXRld2F5czogMSwgLy8gVXNlIDEgTkFUIEdhdGV3YXkgdG8gc2F2ZSBjb3N0cyAodXNlIDMgZm9yIHByb2R1Y3Rpb24pXG4gICAgICBzdWJuZXRDb25maWd1cmF0aW9uOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBjaWRyTWFzazogMjQsXG4gICAgICAgICAgbmFtZTogXCJwdWJsaWNcIixcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBjaWRyTWFzazogMjQsXG4gICAgICAgICAgbmFtZTogXCJwcml2YXRlXCIsXG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgdGhlIEVLUyBjbHVzdGVyIHN0YWNrXG4gICAgY29uc3QgZWtzU3RhY2sgPSBuZXcgQ2RrRWtzU3RhY2sodGhpcywgXCJFa3NTdGFja1wiLCB7XG4gICAgICBlbnY6IHByb3BzPy5lbnYsXG4gICAgICB2cGM6IHZwYyxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSB0aGUgQXVyb3JhIFNlcnZlcmxlc3MgUG9zdGdyZVNRTCBzdGFja1xuICAgIGNvbnN0IGRiU3RhY2sgPSBuZXcgRGF0YWJhc2VTdGFjayh0aGlzLCBcIkRhdGFiYXNlU3RhY2tcIiwgdnBjLCB7XG4gICAgICBla3NTZWN1cml0eUdyb3VwOiBla3NTdGFjay5zZWN1cml0eUdyb3VwLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBSZWRpcyBzdGFja1xuICAgIGNvbnN0IHJlZGlzU3RhY2sgPSBuZXcgUmVkaXNTdGFjayh0aGlzLCBcIlJlZGlzU3RhY2tcIiwgdnBjLCB7XG4gICAgICBla3NTZWN1cml0eUdyb3VwOiBla3NTdGFjay5zZWN1cml0eUdyb3VwLFxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0IHRoZSBWUEMgSURcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIlZwY0lkXCIsIHtcbiAgICAgIHZhbHVlOiB2cGMudnBjSWQsXG4gICAgICBkZXNjcmlwdGlvbjogXCJUaGUgSUQgb2YgdGhlIFZQQ1wiLFxuICAgIH0pO1xuICB9XG59XG4iXX0=