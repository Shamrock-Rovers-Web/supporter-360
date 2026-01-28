# Supporter 360 - Agent Flywheel Implementation Plan

**Last Updated:** 2026-01-27
**Methodology:** Agent Flywheel Workflow (agent-flywheel.com/workflow)

---

## Executive Summary

This plan translates the Supporter 360 PRD into actionable implementation steps using the Agent Flywheel methodology: multi-AI planning, granular task breakdown ("Beads"), parallel agent swarm implementation, and continuous iteration.

---

## Current State Assessment

### What Exists (Deployed)
- ✅ AWS Infrastructure (159 resources via CDK)
  - RDS PostgreSQL 15 in VPC
  - SQS queues + DLQs for 5 integrations
  - S3 buckets (raw payloads, frontend)
  - CloudFront distribution
  - EventBridge scheduled functions
- ✅ Database schema (complete)
- ✅ CDK stack definition (complete)
- ✅ Project structure (monorepo with npm workspaces)

### What's Missing (Blockers)
- ❌ **CRITICAL:** No Lambda handler code exists (src/ directories are empty)
- ❌ This causes `Runtime.ImportModuleError` on all Lambda functions
- ❌ Frontend code not implemented
- ❌ Integration clients not implemented
- ❌ No tests

### Technical Debt
- Bundling script exists but references non-existent files
- Shared types package is empty
- No environment configuration management

---

## Phase 1: Implementation Strategy

### The "Plan Space" Principle
> "It's a lot easier and faster to operate in 'plan space' before we start implementing." — Jeffrey Emanuel

We will implement in layers:
1. **Foundation Layer:** Core data access, shared types, utilities
2. **Integration Layer:** External system clients (Shopify, Stripe, GoCardless, FT, Mailchimp)
3. **Processing Layer:** Webhook handlers, queue processors
4. **API Layer:** REST endpoints for frontend
5. **UI Layer:** React components
6. **Automation Layer:** Scheduled jobs, reconciliation

### Technology Choices Confirmed
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | Node.js 18 | Lambda native, good ecosystem |
| Language | TypeScript | Type safety for complex data model |
| Database | PostgreSQL 15 | ACID compliance, JSONB for metadata |
| ORM | None (raw pg) | Performance, control, simple queries |
| Build | esbuild | Fast Lambda bundling |
| Frontend | React + Vite | Fast dev, good TypeScript support |
| State | TanStack Query | Server state, caching, refetching |
| UI | Tailwind CSS | Utility-first, small bundle |

---

## Phase 2: "10 Brilliant Ideas" for Supporter 360

Following the Agent Flywheel prompt technique ("100 ideas, show me 10 best"):

### 1. Smart Merge Suggestions
AI-powered duplicate detection using fuzzy matching on name, email, phone, and external IDs. Surface potential merges with confidence scores to admins.

### 2. Supporter Lifetime Value Dashboard
Real-time calculation of total spend across shop + tickets + membership over time. Visual trend lines showing engagement trajectory.

### 3. "At-Risk" Member Detection
Automatic flagging of members showing churn signals: missed payments, reduced attendance, stopped email engagement.

### 4. Ticket Transfer Network Graph
Visualize which supporters frequently transfer tickets to others. Identify social clusters and "ticket hubs" (super-connectors).

### 5. Multi-Timeline Comparison
Side-by-side view of 2-5 supporter profiles. Useful for family accounts or investigating shared-email scenarios.

### 6. Away Day Journey Tracker
Automatic tracking of away match attendance patterns. Show "away countries visited" map and total away miles traveled.

### 7. Real-time Stadium Entry Heatmap
Live dashboard showing current stadium scan-ins by entry gate. Helps ticket office manage queue flow on match days.

### 8. Email Campaign Impact Scoring
After each Mailchimp campaign, score supporters by engagement (opens, clicks, conversions). Correlate with ticket purchases.

### 9. Membership Exclusion Timer
Configurable countdown showing exactly when membership benefits expire (e.g., "Ticket access expires in 5 days 3 hours").

### 10. Quick Actions from Search
From search results, one-click actions: "Send membership reminder", "View last order", "Add to mailchimp campaign", "Mark as attended".

---

## Phase 3: Detailed Task Breakdown (Beads)

Tasks are organized as a Directed Acyclic Graph (DAG) with dependencies. Each "bead" is atomic, testable, and can be done independently.

### Layer 1: Foundation (3 beads)

| ID | Bead | Description | Blocks |
|----|------|-------------|--------|
| F1 | Shared types | Define all TypeScript types (Supporter, Event, Membership, etc.) | I1-I5 |
| F2 | Database connection | pg pool with connection management, transaction helper | I1-I5 |
| F3 | Repository base classes | SupporterRepository, EventRepository, MembershipRepository | A1-A4 |

### Layer 2: Integration Clients (5 beads)

| ID | Bead | Description | Blocks |
|----|------|-------------|--------|
| I1 | Shopify client | Orders, customers, webhook signature verification | W1, P1 |
| I2 | Stripe client | Charges, customers, payment intents, webhook verification | W2, P2 |
| I3 | GoCardless client | Payments, mandates, subscriptions, webhooks | W3, P3 |
| I4 | Future Ticketing client | Polling API for orders, customers, entry logs | P4, FT1 |
| I5 | Mailchimp client | Multi-audience members, tags, click events | W4, P5, MC1 |

### Layer 3: Webhook Handlers (4 beads)

| ID | Bead | Description | Blocks |
|----|------|-------------|--------|
| W1 | Shopify webhook | Ingest orders, customers; S3 archive; queue to SQS | P1 |
| W2 | Stripe webhook | Ingest charges, payment intents; S3; SQS | P2 |
| W3 | GoCardless webhook | Ingest payments, mandates; S3; SQS | P3 |
| W4 | Mailchimp webhook | Ingest click events; S3; SQS | P5 |

### Layer 4: Processors (5 beads)

| ID | Bead | Description | Blocks |
|----|------|-------------|--------|
| P1 | Shopify processor | Parse Shopify webhooks; write events to DB; supporter matching |
| P2 | Stripe processor | Parse Stripe webhooks; membership payment detection |
| P3 | GoCardless processor | Parse GoCardless; DD membership tracking |
| P4 | FT processor | Parse polled FT data; stadium entry events |
| P5 | Mailchimp processor | Parse click events; timeline insertion |

### Layer 5: API Handlers (4 beads)

| ID | Bead | Description | Blocks |
|----|------|-------------|--------|
| A1 | Search endpoint | Email/name/phone search with filters | UI1 |
| A2 | Profile endpoint | Full supporter profile with linked IDs | UI2 |
| A3 | Timeline endpoint | Filterable event timeline | UI3 |
| A4 | Merge endpoint | Merge two supporters; audit logging | UI4 |

### Layer 6: Scheduled Jobs (4 beads)

| ID | Bead | Description | Blocks |
|----|------|-------------|--------|
| S1 | FT poller | Every 5 min, check for new orders/entries | FT2 |
| S2 | Mailchimp sync | Hourly, outbound tag sync to audiences | MC2 |
| S3 | Type classifier | Every 30 min, derive supporter types | ST1 |
| S4 | Reconciler | Daily, catch missed webhooks | RC1 |

### Layer 7: Advanced Features (6 beads)

| ID | Bead | Description | Blocks |
|----|------|-------------|--------|
| FT1 | Product mapping | Config UI for FT product → category mapping | ST1 |
| FT2 | Away detection | Tag supporters with AwaySupporter | ST1 |
| MC1 | Multi-audience map | Supporter → multiple Mailchimp audiences | MC2 |
| MC2 | Tag sync engine | Write tags to correct audiences | ST1 |
| ST1 | Type derivation | Auto-calculate supporter_type from events | UI2 |
| RC1 | Reconciliation logic | Per-source backfill for missed events | — |

### Layer 8: Frontend (8 beads)

| ID | Bead | Description | Blocks |
|----|------|-------------|--------|
| UI1 | Search page | Search bar, results table, filters |
| UI2 | Profile page | Header, linked IDs, flags, overview cards |
| UI3 | Timeline view | Event stream, type filter, date sort |
| UI4 | Merge UI | Select two supporters, preview, confirm |
| UI5 | Admin panel | Audit log, config management |
| UI6 | Loading states | Skeletons, error handling, retries |
| UI7 | Auth integration | Cognito or simple API key auth |
| UI8 | Responsive design | Mobile, tablet, desktop layouts |

### Layer 9: Testing (4 beads)

| ID | Bead | Description |
|----|------|-------------|
| T1 | Unit tests | Repository tests, client mocks |
| T2 | Integration tests | API endpoint tests with test DB |
| T3 | Load tests | 1000 webhook events in 60s |
| T4 | E2E tests | Playwright for critical user paths |

---

## Phase 4: Implementation Order (Critical Path)

```
Week 1: Foundation + Critical Webhooks
├── F1, F2, F3 (Foundation)
├── I1, I2, I3 (Integration clients)
├── W1, W2, W3 (Webhook handlers)
├── P1, P2, P3 (Processors)
└── A1, A2 (Search + Profile APIs)

Week 2: Frontend MVP + FT Integration
├── UI1, UI2, UI3 (Search, Profile, Timeline)
├── I4, P4, S1 (Future Ticketing)
├── FT1, FT2 (Product mapping, Away detection)
└── T1, T2 (Unit + Integration tests)

Week 3: Mailchimp + Advanced Features
├── I5, W4, P5 (Mailchimp client + webhook + processor)
├── MC1, MC2, S2 (Multi-audience, tag sync, scheduled sync)
├── S3, ST1 (Type classification)
├── UI4, UI5 (Merge UI, Admin panel)
└── A4 (Merge API)

Week 4: Polish + Deploy
├── S4, RC1 (Reconciliation)
├── UI6, UI7, UI8 (Loading, auth, responsive)
├── T3, T4 (Load + E2E tests)
└── Production deployment
```

---

## Phase 5: Success Metrics

### Technical Metrics
- Lambda cold start < 1s
- API p95 latency < 500ms
- Webhook processing < 10s (queue-to-DB)
- Zero DLQ buildup (reconciliation working)

### User Metrics
- Search results < 3s
- Profile load < 2s
- 100% webhook capture (no lost events)

### Data Quality Metrics
- < 5% duplicate supporters (after merge operations)
- 100% external ID linkage where available
- Reconciliation recovers > 95% of missed events

---

## Phase 6: Open Questions for Resolution

1. **Legacy Data:** What is the exact DynamoDB schema and spreadsheet structure?
2. **Membership Rules:** Finalize "paid up" grace period rules for different tiers
3. **FT API:** Does Future Ticketing have an API or is screen-scraping required?
4. **Mailchimp Consolidation:** Long-term plan for audience consolidation?
5. **Auth Provider:** Cognito, Auth0, or simple API key for MVP?

---

## Next Steps: Phase 2 - Agent Swarm Implementation

To begin implementation, we will:

1. **Spawn agents for parallel bead implementation**
   - Agent 1: Foundation (F1-F3)
   - Agent 2: Shopify integration (I1, W1, P1)
   - Agent 3: Stripe integration (I2, W2, P2)
   - Agent 4: GoCardless integration (I3, W3, P3)
   - Agent 5: Frontend skeleton (UI1-UI3 structure)

2. **Set up Agent Mail coordination** for dependency management

3. **Begin with Foundation Layer** - all other beads depend on F1-F3

---

**Document Status:** Ready for implementation
**Recommended Action:** Start with Foundation Layer (F1: Shared Types)
