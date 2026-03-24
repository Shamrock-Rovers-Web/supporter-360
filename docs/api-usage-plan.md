# API Gateway Usage Plan and Rate Limiting

This document describes the API Gateway usage plan and rate limiting configuration for Supporter 360.

## Overview

The usage plan provides:
- **Rate Limiting**: Throttles requests to prevent API abuse
- **Quota Management**: Limits total requests per API key per month
- **API Key Management**: Secure keys for authentication
- **Usage Tracking**: Monitor API usage per key

## Configuration

### Usage Plan Settings

- **Name**: Supporter360-Production
- **Throttle Rate Limit**: 300 requests/second
- **Throttle Burst Limit**: 100 requests
- **Quota Limit**: 10,000 requests/month per API key
- **Quota Period**: MONTH

### API Keys

Three API keys are generated:

1. **Production-Staff-Key**: For staff access to the API
2. **Production-Admin-Key**: For admin operations
3. **Production-Integration-Key**: For third-party integrations

## Deployment

### Prerequisites

1. AWS CLI installed and configured
2. jq installed for JSON parsing
3. Database migrations run (for storing API keys in database)
4. CDK stack deployed (API Gateway must exist)

### Deploy Usage Plan

```bash
cd /home/ubuntu/supporter-360
./scripts/deploy-usage-plan.sh
```

This script will:
1. Get the API Gateway ID
2. Create a usage plan with throttle and quota settings
3. Generate secure API keys (32-byte hex)
4. Associate API keys with the usage plan
5. Store API keys in the database (if available)
6. Display usage plan details

### Manual Setup (Alternative)

If you need to manually configure the usage plan:

```bash
# Get API Gateway ID
API_ID=$(aws apigateway get-rest-apis \
    --region eu-west-1 \
    --query "Items[?name=='Supporter 360 API'].id" \
    --output text)

# Create usage plan
USAGE_PLAN_ID=$(aws apigateway create-usage-plan \
    --region eu-west-1 \
    --name "Supporter360-Production" \
    --throttle "RateLimit=300,BurstLimit=100" \
    --quota "Limit=10000,Period=MONTH" \
    --query "id" \
    --output text)

# Generate API key
API_KEY_VALUE=$(openssl rand -hex 32)

# Create API key
KEY_ID=$(aws apigateway create-api-key \
    --region eu-west-1 \
    --name "Production-Staff-Key" \
    --value "${API_KEY_VALUE}" \
    --enabled \
    --stage-keys "restApiId=${API_ID},stage=prod" \
    --query "id" \
    --output text)

# Associate API key with usage plan
aws apigateway create-usage-plan-key \
    --region eu-west-1 \
    --usage-plan-id "${USAGE_PLAN_ID}" \
    --key-id "${KEY_ID}" \
    --key-type API_KEY
```

## Using API Keys

### Making API Requests

Include the API key in the `X-API-Key` header:

```bash
# Search supporters
curl -H "X-API-Key: <your-api-key>" \
  https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod/search?q=john

# Get supporter profile
curl -H "X-API-Key: <your-api-key>" \
  https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod/supporters/<id>

# Get timeline
curl -H "X-API-Key: <your-api-key>" \
  https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod/supporters/<id>/timeline
```

### Error Responses

#### 429 Too Many Requests (Throttle Exceeded)

```json
{
  "message": "Rate limit exceeded"
}
```

#### 429 Too Many Requests (Quota Exceeded)

```json
{
  "message": "Quota exceeded"
}
```

#### 403 Forbidden (Invalid API Key)

```json
{
  "message": "Forbidden"
}
```

## Monitoring

### Usage Metrics

View usage in AWS Console:
1. Go to API Gateway
2. Select your API
3. Click "Usage Plans"
4. Select "Supporter360-Production"
5. View usage per API key

### CloudWatch Metrics

Key metrics to monitor:
- `Count`: Total API requests
- `4XXError`: Client errors (including rate limits)
- `5XXError`: Server errors
- `Latency`: API response time

### Alarms

Recommended CloudWatch alarms:

```bash
# Rate limit exceeded alarm
aws cloudwatch put-metric-alarm \
  --alarm-name supporter360-api-rate-limit \
  --alarm-description "Alert when API rate limit is exceeded" \
  --metric-name 4XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 60 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Quota exceeded alarm
aws cloudwatch put-metric-alarm \
  --alarm-name supporter360-api-quota-exceeded \
  --alarm-description "Alert when API quota is exceeded" \
  --metric-name Count \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 86400 \
  --threshold 9000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

## Database Storage

API keys are stored in the `rate_limits` table for tracking:

```sql
CREATE TABLE rate_limits (
    id SERIAL PRIMARY KEY,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    key_name VARCHAR(255) NOT NULL,
    rate_limit INTEGER NOT NULL DEFAULT 300,
    burst_limit INTEGER NOT NULL DEFAULT 100,
    quota_limit INTEGER NOT NULL DEFAULT 10000,
    quota_period VARCHAR(20) NOT NULL DEFAULT 'MONTH',
    requests_count INTEGER DEFAULT 0,
    last_request_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Query API Key Usage

```sql
-- View all API keys and their limits
SELECT key_name, rate_limit, burst_limit, quota_limit, quota_period
FROM rate_limits;

-- Check request count for a specific key
SELECT key_name, requests_count, last_request_at
FROM rate_limits
WHERE api_key = '<your-api-key>';
```

## Security Best Practices

### API Key Storage

1. **Never commit API keys to git**
2. **Store in AWS Secrets Manager** or a secure vault
3. **Rotate keys regularly** (every 90 days recommended)
4. **Use separate keys** for different environments

### Storing in Secrets Manager

```bash
# Store API key
aws secretsmanager create-secret \
  --name supporter360/api-keys/production-staff \
  --secret-string '{"apiKey":"<your-api-key>","description":"Production staff API key"}'

# Retrieve API key
aws secretsmanager get-secret-value \
  --secret-id supporter360/api-keys/production-staff \
  --query SecretString \
  --output text | jq -r '.apiKey'
```

### Key Rotation

```bash
# Generate new key
NEW_KEY=$(openssl rand -hex 32)

# Update API key
aws apigateway update-api-key \
  --region eu-west-1 \
  --api-key <key-id> \
  --patch-opacities replace \
  --value "${NEW_KEY}"

# Update database
UPDATE rate_limits
SET api_key = '${NEW_KEY}', updated_at = NOW()
WHERE key_name = 'Production-Staff-Key';
```

## Troubleshooting

### Issue: API Key Not Working

**Symptoms**: 403 Forbidden errors

**Solutions**:
1. Verify API key is correct
2. Check API key is enabled
3. Confirm API key is associated with usage plan
4. Verify `X-API-Key` header is being sent

### Issue: Rate Limit Exceeded

**Symptoms**: 429 Too Many Requests

**Solutions**:
1. Implement exponential backoff in client
2. Request higher rate limits if needed
3. Use caching to reduce API calls
4. Optimize API usage patterns

### Issue: Quota Exceeded

**Symptoms**: 429 Too Many Requests (quota)

**Solutions**:
1. Monitor usage throughout the month
2. Request higher quota if needed
3. Set up CloudWatch alarms for quota usage
4. Implement request counting in application

## Configuration Changes

### Update Rate Limits

```bash
aws apigateway update-usage-plan \
  --region eu-west-1 \
  --usage-plan-id <usage-plan-id> \
  --patch-opacities replace \
  --throttle "RateLimit=500,BurstLimit=200"
```

### Update Quota

```bash
aws apigateway update-usage-plan \
  --region eu-west-1 \
  --usage-plan-id <usage-plan-id> \
  --patch-opacities replace \
  --quota "Limit=20000,Period=MONTH"
```

## Cost Considerations

API Gateway pricing (eu-west-1):
- **$3.50 per million** API requests
- **$0.09 per million** message deliveries to Lambda
- **Data transfer**: $0.09/GB (first 10TB)

With rate limiting:
- Max requests: 10,000/month × 3 keys = 30,000 requests/month
- Estimated cost: ~$0.10/month for API Gateway

## References

- [AWS API Gateway Usage Plans](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html)
- [AWS API Gateway Throttling](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)
- [API Gateway Pricing](https://aws.amazon.com/api-gateway/pricing/)
