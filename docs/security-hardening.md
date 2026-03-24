# Security Hardening Implementation

## Overview
This document describes the security enhancements implemented for the Supporter 360 infrastructure.

## Implemented Security Measures

### 1. CORS Configuration
**File:** `packages/backend/src/config/cors.ts`

**Changes:**
- Created centralized CORS configuration module
- Removed localhost origins from production configuration
- Added production domain `https://shamrockrovers.ie`
- Will add S3 static website URL after first deployment

**Security Impact:**
- Prevents cross-origin attacks from unauthorized domains
- Restricts API access to known frontend origins only

### 2. Lambda Authorizer
**File:** `packages/backend/src/handlers/authorizer.ts` (already existed)

**Infrastructure Changes:**
- Added Lambda authorizer function to CDK stack
- Configured as TokenAuthorizer with X-API-Key header
- Attached to all protected endpoints (`/api/*`, `/supporters/*`, `/admin/*`)

**Protected Endpoints:**
- `GET /search` - Supporter search API
- `GET /supporters/{id}` - Supporter profile API
- `GET /supporters/{id}/timeline` - Timeline API
- `POST /admin/merge` - Admin merge API

**Unprotected Endpoints (Public Webhooks):**
- `POST /webhooks/shopify`
- `POST /webhooks/stripe`
- `POST /webhooks/gocardless`
- `POST /webhooks/mailchimp`

**Security Impact:**
- All API endpoints now require valid API key
- Authorizer validates keys against database config table
- Role-based context passed to handlers for additional access control

### 3. WAF (Web Application Firewall)
**Implementation:** AWS WAF v2 with managed rules

**Rules Implemented:**

#### AWS Managed Rules - Common Rule Set
- Priority: 1
- Protects against common web vulnerabilities (OWASP Top 10)
- Includes SQL injection, cross-site scripting (XSS) protection

#### Rate-Based Rule
- Priority: 2
- Limit: 1000 requests per 5 minutes per IP address
- Action: Block requests exceeding limit
- Prevents DDoS and brute force attacks

**Monitoring:**
- CloudWatch metrics enabled for all rules
- Sampled requests enabled for analysis

**Security Impact:**
- Blocks malicious traffic before reaching Lambda
- Rate limiting prevents abuse
- Centralized security management

## Deployment Status

### Completed
- ✅ CORS configuration updated
- ✅ Lambda authorizer added to infrastructure
- ✅ WAF Web ACL created and associated
- ✅ Authorizer attached to protected endpoints
- ✅ CloudFormation template synthesized successfully

### Post-Deployment Tasks
1. Run `npx cdk deploy` to apply security enhancements
2. Verify WAF is associated with API Gateway
3. Test API endpoints with valid/invalid API keys
4. Monitor CloudWatch metrics for WAF and authorizer
5. Add S3 static website URL to CORS origins after deployment

## Testing Checklist

### 1. CORS Testing
```bash
# Test valid origin
curl -H "Origin: https://shamrockrovers.ie" \
  -H "X-API-Key: valid-key" \
  [API_URL]/search?q=test

# Test invalid origin (should fail)
curl -H "Origin: https://evil.com" \
  -H "X-API-Key: valid-key" \
  [API_URL]/search?q=test
```

### 2. Authorizer Testing
```bash
# Test with valid API key
curl -H "X-API-Key: valid-api-key" \
  [API_URL]/search?q=test

# Test with invalid API key (should return 401)
curl -H "X-API-Key: invalid-key" \
  [API_URL]/search?q=test

# Test without API key (should return 401)
curl [API_URL]/search?q=test
```

### 3. WAF Testing
```bash
# Test rate limiting (send 1001 requests)
for i in {1..1001}; do
  curl -H "X-API-Key: valid-key" [API_URL]/search?q=test
done

# Should be blocked after 1000 requests
```

## Monitoring

### CloudWatch Metrics
- `AWSManagedRulesCommonRuleSet` - WAF common rule set metrics
- `RateLimitRule` - Rate limiting metrics
- `Supporter360ApiGatewayWebAcl` - Overall WAF metrics

### Alarms to Consider
- WAF blocked requests count > threshold
- Authorizer errors > threshold
- Rate limit rule triggered

## Security Best Practices Applied

1. **Principle of Least Privilege**
   - Webhooks remain public (required for external systems)
   - API endpoints require authentication
   - Authorizer validates every request

2. **Defense in Depth**
   - WAF at edge (network level)
   - Authorizer at API Gateway (application level)
   - Database-level permissions

3. **Monitoring and Observability**
   - All security components emit CloudWatch metrics
   - Sampled requests for analysis
   - Logs for incident response

## Next Steps

1. Deploy infrastructure: `cdk deploy`
2. Run security testing checklist
3. Set up CloudWatch alarms for security metrics
4. Document API key rotation procedures
5. Create incident response runbook for security events

## References

- [AWS WAF v2 CDK Documentation](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws-wafv2-readme.html)
- [API Gateway Lambda Authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html)
- [CORS Security Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
