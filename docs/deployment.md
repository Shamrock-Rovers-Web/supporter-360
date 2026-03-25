# Supporter 360 Deployment Guide

This guide provides comprehensive instructions for deploying Supporter 360 to AWS from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Deployment Procedure](#deployment-procedure)
4. [Post-Deployment Validation](#post-deployment-validation)
5. [Webhook Configuration](#webhook-configuration)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Tools

- **Node.js** (v18 or later)
- **npm** (v8 or later)
- **AWS CLI** (v2 or later)
- **AWS CDK** (v2 or later)
- **PostgreSQL client** (psql) - for database operations
- **Git** - for cloning the repository

### AWS Requirements

- AWS Account with appropriate permissions
- AWS credentials configured (`aws configure`)
- IAM permissions for:
  - CloudFormation
  - Lambda
  - API Gateway
  - RDS
  - SQS
  - S3
  - CloudWatch
  - EventBridge
  - Secrets Manager
  - VPC and EC2

### Initial AWS Configuration

```bash
# Configure AWS CLI
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your preferred region (e.g., eu-west-1)
# Enter your preferred output format (json)

# Verify configuration
aws sts get-caller-identity
```

---

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd supporter-360
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Bootstrap CDK (First Time Only)

```bash
cd packages/infrastructure
npx cdk bootstrap
cd ../..
```

This creates an S3 bucket in your AWS account for CDK assets.

### 4. Prepare Secrets

You need to create the following secrets in AWS Secrets Manager:

- `supporter360/shopify`
- `supporter360/stripe`
- `supporter360/gocardless`
- `supporter360/mailchimp`
- `supporter360/future-ticketing`

**Option 1: Use the provided script**

```bash
./scripts/populate-secrets.sh
```

**Option 2: Create manually in AWS Console**

Navigate to AWS Secrets Manager and create each secret with the following structure:

#### Shopify Secret
```json
{
  "webhookSecret": "your-webhook-secret",
  "clientSecret": "your-client-secret"
}
```

#### Stripe Secret
```json
{
  "webhookSecret": "whsec_...",
  "secretKey": "sk_live_..."
}
```

#### GoCardless Secret
```json
{
  "webhookSecret": "your-webhook-secret",
  "accessToken": "your-access-token"
}
```

#### Mailchimp Secret
```json
{
  "apiKey": "your-api-key",
  "webhookSecret": "your-webhook-secret"
}
```

#### Future Ticketing Secret
```json
{
  "apiKey": "your-api-key",
  "privateKey": "your-private-key"
}
```

---

## Deployment Procedure

### Quick Deployment

For a standard deployment, run:

```bash
./deploy.sh
```

This will:
1. Check prerequisites
2. Run tests
3. Bootstrap CDK (if needed)
4. Prompt for secrets setup (if not done)
5. Build all packages
6. Deploy infrastructure
7. Run database migrations
8. Perform post-deployment validation

### Deployment Options

```bash
# Skip tests (faster deployment)
./deploy.sh --skip-tests

# Skip secrets population prompt
./deploy.sh --skip-secrets

# Dry run (show steps without executing)
./deploy.sh --dry-run

# Combine options
./deploy.sh --skip-tests --skip-secrets
```

### Manual Deployment Steps

If you prefer manual control over each step:

#### Step 1: Build Packages

```bash
# Build shared package
cd packages/shared
npm run build
cd ../..

# Build backend
cd packages/backend
npm run build
cd ../..

# Build infrastructure
cd packages/infrastructure
npm run build
```

#### Step 2: Deploy Infrastructure

```bash
cd packages/infrastructure

# Review deployment plan
npx cdk diff

# Deploy with approval
npx cdk deploy

# Or deploy without approval prompts
npx cdk deploy --require-approval never
```

This will deploy:
- RDS PostgreSQL database
- Lambda functions for API
- API Gateway
- SQS queues
- S3 buckets
- EventBridge rules
- CloudFront distribution

#### Step 3: Run Database Migrations

The deployment creates a migration Lambda function. Invoke it manually:

```bash
# Get the migration function name
aws lambda list-functions --query "Functions[?contains(FunctionName, 'DbMigration')].FunctionName" --output text

# Invoke the migration function
aws lambda invoke \
  --function-name <migration-function-name> \
  --payload '{}' \
  response.json

# Check the response
cat response.json
```

#### Step 4: Deploy Frontend (Optional)

If you have a frontend application:

```bash
# Build frontend
cd packages/frontend
npm run build

# Deploy to S3
aws s3 sync dist/ s3://supporter360-frontend-<account-id> --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/*"
```

---

## Post-Deployment Validation

After deployment, run validation scripts to ensure everything is working correctly.

### Health Check Script

```bash
# Quick health check
./scripts/health-check.sh --quick

# Full health check
./scripts/health-check.sh

# With custom API URL
./scripts/health-check.sh --api-url https://api.example.com
```

This checks:
- Database connectivity
- Webhook endpoints
- API endpoints
- Lambda function health
- SQS queue health
- S3 bucket accessibility
- Scheduled function status

### Deployment Validation Script

```bash
# Run comprehensive validation
./scripts/validate-deployment.sh

# Skip prerequisites check
./scripts/validate-deployment.sh --skip-prerequisites

# With custom configuration
./scripts/validate-deployment.sh \
  --api-url https://api.example.com \
  --db-host db.example.com
```

This validates:
- Database SSL and connectivity
- Webhook signature verification
- CORS configuration
- Rate limiting
- API authentication
- Security group rules
- Lambda function states

### Manual Validation

#### 1. Check CDK Outputs

```bash
cd packages/infrastructure
npx cdk deploy --outputs-file outputs.json
cat outputs.json
```

Note down:
- API URL
- Database Endpoint
- Database Secret ARN
- S3 Bucket Names
- CloudFront Distribution ID

#### 2. Test API Endpoints

```bash
# Test webhook endpoints
curl -X POST https://<api-url>/webhooks/shopify \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Test API endpoints
curl https://<api-url>/search?q=test
```

#### 3. Verify Database Connection

```bash
# Get database credentials
aws secretsmanager get-secret-value \
  --secret-id supporter360-supporter360-postgres \
  --query SecretString \
  --output text > db-credentials.json

# Extract credentials
DB_HOST=$(jq -r '.host' db-credentials.json)
DB_USER=$(jq -r '.username' db-credentials.json)
DB_PASSWORD=$(jq -r '.password' db-credentials.json)

# Test connection
psql -h $DB_HOST -U $DB_USER -d supporter360 -c "SELECT 1;"
```

---

## Webhook Configuration

After deployment, configure webhooks in your external services.

### Shopify

1. Go to Shopify Admin → Settings → Notifications → Webhooks
2. Create webhook with URL: `https://<api-url>/webhooks/shopify`
3. Select events: `orders/create`, `orders/updated`, `customers/create`, `customers/update`
4. Set webhook version to latest
5. Copy webhook secret to AWS Secrets Manager

### Stripe

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://<api-url>/webhooks/stripe`
3. Select events: `charge.succeeded`, `customer.subscription.*`, `invoice.*`
4. Copy webhook signing secret (whsec_*) to AWS Secrets Manager

### GoCardless

1. Go to GoCardless Dashboard → Settings → Webhooks
2. Add webhook URL: `https://<api-url>/webhooks/gocardless`
3. Select events: `payments.*`, `mandates.*`, `subscriptions.*`
4. Copy webhook secret to AWS Secrets Manager

### Mailchimp

1. Go to Mailchimp Audience → Settings → Webhooks
2. Add webhook URL: `https://<api-url>/webhooks/mailchimp`
3. Select events: `subscribe`, `unsubscribe`, `profile`
4. Note: Mailchimp sends a GET request first to validate the URL

---

## Monitoring and Maintenance

### CloudWatch Dashboards

Create a CloudWatch dashboard to monitor:

**Lambda Metrics:**
- Invocations
- Errors
- Duration
- Throttles
- Concurrent executions

**API Gateway Metrics:**
- Count
- Latency
- 4XX Errors
- 5XX Errors
- Integration latency

**RDS Metrics:**
- CPU utilization
- Free storage
- Connections
- Read/Write latency

**SQS Metrics:**
- Number of messages received
- Number of messages sent
- Number of messages deleted
- Approximate age of oldest message

### Setting Up Alarms

Recommended CloudWatch alarms:

```bash
# Lambda error rate > 5%
aws cloudwatch put-metric-alarm \
  --alarm-name supporter360-lambda-errors \
  --alarm-description "Alert when Lambda error rate exceeds 5%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# API Gateway 5XX errors
aws cloudwatch put-metric-alarm \
  --alarm-name supporter360-api-5xx \
  --alarm-description "Alert when API Gateway has 5XX errors" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 60 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# RDS CPU > 80%
aws cloudwatch put-metric-alarm \
  --alarm-name supporter360-rds-cpu \
  --alarm-description "Alert when RDS CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3

# DLQ messages
aws cloudwatch put-metric-alarm \
  --alarm-name supporter360-dlq-messages \
  --alarm-description "Alert when DLQ has messages" \
  --metric-name ApproximateNumberOfMessagesVisible \
  --namespace AWS/SQS \
  --dimensions Name=QueueName,Value=supporter360-shopify-dlq \
  --statistic Average \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

### Log Analysis

View Lambda logs:

```bash
# List Lambda functions
aws logs describe-log-groups | jq '.logGroups[].logGroupName'

# Tail logs for a specific function
aws logs tail /aws/lambda/<function-name> --follow

# Filter errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/<function-name> \
  --filter-pattern "ERROR"
```

### Database Maintenance

#### Automated Backups

RDS is configured with:
- 7-day backup retention
- Automated backups daily
- Maintenance window: configurable

#### Manual Backup

```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier supporter360-database \
  --db-snapshot-identifier supporter360-manual-$(date +%Y%m%d)
```

#### Database Index Maintenance

```bash
# Connect to database
psql -h $DB_HOST -U $DB_USER -d supporter360

# Analyze tables for query optimization
ANALYZE supporters;
ANALYZE memberships;
ANALYZE events;

# Reindex if needed
REINDEX DATABASE supporter360;
```

---

## Troubleshooting

### Common Issues

#### 1. Deployment Fails with "No stack found"

```bash
# Bootstrap CDK first
cd packages/infrastructure
npx cdk bootstrap
```

#### 2. Lambda Functions Fail to Connect to Database

**Check:**
- Security group rules allow Lambda to access RDS
- Database secret exists in Secrets Manager
- SSL is enabled (DB_SSL=true)
- Database credentials are correct

**Solution:**
```bash
# Update security group
aws ec2 authorize-security-group-ingress \
  --group-id <lambda-security-group-id> \
  --protocol tcp \
  --port 5432 \
  --source-group <database-security-group-id>
```

#### 3. Webhooks Return 404

**Check:**
- API Gateway is deployed
- Webhook handlers are deployed
- Routes are configured correctly

**Solution:**
```bash
# Check API Gateway routes
aws apigateway get-resources --rest-api-id <api-id>

# Redeploy if needed
cd packages/infrastructure
npx cdk deploy
```

#### 4. SQS Messages Not Processing

**Check:**
- Lambda functions have SQS permissions
- DLQ is not filling up
- Lambda timeout is sufficient (default: 5 minutes)

**Solution:**
```bash
# Check DLQ for errors
aws sqs receive-message \
  --queue-url https://sqs.<region>.amazonaws.com/<account>/supporter360-shopify-dlq

# Check Lambda logs
aws logs tail /aws/lambda/Supporter360Stack-ShopifyProcessor --follow
```

### Getting Help

1. Check CloudWatch logs for errors
2. Run validation scripts
3. Review deployment guide
4. Check AWS service health dashboard

---

## Rollback Procedures

### Automatic Rollback

CDK automatically rolls back if deployment fails. To view rollback status:

```bash
cd packages/infrastructure
npx cdk deploy --rollback true
```

### Manual Rollback

#### Option 1: Restore from Previous CloudFormation Stack

```bash
# List stack versions
aws cloudformation describe-stack-events \
  --stack-name Supporter360Stack \
  --query 'StackEvents[?ResourceStatus==`UPDATE_COMPLETE`].Timestamp'

# Rollback to previous version
aws cloudformation continue-update-rollback \
  --stack-name Supporter360Stack
```

#### Option 2: Restore Database Snapshot

```bash
# List snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier supporter360-database

# Restore snapshot (creates new instance)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier supporter360-database-restore \
  --db-snapshot-identifier <snapshot-id>

# Or restore to point in time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier supporter360-database \
  --target-db-instance-identifier supporter360-database-restore \
  --restore-time 2024-01-01T00:00:00Z
```

#### Option 3: Redeploy Previous Code Version

```bash
# List previous deployments
git log --oneline

# Checkout previous version
git checkout <previous-commit-hash>

# Redeploy
./deploy.sh --skip-tests
```

### Rollback Verification

After rollback, run:

```bash
# Verify health
./scripts/health-check.sh

# Verify deployment
./scripts/validate-deployment.sh
```

## Pipeline Deployment

### GitHub Actions

The project includes a GitHub Actions workflow for CI/CD:

1. **Push to main**: Triggers deployment to production
2. **Pull request**: Runs tests and linting only

#### Required Secrets

Set these in GitHub repository settings:
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `CDK_DEFAULT_ACCOUNT` - AWS account ID
- `CDK_DEFAULT_REGION` - AWS region

### Manual Deployment via Pipeline

```bash
# Trigger production deployment
gh workflow run deploy.yml
```

## Database Migrations

Run migrations after deployment:

```bash
cd packages/database
npm run migrate:up
```

To rollback:

```bash
npm run migrate:down
```

## Monitoring and Logs

### View CloudWatch Logs

```bash
# API Gateway logs
aws logs tail /aws/lambda/supporter360-api-prod --follow

# Ingestion functions
aws logs tail /aws/lambda/supporter360-shopify-ingest --follow
```

### View Metrics

```bash
# CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace Supporter360 \
  --metric-name ActiveUsers \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Rollback Procedure

### Infrastructure Rollback

```bash
cd packages/infrastructure
cdk deploy --previous --require-approval never
```

### Frontend Rollback

```bash
# Redeploy previous version
git checkout <previous-tag>
cd packages/frontend
npm run build
aws s3 sync dist s3://your-bucket-name
```

## Troubleshooting

### API Returns 401 Unauthorized

1. Verify `VITE_API_KEY` matches the API key in Secrets Manager
2. Check API Gateway authorization settings
3. Review CloudWatch logs for Lambda

### Database Connection Fails

1. Verify RDS instance is running
2. Check security group allows Lambda access
3. Verify environment variables in Lambda configuration

### Frontend Build Fails

1. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
2. Check Node.js version: `node --version` (should be 18+)
3. Verify environment variables are set

## Security Considerations

1. **Never commit `.env` files** - Use AWS Secrets Manager for production secrets
2. **Rotate API keys regularly** - Use AWS Secrets Manager automatic rotation
3. **Enable WAF** - Add AWS WAF to API Gateway for DDoS protection
4. **Enable logging** - Ensure CloudWatch logs are enabled and retained
5. **Monitor costs** - Set up billing alerts for AWS resources

## Cost Optimization

1. **Use Lambda reserved concurrency** - For predictable performance
2. **Enable RDS Provisioned IOPS** - For consistent database performance
3. **Use CloudFront** - For frontend CDN caching
4. **Set up S3 lifecycle policies** - Archive old raw payloads to Glacier
