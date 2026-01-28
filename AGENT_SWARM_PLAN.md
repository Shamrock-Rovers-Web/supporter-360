# Agent Swarm Plan: Payment & Integration Providers

## Context

This plan prepares an agent swarm to implement the remaining integrations for Supporter 360:
- **Stripe** - Payment webhooks (payment_intent.succeeded, invoice.paid, customer.created)
- **Mailchimp** - Newsletter webhooks + polling (subscribe, unsubscribe, profile updates)
- **GoCardless** - Direct debit webhooks (payments.created, mandates.created)

## Swarm Architecture

Based on ACFS patterns, we'll use a coordinated multi-agent approach:

```
Agent Swarm: Integration Implementers
├── Agent 1 (Stripe)      → Stripe client + types + processor
├── Agent 2 (Mailchimp)   → Mailchimp client + types + processor + poller
├── Agent 3 (GoCardless)  → GoCardless client + types + processor
└── Agent 4 (Orchestrator) → Infrastructure updates, deployment, validation
```

## Coordination Protocol

### 1. File Reservation System (via Agent Mail pattern)

Each agent reserves their working directories to prevent conflicts:

```yaml
reservations:
  agent-1-stripe:
    paths:
      - "packages/backend/src/integrations/stripe/**"
      - "packages/backend/src/handlers/webhooks/stripe-webhook.handler.ts"
      - "packages/backend/src/handlers/processors/stripe-processor.ts"
    exclusive: true
    ttl_seconds: 3600

  agent-2-mailchimp:
    paths:
      - "packages/backend/src/integrations/mailchimp/**"
      - "packages/backend/src/handlers/webhooks/mailchimp-webhook.handler.ts"
      - "packages/backend/src/handlers/processors/mailchimp-processor.ts"
      - "packages/backend/src/handlers/scheduled/mailchimp-syncer.handler.ts"
    exclusive: true
    ttl_seconds: 3600

  agent-3-gocardless:
    paths:
      - "packages/backend/src/integrations/gocardless/**"
      - "packages/backend/src/handlers/webhooks/gocardless-webhook.handler.ts"
      - "packages/backend/src/handlers/processors/gocardless-processor.ts"
    exclusive: true
    ttl_seconds: 3600

  agent-4-orchestrator:
    paths:
      - "packages/infrastructure/lib/supporter360-stack.ts"
      - "packages/database/schema.sql"
    exclusive: true
    ttl_seconds: 3600
```

### 2. Communication Channels

```yaml
threads:
  - name: "integration-progress"
    purpose: "Status updates, completion notifications"

  - name: "integration-blockers"
    purpose: "Report API issues, missing credentials, blocking problems"

  - name: "integration-review"
    purpose: "Cross-review before merging"
```

## Agent Tasks

### Agent 1: Stripe Integration

**Objective:** Implement Stripe webhook ingestion and processing

**Tasks:**
1. Read Stripe API documentation for webhook events
2. Create `packages/backend/src/integrations/stripe/client.ts`
3. Create `packages/backend/src/integrations/stripe/types.ts`
4. Update `packages/backend/src/handlers/processors/stripe-processor.ts`
5. Test with Stripe test keys (if available)
6. Document required environment variables

**API Reference:**
- Webhook events: `payment_intent.succeeded`, `invoice.paid`, `customer.created`
- Documentation: https://stripe.com/docs/api
- Test mode: Use `sk_test_` keys

**Required Keys (placeholder):**
- `STRIPE_API_KEY` - Starting with `sk_` (secret key)
- `STRIPE_WEBHOOK_SECRET` - Starting with `whsec_`

**Entry Points:**
- Webhook handler already exists: `packages/backend/src/handlers/webhooks/stripe-webhook.handler.ts`
- Processor already exists: `packages/backend/src/handlers/processors/stripe-processor.ts`

---

### Agent 2: Mailchimp Integration

**Objective:** Implement Mailchimp webhook ingestion + polling sync

**Tasks:**
1. Read Mailchimp API documentation
2. Create `packages/backend/src/integrations/mailchimp/client.ts`
3. Create `packages/backend/src/integrations/mailchimp/types.ts`
4. Update `packages/backend/src/handlers/processors/mailchimp-processor.ts`
5. Update `packages/backend/src/handlers/scheduled/mailchimp-syncer.handler.ts`
6. Test with Mailchimp test account
7. Document required environment variables

**API Reference:**
- REST API: `https://{dc}.api.mailchimp.com/3.0/`
- Webhook events: `subscribe`, `unsubscribe`, `profile`, `upemail`
- Documentation: https://mailchimp.com/developer/reference/

**Required Keys (placeholder):**
- `MAILCHIMP_API_KEY` - Format: `{dc}-{key}` (e.g., `us5-abc123...`)
- `MAILCHIMP_DC` - Datacenter prefix extracted from API key
- `MAILCHIMP_AUDIENCE_SHOP` - Audience ID for shop customers
- `MAILCHIMP_AUDIENCE_MEMBERS` - Audience ID for members
- `MAILCHIMP_AUDIENCE_STH` - Audience ID for season ticket holders
- `MAILCHIMP_AUDIENCE_EVERYONE` - Audience ID for all supporters
- `MAILCHIMP_WEBHOOK_SECRET`

**Entry Points:**
- Webhook handler: `packages/backend/src/handlers/webhooks/mailchimp-webhook.handler.ts`
- Processor: `packages/backend/src/handlers/processors/mailchimp-processor.ts`
- Poller: `packages/backend/src/handlers/scheduled/mailchimp-syncer.handler.ts`

---

### Agent 3: GoCardless Integration

**Objective:** Implement GoCardless webhook ingestion and processing

**Tasks:**
1. Read GoCardless API documentation
2. Create `packages/backend/src/integrations/gocardless/client.ts`
3. Create `packages/backend/src/integrations/gocardless/types.ts`
4. Update `packages/backend/src/handlers/processors/gocardless-processor.ts`
5. Test with GoCardless sandbox
6. Document required environment variables

**API Reference:**
- REST API: `https://api.gocardless.com/` (live) or `https://api-sandbox.gocardless.com/` (sandbox)
- Webhook events: `payments.created`, `payments.confirmed`, `mandates.created`
- Documentation: https://developer.gocardless.com/api-reference/

**Required Keys (placeholder):**
- `GOCARDLESS_ACCESS_TOKEN` - From GoCardless dashboard
- `GOCARDLESS_WEBHOOK_SECRET` - Webhook signature verification
- `GOCARDLESS_ENVIRONMENT` - `sandbox` or `live`

**Entry Points:**
- Webhook handler: `packages/backend/src/handlers/webhooks/gocardless-webhook.handler.ts`
- Processor: `packages/backend/src/handlers/processors/gocardless-processor.ts`

---

### Agent 4: Orchestrator

**Objective:** Coordinate infrastructure updates and deployment

**Tasks:**
1. Wait for each agent to complete their integration code
2. Add environment variables to `packages/infrastructure/lib/supporter360-stack.ts`
3. Update database schema if needed
4. Run `npm run build` to verify no TypeScript errors
5. Deploy infrastructure: `cd packages/infrastructure && npx cdk deploy --require-approval never`
6. Validate deployment (check Lambda functions, API Gateway endpoints)
7. Update NOTES.md with completion status

**Infrastructure Pattern:**
```typescript
// Add to supporter360-stack.ts for each integration
const stripeApiKey = SecretValue.secretsManager('stripe/api-key', { jsonField: 'value' });
const stripeWebhookSecret = SecretValue.secretsManager('stripe/webhook-secret', { jsonField: 'value' });

// Environment variables for processor
environment: {
  STRIPE_API_KEY: stripeApiKey.toString(),
  STRIPE_WEBHOOK_SECRET: stripeWebhookSecret.toString(),
}
```

## Handoff Instructions for Agents

### For Integration Agents (1-3):

1. **Start by reading documentation** - Don't guess API structures
2. **Create types first** - Define TypeScript interfaces based on real API docs
3. **Implement client** - OAuth/token handling, API calls
4. **Update processor** - Map webhooks to database entities
5. **Mark your thread complete** - Notify orchestrator when ready

### For Orchestrator Agent:

1. **Monitor progress threads** - Track each agent's status
2. **Don't start infrastructure updates** - Until all 3 integrations are code-complete
3. **Add all secrets at once** - Single infrastructure deployment
4. **Validate everything** - Run smoke tests after deployment
5. **Update documentation** - Mark completed integrations in NOTES.md

## Success Criteria

Each integration is complete when:

- [ ] TypeScript types match real API responses
- [ ] Client code handles authentication correctly
- [ ] Processor maps webhook data to database entities
- [ ] Environment variables defined in infrastructure
- [ ] Handler logs show successful processing
- [ ] NOTES.md updated with integration status

## Running the Swarm

If using NTM (Named Tmux Manager):

```bash
# Spawn 4 agent sessions
ntm spawn support360-integrations --count 4 --prefix "integration-"

# In each session, start the appropriate agent
# Window 1: claude -- AGENT_SWARM_PLAN.md - implement Stripe
# Window 2: claude -- AGENT_SWARM_PLAN.md - implement Mailchimp
# Window 3: claude -- AGENT_SWARM_PLAN.md - implement GoCardless
# Window 4: claude -- AGENT_SWARM_PLAN.md - orchestrate infrastructure
```

## Safety Notes

- **DCG enabled** - Destructive commands will be blocked
- **File reservations** - Each agent works in separate directories
- **Cross-review** - Orchestrator validates before deployment
- **No credentials in code** - All secrets via AWS Secrets Manager

## References

- ACFS Documentation: https://github.com/Dicklesworthstone/agentic_coding_flywheel_setup
- Current Project Status: NOTES.md
- Existing Integration Pattern: `packages/backend/src/integrations/future-ticketing/`
