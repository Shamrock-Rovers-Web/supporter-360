# Incident Response Runbook

**Purpose:** Operational procedures for diagnosing and responding to production incidents in Supporter 360.

**Last Updated:** 2026-03-24
**Severity Levels:**
- **P1 - Critical:** System down, data loss, security breach
- **P2 - High:** Major feature broken, significant degradation
- **P3 - Medium:** Partial degradation, workarounds available
- **P4 - Low:** Minor issues, no user impact

---

## Table of Contents

1. [Initial Response Checklist](#initial-response-checklist)
2. [Incident Scenarios](#incident-scenarios)
   - [Webhook Processing Failures](#webhook-processing-failures)
   - [Database Connectivity Issues](#database-connectivity-issues)
   - [API Gateway Errors](#api-gateway-errors)
   - [Lambda Function Failures](#lambda-function-failures)
   - [SQS Queue Backlog](#sqs-queue-backlog)
   - [External Integration Outages](#external-integration-outages)
   - [Security Incidents](#security-incidents)
3. [Communication Procedures](#communication-procedures)
4. [Post-Incident Procedures](#post-incident-procedures)

---

## Initial Response Checklist

**When an incident is detected:**

1. **Acknowledge the alert** (5 minutes)
   ```bash
   # Check CloudWatch alarm
   aws cloudwatch describe-alarms --alarm-names <alarm-name>
   ```

2. **Create incident ticket** (5 minutes)
   - Document start time
   - Assign severity level
   - Notify on-call team

3. **Gather initial context** (10 minutes)
   - Check CloudWatch dashboards
   - Review recent deployments
   - Check external provider status pages

4. **Assess impact** (5 minutes)
   - Are webhooks being received?
   - Is API responding?
   - Is data being processed?
   - Are users affected?

5. **Create incident channel** (Slack/Teams)
   - Name format: `inc-YYYYMMDD-<brief-description>`
   - Invite relevant team members
   - Pin important links

---

## Incident Scenarios

### Webhook Processing Failures

**Severity:** P2 (High)
**Detection:** DLQ messages increasing, webhook errors in logs

#### Diagnosis

```bash
# 1. Check webhook handler logs
aws logs tail /aws/lambda/Supporter360StackV2-ShopifyWebhookHandler --since 30m

# 2. Check processor logs
aws logs tail /aws/lambda/Supporter360StackV2-ShopifyProcessor --since 30m

# 3. Check DLQ depth
aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-1.amazonaws.com/<account>/supporter360-shopify-dlq \
  --attribute-names ApproximateNumberOfMessagesVisible

# 4. Read DLQ messages to see error details
aws sqs receive-message \
  --queue-url https://sqs.eu-west-1.amazonaws.com/<account>/supporter360-shopify-dlq \
  --max-number-of-messages 1
```

#### Common Causes

**A. Webhook Signature Verification Failing**
```bash
# Check current secret
aws secretsmanager get-secret-value \
  --secret-id supporter360/shopify \
  --query SecretString --output text | jq '.'

# Symptoms in logs:
WARN Shopify webhook missing signature
ERROR Invalid webhook signature

# Resolution:
# 1. Get actual webhook secret from Shopify Partners
# 2. Update Secrets Manager
aws secretsmanager update-secret \
  --secret-id supporter360/shopify \
  --secret-string '{"webhookSecret":"ACTUAL_SECRET","clientSecret":"..."}'

# 3. Test webhook endpoint
curl -X POST https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod/webhooks/shopify \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: customers/create" \
  -H "X-Shopify-Hmac-Sha256: <signature>" \
  -d '{"id": 12345, "email": "test@example.com"}'
```

**B. Processor Crashing (Uncaught Exception)**
```bash
# Check processor logs for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/Supporter360StackV2-ShopifyProcessor \
  --filter-pattern "ERROR" \
  --start-time $(date -d '30 minutes ago' +%s)000

# Common causes:
# - Database connection issues
# - Missing environment variables
# - Code bugs from recent deployment

# Resolution:
# 1. If recent deployment, rollback to previous version
# 2. Check environment variables
aws lambda get-function-configuration \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --query 'Environment.Variables'

# 3. Test processor manually
aws lambda invoke \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --payload '{"Records":[{"body":"{\"test\":\"data\"}"}]}' \
  response.json
```

**C. SQS Permission Issues**
```bash
# Check Lambda execution role
aws lambda get-function-configuration \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --query 'Role'

# Verify role has SQS permissions
aws iam get-role-policy \
  --role-name <role-name> \
  --policy-name <policy-name>
```

#### Resolution Steps

1. **Immediate:** Re-queue DLQ messages after fixing root cause
   ```bash
   # Move messages from DLQ back to main queue
   aws sqs receive-message \
     --queue-url <dlq-url> \
     --max-number-of-messages 10 \
     > messages.json

   # Extract message bodies and send to main queue
   aws sqs send-message-batch \
     --queue-url <main-queue-url> \
     --entries file://messages.json
   ```

2. **Verification:** Monitor processing
   ```bash
   # Watch queue depth decreasing
   watch -n 5 "aws sqs get-queue-attributes \
     --queue-url <main-queue-url> \
     --attribute-names ApproximateNumberOfMessages"

   # Check processor logs for successful processing
   aws logs tail /aws/lambda/Supporter360StackV2-ShopifyProcessor --follow
   ```

3. **Prevention:** Add CloudWatch alarm for DLQ
   ```bash
   aws cloudwatch put-metric-alarm \
     --alarm-name supporter360-shopify-dlq-alert \
     --alarm-description "Alert when Shopify DLQ has messages" \
     --metric-name ApproximateNumberOfMessagesVisible \
     --namespace AWS/SQS \
     --dimensions Name=QueueName,Value=supporter360-shopify-dlq \
     --statistic Average \
     --period 300 \
     --threshold 1 \
     --comparison-operator GreaterThanThreshold \
     --evaluation-periods 1
   ```

---

### Database Connectivity Issues

**Severity:** P1 (Critical)
**Detection:** Lambda errors, connection timeouts, "could not connect to server"

#### Diagnosis

```bash
# 1. Check database endpoint
aws rds describe-db-clusters \
  --db-cluster-identifier supporter360-supporter360-database \
  --query 'DBClusters[0].Endpoint'

# 2. Check database status
aws rds describe-db-clusters \
  --db-cluster-identifier supporter360-supporter360-database \
  --query 'DBClusters[0].Status'

# 3. Check security group rules
aws ec2 describe-security-groups \
  --group-ids <db-security-group-id> \
  --query 'SecurityGroups[0].IpPermissions'

# 4. Test connectivity from Lambda
# Add test Lambda function or check existing logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/Supporter360StackV2-ShopifyProcessor \
  --filter-pattern "connect ENETUNREACH|Connection timeout" \
  --start-time $(date -d '30 minutes ago' +%s)000
```

#### Common Causes

**A. Database in Wrong VPC/Subnet**
```bash
# Check Lambda subnet configuration
aws lambda get-function-configuration \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --query 'VpcConfig'

# Verify Lambda and database are in same VPC
# Resolution: Update CDK stack to place Lambda in correct subnets
```

**B. Security Group Blocking Access**
```bash
# Check database security group allows Lambda security group
aws ec2 describe-security-groups \
  --group-ids <db-security-group-id> \
  --query 'SecurityGroups[0].IpPermissions'

# Resolution: Add rule allowing Lambda SG to access port 5432
aws ec2 authorize-security-group-ingress \
  --group-id <db-security-group-id> \
  --protocol tcp \
  --port 5432 \
  --source-group <lambda-security-group-id>
```

**C. VPC Endpoints Missing**
```bash
# Check VPC endpoints exist
aws ec2 describe-vpc-endpoints \
  --filters Name=vpc-id,Values=<vpc-id> \
  --query 'VpcEndpoints[].ServiceName'

# Required endpoints:
# - com.amazonaws.eu-west-1.secretsmanager
# - com.amazonaws.eu-west-1.sqs
# - com.amazonaws.eu-west-1.s3

# Resolution: Create missing VPC endpoints via CDK
```

**D. Database Out of Capacity (Serverless v2)**
```bash
# Check ACU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name ServerlessDatabaseCapacity \
  --dimensions Name=DBClusterIdentifier,Value=supporter360-supporter360-database \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Average

# Resolution: Increase max ACU in CDK stack
```

#### Resolution Steps

1. **Immediate:** If database is down, failover to standby
   ```bash
   # Check if multi-AZ is enabled
   aws rds describe-db-clusters \
     --db-cluster-identifier supporter360-supporter360-database \
     --query 'DBClusters[0].MultiAZ'

   # If true, initiate failover
   aws rds failover-db-cluster \
     --db-cluster-identifier supporter360-supporter360-database
   ```

2. **Restore from snapshot** (if database corruption)
   ```bash
   # List available snapshots
   aws rds describe-db-snapshots \
     --db-cluster-identifier supporter360-supporter360-database \
     --query 'DBSnapshots[*].DBSnapshotIdentifier'

   # Restore from snapshot
   aws rds restore-db-cluster-from-snapshot \
     --db-cluster-identifier supporter360-supporter360-database-restored \
     --snapshot-identifier <snapshot-id> \
     --engine aurora-postgresql \
     --engine-version 14.15

   # Update Lambda environment variables to point to restored database
   # (Update DB_HOST in Secrets Manager)
   ```

3. **Verification:** Test connection
   ```bash
   # Get database credentials
   aws secretsmanager get-secret-value \
     --secret-id Supporter360StackV2-postgres \
     --query SecretString --output text | jq -r '.'

   # Test connection
   psql -h <DB_HOST> -U <DB_USER> -d supporter360 -c "SELECT 1;"
   ```

---

### API Gateway Errors

**Severity:** P2 (High)
**Detection:** 5XX errors, latency spikes, 4XX errors

#### Diagnosis

```bash
# 1. Check API Gateway metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name 5XXError \
  --dimensions Name=ApiName,Value=Supporter360StackV2 \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Sum

# 2. Check API Gateway logs
aws logs tail /aws/apigateway/Supporter360 --since 30m

# 3. Test API endpoint directly
curl -v https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod/search?q=test

# 4. Check Lambda integration
aws logs tail /aws/lambda/Supporter360StackV2-SearchHandler --since 30m
```

#### Common Causes

**A. Lambda Function Failing**
```bash
# Check Lambda error rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=Supporter360StackV2-SearchHandler \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Sum

# Check Lambda logs
aws logs tail /aws/lambda/Supporter360StackV2-SearchHandler --since 30m

# Resolution: Fix Lambda error (see Lambda Function Failures section)
```

**B. Lambda Timeout**
```bash
# Check Lambda duration
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=Supporter360StackV2-SearchHandler \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Maximum

# Resolution: Increase Lambda timeout
aws lambda update-function-configuration \
  --function-name Supporter360StackV2-SearchHandler \
  --timeout 30
```

**C. CORS Misconfiguration**
```bash
# Symptoms in browser console:
# "Access to XMLHttpRequest blocked by CORS policy"

# Check CORS configuration
aws apigateway get-rest-api \
  --rest-api-id <api-id>

# Resolution: Update CORS in CDK stack and redeploy
```

**D. API Key Invalid**
```bash
# Symptoms: 403 Forbidden
curl -H 'X-API-Key: invalid-key' \
  https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod/search?q=test

# Resolution: Use valid API key or create new one
aws apigateway create-api-key \
  --name Production-Staff-Key \
  --value <secure-random-key> \
  --enabled
```

#### Resolution Steps

1. **Immediate:** Enable API Gateway logs if not already
   ```bash
   # Check if logging is enabled
   aws apigateway get-stage \
     --rest-api-id <api-id> \
     --stage-name prod \
     --query 'tracingEnabled'

   # Enable execution logging
   aws apigateway update-stage \
     --rest-api-id <api-id> \
     --stage-name prod \
     --patch-operations op=replace,path=/tracingEnabled,value=true
   ```

2. **Throttling:** If under attack, enable throttling
   ```bash
   # Create usage plan with rate limits
   aws apigateway create-usage-plan \
     --name "Emergency-Throttle" \
     --throttle '{RateLimit=10,BurstLimit=20}'

   # Associate API with usage plan
   aws apigateway create-usage-plan-key \
     --usage-plan-id <usage-plan-id> \
     --key-id <api-key-id> \
     --key-type API_KEY
   ```

3. **Verification:** Test all endpoints
   ```bash
   # Test search endpoint
   curl -H 'X-API-Key: <valid-key>' \
     https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod/search?q=test

   # Test profile endpoint
   curl -H 'X-API-Key: <valid-key>' \
     https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod/supporters/<id>

   # Test timeline endpoint
   curl -H 'X-API-Key: <valid-key>' \
     https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod/supporters/<id>/timeline
   ```

---

### Lambda Function Failures

**Severity:** P2 (High)
**Detection:** Lambda errors, timeouts, out-of-memory

#### Diagnosis

```bash
# 1. Check Lambda error rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=<function-name> \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Sum

# 2. Check Lambda logs
aws logs tail /aws/lambda/<function-name> --since 30m

# 3. Check Lambda configuration
aws lambda get-function-configuration \
  --function-name <function-name>

# 4. Test Lambda function directly
aws lambda invoke \
  --function-name <function-name> \
  --payload '{}' \
  response.json
cat response.json
```

#### Common Causes

**A. Out of Memory**
```bash
# Symptoms in logs:
# "Process exited before completing request"

# Check memory usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=<function-name> \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Maximum

# Resolution: Increase memory allocation
aws lambda update-function-configuration \
  --function-name <function-name> \
  --memory-size 512
```

**B. Timeout**
```bash
# Symptoms in logs:
# "Task timed out after 30.00 seconds"

# Check Lambda duration
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=<function-name> \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Maximum,Average

# Resolution: Increase timeout
aws lambda update-function-configuration \
  --function-name <function-name> \
  --timeout 60
```

**C. Unhandled Exception**
```bash
# Symptoms in logs:
# "Error: Runtime exited without providing a reason"
# Stack trace in logs

# Resolution:
# 1. Check recent code changes
# 2. Rollback to previous version
aws lambda get-function \
  --function-name <function-name> \
  --query 'Code.Location'

# 3. Fix bug in code and redeploy
# 4. Add better error handling and logging
```

**D. Environment Variable Missing**
```bash
# Symptoms in logs:
# "Error: DATABASE_URL is not defined"

# Check environment variables
aws lambda get-function-configuration \
  --function-name <function-name> \
  --query 'Environment.Variables'

# Resolution: Add missing environment variable
aws lambda update-function-configuration \
  --function-name <function-name> \
  --environment Variables={DB_HOST=<value>,DB_PORT=5432}
```

#### Resolution Steps

1. **Immediate:** Rollback to previous version if recent deployment broke it
   ```bash
   # List versions
   aws lambda list-versions-by-function \
     --function-name <function-name>

   # Alias to previous version
   aws lambda update-alias \
     --function-name <function-name> \
     --function-qualifier 2 \
     --name prod
   ```

2. **Increase resources:** If memory/timeout insufficient
   ```bash
   aws lambda update-function-configuration \
     --function-name <function-name> \
     --memory-size 1024 \
     --timeout 120
   ```

3. **Add concurrency limit:** If throttling
   ```bash
   aws lambda put-function-concurrency \
     --function-name <function-name> \
     --reserved-concurrent-executions 10
   ```

4. **Verification:** Monitor Lambda metrics
   ```bash
   # Watch error rate decrease
   watch -n 5 "aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Errors \
     --dimensions Name=FunctionName,Value=<function-name> \
     --start-time $(date -d '5 minutes ago' +%s) \
     --end-time $(date +%s) \
     --period 60 \
     --statistics Sum"
   ```

---

### SQS Queue Backlog

**Severity:** P2 (High)
**Detection:** Queue depth increasing, message age increasing

#### Diagnosis

```bash
# 1. Check queue depth
aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-1.amazonaws.com/<account>/supporter360-shopify-queue \
  --attribute-names ApproximateNumberOfMessages,ApproximateNumberOfMessagesNotVisible

# 2. Check message age
aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-1.amazonaws.com/<account>/supporter360-shopify-queue \
  --attribute-names ApproximateAgeOfOldestMessage

# 3. Check DLQ depth
aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-1.amazonaws.com/<account>/supporter360-shopify-dlq \
  --attribute-names ApproximateNumberOfMessagesVisible

# 4. Check processor logs
aws logs tail /aws/lambda/Supporter360StackV2-ShopifyProcessor --since 30m
```

#### Common Causes

**A. Processor Slow**
```bash
# Check Lambda duration
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=Supporter360StackV2-ShopifyProcessor \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Average

# Check Lambda concurrency
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name ConcurrentExecutions \
  --dimensions Name=FunctionName,Value=Supporter360StackV2-ShopifyProcessor \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Maximum

# Resolution: Increase Lambda concurrency or optimize code
```

**B. High Incoming Message Rate**
```bash
# Check number of messages received
aws cloudwatch get-metric-statistics \
  --namespace AWS/SQS \
  --metric-name NumberOfMessagesReceived \
  --dimensions Name=QueueName,Value=supporter360-shopify-queue \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Sum

# Resolution: Scale out Lambda (increase concurrency)
```

**C. Processor Failing**
```bash
# Check processor logs for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/Supporter360StackV2-ShopifyProcessor \
  --filter-pattern "ERROR" \
  --start-time $(date -d '30 minutes ago' +%s)000

# Resolution: Fix processor error (see Lambda Function Failures section)
```

#### Resolution Steps

1. **Immediate:** Increase Lambda concurrency
   ```bash
   aws lambda put-function-concurrency \
     --function-name Supporter360StackV2-ShopifyProcessor \
     --reserved-concurrent-executions 50
   ```

2. **Add more processors** (horizontal scaling)
   ```bash
   # Deploy additional processor Lambda functions
   # Update SQS to trigger multiple processors
   ```

3. **Increase batch size**
   ```bash
   # Update event source mapping to process more messages per invocation
   aws lambda update-event-source-mapping \
     --function-name Supporter360StackV2-ShopifyProcessor \
     --batch-size 10
   ```

4. **Verification:** Monitor queue depth decreasing
   ```bash
   watch -n 5 "aws sqs get-queue-attributes \
     --queue-url <queue-url> \
     --attribute-names ApproximateNumberOfMessages"
   ```

---

### External Integration Outages

**Severity:** P3 (Medium)
**Detection:** External API errors, timeouts, provider status page

#### Diagnosis

```bash
# 1. Check external API status
curl -I https://www.shopify.com/status
curl -I https://status.stripe.com/
curl -I https://status.gocardless.com/
curl -I https://status.mailchimp.com/

# 2. Check processor logs for API errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/Supporter360StackV2-ShopifyProcessor \
  --filter-pattern "ECONNREFUSED|ETIMEDOUT|502|503" \
  --start-time $(date -d '30 minutes ago' +%s)000

# 3. Test external API directly
curl -I https://shamrock-rovers-fc.myshopify.com/admin/api/2024-01/shop.json \
  -H "X-Shopify-Access-Token: <token>"
```

#### Resolution Steps

1. **Immediate:** Acknowledge provider outage
   - Check provider status page for ETA
   - Monitor provider communication channels
   - Document impact to users

2. **Mitigation:** Queue requests for retry
   - Messages already in SQS will be retried
   - Webhooks failing will be queued in provider's system
   - No action needed - automatic retry

3. **Post-outage:**
   - Clear backlog (may take time)
   - Monitor for duplicate events (providers may replay)
   - Verify data consistency

4. **Prevention:**
   - Add provider status monitoring
   - Implement exponential backoff
   - Add circuit breaker pattern

---

### Security Incidents

**Severity:** P1 (Critical)
**Detection:** Unauthorized access, data breach, suspicious activity

#### Immediate Response (15 minutes)

1. **Isolate affected systems**
   ```bash
   # If API compromised, revoke API keys
   aws apigateway update-api-key \
     --api-key <compromised-key-id> \
     --patch-operations op=replace,path=/enabled,value=false

   # If database accessed, rotate credentials
   aws secretsmanager rotate-secret \
     --secret-id Supporter360StackV2-postgres
   ```

2. **Preserve evidence**
   ```bash
   # Enable CloudTrail if not already
   aws cloudtrail start-logging --name Supporter360-Trail

   # Export CloudWatch logs
   aws logs create-export-task \
     --log-group-name /aws/lambda/* \
     --from $(date -d '24 hours ago' +%s) \
     --to $(date +%s) \
     --destination <s3-bucket> \
     --destination-prefix security-incident-$(date +%Y%m%d)
   ```

3. **Notify stakeholders**
   - Security team
   - Management
   - Affected users (if data breach)

4. **Document incident**
   - Timeline of events
   - Systems affected
   - Data accessed
   - Actions taken

#### Post-Incident

1. **Forensic analysis**
   - Review CloudTrail logs
   - Analyze CloudWatch logs
   - Check for backdoors
   - Assess data exfiltration

2. **Remediation**
   - Close vulnerabilities
   - Patch security issues
   - Implement additional monitoring
   - Update runbooks

3. **Prevention**
   - Security audit
   - Penetration testing
   - Security training
   - Implement WAF

---

## Communication Procedures

### Internal Communication

1. **Incident Channel**
   - Create dedicated channel for incident
   - Provide regular updates (every 30 minutes during active incident)
   - Document decisions and actions

2. **Status Updates Template**
   ```
   🚨 INCIDENT UPDATE - [Time]

   Severity: P[1-4]
   Status: [Investigating|Identified|Monitoring|Resolved]

   Impact: [Description of impact]

   Current State:
   - [What's happening now]

   Next Steps:
   - [What we're doing next]

   ETA: [Estimated resolution time]
   ```

### External Communication

1. **User Notification** (if user-facing)
   - Acknowledge issue
   - Provide ETA if known
   - Share progress updates
   - Confirm resolution

2. **Stakeholder Notification**
   - Management
   - Security team (if security incident)
   - Legal team (if data breach)
   - External providers (if their issue)

---

## Post-Incident Procedures

### Post-Mortem (Within 1 Week)

1. **Timeline**
   - When did incident start?
   - When was it detected?
   - When was it resolved?
   - What was the total duration?

2. **Impact Assessment**
   - How many users affected?
   - How many transactions lost?
   - What was the financial impact?
   - Was data lost or corrupted?

3. **Root Cause Analysis**
   - What was the triggering event?
   - Why did it happen?
   - What were the contributing factors?
   - Was it a known issue?

4. **Response Evaluation**
   - What worked well?
   - What could be improved?
   - Was documentation adequate?
   - Were alerts effective?

5. **Action Items**
   - What needs to be fixed?
   - What needs to be monitored?
   - What documentation needs updating?
   - What training is needed?

### Improve Runbooks

1. **Update this runbook** with lessons learned
2. **Add new scenarios** if new type of incident
3. **Update procedures** if better approach found
4. **Add monitoring** for early detection

### Prevent Recurrence

1. **Code fixes**
   - Fix bugs that caused incident
   - Add error handling
   - Add validation
   - Add unit tests

2. **Infrastructure improvements**
   - Add redundancy
   - Increase capacity
   - Add monitoring
   - Add alerts

3. **Process improvements**
   - Update deployment procedures
   - Add testing steps
   - Add approval gates
   - Improve documentation

---

## Useful Commands

### Check Overall System Health

```bash
# Quick health check script
#!/bin/bash

echo "=== Supporter 360 Health Check ==="
echo "Time: $(date)"
echo ""

# Check Lambda errors
echo "Lambda Errors (last hour):"
for func in ShopifyWebhookHandler ShopifyProcessor StripeWebhookHandler StripeProcessor; do
  errors=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name Errors \
    --dimensions Name=FunctionName,Value=Supporter360StackV2-$func \
    --start-time $(date -d '1 hour ago' +%s) \
    --end-time $(date +%s) \
    --period 3600 \
    --statistics Sum \
    --query 'Datapoints[0].Sum' \
    --output text)
  echo "  $func: $errors errors"
done

# Check queue depth
echo ""
echo "Queue Depths:"
for queue in shopify stripe gocardless mailchimp; do
  depth=$(aws sqs get-queue-attributes \
    --queue-url https://sqs.eu-west-1.amazonaws.com/<account>/supporter360-${queue}-queue \
    --attribute-names ApproximateNumberOfMessages \
    --query 'Attributes.ApproximateNumberOfMessages' \
    --output text)
  echo "  $queue: $depth messages"
done

# Check API Gateway 5XX errors
echo ""
echo "API Gateway 5XX Errors (last hour):"
api_5xx=$(aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name 5XXError \
  --dimensions Name=ApiName,Value=Supporter360StackV2 \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 3600 \
  --statistics Sum \
  --query 'Datapoints[0].Sum' \
  --output text)
echo "  $api_5xx errors"

# Check RDS CPU
echo ""
echo "RDS CPU Utilization:"
rds_cpu=$(aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=supporter360-supporter360-database \
  --start-time $(date -d '5 minutes ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Average \
  --query 'Datapoints[0].Average' \
  --output text)
echo "  ${rds_cpu}%"

echo ""
echo "=== End Health Check ==="
```

---

## Contact Information

- **On-Call:** [On-call contact]
- **Engineering Team:** [Team email/slack]
- **Security Team:** [Security contact]
- **Management:** [Manager contact]

---

**Remember:** During an incident, communication is key. Keep stakeholders informed, document everything, and stay calm.
