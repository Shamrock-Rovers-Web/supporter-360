# Phase 05: Shopify Orders Integration Complete

This phase completes the Shopify orders integration. Currently, Shopify customer webhooks are working, but orders webhooks are blocked due to missing `read_orders` scope in the Shopify app configuration. This phase will fix the scope issue and ensure order data flows correctly.

## Why This Phase Matters

- **Purchase history**: Track merchandise purchases in supporter timeline
- **Revenue insights**: Understand shop spending patterns
- **Complete profile**: Orders are key supporter engagement data
- **Already partially working**: Customer webhooks work, just need orders enabled

## Prerequisites

- Phase 01 completed (tests passing)
- Phases 02-04 completed (other integrations working)
- Shopify Partners account access
- Shopify app (Gleeson-app) already installed on shamrock-rovers-fc.myshopify.com
- Ability to update app scopes and reinstall

## Tasks

- [ ] **Research Shopify orders webhook requirements**:
  - Read Shopify webhook documentation for orders
  - Document required scopes: `read_orders`, `read_products`
  - Understand orders/create and orders/updated webhook payloads
  - Create `docs/research/shopify-orders-webhooks.md` with event examples

- [ ] **Verify Shopify orders webhook handler**:
  - Read `packages/backend/src/handlers/webhooks/shopify.handler.ts`
  - Confirm handler supports both HTTP and EventBridge sources
  - Check HMAC signature verification for orders webhooks
  - Verify order payload parsing logic
  - Ensure raw payloads are archived to S3

- [ ] **Review Shopify orders processor**:
  - Read `packages/backend/src/handlers/processors/shopify.processor.ts`
  - Verify orders/create and orders/updated event handling
  - Check supporter matching logic (customer.email, customer.id)
  - Ensure ShopOrder events are created with correct metadata
  - Verify order line items are stored in event metadata
  - Check that order totals and currency are captured

- [ ] **Verify Shopify client and types**:
  - Review `packages/backend/src/integrations/shopify/types.ts`
  - Ensure ShopifyOrder, ShopifyCustomer interfaces match API
  - Check `packages/backend/src/integrations/shopify/client.ts`
  - Verify order fetching functions work if needed

- [ ] **Update Shopify app scopes in Shopify Partners**:
  - Log into Shopify Partners dashboard
  - Navigate to Apps → Gleeson-app → App settings → Configuration
  - Add `read_orders` scope to app permissions
  - Add any other missing scopes (e.g., `read_products` if needed)
  - Save changes

- [ ] **Reinstall Shopify app on store**:
  - After updating scopes, reinstall the app on shamrock-rovers-fc.myshopify.com
  - Verify installation succeeds
  - Check that new webhooks can be created with orders scope
  - Document app version and scopes in `docs/credentials/shopify-config.md`

- [ ] **Configure Shopify orders webhooks**:
  - Create orders/create webhook pointing to: `{API_GATEWAY_URL}/webhooks/shopify`
  - Create orders/updated webhook pointing to same endpoint
  - Alternatively, use EventBridge if that's the current pattern
  - Verify HMAC secret is configured correctly
  - Document webhook IDs

- [ ] **Deploy Shopify Lambda functions (if needed)**:
  - If any code changes were made, run `cd packages/infrastructure && npx cdk deploy --require-approval never`
  - Verify CloudWatch logs show no initialization errors
  - Check that both customer and orders webhooks work

- [ ] **Test Shopify orders/create webhook**:
  - Create a test order in Shopify dashboard
  - Verify orders/create event is received
  - Check processor creates ShopOrder event in PostgreSQL
  - Verify supporter is matched via customer email
  - Confirm order details (total, items, currency) are stored
  - Check raw payload exists in S3

- [ ] **Test Shopify orders/updated webhook**:
  - Update a test order in Shopify (e.g., add a tag)
  - Verify orders/updated event is received
  - Check that event is deduplicated (same external_id)
  - Verify metadata is updated if needed
  - Test that order financial status changes are captured

- [ ] **Test order with existing customer**:
  - Create an order for a customer that already exists (from customer webhook)
  - Verify order is linked to correct supporter
  - Check that supporter.linked_ids.shopify is populated
  - Test that customer and order webhooks work together

- [ ] **Test order with new customer**:
  - Create an order for a completely new customer
  - Verify processor creates new supporter record
  - Check that email alias is created
  - Confirm both customer and order data are captured

- [ ] **Validate Shopify orders data flow**:
  - Run Shopify-specific unit tests
  - Check idempotency with duplicate order webhooks
  - Verify foreign key constraints
  - Test supporter matching with various email scenarios
  - Test order line items are parsed correctly

- [ ] **Test EventBridge pattern (if used)**:
  - If Shopify uses EventBridge instead of HTTP webhooks
  - Verify EventBridge rule matches orders/create and orders/updated
  - Check that Lambda target processes orders correctly
  - Confirm EventBridge and HTTP patterns coexist if needed

- [ ] **Verify customer + orders integration**:
  - Create a new customer and order in sequence
  - Verify customer webhook creates supporter
  - Verify order webhook creates ShopOrder event
  - Check that both events appear in supporter timeline
  - Test that customer updates and order updates work independently

- [ ] **Document Shopify orders integration completion**:
  - Create `docs/integrations/shopify-orders-complete.md`
  - Include webhook URLs, configured events, test results
  - Document scope change and reinstallation process
  - Add troubleshooting section
  - Link to Shopify app configuration
  - Document both customer and order webhooks

## Success Criteria

✅ Shopify app has read_orders scope
✅ Orders webhooks are configured and receiving events
✅ Orders processor creates ShopOrder events in PostgreSQL
✅ Orders are linked to correct supporters
✅ Order metadata includes line items, totals, currency
✅ Customer and orders webhooks work together seamlessly
✅ Idempotency prevents duplicate events
✅ All Shopify unit tests pass

## Deliverables

- Shopify app with correct scopes installed
- Working orders webhooks (create and updated)
- Functional Shopify orders processor
- Test order data in database
- Complete documentation of integration
- Validated webhook URLs in production
- Verified integration with customer webhooks
