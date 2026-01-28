# Supporter 360 Deployment Status

**Last Updated**: 2026-01-28

## Current Status: 🚀 Ready to Deploy

All code fixes for Lambda bundling and integration configurations are complete. The next deployment will effectively "go live" with the integration backend.

### Pending Action
**Run Deployment**: `cd packages/infrastructure && npx cdk deploy --require-approval never`

## Environment Configuration

### Integration Status
- ✅ **Stripe**: Live keys configured (Secret Key + Webhook Secret).
- ✅ **GoCardless**: Live keys configured (Access Token + Webhook Secret). Environment set to `live`.
- ✅ **Mailchimp**: API Key configured. Webhook secret generated.
- ✅ **Infrastructure**: Stack updated to inject these secrets into Lambda environment variables.

## Deployed Resources

### AWS Infrastructure
- **Status**: ✅ Deployed successfully (159 resources via CDK)
- **Stack Name**: Supporter360Stack
- **Region**: eu-west-1

### Key URLs
- **Frontend**: https://d2vxwivupt334y.cloudfront.net
- **API Gateway**: https://qnaptwn69i.execute-api.eu-west-1.amazonaws.com/prod/
- **Database**: supporter360stack-supporter360database3a977b01-fmhuwxsqutk2.cmfwmmgu7sye.eu-west-1.rds.amazonaws.com

### Webhook Endpoints (to be configured in external systems)
- **Shopify**: `https://qnaptwn69i.execute-api.eu-west-1.amazonaws.com/prod/webhooks/shopify`
- **Stripe**: `https://qnaptwn69i.execute-api.eu-west-1.amazonaws.com/prod/webhooks/stripe`
- **GoCardless**: `https://qnaptwn69i.execute-api.eu-west-1.amazonaws.com/prod/webhooks/gocardless`
- **Mailchimp**: `https://qnaptwn69i.execute-api.eu-west-1.amazonaws.com/prod/webhooks/mailchimp`

## Configuration

### API Keys (configured in Secrets Manager)
- **Stripe**: `sk_live_***` (configured in Secrets Manager)
- **Future Ticketing**: `***` (configured in Secrets Manager)
- **Mailchimp**: `***-us4` (configured in Secrets Manager)
- **Mailchimp Audience ID**: `434727`

### Frontend Environment Variables
- `VITE_API_URL=https://qnaptwn69i.execute-api.eu-west-1.amazonaws.com/prod/`
- `VITE_API_KEY=staff-key-prod-001`

### Database API Keys
- **Staff Key**: `staff-key-prod-001` (role: staff)
- **Admin Key**: `admin-key-prod-001` (role: admin)

## Current Issues

### Blocker: Lambda Module Import Errors
**Error**: `Runtime.ImportModuleError: Error: Cannot find module 'search'`

**Root Cause**:
- The CDK deploys unbundled TypeScript/JavaScript files
- Lambda functions need bundled code with all dependencies (pg, aws-sdk, etc.)
- The `bundle.cjs` script properly bundles dependencies locally, but CDK doesn't use the bundled output

**Affected Functions**:
- SearchHandler
- ProfileHandler
- TimelineHandler
- MergeHandler
- All webhook and processor handlers

## Required Next Steps

### 1. Fix Lambda Bundling (Status: ✅ Resolved)
**Resolution**: 
- Updated root `package.json` to ensure sequential build order (`shared` -> `database` -> `backend`).
- Verified `npm run build` generates `packages/backend/dist` with bundled handlers.
- `bundle.cjs` correctly bundles dependencies and exports `handler`.
- CDK stack already points to `dist`, so next deployment will fix the `ImportModuleError`.

### 2. Update All Lambda Functions
Once bundling is fixed, deploy updated code to:
- `Supporter360Stack-SearchHandler00CE2B50-Mz65J9KLsK1n`
- `Supporter360Stack-ProfileHandler493DBCF6-xxx`
- `Supporter360Stack-TimelineHandler911152F8-xxx`
- All webhook and processor handlers

### 3. Configure External Webhooks
Set up webhooks in:
- Shopify admin panel
- Stripe dashboard
- GoCardless dashboard
- Mailchimp dashboard

### 4. Add Test Data
Populate database with test supporter records to verify:
- Search functionality
- Profile view
- Timeline display
- Merge operations

## Recently Modified Files

### Frontend
- `packages/frontend/.env.production` - Created with API URL and key
- `packages/frontend/src/main.tsx` - Added QueryClientProvider wrapper
- `packages/frontend/package.json` - Fixed build script (removed `tsc`)

### Backend
- `packages/backend/bundle.cjs` - Created esbuild bundling script

### Infrastructure
- `packages/infrastructure/lib/supporter360-stack.ts` - Migration Lambda added, S3 bucket configuration updated

## AWS CLI Commands Reference

### Check Lambda Logs
```bash
AWS_PROFILE=srfc aws logs tail /aws/lambda/Supporter360Stack-SearchHandler00CE2B50-Mz65J9KLsK1n --follow
```

### Test API Directly
```bash
AWS_PROFILE=srfc curl -H "X-API-Key: staff-key-prod-001" \
  "https://qnaptwn69i.execute-api.eu-west-1.amazonaws.com/prod/search?q=test"
```

### Redeploy Frontend
```bash
cd packages/frontend
npm run build
AWS_PROFILE=srfc aws s3 sync dist/ s3://supporter360-frontend-950596328856/ --delete
AWS_PROFILE=srfc aws cloudfront create-invalidation --distribution-id E4VM6KBBELX1M --paths "/*"
```

### Update Lambda Function Code
```bash
# Zip the bundled handler
cd dist/handlers/api
zip search-handler.zip search.handler.js

# Upload to Lambda
AWS_PROFILE=srfc aws lambda update-function-code \
  --function-name Supporter360Stack-SearchHandler00CE2B50-Mz65J9KLsK1n \
  --zip-file fileb://search-handler.zip
```

## CloudFormation Outputs

```
ApiUrl: https://qnaptwn69i.execute-api.eu-west-1.amazonaws.com/prod/
DatabaseEndpoint: supporter360stack-supporter360database3a977b01-fmhuwxsqutk2.cmfwmmgu7sye.eu-west-1.rds.amazonaws.com
DatabaseSecretArn: arn:aws:secretsmanager:eu-west-1:950596328856:secret:Supporter360StackSupporter3-iJ1MdrweCgnW-Qc04La
FrontendBucketName: supporter360-frontend-950596328856
FrontendDistributionDomain: d2vxwivupt334y.cloudfront.net
FrontendDistributionId: E4VM6KBBELX1M
FrontendUrl: https://d2vxwivupt334y.cloudfront.net
RawPayloadsBucketName: supporter360-raw-payloads-950596328856
```
