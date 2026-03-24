# Serverless Migration Plan: VPC Endpoints Strategy

**Project:** Supporter 360
**Date:** 2025-03-24
**Epic:** Cost Optimization - Serverless Architecture Migration
**Current Monthly Cost:** $80-130/month
**Target Monthly Cost:** $25-40/month

## Executive Summary

This document outlines the migration strategy from the current VPC + NAT Gateway architecture to a cost-optimized serverless architecture using VPC endpoints and RDS Serverless v2. The migration will reduce monthly infrastructure costs by **60-70%** while maintaining security and reliability.

### Key Changes
- **Remove:** NAT Gateway ($16/month), CloudFront ($5-10/month)
- **Add:** VPC Interface Endpoints (~$7/month total)
- **Migrate:** RDS t4g.medium → RDS Serverless v2
- **Result:** $25-40/month total cost

---

## Current Architecture

### Network Topology
```
Internet
    │
    ├─→ API Gateway (Public)
    │       │
    │       ├─→ Webhook Handlers (NO VPC - Public)
    │       │     - shopify-webhook
    │       │     - stripe-webhook
    │       │     - gocardless-webhook
    │       │     - mailchimp-webhook
    │       │
    │       └─→ API Handlers (VPC - Private with Egress)
    │             - search
    │             - profile
    │             - timeline
    │             - admin/merge
    │
    └─→ VPC (2 AZs)
            │
            ├─→ Public Subnets
            │     └─→ NAT Gateway ($16/month)
            │
            └─→ Private Subnets (with Egress)
                  │
                  ├─→ RDS PostgreSQL (t4g.medium: $50-70/month)
                  ├─→ SQS Queues (5x system queues + DLQs)
                  ├─→ Processors (VPC-enabled Lambda)
                  │     - shopify-processor
                  │     - stripe-processor
                  │     - gocardless-processor
                  │     - futureticketing-processor
                  │     - mailchimp-processor
                  │
                  ├─→ Scheduled Functions (VPC-enabled Lambda)
                  │     - future-ticketing-poller (calls FT API)
                  │     - mailchimp-syncer (calls Mailchimp API)
                  │     - supporter-type-classifier
                  │     - reconciler
                  │
                  └─→ S3 Access (via NAT Gateway)
```

### Current Costs
| Component | Monthly Cost | Notes |
|-----------|-------------|-------|
| NAT Gateway | $16 | 1 NAT Gateway + data processing |
| CloudFront | $5-10 | Frontend hosting (PRICE_CLASS_100) |
| RDS t4g.medium | $50-70 | 24/7 provisioned capacity |
| Lambda/SQS/API | $20-30 | Based on actual usage |
| **Total** | **$80-130** | |

---

## Target Architecture

### Network Topology
```
Internet
    │
    ├─→ API Gateway (Public)
    │       │
    │       ├─→ Webhook Handlers (NO VPC - Public)
    │       │     - shopify-webhook
    │       │     - stripe-webhook
    │       │     - gocardless-webhook
    │       │     - mailchimp-webhook
    │       │
    │       └─→ API Handlers (VPC - Private with Egress)
    │             - search
    │             - profile
    │             - timeline
    │             - admin/merge
    │
    └─→ VPC (2 AZs)
            │
            ├─→ VPC Interface Endpoints
            │     ├─→ com.amazonaws.eu-west-1.secretsmanager
            │     ├─→ com.amazonaws.eu-west-1.sqs
            │     └─→ com.amazonaws.eu-west-1.sqs (for DLQs)
            │
            ├─→ VPC Gateway Endpoint
            │     └─→ com.amazonaws.eu-west-1.s3 (FREE)
            │
            └─→ Private Subnets (with Egress)
                  │
                  ├─→ RDS PostgreSQL Serverless v2
                  │     - Min: 0.5 ACU (~$15/month)
                  │     - Max: 2 ACU (~$60/month)
                  │     - Typical: 0.5-1 ACU
                  │
                  ├─→ SQS Queues (5x system queues + DLQs)
                  │
                  ├─→ Processors (VPC-enabled Lambda)
                  │     - shopify-processor (NO internet access)
                  │     - stripe-processor (NO internet access)
                  │     - gocardless-processor (NEEDS internet)
                  │     - futureticketing-processor (NO internet access)
                  │     - mailchimp-processor (NO internet access)
                  │
                  ├─→ Scheduled Functions (VPC-enabled Lambda)
                  │     - future-ticketing-poller (NEEDS internet)
                  │     - mailchimp-syncer (NEEDS internet)
                  │     - supporter-type-classifier (NO internet)
                  │     - reconciler (NO internet)
                  │
                  └─→ S3 Access (via Gateway Endpoint - FREE)
```

### Target Costs
| Component | Monthly Cost | Notes |
|-----------|-------------|-------|
| VPC Interface Endpoints | ~$7 | Secrets Manager + SQS (3 endpoints × ~$0.01/hour) |
| VPC Gateway Endpoint | $0 | S3 endpoint is free |
| RDS Serverless v2 | $15-30 | 0.5-1 ACU typical usage |
| Lambda/SQS/API | $20-30 | Based on actual usage |
| **Total** | **$25-40** | **60-70% reduction** |

---

## Lambda Function Categorization

### Category 1: Public Webhook Receivers (NO VPC Required)

These functions receive webhooks from external systems and queue messages. They run in public subnets and do NOT need VPC endpoints or internet access.

| Function | Purpose | Network |
|----------|---------|---------|
| `shopify-webhook` | Receives Shopify webhooks via EventBridge | Public (NO VPC) |
| `stripe-webhook` | Receives Stripe webhooks | Public (NO VPC) |
| `gocardless-webhook` | Receives GoCardless webhooks | Public (NO VPC) |
| `mailchimp-webhook` | Receives Mailchimp webhooks | Public (NO VPC) |

**Network Requirements:**
- ✅ Access to SQS (can use VPC endpoint if configured)
- ✅ Access to S3 (can use VPC endpoint if configured)
- ✅ Access to Secrets Manager (can use VPC endpoint if configured)
- ❌ NO internet access needed

**Migration Action:** None - keep as-is, or add VPC endpoint for SQS/S3/Secrets Manager if desired for consistency.

---

### Category 2: Internal Processors (AWS Services Only)

These processors read from S3 and write to PostgreSQL. They do NOT call external APIs and can work entirely within VPC using endpoints.

| Function | Purpose | External APIs? | Network |
|----------|---------|----------------|---------|
| `shopify-processor` | Processes Shopify orders/customers | No | VPC Private |
| `stripe-processor` | Processes Stripe payments | No | VPC Private |
| `futureticketing-processor` | Processes FT data from queue | No | VPC Private |
| `mailchimp-processor` | Processes Mailchimp click events | No | VPC Private |

**Network Requirements:**
- ✅ Access to S3 (Gateway Endpoint - FREE)
- ✅ Access to RDS PostgreSQL (VPC)
- ✅ Access to Secrets Manager (Interface Endpoint - $0.01/hour)
- ❌ NO internet access needed

**Migration Action:** None - will use VPC endpoints for S3 and Secrets Manager.

---

### Category 3: External API Callers (NEED Internet Access)

These functions call external APIs and **MUST retain internet access** via NAT Gateway or be moved to public subnets.

| Function | Purpose | External API | Network |
|----------|---------|--------------|---------|
| `gocardless-processor` | Fetches payment/customer/subscription details | `api.gocardless.com` | NEEDS Internet |
| `future-ticketing-poller` | Polls FT API for new data | `external.futureticketing.ie` | NEEDS Internet |
| `mailchimp-syncer` | Updates supporter tags in Mailchimp | `api.mailchimp.com` | NEEDS Internet |

**Network Requirements:**
- ✅ Access to external HTTPS APIs (Internet required)
- ✅ Access to SQS (Interface Endpoint - $0.01/hour)
- ✅ Access to RDS PostgreSQL (VPC)
- ✅ Access to Secrets Manager (Interface Endpoint - $0.01/hour)

**Migration Action:** Keep NAT Gateway OR move to public subnets (see recommendations below).

---

### Category 4: Internal API Handlers (AWS Services Only)

These handlers serve API requests and only access internal AWS services.

| Function | Purpose | External APIs? | Network |
|----------|---------|----------------|---------|
| `search` | Search supporters by email/name/phone | No | VPC Private |
| `profile` | Get full supporter profile | No | VPC Private |
| `timeline` | Get filtered timeline events | No | VPC Private |
| `admin/merge` | Merge two supporter records | No | VPC Private |

**Network Requirements:**
- ✅ Access to RDS PostgreSQL (VPC)
- ✅ Access to Secrets Manager (Interface Endpoint - $0.01/hour)
- ❌ NO internet access needed

**Migration Action:** None - will use VPC endpoint for Secrets Manager.

---

### Category 5: Scheduled Internal Functions (AWS Services Only)

These functions run on schedules and only access internal AWS services.

| Function | Purpose | External APIs? | Network |
|----------|---------|----------------|---------|
| `supporter-type-classifier` | Auto-derive supporter types | No | VPC Private |
| `reconciler` | Daily data reconciliation | No | VPC Private |

**Network Requirements:**
- ✅ Access to RDS PostgreSQL (VPC)
- ✅ Access to Secrets Manager (Interface Endpoint - $0.01/hour)
- ❌ NO internet access needed

**Migration Action:** None - will use VPC endpoint for Secrets Manager.

---

## VPC Endpoint Strategy

### Interface Endpoints (Paid: ~$0.01/hour per endpoint × ~730 hours = ~$7.30/month each)

| Endpoint | Purpose | Used By | Required |
|----------|---------|---------|----------|
| `com.amazonaws.eu-west-1.secretsmanager` | Database credentials, API keys | All VPC Lambda functions | ✅ Yes |
| `com.amazonaws.eu-west-1.sqs` | Queue access for processors | All processors | ✅ Yes |

**Total Cost:** 2 endpoints × $7.30/month = **~$14.60/month**

**Optimization:** Can share SQS endpoint across all queues (only need 1 SQS endpoint per VPC).

### Gateway Endpoints (FREE)

| Endpoint | Purpose | Used By | Required |
|----------|---------|---------|----------|
| `com.amazonaws.eu-west-1.s3` | S3 payload storage/retrieval | All functions | ✅ Yes |

**Total Cost:** **$0** (Gateway endpoints are free)

---

## Migration Strategy Options

### Option A: Hybrid Architecture (RECOMMENDED)

Keep NAT Gateway ONLY for functions that need internet access.

**Architecture:**
- Public subnets: Webhook handlers (no VPC)
- Private subnets with egress: All other functions
- NAT Gateway: Retained for 3 functions that call external APIs
- VPC endpoints: Secrets Manager + SQS + S3

**Cost:** ~$50-65/month (saves $15-30/month)
- NAT Gateway: $16
- VPC Interface Endpoints: $14.60
- RDS Serverless v2: $15-30
- Lambda/SQS/API: $20-30

**Pros:**
- Minimal changes to code
- Gradual migration path
- Can optimize internet-requiring functions later

**Cons:**
- Still paying $16/month for NAT Gateway
- 3 functions still need NAT Gateway

---

### Option B: Full Serverless Migration (MAXIMUM SAVINGS)

Move internet-requiring functions to public subnets, eliminate NAT Gateway entirely.

**Architecture:**
- Public subnets: Webhook handlers + internet-requiring scheduled functions
- Private subnets (isolated): All other functions
- NO NAT Gateway
- VPC endpoints: Secrets Manager + SQS + S3

**Cost:** ~$35-50/month (saves $30-45/month)
- VPC Interface Endpoints: $14.60
- RDS Serverless v2: $15-30
- Lambda/SQS/API: $20-30

**Migration Required:**
1. Move `gocardless-processor`, `future-ticketing-poller`, `mailchimp-syncer` to public subnets
2. Update security group rules to allow outbound internet
3. Remove NAT Gateway from VPC configuration

**Pros:**
- Maximum cost savings (eliminate $16/month NAT Gateway)
- Clearer network segmentation (public vs private)
- Future-proof for serverless best practices

**Cons:**
- More complex migration
- Public subnet functions need VPC endpoint access to RDS (requires routing)
- Security review needed for public subnet functions

---

### Option C: Optimized Hybrid (BEST LONG-TERM)

Same as Option A, but refactor external API calls to use API Gateway + VPC Link.

**Architecture:**
- Private subnets only (no NAT Gateway)
- API Gateway with VPC Link for external API calls
- VPC endpoints: Secrets Manager + SQS + S3

**Cost:** ~$35-50/month (same as Option B)
- API Gateway: minimal cost
- VPC Interface Endpoints: $14.60
- RDS Serverless v2: $15-30
- Lambda/SQS/API: $20-30

**Migration Required:**
1. Create API Gateway endpoints for external APIs (proxy pattern)
2. Refactor `gocardless-processor`, `future-ticketing-poller`, `mailchimp-syncer` to use internal API Gateway
3. Remove NAT Gateway from VPC configuration

**Pros:**
- Eliminates NAT Gateway entirely
- Centralizes external API calls (better observability, rate limiting)
- More secure (no direct internet access from Lambdas)

**Cons:**
- Significant code changes required
- Adds API Gateway latency
- More complex architecture

---

## Recommended Migration Path

### Phase 1: Quick Wins (1-2 days)
**Target:** Option A (Hybrid Architecture)
**Savings:** $15-30/month immediately

1. **Add VPC Gateway Endpoint for S3** (FREE)
   - Eliminate NAT Gateway data transfer costs for S3
   - Immediate cost reduction

2. **Add VPC Interface Endpoint for Secrets Manager** (~$7.30/month)
   - Secure credential access
   - Reduce NAT Gateway load

3. **Add VPC Interface Endpoint for SQS** (~$7.30/month)
   - Secure queue access
   - Reduce NAT Gateway load

4. **Migrate RDS to Serverless v2** (saves $20-40/month)
   - Change instance type to Serverless v2
   - Set min ACU = 0.5, max ACU = 2
   - Test during low-traffic period

**Result:** $50-65/month (25-40% reduction)

---

### Phase 2: Optimize Internet Access (3-5 days)
**Target:** Option B (Full Serverless)
**Savings:** Additional $15/month

1. **Move internet-requiring functions to public subnets**
   - `gocardless-processor`
   - `future-ticketing-poller`
   - `mailchimp-syncer`

2. **Update VPC configuration**
   - Remove NAT Gateway
   - Add public subnets to VPC (if not present)
   - Update security group rules

3. **Test external API connectivity**
   - Verify GoCardless API access
   - Verify Future Ticketing API access
   - Verify Mailchimp API access

**Result:** $35-50/month (60-70% reduction)

---

### Phase 3: Future Optimization (Optional)
**Target:** Option C (API Gateway Proxy)
**Savings:** Same as Phase 2, but better architecture

1. **Create API Gateway proxy endpoints**
   - `/api/external/gocardless/*`
   - `/api/external/futureticketing/*`
   - `/api/external/mailchimp/*`

2. **Refactor scheduled functions**
   - Use internal API Gateway instead of direct HTTPS
   - Add rate limiting and observability

3. **Remove public subnets** (optional)
   - All functions back to private subnets
   - Cleanest network architecture

**Result:** $35-50/month (same cost, better architecture)

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| VPC endpoint connectivity issues | Medium | High | Test in dev environment first, keep NAT Gateway as fallback |
| RDS Serverless v2 performance issues | Low | Medium | Start with higher ACU, monitor metrics, adjust as needed |
| External API timeouts from public subnets | Low | Medium | Add retry logic, increase timeouts, monitor CloudWatch |
| Security group misconfiguration | Medium | High | Use IaC validation, automated security checks, gradual rollout |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Downtime during migration | Low | High | Use blue-green deployment, test during low-traffic period |
| Cost overrun from ACU spikes | Low | Medium | Set max ACU limit, configure CloudWatch alarms |
| Increased latency for external APIs | Medium | Low | Monitor before/after metrics, optimize if needed |

### Mitigation Strategies

1. **Gradual Rollout**
   - Start with S3 gateway endpoint (no code changes)
   - Add Secrets Manager endpoint (test with 1 function first)
   - Migrate RDS during maintenance window

2. **Monitoring & Alerts**
   - CloudWatch dashboards for VPC endpoint metrics
   - Cost alerts for RDS ACU usage
   - Lambda error rate alerts

3. **Rollback Plan**
   - Keep NAT Gateway for 1 week after migration
   - Document rollback steps
   - Test rollback procedure in dev

---

## Migration Steps (Detailed)

### Step 1: Prerequisites (1 hour)
- [ ] Review current VPC configuration in `packages/infrastructure/lib/supporter360-stack.ts`
- [ ] Document current security group rules
- [ ] Identify all Lambda functions and their network requirements
- [ ] Create CloudWatch dashboard for monitoring

### Step 2: Add VPC Gateway Endpoint for S3 (30 minutes)
- [ ] Add gateway endpoint to CDK stack
  ```typescript
  new ec2.GatewayVpcEndpoint(this, 'S3Endpoint', {
    vpc,
    service: ec2.GatewayVpcEndpointAwsService.S3,
  });
  ```
- [ ] Deploy to dev environment
- [ ] Verify S3 access from Lambda functions
- [ ] Check CloudWatch logs for errors
- [ ] Deploy to production

### Step 3: Add VPC Interface Endpoint for Secrets Manager (1 hour)
- [ ] Add interface endpoint to CDK stack
  ```typescript
  new ec2.InterfaceVpcEndpoint(this, 'SecretsManagerEndpoint', {
    vpc,
    service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
  });
  ```
- [ ] Deploy to dev environment
- [ ] Verify Secrets Manager access from Lambda functions
- [ ] Test database connections
- [ ] Deploy to production

### Step 4: Add VPC Interface Endpoint for SQS (1 hour)
- [ ] Add interface endpoint to CDK stack
  ```typescript
  new ec2.InterfaceVpcEndpoint(this, 'SQSEndpoint', {
    vpc,
    service: ec2.InterfaceVpcEndpointAwsService.SQS,
  });
  ```
- [ ] Deploy to dev environment
- [ ] Verify SQS access from all processors
- [ ] Test webhook → queue → processor flow
- [ ] Deploy to production

### Step 5: Migrate RDS to Serverless v2 (2 hours)
- [ ] Update RDS configuration in CDK stack
  ```typescript
  new rds.DatabaseInstance(this, 'Supporter360Database', {
    engine: rds.DatabaseInstanceEngine.postgres({
      version: rds.PostgresEngineVersion.VER_15,
    }),
    instanceType: InstanceType.of(InstanceClass.BURSTABLE4, InstanceSize.MEDIUM),
    // Enable Serverless v2
    enableServerlessV2: true,
    scalingConfiguration: {
      minCapacity: 0.5,
      maxCapacity: 2,
    },
    // ... rest of config
  });
  ```
- [ ] Deploy to dev environment
- [ ] Run database migrations
- [ ] Test all database operations
- [ ] Monitor ACU usage for 24 hours
- [ ] Deploy to production during low-traffic period

### Step 6: Verify Cost Savings (1 day)
- [ ] Monitor CloudWatch metrics for 24 hours
- [ ] Check AWS Cost Explorer for cost breakdown
- [ ] Verify VPC endpoint usage metrics
- [ ] Confirm RDS ACU usage is within expected range
- [ ] Document actual vs. projected savings

### Step 7: (Optional) Remove NAT Gateway (2 hours)
- [ ] Move internet-requiring functions to public subnets
- [ ] Update security group rules
- [ ] Remove NAT Gateway from CDK stack
- [ ] Deploy to dev environment
- [ ] Test external API access from public subnets
- [ ] Deploy to production

### Step 8: (Optional) API Gateway Proxy Pattern (5 hours)
- [ ] Design API Gateway proxy endpoints
- [ ] Implement proxy Lambda functions
- [ ] Refactor scheduled functions to use proxy
- [ ] Test external API access through proxy
- [ ] Remove public subnets
- [ ] Deploy to production

---

## Testing Plan

### Unit Tests
- [ ] All existing Lambda tests pass
- [ ] Database connection tests pass with Serverless v2
- [ ] S3 access tests pass with gateway endpoint

### Integration Tests
- [ ] Webhook → Queue → Processor flow works
- [ ] API handlers can access database via endpoint
- [ ] Scheduled functions can access external APIs (if applicable)

### Performance Tests
- [ ] Lambda cold start times are acceptable
- [ ] Database query performance is acceptable
- [ ] External API latency is acceptable

### Cost Validation
- [ ] Monitor costs for 1 week post-migration
- [ ] Compare to pre-migration costs
- [ ] Document actual savings

---

## Rollback Plan

### If VPC Endpoint Issues Arise
1. Remove VPC endpoints from CDK stack
2. Restore NAT Gateway configuration
3. Redeploy stack
4. Verify all functions work

### If RDS Serverless v2 Issues Arise
1. Revert to t4g.medium instance
2. Restore snapshot from pre-migration
3. Update connection strings
4. Redeploy stack

### If NAT Gateway Removal Issues Arise
1. Move functions back to private subnets
2. Restore NAT Gateway in CDK stack
3. Update security group rules
4. Redeploy stack

---

## Post-Migration Monitoring

### CloudWatch Metrics to Monitor
- VPC endpoint connection errors
- RDS ACU usage and cost
- Lambda invocation counts and durations
- NAT Gateway data transfer (if retained)
- External API latency (if applicable)

### Cost Alerts
- RDS ACU usage > 1.5 for extended periods
- Total monthly cost > $50
- VPC endpoint data transfer costs

### Performance Alerts
- Lambda error rate > 1%
- Database connection failures
- External API timeout rate > 5%

---

## Success Criteria

### Cost Savings
- [ ] Monthly cost reduced to $25-40 (60-70% reduction)
- [ ] No unexpected cost spikes
- [ ] Cost savings sustained for 1 month

### Performance
- [ ] Lambda cold start times < 2 seconds
- [ ] Database query performance within 10% of baseline
- [ ] No increase in error rates

### Reliability
- [ ] All webhook processors working
- [ ] All API endpoints functional
- [ ] Scheduled functions executing on time

### Security
- [ ] No security group rule violations
- [ ] VPC endpoint policies configured correctly
- [ ] Secrets accessed only via endpoint

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Create dev environment** for testing
3. **Schedule migration window** (low-traffic period)
4. **Execute Phase 1** (Quick Wins)
5. **Monitor for 1 week**
6. **Execute Phase 2** (if approved)
7. **Document lessons learned**

---

## References

- [AWS VPC Endpoints Pricing](https://aws.amazon.com/vpc/pricing/)
- [RDS Serverless v2 Pricing](https://aws.amazon.com/rds/serverless/pricing/)
- [VPC Endpoint Documentation](https://docs.aws.amazon.com/vpc/latest/privatelink/)
- [Lambda Networking Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/networking.html)

---

**Document Version:** 1.0
**Last Updated:** 2025-03-24
**Author:** worker-vpc-docs (Swarm Agent)
**Epic:** supporter360-1745zp-mn4k2bqav9p
