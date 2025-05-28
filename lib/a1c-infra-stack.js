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
exports.A1CInfraStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const cdk_eks_stack_1 = require("./cdk-eks-stack");
const database_stack_1 = require("./database-stack");
const redis_stack_1 = require("./redis-stack");
// import * as sqs from 'aws-cdk-lib/aws-sqs';
class A1CInfraStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        //Create a new VPC for all resources
        const vpc = new ec2.Vpc(this, 'A1CProjectVPC', {
            maxAzs: 3, // Use up to 3 Availability Zones for high availability
            natGateways: 1, // Use 1 NAT Gateway to save costs (use 3 for production)
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
            ],
        });
        // Create the EKS cluster stack
        const eksStack = new cdk_eks_stack_1.CdkEksStack(this, 'EksStack', {
            env: props?.env,
            vpc: vpc,
        });
        // Create the Aurora Serverless PostgreSQL stack
        const dbStack = new database_stack_1.DatabaseStack(this, 'DatabaseStack', vpc, {
            eksSecurityGroup: eksStack.securityGroup
        });
        // Create the Redis stack
        const redisStack = new redis_stack_1.RedisStack(this, 'RedisStack', vpc, {});
        // Output the VPC ID
        new cdk.CfnOutput(this, 'VpcId', {
            value: vpc.vpcId,
            description: 'The ID of the VPC',
        });
    }
}
exports.A1CInfraStack = A1CInfraStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYTFjLWluZnJhLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYTFjLWluZnJhLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHlEQUEyQztBQUUzQyxtREFBOEM7QUFDOUMscURBQWlEO0FBQ2pELCtDQUEyQztBQUMzQyw4Q0FBOEM7QUFFOUMsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDMUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixvQ0FBb0M7UUFDaEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDN0MsTUFBTSxFQUFFLENBQUMsRUFBRSx1REFBdUQ7WUFDbEUsV0FBVyxFQUFFLENBQUMsRUFBRSx5REFBeUQ7WUFDekUsbUJBQW1CLEVBQUU7Z0JBQ25CO29CQUNFLFFBQVEsRUFBRSxFQUFFO29CQUNaLElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU07aUJBQ2xDO2dCQUNEO29CQUNFLFFBQVEsRUFBRSxFQUFFO29CQUNaLElBQUksRUFBRSxTQUFTO29CQUNmLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLG1CQUFtQjtpQkFDL0M7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILCtCQUErQjtRQUMvQixNQUFNLFFBQVEsR0FBRyxJQUFJLDJCQUFXLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUNqRCxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUc7WUFDZixHQUFHLEVBQUUsR0FBRztTQUNULENBQUMsQ0FBQztRQUVILGdEQUFnRDtRQUNoRCxNQUFNLE9BQU8sR0FBRyxJQUFJLDhCQUFhLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRSxHQUFHLEVBQUU7WUFDNUQsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLGFBQWE7U0FDekMsQ0FBQyxDQUFDO1FBRUgseUJBQXlCO1FBQ3pCLE1BQU0sVUFBVSxHQUFHLElBQUksd0JBQVUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxFQUUxRCxDQUFDLENBQUM7UUFJSCxvQkFBb0I7UUFDcEIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUU7WUFDL0IsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLO1lBQ2hCLFdBQVcsRUFBRSxtQkFBbUI7U0FDakMsQ0FBQyxDQUFDO0lBQ1QsQ0FBQztDQUNGO0FBOUNELHNDQThDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IENka0Vrc1N0YWNrIH0gZnJvbSAnLi9jZGstZWtzLXN0YWNrJztcbmltcG9ydCB7IERhdGFiYXNlU3RhY2sgfSBmcm9tICcuL2RhdGFiYXNlLXN0YWNrJztcbmltcG9ydCB7IFJlZGlzU3RhY2sgfSBmcm9tICcuL3JlZGlzLXN0YWNrJztcbi8vIGltcG9ydCAqIGFzIHNxcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3FzJztcblxuZXhwb3J0IGNsYXNzIEExQ0luZnJhU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvL0NyZWF0ZSBhIG5ldyBWUEMgZm9yIGFsbCByZXNvdXJjZXNcbiAgICAgICAgY29uc3QgdnBjID0gbmV3IGVjMi5WcGModGhpcywgJ0ExQ1Byb2plY3RWUEMnLCB7XG4gICAgICAgICAgbWF4QXpzOiAzLCAvLyBVc2UgdXAgdG8gMyBBdmFpbGFiaWxpdHkgWm9uZXMgZm9yIGhpZ2ggYXZhaWxhYmlsaXR5XG4gICAgICAgICAgbmF0R2F0ZXdheXM6IDEsIC8vIFVzZSAxIE5BVCBHYXRld2F5IHRvIHNhdmUgY29zdHMgKHVzZSAzIGZvciBwcm9kdWN0aW9uKVxuICAgICAgICAgIHN1Ym5ldENvbmZpZ3VyYXRpb246IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICAgICAgICBuYW1lOiAncHVibGljJyxcbiAgICAgICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFVCTElDLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICAgICAgICBuYW1lOiAncHJpdmF0ZScsXG4gICAgICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICAvLyBDcmVhdGUgdGhlIEVLUyBjbHVzdGVyIHN0YWNrXG4gICAgICAgIGNvbnN0IGVrc1N0YWNrID0gbmV3IENka0Vrc1N0YWNrKHRoaXMsICdFa3NTdGFjaycsIHtcbiAgICAgICAgICBlbnY6IHByb3BzPy5lbnYsXG4gICAgICAgICAgdnBjOiB2cGMsXG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICAvLyBDcmVhdGUgdGhlIEF1cm9yYSBTZXJ2ZXJsZXNzIFBvc3RncmVTUUwgc3RhY2tcbiAgICAgICAgY29uc3QgZGJTdGFjayA9IG5ldyBEYXRhYmFzZVN0YWNrKHRoaXMsICdEYXRhYmFzZVN0YWNrJywgdnBjLCB7XG4gICAgICAgICAgZWtzU2VjdXJpdHlHcm91cDogZWtzU3RhY2suc2VjdXJpdHlHcm91cFxuICAgICAgICB9KTtcbiAgICBcbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBSZWRpcyBzdGFja1xuICAgICAgICBjb25zdCByZWRpc1N0YWNrID0gbmV3IFJlZGlzU3RhY2sodGhpcywgJ1JlZGlzU3RhY2snLCB2cGMsIHtcbiAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgXG4gICAgICAgIFxuICAgIFxuICAgICAgICAvLyBPdXRwdXQgdGhlIFZQQyBJRFxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVnBjSWQnLCB7XG4gICAgICAgICAgdmFsdWU6IHZwYy52cGNJZCxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBJRCBvZiB0aGUgVlBDJyxcbiAgICAgICAgfSk7XG4gIH1cbn1cbiJdfQ==