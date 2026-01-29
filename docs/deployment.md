# Deployment Guide

This guide covers deploying the Supporter 360 application to AWS.

## Prerequisites

- Node.js 18+ and npm 9+
- AWS CLI configured with appropriate credentials
- AWS CDK installed (`npm install -g aws-cdk`)
- Docker (for local Lambda testing)

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL connection
- `AWS_REGION` - AWS region for deployment
- `RAW_PAYLOADS_BUCKET` - S3 bucket name for raw payloads
- `VITE_API_URL` - API Gateway URL (set after deployment)
- `VITE_API_KEY` - API key for frontend authentication

### 3. Bootstrap CDK (first time only)

```bash
cd packages/infrastructure
cdk bootstrap aws://<account-id>/<region>
```

## Deployment Steps

### 1. Build All Packages

```bash
npm run build
```

### 2. Deploy Infrastructure

```bash
cd packages/infrastructure
cdk deploy --require-approval never
```

This will deploy:
- RDS PostgreSQL database
- Lambda functions for API
- API Gateway
- SQS queues
- S3 buckets
- EventBridge rules

### 3. Note the Outputs

After deployment, CDK will output values like:
- `ApiGatewayUrl` - Your API endpoint
- `WebsiteUrl` - Your frontend URL
- `ApiKey` - Generated API key

Update your `.env` file with these values:
```bash
VITE_API_URL=https://xxx.execute-api.eu-west-1.amazonaws.com/prod
VITE_API_KEY=your-generated-api-key
```

### 4. Deploy Frontend

Build and deploy the frontend:

```bash
npm run dev:frontend
```

For production deployment to S3 + CloudFront:
```bash
cd packages/frontend
npm run build
aws s3 sync dist s3://your-bucket-name
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
