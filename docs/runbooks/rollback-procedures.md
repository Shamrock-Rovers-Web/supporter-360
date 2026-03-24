# Rollback Procedures Runbook

**Purpose:** Procedures for rolling back Supporter 360 infrastructure and application changes to previous stable states.

**Last Updated:** 2026-03-24

---

## Table of Contents

1. [Pre-Rollback Checklist](#pre-rollback-checklist)
2. [CDK Infrastructure Rollback](#cdk-infrastructure-rollback)
3. [Lambda Function Rollback](#lambda-function-rollback)
4. [Database Rollback](#database-rollback)
5. [Configuration Rollback](#configuration-rollback)
6. [Webhook Configuration Rollback](#webhook-configuration-rollback)
7. [Complete Stack Rollback](#complete-stack-rollback)
8. [Post-Rollback Verification](#post-rollback-verification)

---

## Pre-Rollback Checklist

**Before initiating any rollback:**

- [ ] **Identify what changed**
  ```bash
  # Check recent CloudFormation changes
  aws cloudformation describe-stack-events \
    --stack-name Supporter360StackV2 \
    --max-items 20

  # Check recent Lambda deployments
  aws lambda list-functions \
    | jq '.Functions[] | select(.FunctionName | contains("Supporter360")) | {Name: .FunctionName, LastModified: .LastModified}'

  # Check recent deployments in CI/CD
  git log --oneline -20
  ```

- [ ] **Determine rollback target**
  - Which version to rollback to?
  - When was that version deployed?
  - What was the deployment time?

- [ ] **Assess rollback risk**
  - Will rollback cause data loss?
  - Will rollback cause downtime?
  - Are there dependent changes?

- [ ] **Notify stakeholders**
  - Inform team of rollback
  - Estimate rollback duration
  - Communicate user impact

- [ ] **Create backup** (if not recent)
  ```bash
  # Create RDS snapshot
  aws rds create-db-snapshot \
    --db-cluster-identifier supporter360-supporter360-database \
    --db-snapshot-identifier pre-rollback-$(date +%Y%m%d-%H%M%S)

  # Export current Lambda versions
  aws lambda list-functions \
    --query 'Functions[?contains(FunctionName, `Supporter360`)].{Name:FunctionName,Version:Version}' \
    > lambda-versions-backup.json
  ```

---

## CDK Infrastructure Rollback

**Use Case:** Roll back infrastructure changes made via CDK deployment (VPC, subnets, security groups, etc.)

### Prerequisites

- CDK deployment ID or timestamp
- Git commit hash of previous version
- No data loss expected from infrastructure rollback

### Procedure

#### Step 1: Identify Previous Deployment

```bash
# Check CloudFormation stack history
aws cloudformation describe-stack-events \
  --stack-name Supporter360StackV2 \
  --query 'StackEvents[?ResourceType==`AWS::CloudFormation::Stack`].[Timestamp,ResourceStatus,ResourceStatusReason]' \
  --output table

# Check CDK deployment history (if using CDK deployments)
cd packages/infrastructure
cdk deploy --previous  # List previous deployments

# Or use git to find previous version
git log --oneline --all --decorate -20
```

#### Step 2: Checkout Previous Version

```bash
# Clone repository to new location (to preserve current state)
cd /tmp
git clone <repository-url> supporter360-rollback
cd supporter360-rollback

# Checkout previous version
git checkout <previous-commit-hash>

# Build CDK
cd packages/infrastructure
npm install
npm run build
```

#### Step 3: Deploy Previous Version

```bash
# CDK diff to see changes
cdk diff Supporter360StackV2

# Deploy previous version
cdk deploy Supporter360StackV2 --require-approval never

# Monitor deployment
aws cloudformation describe-stack-events \
  --stack-name Supporter360StackV2 \
  --follow
```

#### Step 4: Verify Rollback

```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name Supporter360StackV2 \
  --query 'Stacks[0].StackStatus'

# Verify critical resources
aws rds describe-db-clusters \
  --db-cluster-identifier supporter360-supporter360-database

aws apigateway get-rest-api \
  --rest-api-id <api-id>
```

### Alternative: CloudFormation Rollback

If CloudFormation rollback is enabled:

```bash
# Cancel current update (if in progress)
aws cloudformation cancel-update-stack \
  --stack-name Supporter360StackV2

# Initiate rollback
aws cloudformation rollback-stack \
  --stack-name Supporter360StackV2

# Or use previous stack template directly
aws cloudformation get-template \
  --stack-name Supporter360StackV2 \
  --previous-stage \
  --query 'TemplateBody' \
  > previous-template.json

# Update stack with previous template
aws cloudformation update-stack \
  --stack-name Supporter360StackV2 \
  --template-body file://previous-template.json \
  --capabilities CAPABILITY_NAMED_IAM
```

---

## Lambda Function Rollback

**Use Case:** Roll back individual Lambda functions to previous versions without affecting infrastructure.

### Prerequisites

- Lambda function has versioning enabled
- Previous version still exists
- No breaking changes in environment variables or IAM permissions

### Procedure

#### Step 1: List Available Versions

```bash
# List all versions of a function
aws lambda list-versions-by-function \
  --function-name Supporter360StackV2-ShopifyProcessor

# List versions with details
aws lambda list-versions-by-function \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --query 'Versions[*].[Version,LastModified,Description]' \
  --output table
```

#### Step 2: Identify Target Version

```bash
# Get version details
aws lambda get-function-configuration \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --qualifier <version-number>

# Check version description (if documented)
aws lambda get-function-configuration \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --qualifier 2 \
  --query 'Description'
```

#### Step 3: Update Alias to Point to Previous Version

```bash
# Check current alias configuration
aws lambda get-alias \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --name prod

# Update alias to point to previous version
aws lambda update-alias \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --function-version 2 \
  --name prod

# Or if using $LATEST, re-alias to previous version
aws lambda create-alias \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --function-version 2 \
  --name prod
```

#### Step 4: Verify Rollback

```bash
# Test Lambda function
aws lambda invoke \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --qualifier prod \
  --payload '{"Records":[{"body":"{\"test\":\"data\"}"}]}' \
  response.json

cat response.json

# Check logs
aws logs tail /aws/lambda/Supporter360StackV2-ShopifyProcessor --since 5m
```

### Alternative: Redeploy from Git

```bash
# Checkout previous version
cd packages/backend
git checkout <previous-commit-hash>

# Build
npm run build

# Update Lambda function code
aws lambda update-function-code \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --zip-file fileb://dist/handlers/processors/shopify-processor.zip

# Wait for update to complete
aws lambda wait function-updated \
  --function-name Supporter360StackV2-ShopifyProcessor
```

### Rollback Multiple Functions

```bash
# Rollback all webhook handlers
for func in Shopify Stripe GoCardless Mailchimp; do
  aws lambda update-alias \
    --function-name Supporter360StackV2-${func}WebhookHandler \
    --function-version 2 \
    --name prod
done

# Rollback all processors
for func in Shopify Stripe GoCardless Mailchimp; do
  aws lambda update-alias \
    --function-name Supporter360StackV2-${func}Processor \
    --function-version 2 \
    --name prod
done
```

---

## Database Rollback

**Use Case:** Roll back database schema changes or data migrations.

**WARNING:** Database rollback can result in data loss. Use with extreme caution.

### Prerequisites

- Recent database snapshot exists
- Understanding of data impact
- Stakeholder approval for data loss

### Procedure

#### Option 1: Restore from Snapshot (Data Loss)

```bash
# List available snapshots
aws rds describe-db-snapshots \
  --db-cluster-identifier supporter360-supporter360-database \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime,SnapshotType]' \
  --output table

# Identify snapshot before deployment
aws rds describe-db-snapshots \
  --db-cluster-identifier supporter360-supporter360-database \
  --query 'DBSnapshots[?SnapshotCreateTime<`2024-03-24T10:00:00`]' \
  --output table

# Restore from snapshot
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier supporter360-supporter360-database-restored \
  --snapshot-identifier <snapshot-id> \
  --engine aurora-postgresql \
  --engine-version 14.15 \
  --vpc-security-group-ids <sg-id> \
  --db-subnet-group-name <subnet-group-name>

# Wait for restore to complete
aws rds wait db-cluster-available \
  --db-cluster-identifier supporter360-supporter360-database-restored

# Update Lambda environment variables to point to restored database
# (Update DB_HOST in Secrets Manager)
aws secretsmanager update-secret \
  --secret-id Supporter360StackV2-postgres \
  --secret-string '{"host":"<restored-db-endpoint>","port":5432,"dbname":"supporter360","username":"...","password":"..."}'
```

#### Option 2: Rollback Migration Scripts (No Data Loss)

```bash
# Connect to database
psql -h <DB_HOST> -U <DB_USER> -d supporter360

# Check current migration version
SELECT * FROM schema_migrations;

# Identify rollback script
# (This requires creating rollback scripts for each migration)

# Run rollback script
psql -h <DB_HOST> -U <DB_USER> -d supporter360 -f packages/database/migrations/rollback/<migration-file>.sql

# Verify rollback
\d <table-name>
SELECT * FROM schema_migrations;
```

#### Option 3: Manual Schema Rollback (Use with Caution)

```bash
# Connect to database
psql -h <DB_HOST> -U <DB_USER> -d supporter360

# List recent changes
SELECT * FROM audit_log WHERE action = 'CREATE_TABLE' ORDER BY created_at DESC LIMIT 10;
SELECT * FROM audit_log WHERE action = 'ALTER_TABLE' ORDER BY created_at DESC LIMIT 10;

# Rollback specific changes
# Example: Drop new column
ALTER TABLE supporters DROP COLUMN new_column;

# Example: Drop new table
DROP TABLE IF EXISTS new_table;

# Update migration version
DELETE FROM schema_migrations WHERE version = '<rollback-version>';
```

### Post-Rollback Data Verification

```bash
# Check table counts
SELECT COUNT(*) FROM supporters;
SELECT COUNT(*) FROM events;
SELECT COUNT(*) FROM memberships;

# Check recent data
SELECT * FROM events ORDER BY created_at DESC LIMIT 10;

# Check for orphaned records
SELECT * FROM events WHERE supporter_id NOT IN (SELECT supporter_id FROM supporters);
```

---

## Configuration Rollback

**Use Case:** Roll back environment variables, Secrets Manager secrets, or application configuration.

### Environment Variables

```bash
# Get current configuration
aws lambda get-function-configuration \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --query 'Environment.Variables' \
  > current-env.json

# Rollback to previous values
aws lambda update-function-configuration \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --environment Variables=<previous-values>

# Example: Rollback webhook URL
aws lambda update-function-configuration \
  --function-name Supporter360StackV2-ShopifyWebhookHandler \
  --environment Variables={WEBHOOK_URL=https://old-endpoint.example.com/webhook}
```

### Secrets Manager

```bash
# List secret versions
aws secretsmanager list-secret-version-ids \
  --secret-id supporter360/stripe

# Get previous secret version
aws secretsmanager get-secret-value \
  --secret-id supporter360/stripe \
  --version-id <previous-version-id> \
  --version-stage AWSPREVIOUS

# Restore previous version
aws secretsmanager restore-secret-version \
  --secret-id supporter360/stripe \
  --version-id <previous-version-id>
```

### API Gateway Configuration

```bash
# Get current stage configuration
aws apigateway get-stage \
  --rest-api-id <api-id> \
  --stage-name prod

# Rollback stage variables
aws apigateway update-stage \
  --rest-api-id <api-id> \
  --stage-name prod \
  --patch-operations op=replace,path=/variables/<key>,value=<old-value>

# Rollback throttling limits
aws apigateway update-stage \
  --rest-api-id <api-id> \
  --stage-name prod \
  --patch-operations op=replace,path=/throttlingBurstLimit,value=1000
```

---

## Webhook Configuration Rollback

**Use Case:** Roll back webhook URL changes or webhook secret updates.

### Rollback Webhook URLs in External Providers

#### Shopify

```bash
# Login to Shopify Admin
# Go to Settings → Notifications → Webhooks

# Remove new webhook endpoint
# 1. Find webhook pointing to new URL
# 2. Click webhook
# 3. Click "Delete webhook"

# Re-register old webhook endpoint
# 1. Click "Create webhook"
# 2. URL: https://<old-api-id>.execute-api.eu-west-1.amazonaws.com/prod/webhooks/shopify
# 3. Event topics: customers/create, customers/update, orders/create, orders/updated
```

#### Stripe

```bash
# Login to Stripe Dashboard
# Go to Developers → Webhooks

# Remove new endpoint
# 1. Find endpoint pointing to new URL
# 2. Click "..."
# 3. Click "Disable"

# Re-add old endpoint
# 1. Click "Add endpoint"
# 2. Endpoint URL: https://<old-api-id>.execute-api.eu-west-1.amazonaws.com/prod/webhooks/stripe
# 3. Select events to listen for
# 4. Click "Add endpoint"
```

#### GoCardless

```bash
# Login to GoCardless Dashboard
# Go to Settings → Webhooks

# Remove new webhook
# 1. Find webhook pointing to new URL
# 2. Click "Delete"

# Re-add old webhook
# 1. Click "Add webhook"
# 2. Endpoint URL: https://<old-api-id>.execute-api.eu-west-1.amazonaws.com/prod/webhooks/gocardless
# 3. Select events
# 4. Click "Save"
```

#### Mailchimp

```bash
# Login to Mailchimp Audience
# Go to Settings → Webhooks

# Remove new webhook
# 1. Find webhook pointing to new URL
# 2. Click "Delete"

# Re-add old webhook
# 1. Click "Create new webhook"
# 2. Callback URL: https://<old-api-id>.execute-api.eu-west-1.amazonaws.com/prod/webhooks/mailchimp
# 3. Select events
# 4. Click "Save"
```

### Rollback Webhook Secrets

```bash
# Restore previous secret version
aws secretsmanager restore-secret-version \
  --secret-id supporter360/stripe \
  --version-id <previous-version-id>

# Or update with old secret
aws secretsmanager update-secret \
  --secret-id supporter360/stripe \
  --secret-string '{"secretKey":"sk_live_...","webhookSecret":"whsec_OLD_SECRET"}'
```

---

## Complete Stack Rollback

**Use Case:** Complete system rollback due to critical failure or data corruption.

**WARNING:** Complete rollback causes downtime and potential data loss.

### Procedure

#### Step 1: Pre-Rollback Preparation

```bash
# Create full system backup
aws rds create-db-snapshot \
  --db-cluster-identifier supporter360-supporter360-database \
  --db-snapshot-id pre-complete-rollback-$(date +%Y%m%d-%H%M%S)

# Export all Lambda functions
for func in $(aws lambda list-functions --query 'Functions[?contains(FunctionName, `Supporter360`)].FunctionName' --output text); do
  aws lambda get-function --function-name $func --query 'Code.Location' --output text
done > lambda-backups.txt

# Export CloudFormation template
aws cloudformation get-template \
  --stack-name Supporter360StackV2 \
  --query 'TemplateBody' \
  > current-stack-template.json

# Notify all stakeholders
echo "Complete rollback initiated at $(date)" | mail -s "URGENT: Supporter 360 Rollback" team@example.com
```

#### Step 2: Stop All Incoming Traffic

```bash
# Disable API Gateway
aws apigateway update-stage \
  --rest-api-id <api-id> \
  --stage-name prod \
  --patch-operations op=replace,path=//*/*/caching/enabled,value=false

# Or enable maintenance mode (if implemented)
# This could be a Lambda authorizer that returns 503
```

#### Step 3: Rollback Database

```bash
# Choose rollback option (see Database Rollback section)
# Option 1: Restore from snapshot (data loss)
# Option 2: Rollback migrations (no data loss)

# Example: Restore from snapshot
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier supporter360-supporter360-database-restored \
  --snapshot-identifier <pre-deployment-snapshot-id> \
  --engine aurora-postgresql \
  --engine-version 14.15
```

#### Step 4: Rollback Lambda Functions

```bash
# Rollback all Lambda functions to previous version
for func in $(aws lambda list-functions --query 'Functions[?contains(FunctionName, `Supporter360`)].FunctionName' --output text); do
  aws lambda update-alias \
    --function-name $func \
    --function-version 2 \
    --name prod
done
```

#### Step 5: Rollback Infrastructure

```bash
# Checkout previous version
cd /tmp/supporter360-rollback
cd packages/infrastructure

# Deploy previous version
cdk deploy Supporter360StackV2 --require-approval never
```

#### Step 6: Restore Traffic

```bash
# Re-enable API Gateway
aws apigateway update-stage \
  --rest-api-id <api-id> \
  --stage-name prod \
  --patch-operations op=replace,path=//*/*/caching/enabled,value=true

# Verify system is operational
curl -I https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod/search?q=test
```

---

## Post-Rollback Verification

### Critical Functionality Checks

```bash
# 1. Database connectivity
psql -h <DB_HOST> -U <DB_USER> -d supporter360 -c "SELECT 1;"

# 2. Webhook endpoints
curl -X POST https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod/webhooks/shopify \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# 3. API endpoints
curl -H 'X-API-Key: <valid-key>' \
  https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod/search?q=test

# 4. Lambda functions
aws lambda invoke \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --payload '{"Records":[{"body":"{\"test\":\"data\"}"}]}' \
  response.json

# 5. SQS queues
aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-1.amazonaws.com/<account>/supporter360-shopify-queue \
  --attribute-names All
```

### Data Integrity Checks

```sql
-- Connect to database
\c supporter360

-- Check table counts
SELECT 'supporters' as table_name, COUNT(*) as row_count FROM supporters
UNION ALL
SELECT 'events', COUNT(*) FROM events
UNION ALL
SELECT 'memberships', COUNT(*) FROM memberships
UNION ALL
SELECT 'email_aliases', COUNT(*) FROM email_aliases;

-- Check recent data
SELECT * FROM events ORDER BY created_at DESC LIMIT 10;

-- Check for orphaned records
SELECT COUNT(*) FROM events WHERE supporter_id NOT IN (SELECT supporter_id FROM supporters);

-- Check data consistency
SELECT s.supporter_id, s.email, COUNT(e.event_id) as event_count
FROM supporters s
LEFT JOIN events e ON s.supporter_id = e.supporter_id
GROUP BY s.supporter_id, s.email
ORDER BY event_count DESC
LIMIT 10;
```

### Log Monitoring

```bash
# Monitor Lambda logs for errors
aws logs tail /aws/lambda/Supporter360StackV2-ShopifyProcessor --since 10m --filter-pattern "ERROR"

# Monitor API Gateway logs
aws logs tail /aws/apigateway/Supporter360 --since 10m

# Monitor SQS queue depth
watch -n 5 "aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-1.amazonaws.com/<account>/supporter360-shopify-queue \
  --attribute-names ApproximateNumberOfMessages"
```

### Performance Verification

```bash
# Check Lambda latency
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=Supporter360StackV2-ShopifyProcessor \
  --start-time $(date -d '5 minutes ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Average

# Check API Gateway latency
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Latency \
  --dimensions Name=ApiName,Value=Supporter360StackV2 \
  --start-time $(date -d '5 minutes ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Average

# Check error rates
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=Supporter360StackV2-ShopifyProcessor \
  --start-time $(date -d '5 minutes ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Sum
```

### User Acceptance Testing

```bash
# Test search functionality
curl -H 'X-API-Key: <valid-key>' \
  "https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod/search?q=john@example.com"

# Test profile retrieval
curl -H 'X-API-Key: <valid-key>' \
  "https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod/supporters/<supporter-id>"

# Test timeline retrieval
curl -H 'X-API-Key: <valid-key>' \
  "https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod/supporters/<supporter-id>/timeline"

# Test webhook processing
# (Send test webhook from external provider or simulate)
```

---

## Rollback Decision Tree

```
Is the issue critical (P1)?
├── Yes: Proceed with rollback
└── No: Can we hotfix?
    ├── Yes: Deploy hotfix
    └── No: Rollback

What changed?
├── Infrastructure only: CDK rollback
├── Lambda code only: Lambda version rollback
├── Database schema: Database rollback
├── Configuration: Config rollback
└── Multiple: Complete stack rollback

Will rollback cause data loss?
├── Yes: Can we recover data?
│   ├── Yes: Proceed with rollback + data recovery
│   └── No: Hotfix instead
└── No: Proceed with rollback

Is rollback target < 24 hours old?
├── Yes: Rollback available
└── No: May need manual restore
```

---

## Rollback Best Practices

1. **Document rollback target before deployment**
   - Tag deployment with version number
   - Note deployment timestamp
   - Save previous deployment details

2. **Test rollback procedures regularly**
   - Practice rollback in staging
   - Document rollback duration
   - Identify rollback blockers

3. **Automate rollback where possible**
   - Use Lambda versioning
   - Use CloudFormation rollback
   - Create rollback scripts

4. **Communicate during rollback**
   - Inform team of rollback
   - Update incident channel
   - Notify users of downtime

5. **Post-rollback analysis**
   - Root cause analysis
   - Prevent recurrence
   - Update runbooks

6. **Data backup before rollback**
   - Create database snapshot
   - Export Lambda versions
   - Save configuration

---

## Emergency Contacts

- **On-Call Engineer:** [Contact]
- **Engineering Manager:** [Contact]
- **Database Administrator:** [Contact]
- **AWS Support:** [Account ID, Support Plan]

---

**Remember:** Rollback is a safety mechanism, not a failure. If rollback is the safest option, do it without hesitation.
