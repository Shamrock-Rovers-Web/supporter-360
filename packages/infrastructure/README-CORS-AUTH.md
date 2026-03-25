# CORS and Authentication Enhancement - Infrastructure Changes

## Overview

This document describes the required infrastructure changes to enhance CORS security and implement Lambda authorizer for API Gateway.

**Note:** These changes should be made by the `worker-infra` agent as part of the infrastructure security enhancement epic.

## Changes Required

### 1. Add Lambda Authorizer Function

Add a new Lambda authorizer function to the CDK stack:

```typescript
// ========================================
// Lambda Authorizer
// ========================================
const authorizerHandler = new lambda.Function(this, 'ApiAuthorizer', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'handlers/authorizer.handler',
  code: lambda.Code.fromAsset('../backend/dist'),
  timeout: cdk.Duration.seconds(5),
  memorySize: 128,
  environment: commonEnvironment,
  description: 'API Gateway Lambda authorizer for API key validation',
});

// Grant database access to authorizer
database.connections.allowFrom(lambdaSecurityGroup, ec2.Port.tcp(5432));
```

### 2. Replace ALL_ORIGINS with Specific Origins

**Current code (lines 561-566):**
```typescript
defaultCorsPreflightOptions: {
  allowOrigins: apigateway.Cors.ALL_ORIGINS,
  allowMethods: apigateway.Cors.ALL_METHODS,
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
},
```

**Replace with:**
```typescript
defaultCorsPreflightOptions: {
  allowOrigins: [
    // Add your specific allowed origins here
    // Examples:
    // 'https://your-frontend-domain.com',
    // 'https://d111111abcdef8.cloudfront.net',

    // For development only - remove in production
    // 'http://localhost:3000',
    // 'http://localhost:5173',
  ],
  allowMethods: apigateway.Cors.ALL_METHODS,
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
},
```

### 3. Add Lambda Authorizer to API Endpoints

For each API endpoint that requires authentication, add the authorizer:

```typescript
// Create the authorizer
const authorizer = new apigateway.TokenAuthorizer(this, 'ApiTokenAuthorizer', {
  handler: authorizerHandler,
  identitySource: 'header.authorization',
});

// API endpoints with authorizer
const searchResource = api.root.addResource('search');
searchResource.addMethod('GET', new apigateway.LambdaIntegration(searchHandler), {
  authorizer,
});

const supportersResource = api.root.addResource('supporters');
const supporterResource = supportersResource.addResource('{id}');
supporterResource.addMethod('GET', new apigateway.LambdaIntegration(profileHandler), {
  authorizer,
});

const timelineResource = supporterResource.addResource('timeline');
timelineResource.addMethod('GET', new apigateway.LambdaIntegration(timelineHandler), {
  authorizer,
});

const adminResource = api.root.addResource('admin');
const mergeResource = adminResource.addResource('merge');
mergeResource.addMethod('POST', new apigateway.LambdaIntegration(mergeHandler), {
  authorizer,
});
```

### 4. Keep Webhook Endpoints Without Authorizer

Webhook endpoints should NOT have the authorizer attached, as they are called by external services:

```typescript
// Webhook endpoints - NO authorizer
const webhooksResource = api.root.addResource('webhooks');
const shopifyResource = webhooksResource.addResource('shopify');
shopifyResource.addMethod('POST', new apigateway.LambdaIntegration(shopifyWebhookHandler));

const stripeResource = webhooksResource.addResource('stripe');
stripeResource.addMethod('POST', new apigateway.LambdaIntegration(stripeWebhookHandler));

const gocardlessResource = webhooksResource.addResource('gocardless');
gocardlessResource.addMethod('POST', new apigateway.LambdaIntegration(gocardlessWebhookHandler));

const mailchimpResource = webhooksResource.addResource('mailchimp');
mailchimpResource.addMethod('POST', new apigateway.LambdaIntegration(mailchimpWebhookHandler));
```

## Configuration

### Backend Configuration

The backend now includes a CORS configuration file at `packages/backend/src/config/cors.ts`.

**Important:** Before deploying to production, update the `ALLOWED_ORIGINS` array:

```typescript
export const ALLOWED_ORIGINS = [
  // Add your production origins here
  'https://your-frontend-domain.com',
  'https://d111111abcdef8.cloudfront.net',

  // For development only - remove in production
  // 'http://localhost:3000',
  // 'http://localhost:5173',
];
```

## Security Benefits

### 1. Restricted CORS
- **Before:** `allowOrigins: apigateway.Cors.ALL_ORIGINS` allowed any origin
- **After:** Only specific, whitelisted origins can access the API

### 2. Centralized Authentication
- **Before:** Each Lambda function validated API keys independently
- **After:** API Gateway Lambda authorizer validates keys before reaching Lambda functions

### 3. Enhanced Audit Trail
- Authorizer logs all authentication attempts
- Failed auth attempts are blocked before reaching Lambda functions
- Reduces Lambda invocation costs for unauthorized requests

### 4. Role-Based Access Control
- Authorizer passes role information to Lambda functions via context
- Lambda functions can enforce role-based access control
- Admin endpoints are protected at multiple layers

## Deployment Steps

1. **Update backend configuration**
   ```bash
   # Edit packages/backend/src/config/cors.ts
   # Add your allowed origins
   ```

2. **Build backend**
   ```bash
   cd packages/backend
   npm run build
   ```

3. **Update CDK stack** (worker-infra agent)
   - Add Lambda authorizer function
   - Replace ALL_ORIGINS with specific origins
   - Add authorizer to protected endpoints

4. **Deploy infrastructure**
   ```bash
   cd packages/infrastructure
   npm run deploy
   ```

5. **Test the changes**
   - Test API access from allowed origins
   - Test API access from blocked origins (should fail)
   - Test with valid API keys
   - Test with invalid API keys (should fail)
   - Test webhook endpoints (should still work)

## Testing

### Test CORS Configuration

```bash
# Test from an allowed origin
curl -H "Origin: https://your-frontend-domain.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-API-Key" \
     -X OPTIONS \
     https://your-api-gateway-url/search

# Test from a blocked origin (should fail)
curl -H "Origin: https://malicious-site.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-API-Key" \
     -X OPTIONS \
     https://your-api-gateway-url/search
```

### Test Lambda Authorizer

```bash
# Test with valid API key
curl -H "Authorization: Bearer YOUR_VALID_API_KEY" \
     https://your-api-gateway-url/search

# Test with invalid API key (should fail)
curl -H "Authorization: Bearer INVALID_KEY" \
     https://your-api-gateway-url/search
```

## Rollback Plan

If issues arise after deployment:

1. **Revert CDK changes**
   - Remove authorizer from endpoints
   - Restore `allowOrigins: apigateway.Cors.ALL_ORIGINS`

2. **Redeploy infrastructure**
   ```bash
   cd packages/infrastructure
   npm run deploy
   ```

3. **Investigate logs**
   - Check CloudWatch Logs for authorizer function
   - Check API Gateway logs for authorization failures

## Related Files

- `packages/backend/src/handlers/authorizer.ts` - Lambda authorizer implementation
- `packages/backend/src/config/cors.ts` - CORS configuration
- `packages/backend/src/middleware/auth.ts` - Auth middleware (enhanced for authorizer)
- `packages/backend/src/utils/api-response.ts` - API response utilities (updated for CORS)
- `packages/infrastructure/lib/supporter360-stack.ts` - CDK stack (needs updates)

## Next Steps

1. **worker-infra** should implement the CDK changes described above
2. Add your production origins to `ALLOWED_ORIGINS` in the CORS config
3. Deploy and test thoroughly
4. Monitor CloudWatch logs for authorization patterns
5. Consider adding rate limiting (see epic #11)
