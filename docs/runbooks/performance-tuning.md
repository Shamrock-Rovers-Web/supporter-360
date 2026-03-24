# Performance Tuning Runbook

**Purpose:** Procedures for optimizing performance of Supporter 360 components.

**Last Updated:** 2026-03-24

---

## Table of Contents

1. [Performance Baselines](#performance-baselines)
2. [Lambda Performance](#lambda-performance)
3. [Database Performance](#database-performance)
4. [API Gateway Performance](#api-gateway-performance)
5. [SQS Performance](#sqs-performance)
6. [Cost-Performance Optimization](#cost-performance-optimization)

---

## Performance Baselines

### Target Metrics

| Component | Metric | Target | Alert Threshold |
|-----------|--------|--------|-----------------|
| **Lambda** | Duration (p95) | < 5s | > 10s |
| **Lambda** | Error rate | < 1% | > 5% |
| **Lambda** | Throttles | 0 | > 0 |
| **API Gateway** | Latency (p95) | < 1s | > 2s |
| **API Gateway** | 4XX rate | < 5% | > 10% |
| **API Gateway** | 5XX rate | < 1% | > 5% |
| **RDS** | CPU utilization | < 50% | > 80% |
| **RDS** | Connections | < 80% | > 90% |
| **RDS** | Query latency (p95) | < 100ms | > 500ms |
| **SQS** | Message age | < 5m | > 1h |
| **SQS** | Queue depth | < 100 | > 1000 |

### Establish Baseline

```bash
# Run this script to establish baseline metrics
cat > establish-baseline.sh <<'EOF'
#!/bin/bash

DATE=$(date +%Y%m%d)
OUTPUT="baseline-${DATE}.txt"

echo "=== Supporter 360 Performance Baseline ===" > $OUTPUT
echo "Date: $(date)" >> $OUTPUT
echo "" >> $OUTPUT

echo "Lambda Duration (p95, last hour):" >> $OUTPUT
for func in ShopifyProcessor StripeProcessor GoCardlessProcessor MailchimpProcessor; do
  aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name Duration \
    --dimensions Name=FunctionName,Value=Supporter360StackV2-$func \
    --start-time $(date -d '1 hour ago' +%s) \
    --end-time $(date +%s) \
    --period 3600 \
    --statistics \
    --query 'Datapoints[0].p95' \
    --output text >> $OUTPUT
done

echo "" >> $OUTPUT
echo "API Gateway Latency (p95, last hour):" >> $OUTPUT
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Latency \
  --dimensions Name=ApiName,Value=Supporter360StackV2 \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 3600 \
  --statistics \
    --query 'Datapoints[0].p95' \
  --output text >> $OUTPUT

echo "" >> $OUTPUT
echo "RDS CPU (average, last hour):" >> $OUTPUT
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=supporter360-supporter360-database \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 3600 \
  --statistics Average \
  --query 'Datapoints[0].Average' \
  --output text >> $OUTPUT

echo "" >> $OUTPUT
echo "=== Baseline Complete ===" >> $OUTPUT
cat $OUTPUT
EOF

chmod +x establish-baseline.sh
```

---

## Lambda Performance

### Diagnose Lambda Issues

```bash
# Check Lambda duration
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=Supporter360StackV2-ShopifyProcessor \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Average,Maximum

# Check Lambda memory usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name MemoryUtilization \
  --dimensions Name=FunctionName,Value=Supporter360StackV2-ShopifyProcessor \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Average,Maximum

# Check for throttles
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Throttles \
  --dimensions Name=FunctionName,Value=Supporter360StackV2-ShopifyProcessor \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Sum
```

### Optimization Techniques

#### 1. Increase Memory Allocation

```bash
# Current configuration
aws lambda get-function-configuration \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --query '{MemorySize: MemorySize, Timeout: Timeout}'

# Increase memory (also increases CPU)
aws lambda update-function-configuration \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --memory-size 512  # Double from 256

# Benchmark different memory sizes
for memory in 256 512 1024 2048; do
  echo "Testing with ${memory}MB memory..."
  aws lambda update-function-configuration \
    --function-name Supporter360StackV2-ShopifyProcessor \
    --memory-size $memory

  # Wait for update
  sleep 10

  # Test function
  start_time=$(date +%s%N)
  aws lambda invoke \
    --function-name Supporter360StackV2-ShopifyProcessor \
    --payload '{"Records":[{"body":"{\"test\":\"data\"}"}]}' \
    response.json > /dev/null
  end_time=$(date +%s%N)

  duration=$(( (end_time - start_time) / 1000000 ))
  echo "Memory: ${memory}MB, Duration: ${duration}ms"

  # Check CloudWatch for actual duration
  sleep 30
done
```

#### 2. Optimize Lambda Timeout

```bash
# Check current timeout
aws lambda get-function-configuration \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --query 'Timeout'

# Analyze actual duration
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=Supporter360StackV2-ShopifyProcessor \
  --start-time $(date -d '24 hours ago' +%s) \
  --end-time $(date +%s) \
  --period 3600 \
  --statistics Average,p95,p99,p100

# Set timeout to p99 + 20% buffer
# If p99 is 25s, set timeout to 30s
aws lambda update-function-configuration \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --timeout 30
```

#### 3. Enable Concurrency

```bash
# Check current concurrency
aws lambda get-function-configuration \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --query 'Concurrency'

# Remove reserved concurrency (allow unlimited)
aws lambda delete-function-concurrency \
  --function-name Supporter360StackV2-ShopifyProcessor

# Or set specific concurrency limit
aws lambda put-function-concurrency \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --reserved-concurrent-executions 50
```

#### 4. Optimize Code

```bash
# Check package size
aws lambda get-function \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --query 'Code.Location'

# Download and analyze
curl -o function.zip "<code-location>"
unzip -l function.zip | tail -1

# Optimization tips:
# 1. Remove unused dependencies
# 2. Use AWS SDK for JavaScript v3 (smaller)
# 3. Enable minification
# 4. Use Lambda layers for common code

# Update tsconfig.json for minification
cat > packages/backend/tsconfig.json <<EOF
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": false,
    "sourceMap": false
  }
}
EOF
```

#### 5. Enable Lambda Insights

```bash
# Enable Lambda Insights for detailed monitoring
aws lambda update-function-configuration \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --layers arn:aws:lambda:eu-west-1:580247275435:layer:LambdaInsightsExtension:14 \
  --handler 'does_not_matter'

# Note: Requires IAM permissions
```

---

## Database Performance

### Diagnose Database Issues

```bash
# Check RDS CPU
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=supporter360-supporter360-database \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Average,Maximum

# Check RDS connections
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=supporter360-supporter360-database \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Average,Maximum

# Check RDS read/write latency
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name ReadLatency,WriteLatency \
  --dimensions Name=DBInstanceIdentifier,Value=supporter360-supporter360-database \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Average
```

### Connect to Database for Analysis

```bash
# Get database credentials
aws secretsmanager get-secret-value \
  --secret-id Supporter360StackV2-postgres \
  --query SecretString \
  --output text | jq -r '.'

# Connect to database
psql -h <DB_HOST> -U <DB_USER> -d supporter360
```

### Optimization Queries

```sql
-- Check slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Check missing indexes
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
ORDER BY n_distinct DESC;

-- Check long-running transactions
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Check table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Optimization Techniques

#### 1. Add Missing Indexes

```sql
-- Example: Add index on frequently queried columns
CREATE INDEX idx_events_supporter_id ON events(supporter_id);
CREATE INDEX idx_events_source_system ON events(source_system);
CREATE INDEX idx_events_created_at ON events(created_at DESC);

-- Example: Composite index for common query patterns
CREATE INDEX idx_events_supporter_source ON events(supporter_id, source_system, created_at DESC);

-- Example: Partial index for active supporters
CREATE INDEX idx_active_supporters ON supporters(email) WHERE status = 'active';

-- Verify index usage
EXPLAIN ANALYZE
SELECT * FROM events
WHERE supporter_id = 'xxx'
  AND source_system = 'shopify'
ORDER BY created_at DESC
LIMIT 50;
```

#### 2. Optimize Connection Pooling

```typescript
// In packages/backend/src/db/connection.ts
import { Pool } from 'pg';

// Configure connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle clients after 30s
  connectionTimeoutMillis: 2000, // Return error after 2s if can't connect
});

// Monitor pool stats
setInterval(() => {
  console.log('Pool stats:', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  });
}, 60000);
```

#### 3. Enable Query Caching

```typescript
// Add caching layer for frequently accessed data
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5-minute TTL

export async function getSupporterById(supporterId: string) {
  const cacheKey = `supporter:${supporterId}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Query database
  const result = await db.query(
    'SELECT * FROM supporters WHERE supporter_id = $1',
    [supporterId]
  );

  // Cache result
  cache.set(cacheKey, result.rows[0]);
  return result.rows[0];
}
```

#### 4. Optimize Batch Operations

```typescript
// Instead of multiple individual inserts
for (const event of events) {
  await db.query('INSERT INTO events ...', event);
}

// Use batch insert
await db.query(`
  INSERT INTO events (supporter_id, source_system, event_type, data)
  VALUES ${events.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ')}
`, events.flatMap(e => [e.supporterId, e.sourceSystem, e.eventType, JSON.stringify(e.data)]));
```

#### 5. Enable RDS Performance Insights

```bash
# Enable Performance Insights
aws rds modify-db-instance \
  --db-instance-identifier supporter360-supporter360-database \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --apply-immediately

# View Performance Insights
# AWS Console → RDS → Database → Performance Insights
```

---

## API Gateway Performance

### Diagnose API Issues

```bash
# Check API Gateway latency
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Latency \
  --dimensions Name=ApiName,Value=Supporter360StackV2 \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Average,p95,p99

# Check 4XX errors (client errors)
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name 4XXError \
  --dimensions Name=ApiName,Value=Supporter360StackV2 \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Sum

# Check 5XX errors (server errors)
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name 5XXError \
  --dimensions Name=ApiName,Value=Supporter360StackV2 \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Sum
```

### Optimization Techniques

#### 1. Enable API Gateway Caching

```bash
# Enable caching for frequently accessed endpoints
aws apigateway update-stage \
  --rest-api-id <api-id> \
  --stage-name prod \
  --patch-operations op=replace,path=/cacheClusterEnabled,value=true \
  op=replace,path=/cacheClusterSize,value=0.5

# Set cache TTL per endpoint
# In CDK:
const searchResource = api.root.addResource('search');
searchResource.addMethod('GET', integration, {
  methodResponses: [{ statusCode: '200' }],
  requestParameters: {
    'method.request.querystring.q': true,
  },
  cacheClusterEnabled: true,
  cacheDataEncrypted: true,
  cacheTtl: Duration.seconds(300),
});
```

#### 2. Enable Throttling

```bash
# Set throttling limits
aws apigateway update-stage \
  --rest-api-id <api-id> \
  --stage-name prod \
  --patch-operations op=replace,path=/throttlingBurstLimit,value=100 \
  op=replace,path=/throttlingRateLimit,value=50

# Create usage plan
aws apigateway create-usage-plan \
  --name "Supporter360-Production" \
  --throttle '{RateLimit=100,BurstLimit=200}' \
  --quota '{Limit=1000000,Period=MONTH}'
```

#### 3. Optimize Lambda Integration

```bash
# Reduce Lambda timeout (API Gateway has 29s timeout)
aws lambda update-function-configuration \
  --function-name Supporter360StackV2-SearchHandler \
  --timeout 25

# Enable Lambda proxy integration with streaming
# (Requires Lambda response streaming)
```

#### 4. Enable Compression

```bash
# Enable content encoding
aws apigateway update-integration \
  --rest-api-id <api-id> \
  --resource-id <resource-id> \
  --http-method GET \
  --patch-operations op=replace,path=/contentHandling,value=CONVERT_TO_TEXT
```

---

## SQS Performance

### Diagnose SQS Issues

```bash
# Check queue depth
aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-1.amazonaws.com/<account>/supporter360-shopify-queue \
  --attribute-names ApproximateNumberOfMessages,ApproximateNumberOfMessagesNotVisible,ApproximateNumberOfMessagesDelayed

# Check message age
aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-1.amazonaws.com/<account>/supporter360-shopify-queue \
  --attribute-names ApproximateAgeOfOldestMessage

# Check DLQ depth
aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-1.amazonaws.com/<account>/supporter360-shopify-dlq \
  --attribute-names ApproximateNumberOfMessagesVisible
```

### Optimization Techniques

#### 1. Optimize Batch Size

```bash
# Check current batch size
aws lambda get-event-source-mapping \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --query 'BatchSize'

# Increase batch size for faster processing
aws lambda update-event-source-mapping \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --batch-size 10  # Process up to 10 messages per invocation

# Find optimal batch size
for batch_size in 1 5 10 20; do
  echo "Testing batch size: $batch_size"
  aws lambda update-event-source-mapping \
    --function-name Supporter360StackV2-ShopifyProcessor \
    --batch-size $batch_size

  # Monitor for 5 minutes
  sleep 300

  # Check queue depth
  depth=$(aws sqs get-queue-attributes \
    --queue-url <queue-url> \
    --attribute-names ApproximateNumberOfMessages \
    --query 'Attributes.ApproximateNumberOfMessages' \
    --output text)

  echo "Queue depth after 5min: $depth"
done
```

#### 2. Increase Lambda Concurrency

```bash
# Remove concurrency limit
aws lambda delete-function-concurrency \
  --function-name Supporter360StackV2-ShopifyProcessor

# Or increase limit
aws lambda put-function-concurrency \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --reserved-concurrent-executions 100
```

#### 3. Optimize Visibility Timeout

```bash
# Check current visibility timeout
aws sqs get-queue-attributes \
  --queue-url <queue-url> \
  --attribute-names VisibilityTimeout

# Set visibility timeout to 6x Lambda timeout
# (If Lambda timeout is 30s, set visibility timeout to 180s)
aws sqs set-queue-attributes \
  --queue-url <queue-url> \
  --attributes VisibilityTimeout=180
```

#### 4. Enable Long Polling

```bash
# Enable long polling
aws sqs set-queue-attributes \
  --queue-url <queue-url> \
  --attributes ReceiveRequestWaitTimeSeconds=20

# Verify
aws sqs get-queue-attributes \
  --queue-url <queue-url> \
  --attribute-names ReceiveRequestWaitTimeSeconds
```

---

## Cost-Performance Optimization

### Right-Sizing Lambda

```bash
# Find cost-optimal memory configuration
# (Higher memory = more CPU = faster execution = lower cost)

# Script to find optimal memory
cat > optimize-lambda-memory.sh <<'EOF'
#!/bin/bash

FUNCTION=$1
echo "Optimizing memory for $FUNCTION..."

for memory in 128 256 512 1024 1536 2048; do
  echo "Testing with ${memory}MB..."
  aws lambda update-function-configuration \
    --function-name $FUNCTION \
    --memory-size $memory > /dev/null

  sleep 5

  # Run 10 invocations
  total_duration=0
  for i in {1..10}; do
    start=$(date +%s)
    aws lambda invoke \
      --function-name $FUNCTION \
      --payload '{"test":"data"}' \
      /dev/null
    end=$(date +%s)
    duration=$((end - start))
    total_duration=$((total_duration + duration))
  done

  avg_duration=$((total_duration / 10))

  # Calculate cost (per million invocations)
  # Cost = (memory / 128) * (duration / 100ms) * $0.0000000167
  cost=$(echo "scale=4; ($memory / 128) * ($avg_duration / 0.1) * 0.0000000167" | bc)
  cost_per_million=$(echo "$cost * 1000000" | bc)

  echo "Memory: ${memory}MB, Avg Duration: ${avg_duration}s, Cost/M: \$$cost_per_million"
done
EOF

chmod +x optimize-lambda-memory.sh

./optimize-lambda-memory.sh Supporter360StackV2-ShopifyProcessor
```

### RDS Serverless v2 Optimization

```bash
# Check current ACU range
aws rds describe-db-clusters \
  --db-cluster-identifier supporter360-supporter360-database \
  --query 'DBClusters[0].{MinACU:ServerlessV2ScalingConfiguration.MinCapacity,MaxACU:ServerlessV2ScalingConfiguration.MaxCapacity}'

# Adjust ACU range based on usage
# If CPU is consistently < 20%, reduce max ACU
# If CPU is consistently > 80%, increase max ACU

aws rds modify-db-cluster \
  --db-cluster-identifier supporter360-supporter360-database \
  --serverless-v2-scaling-configuration MinCapacity=0.5,MaxCapacity=1 \
  --apply-immediately
```

### S3 Lifecycle Optimization

```bash
# Add lifecycle policy to reduce costs
aws s3api put-bucket-lifecycle-configuration \
  --bucket supporter360-raw-payloads \
  --lifecycle-configuration file://lifecycle-policy.json

# lifecycle-policy.json:
{
  "Rules": [
    {
      "Id": "MoveToGlacier",
      "Status": "Enabled",
      "Filter": {},
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 90,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ]
    },
    {
      "Id": "DeleteOld",
      "Status": "Enabled",
      "Filter": {},
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

---

## Performance Monitoring Dashboard

### CloudWatch Dashboard JSON

```bash
# Create performance dashboard
cat > performance-dashboard.json <<'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Duration", "FunctionName", "Supporter360StackV2-ShopifyProcessor", {"stat": "Average"}],
          [".", "Duration", ".", "Supporter360StackV2-StripeProcessor", {"stat": "Average"}],
          [".", "Duration", ".", "Supporter360StackV2-GoCardlessProcessor", {"stat": "Average"}],
          [".", "Duration", ".", "Supporter360StackV2-MailchimpProcessor", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "eu-west-1",
        "title": "Lambda Duration"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApiGateway", "Latency", "ApiName", "Supporter360StackV2", {"stat": "Average"}],
          [".", "5XXError", ".", "Supporter360StackV2", {"stat": "Sum"}],
          [".", "4XXError", ".", "Supporter360StackV2", {"stat": "Sum"}]
        ],
        "period": 300,
        "region": "eu-west-1",
        "title": "API Gateway Performance"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "supporter360-supporter360-database", {"stat": "Average"}],
          [".", "DatabaseConnections", ".", "supporter360-supporter360-database", {"stat": "Average"}],
          [".", "ReadLatency", ".", "supporter360-supporter360-database", {"stat": "Average"}],
          [".", "WriteLatency", ".", "supporter360-supporter360-database", {"stat": "Average"}]
        ],
        "period": 300,
        "region": "eu-west-1",
        "title": "RDS Performance"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", "supporter360-shopify-queue"],
          [".", "ApproximateNumberOfMessagesVisible", "QueueName", "supporter360-stripe-queue"],
          [".", "ApproximateNumberOfMessagesVisible", "QueueName", "supporter360-gocardless-queue"],
          [".", "ApproximateNumberOfMessagesVisible", "QueueName", "supporter360-mailchimp-queue"]
        ],
        "period": 300,
        "region": "eu-west-1",
        "title": "SQS Queue Depth"
      }
    }
  ]
}
EOF

# Create dashboard
aws cloudwatch put-dashboard \
  --dashboard-name Supporter360-Performance \
  --dashboard-body file://performance-dashboard.json
```

---

**Remember:** Performance optimization is iterative. Measure, optimize, verify, repeat.
