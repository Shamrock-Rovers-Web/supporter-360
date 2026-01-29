# Supporter 360 Integration Completion - Auto Run Playbook

This playbook guides an AI coding assistant through completing all four pending integrations (Stripe, GoCardless, Mailchimp, Shopify Orders) and fixing known bugs in the Supporter 360 application.

## Project Overview

**Supporter 360** is a serverless AWS application that consolidates supporter data from multiple systems (Shopify, Future Ticketing, Stripe, GoCardless, Mailchimp) into a unified PostgreSQL database with a React frontend.

**Current Status:**
- ✅ Deployed to production (18 Lambda functions live)
- ✅ Future Ticketing integration working (polling every 5min)
- ✅ Frontend deployed and functional
- 🚧 Four integrations need completion: Stripe, GoCardless, Mailchimp, Shopify Orders
- 🐛 Known bugs: Mailchimp webhook 403 error, failing unit tests

## Mission

Complete all 4 integrations so they're fully functional - receiving webhooks, processing data correctly, writing to PostgreSQL, and returning proper responses. Fix bugs along the way. Ship everything directly to production.

## Playbook Structure

This playbook is organized into **7 sequential phases**, each building on the previous:

### Phase 01: Foundation and Test Fixes
**Critical First Phase** - Fixes failing unit tests and establishes reliable build system. Without passing tests, we cannot validate integration work.

**Delivers:** Working test suite, build validation script, documented test failures and fixes.

### Phase 02: Stripe Integration Complete
Completes the Stripe payment integration - webhooks, processing, membership updates, arrears detection.

**Delivers:** Working Stripe webhook endpoint, payment events in database, membership tracking.

### Phase 03: GoCardless Integration Complete
Completes the GoCardless direct debit integration - webhooks, payment processing, mandate tracking.

**Delivers:** Working GoCardless webhook endpoint, DD payments in database, mandate records.

### Phase 04: Mailchimp Integration Complete
Fixes the 403 webhook error and completes Mailchimp integration - subscribe/unsubscribe/click events, multi-audience support.

**Delivers:** Fixed webhook endpoint (no more 403s), email events in database, audience management.

### Phase 05: Shopify Orders Integration Complete
Adds `read_orders` scope to Shopify app and completes orders integration - orders/create, orders/updated webhooks.

**Delivers:** Working orders webhooks, shop purchase history in database, customer + orders integration.

### Phase 06: End-to-End Integration Validation
Comprehensive validation of all four integrations working together as a unified system.

**Delivers:** Test results for all integrations, verification of data flow, production readiness confirmation.

### Phase 07: Production Launch and Documentation
Final documentation, user guides, runbooks, and project handoff.

**Delivers:** Complete documentation, user guides, operations runbooks, official project completion.

## How to Use This Playbook

Each phase document contains:
- **Clear objective** - What this phase accomplishes and why it matters
- **Prerequisites** - What must be completed before starting
- **Detailed tasks** - Step-by-step instructions with sub-bullets
- **Success criteria** - How to verify the phase is complete
- **Deliverables** - Tangible outputs produced

### Execution Guidelines

1. **Execute phases in order** - Each phase builds on the previous
2. **Complete all tasks in a phase** - Don't skip tasks unless explicitly marked as optional
3. **Validate success criteria** - Before moving to the next phase
4. **Ask for help if stuck** - If a task is unclear or blocked
5. **Document deviations** - If you need to modify the approach, note why

### Task Execution Tips

- **Read files before editing** - Always use the Read tool before making changes
- **Test after changes** - Run `npm test` and `npm run build` after code changes
- **Check logs** - Use CloudWatch logs to debug Lambda issues
- **Be methodical** - Work through tasks systematically, don't rush
- **Verify data flow** - Always check that data makes it from webhook → S3 → SQS → PostgreSQL

## Key Technical Patterns

### Webhook → Queue → Processor → Database

All integrations follow this pattern:

```
External System
  ↓ (webhook)
API Gateway → Lambda (Webhook Handler)
  ↓ (store to S3, queue to SQS)
SQS Queue
  ↓ (poll)
Lambda (Processor) → PostgreSQL
```

### Idempotency

All integrations must be idempotent:
- Database UNIQUE constraint on `(source_system, external_id)`
- Processors check for existing events before creating
- Duplicate webhooks should be safely ignored

### Supporter Matching

Each integration matches supporters by:
1. **Primary email** - First choice
2. **External system ID** - Stored in `linked_ids` JSONB field
3. **Create new supporter** - If no match found

### Error Handling

- Webhook handlers return **202 Accepted** immediately
- Processing failures go to **DLQ** (14-day retention)
- Raw payloads archived to **S3** (90-day retention)

## Architecture Overview

**AWS Components:**
- **API Gateway** - REST API for webhooks and public endpoints
- **Lambda** - Node.js 18 handlers (webhooks, processors, API endpoints, scheduled jobs)
- **SQS + DLQ** - Event queues with 14-day retention
- **RDS PostgreSQL 15** - Primary database in VPC private subnets
- **S3** - Raw webhook payload archiving with Glacier transition
- **EventBridge** - Scheduled reconciliation jobs

**Monorepo Structure:**
```
packages/
├── backend/      - Lambda functions (handlers, repositories, services)
├── database/     - PostgreSQL schema and migrations
├── infrastructure/ - AWS CDK stack definition
├── shared/       - TypeScript types shared across packages
└── frontend/     - React UI with Vite
```

## Prerequisites for Starting

Before beginning Phase 01:

1. **Node.js** installed (v18+)
2. **AWS credentials** configured (for CDK deployment)
3. **PostgreSQL database** access (for testing)
4. **External system credentials** available (Stripe, GoCardless, Mailchimp, Shopify)
5. **Git repository** cloned and checked out to main branch

## Expected Timeline

- **Phase 01:** 2-3 hours (test fixes)
- **Phase 02:** 3-4 hours (Stripe integration)
- **Phase 03:** 3-4 hours (GoCardless integration)
- **Phase 04:** 2-3 hours (Mailchimp integration + bug fix)
- **Phase 05:** 2-3 hours (Shopify orders integration)
- **Phase 06:** 3-4 hours (end-to-end validation)
- **Phase 07:** 2-3 hours (documentation and launch)

**Total: ~17-24 hours** of focused work

## Success Definition

**Project is complete when:**
- ✅ All four integrations receive webhooks without errors
- ✅ All unit tests pass
- ✅ Data flows correctly from webhooks to PostgreSQL
- ✅ Supporter timeline shows events from all sources
- ✅ Documentation is complete and accurate
- ✅ System is production-ready

## Support and Troubleshooting

If you encounter issues:

1. **Check CloudWatch logs** - Each Lambda function has detailed logs
2. **Review DLQ messages** - Failed processing appears here
3. **Verify S3 payloads** - Raw webhooks are archived for inspection
4. **Query PostgreSQL directly** - Check database state
5. **Read the integration docs** - Each integration has specific documentation

## Next Steps

**Start with Phase 01: Foundation and Test Fixes**

Open `/mnt/c/dev/srfc/supporter/supporter-360/Auto Run Docs/Initiation/Phase-01-Foundation-and-Test-Fixes.md` and begin executing tasks systematically.

Good luck! 🚀
