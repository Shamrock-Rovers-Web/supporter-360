# Phase 04: Mailchimp Integration Complete

This phase completes the Mailchimp integration, which is currently experiencing a 403 webhook error. Mailchimp provides email marketing automation, audience management, and campaign engagement tracking. This phase will fix the webhook issue and ensure all Mailchimp data syncs correctly.

## Why This Phase Matters

- **Email engagement**: Track opens, clicks, and campaign engagement
- **Audience management**: Multiple audiences (shop, members, season ticket holders, everyone)
- **Marketing insights**: Understand which supporters are engaged with emails
- **Tag synchronization**: Keep Mailchimp tags in sync with supporter data
- **Critical bug fix**: 403 webhook error is blocking all Mailchimp data

## Prerequisites

- Phase 01 completed (tests passing)
- Phase 02-03 completed (payment integrations working)
- Mailchimp account with API access
- Mailchimp API key (format: `{dc}-{key}`)
- Audience IDs for all four Mailchimp lists

## Tasks

- [ ] **Investigate Mailchimp 403 webhook error**:
  - Read CloudWatch logs for Mailchimp webhook handler Lambda
  - Identify the exact error causing 403 response
  - Check if it's authentication, validation, or signature verification
  - Review `packages/backend/src/handlers/webhooks/mailchimp.handler.ts` line 54
  - Document root cause in `docs/research/mailchimp-403-error-analysis.md`

- [ ] **Research Mailchimp webhook format**:
  - Read Mailchimp webhook documentation
  - Note that Mailchimp webhooks are form-urlencoded (not JSON)
  - Document event types: `subscribe`, `unsubscribe`, `profile`, `upemail`, `click`
  - Understand that Mailchimp has limited signature verification
  - Create `docs/research/mailchimp-webhook-events.md` with examples

- [ ] **Fix Mailchimp webhook handler**:
  - Address the 403 error root cause identified above
  - If signature verification is too strict, relax it (Mailchimp webhooks have weak security)
  - Ensure form-encoded body is parsed correctly
  - Verify `type` and `data` fields are extracted
  - Add CORS headers if missing
  - Test with sample Mailchimp webhook payload

- [ ] **Review Mailchimp processor**:
  - Read `packages/backend/src/handlers/processors/mailchimp.processor.ts`
  - Verify event type handling: subscribe, unsubscribe, profile, upemail, click
  - Check supporter matching logic (email is primary identifier)
  - Ensure mailchimp_membership table is updated correctly
  - Verify tag synchronization works

- [ ] **Update Mailchimp types and client**:
  - Review `packages/backend/src/integrations/mailchimp/types.ts`
  - Ensure MailchimpWebhook, MailchimpContact interfaces match API
  - Check `packages/backend/src/integrations/mailchimp/client.ts` for API calls
  - Add support for click events with campaign_id and URL
  - Verify audience management functions

- [ ] **Add Mailchimp credentials to CDK stack**:
  - Add environment variables: `MAILCHIMP_API_KEY`, `MAILCHIMP_DC`, `MAILCHIMP_WEBHOOK_SECRET`
  - Add audience IDs: `MAILCHIMP_AUDIENCE_SHOP`, `MAILCHIMP_AUDIENCE_MEMBERS`, `MAILCHIMP_AUDIENCE_STH`, `MAILCHIMP_AUDIENCE_EVERYONE`
  - Use AWS Secrets Manager for sensitive values
  - Extract datacenter prefix from API key if needed

- [ ] **Deploy Mailchimp Lambda functions**:
  - Run `cd packages/infrastructure && npx cdk deploy --require-approval never`
  - Capture CloudFormation outputs
  - Verify CloudWatch logs show no initialization errors
  - Document deployment results in `docs/deployment/mailchimp-deployment.md`

- [ ] **Configure Mailchimp webhooks**:
  - Log into Mailchimp dashboard for each audience
  - Create webhook pointing to: `{API_GATEWAY_URL}/webhooks/mailchimp`
  - Enable events: subscribe, unsubscribe, profile, upemail, click
  - Copy webhook secret (if available) and update AWS Secrets Manager
  - Document webhook IDs for each audience in `docs/credentials/mailchimp-config.md`

- [ ] **Test Mailchimp subscribe webhook**:
  - Add a test email to one Mailchimp audience
  - Verify subscribe event is received
  - Check processor creates event in PostgreSQL
  - Verify mailchimp_membership record is created
  - Confirm tags are synced

- [ ] **Test Mailchimp unsubscribe webhook**:
  - Unsubscribe a test email from Mailchimp
  - Verify unsubscribe event is received
  - Check mailchimp_membership status is updated
  - Verify event is logged in timeline

- [ ] **Test Mailchimp click tracking**:
  - Send a test campaign to a test email
  - Click a link in the email
  - Verify click webhook is received
  - Check that EmailClick event is created in PostgreSQL
  - Verify campaign_id and URL are stored
  - Test that click appears in supporter timeline

- [ ] **Verify multi-audience support**:
  - Add same email to multiple audiences
  - Verify multiple mailchimp_membership records are created
  - Check that each audience has correct tags
  - Test that removing from one audience doesn't affect others

- [ ] **Test Mailchimp polling sync (if implemented)**:
  - Read `packages/backend/src/handlers/scheduled/mailchimp-syncer.handler.ts`
  - Verify scheduled job runs successfully
  - Check that supporter data is synced to Mailchimp
  - Ensure tags are pushed to Mailchimp correctly
  - Test bidirectional sync (webhook + polling)

- [ ] **Validate Mailchimp data flow**:
  - Run Mailchimp-specific unit tests
  - Check idempotency with duplicate webhooks
  - Verify foreign key constraints
  - Test supporter matching by email
  - Test that email changes (upemail) are handled

- [ ] **Document Mailchimp integration completion**:
  - Create `docs/integrations/mailchimp-complete.md`
  - Include webhook URL, configured events, test results
  - Document how 403 error was fixed
  - Add troubleshooting section
  - Link to Mailchimp dashboard configuration
  - Document all four audiences and their purposes

## Success Criteria

✅ Mailchimp webhook handler accepts requests without 403 errors
✅ Subscribe events create mailchimp_membership records
✅ Unsubscribe events update membership status
✅ Click events create EmailClick events in timeline
✅ Multi-audience support works correctly
✅ Tags sync between database and Mailchimp
✅ Idempotency prevents duplicate events
✅ All Mailchimp unit tests pass

## Deliverables

- Fixed Mailchimp webhook endpoint (no more 403 errors)
- Functional Mailchimp event processor
- Updated CDK stack with Mailchimp credentials
- Test subscribe/unsubscribe/click data in database
- Complete documentation of integration and fix
- Working webhooks for all four audiences
- Validated webhook URLs in production
