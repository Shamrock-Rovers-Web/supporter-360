# Phase 06: End-to-End Integration Validation

This phase performs comprehensive validation of all four integrations together, ensuring they work correctly as a unified system. This is the final quality gate before marking the project complete.

## Why This Phase Matters

- **System validation**: Ensure all integrations work together without conflicts
- **Data integrity**: Verify supporter profiles aggregate data from all sources
- **Timeline completeness**: Confirm supporter timeline shows all events
- **Production readiness**: Final check before declaring project complete

## Prerequisites

- Phases 01-05 all completed
- All four integrations (Stripe, GoCardless, Mailchimp, Shopify) deployed
- Test data available in all external systems

## Tasks

- [ ] **Create comprehensive test plan**:
  - Document test scenarios covering all integrations
  - Include edge cases: missing supporters, duplicate emails, failed payments
  - Define success criteria for each integration
  - Create test data checklist for each external system
  - Document test execution order

- [ ] **Verify all webhook endpoints are accessible**:
  - Test `GET /webhooks/stripe` (should return 405 Method Not Allowed, but endpoint exists)
  - Test `GET /webhooks/gocardless` (same)
  - Test `GET /webhooks/mailchimp` (same)
  - Test `GET /webhooks/shopify` (same)
  - Verify all endpoints respond with proper CORS headers
  - Document any authentication issues

- [ ] **Test complete Stripe payment flow**:
  - Create new Stripe customer with email: `test-stripe@example.com`
  - Process a test payment
  - Verify supporter is created with correct email
  - Check PaymentEvent appears in timeline
  - Verify membership record is created/updated
  - Confirm Stripe customer ID in linked_ids

- [ ] **Test complete GoCardless payment flow**:
  - Create new GoCardless customer with email: `test-gocardless@example.com`
  - Set up mandate and process test payment
  - Verify supporter is created with correct email
  - Check PaymentEvent appears in timeline
  - Verify mandate is stored in linked_ids.gocardless
  - Confirm membership record is updated

- [ ] **Test complete Mailchimp flow**:
  - Subscribe email `test-mailchimp@example.com` to members audience
  - Verify supporter is created
  - Check SubscribeEvent appears in timeline
  - Verify mailchimp_membership record exists
  - Send test campaign and click link
  - Verify EmailClick event appears in timeline

- [ ] **Test complete Shopify flow**:
  - Create new Shopify customer: `test-shopify@example.com`
  - Create test order for customer
  - Verify supporter is created
  - Check ShopOrder event appears in timeline
  - Verify order details (line items, total) are correct
  - Confirm Shopify customer ID in linked_ids

- [ ] **Test cross-integration supporter merge**:
  - Use same email across all systems: `test-merged@example.com`
  - Create Stripe payment, GoCardless payment, Mailchimp subscription, Shopify order
  - Verify single supporter record exists
  - Check timeline shows events from all sources
  - Verify linked_ids contains all external IDs
  - Confirm mailchimp_membership has correct audience

- [ ] **Test supporter search functionality**:
  - Search for `test-stripe@example.com` - verify found
  - Search for `test-gocardless@example.com` - verify found
  - Search by name if available - verify works
  - Test partial email search: `test-*@example.com`
  - Verify search performance is acceptable

- [ ] **Test timeline aggregation**:
  - Get timeline for merged supporter
  - Verify events are sorted by time (newest first)
  - Check that all event types appear (PaymentEvent, ShopOrder, SubscribeEvent, EmailClick)
  - Verify event metadata is complete
  - Test filtering by event type if supported

- [ ] **Test idempotency across all integrations**:
  - For each integration, send same webhook twice
  - Verify only one event is created per webhook
  - Check that database UNIQUE constraint is enforced
  - Verify no duplicate supporters are created
  - Confirm processors handle duplicates gracefully

- [ ] **Test error handling and DLQs**:
  - Send malformed webhook to each endpoint
  - Verify 400/500 error response
  - Check CloudWatch logs for error details
  - Verify message goes to DLQ if processing fails
  - Test DLQ redrive functionality

- [ ] **Verify S3 raw payload archiving**:
  - For each integration, check S3 bucket for raw payloads
  - Verify key pattern: `{system}/{date}/{uuid}.json`
  - Confirm payload contains original webhook data
  - Check that headers are preserved
  - Verify timestamps are recorded

- [ ] **Test membership status calculations**:
  - Create supporter with Stripe payment - verify Active membership
  - Fail a Stripe payment - verify Past Due status
  - Create supporter with GoCardless payment - verify Active membership
  - Test arrears grace period logic
  - Verify membership.cadence is set correctly

- [ ] **Run all unit tests**:
  - Execute `npm test` across all packages
  - Verify 100% pass rate
  - Check test coverage is adequate
  - Document any tests that are intentionally skipped

- [ ] **Performance validation**:
  - Measure webhook response times (should be < 1 second)
  - Check processor Lambda execution duration
  - Verify database query performance
  - Test with concurrent webhooks (send 10 at once)
  - Check for any bottlenecks

- [ ] **Security validation**:
  - Verify webhook signature verification works for all integrations
  - Check that Secrets Manager is used for credentials
  - Verify no hardcoded secrets in code
  - Test with invalid signatures - should reject
  - Verify CORS headers are correct

- [ ] **Create final integration report**:
  - Document test results for each integration
  - Include screenshots or CLI output of successful tests
  - List any known issues or limitations
  - Create `docs/integration-validation-report.md`
  - Include production URLs and webhook endpoints

- [ ] **Update project documentation**:
  - Update `NOTES.md` with completion status
  - Mark all integrations as "✅ Complete"
  - Remove "Known Issues" that are now fixed
  - Add "Completed Integrations" section with dates
  - Update deployment documentation

- [ ] **Create runbook for operations**:
  - Document common operational tasks
  - Include how to check webhook status
  - Add troubleshooting steps for each integration
  - Document how to replay failed events from DLQ
  - Create `docs/operations/runbook.md`

- [ ] **Final production verification**:
  - Verify all 18 Lambda functions are deployed
  - Check API Gateway is responding correctly
  - Confirm frontend can search and display supporters
  - Test with real production data (read-only)
  - Verify database connections are healthy

## Success Criteria

✅ All four integrations receive and process webhooks correctly
✅ Supporter profiles aggregate data from all sources
✅ Timeline shows events from all integrations in correct order
✅ No data duplication or foreign key violations
✅ All unit tests pass
✅ Webhook signatures are verified for all integrations
✅ Error handling works correctly (DLQs, error responses)
✅ Performance is acceptable (< 1s webhook response)
✅ S3 archiving works for all raw payloads
✅ Documentation is complete and up to date

## Deliverables

- Comprehensive test plan and execution results
- Final integration validation report
- Updated project documentation (NOTES.md)
- Operations runbook for maintenance
- Confirmation that all integrations are production-ready
- Completed project status
