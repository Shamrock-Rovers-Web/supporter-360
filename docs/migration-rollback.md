# Supporter 360 - Migration Rollback Procedures

**Document Version:** 1.0
**Last Updated:** 2026-03-24
**Applies to:** Serverless Migration (RDS Serverless v2, VPC Endpoints, S3 Static Website)

---

## Table of Contents

1. [Emergency Contacts](#emergency-contacts)
2. [Decision Tree for Rollback](#decision-tree-for-rollback)
3. [Pre-Rollback Checklist](#pre-rollback-checklist)
4. [Rollback Procedures](#rollback-procedures)
   - [RDS Serverless v2 to t4g.medium](#rollback-rds-serverless-v2-to-t4gmedium)
   - [VPC Endpoints to NAT Gateway](#rollback-vpc-endpoints-to-nat-gateway)
   - [S3 Static Website to CloudFront](#rollback-s3-static-website-to-cloudfront)
   - [S3 Lifecycle Rules](#rollback-s3-lifecycle-rules)
   - [Full Stack Rollback](#full-stack-rollback)
5. [Post-Rollback Testing](#post-rollback-testing)
6. [Rollback Verification](#rollback-verification)

---

## Emergency Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| **Primary On-Call** | | | |
| **Secondary On-Call** | | | |
| **Database Lead** | | | |
| **Infrastructure Lead** | | | |
| **Engineering Manager** | | | |

**Escalation Path:**
1. Primary On-Call
2. Secondary On-Call
3. Engineering Manager

---

## Decision Tree for Rollback

```
START
│
├─ Is there a service outage?
│  ├─ YES → Is it critical (affecting all users)?
│  │   ├─ YES → Proceed with FULL STACK ROLLBACK
│  │   └─ NO → Can it be isolated to one component?
│  │       ├─ YES → Go to COMPONENT ROLLBACK
│  │       └─ NO → Proceed with FULL STACK ROLLBACK
│  │
│  └─ NO → Is there performance degradation?
│      ├─ YES → Is it RDS-related (slow queries, timeouts)?
│      │   ├─ YES → Rollback RDS Serverless v2
│      │   └─ NO → Is it network-related?
│      │       ├─ YES → Rollback VPC Endpoints
│      │       └─ NO → Investigate further
│      │
│      └─ NO → Is there a data integrity issue?
│          ├─ YES → Restore database from snapshot
│          └─ NO → Monitor and investigate
```

### Rollback Trigger Conditions

**Critical Triggers (Immediate Rollback Required):**
- Complete service outage (> 15 minutes)
- Data corruption or data loss
- Security breach due to new architecture
- API error rate > 25%
- Database unavailable > 10 minutes

**Warning Triggers (Evaluate Rollback):**
- API error rate > 10% but < 25%
- API latency p95 > 5 seconds
- Database connection failures > 5%
- Cost spike > 200% of baseline
- User complaints > 10 per hour

**Monitor Triggers (No Rollback):**
- API error rate < 5%
- API latency p95 < 2 seconds
- Cost increase within expected range
- Minor bugs not affecting core functionality

---

## Pre-Rollback Checklist

### Before Any Rollback

- [ ] **Notify stakeholders** - Send alert to #incidents channel
- [ ] **Identify rollback window** - Choose low-traffic period if possible
- [ ] **Create rollback snapshot** - Take fresh RDS snapshot before rollback
- [ ] **Verify backups exist** - Confirm at least 2 valid snapshots available
- [ ] **Document current state** - Save CloudFormation template, CDK outputs
- [ ] **Set up monitoring** - Ensure CloudWatch alarms are active
- [ ] **Prepare rollback script** - Have commands ready in terminal
- [ ] **Notify team** - Ensure on-call engineer is aware

### Required Tools Access

- [ ] AWS CLI configured with appropriate credentials
- [ ] CDK CLI installed and bootstrapped
- [ ] PostgreSQL client (psql) available
- [ ] Git access to repository
- [ ] Access to AWS Console (backup)

---

## Rollback Procedures

### Rollback RDS Serverless v2 to t4g.medium

**Time Estimate:** 2-4 hours
**Risk Level:** HIGH (involves database migration)
**Downtime:** 30-60 minutes

#### Trigger Conditions

- RDS Serverless v2 CPU consistently above 80%
- Query timeouts > 30 seconds
- Connection failures due to insufficient ACU
- Cost > 300% of baseline t4g.medium
- Performance degradation unresolvable with scaling

#### Prerequisites

1. **Verify current state:**
   ```bash
   # Get current RDS configuration
   aws rds describe-db-instances \
     --db-instance-identifier supporter360-database \
     --query 'DBInstances[0].{Engine:Engine,EngineVersion:EngineVersion,DBInstanceClass:DBInstanceClass,AllocatedStorage:AllocatedStorage}'

   # Get Serverless v2 configuration
   aws rds describe-db-instances \
     --db-instance-identifier supporter360-database \
     --query 'DBInstances[0].{ScalingConfigurationInfo:ScalingConfigurationInfo}'
   ```

2. **Create final snapshot:**
   ```bash
   aws rds create-db-snapshot \
     --db-instance-identifier supporter360-database \
     --db-snapshot-identifier supporter360-pre-rollback-$(date +%Y%m%d-%H%M%S)
   ```

3. **Export data from Serverless v2:**
   ```bash
   # Get database credentials
   DB_SECRET=$(aws secretsmanager get-secret-value \
     --secret-id supporter360-supporter360-postgres \
     --query SecretString --output text)

   DB_HOST=$(echo $DB_SECRET | jq -r '.host')
   DB_USER=$(echo $DB_SECRET | jq -r '.username')
   DB_PASSWORD=$(echo $DB_SECRET | jq -r '.password')

   # Export database schema and data
   pg_dump -h $DB_HOST -U $DB_USER -d supporter360 \
     -Fc -f supporter360-export-$(date +%Y%m%d).dump
   ```

#### Step-by-Step Rollback

1. **Create new t4g.medium instance:**
   ```bash
   # Modify RDS instance to t4g.medium
   aws rds modify-db-instance \
     --db-instance-identifier supporter360-database \
     --db-instance-class db.t4g.medium \
     --storage-type gp2 \
     --allocated-storage 100 \
     --no-multi-az \
     --no-auto-minor-version-upgrade \
     --apply-immediately

   # Wait for modification to complete
   aws rds wait db-instance-available \
     --db-instance-identifier supporter360-database
   ```

2. **Import data to t4g.medium:**
   ```bash
   # Wait for instance to be fully available
   sleep 300

   # Restore from export
   pg_restore -h $DB_HOST -U $DB_USER -d supporter360 \
     -j 4 --clean --if-exists \
     supporter360-export-$(date +%Y%m%d).dump
   ```

3. **Update CDK stack:**
   ```bash
   cd packages/infrastructure

   # Edit supporter360-stack.ts
   # Change RDS configuration from Serverless v2 to t4g.medium
   ```

   In `supporter360-stack.ts`, replace:
   ```typescript
   // Serverless v2 configuration (REMOVE)
   const database = new rds.DatabaseInstance(this, 'Database', {
     engine: rds.DatabaseInstanceEngine.postgres({
       version: rds.PostgresEngineVersion.VER_15_4
     }),
     instanceType: InstanceType.of(InstanceClass.BURSTABLE3, InstanceSize.SMALL),
     vpc: vpc,
     vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
     scaling: {
       autoPause: false,
       minCapacity: 0.5,
       maxCapacity: 4
     }
   });
   ```

   With:
   ```typescript
   // t4g.medium configuration (ADD)
   const database = new rds.DatabaseInstance(this, 'Database', {
     engine: rds.DatabaseInstanceEngine.postgres({
       version: rds.PostgresEngineVersion.VER_15_4
     }),
     instanceType: InstanceType.of(InstanceClass.BURSTABLE3, InstanceSize.MEDIUM),
     allocatedStorage: 100,
     storageType: rds.StorageType.GP2,
     vpc: vpc,
     vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
     backupRetention: cdk.Duration.days(7),
     deletionProtection: false
   });
   ```

4. **Deploy updated stack:**
   ```bash
   # Build and deploy
   npm run build
   cdk deploy --require-approval never

   # Wait for deployment to complete
   cdk watch
   ```

5. **Update Lambda environment variables:**
   ```bash
   # Get all Lambda functions
   FUNCTIONS=$(aws lambda list-functions \
     --query 'Functions[?contains(FunctionName, `Supporter360Stack`)].FunctionName' \
     --output text)

   # Update each function's database connection timeout
   for FUNC in $FUNCTIONS; do
     aws lambda update-function-configuration \
       --function-name $FUNC \
       --timeout 30 \
       --memory-size 512
   done
   ```

#### Verification Steps

1. **Check RDS instance type:**
   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier supporter360-database \
     --query 'DBInstances[0].DBInstanceClass'
   # Expected: db.t4g.medium
   ```

2. **Test database connectivity:**
   ```bash
   psql -h $DB_HOST -U $DB_USER -d supporter360 -c "SELECT COUNT(*) FROM supporters;"
   ```

3. **Test API endpoints:**
   ```bash
   # Test search
   curl -H 'X-API-Key: $API_KEY' "$API_URL/search?q=test"

   # Test profile
   curl -H 'X-API-Key: $API_KEY' "$API_URL/supporters/$SUPPORTER_ID/profile"
   ```

4. **Monitor CloudWatch metrics:**
   ```bash
   # Check RDS CPU
   aws cloudwatch get-metric-statistics \
     --namespace AWS/RDS \
     --metric-name CPUUtilization \
     --dimensions Name=DBInstanceIdentifier,Value=supporter360-database \
     --start-time $(date -u -d '10 minutes ago' --iso-8601) \
     --end-time $(date -u --iso-8601) \
     --period 300 \
     --statistics Average
   ```

---

### Rollback VPC Endpoints to NAT Gateway

**Time Estimate:** 30-60 minutes
**Risk Level:** MEDIUM (networking changes)
**Downtime:** 5-15 minutes

#### Trigger Conditions

- VPC endpoints failing or misconfigured
- Lambda functions unable to reach external APIs
- Cost higher than NAT Gateway baseline
- Connectivity issues with Secrets Manager or S3

#### Prerequisites

1. **Document current VPC endpoint configuration:**
   ```bash
   # List all VPC endpoints
   aws ec2 describe-vpc-endpoints \
     --query 'VpcEndpoints[?VpcId==`vpc-xxxxx`].{ServiceName:ServiceName,State:State}' \
     --output table
   ```

2. **Verify current NAT Gateway status:**
   ```bash
   # Check if NAT Gateways exist
   aws ec2 describe-nat-gateways \
     --query 'NatGateways[?State==`available`]'
   ```

#### Step-by-Step Rollback

1. **Update CDK stack to add NAT Gateway:**
   ```bash
   cd packages/infrastructure

   # Edit supporter360-stack.ts
   # Add NAT Gateway configuration
   ```

   In `supporter360-stack.ts`, replace VPC endpoint configuration with:
   ```typescript
   // NAT Gateway configuration
   const natGatewayProvider = ec2.NatProvider.gateway({
     type: ec2.NatInstanceType.T3_MICRO
   });

   const vpc = new ec2.Vpc(this, 'VPC', {
     cidr: '10.0.0.0/16',
     maxAzs: 2,
     natGateways: 1,
     subnetConfiguration: [
       {
         cidrMask: 24,
         name: 'public',
         subnetType: ec2.SubnetType.PUBLIC
       },
       {
         cidrMask: 24,
         name: 'private',
         subnetType: ec2.SubnetType.PRIVATE_WITH_NAT
       }
     ]
   });

   // Remove VPC endpoint statements
   // Remove: vpc.addInterfaceEndpoint(), vpc.addGatewayEndpoint()
   ```

2. **Deploy updated stack:**
   ```bash
   # Build and deploy
   npm run build
   cdk diff  # Review changes
   cdk deploy --require-approval never
   ```

3. **Remove VPC endpoints:**
   ```bash
   # Get list of VPC endpoints
   ENDPOINTS=$(aws ec2 describe-vpc-endpoints \
     --filters Name=vpc-id,Values=vpc-xxxxx \
     --query 'VpcEndpoints[].VpcEndpointId' \
     --output text)

   # Delete each endpoint
   for ENDPOINT in $ENDPOINTS; do
     aws ec2 delete-vpc-endpoints --vpc-endpoint-ids $ENDPOINT
   done
   ```

4. **Update Lambda subnet configurations:**
   ```bash
   # Get Lambda functions
   FUNCTIONS=$(aws lambda list-functions \
     --query 'Functions[?contains(FunctionName, `Supporter360Stack`)].FunctionName' \
     --output text)

   # Update each function's VPC config to use NAT subnets
   for FUNC in $FUNCTIONS; do
     # Get current subnet IDs
     SUBNET_IDS=$(aws lambda get-function-configuration \
       --function-name $FUNC \
       --query 'VpcConfig.SubnetIds' \
       --output text)

     # Update to NAT subnets (subnet-xxxxx, subnet-yyyyy)
     aws lambda update-function-configuration \
       --function-name $FUNC \
       --vpc-config SubnetIds=subnet-xxxxx,subnet-yyyyy,SecurityGroupIds=sg-xxxxx
   done
   ```

#### Verification Steps

1. **Verify NAT Gateway is running:**
   ```bash
   aws ec2 describe-nat-gateways \
     --filters Name=state,Values=available \
     --query 'NatGateways[].NatGatewayId'
   ```

2. **Test Lambda external connectivity:**
   ```bash
   # Invoke a Lambda function that makes external API calls
   aws lambda invoke \
     --function-name Supporter360Stack-ShopifyProcessor \
     --payload '{"test": "external"}' \
     response.json

   cat response.json
   ```

3. **Test Secrets Manager access:**
   ```bash
   # Test Lambda can access Secrets Manager
   aws lambda invoke \
     --function-name Supporter360Stack-SearchHandler \
     --payload '{}' \
     response.json

   # Check logs for successful secret retrieval
   aws logs tail /aws/lambda/Supporter360Stack-SearchHandler --since 5m
   ```

4. **Monitor NAT Gateway metrics:**
   ```bash
   # Check NAT Gateway bandwidth
   aws cloudwatch get-metric-statistics \
     --namespace AWS/NATGateway \
     --metric-name BytesOutToDestination \
     --dimensions Name=NatGatewayId,Value=nat-xxxxx \
     --start-time $(date -u -d '10 minutes ago' --iso-8601) \
     --end-time $(date -u --iso-8601) \
     --period 300 \
     --statistics Sum
   ```

---

### Rollback S3 Static Website to CloudFront

**Time Estimate:** 30-45 minutes
**Risk Level:** LOW (frontend only)
**Downtime:** 5-10 minutes

#### Trigger Conditions

- S3 static website hosting failures
- CORS issues with S3 direct access
- Poor caching performance
- SSL/TLS certificate issues

#### Prerequisites

1. **Document current S3 configuration:**
   ```bash
   # Get S3 bucket website configuration
   aws s3 get-bucket-website \
     --bucket supporter360-frontend-xxxxx
   ```

2. **Verify CloudFront distribution exists (or create):**
   ```bash
   # List CloudFront distributions
   aws cloudfront list-distributions \
     --query 'DistributionList.Items[?Origins.Items[?Id==`supporter360-frontend`]].Id'
   ```

#### Step-by-Step Rollback

1. **Update CDK stack to add CloudFront:**
   ```bash
   cd packages/infrastructure

   # Edit supporter360-stack.ts
   # Add CloudFront distribution
   ```

   In `supporter360-stack.ts`, replace S3 static website with:
   ```typescript
   // CloudFront distribution
   const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
     bucketName: 'supporter360-frontend-' + cdk.Stack.of(this).account,
     websiteIndexDocument: 'index.html',
     websiteErrorDocument: 'error.html',
     publicReadAccess: false,
     blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
   });

   const distribution = new cloudfront.Distribution(this, 'Distribution', {
     defaultBehavior: {
       origin: new origins.S3Origin(frontendBucket),
       viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
       allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
       cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
       cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
       originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER
     },
     errorResponses: [
       {
         httpStatus: 403,
         responseHttpStatus: 200,
         responsePagePath: '/index.html'
       },
       {
         httpStatus: 404,
         responseHttpStatus: 200,
         responsePagePath: '/index.html'
       }
     ],
     defaultRootObject: 'index.html'
   });

   // Remove S3 static website configuration
   // Remove: frontendBucket.addWebsiteRule()
   ```

2. **Deploy updated stack:**
   ```bash
   # Build and deploy
   npm run build
   cdk diff  # Review changes
   cdk deploy --require-approval never
   ```

3. **Remove S3 static website configuration:**
   ```bash
   # Delete website configuration
   aws s3 delete-bucket-website \
     --bucket supporter360-frontend-xxxxx
   ```

4. **Update S3 bucket policy:**
   ```bash
   # Update bucket policy to only allow CloudFront access
   cat > bucket-policy.json << EOF
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "AllowCloudFrontServicePrincipal",
         "Effect": "Allow",
         "Principal": {
           "Service": "cloudfront.amazonaws.com"
         },
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::supporter360-frontend-xxxxx/*",
         "Condition": {
           "StringEquals": {
             "AWS:SourceArn": "arn:aws:cloudfront::123456789:distribution/xxxxx"
           }
         }
       }
     ]
   }
   EOF

   aws s3 put-bucket-policy \
     --bucket supporter360-frontend-xxxxx \
     --policy file://bucket-policy.json
   ```

5. **Deploy frontend to S3:**
   ```bash
   cd packages/frontend
   npm run build
   aws s3 sync dist/ s3://supporter360-frontend-xxxxx --delete
   ```

6. **Invalidate CloudFront cache:**
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id xxxxxyyyyzzzz \
     --paths "/*"
   ```

#### Verification Steps

1. **Verify CloudFront distribution is deployed:**
   ```bash
   aws cloudfront get-distribution \
     --id xxxxxyyyyzzzz \
     --query 'Distribution.Status'
   # Expected: Deployed
   ```

2. **Test frontend access:**
   ```bash
   # Test CloudFront URL
   curl -I https://dxxxxx.cloudfront.net/

   # Expected: HTTP/1.1 200 OK
   # Expected: X-Cache: Hit from cloudfront
   ```

3. **Test SSL certificate:**
   ```bash
   curl -Iv https://dxxxxx.cloudfront.net/ 2>&1 | grep "SSL"
   # Expected: TLS 1.2 or higher
   ```

4. **Test SPA routing:**
   ```bash
   # Test direct path (should return index.html)
   curl -I https://dxxxxx.cloudfront.net/supporters/test
   # Expected: HTTP/1.1 200 OK
   ```

---

### Rollback S3 Lifecycle Rules

**Time Estimate:** 15 minutes
**Risk Level:** LOW (data retention policy only)
**Downtime:** 0 minutes

#### Trigger Conditions

- Accidental deletion of archived data
- Compliance requirements for longer retention
- Cost analysis showing Glacier is more expensive than expected

#### Prerequisites

1. **Document current lifecycle rules:**
   ```bash
   # Get current lifecycle configuration
   aws s3api get-bucket-lifecycle-configuration \
     --bucket supporter360-raw-payloads-xxxxx
   ```

#### Step-by-Step Rollback

1. **Update CDK stack:**
   ```bash
   cd packages/infrastructure

   # Edit supporter360-stack.ts
   # Restore original lifecycle rules
   ```

   In `supporter360-stack.ts`, replace lifecycle configuration with:
   ```typescript
   // Original lifecycle rules (90 days Glacier, 365 days expire)
   rawPayloadsBucket.addLifecycleRule({
     id: 'ArchiveRawPayloads',
     enabled: true,
     transitions: [
       {
         storageClass: s3.StorageClass.GLACIER,
         transitionAfter: cdk.Duration.days(90)
       },
       {
         storageClass: s3.StorageClass.DEEP_ARCHIVE,
         transitionAfter: cdk.Duration.days(180)
       }
     ],
     expiration: cdk.Duration.days(365)
   });
   ```

2. **Deploy updated stack:**
   ```bash
   # Build and deploy
   npm run build
   cdk diff  # Review changes
   cdk deploy --require-approval never
   ```

#### Verification Steps

1. **Verify lifecycle rules:**
   ```bash
   aws s3api get-bucket-lifecycle-configuration \
     --bucket supporter360-raw-payloads-xxxxx
   ```

2. **Check for upcoming transitions:**
   ```bash
   # List objects that will transition soon
   aws s3api list-objects-v2 \
     --bucket supporter360-raw-payloads-xxxxx \
     --query 'Contents[?LastModified<`$(date -u -d '85 days ago' --iso-8601)`].{Key:Key,LastModified:LastModified}'
   ```

---

### Full Stack Rollback

**Time Estimate:** 1-2 hours
**Risk Level:** CRITICAL
**Downtime:** 30-60 minutes

#### Trigger Conditions

- Multiple component failures
- Complete service outage
- Data corruption
- Security breach
- Unresolvable critical bugs

#### Prerequisites

1. **Create comprehensive backup:**
   ```bash
   # Create RDS snapshot
   aws rds create-db-snapshot \
     --db-instance-identifier supporter360-database \
     --db-snapshot-identifier supporter360-pre-full-rollback-$(date +%Y%m%d-%H%M%S)

   # Export S3 bucket contents
   aws s3 sync s3://supporter360-frontend-xxxxx ./frontend-backup
   aws s3 sync s3://supporter360-raw-payloads-xxxxx ./payloads-backup
   ```

2. **Document current CloudFormation template:**
   ```bash
   # Export current template
   aws cloudformation get-template \
     --stack-name Supporter360Stack \
     --query 'TemplateBody' \
     --output json > current-template.json
   ```

#### Step-by-Step Rollback

1. **Identify previous stable commit:**
   ```bash
   # List recent commits
   git log --oneline -20

   # Find commit before migration
   # Example: abc1234 Add serverless migration prep
   ```

2. **Checkout previous version:**
   ```bash
   git checkout <previous-commit-hash>

   # Verify CDK stack file
   cat packages/infrastructure/lib/supporter360-stack.ts
   ```

3. **Build and deploy:**
   ```bash
   # Build all packages
   npm run build

   # Deploy previous version
   cd packages/infrastructure
   cdk deploy --require-approval never --force
   ```

4. **Restore database from snapshot:**
   ```bash
   # List available snapshots
   aws rds describe-db-snapshots \
     --db-instance-identifier supporter360-database \
     --query 'DBSnapshots[?SnapshotCreateTime>=`2024-01-01`].[DBSnapshotIdentifier,SnapshotCreateTime,SnapshotType]' \
     --output table

   # Choose snapshot and restore
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier supporter360-database-restore \
     --db-snapshot-identifier <snapshot-id>

   # Wait for restore to complete
   aws rds wait db-instance-available \
     --db-instance-identifier supporter360-database-restore

   # Rename instances (requires downtime)
   aws rds modify-db-instance \
     --db-instance-identifier supporter360-database \
     --new-db-instance-identifier supporter360-database-old \
     --apply-immediately

   aws rds modify-db-instance \
     --db-instance-identifier supporter360-database-restore \
     --new-db-instance-identifier supporter360-database \
     --apply-immediately
   ```

5. **Update Lambda environment variables:**
   ```bash
   # Get all Lambda functions
   FUNCTIONS=$(aws lambda list-functions \
     --query 'Functions[?contains(FunctionName, `Supporter360Stack`)].FunctionName' \
     --output text)

   # Update database host in each function
   for FUNC in $FUNCTIONS; do
     aws lambda update-function-configuration \
       --function-name $FUNC \
       --environment Variables={DB_HOST=$NEW_DB_HOST}
   done
   ```

6. **Redeploy frontend:**
   ```bash
   cd packages/frontend
   npm run build
   aws s3 sync dist/ s3://supporter360-frontend-xxxxx --delete
   aws cloudfront create-invalidation --distribution-id xxxxx --paths "/*"
   ```

#### Verification Steps

1. **Run comprehensive health check:**
   ```bash
   ./scripts/health-check.sh
   ```

2. **Run deployment validation:**
   ```bash
   ./scripts/validate-deployment.sh
   ```

3. **Test all integrations:**
   ```bash
   # Test Future Ticketing
   curl -H 'X-API-Key: $API_KEY' "$API_URL/supporters/test/timeline"

   # Test Shopify (if configured)
   # Test Stripe (if configured)
   # Test GoCardless (if configured)
   # Test Mailchimp (if configured)
   ```

4. **Verify data integrity:**
   ```bash
   # Connect to database
   psql -h $DB_HOST -U $DB_USER -d supporter360

   # Run integrity checks
   SELECT COUNT(*) FROM supporters;
   SELECT COUNT(*) FROM events;
   SELECT COUNT(*) FROM memberships;

   # Check for recent data
   SELECT COUNT(*) FROM events WHERE created_at > NOW() - INTERVAL '1 hour';
   ```

---

## Post-Rollback Testing

### Critical Functionality Tests

- [ ] **API Health Check**
  ```bash
  curl -f $API_URL/health || echo "FAIL: Health check"
  ```

- [ ] **Database Connectivity**
  ```bash
  psql -h $DB_HOST -U $DB_USER -d supporter360 -c "SELECT 1;" || echo "FAIL: DB connection"
  ```

- [ ] **Search API**
  ```bash
  curl -H 'X-API-Key: $API_KEY' "$API_URL/search?q=test&limit=5" | jq '.items | length' || echo "FAIL: Search API"
  ```

- [ ] **Profile API**
  ```bash
  curl -H 'X-API-Key: $API_KEY' "$API_URL/supporters/$SUPPORTER_ID/profile" | jq '.supporter_id' || echo "FAIL: Profile API"
  ```

- [ ] **Timeline API**
  ```bash
  curl -H 'X-API-Key: $API_KEY' "$API_URL/supporters/$SUPPORTER_ID/timeline" | jq '.events | length' || echo "FAIL: Timeline API"
  ```

- [ ] **Frontend Load**
  ```bash
  curl -I https://dxxxxx.cloudfront.net/ | grep "HTTP" || echo "FAIL: Frontend"
  ```

### Integration Tests

- [ ] **Future Ticketing Poller**
  ```bash
  aws logs tail /aws/lambda/Supporter360Stack-FutureTicketingPoller --since 5m | grep -i "error" && echo "FAIL: FT Poller" || echo "PASS"
  ```

- [ ] **Webhook Processors**
  ```bash
  for QUEUE in shopify stripe gocardless mailchimp; do
    aws sqs get-queue-attributes \
      --queue-url https://sqs.eu-west-1.amazonaws.com/xxx/supporter360-${QUEUE}-queue \
      --attribute-names ApproximateNumberOfMessagesVisible
  done
  ```

### Performance Tests

- [ ] **API Latency**
  ```bash
  time curl -H 'X-API-Key: $API_KEY' "$API_URL/search?q=test&limit=10"
  # Expected: < 500ms
  ```

- [ ] **Database Query Performance**
  ```bash
  psql -h $DB_HOST -U $DB_USER -d supporter360 -c "EXPLAIN ANALYZE SELECT * FROM supporters WHERE email LIKE '%test%' LIMIT 10;"
  # Expected: < 100ms
  ```

### Data Integrity Tests

- [ ] **Event Counts**
  ```bash
  psql -h $DB_HOST -U $DB_USER -d supporter360 -c "
    SELECT
      COUNT(*) as total_events,
      COUNT(DISTINCT supporter_id) as unique_supporters,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as recent_events
    FROM events;
  "
  ```

- [ ] **Membership Validity**
  ```bash
  psql -h $DB_HOST -U $DB_USER -d supporter360 -c "
    SELECT
      COUNT(*) FILTER (WHERE paid_up = true) as paid_up_count,
      COUNT(*) FILTER (WHERE paid_up = false) as not_paid_up_count
    FROM memberships;
  "
  ```

---

## Rollback Verification

### Final Checklist

- [ ] All health checks passing
- [ ] API endpoints responding correctly
- [ ] Database queries performing well
- [ ] Frontend loading properly
- [ ] No errors in CloudWatch logs (last 15 minutes)
- [ ] Webhook queues processing normally
- [ ] Cost projections within budget
- [ ] Stakeholders notified of rollback completion
- [ ] Post-mortem scheduled

### Post-Rollback Actions

1. **Update documentation:**
   ```bash
   # Document rollback in NOTES.md
   cat >> NOTES.md << EOF

   ## Rollback - $(date +%Y-%m-%d)

   **Reason:** [Brief description of issue]
   **Components Rolled Back:** [List components]
   **Downtime:** [X minutes]
   **Root Cause:** [Brief description]
   **Prevention:** [What will prevent this in future]
   EOF
   ```

2. **Create incident report:**
   - Timeline of events
   - Root cause analysis
   - Impact assessment
   - Lessons learned
   - Action items

3. **Schedule post-mortem meeting:**
   - Invite all relevant team members
   - Review incident timeline
   - Discuss improvements
   - Assign action items

4. **Update monitoring:**
   - Add alarms for similar issues
   - Create dashboards for rollback triggers
   - Document early warning signs

---

## Appendix

### Useful Commands

**Check RDS instance type:**
```bash
aws rds describe-db-instances \
  --db-instance-identifier supporter360-database \
  --query 'DBInstances[0].DBInstanceClass'
```

**Check RDS Serverless v2 ACU:**
```bash
aws rds describe-db-instances \
  --db-instance-identifier supporter360-database \
  --query 'DBInstances[0].ScalingConfigurationInfo'
```

**List VPC endpoints:**
```bash
aws ec2 describe-vpc-endpoints \
  --filters Name=vpc-id,Values=vpc-xxxxx \
  --query 'VpcEndpoints[].{ServiceName:ServiceName,State:State,VpcEndpointId:VpcEndpointId}'
```

**Check NAT Gateway:**
```bash
aws ec2 describe-nat-gateways \
  --filters Name=state,Values=available \
  --query 'NatGateways[].{NatGatewayId:NatGatewayId,State:State}'
```

**Check CloudFront distribution:**
```bash
aws cloudfront get-distribution \
  --id xxxxx \
  --query 'Distribution.{Id:Id,Status:Status,DomainName:DomainName}'
```

**List Lambda functions:**
```bash
aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `Supporter360Stack`)].FunctionName' \
  --output text
```

**Check CloudFormation stack status:**
```bash
aws cloudformation describe-stacks \
  --stack-name Supporter360Stack \
  --query 'Stacks[0].{StackName:StackName,StackStatus:StackStatus}'
```

### Rollback Script Template

```bash
#!/bin/bash
# rollback.sh - Automated rollback script

set -e

ROLLBACK_TYPE=$1
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "=== Supporter 360 Rollback ==="
echo "Type: $ROLLBACK_TYPE"
echo "Timestamp: $TIMESTAMP"
echo ""

# Pre-rollback checks
echo "Running pre-rollback checks..."
./scripts/health-check.sh --quick

# Create backup
echo "Creating backups..."
aws rds create-db-snapshot \
  --db-instance-identifier supporter360-database \
  --db-snapshot-identifier supporter360-pre-rollback-$TIMESTAMP

# Perform rollback based on type
case $ROLLBACK_TYPE in
  "rds")
    echo "Rolling back RDS to t4g.medium..."
    # Add RDS rollback commands here
    ;;
  "vpc")
    echo "Rolling back VPC to NAT Gateway..."
    # Add VPC rollback commands here
    ;;
  "cloudfront")
    echo "Rolling back to CloudFront..."
    # Add CloudFront rollback commands here
    ;;
  "full")
    echo "Performing full stack rollback..."
    # Add full rollback commands here
    ;;
  *)
    echo "Usage: ./rollback.sh [rds|vpc|cloudfront|full]"
    exit 1
    ;;
esac

# Post-rollback verification
echo "Running post-rollback verification..."
./scripts/health-check.sh

echo "Rollback complete!"
```

---

**Document Control:**

- **Owner:** Infrastructure Team
- **Review Date:** Quarterly
- **Next Review:** 2026-06-24
- **Change History:**
  - 2026-03-24: Initial version created for serverless migration
