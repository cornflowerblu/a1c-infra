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
exports.RedisStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const elasticache = __importStar(require("aws-cdk-lib/aws-elasticache"));
class RedisStack extends cdk.NestedStack {
    redisCluster;
    redisSecurityGroup;
    constructor(scope, id, vpc, props) {
        super(scope, id, props);
        // Create a security group for Redis
        this.redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
            vpc,
            description: 'Security group for Redis',
            allowAllOutbound: true,
        });
        // Allow inbound access from within the VPC
        this.redisSecurityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(6379), 'Allow Redis access from within the VPC');
        // Create a subnet group for Redis
        const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
            description: 'Subnet group for Redis',
            subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
        });
        // Create a Redis parameter group
        const redisParameterGroup = new elasticache.CfnParameterGroup(this, 'RedisParameterGroup', {
            cacheParameterGroupFamily: 'redis6.x',
            description: 'Parameter group for Redis 6.x',
            properties: {
                'maxmemory-policy': 'volatile-lru',
            },
        });
        // Create the Redis cluster
        this.redisCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
            cacheNodeType: 'cache.t3.small',
            engine: 'redis',
            numCacheNodes: 1,
            autoMinorVersionUpgrade: true,
            cacheParameterGroupName: redisParameterGroup.ref,
            cacheSubnetGroupName: redisSubnetGroup.ref,
            vpcSecurityGroupIds: [this.redisSecurityGroup.securityGroupId],
            engineVersion: '6.2',
        });
        // Output the Redis endpoint
        new cdk.CfnOutput(this, 'RedisEndpoint', {
            value: this.redisCluster.attrRedisEndpointAddress,
            description: 'The endpoint of the Redis cluster',
        });
        // Output the Redis port
        new cdk.CfnOutput(this, 'RedisPort', {
            value: this.redisCluster.attrRedisEndpointPort,
            description: 'The port of the Redis cluster',
        });
    }
}
exports.RedisStack = RedisStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkaXMtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZWRpcy1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUVuQyx5REFBMkM7QUFDM0MseUVBQTJEO0FBRTNELE1BQWEsVUFBVyxTQUFRLEdBQUcsQ0FBQyxXQUFXO0lBQzdCLFlBQVksQ0FBOEI7SUFDMUMsa0JBQWtCLENBQW9CO0lBRXRELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsR0FBWSxFQUFFLEtBQTRCO1FBQ2xGLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLG9DQUFvQztRQUNwQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUMxRSxHQUFHO1lBQ0gsV0FBVyxFQUFFLDBCQUEwQjtZQUN2QyxnQkFBZ0IsRUFBRSxJQUFJO1NBQ3ZCLENBQUMsQ0FBQztRQUVILDJDQUEyQztRQUMzQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUNwQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQy9CLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUNsQix3Q0FBd0MsQ0FDekMsQ0FBQztRQUVGLGtDQUFrQztRQUNsQyxNQUFNLGdCQUFnQixHQUFHLElBQUksV0FBVyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDaEYsV0FBVyxFQUFFLHdCQUF3QjtZQUNyQyxTQUFTLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1NBQzdELENBQUMsQ0FBQztRQUVILGlDQUFpQztRQUNqQyxNQUFNLG1CQUFtQixHQUFHLElBQUksV0FBVyxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUN6Rix5QkFBeUIsRUFBRSxVQUFVO1lBQ3JDLFdBQVcsRUFBRSwrQkFBK0I7WUFDNUMsVUFBVSxFQUFFO2dCQUNWLGtCQUFrQixFQUFFLGNBQWM7YUFDbkM7U0FDRixDQUFDLENBQUM7UUFFSCwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLFdBQVcsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN4RSxhQUFhLEVBQUUsZ0JBQWdCO1lBQy9CLE1BQU0sRUFBRSxPQUFPO1lBQ2YsYUFBYSxFQUFFLENBQUM7WUFDaEIsdUJBQXVCLEVBQUUsSUFBSTtZQUM3Qix1QkFBdUIsRUFBRSxtQkFBbUIsQ0FBQyxHQUFHO1lBQ2hELG9CQUFvQixFQUFFLGdCQUFnQixDQUFDLEdBQUc7WUFDMUMsbUJBQW1CLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDO1lBQzlELGFBQWEsRUFBRSxLQUFLO1NBQ3JCLENBQUMsQ0FBQztRQUVILDRCQUE0QjtRQUM1QixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN2QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyx3QkFBd0I7WUFDakQsV0FBVyxFQUFFLG1DQUFtQztTQUNqRCxDQUFDLENBQUM7UUFFSCx3QkFBd0I7UUFDeEIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDbkMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMscUJBQXFCO1lBQzlDLFdBQVcsRUFBRSwrQkFBK0I7U0FDN0MsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBNURELGdDQTREQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCAqIGFzIGVsYXN0aWNhY2hlIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lbGFzdGljYWNoZSc7XG5cbmV4cG9ydCBjbGFzcyBSZWRpc1N0YWNrIGV4dGVuZHMgY2RrLk5lc3RlZFN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IHJlZGlzQ2x1c3RlcjogZWxhc3RpY2FjaGUuQ2ZuQ2FjaGVDbHVzdGVyO1xuICBwdWJsaWMgcmVhZG9ubHkgcmVkaXNTZWN1cml0eUdyb3VwOiBlYzIuU2VjdXJpdHlHcm91cDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCB2cGM6IGVjMi5WcGMsIHByb3BzPzogY2RrLk5lc3RlZFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIENyZWF0ZSBhIHNlY3VyaXR5IGdyb3VwIGZvciBSZWRpc1xuICAgIHRoaXMucmVkaXNTZWN1cml0eUdyb3VwID0gbmV3IGVjMi5TZWN1cml0eUdyb3VwKHRoaXMsICdSZWRpc1NlY3VyaXR5R3JvdXAnLCB7XG4gICAgICB2cGMsXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBSZWRpcycsXG4gICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gQWxsb3cgaW5ib3VuZCBhY2Nlc3MgZnJvbSB3aXRoaW4gdGhlIFZQQ1xuICAgIHRoaXMucmVkaXNTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgZWMyLlBlZXIuaXB2NCh2cGMudnBjQ2lkckJsb2NrKSxcbiAgICAgIGVjMi5Qb3J0LnRjcCg2Mzc5KSxcbiAgICAgICdBbGxvdyBSZWRpcyBhY2Nlc3MgZnJvbSB3aXRoaW4gdGhlIFZQQydcbiAgICApO1xuXG4gICAgLy8gQ3JlYXRlIGEgc3VibmV0IGdyb3VwIGZvciBSZWRpc1xuICAgIGNvbnN0IHJlZGlzU3VibmV0R3JvdXAgPSBuZXcgZWxhc3RpY2FjaGUuQ2ZuU3VibmV0R3JvdXAodGhpcywgJ1JlZGlzU3VibmV0R3JvdXAnLCB7XG4gICAgICBkZXNjcmlwdGlvbjogJ1N1Ym5ldCBncm91cCBmb3IgUmVkaXMnLFxuICAgICAgc3VibmV0SWRzOiB2cGMucHJpdmF0ZVN1Ym5ldHMubWFwKHN1Ym5ldCA9PiBzdWJuZXQuc3VibmV0SWQpLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIGEgUmVkaXMgcGFyYW1ldGVyIGdyb3VwXG4gICAgY29uc3QgcmVkaXNQYXJhbWV0ZXJHcm91cCA9IG5ldyBlbGFzdGljYWNoZS5DZm5QYXJhbWV0ZXJHcm91cCh0aGlzLCAnUmVkaXNQYXJhbWV0ZXJHcm91cCcsIHtcbiAgICAgIGNhY2hlUGFyYW1ldGVyR3JvdXBGYW1pbHk6ICdyZWRpczYueCcsXG4gICAgICBkZXNjcmlwdGlvbjogJ1BhcmFtZXRlciBncm91cCBmb3IgUmVkaXMgNi54JyxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgJ21heG1lbW9yeS1wb2xpY3knOiAndm9sYXRpbGUtbHJ1JyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgdGhlIFJlZGlzIGNsdXN0ZXJcbiAgICB0aGlzLnJlZGlzQ2x1c3RlciA9IG5ldyBlbGFzdGljYWNoZS5DZm5DYWNoZUNsdXN0ZXIodGhpcywgJ1JlZGlzQ2x1c3RlcicsIHtcbiAgICAgIGNhY2hlTm9kZVR5cGU6ICdjYWNoZS50My5zbWFsbCcsXG4gICAgICBlbmdpbmU6ICdyZWRpcycsXG4gICAgICBudW1DYWNoZU5vZGVzOiAxLFxuICAgICAgYXV0b01pbm9yVmVyc2lvblVwZ3JhZGU6IHRydWUsXG4gICAgICBjYWNoZVBhcmFtZXRlckdyb3VwTmFtZTogcmVkaXNQYXJhbWV0ZXJHcm91cC5yZWYsXG4gICAgICBjYWNoZVN1Ym5ldEdyb3VwTmFtZTogcmVkaXNTdWJuZXRHcm91cC5yZWYsXG4gICAgICB2cGNTZWN1cml0eUdyb3VwSWRzOiBbdGhpcy5yZWRpc1NlY3VyaXR5R3JvdXAuc2VjdXJpdHlHcm91cElkXSxcbiAgICAgIGVuZ2luZVZlcnNpb246ICc2LjInLFxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0IHRoZSBSZWRpcyBlbmRwb2ludFxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZWRpc0VuZHBvaW50Jywge1xuICAgICAgdmFsdWU6IHRoaXMucmVkaXNDbHVzdGVyLmF0dHJSZWRpc0VuZHBvaW50QWRkcmVzcyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGVuZHBvaW50IG9mIHRoZSBSZWRpcyBjbHVzdGVyJyxcbiAgICB9KTtcblxuICAgIC8vIE91dHB1dCB0aGUgUmVkaXMgcG9ydFxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZWRpc1BvcnQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5yZWRpc0NsdXN0ZXIuYXR0clJlZGlzRW5kcG9pbnRQb3J0LFxuICAgICAgZGVzY3JpcHRpb246ICdUaGUgcG9ydCBvZiB0aGUgUmVkaXMgY2x1c3RlcicsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==