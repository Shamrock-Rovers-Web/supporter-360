# Phase 02: Stripe Integration Complete

This phase completes the Stripe payment integration end-to-end, ensuring webhooks are received correctly, data flows to PostgreSQL, and membership records are updated properly. Stripe is critical for tracking membership payments and detecting arrears.

## Why This Phase Matters

- **Payment tracking**: Stripe is a primary payment method for memberships
- **Arrears detection**: Failed payments need to trigger membership status changes
- **Revenue visibility**: Complete payment history in supporter timeline
- **Foundation for other integrations**: Pattern established here applies to GoCardless

## Prerequisites

- Phase 01 completed (tests passing)
- Stripe account with API access
- Stripe webhook secret (`whsec_...`)
- Stripe API key (`sk_...`)

## Tasks

- [ ] **Research Stripe webhook event structure**:
  - Read Stripe documentation for webhook payload format
  - Document key event types: `payment_intent.succeeded`, `invoice.paid`, `invoice.payment_failed`
  - Understand Stripe signature verification (`Stripe-Signature` header format)
  - Create `docs/research/stripe-webhook-events.md` with event examples

- [ ] **Verify Stripe webhook handler**:
  - Read `packages/backend/src/handlers/webhooks/stripe.handler.ts`
  - Confirm signature verification logic matches Stripe spec
  - Check that raw payloads are archived to S3 with correct key pattern
  - Verify SQS message includes all required fields
  - Test signature verification manually if needed

- [ ] **Review and update Stripe processor**:
  - Read `packages/backend/src/handlers/processors/stripe.processor.ts`
  - Verify event type handling covers: payment_intent.succeeded, charge.succeeded, invoice.paid, invoice.payment_failed
  - Check supporter matching logic (email, customer.id, metadata)
  - Ensure membership updates for recurring payments
  - Verify arrears detection logic (ARREARS_GRACE_DAYS)

- [ ] **Update Stripe types and client**:
  - Review `packages/backend/src/integrations/stripe/types.ts`
  - Ensure StripeEvent, StripeEventData interfaces match actual API
  - Check `packages/backend/src/integrations/stripe/client.ts` for API calls
  - Add any missing fields needed for business logic

- [ ] **Add Stripe credentials to CDK stack**:
  - Read `packages/infrastructure/lib/supporter360-stack.ts` to find credential pattern
  - Add environment variables: `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`
  - Use AWS Secrets Manager for sensitive values (don't hardcode)
  - Ensure Stripe webhook handler has the credentials available

- [ ] **Deploy Stripe Lambda functions**:
  - Run `cd packages/infrastructure && npx cdk deploy --require-approval never`
  - Capture CloudFormation outputs (API Gateway URL, Lambda function names)
  - Verify CloudWatch logs show no initialization errors
  - Document deployment results in `docs/deployment/stripe-deployment.md`

- [ ] **Configure Stripe webhook**:
  - Log into Stripe dashboard
  - Create webhook pointing to: `{API_GATEWAY_URL}/webhooks/stripe`
  - Select events: `payment_intent.succeeded`, `charge.succeeded`, `invoice.paid`, `invoice.payment_failed`, `customer.created`
  - Copy webhook secret and update AWS Secrets Manager if needed
  - Document webhook ID in `docs/credentials/stripe-config.md` (use secure format)

- [ ] **Test Stripe webhook end-to-end**:
  - Use Stripe CLI to send test webhook events locally
  - Or use Stripe dashboard "Send test webhook" feature
  - Verify webhook handler returns 202 Accepted
  - Check CloudWatch logs for processor execution
  - Query PostgreSQL to verify event was created in `event` table
  - Confirm supporter was matched or created
  - Check membership table for updates (if applicable)

- [ ] **Create test Stripe payment**:
  - Use Stripe test mode to create a test payment
  - Verify payment_intent.succeeded event is received
  - Check supporter timeline shows the payment
  - Verify amount and currency are stored correctly
  - Confirm raw payload exists in S3

- [ ] **Test Stripe invoice payment (recurring)**:
  - Create a test subscription in Stripe
  - Trigger an invoice.payment_succeeded event
  - Verify membership status is updated to Active
  - Check next_payment_date is set correctly
  - Test invoice.payment_failed and verify status changes to Past Due

- [ ] **Validate Stripe data flow**:
  - Run `npm test` to ensure Stripe tests still pass
  - Check idempotency: Send same webhook twice, verify only one event created
  - Verify foreign key constraints (supporter_id must exist)
  - Test supporter matching with different email scenarios
  - Test with missing supporter (should create new one)

- [ ] **Document Stripe integration completion**:
  - Create `docs/integrations/stripe-complete.md`
  - Include webhook URL, configured events, and test results
  - Document any limitations or known issues
  - Add troubleshooting section with common errors
  - Link to Stripe dashboard configuration

## Success Criteria

✅ Stripe webhook handler accepts and validates webhooks
✅ Stripe processor creates events in PostgreSQL
✅ Membership records update correctly for payments
✅ Arrears detection works for failed payments
✅ Idempotency prevents duplicate events
✅ Test payments visible in supporter timeline
✅ All Stripe unit tests pass

## Deliverables

- Working Stripe webhook endpoint
- Functional Stripe event processor
- Updated CDK stack with Stripe credentials
- Test payment data in database
- Complete documentation of integration
- Known working webhook URL in production
