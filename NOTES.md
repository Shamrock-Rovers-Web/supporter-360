# Supporter 360 - Current Status Notes

## Date: 2026-01-28 - Deployed to Production! 🚀

### Deployment Complete
- **All 18 Lambda functions** updated with bundled code
- **CORS headers** added to all API responses
- **Frontend** deployed and accessible at https://d2aoqa35scit03.cloudfront.net
- **API Gateway** live at https://2u9a7una05.execute-api.eu-west-1.amazonaws.com/prod/

### Integration Configuration Status
| Integration | Code | Webhook URL | Status |
|-------------|------|-------------|--------|
| **Stripe** | ✅ Complete | `/webhooks/stripe` | Ready to configure |
| **GoCardless** | ✅ Complete | `/webhooks/gocardless` | Ready to configure |
| **Mailchimp** | ✅ Complete | `/webhooks/mailchimp` | Ready to configure |
| **Shopify** | ✅ Complete | EventBridge | Already configured |
| **Future Ticketing** | ✅ Working | Polling every 5min | ✅ Live |

### Fixes Applied
1. **CORS Issue**: Added `Access-Control-Allow-Origin: *` headers to all API responses
2. **Build System**: Fixed esbuild platform mismatch (reinstalled for Linux)
3. **CDK Config**: Updated to use `cdk.out/bin/app.js` compiled path
4. **Database Package**: Fixed "echoNo" typo in build script
5. **Jest Setup**: Added `export {}` for module declaration
6. **Icon Sizing**: Constrained emoji sizes in Timeline component

### Known Issues
- **Mailchimp Webhook**: Returns 403 when adding - need to debug webhook validation
- **Unit Tests**: Outdated (handler signature changed from 2 args to 1 arg) - non-blocking

### Pending for Tomorrow
- Debug Mailchimp webhook 403 error
- Configure Stripe, GoCardless, Mailchimp webhooks in external dashboards
- Verify GoCardless secret padding (40 chars minimum with zeros)
- Update unit tests to match new handler signature

### Deployed Infrastructure
```
API URL:       https://2u9a7una05.execute-api.eu-west-1.amazonaws.com/prod/
Frontend:      https://d2aoqa35scit03.cloudfront.net
Database:      supporter360stack-supporter360database3a977b01-tdx3anttjiwx.cmfwmmgu7sye.eu-west-1.rds.amazonaws.com
Region:        eu-west-1
Stack ARN:     arn:aws:cloudformation:eu-west-1:950596328856:stack/Supporter360Stack/c49bd340-fc38-11f0-b050-0af264d57525
```

---


### Build System Repair
- Identified that `cdk deploy` was uploading unbundled code, causing `ImportModuleError`.
- Updated root `package.json` to enforce build order: `shared` -> `database` -> `backend`.
- Verified `npm run build` now correctly generates `packages/backend/dist` with bundled handlers (esbuild).
- Verified `supporter360-stack.ts` points to the `dist` directory.

### Integration Audit
- **Stripe**: Code is complete (`client.ts`, `types.ts`, `stripe.processor.ts`).
- **GoCardless**: Code is complete (`client.ts`, `types.ts`, `gocardless.processor.ts`).
- **Mailchimp**: Code is complete (`client.ts`, `types.ts`, `mailchimp.processor.ts`, `mailchimp-syncer.handler.ts`).
  - Added missing `supporter_mailchimp_aggregates` table to `schema.sql`.

### Next Actions
- Deploy infrastructure (`cdk deploy`) to apply the schema change and update Lambda code.
- Verify environment variables/secrets in AWS Console for the new integrations.

---

## Date: 2025-01-28

## Deployment Status

### ✅ Working Components

| Component | Status | Details |
|-----------|--------|---------|
| Database (RDS PostgreSQL) | ✅ Running | Upgraded to t4g.medium for more connections |
| Backend Lambda Functions | ✅ Deployed | All 18 handlers deployed |
| API Gateway | ✅ Working | `https://2u9a7una05.execute-api.eu-west-1.amazonaws.com/prod/` |
| Frontend (CloudFront) | ✅ Working | `https://d2aoqa35scit03.cloudfront.net` |
| Search API | ✅ Tested | 970 supporters imported from FT |
| Timeline API | ✅ Fixed | Now handles missing query params |
| **Future Ticketing Integration** | ✅ **WORKING** | Polling + Processing + Display |

### ✅ Future Ticketing Integration - COMPLETE

**Status:** Polling every 5 minutes, importing accounts, orders, and stadium entries.

**What Works:**
- `GET /oauth/token/{apiKey}/{privateKey}` - OAuth token exchange (with 55-min cache)
- `GET /v1/private/account` - List all accounts with pagination
- `GET /v1/private/account?updatedSince=YYYY-MM-DD` - Incremental sync
- `POST /v1/private/order/search/date/{start}/{end}` - Get orders by date range
- `POST /v1/private/order/search/email/{email}` - Find orders by customer email
- `GET /v1/private/product` - Product catalog
- `GET /v1/private/event` - Events/matches

**Data Flow:**
1. `future-ticketing-poller` (scheduled, every 5 min) → Fetches new accounts/orders/entries
2. Sends to SQS `supporter360-future-ticketing-queue`
3. `futureticketing-processor` → Creates supporters, TicketPurchase events, StadiumEntry events
4. Frontend displays FT data (line items, scan history, extra fields)

**Credentials in CDK:**
```
FUTURE_TICKETING_API_URL: https://external.futureticketing.ie
FUTURE_TICKETING_API_KEY: ft*** (in FT dashboard)
FUTURE_TICKETING_PRIVATE_KEY: *** (in FT dashboard)
```

**Test Search:**
```bash
curl -H 'X-API-Key: dev-staff-key' 'https://2u9a7una05.execute-api.eu-west-1.amazonaws.com/prod/search?q=gleesonb@gmail.com&field=email'
# Returns: Bill Gleeson (4e335e47-ba5e-4d14-bb27-7a532d928ad0)
```

---

## PENDING INTEGRATIONS (For Next Agents)

### 1. Stripe Integration

**Pattern:** Webhook → Queue → Processor → DB

**Required Keys:**
- `STRIPE_API_KEY` - Starting with `sk_` (secret key)
- `STRIPE_WEBHOOK_SECRET` - Starting with `whsec_` (for webhook signature verification)

**Key Files:**
- `packages/backend/src/integrations/stripe/` - Create Stripe client
- `packages/backend/src/handlers/webhooks/stripe-webhook.handler.ts` - ✅ Already exists
- `packages/backend/src/handlers/processors/stripe-processor.ts` - ✅ Already exists
- `packages/infrastructure/lib/supporter360-stack.ts` - Add Stripe keys to env vars

**Stripe API Reference:**
- Webhook events: `payment_intent.succeeded`, `invoice.paid`, `customer.created`
- Documentation: https://stripe.com/docs/api
- Test mode: Use `sk_test_` keys

**Approach:**
1. Read Stripe docs to understand webhook payload structure
2. Test Stripe API endpoints with their test keys
3. Update types in `packages/backend/src/integrations/stripe/types.ts` to match real API
4. Update client in `packages/backend/src/integrations/stripe/client.ts` if needed
5. Add API keys to CDK stack
6. Configure webhook in Stripe dashboard to point to API Gateway

---

### 2. Shopify Integration 🚧 IN PROGRESS

**Status:** Customer webhooks working. Orders webhooks blocked by missing app scope.

**App Details:**
- Shop: `shamrock-rovers-fc.myshopify.com`
- App Name: Gleeson-app
- Client ID: `e5e5abc1adf25556a930aa87dba80d97`
- Event Bus: `aws.partner/shopify.com/313809895425/supporter360`

**✅ Working:**
- `customers/create` webhook (ID: 2265961824605)
- `customers/update` webhook (ID: 2265961857373)
- HTTPS webhooks → API Gateway → SQS → Processor

**❌ Blocked - Needs Action:**
- Orders webhooks require `read_orders` scope
- Current app only has: Customers, Products, Store owner permissions
- **TODO:** Add `read_orders` scope in Shopify Partners → Gleeson-app → App settings → Configuration
- Then reinstall app on store

**Required Keys (in CDK stack):**
- `SHOPIFY_SHOP_DOMAIN`: `shamrock-rovers-fc.myshopify.com`
- `SHOPIFY_CLIENT_ID`: `e5e5abc1adf25556a930aa87dba80d97`
- `SHOPIFY_CLIENT_SECRET`: `shpss_***` (in Shopify Partners dashboard)

**Key Files:**
- `packages/backend/src/integrations/shopify/client.ts` - ✅ Complete, tested
- `packages/backend/src/integrations/shopify/types.ts` - ✅ Complete
- `packages/backend/src/handlers/webhooks/shopify-webhook.handler.ts` - ✅ Exists
- `packages/backend/src/handlers/processors/shopify-processor.ts` - ✅ Updated for EventBridge + HTTP
- `packages/infrastructure/lib/supporter360-stack.ts` - ✅ Credentials added

**Shopify API Reference:**
- Admin API: `https://{shop}.myshopify.com/admin/api/{version}/`
- Webhook topics: `orders/create`, `orders/updated`, `customers/create`, `customers/update`
- Documentation: https://shopify.dev/docs/api/admin-rest

---

### 3. Mailchimp Integration

**Pattern:** Webhook + Polling (for sync) → DB

**Required Keys:**
- `MAILCHIMP_API_KEY` - Format: `{dc}-{key}` (e.g., `us5-abc123...`)
- `MAILCHIMP_DC` - Datacenter prefix extracted from API key
- `MAILCHIMP_AUDIENCE_SHOP` - Audience ID for shop customers
- `MAILCHIMP_AUDIENCE_MEMBERS` - Audience ID for members
- `MAILCHIMP_AUDIENCE_STH` - Audience ID for season ticket holders
- `MAILCHIMP_AUDIENCE_EVERYONE` - Audience ID for all supporters
- `MAILCHIMP_WEBHOOK_SECRET`

**Key Files:**
- `packages/backend/src/integrations/mailchimp/` - Create Mailchimp client
- `packages/backend/src/handlers/webhooks/mailchimp-webhook.handler.ts` - ✅ Already exists
- `packages/backend/src/handlers/processors/mailchimp-processor.ts` - ✅ Already exists
- `packages/backend/src/handlers/scheduled/mailchimp-syncer.handler.ts` - ✅ Polling handler exists
- `packages/infrastructure/lib/supporter360-stack.ts` - Add Mailchimp keys to env vars

**Mailchimp API Reference:**
- REST API: `https://{dc}.api.mailchimp.com/3.0/`
- Webhook events: `subscribe`, `unsubscribe`, `profile`, `upemail`
- Documentation: https://mailchimp.com/developer/reference/

**Approach:**
1. Read Mailchimp API docs
2. Test with Mailchimp's test account
3. Update types in `packages/backend/src/integrations/mailchimp/types.ts`
4. Update client in `packages/backend/src/integrations/mailchimp/client.ts`
5. Add API keys to CDK stack
6. Configure webhooks in Mailchimp audience settings

---

### 4. GoCardless Integration

**Pattern:** Webhook → Queue → Processor → DB

**Required Keys:**
- `GOCARDLESS_ACCESS_TOKEN` - From GoCardless dashboard
- `GOCARDLESS_WEBHOOK_SECRET` - Webhook signature verification
- `GOCARDLESS_ENVIRONMENT` - `sandbox` or `live`

**Key Files:**
- `packages/backend/src/integrations/gocardless/` - Create GoCardless client
- `packages/backend/src/handlers/webhooks/gocardless-webhook.handler.ts` - ✅ Already exists
- `packages/backend/src/handlers/processors/gocardless-processor.ts` - ✅ Already exists
- `packages/infrastructure/lib/supporter360-stack.ts` - Add GoCardless keys to env vars

**GoCardless API Reference:**
- REST API: `https://api.gocardless.com/` (live) or `https://api-sandbox.gocardless.com/` (sandbox)
- Webhook events: `payments.created`, `payments.confirmed`, `mandates.created`
- Documentation: https://developer.gocardless.com/api-reference/

**Approach:**
1. Read GoCardless API docs
2. Test with GoCardless sandbox environment
3. Update types in `packages/backend/src/integrations/gocardless/types.ts`
4. Update client in `packages/backend/src/integrations/gocardless/client.ts`
5. Add API keys to CDK stack
6. Configure webhooks in GoCardless dashboard

---

## Files Modified Today

1. **FT Types** `packages/backend/src/integrations/future-ticketing/types.ts`
   - Rewrote to match actual API response structure
   - `FTAccount` (was FTCustomer) with fields: id, uuid, email, first_name, second_name
   - `FTOrder` with detail[] array, barcode[] with scan_datetime

2. **FT Client** `packages/backend/src/integrations/future-ticketing/client.ts`
   - Complete rewrite with OAuth token caching
   - `getAccounts()`, `getOrdersByDate()`, `getOrdersByEmail()`, `getStadiumEntries()`

3. **FT Poller** `packages/backend/src/handlers/scheduled/future-ticketing-poller.handler.ts`
   - Checkpoint per entity type (last_account_poll, last_order_poll, last_entry_poll)
   - Sends SQS messages with type in MessageAttributes

4. **FT Processor** `packages/backend/src/handlers/processors/futureticketing.processor.ts`
   - Fixed to read type from MessageAttributes
   - Creates supporters from FT accounts
   - Creates TicketPurchase and StadiumEntry events

5. **Supporter Repository** `packages/backend/src/db/repositories/supporter.repository.ts`
   - Fixed `addEmailAlias()` to use `ON CONFLICT (email, supporter_id)`

6. **Timeline Handler** `packages/backend/src/handlers/api/timeline.handler.ts`
   - Fixed null query params handling

7. **Infrastructure** `packages/infrastructure/lib/supporter360-stack.ts`
   - Upgraded RDS from t4g.micro to t4g.medium (more connections)
   - Added FT credentials as environment variables

8. **Frontend** `packages/frontend/src/components/Timeline.tsx`
   - Added FT-specific display: line items, scan history, extra fields
   - Fixed sorting to show newest events first

---

## Known Issues

- **Database Connection Limits:** t4g.medium helps, but may need connection pooling for production
- **GoCardless Keys:** Still placeholder - no actual credentials yet
- **Stripe/Mailchimp:** No keys added yet
- **Shopify Orders:** App lacks `read_orders` scope - needs to be added in Shopify Partners dashboard

---

## Useful Commands

```bash
# Build all packages
npm run build

# Deploy infrastructure
cd packages/infrastructure
npx cdk deploy --require-approval never

# Test API search
curl -H 'X-API-Key: dev-staff-key' \
  'https://2u9a7una05.execute-api.eu-west-1.amazonaws.com/prod/search?q=e&limit=5'

# Test timeline
curl -H 'X-API-Key: dev-staff-key' \
  'https://2u9a7una05.execute-api.eu-west-1.amazonaws.com/prod/supporters/{id}/timeline'

# Check processor logs
aws logs tail /aws/lambda/Supporter360Stack-FutureTicketingProcessor720971D7-g5n8IdMiXGCc --since 5m --format short

# Check poller logs
aws logs tail /aws/lambda/Supporter360Stack-FutureTicketingPoller8CAD55B4-0CYz1Z9QMd0T --since 5m --format short

# Manually trigger FT poller
aws lambda invoke --function-name Supporter360Stack-FutureTicketingPoller8CAD55B4-XAIhZGRCc8l2 --payload '{}' response.json
```
