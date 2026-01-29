# Phase 03: GoCardless Integration Complete

This phase completes the GoCardless direct debit integration, which is the second payment method after Stripe. GoCardless handles recurring payments for memberships and needs to sync supporter data, payment events, and mandate status changes.

## Why This Phase Matters

- **Direct debit support**: GoCardless is the primary payment method for European supporters
- **Recurring payments**: Most memberships use GoCardless for monthly/annual collection
- **Payment method diversity**: Supporters can choose between Stripe (card) and GoCardless (DD)
- **Mandate tracking**: Need to track when mandates are created, cancelled, or failed

## Prerequisites

- Phase 01 completed (tests passing)
- Phase 02 completed (Stripe working as reference pattern)
- GoCardless account with API access
- GoCardless access token
- GoCardless webhook secret (minimum 40 characters, pad with zeros if needed)

## Tasks

- [ ] **Research GoCardless API and webhooks**:
  - Read GoCardless API documentation for payment flows
  - Document key webhook events: `payments.created`, `payments.confirmed`, `payments.failed`, `mandates.created`, `mandates.cancelled`
  - Understand GoCardless signature verification (HMAC SHA-256)
  - Create `docs/research/gocardless-webhook-events.md` with event examples

- [ ] **Verify GoCardless webhook handler**:
  - Read `packages/backend/src/handlers/webhooks/gocardless.handler.ts`
  - Confirm signature verification uses HMAC SHA-256 correctly
  - Check that raw payloads are archived to S3
  - Verify SQS message includes all required fields
  - Ensure webhook secret validation works with 40+ character secrets

- [ ] **Review and update GoCardless processor**:
  - Read `packages/backend/src/handlers/processors/gocardless.processor.ts`
  - Verify event type handling covers: payments.created, payments.confirmed, payments.failed, mandates.created, mandates.cancelled
  - Check supporter matching logic (email, metadata, links)
  - Ensure membership updates for confirmed payments
  - Verify mandate status tracking in supporter metadata

- [ ] **Update GoCardless types and client**:
  - Review `packages/backend/src/integrations/gocardless/types.ts`
  - Ensure GoCardlessPayment, GoCardlessMandate interfaces match actual API
  - Check `packages/backend/src/integrations/gocardless/client.ts` for API calls
  - Add any missing fields needed for business logic
  - Verify sandbox vs. live environment switching

- [ ] **Add GoCardless credentials to CDK stack**:
  - Add environment variables: `GOCARDLESS_ACCESS_TOKEN`, `GOCARDLESS_WEBHOOK_SECRET`, `GOCARDLESS_ENVIRONMENT`
  - Use AWS Secrets Manager for sensitive values
  - Ensure webhook secret is at least 40 characters (pad with zeros if needed)
  - Document credential format in code comments

- [ ] **Deploy GoCardless Lambda functions**:
  - Run `cd packages/infrastructure && npx cdk deploy --require-approval never`
  - Capture CloudFormation outputs
  - Verify CloudWatch logs show no initialization errors
  - Document deployment results in `docs/deployment/gocardless-deployment.md`

- [ ] **Configure GoCardless webhook**:
  - Log into GoCardless dashboard (use sandbox for testing)
  - Create webhook pointing to: `{API_GATEWAY_URL}/webhooks/gocardless`
  - Select all payment and mandate events
  - Copy webhook secret and update AWS Secrets Manager
  - Pad secret with zeros to reach 40 characters if needed
  - Document webhook ID in `docs/credentials/gocardless-config.md`

- [ ] **Test GoCardless payment flow**:
  - Use GoCardless sandbox to create a test payment
  - Verify payments.created event is received
  - Check processor creates event in PostgreSQL
  - Verify supporter is matched or created
  - Confirm raw payload exists in S3

- [ ] **Test GoCardless mandate flow**:
  - Create a test mandate in GoCardless sandbox
  - Trigger mandates.created webhook
  - Verify mandate ID is stored in supporter.linked_ids.gocardless
  - Test mandates.cancelled and verify metadata is updated
  - Check that mandate status changes are logged

- [ ] **Test recurring payment cycle**:
  - Set up a test recurring payment in sandbox
  - Trigger payments.confirmed event
  - Verify membership status updates to Active
  - Check next_payment_date is calculated correctly
  - Test payments.failed and verify arrears detection

- [ ] **Validate GoCardless data flow**:
  - Run GoCardless-specific unit tests
  - Check idempotency with duplicate webhooks
  - Verify foreign key constraints
  - Test supporter matching with GoCardless customer ID
  - Test payment amount and currency handling (EUR/GBP)

- [ ] **Compare with Stripe implementation**:
  - Verify both payment methods create consistent event records
  - Check membership updates work identically
  - Ensure supporter matching logic is consistent
  - Validate that both payment methods appear in timeline

- [ ] **Document GoCardless integration completion**:
  - Create `docs/integrations/gocardless-complete.md`
  - Include webhook URL, configured events, test results
  - Document sandbox vs. production differences
  - Add troubleshooting section
  - Link to GoCardless dashboard configuration

## Success Criteria

✅ GoCardless webhook handler accepts and validates webhooks
✅ GoCardless processor creates events in PostgreSQL
✅ Mandate tracking works correctly
✅ Membership records update for confirmed payments
✅ Arrears detection works for failed payments
✅ Idempotency prevents duplicate events
✅ Test payments visible in supporter timeline
✅ Both Stripe and GoCardless payments coexist correctly
✅ All GoCardless unit tests pass

## Deliverables

- Working GoCardless webhook endpoint
- Functional GoCardless event processor
- Updated CDK stack with GoCardless credentials
- Test payment and mandate data in database
- Complete documentation of integration
- Validated webhook URL in production
- Comparison document showing Stripe/GoCardless consistency
