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
        this.redisSecurityGroup = new ec2.SecurityGroup(this, "RedisSecurityGroup", {
            vpc,
            description: "Security group for Redis",
            allowAllOutbound: true,
        });
        // Allow inbound access from within the VPC
        this.redisSecurityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(6379), "Allow Redis access from within the VPC");
        // Allow inbound access from the EKS security group if provided
        if (props?.eksSecurityGroup) {
            this.redisSecurityGroup.addIngressRule(ec2.Peer.securityGroupId(props.eksSecurityGroup.securityGroupId), ec2.Port.tcp(5432), "Allow Redis access from EKS cluster");
        }
        // Create a subnet group for Redis
        const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, "RedisSubnetGroup", {
            description: "Subnet group for Redis",
            subnetIds: vpc.privateSubnets.map((subnet) => subnet.subnetId),
        });
        // Create a Redis parameter group
        const redisParameterGroup = new elasticache.CfnParameterGroup(this, "RedisParameterGroup", {
            cacheParameterGroupFamily: "redis6.x",
            description: "Parameter group for Redis 6.x",
            properties: {
                "maxmemory-policy": "volatile-lru",
            },
        });
        // Create the Redis cluster
        this.redisCluster = new elasticache.CfnCacheCluster(this, "RedisCluster", {
            cacheNodeType: "cache.t3.small",
            engine: "redis",
            numCacheNodes: 1,
            autoMinorVersionUpgrade: true,
            cacheParameterGroupName: redisParameterGroup.ref,
            cacheSubnetGroupName: redisSubnetGroup.ref,
            vpcSecurityGroupIds: [this.redisSecurityGroup.securityGroupId],
            engineVersion: "6.2",
        });
        // Output the Redis endpoint
        new cdk.CfnOutput(this, "RedisEndpoint", {
            value: this.redisCluster.attrRedisEndpointAddress,
            description: "The endpoint of the Redis cluster",
        });
        // Output the Redis port
        new cdk.CfnOutput(this, "RedisPort", {
            value: this.redisCluster.attrRedisEndpointPort,
            description: "The port of the Redis cluster",
        });
    }
}
exports.RedisStack = RedisStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkaXMtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZWRpcy1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUVuQyx5REFBMkM7QUFDM0MseUVBQTJEO0FBRTNELE1BQWEsVUFBVyxTQUFRLEdBQUcsQ0FBQyxXQUFXO0lBQzdCLFlBQVksQ0FBOEI7SUFDMUMsa0JBQWtCLENBQW9CO0lBRXRELFlBQ0UsS0FBZ0IsRUFDaEIsRUFBVSxFQUNWLEdBQVksRUFDWixLQUF1RTtRQUV2RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixvQ0FBb0M7UUFDcEMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksR0FBRyxDQUFDLGFBQWEsQ0FDN0MsSUFBSSxFQUNKLG9CQUFvQixFQUNwQjtZQUNFLEdBQUc7WUFDSCxXQUFXLEVBQUUsMEJBQTBCO1lBQ3ZDLGdCQUFnQixFQUFFLElBQUk7U0FDdkIsQ0FDRixDQUFDO1FBRUYsMkNBQTJDO1FBQzNDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLENBQ3BDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFDL0IsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQ2xCLHdDQUF3QyxDQUN6QyxDQUFDO1FBRUYsK0RBQStEO1FBQy9ELElBQUksS0FBSyxFQUFFLGdCQUFnQixFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FDcEMsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxFQUNoRSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFDbEIscUNBQXFDLENBQ3RDLENBQUM7UUFDSixDQUFDO1FBRUQsa0NBQWtDO1FBQ2xDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxXQUFXLENBQUMsY0FBYyxDQUNyRCxJQUFJLEVBQ0osa0JBQWtCLEVBQ2xCO1lBQ0UsV0FBVyxFQUFFLHdCQUF3QjtZQUNyQyxTQUFTLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7U0FDL0QsQ0FDRixDQUFDO1FBRUYsaUNBQWlDO1FBQ2pDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxXQUFXLENBQUMsaUJBQWlCLENBQzNELElBQUksRUFDSixxQkFBcUIsRUFDckI7WUFDRSx5QkFBeUIsRUFBRSxVQUFVO1lBQ3JDLFdBQVcsRUFBRSwrQkFBK0I7WUFDNUMsVUFBVSxFQUFFO2dCQUNWLGtCQUFrQixFQUFFLGNBQWM7YUFDbkM7U0FDRixDQUNGLENBQUM7UUFFRiwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLFdBQVcsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN4RSxhQUFhLEVBQUUsZ0JBQWdCO1lBQy9CLE1BQU0sRUFBRSxPQUFPO1lBQ2YsYUFBYSxFQUFFLENBQUM7WUFDaEIsdUJBQXVCLEVBQUUsSUFBSTtZQUM3Qix1QkFBdUIsRUFBRSxtQkFBbUIsQ0FBQyxHQUFHO1lBQ2hELG9CQUFvQixFQUFFLGdCQUFnQixDQUFDLEdBQUc7WUFDMUMsbUJBQW1CLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDO1lBQzlELGFBQWEsRUFBRSxLQUFLO1NBQ3JCLENBQUMsQ0FBQztRQUVILDRCQUE0QjtRQUM1QixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN2QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyx3QkFBd0I7WUFDakQsV0FBVyxFQUFFLG1DQUFtQztTQUNqRCxDQUFDLENBQUM7UUFFSCx3QkFBd0I7UUFDeEIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDbkMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMscUJBQXFCO1lBQzlDLFdBQVcsRUFBRSwrQkFBK0I7U0FDN0MsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBdEZELGdDQXNGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSBcImF3cy1jZGstbGliL2F3cy1lYzJcIjtcbmltcG9ydCAqIGFzIGVsYXN0aWNhY2hlIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWxhc3RpY2FjaGVcIjtcblxuZXhwb3J0IGNsYXNzIFJlZGlzU3RhY2sgZXh0ZW5kcyBjZGsuTmVzdGVkU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgcmVkaXNDbHVzdGVyOiBlbGFzdGljYWNoZS5DZm5DYWNoZUNsdXN0ZXI7XG4gIHB1YmxpYyByZWFkb25seSByZWRpc1NlY3VyaXR5R3JvdXA6IGVjMi5TZWN1cml0eUdyb3VwO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHNjb3BlOiBDb25zdHJ1Y3QsXG4gICAgaWQ6IHN0cmluZyxcbiAgICB2cGM6IGVjMi5WcGMsXG4gICAgcHJvcHM/OiBjZGsuTmVzdGVkU3RhY2tQcm9wcyAmIHsgZWtzU2VjdXJpdHlHcm91cD86IGVjMi5TZWN1cml0eUdyb3VwIH1cbiAgKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBDcmVhdGUgYSBzZWN1cml0eSBncm91cCBmb3IgUmVkaXNcbiAgICB0aGlzLnJlZGlzU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cChcbiAgICAgIHRoaXMsXG4gICAgICBcIlJlZGlzU2VjdXJpdHlHcm91cFwiLFxuICAgICAge1xuICAgICAgICB2cGMsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBcIlNlY3VyaXR5IGdyb3VwIGZvciBSZWRpc1wiLFxuICAgICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxuICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBBbGxvdyBpbmJvdW5kIGFjY2VzcyBmcm9tIHdpdGhpbiB0aGUgVlBDXG4gICAgdGhpcy5yZWRpc1NlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXG4gICAgICBlYzIuUGVlci5pcHY0KHZwYy52cGNDaWRyQmxvY2spLFxuICAgICAgZWMyLlBvcnQudGNwKDYzNzkpLFxuICAgICAgXCJBbGxvdyBSZWRpcyBhY2Nlc3MgZnJvbSB3aXRoaW4gdGhlIFZQQ1wiXG4gICAgKTtcblxuICAgIC8vIEFsbG93IGluYm91bmQgYWNjZXNzIGZyb20gdGhlIEVLUyBzZWN1cml0eSBncm91cCBpZiBwcm92aWRlZFxuICAgIGlmIChwcm9wcz8uZWtzU2VjdXJpdHlHcm91cCkge1xuICAgICAgdGhpcy5yZWRpc1NlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXG4gICAgICAgIGVjMi5QZWVyLnNlY3VyaXR5R3JvdXBJZChwcm9wcy5la3NTZWN1cml0eUdyb3VwLnNlY3VyaXR5R3JvdXBJZCksXG4gICAgICAgIGVjMi5Qb3J0LnRjcCg1NDMyKSxcbiAgICAgICAgXCJBbGxvdyBSZWRpcyBhY2Nlc3MgZnJvbSBFS1MgY2x1c3RlclwiXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhIHN1Ym5ldCBncm91cCBmb3IgUmVkaXNcbiAgICBjb25zdCByZWRpc1N1Ym5ldEdyb3VwID0gbmV3IGVsYXN0aWNhY2hlLkNmblN1Ym5ldEdyb3VwKFxuICAgICAgdGhpcyxcbiAgICAgIFwiUmVkaXNTdWJuZXRHcm91cFwiLFxuICAgICAge1xuICAgICAgICBkZXNjcmlwdGlvbjogXCJTdWJuZXQgZ3JvdXAgZm9yIFJlZGlzXCIsXG4gICAgICAgIHN1Ym5ldElkczogdnBjLnByaXZhdGVTdWJuZXRzLm1hcCgoc3VibmV0KSA9PiBzdWJuZXQuc3VibmV0SWQpLFxuICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBDcmVhdGUgYSBSZWRpcyBwYXJhbWV0ZXIgZ3JvdXBcbiAgICBjb25zdCByZWRpc1BhcmFtZXRlckdyb3VwID0gbmV3IGVsYXN0aWNhY2hlLkNmblBhcmFtZXRlckdyb3VwKFxuICAgICAgdGhpcyxcbiAgICAgIFwiUmVkaXNQYXJhbWV0ZXJHcm91cFwiLFxuICAgICAge1xuICAgICAgICBjYWNoZVBhcmFtZXRlckdyb3VwRmFtaWx5OiBcInJlZGlzNi54XCIsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBcIlBhcmFtZXRlciBncm91cCBmb3IgUmVkaXMgNi54XCIsXG4gICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICBcIm1heG1lbW9yeS1wb2xpY3lcIjogXCJ2b2xhdGlsZS1scnVcIixcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBSZWRpcyBjbHVzdGVyXG4gICAgdGhpcy5yZWRpc0NsdXN0ZXIgPSBuZXcgZWxhc3RpY2FjaGUuQ2ZuQ2FjaGVDbHVzdGVyKHRoaXMsIFwiUmVkaXNDbHVzdGVyXCIsIHtcbiAgICAgIGNhY2hlTm9kZVR5cGU6IFwiY2FjaGUudDMuc21hbGxcIixcbiAgICAgIGVuZ2luZTogXCJyZWRpc1wiLFxuICAgICAgbnVtQ2FjaGVOb2RlczogMSxcbiAgICAgIGF1dG9NaW5vclZlcnNpb25VcGdyYWRlOiB0cnVlLFxuICAgICAgY2FjaGVQYXJhbWV0ZXJHcm91cE5hbWU6IHJlZGlzUGFyYW1ldGVyR3JvdXAucmVmLFxuICAgICAgY2FjaGVTdWJuZXRHcm91cE5hbWU6IHJlZGlzU3VibmV0R3JvdXAucmVmLFxuICAgICAgdnBjU2VjdXJpdHlHcm91cElkczogW3RoaXMucmVkaXNTZWN1cml0eUdyb3VwLnNlY3VyaXR5R3JvdXBJZF0sXG4gICAgICBlbmdpbmVWZXJzaW9uOiBcIjYuMlwiLFxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0IHRoZSBSZWRpcyBlbmRwb2ludFxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiUmVkaXNFbmRwb2ludFwiLCB7XG4gICAgICB2YWx1ZTogdGhpcy5yZWRpc0NsdXN0ZXIuYXR0clJlZGlzRW5kcG9pbnRBZGRyZXNzLFxuICAgICAgZGVzY3JpcHRpb246IFwiVGhlIGVuZHBvaW50IG9mIHRoZSBSZWRpcyBjbHVzdGVyXCIsXG4gICAgfSk7XG5cbiAgICAvLyBPdXRwdXQgdGhlIFJlZGlzIHBvcnRcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIlJlZGlzUG9ydFwiLCB7XG4gICAgICB2YWx1ZTogdGhpcy5yZWRpc0NsdXN0ZXIuYXR0clJlZGlzRW5kcG9pbnRQb3J0LFxuICAgICAgZGVzY3JpcHRpb246IFwiVGhlIHBvcnQgb2YgdGhlIFJlZGlzIGNsdXN0ZXJcIixcbiAgICB9KTtcbiAgfVxufVxuIl19