# Supporter 360 Migration Testing Plan

**Epic:** supporter360-1745zp-mn4k2bqav9p
**Cell:** supporter360-1745zp-mn4k2btinc0
**Agent:** worker-test-plan
**Created:** 2025-03-24
**Target Migration:** RDS t4g.medium → RDS Serverless v2 + VPC Endpoints

## Overview

This document provides a comprehensive testing plan for migrating Supporter 360 from provisioned RDS (t4g.medium) to RDS Serverless v2 with VPC endpoints. The migration involves significant infrastructure changes that require thorough validation.

**Scope:** Low-traffic production (~6k supporters, ~1k monthly active)
**Focus:** Correctness over extreme load testing
**Risk Level:** HIGH - Database and networking changes

---

## 1. Pre-Migration Testing

### 1.1 Database Backup

**Objective:** Ensure complete data backup before any migration changes.

```bash
# Export all data from current RDS t4g.medium
pg_dump -h $DB_HOST \
        -U $DB_USER \
        -d supporter360 \
        -Fc \
        -f /backups/pre-migration-$(date +%Y%m%d).dump

# Verify backup integrity
pg_restore -l /backups/pre-migration-$(date +%Y%m%d).dump

# Check backup size
du -sh /backups/pre-migration-*.dump
```

**Expected Result:**
- Backup file created without errors
- File size matches expected database size (~100-500MB for 6k supporters)
- Restore list shows all tables: supporter, event, email_alias, membership, mailchimp_membership, audit_log, config

**Time Estimate:** 10 minutes
**Success Criteria:**
- [ ] Backup completes with exit code 0
- [ ] Backup file is readable and contains all expected tables
- [ ] Backup is copied to off-site location (S3 or external storage)

### 1.2 Snapshot Current Infrastructure State

**Objective:** Document current stack state for rollback comparison.

```bash
# List current CloudFormation stack outputs
aws cloudformation describe-stacks \
  --stack-name Supporter360Stack \
  --query 'Stacks[0].Outputs' \
  --output table > /backups/stack-outputs-$(date +%Y%m%d).txt

# Export current RDS instance details
aws rds describe-db-instances \
  --db-instance-identifier supporter360 \
  --query 'DBInstances[0]' \
  --output json > /backups/rds-instance-$(date +%Y%m%d).json

# Record current CloudWatch metrics baseline
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=supporter360 \
  --start-time $(date -u -d '7 days ago' --iso-8601) \
  --end-time $(date -u --iso-8601) \
  --period 86400 \
  --statistics Average,Maximum \
  --output json > /backups/metrics-baseline-$(date +%Y%m%d).json

# List all Lambda function versions
aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `Supporter360`)].{Name:FunctionName,Version:Version}' \
  --output table > /backups/lambda-versions-$(date +%Y%m%d).txt
```

**Expected Result:**
- All infrastructure state captured in text/JSON files
- CloudFormation outputs documented
- RDS instance type, endpoint, and parameters recorded
- Lambda function code versions and environment variables documented

**Time Estimate:** 5 minutes
**Success Criteria:**
- [ ] All commands complete successfully
- [ ] Output files are readable and contain expected data
- [ ] Files are committed to git repository (in a private/encrypted branch if needed)

### 1.3 Baseline Performance Tests

**Objective:** Establish current performance metrics for post-migration comparison.

```bash
# Run E2E tests and capture timing
cd /home/ubuntu/supporter-360
npm run test:e2e 2>&1 | tee /backups/e2e-baseline-$(date +%Y%m%d).log

# Test API response times (search endpoint)
for i in {1..10}; do
  time curl -s -H "X-API-Key: $API_KEY" \
    "$API_URL/search?q=test@example.com&field=email" \
    -o /dev/null -w "HTTP %{http_code} - Time: %{time_total}s\n"
done | tee /backups/api-timing-baseline-$(date +%Y%m%d).log

# Test Lambda cold starts (force new containers)
aws lambda update-function-code \
  --function-name Supporter360-SearchHandler \
  --zip-file fileb://packages/backend/dist/handlers/api/search.handler.js

for i in {1..5}; do
  time curl -s -H "X-API-Key: $API_KEY" \
    "$API_URL/search?q=coldstart@test.com&field=email" \
    -o /dev/null -w "Cold start $i: %{time_total}s\n"
  sleep 30
done | tee /backups/cold-start-baseline-$(date +%Y%m%d).log

# Test database connection latency
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d supporter360 \
  -c "SELECT COUNT(*) FROM supporter;" \
  --timing | tee /backups/db-query-baseline-$(date +%Y%m%d).log
```

**Expected Result:**
- E2E tests complete successfully
- API response times: < 500ms for search (p95)
- Lambda cold starts: < 3 seconds for API handlers
- Database queries: < 100ms for simple COUNT query

**Time Estimate:** 15 minutes
**Success Criteria:**
- [ ] All tests pass
- [ ] Response times are within acceptable bounds
- [ ] Baseline metrics documented for comparison

---

## 2. Database Migration Testing

### 2.1 RDS Serverless v2 Cold Start Test

**Objective:** Verify RDS Serverless v2 cold start performance meets requirements.

```bash
# Deploy new stack with Serverless v2 configuration
cd packages/infrastructure
npx cdk deploy Supporter360Stack --require-approval never

# Force database to scale to zero (wait 20 minutes of inactivity)
echo "Waiting for RDS to scale to zero (20 minutes)..."
sleep 1200

# Test cold start by executing a query
PGPASSWORD=$DB_PASSWORD psql -h $NEW_DB_HOST -U $DB_USER -d supporter360 \
  --echo-all \
  -c "SELECT NOW(), COUNT(*) FROM supporter;" \
  --timing

# Test 5 cold starts in succession
for i in {1..5}; do
  echo "Cold start test $i:"
  time PGPASSWORD=$DB_PASSWORD psql -h $NEW_DB_HOST -U $DB_USER -d supporter360 \
    -c "SELECT COUNT(*) FROM supporter;" > /dev/null
  echo "Waiting 20 minutes for scale-down..."
  sleep 1200
done
```

**Expected Result:**
- First query after scale-down: 1-3 seconds (acceptable)
- Subsequent queries: < 100ms
- No connection timeouts or errors
- Database scales up automatically on first query

**Time Estimate:** 105 minutes (mostly waiting for scale-down)
**Success Criteria:**
- [ ] Cold start time < 3 seconds for all 5 tests
- [ ] No connection failures or timeouts
- [ ] Database scales up and down automatically
- [ ] ACU (capacity units) metrics in CloudWatch show scaling behavior

### 2.2 Connection Pooling Test

**Objective:** Verify new connection pooling configuration works correctly.

```bash
# Test with pgbench to simulate concurrent connections
pgbench -h $NEW_DB_HOST -U $DB_USER -d supporter360 \
  -c 4 -t 100 -j 2 \
  --select-only \
  -f <(echo "SELECT * FROM supporter WHERE email = 'test@example.com' LIMIT 1;")

# Test Lambda connection pool behavior
# Deploy test Lambda that opens 10 connections simultaneously
cat > /tmp/test-pool.js << 'EOF'
const { Client } = require('pg');

exports.handler = async (event) => {
  const clients = [];
  const startTime = Date.now();

  // Open 10 connections
  for (let i = 0; i < 10; i++) {
    const client = new Client({
      host: process.env.DB_HOST,
      database: 'supporter360',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 2, // Pool size
      idleTimeoutMillis: 1000
    });
    await client.connect();
    clients.push(client);
  }

  // Execute queries on all connections
  const results = await Promise.all(
    clients.map(client => client.query('SELECT COUNT(*) FROM supporter'))
  );

  // Close all connections
  await Promise.all(clients.map(client => client.end()));

  return {
    duration: Date.now() - startTime,
    connections: clients.length,
    results: results.map(r => r.rows[0].count)
  };
};
EOF

# Deploy and invoke test Lambda
aws lambda update-function-code \
  --function-name Supporter360-PoolTest \
  --zip-file fileb:///tmp/test-pool.js

aws lambda invoke \
  --function-name Supporter360-PoolTest \
  --payload '{}' \
  /tmp/pool-test-result.json

cat /tmp/pool-test-result.json | jq
```

**Expected Result:**
- Connection pool handles 10 concurrent connections without errors
- Only 2 actual database connections opened (pool size)
- All queries return identical results
- No connection pool exhaustion errors

**Time Estimate:** 10 minutes
**Success Criteria:**
- [ ] Connection pool respects max: 2 setting
- [ ] No "connection exhausted" or "too many connections" errors
- [ ] All queries complete successfully
- [ ] CloudWatch RDS metrics show max 2 connections

### 2.3 Query Compatibility Verification

**Objective:** Ensure all existing queries work with new PostgreSQL engine version.

```bash
# Run all repository queries against new database
cd /home/ubuntu/supporter-360/packages/backend

# Test SupporterRepository queries
npm run test:repositories -- --testNamePattern="SupporterRepository"

# Test EventRepository queries
npm run test:repositories -- --testNamePattern="EventRepository"

# Run integration tests
npm run test:integration

# Verify specific query patterns from codebase
PGPASSWORD=$DB_PASSWORD psql -h $NEW_DB_HOST -U $DB_USER -d supporter360 << 'EOF'
-- Test JSONB queries (linked_ids)
SELECT supporter_id, linked_ids->>'shopify' as shopify_id
FROM supporter
WHERE linked_ids ? 'shopify'
LIMIT 5;

-- Test date range queries
SELECT COUNT(*)
FROM event
WHERE event_timestamp >= NOW() - INTERVAL '30 days';

-- Test full-text search
SELECT *
FROM supporter
WHERE to_tsvector('english', name || ' ' || COALESCE(primary_email, ''))
  @@ to_tsquery('english', 'Shamrock')
LIMIT 5;

-- Test complex joins
SELECT s.supporter_id, s.name, COUNT(e.event_id)
FROM supporter s
LEFT JOIN event e ON s.supporter_id = e.supporter_id
GROUP BY s.supporter_id, s.name
LIMIT 5;

-- Test transaction behavior
BEGIN;
UPDATE supporter SET name = 'TEST TRANSACTION' WHERE supporter_id = '00000000-0000-0000-0000-000000000000';
ROLLBACK;
SELECT name FROM supporter WHERE supporter_id = '00000000-0000-0000-0000-000000000000';
EOF
```

**Expected Result:**
- All repository tests pass
- All integration tests pass
- All query patterns return expected results
- Transaction rollback works correctly
- No query syntax errors or performance issues

**Time Estimate:** 15 minutes
**Success Criteria:**
- [ ] All tests pass (exit code 0)
- [ ] JSONB queries work correctly
- [ ] Full-text search works
- [ ] Transactions maintain ACID properties
- [ ] No query execution plan warnings

### 2.4 Concurrent Connection Stress Test

**Objective:** Verify database handles expected concurrent load.

```bash
# Run concurrent load test with 10 concurrent users
pgbench -h $NEW_DB_HOST -U $DB_USER -d supporter360 \
  -c 10 -j 2 -T 60 \
  --select-only \
  -f <(cat << 'EOF'
\setrandom email 1 1000
SELECT * FROM supporter WHERE supporter_id = (
  SELECT supporter_id FROM supporter ORDER BY RANDOM() LIMIT 1
);
SELECT * FROM event WHERE supporter_id = (
  SELECT supporter_id FROM supporter ORDER BY RANDOM() LIMIT 1
) ORDER BY event_timestamp DESC LIMIT 10;
EOF
)

# Monitor connection count during test
watch -n 1 'PGPASSWORD=$DB_PASSWORD psql -h $NEW_DB_HOST -U $DB_USER -d supporter360 -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = '\''supporter360'\'';"'

# Check for connection errors in logs
aws logs filter-log-events \
  --log-group-name /aws/rds/instance/supporter360/postgresql \
  --start-time $(date -d '5 minutes ago' +%s)000 \
  --filter-pattern "ERROR|connection" \
  --query 'events[*].message'
```

**Expected Result:**
- pgbench completes without errors
- Average latency < 200ms
- No connection failures or timeouts
- Maximum connections <= 10 (per pool config)

**Time Estimate:** 5 minutes
**Success Criteria:**
- [ ] No errors in pgbench output
- [ ] Connection count never exceeds pool limit
- [ ] No connection-related errors in CloudWatch logs
- [ ] 95th percentile latency < 500ms

---

## 3. VPC Endpoint Connectivity Testing

### 3.1 Lambda → Secrets Manager via VPC Endpoint

**Objective:** Verify Lambda can retrieve secrets without NAT Gateway.

```bash
# Deploy test Lambda that accesses Secrets Manager
cat > /tmp/test-secrets.js << 'EOF'
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

exports.handler = async (event) => {
  const startTime = Date.now();

  try {
    const secret = await secretsManager.getSecretValue({
      SecretId: 'supporter360/db-credentials'
    }).promise();

    const secretValue = JSON.parse(secret.SecretString);

    return {
      statusCode: 200,
      duration: Date.now() - startTime,
      hasUsername: !!secretValue.username,
      hasPassword: !!secretValue.password,
      hasHost: !!secretValue.host
    };
  } catch (error) {
    return {
      statusCode: 500,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
};
EOF

# Deploy test Lambda in private subnet
aws lambda update-function-code \
  --function-name Supporter360-SecretsTest \
  --zip-file fileb:///tmp/test-secrets.js

# Invoke test Lambda
aws lambda invoke \
  --function-name Supporter360-SecretsTest \
  --payload '{}' \
  /tmp/secrets-test-result.json

cat /tmp/secrets-test-result.json | jq

# Verify no NAT Gateway usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/NATGateway \
  --metric-name BytesOutToDestination \
  --dimensions Name=NatGatewayId,Value=$(aws ec2 describe-nat-gateways --query 'NatGateways[0].NatGatewayId' --output text) \
  --start-time $(date -d '5 minutes ago' --iso-8601) \
  --end-time $(date -u --iso-8601) \
  --period 300 \
  --statistics Sum \
  --output json | jq '.Datapoints[-1].Sum'
```

**Expected Result:**
- Lambda successfully retrieves secret
- Response time < 1 second
- Secret contains all required fields (username, password, host)
- NAT Gateway BytesOutToDestination = 0 (no traffic)

**Time Estimate:** 5 minutes
**Success Criteria:**
- [ ] Lambda returns statusCode 200
- [ ] Secret retrieval succeeds
- [ ] NAT Gateway shows zero traffic
- [ ] VPC endpoint logs show successful connections

### 3.2 Lambda → SQS via VPC Endpoint

**Objective:** Verify Lambda can enqueue messages without NAT Gateway.

```bash
# Deploy test Lambda that sends to SQS
cat > /tmp/test-sqs.js << 'EOF'
const AWS = require('aws-sdk');
const sqs = new AWS.SQS();

exports.handler = async (event) => {
  const startTime = Date.now();

  try {
    const result = await sqs.sendMessage({
      QueueUrl: process.env.SHOPIFY_QUEUE_URL,
      MessageBody: JSON.stringify({
        test: 'vpc-endpoint-test',
        timestamp: new Date().toISOString()
      })
    }).promise();

    return {
      statusCode: 200,
      duration: Date.now() - startTime,
      messageId: result.MessageId
    };
  } catch (error) {
    return {
      statusCode: 500,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
};
EOF

# Deploy test Lambda
aws lambda update-function-code \
  --function-name Supporter360-SQSTest \
  --zip-file fileb:///tmp/test-sqs.js

# Invoke test Lambda
aws lambda invoke \
  --function-name Supporter360-SQSTest \
  --payload '{}' \
  /tmp/sqs-test-result.json

cat /tmp/sqs-test-result.json | jq

# Verify message was queued
aws sqs receive-message \
  --queue-url $SHOPIFY_QUEUE_URL \
  --max-number-of-messages 1 | jq

# Check NAT Gateway usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/NATGateway \
  --metric-name BytesOutToDestination \
  --dimensions Name=NatGatewayId,Value=$(aws ec2 describe-nat-gateways --query 'NatGateways[0].NatGatewayId' --output text) \
  --start-time $(date -d '5 minutes ago' --iso-8601) \
  --end-time $(date -u --iso-8601) \
  --period 300 \
  --statistics Sum | jq '.Datapoints[-1].Sum'
```

**Expected Result:**
- Lambda successfully sends message to SQS
- Message ID returned
- Message appears in queue
- NAT Gateway shows zero traffic

**Time Estimate:** 5 minutes
**Success Criteria:**
- [ ] Lambda returns statusCode 200
- [ ] Message appears in SQS queue
- [ ] NAT Gateway shows zero traffic
- [ ] Message can be processed by processor Lambda

### 3.3 Lambda → S3 via Gateway Endpoint

**Objective:** Verify Lambda can archive payloads to S3 without NAT Gateway.

```bash
# Deploy test Lambda that writes to S3
cat > /tmp/test-s3.js << 'EOF'
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {
  const startTime = Date.now();

  try {
    const result = await s3.putObject({
      Bucket: process.env.RAW_PAYLOADS_BUCKET,
      Key: `test/vpc-endpoint-test-${Date.now()}.json`,
      Body: JSON.stringify({ test: 'data', timestamp: new Date().toISOString() })
    }).promise();

    return {
      statusCode: 200,
      duration: Date.now() - startTime,
      location: result.Location
    };
  } catch (error) {
    return {
      statusCode: 500,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
};
EOF

# Deploy test Lambda
aws lambda update-function-code \
  --function-name Supporter360-S3Test \
  --zip-file fileb:///tmp/test-s3.js

# Invoke test Lambda
aws lambda invoke \
  --function-name Supporter360-S3Test \
  --payload '{}' \
  /tmp/s3-test-result.json

cat /tmp/s3-test-result.json | jq

# Verify object was created
aws s3 ls $RAW_PAYLOADS_BUCKET/test/ --recursive

# Check NAT Gateway usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/NATGateway \
  --metric-name BytesOutToDestination \
  --dimensions Name=NatGatewayId,Value=$(aws ec2 describe-nat-gateways --query 'NatGateways[0].NatGatewayId' --output text) \
  --start-time $(date -d '5 minutes ago' --iso-8601) \
  --end-time $(date -u --iso-8601) \
  --period 300 \
  --statistics Sum | jq '.Datapoints[-1].Sum'
```

**Expected Result:**
- Lambda successfully writes to S3
- Object appears in bucket
- NAT Gateway shows zero traffic
- Gateway endpoint logs show traffic

**Time Estimate:** 5 minutes
**Success Criteria:**
- [ ] Lambda returns statusCode 200
- [ ] Object appears in S3 bucket
- [ ] NAT Gateway shows zero traffic
- [ ] S3 gateway endpoint metrics show traffic

### 3.4 Verify No NAT Gateway Traffic

**Objective:** Confirm all Lambda traffic uses VPC endpoints, not NAT Gateway.

```bash
# Run full E2E test suite to generate traffic
cd /home/ubuntu/supporter-360
npm run test:e2e

# Check NAT Gateway metrics for entire test period
aws cloudwatch get-metric-statistics \
  --namespace AWS/NATGateway \
  --metric-name BytesOutToDestination \
  --dimensions Name=NatGatewayId,Value=$(aws ec2 describe-nat-gateways --query 'NatGateways[0].NatGatewayId' --output text) \
  --start-time $(date -d '15 minutes ago' --iso-8601) \
  --end-time $(date -u --iso-8601) \
  --period 900 \
  --statistics Sum,Maximum \
  --output json | jq '.Datapoints'

# Check VPC endpoint metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/VPCE \
  --metric-name BytesOut \
  --dimensions Name=ServiceName,Value=com.amazonaws.$(aws configure get region).secretsmanager \
  --start-time $(date -d '15 minutes ago' --iso-8601) \
  --end-time $(date -u --iso-8601) \
  --period 900 \
  --statistics Sum \
  --output json | jq '.Datapoints'

# List all VPC endpoints
aws ec2 describe-vpc-endpoints \
  --filters Name=vpc-id,Values=$(aws ec2 describe-vpcs --query 'Vpcs[?contains(Tags[?Key==`Name`].Value, `Supporter360`)].VpcId' --output text) \
  --output table
```

**Expected Result:**
- NAT Gateway BytesOutToDestination = 0 or minimal (only legitimate outbound traffic)
- VPC endpoint metrics show traffic
- All 3 VPC endpoints listed (Secrets Manager, SQS, S3)
- No Lambda connection errors in logs

**Time Estimate:** 10 minutes
**Success Criteria:**
- [ ] NAT Gateway shows < 1MB of traffic (only AWS SDK calls for other services)
- [ ] VPC endpoint metrics show expected traffic patterns
- [ ] All Lambda functions execute without errors
- [ ] Cost savings: NAT Gateway processing costs should be near zero

---

## 4. Webhook Ingestion Testing

### 4.1 Test All Webhook Endpoints

**Objective:** Verify each webhook handler receives and queues external requests.

```bash
# Test Stripe webhook
curl -X POST $API_URL/webhooks/stripe \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "evt_test_'$(date +%s)'",
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test",
        "amount": 1000,
        "currency": "eur",
        "customer": "cus_test"
      }
    }
  }' \
  -w '\nHTTP Status: %{http_code}\n'

# Test Shopify webhook
curl -X POST $API_URL/webhooks/shopify \
  -H 'Content-Type: application/json' \
  -H 'X-Shopify-Hmac-Sha256: test' \
  -d '{
    "id": 123456789,
    "topic": "orders/create",
    "data": {
      "id": 123456789,
      "email": "test@example.com"
    }
  }' \
  -w '\nHTTP Status: %{http_code}\n'

# Test GoCardless webhook
curl -X POST $API_URL/webhooks/gocardless \
  -H 'Content-Type: application/json' \
  -H 'Webhook-Signature: test' \
  -d '{
    "events": [{
      "id": "EV_TEST_'$(date +%s)'",
      "resource_type": "payments",
      "action": "created",
      "links": {
        "payment": "PM_TEST"
      }
    }]
  }' \
  -w '\nHTTP Status: %{http_code}\n'

# Test Mailchimp webhook
curl -X POST $API_URL/webhooks/mailchimp \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "subscribe",
    "data": {
      "email": "test@example.com",
      "list_id": "test_list"
    }
  }' \
  -w '\nHTTP Status: %{http_code}\n'
```

**Expected Result:**
- All webhooks return HTTP 200
- Webhooks queue messages to SQS
- Raw payloads archived to S3
- CloudWatch Logs show successful queuing

**Time Estimate:** 5 minutes
**Success Criteria:**
- [ ] All webhook endpoints return HTTP 200
- [ ] SQS queues receive messages (check with aws sqs receive-message)
- [ ] S3 bucket receives raw payloads (check with aws s3 ls)
- [ ] No errors in Lambda CloudWatch logs

### 4.2 Verify Webhook Lambda Subnets

**Objective:** Confirm webhook handlers in public subnets receive external requests.

```bash
# Get Lambda function configuration
aws lambda get-function-configuration \
  --function-name Supporter360-StripeWebhookHandler \
  --query 'VpcConfig.{SubnetIds:SubnetIds,SecurityGroupIds:SecurityGroupIds}' \
  --output json | jq

# Verify subnets are public (have IGW route)
for subnet_id in $(aws lambda get-function-configuration --function-name Supporter360-StripeWebhookHandler --query 'VpcConfig.SubnetIds[]' --output text); do
  echo "Subnet: $subnet_id"
  aws ec2 describe-route-tables \
    --filters Name=association.subnet-id,Values=$subnet_id \
    --query 'RouteTables[0].Routes[?GatewayId].{GatewayId:GatewayId,State:State}' \
    --output table
done

# Test webhook from external source (use curl from your local machine)
curl -X POST https://$API_ID.execute-api.$(aws configure get region).amazonaws.com/prod/webhooks/stripe \
  -H 'Content-Type: application/json' \
  -d '{"id": "evt_external_test", "type": "test"}' \
  -w '\nHTTP Status: %{http_code}\n'
```

**Expected Result:**
- Webhook Lambda subnets are public
- Route tables show IGW route (0.0.0.0/0 → igw-*)
- External requests succeed
- No timeout or connection errors

**Time Estimate:** 5 minutes
**Success Criteria:**
- [ ] Webhook Lambda is in public subnets
- [ ] Route table has IGW route
- [ ] External webhook requests succeed
- [ ] Lambda execution role allows API Gateway invocation

### 4.3 Verify Processor Lambda Subnets

**Objective:** Confirm processor Lambdas in private subnets can access database.

```bash
# Get processor Lambda configuration
aws lambda get-function-configuration \
  --function-name Supporter360-StripeProcessor \
  --query 'VpcConfig.{SubnetIds:SubnetIds,SecurityGroupIds:SecurityGroupIds}' \
  --output json | jq

# Verify subnets are private (no IGW route, have NAT route)
for subnet_id in $(aws lambda get-function-configuration --function-name Supporter360-StripeProcessor --query 'VpcConfig.SubnetIds[]' --output text); do
  echo "Subnet: $subnet_id"
  aws ec2 describe-route-tables \
    --filters Name=association.subnet-id,Values=$subnet_id \
    --query 'RouteTables[0].Routes' \
    --output table
done

# Manually trigger processor to test database connectivity
aws lambda invoke \
  --function-name Supporter360-StripeProcessor \
  --payload '{ "Records": [{ "body": "{\"id\": \"evt_test\", \"type\": \"test\"}" }] }' \
  /tmp/processor-test.json

cat /tmp/processor-test.json | jq

# Check CloudWatch logs for database connection
aws logs tail /aws/lambda/Supporter360-StripeProcessor \
  --since 5m \
  --filter-pattern "database|connection|RDS"
```

**Expected Result:**
- Processor Lambda subnets are private
- Route tables show NAT route (but no traffic through it)
- Processor successfully connects to database
- No connection errors in logs

**Time Estimate:** 10 minutes
**Success Criteria:**
- [ ] Processor Lambda is in private subnets
- [ ] Route table has NAT route (for fallback)
- [ ] Processor connects to database successfully
- [ ] No "connection timeout" or "refused" errors in logs

---

## 5. API Functionality Testing

### 5.1 Test Search Endpoint

**Objective:** Verify search API works with new infrastructure.

```bash
# Test search by email
curl -s "$API_URL/search?q=test@example.com&field=email" \
  -H 'X-API-Key: $API_KEY' | jq '.data.results | length'

# Test search by name
curl -s "$API_URL/search?q=John&field=name" \
  -H 'X-API-Key: $API_KEY' | jq '.data.results | length'

# Test search with pagination
curl -s "$API_URL/search?q=test@example.com&field=email&limit=10&offset=0" \
  -H 'X-API-Key: $API_KEY' | jq

# Test search performance (run 10 times)
for i in {1..10}; do
  curl -s "$API_URL/search?q=test@example.com&field=email" \
    -H 'X-API-Key: $API_KEY' \
    -o /dev/null \
    -w "Search $i: %{time_total}s\n"
done
```

**Expected Result:**
- Search returns correct results
- Response time < 500ms for typical queries
- Pagination works correctly
- No 500 errors

**Time Estimate:** 5 minutes
**Success Criteria:**
- [ ] Search returns expected results
- [ ] Response time p95 < 500ms
- [ ] Pagination returns correct subsets
- [ ] No errors in API Gateway logs

### 5.2 Test Profile Endpoint

**Objective:** Verify supporter profile retrieval works correctly.

```bash
# Get a supporter ID from search first
SUPPORTER_ID=$(curl -s "$API_URL/search?q=test@example.com&field=email" \
  -H 'X-API-Key: $API_KEY' | jq -r '.data.results[0].supporter_id')

# Test profile endpoint
curl -s "$API_URL/supporters/$SUPPORTER_ID" \
  -H 'X-API-Key: $API_KEY' | jq

# Test profile with missing supporter (should return 404)
curl -s "$API_URL/supporters/00000000-0000-0000-0000-000000000000" \
  -H 'X-API-Key: $API_KEY' | jq

# Test profile performance
for i in {1..10}; do
  curl -s "$API_URL/supporters/$SUPPORTER_ID" \
    -H 'X-API-Key: $API_KEY' \
    -o /dev/null \
    -w "Profile $i: %{time_total}s\n"
done
```

**Expected Result:**
- Profile returns complete supporter data
- Linked IDs correctly populated
- Missing supporter returns 404
- Response time < 500ms

**Time Estimate:** 5 minutes
**Success Criteria:**
- [ ] Profile contains all expected fields
- [ ] linked_ids shows all integrations
- [ ] 404 for missing supporters
- [ ] Response time p95 < 500ms

### 5.3 Test Timeline Endpoint

**Objective:** Verify timeline event retrieval works correctly.

```bash
# Test timeline for supporter
curl -s "$API_URL/supporters/$SUPPORTER_ID/timeline" \
  -H 'X-API-Key: $API_KEY' | jq

# Test timeline with filters
curl -s "$API_URL/supporters/$SUPPORTER_ID/timeline?event_type=TicketPurchase&limit=10" \
  -H 'X-API-Key: $API_KEY' | jq

# Test timeline with date range
curl -s "$API_URL/supporters/$SUPPORTER_ID/timeline?start_date=2024-01-01&end_date=2024-12-31" \
  -H 'X-API-Key: $API_KEY' | jq

# Test timeline performance
for i in {1..10}; do
  curl -s "$API_URL/supporters/$SUPPORTER_ID/timeline" \
    -H 'X-API-Key: $API_KEY' \
    -o /dev/null \
    -w "Timeline $i: %{time_total}s\n"
done
```

**Expected Result:**
- Timeline returns events in chronological order
- Filters work correctly
- Date range filtering works
- Response time < 1 second for typical timelines

**Time Estimate:** 5 minutes
**Success Criteria:**
- [ ] Timeline events sorted by timestamp
- [ ] Filters return correct subsets
- [ ] Date range filtering works
- [ ] Response time p95 < 1000ms

### 5.4 Verify VPC Endpoint Path for Database Access

**Objective:** Confirm API Lambdas use VPC endpoints for database access.

```bash
# Enable Lambda logging for network calls
aws lambda update-function-configuration \
  --function-name Supporter360-SearchHandler \
  --logging-config '{
    "LogFormat": "JSON",
    "LogGroup": "/aws/lambda/Supporter360-SearchHandler",
    "ApplicationLogLevel": "DEBUG"
  }'

# Invoke search Lambda to generate traffic
curl -s "$API_URL/search?q=test@example.com&field=email" \
  -H 'X-API-Key: $API_KEY' > /dev/null

# Check CloudWatch logs for network calls
aws logs filter-log-events \
  --log-group-name /aws/lambda/Supporter360-SearchHandler \
  --start-time $(date -d '1 minute ago' +%s)000 \
  --filter-pattern "SecretsManager|RDS|endpoint" \
  --query 'events[*].message' \
  --output text

# Verify NAT Gateway shows no traffic
aws cloudwatch get-metric-statistics \
  --namespace AWS/NATGateway \
  --metric-name BytesOutToDestination \
  --dimensions Name=NatGatewayId,Value=$(aws ec2 describe-nat-gateways --query 'NatGateways[0].NatGatewayId' --output text) \
  --start-time $(date -d '5 minutes ago' --iso-8601) \
  --end-time $(date -u --iso-8601) \
  --period 300 \
  --statistics Sum | jq '.Datapoints[-1].Sum'
```

**Expected Result:**
- Lambda logs show VPC endpoint usage
- Database queries complete successfully
- NAT Gateway shows zero traffic
- No connection errors

**Time Estimate:** 10 minutes
**Success Criteria:**
- [ ] Logs show VPC endpoint calls
- [ ] No NAT Gateway traffic
- [ ] Database queries succeed
- [ ] Lambda cold start < 3 seconds

---

## 6. Frontend Serving Testing

### 6.1 Test S3 Static Website

**Objective:** Verify S3 serves frontend correctly.

```bash
# Test S3 bucket website configuration
aws s3api get-bucket-website \
  --bucket $FRONTEND_BUCKET | jq

# Test index.html is served
curl -I http://$FRONTEND_BUCKET.s3-website-$(aws configure get region).amazonaws.com/

# Test full page load
curl -s http://$FRONTEND_BUCKET.s3-website-$(aws configure get region).amazonaws.com/ | head -20

# Verify bucket policy allows public read
aws s3api get-bucket-policy \
  --bucket $FRONTEND_BUCKET | jq '.Policy'
```

**Expected Result:**
- Website configuration returns index document
- HTTP 200 response
- HTML content served
- Bucket policy allows public read

**Time Estimate:** 5 minutes
**Success Criteria:**
- [ ] HTTP 200 response
- [ ] index.html is served
- [ ] Bucket policy allows s3:GetObject
- [ ] No 403 Forbidden errors

### 6.2 Test SPA Routing

**Objective:** Verify SPA routes fallback to index.html.

```bash
# Test direct route (simulates refresh on /supporters/123)
curl -I http://$FRONTEND_BUCKET.s3-website-$(aws configure get region).amazonaws.com/supporters/test-id

# Test non-existent route (should return index.html with 200)
curl -I http://$FRONTEND_BUCKET.s3-website-$(aws configure get region).amazonaws.com/this-route-does-not-exist

# Test static assets are served correctly
curl -I http://$FRONTEND_BUCKET.s3-website-$(aws configure get region).amazonaws.com/assets/main.js

# Verify error document configuration
aws s3api get-bucket-website \
  --bucket $FRONTEND_BUCKET \
  --query 'ErrorDocument.Key' \
  --output text
```

**Expected Result:**
- All routes return index.html (HTTP 200 or 404 with index content)
- Static assets return correct content types
- Error document points to index.html
- No 404 for SPA routes

**Time Estimate:** 5 minutes
**Success Criteria:**
- [ ] SPA routes return index.html
- [ ] Static assets served correctly
- [ ] Error document configured
- [ ] Browser routing works (test manually if needed)

### 6.3 Verify No CloudFront Dependency

**Objective:** Confirm frontend works without CloudFront.

```bash
# List CloudFront distributions
aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Origins.Items[].Id, '$FRONTEND_BUCKET')].Id" \
  --output text

# Should return empty or no results

# Test DNS resolution (should point to S3, not CloudFront)
dig $FRONTEND_DOMAIN +short

# Test direct S3 URL works
curl -I http://$FRONTEND_BUCKET.s3-website-$(aws configure get region).amazonaws.com/

# Verify no CloudFront costs
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --start-time $(date -d '7 days ago' --iso-8601) \
  --end-time $(date -u --iso-8601) \
  --period 86400 \
  --statistics Sum \
  --output json | jq '.Datapoints | length'
```

**Expected Result:**
- No CloudFront distributions
- DNS resolves to S3 endpoint
- Direct S3 URL works
- No CloudFront metrics

**Time Estimate:** 5 minutes
**Success Criteria:**
- [ ] No CloudFront distributions found
- [ ] DNS points to S3 website endpoint
- [ ] Direct S3 URL serves content
- [ ] No CloudFront costs incurring

---

## 7. End-to-End Integration Testing

### 7.1 Run Full E2E Test Suite

**Objective:** Verify all functionality works end-to-end with Playwright.

```bash
# Set environment variables
export API_URL="https://$API_ID.execute-api.$(aws configure get region).amazonaws.com/prod"
export FRONTEND_URL="http://$FRONTEND_BUCKET.s3-website-$(aws configure get region).amazonaws.com"
export API_KEY="$TEST_API_KEY"
export TEST_EMAIL="test@example.com"

# Run E2E tests
cd /home/ubuntu/supporter-360
npx playwright test

# Run with video recording for debugging
npx playwright test --reporter=html --headed

# Run specific test file
npx playwright test tests/e2e/supporter-search.spec.ts
```

**Expected Result:**
- All E2E tests pass
- Search, profile, and timeline endpoints work
- Frontend loads correctly
- Integration data is present

**Time Estimate:** 10 minutes
**Success Criteria:**
- [ ] All tests pass (0 failures)
- [ ] Coverage: search, profile, timeline, frontend
- [ ] No timeout errors
- [ ] Screenshots/videos saved for review

### 7.2 Verify Future Ticketing Data Quality

**Objective:** Confirm FT integration still works after migration.

```bash
# Query database for FT data
PGPASSWORD=$DB_PASSWORD psql -h $NEW_DB_HOST -U $DB_USER -d supporter360 << 'EOF'
-- Check FT account imports
SELECT COUNT(*) as ft_accounts
FROM supporter
WHERE linked_ids ? 'futureticketing';

-- Check FT events
SELECT event_type, COUNT(*) as count
FROM event
WHERE source_system = 'futureticketing'
GROUP BY event_type;

-- Check for duplicate FT events
SELECT external_id, COUNT(*) as count
FROM event
WHERE source_system = 'futureticketing'
GROUP BY external_id
HAVING COUNT(*) > 1;

-- Check recent FT events
SELECT event_type, event_timestamp
FROM event
WHERE source_system = 'futureticketing'
ORDER BY event_timestamp DESC
LIMIT 10;
EOF

# Run data quality checks from codebase
cd /home/ubuntu/supporter-360
npm run test:data-quality
```

**Expected Result:**
- FT accounts present (> 1000 expected)
- FT events present (various types)
- No duplicate external_id events
- Recent events within last 30 days

**Time Estimate:** 5 minutes
**Success Criteria:**
- [ ] FT account count > 1000
- [ ] Multiple event types present
- [ ] No duplicate events (external_id unique)
- [ ] Recent events exist (last 30 days)

### 7.3 Verify All Integrations Working

**Objective:** Confirm all 5 integrations (Stripe, Shopify, GoCardless, Mailchimp, FT) work.

```bash
# Run integration health check script
cd /home/ubuntu/supporter-360
cat > /tmp/check-integrations.sh << 'EOF'
#!/bin/bash

API_URL=$1
API_KEY=$2

echo "=== Integration Health Check ==="
echo

# Test Stripe integration
echo "Testing Stripe..."
STRIPE_RESULT=$(curl -s "$API_URL/search?q=test@example.com&field=email" \
  -H "X-API-Key: $API_KEY" | \
  jq -r '.data.results[0].linked_ids.stripe // "null"')
if [ "$STRIPE_RESULT" != "null" ]; then
  echo "✅ Stripe: Data present"
else
  echo "⚠️ Stripe: No data"
fi

# Test Shopify integration
echo "Testing Shopify..."
SHOPIFY_RESULT=$(curl -s "$API_URL/search?q=test@example.com&field=email" \
  -H "X-API-Key: $API_KEY" | \
  jq -r '.data.results[0].linked_ids.shopify // "null"')
if [ "$SHOPIFY_RESULT" != "null" ]; then
  echo "✅ Shopify: Data present"
else
  echo "⚠️ Shopify: No data"
fi

# Test GoCardless integration
echo "Testing GoCardless..."
GOCARDLESS_RESULT=$(curl -s "$API_URL/search?q=test@example.com&field=email" \
  -H "X-API-Key: $API_KEY" | \
  jq -r '.data.results[0].linked_ids.gocardless // "null"')
if [ "$GOCARDLESS_RESULT" != "null" ]; then
  echo "✅ GoCardless: Data present"
else
  echo "⚠️ GoCardless: No data"
fi

# Test Mailchimp integration
echo "Testing Mailchimp..."
MAILCHIMP_RESULT=$(curl -s "$API_URL/search?q=test@example.com&field=email" \
  -H "X-API-Key: $API_KEY" | \
  jq -r '.data.results[0].linked_ids.mailchimp // "null"')
if [ "$MAILCHIMP_RESULT" != "null" ]; then
  echo "✅ Mailchimp: Data present"
else
  echo "⚠️ Mailchimp: No data"
fi

# Test Future Ticketing integration
echo "Testing Future Ticketing..."
FT_RESULT=$(curl -s "$API_URL/search?q=test@example.com&field=email" \
  -H "X-API-Key: $API_KEY" | \
  jq -r '.data.results[0].linked_ids.futureticketing // "null"')
if [ "$FT_RESULT" != "null" ]; then
  echo "✅ Future Ticketing: Data present"
else
  echo "⚠️ Future Ticketing: No data"
fi

echo
echo "=== Integration Check Complete ==="
EOF

chmod +x /tmp/check-integrations.sh
/tmp/check-integrations.sh $API_URL $API_KEY
```

**Expected Result:**
- All 5 integrations show data presence
- No integration shows errors
- API responses are fast (< 500ms)

**Time Estimate:** 5 minutes
**Success Criteria:**
- [ ] At least 4/5 integrations have data
- [ ] Future Ticketing is present (critical)
- [ ] API response times acceptable
- [ ] No 500 errors from API

---

## 8. Rollback Testing

### 8.1 Test Rollback Procedures

**Objective:** Verify rollback procedures work as documented in migration-rollback.md.

```bash
# Note: This section should reference docs/migration-rollback.md
# Ensure rollback procedures are tested BEFORE actual migration

# Test CDK stack rollback
cd packages/infrastructure

# Save current stack state
npx cdk synth > /backups/pre-rollback-synth.json

# Simulate rollback by deploying previous version
git checkout main~1  # Go to commit before migration
npx cdk deploy Supporter360Stack --require-approval never

# Verify old stack is running
curl -s "$API_URL/search?q=test@example.com&field=email" \
  -H "X-API-Key: $API_KEY" | jq

# Return to migration version
git checkout main
npx cdk deploy Supporter360Stack --require-approval never
```

**Expected Result:**
- CDK rollback succeeds
- Old infrastructure version deploys
- Database still accessible
- API works with old version

**Time Estimate:** 15 minutes
**Success Criteria:**
- [ ] CDK rollback completes successfully
- [ ] Old stack deploys without errors
- [ ] Database connection works
- [ ] API returns data correctly

### 8.2 Verify Can Revert to t4g.medium

**Objective:** Confirm database can be reverted to provisioned instance.

```bash
# Test database snapshot and restore
# (This is destructive - only run on test database)

# Create snapshot of current Serverless v2
aws rds create-db-snapshot \
  --db-instance-identifier supporter360 \
  --db-snapshot-identifier supporter360-pre-rollback-$(date +%Y%m%d)

# Wait for snapshot to complete
aws rds wait db-snapshot-available \
  --db-snapshot-identifier supporter360-pre-rollback-$(date +%Y%m%d)

# Modify instance to t4g.medium (rollback)
aws rds modify-db-instance \
  --db-instance-identifier supporter360 \
  --db-instance-class db.t4g.medium \
  --storage-type gp2 \
  --no-multi-az \
  --apply-immediately

# Wait for modification to complete
aws rds wait db-instance-available \
  --db-instance-identifier supporter360

# Test database connection
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d supporter360 \
  -c "SELECT COUNT(*) FROM supporter;"

# Verify query performance
time PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d supporter360 \
  -c "SELECT COUNT(*) FROM event;"
```

**Expected Result:**
- Snapshot creation succeeds
- Instance modification succeeds
- Database accessible as t4g.medium
- Query performance acceptable

**Time Estimate:** 30 minutes (RDS modification takes time)
**Success Criteria:**
- [ ] Snapshot created successfully
- [ ] Instance modified to t4g.medium
- [ ] Database connection works
- [ ] Queries execute without errors
- [ ] Performance acceptable (< 100ms for simple queries)

---

## Testing Timeline

**Total Estimated Time:** ~6 hours

| Phase | Duration | Prerequisites |
|-------|----------|---------------|
| 1. Pre-migration testing | 30 min | Current stack running |
| 2. Database migration testing | 135 min | New stack deployed |
| 3. VPC endpoint testing | 25 min | New stack deployed |
| 4. Webhook testing | 20 min | New stack deployed |
| 5. API functionality testing | 25 min | New stack deployed |
| 6. Frontend testing | 15 min | New stack deployed |
| 7. E2E integration testing | 20 min | New stack deployed |
| 8. Rollback testing | 45 min | Test environment |

---

## Success Criteria Summary

### Critical (Must Pass)
- [ ] All database migrations complete without data loss
- [ ] All E2E tests pass
- [ ] No NAT Gateway traffic (cost savings verified)
- [ ] All webhooks functional
- [ ] RDS Serverless v2 cold start < 3 seconds

### Important (Should Pass)
- [ ] API response times within baseline ±20%
- [ ] All integrations working
- [ ] Rollback procedures tested and documented

### Nice to Have
- [ ] Performance improvements observed
- [ ] CloudWatch alarms configured
- [ ] Cost reduction confirmed

---

## Test Execution Checklist

**Before Starting:**
- [ ] Read docs/migration-rollback.md
- [ ] Create database backup
- [ ] Notify team of maintenance window
- [ ] Set up CloudWatch dashboards for monitoring

**During Testing:**
- [ ] Document all test results
- [ ] Capture screenshots and logs
- [ ] Note any deviations from expected results
- [ ] Track time spent on each test

**After Testing:**
- [ ] Summarize results in NOTES.md
- [ ] Update deployment documentation
- [ ] Create runbook for common issues
- [ ] Share results with team

---

## Troubleshooting

### Common Issues

**Issue:** RDS Serverless v2 cold start > 3 seconds
- **Solution:** Check ACU range configuration, consider min ACU of 0.5

**Issue:** VPC endpoint connection timeouts
- **Solution:** Verify security group rules allow VPC endpoint traffic

**Issue:** Webhook returns 500 errors
- **Solution:** Check Lambda logs, verify SQS queue permissions

**Issue:** NAT Gateway still showing traffic
- **Solution:** Check for Lambda functions not configured for VPC endpoints

---

## References

- [RDS Serverless v2 Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-serverless.html)
- [VPC Endpoints Documentation](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html)
- [Migration Rollback Plan](./migration-rollback.md)
- [Infrastructure as Code](../packages/infrastructure/lib/supporter360-stack.ts)
- [E2E Tests](../tests/e2e/supporter-search.spec.ts)

---

**Last Updated:** 2025-03-24
**Status:** Ready for execution
**Next Step:** Begin Phase 1 (Pre-migration testing)
