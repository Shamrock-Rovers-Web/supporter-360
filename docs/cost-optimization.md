# Supporter 360 - Cost Optimization Guide

## Current Cost Breakdown (Monthly Estimates)

### Database (Primary Cost Driver)
- **RDS Serverless v2 PostgreSQL**: ~$0.50-2/month
  - ACU usage: 0.5-1 ACU average @ $0.064/ACU-hour (eu-west-1)
  - Storage (20GB): ~$2-3/month
  - Backup storage (7-day retention): ~$2-4/month
  - Data transfer: Variable, typically minimal
  - **Major savings**: $48-68/month vs. provisioned instance

### Compute & Integration
- **Lambda Functions**: ~$5-15/month
  - Webhook handlers: ~1-2M requests @ $0.20/M = ~$0.40
  - Queue processors: ~500K invocations @ $0.20/M = ~$0.10
  - Scheduled functions: ~15K invocations/month = ~$0.003
  - Compute time: ~50GB-seconds @ $0.0000166667/GB-s = ~$0.83
  - Total Lambda costs minimal unless traffic increases significantly

### API Gateway
- **API Gateway**: ~$3-5/month
  - 1M API requests: $3.50
  - Data transfer: Variable
  - Current usage likely <500K requests/month

### Messaging & Queues
- **SQS Queues**: ~$1-2/month
  - 10 queues × 1M requests each = ~$0.40
  - Data transfer: Minimal

### Storage
- **S3 Buckets**: ~$1-3/month
  - Raw payloads (100GB): ~$2.30
  - Frontend assets (100MB): ~$0.0023
  - Data transfer: Variable

### CDN & Networking
- **S3 Static Website**: ~$1-2/month
  - Storage (100MB): ~$0.0023
  - 100GB transfer: ~$0.85 (eu-west-1)
  - HTTP requests: ~$0.004/M
  - **Savings**: $4-8/month vs. CloudFront

### VPC & Network
- **VPC Resources**: ~$7/month
  - VPC Endpoints (3): ~$0.01/hour × 3 = ~$7/month
    - Secrets Manager endpoint (required for DB auth)
    - S3 endpoint (for payload archiving)
    - DynamoDB endpoint (for future use)
  - **Savings**: $9/month vs. NAT Gateway
  - **Performance**: VPC endpoints use AWS network backbone (faster)

### Total Estimated Monthly Cost: **$25-40/month**

---

## Cost Optimization Strategies

### 1. Database Optimizations

#### All Environments (Current Architecture)
**Using RDS Serverless v2:**
- Cost: ~$0.50-2/month (low traffic patterns)
- Benefit: Pay only when active, automatic scaling from 0.5-1 ACU
- Savings: ~$48-68/month vs. provisioned t4g.medium instance
- Trade-off: Cold starts (1-3 seconds), slightly higher per-request cost
- **Perfect fit for**: Intermittent workloads, development, and production with low-to-moderate traffic

```typescript
// Current architecture for all environments:
const database = new rds.ServerlessV2Cluster(this, 'Supporter360Database', {
  engine: rds.DatabaseInstanceEngine.postgres({
    version: rds.PostgresEngineVersion.VER_15,
  }),
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  scaling: {
    minCapacity: rds.AuroraServerlessV2Capacity.ACU_0_5,
    maxCapacity: rds.AuroraServerlessV2Capacity.ACU_1,
  },
});
```

**Optimization tactics:**
- Enable query logging and optimize slow queries
- Add indexes to frequently queried columns
- Archive old data to S3 (e.g., transactions >2 years old)
- Reduce backup retention from 7 to 3 days if acceptable
- Monitor ACU usage via CloudWatch to ensure cost efficiency

---

### 2. Lambda Optimizations

**Current state: Already highly optimized**
- Memory size: 256MB (webhooks), 512MB (reconciler) - appropriate
- Timeout: 30s (webhooks), 300s (processors) - appropriate
- No provisioned concurrency (pay-as-you-go)

**Future optimizations:**
- Increase memory for compute-intensive tasks (cost:memory ratio is linear)
- Consider Lambda URL instead of API Gateway for simple webhooks (saves $3-5/month)
- Implement dead letter queues more effectively to reduce retries

---

### 3. API Gateway Optimizations

**Implemented:**
- Rate limiting (50 req/sec burst, 100 steady)
- Usage plan with daily quota (10K requests)
- Logging and monitoring enabled

**Additional savings:**
- Use API Gateway cache responses ($0.025/GB-hour + $0.005/M requests)
- Consider HTTP API instead of REST API (67% cheaper, but fewer features)
- Mock integration for health checks (no Lambda invocation)

---

### 4. S3 Static Website (Frontend Hosting)

**Current state: Optimized for cost**
- Direct S3 static website hosting (no CloudFront)
- HTTP only (saves SSL certificate costs)
- Suitable for internal staff tool usage
- Cost: ~$1-2/month for typical usage

**If CloudFront is needed in future:**
- PRICE_CLASS_100 (US/Europe only): Saves ~30% vs global
- CACHING_OPTIMIZED policy
- Compression enabled
- Consider CloudFront Functions for simple edge logic (cheaper than Lambda@Edge)

---

### 5. VPC Endpoints vs NAT Gateway

**Current architecture: VPC Endpoints ($7/month)**

**Cost Comparison:**
| Component | NAT Gateway | VPC Endpoints | Savings |
|-----------|-------------|---------------|----------|
| Hourly cost | $0.045 × 1 = $0.045 | $0.01 × 3 = $0.03 | $0.015/hour |
| Monthly cost | ~$32 | ~$22 | ~$10 |
| Data processing | $0.045/GB | $0.01/GB | $0.035/GB |
| **Total (low usage)** | **~$16/month** | **~$7/month** | **~$9/month** |

**Performance Benefits:**
- VPC endpoints use AWS network backbone (lower latency)
- No bandwidth charges for data transfer within AWS region
- More reliable (no single point of failure)

**Limitations:**
- Only works for AWS services (Secrets Manager, S3, DynamoDB)
- External API calls (Shopify, Stripe, GoCardless) require NAT Gateway or internet
- **Current workaround**: Lambda functions run in public subnets for external API calls

**Recommendation**: Continue with VPC endpoints for AWS services. Add NAT Gateway only if external API volume increases significantly.

---

### 6. S3 Storage Optimization

**Lifecycle rules already implemented:**
- Raw payloads → Glacier after 90 days
- Expire after 365 days

**Additional savings:**
- Use S3 Intelligent-Tiering for automatic cost optimization
- Enable S3 Server-Side Encryption with SSE-S3 (no extra cost vs SSE-KMS)
- Compress files before storage

---

## AWS Budgets Alert Configuration

### Recommended Budget Thresholds

**Monthly Budget: $50/month**
- Provides buffer above current ~$25-40/month costs
- Triggers alerts at 80% ($40) and 100% ($50)
- **No immediate action needed**: Serverless architecture keeps costs naturally low

**Budget Setup via AWS Console:**

1. Navigate to Billing & Cost Management → Budgets
2. Create budget: `supporter360-monthly-budget`
3. Budget type: Cost budget
4. Period: Monthly
5. Amount: $50
6. Alert thresholds:
   - Alert 1: 80% ($40) - Email notification
   - Alert 2: 100% ($50) - Email + SNS notification
7. Linked SNS topic: `supporter360-security-alerts`

**CloudWatch Alarms:**

```typescript
// Add to CDK stack:
const monthlySpendAlarm = new cloudwatch.Alarm(this, 'MonthlySpendAlarm', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/Billing',
    metricName: 'EstimatedCharges',
    dimensionsMap: {
      Currency: 'USD',
    },
    statistic: 'Maximum',
    period: cdk.Duration.days(1),
  }),
  evaluationPeriods: 1,
  threshold: 50,  // Alert at $50
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
});

monthlySpendAlarm.addAlarmAction(new sns.Subscription(securityAlertTopic, new subscriptions.EmailSubscription('your-email@example.com')));
```

---

## Environment Cost Comparison

| Service | Old Architecture | New Architecture | Monthly Savings |
|---------|-----------------|------------------|-----------------|
| **Database** | t4g.medium: $50-70/mo | Serverless v2: $0.50-2/mo | **$48-68** |
| **Lambda** | $5-15/mo | $5-15/mo | $0 |
| **API Gateway** | $3-5/mo | $3-5/mo | $0 |
| **CDN/Web** | CloudFront: $5-10/mo | S3 Static: $1-2/mo | **$4-8** |
| **SQS/S3** | $2-5/mo | $2-5/mo | $0 |
| **VPC Network** | NAT Gateway: $16/mo | VPC Endpoints: $7/mo | **$9** |
| **TOTAL** | **$80-130/mo** | **$25-40/mo** | **$55-90 (70%)** |

### Key Architecture Changes

**Database Migration (Biggest Savings):**
- **From**: t4g.medium provisioned instance ($50-70/month fixed cost)
- **To**: Serverless v2 with 0.5-1 ACU scaling ($0.50-2/month)
- **Impact**: 70% cost reduction, automatic scaling, perfect for intermittent workloads

**Network Optimization:**
- **From**: NAT Gateway for all outbound traffic ($16/month)
- **To**: VPC endpoints for AWS services only ($7/month)
- **Impact**: $9/month savings, better performance via AWS backbone
- **Note**: External API calls (Shopify, Stripe) use Lambda in public subnets

**Frontend Hosting:**
- **From**: CloudFront CDN ($5-10/month)
- **To**: S3 static website hosting ($1-2/month)
- **Impact**: $4-8/month savings, suitable for internal staff tool

### Recommendations by Environment

**All Environments (Unified Architecture):**
- Use RDS Serverless v2: $25-40/month total
- Monitor ACU usage via CloudWatch dashboard
- Scale min/max capacity based on traffic patterns
- No need for separate instance sizes per environment

**If Traffic Increases Significantly:**
- Monitor ACU usage trends (CloudWatch metric: `ServerlessDatabaseCapacity`)
- If consistently >1 ACU, increase maxCapacity to 2 or 4
- If consistently >4 ACU, evaluate provisioned instance cost comparison
- Reserved instances not applicable to Serverless v2

---

## Immediate Action Items

### Completed (Serverless Architecture Migration)
1. ✅ **Migrate to RDS Serverless v2** - $48-68/month savings (DONE)
2. ✅ **Replace NAT Gateway with VPC endpoints** - $9/month savings (DONE)
3. ✅ **Switch to S3 static website** - $4-8/month savings (DONE)
4. ✅ **Restrict CORS origins** - Security best practice (DONE)
5. ✅ **Add API Gateway rate limiting** - Prevent cost spikes from abuse (DONE)

### Quick Wins (Implement Today)
1. ⬜ **Monitor Serverless v2 ACU usage** - CloudWatch dashboard for database capacity
2. ⬜ **Set up AWS Budgets** - Alert at $40 (80%) and $50 (100%)
3. ⬜ **Enable CloudWatch cost anomaly detection** - ML-based spending alerts
4. ⬜ **Review S3 lifecycle policies** - Ensure payloads transition to Glacier after 90 days

### Medium-Term (Next 1-2 Weeks)
1. ⬜ **Add CloudWatch dashboard for cost metrics** - Visualize ACU, Lambda, API Gateway costs
2. ⬜ **Implement S3 Intelligent-Tiering** - Automatic cost optimization for payload storage
3. ⬜ **Review and optimize database queries** - Reduce ACU usage per query
4. ⬜ **Document VPC endpoint strategy** - Future reference for adding more endpoints

### Long-Term (Next 1-3 Months)
1. ⬜ **Evaluate provisioned instance** - If ACU usage consistently >4 (cost comparison needed)
2. ⬜ **Consider CloudFront for frontend** - If public access needed (adds SSL/CDN benefits)
3. ⬜ **Implement infrastructure as code drift detection** - Prevent cost creep
4. ⬜ **Regular cost reviews** - Monthly check of ACU trends and optimization opportunities

---

## Cost Monitoring Commands

### AWS CLI Quick Queries

```bash
# Current month's costs by service
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -d "$(date +%Y-%m-01)" +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "BlendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE

# Forecast next 3 months
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-%d),End=$(date -u -d "+3 months" +%Y-%m-%d) \
  --granularity MONTHLY \
  --metric "BlendedCost" \
  --prediction

# Top cost contributors
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -d "$(date +%Y-%m-01)" +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
  --granularity DAILY \
  --metrics "BlendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE | jq '.ResultsByTime[].Groups | sort_by(.Keys.Metrics.BlendedCost.Amount) | reverse | .[0:5]'
```

---

## Summary

**Current state: Highly optimized serverless architecture**
- Monthly costs: $25-40 (estimated)
- **70% cost reduction** from previous architecture ($80-130/month)
- Serverless-first design eliminates fixed infrastructure costs
- Automatic scaling matches capacity to actual demand

**Biggest cost drivers (in order):**
1. Lambda functions: $5-15/month (compute scales with usage)
2. VPC endpoints: $7/month (fixed cost for 3 endpoints)
3. API Gateway: $3-5/month (scales with API requests)
4. S3 storage: $1-3/month (scales with data volume)
5. Database (Serverless v2): $0.50-2/month (scales with ACU usage)
6. Frontend (S3 static): $1-2/month (minimal for internal tool)

**Cost optimization achievements:**
- RDS Serverless v2: $48-68/month savings
- VPC endpoints vs NAT Gateway: $9/month savings
- S3 static vs CloudFront: $4-8/month savings

**Target budget:**
- Keep monthly costs under $50 with alerts at $40
- Monitor ACU usage weekly and optimize queries
- Serverless architecture naturally prevents cost overruns (pay-per-use)

**Future considerations:**
- If traffic increases 10x, evaluate provisioned RDS instance
- If public frontend needed, add CloudFront (+$5-10/month)
- If multi-region deployment needed, reassess architecture costs
