# Supporter 360 - Agent Flywheel Master Plan

**Workflow Phase:** Ideation & Planning → Task Breakdown (Beads) → Agent Swarm Implementation
**Created:** 2026-01-27
**Methodology:** https://agent-flywheel.com/workflow

---

## Part 1: The Synthesized Plan

This plan represents the "best of all worlds" synthesis after reviewing the project from multiple AI perspectives:

### Project Definition

**Supporter 360** is a single-pane-of-glass internal tool for Shamrock Rovers FC that unifies supporter data from:

- Shopify (shop purchases)
- Future Ticketing (match tickets + stadium entry)
- Stripe (one-off payments + arrears)
- GoCardless (direct debit memberships)
- Mailchimp (email engagement across multiple audiences)

**Core Problem:** Staff currently switch between 5+ systems to answer basic questions like "Has this person paid their membership?" or "When did they last attend?"

**Technical Stack:**
- AWS Serverless (API Gateway, Lambda, SQS, RDS PostgreSQL, S3, EventBridge)
- Node.js 18 + TypeScript
- React + Vite frontend
- Monorepo with npm workspaces

---

## Part 2: The "Beads" - Detailed Task Breakdown

Each bead is an atomic, self-documenting unit of work. Beads form a DAG where beads can have dependencies (`blockedBy`) and block other beads (`blocks`).

### Format
```
ID: [BEAD-ID]
Title: [Human-readable title]
Description: [What needs to be done]
Acceptance Criteria: [Definition of done]
Dependencies: [List of bead IDs this depends on]
Estimate: [Size: S/M/L/XL]
```

---

## Layer 1: Foundation (Must be first)

### BEAD-F1: Shared Type Definitions
```
ID: F1
Title: Define Core TypeScript Types
Description:
Create the complete type system in packages/shared/src/types.ts that will be used
across backend, frontend, and database layers.

Types to define:
- Supporter (supporter_id, name, primary_email, phone, supporter_type, linked_ids, flags)
- EmailAlias (email, supporter_id, is_shared)
- Event (event_id, supporter_id, source_system, event_type, event_time, metadata)
- Membership (tier, cadence, billing_method, status, payment dates)
- MailchimpMembership (audience_id, mailchimp_contact_id, tags)
- FutureTicketingProductMapping (product_id, category_id, meaning)
- AuditLogEntry (action_type, actor, before_state, after_state)
- SearchRequest (query, filters, pagination)
- SupporterProfile (supporter + aggregates)
- TimelineEvent (unified event format)

Acceptance Criteria:
- All types exported from packages/shared/src/index.ts
- Types match database schema exactly
- JSDoc comments on all exported types
- No implicit any types
- tsconfig set to strict mode
Dependencies: None
Estimate: S
```

### BEAD-F2: Database Connection Layer
```
ID: F2
Title: PostgreSQL Connection Pool with Transaction Support
Description:
Create packages/backend/src/db/connection.ts with:
- pg connection pool management
- Environment variable configuration (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
- getConnection() helper
- transaction(callback) helper for multi-step operations
- Proper error handling and connection cleanup
- Connection pool sizing for Lambda (max 5 connections)

Acceptance Criteria:
- Pool connects successfully to RDS PostgreSQL
- transaction() rolls back on error, commits on success
- Connection is properly released after each query
- Environment variables validated at startup
- Unit tests for transaction rollback behavior
Dependencies: None
Estimate: M
```

### BEAD-F3: Repository Base Classes
```
ID: F3
Title: Supporter and Event Repositories
Description:
Create data access layer in packages/backend/src/db/repositories/:

SupporterRepository:
- create(supporter): Promise<Supporter>
- findById(id): Promise<Supporter | null>
- findByEmail(email): Promise<Supporter[]>
- findByPhone(phone): Promise<Supporter[]>
- search(query): Promise<Supporter[]>
- update(id, data): Promise<Supporter>
- merge(sourceId, targetId, actorId): Promise<void>
- getLinkedIds(id): Promise<Record<string, string>>
- updateLinkedIds(id, linkedIds): Promise<void>

EventRepository:
- create(event): Promise<Event>
- findBySupporterId(supporterId, filters): Promise<Event[]>
- findByExternalId(sourceSystem, externalId): Promise<Event | null>
- getTimeline(supporterId, eventTypes, limit, offset): Promise<TimelineEvent[]>
- getLastEvent(supporterId, eventType): Promise<Event | null>

MembershipRepository:
- upsert(data): Promise<Membership>
- findBySupporterId(id): Promise<Membership | null>
- getStatus(id): Promise<string>

Acceptance Criteria:
- All methods use parameterized queries (SQL injection safe)
- Repository throws meaningful errors (NotFound, Conflict)
- transaction() helper used for multi-step operations
- Unit tests with mock pg pool
Dependencies: F1, F2
Estimate: L
```

---

## Layer 2: Integration Clients

### BEAD-I1: Shopify Integration Client
```
ID: I1
Title: Shopify API Client with Webhook Verification
Description:
Create packages/backend/src/integrations/shopify/:

client.ts:
- getCustomer(id): Promise<Customer>
- getOrders(customerId): Promise<Order[]>
- verifyWebhook(rawBody, signature): boolean
- Webhook types: orders/create, orders/paid, customers/create, customers/update

types.ts:
- ShopifyCustomer, ShopifyOrder, ShopifyLineItem

Acceptance Criteria:
- Webhook signature verification using HMAC SHA-256
- Handles Shopify rate limiting (429 responses)
- Parses all required webhook payloads
- Unit tests for signature verification
Dependencies: F1
Estimate: M
```

### BEAD-I2: Stripe Integration Client
```
ID: I2
Title: Stripe API Client with Webhook Verification
Description:
Create packages/backend/src/integrations/stripe/:

client.ts:
- getCustomer(id): Promise<StripeCustomer>
- getPaymentIntent(id): Promise<PaymentIntent>
- listCharges(customerId): Promise<Charge[]>
- verifyWebhook(rawBody, signature, secret): boolean

Webhook events:
- payment_intent.succeeded, payment_intent.failed
- charge.succeeded, charge.failed
- customer.created, customer.updated
- invoice.payment_succeeded, invoice.payment_failed

Acceptance Criteria:
- Stripe signature verification (v1 signature)
- Handles test and live mode keys
- Converts Stripe timestamps to Date objects
- Unit tests for signature verification
Dependencies: F1
Estimate: M
```

### BEAD-I3: GoCardless Integration Client
```
ID: I3
Title: GoCardless API Client with Webhook Verification
Description:
Create packages/backend/src/integrations/gocardless/:

client.ts:
- getCustomer(id): Promise<GCCustomer>
- getPayment(id): Promise<GCPayment>
- getMandate(id): Promise<GCMandate>
- listPayments(customerId): Promise<GCPayment[]>
- verifyWebhook(rawBody, signature, secret): boolean

Webhook events:
- payment_created, payment_confirmed, payment_failed
- mandate_created, mandate_cancelled
- subscription_created, subscription_cancelled

Acceptance Criteria:
- GoCardless webhook signature verification
- Handles pagination for list endpoints
- Proper error handling for API errors
- Unit tests for verification
Dependencies: F1
Estimate: M
```

### BEAD-I4: Future Ticketing Integration Client
```
ID: I4
Title: Future Ticketing Polling Client
Description:
Create packages/backend/src/integrations/future-ticketing/:

client.ts:
- getCustomers(since): Promise<FTCustomer[]>
- getOrders(since): Promise<FTOrder[]>
- getStadiumEntries(since): Promise<FTEntry[]>
- getProducts(): Promise<FTProduct[]>

Note: Future Ticketing may not have a real API. This might need:
- Screen scraping approach
- SFTP file download
- Direct database access (if available)

Acceptance Criteria:
- Incremental polling using "since" parameter
- Handles authentication (API key or basic auth)
- Retry logic with exponential backoff
- Falls back gracefully if FT is unavailable
Dependencies: F1
Estimate: L (uncertainty about FT API)
```

### BEAD-I5: Mailchimp Integration Client
```
ID: I5
Title: Mailchimp Multi-Audience Client
Description:
Create packages/backend/src/integrations/mailchimp/:

client.ts:
- getMember(audienceId, email): Promise<Member | null>
- getMemberAudiences(email): Promise<AudienceMember[]>
- updateTags(audienceId, memberId, tags): Promise<void>
- getClickEvents(since): Promise<ClickEvent[]>
- getAllAudiences(): Promise<Audience[]>

Support for multiple audiences:
- Shop customers audience
- Members audience
- Season Ticket Holders audience
- Everyone Else audience

Acceptance Criteria:
- Handles all configured audiences
- Tag updates are additive (remove old, add new)
- Click event polling returns campaign, url, timestamp
- Rate limiting handled
Dependencies: F1
Estimate: M
```

---

## Layer 3: Webhook Handlers (Queue-First Pattern)

### BEAD-W1: Shopify Webhook Handler
```
ID: W1
Title: Shopify Webhook Ingestion Handler
Description:
Create packages/backend/src/handlers/webhooks/shopify.handler.ts:

Flow:
1. Verify webhook signature (401 if invalid)
2. Generate S3 key: shopify/{date}/{uuid}.json
3. Store raw payload to S3
4. Parse webhook body to extract event_type and external_id
5. Send message to SQS: { event_type, external_id, s3_key }
6. Return 202 Accepted

Acceptance Criteria:
- Returns 202 within 1 second (fast response)
- S3 payload archived before queueing
- SQS message contains all metadata for processor
- CloudWatch log for each webhook received
- Unit tests for signature verification
Dependencies: I1, F2
Estimate: M
```

### BEAD-W2: Stripe Webhook Handler
```
ID: W2
Title: Stripe Webhook Ingestion Handler
Description:
Create packages/backend/src/handlers/webhooks/stripe.handler.ts:

Flow (same as W1):
1. Verify Stripe webhook signature
2. Store raw payload to S3: stripe/{date}/{uuid}.json
3. Parse event_type and id
4. Send to SQS
5. Return 202

Acceptance Criteria:
- Handles all Stripe webhook events
- Idempotent based on Stripe event id
- S3 archiving
- SQS queueing
- Unit tests
Dependencies: I2, F2
Estimate: M
```

### BEAD-W3: GoCardless Webhook Handler
```
ID: W3
Title: GoCardless Webhook Ingestion Handler
Description:
Create packages/backend/src/handlers/webhooks/gocardless.handler.ts:

Flow (same as W1):
1. Verify GoCardless webhook signature
2. Store to S3: gocardless/{date}/{uuid}.json
3. Parse action and resource ID
4. Send to SQS
5. Return 202

Acceptance Criteria:
- Handles all GoCardless webhook events
- Idempotent
- S3 + SQS pattern
- Unit tests
Dependencies: I3, F2
Estimate: M
```

### BEAD-W4: Mailchimp Webhook Handler
```
ID: W4
Title: Mailchimp Click Event Webhook Handler
Description:
Create packages/backend/src/handlers/webhooks/mailchimp.handler.ts:

Flow:
1. Verify Mailchimp webhook signature
2. Store to S3: mailchimp/{date}/{uuid}.json
3. Parse email, campaign_id, url_clicked
4. Send to SQS
5. Return 202

Acceptance Criteria:
- Handles Mailchimp click events
- Links click to supporter via email lookup
- S3 + SQS pattern
- Unit tests
Dependencies: I5, F2
Estimate: M
```

---

## Layer 4: Queue Processors

### BEAD-P1: Shopify Event Processor
```
ID: P1
Title: Shopify SQS Message Processor
Description:
Create packages/backend/src/handlers/processors/shopify.processor.ts:

For each SQS message:
1. Get S3 payload
2. Determine event type:
   - orders/create: Create ShopOrder event, find/create supporter
   - customers/create: Update supporter with Shopify customer ID
   - customers/update: Update supporter contact info
3. Lookup supporter by email
4. If not found, create new supporter
5. Store event in database
6. Update supporter's linked_ids with Shopify customer ID
7. Update last_shop_order_date aggregate
8. Delete message from SQS

Supporter matching logic:
- Exact email match → use that supporter
- No match → create new supporter
- If email is flagged shared → queue for admin review

Acceptance Criteria:
- Processes Shopify orders and customer updates
- Creates supporters for unknown emails
- Handles shared email scenario (no auto-merge)
- Updates supporter_type if shop purchase pattern detected
- DLQ handling for poison messages
- Integration tests with mock SQS
Dependencies: W1, F3, I1
Estimate: L
```

### BEAD-P2: Stripe Event Processor
```
ID: P2
Title: Stripe SQS Message Processor
Description:
Create packages/backend/src/handlers/processors/stripe.processor.ts:

For each SQS message:
1. Get S3 payload
2. Determine event type:
   - payment_intent.succeeded: Create PaymentEvent
   - charge.succeeded: Create PaymentEvent
   - invoice.payment_succeeded: Update membership status
3. Lookup supporter by Stripe customer ID or email
4. If membership payment found, update membership table
5. Store event in timeline

Membership detection:
- GoCardless subscription ID → membership
- Invoice with membership metadata → membership
- Arrears payments flagged

Acceptance Criteria:
- Processes Stripe charges and payment intents
- Links payments to memberships where possible
- Updates membership status for recurring payments
- Handles arrears detection
- Integration tests
Dependencies: W2, F3, I2
Estimate: L
```

### BEAD-P3: GoCardless Event Processor
```
ID: P3
Title: GoCardless SQS Message Processor
Description:
Create packages/backend/src/handlers/processors/gocardless.processor.ts:

For each SQS message:
1. Get S3 payload
2. Determine event type:
   - payment_confirmed: Update membership last_payment_date
   - payment_failed: Set membership status to PastDue
   - mandate_cancelled: Set membership status to Cancelled
3. Lookup supporter by GoCardless customer ID
4. Update membership record
5. Create timeline event

Acceptance Criteria:
- Processes GoCardless payment events
- Updates membership status correctly
- Tracks payment failures
- Integration tests
Dependencies: W3, F3, I3
Estimate: M
```

### BEAD-P4: Future Ticketing Event Processor
```
ID: P4
Title: Future Ticketing SQS Message Processor
Description:
Create packages/backend/src/handlers/processors/future-ticketing.processor.ts:

For each SQS message (from poller):
1. Determine type: order, customer, or entry
2. Orders: Create TicketPurchase event
3. Entries: Create StadiumEntry event
4. Store events in timeline
5. Update aggregates:
   - last_ticket_order_date
   - last_stadium_entry_date

Product mapping:
- Look up product in future_ticketing_product_mapping
- If meaning is "AwaySupporter", tag supporter
- If meaning is "SeasonTicket", tag supporter

Acceptance Criteria:
- Processes FT orders and entry logs
- Applies product mapping for Away/STH detection
- Updates ticket-related aggregates
- Integration tests
Dependencies: I4, F3
Estimate: L
```

### BEAD-P5: Mailchimp Event Processor
```
ID: P5
Title: Mailchimp SQS Message Processor
Description:
Create packages/backend/src/handlers/processors/mailchimp.processor.ts:

For each SQS message:
1. Get S3 payload
2. Parse click event (email, campaign, url, timestamp)
3. Lookup supporter by email
4. Create EmailClick event in timeline
5. Update mailchimp_click_count aggregate

Multi-audience handling:
- Store mailchimp_contact_id per audience
- One supporter can have multiple mailchimp_membership records

Acceptance Criteria:
- Processes Mailchimp click events
- Links to correct supporter by email
- Handles multi-audience mapping
- Integration tests
Dependencies: W4, F3, I5
Estimate: M
```

---

## Layer 5: API Endpoints

### BEAD-A1: Search API
```
ID: A1
Title: Search Supporters Endpoint
Description:
Create packages/backend/src/handlers/api/search.handler.ts:

GET /search?q={query}&type={type}&limit={limit}

Query logic:
- Search by email (exact match)
- Search by name (partial match, ILIKE)
- Search by phone (partial match)
- Filter by supporter_type
- Return sorted by relevance

Response:
```json
{
  "results": [
    {
      "supporter_id": "...",
      "name": "...",
      "primary_email": "...",
      "supporter_type": "...",
      "last_ticket_order_date": "...",
      "last_shop_order_date": "...",
      "membership_status": "..."
    }
  ],
  "total": 42
}
```

Acceptance Criteria:
- Returns results in <3 seconds for typical queries
- API key authentication (X-API-Key header)
- Pagination support
- Rate limiting (100 req/min per API key)
- Integration tests
Dependencies: F3
Estimate: M
```

### BEAD-A2: Profile API
```
ID: A2
Title: Get Supporter Profile Endpoint
Description:
Create packages/backend/src/handlers/api/profile.handler.ts:

GET /supporters/{id}

Returns complete supporter profile:
```json
{
  "supporter_id": "...",
  "name": "...",
  "primary_email": "...",
  "phone": "...",
  "supporter_type": "...",
  "flags": {},
  "linked_ids": {},
  "overview": {
    "last_ticket_order": {...},
    "last_shop_order": {...},
    "membership": {...},
    "last_stadium_entry": {...},
    "mailchimp": {...}
  }
}
```

Acceptance Criteria:
- 404 if supporter not found
- Includes all overview aggregates
- API key authentication
- Integration tests
Dependencies: F3
Estimate: M
```

### BEAD-A3: Timeline API
```
ID: A3
Title: Get Supporter Timeline Endpoint
Description:
Create packages/backend/src/handlers/api/timeline.handler.ts:

GET /supporters/{id}/timeline?types={types}&limit={limit}&offset={offset}

Response:
```json
{
  "events": [
    {
      "event_id": "...",
      "event_time": "...",
      "source_system": "shopify",
      "event_type": "ShopOrder",
      "metadata": {...}
    }
  ],
  "total": 150,
  "has_more": true
}
```

Acceptance Criteria:
- Filter by event_type (comma-separated)
- Newest first by default
- Pagination support
- Integration tests
Dependencies: F3
Estimate: M
```

### BEAD-A4: Merge API
```
ID: A4
Title: Merge Supporters Endpoint
Description:
Create packages/backend/src/handlers/api/admin/merge.handler.ts:

POST /admin/merge
```json
{
  "source_id": "...",
  "target_id": "...",
  "reason": "Duplicate records"
}
```

Steps:
1. Verify admin API key
2. Validate both supporters exist
3. In transaction:
   - Reassign all events from source to target
   - Merge linked_ids (union)
   - Merge email_aliases
   - Update membership if source has one
   - Write audit_log entry
   - Delete source supporter
4. Return merged profile

Acceptance Criteria:
- Admin-only API key required
- Full audit trail
- Cannot merge if source has shared email
- Returns 409 if merge would cause data loss
- Integration tests
Dependencies: F3
Estimate: L
```

---

## Layer 6: Scheduled Jobs

### BEAD-S1: Future Ticketing Poller
```
ID: S1
Title: Scheduled Future Ticketing Poller
Description:
Create packages/backend/src/handlers/scheduled/future-ticketing-poller.handler.ts:

Runs every 5 minutes via EventBridge:
1. Check config.last_ft_poll_timestamp
2. Call FT API for customers/orders/entries since last poll
3. For each result, send to future-ticketing SQS queue
4. Update config.last_ft_poll_timestamp

Acceptance Criteria:
- Idempotent (safe to re-run)
- Processes in batches (100 at a time)
- Updates poll timestamp after successful batch
- CloudWatch metrics: records_polled, errors
- Unit tests
Dependencies: I4, P4
Estimate: M
```

### BEAD-S2: Mailchimp Tag Syncer
```
ID: S2
Title: Scheduled Mailchimp Tag Synchronization
Description:
Create packages/backend/src/handlers/scheduled/mailchimp-syncer.handler.ts:

Runs every hour:
1. Query all supporters with active memberships
2. For each supporter:
   - Calculate current tags based on rules
   - Get their Mailchimp memberships (audiences)
   - Update tags in each audience
3. Tag calculation rules:
   - Member:Active|PastDue|Lapsed
   - Member:Tier:Full|OAP|Student|Overseas
   - ShopBuyer:Last90Days (if shop order in 90 days)
   - TicketBuyer:Last90Days
   - AttendedMatch:Last90Days
   - AwaySupporter:Last365Days
   - SeasonTicketHolder

Acceptance Criteria:
- Only updates tags that changed
- Handles multiple audiences per supporter
- Logs changes to audit_log
- CloudWatch metrics: tags_updated, errors
- Unit tests
Dependencies: I5, P5
Estimate: L
```

### BEAD-S3: Supporter Type Classifier
```
ID: S3
Title: Scheduled Supporter Type Classification
Description:
Create packages/backend/src/handlers/scheduled/supporter-type-classifier.handler.ts:

Runs every 30 minutes:
1. For all supporters:
   - Run type derivation rules in order
   - Update supporter_type if changed
   - Set supporter_type_source = 'auto'
2. Rules (in priority order):
   - Member: membership.status = 'Active' OR last_payment within grace_days
   - Season Ticket Holder: has purchased season ticket product
   - Ticket Buyer: ticket_purchase within 365 days
   - Shop Buyer: shop_order within 365 days
   - Away Supporter: has AwaySupporter tag AND no other activity
   - Unknown: none of the above

Acceptance Criteria:
- Idempotent
- Respects admin_override (don't change if source = 'admin_override')
- Logs type changes to audit_log
- Configurable grace_days from config table
- Unit tests
Dependencies: F3
Estimate: M
```

### BEAD-S4: Reconciliation Job
```
ID: S4
Title: Scheduled Reconciliation for Missed Webhooks
Description:
Create packages/backend/src/handlers/scheduled/reconciler.handler.ts:

Runs daily at 2 AM UTC:
1. For each integration (Shopify, Stripe, GoCardless, FT):
   - Query last 24 hours of events from source API
   - For each event:
     - Check if exists in event table (by source_system + external_id)
     - If missing: process as new event
2. Log recovered events to CloudWatch
3. Alert if >100 events recovered (possible webhook failure)

Acceptance Criteria:
- Checks all integrations
- Creates missing events in DB
- Idempotent (safe to re-run)
- CloudWatch metrics: recovered_events_per_source
- Unit tests with mock APIs
Dependencies: I1, I2, I3, I4, P1, P2, P3, P4
Estimate: XL
```

---

## Layer 7: Frontend

### BEAD-UI1: Search Page Component
```
ID: UI1
Title: Frontend Search Page
Description:
Create packages/frontend/src/pages/Search.tsx:

Components:
- SearchBar: Email/name/phone input with debounce
- ResultsTable: Display search results with columns
- Filters: Supporter type, date range filters
- Pagination: Load more, infinite scroll option

Acceptance Criteria:
- Real-time search as you type (debounced 300ms)
- Click row to navigate to profile page
- Shows loading state
- Shows error state
- Responsive design
Dependencies: A1
Estimate: M
```

### BEAD-UI2: Profile Page Component
```
ID: UI2
Title: Frontend Profile Page
Description:
Create packages/frontend/src/pages/Profile.tsx:

Sections:
- Header: Name, email, phone, supporter_type badge
- Linked IDs: Chips for each system ID
- Overview Cards: Last ticket, last shop, membership, last entry
- Tabs: Timeline, Purchases, Membership, Stadium Entry, Mailchimp, Admin

Acceptance Criteria:
- All data loaded via TanStack Query
- Refetch on window focus
- Loading skeletons
- Error boundaries
- Responsive
Dependencies: A2
Estimate: L
```

### BEAD-UI3: Timeline Component
```
ID: UI3
Title: Timeline Component with Filtering
Description:
Create packages/frontend/src/components/Timeline.tsx:

Features:
- Event cards grouped by date
- Type filter (checkboxes for each event type)
- Newest first
- Infinite scroll
- Click for details modal
- Color-coded by source system

Acceptance Criteria:
- Smooth filtering (no full page reload)
- Shows event icon per type
- Displays key metadata (order id, amount, match name)
- Link-out buttons where available
Dependencies: A3
Estimate: M
```

### BEAD-UI4: Merge UI Component
```
ID: UI4
Title: Admin Merge Interface
Description:
Create packages/frontend/src/components/admin/MergeSupporters.tsx:

Flow:
1. Search and select two supporters
2. Show side-by-side comparison
3. Select target (default: older record)
4. Confirm with reason input
5. Show success/error message

Acceptance Criteria:
- Admin-only route
- Shows what will be merged
- Confirmation dialog
- Audit log link after merge
Dependencies: A4
Estimate: M
```

---

## Dependency Graph (ASCII)

```
                    F1 ──────┬────→ I1 ──→ W1 ──→ P1 ──→ A1 ──→ UI1
                    │       │                            │
                    │       ├────→ I2 ──→ W2 ──→ P2 ──→ A2 ──→ UI2
                    │       │                            │      │
                    │       ├────→ I3 ──→ W3 ──→ P3 ────────┤      │
                    │       │                            │      │
                    │       ├────→ I4 ──→ S1 ──→ P4 ──────┤      │
                    │       │                            │      │
                    │       └────→ I5 ──→ W4 ──→ P5 ──→ S2 ──┘      │
                    │                                         │
                    └────→ F2 ──→ F3 ──────────────────────────┤
                                                            │
                         S3 ←────────────────────────────────┤
                                                            │
                         S4 ←────────────────────────────────┤
                                                            │
                                        A3 ──────────────────→ UI3
                                        │
                                        A4 ──────────────────→ UI4
```

---

## Bead Status Tracking

| ID | Title | Status | Assigned To |
|----|-------|--------|-------------|
| F1 | Shared Type Definitions | Pending | — |
| F2 | Database Connection Layer | Pending | — |
| F3 | Repository Base Classes | Pending | — |
| I1 | Shopify Integration Client | Pending | — |
| I2 | Stripe Integration Client | Pending | — |
| I3 | GoCardless Integration Client | Pending | — |
| I4 | Future Ticketing Client | Pending | — |
| I5 | Mailchimp Integration Client | Pending | — |
| W1 | Shopify Webhook Handler | Pending | — |
| W2 | Stripe Webhook Handler | Pending | — |
| W3 | GoCardless Webhook Handler | Pending | — |
| W4 | Mailchimp Webhook Handler | Pending | — |
| P1 | Shopify Processor | Pending | — |
| P2 | Stripe Processor | Pending | — |
| P3 | GoCardless Processor | Pending | — |
| P4 | FT Processor | Pending | — |
| P5 | Mailchimp Processor | Pending | — |
| A1 | Search API | Pending | — |
| A2 | Profile API | Pending | — |
| A3 | Timeline API | Pending | — |
| A4 | Merge API | Pending | — |
| S1 | FT Poller | Pending | — |
| S2 | Mailchimp Syncer | Pending | — |
| S3 | Type Classifier | Pending | — |
| S4 | Reconciler | Pending | — |
| UI1 | Search Page | Pending | — |
| UI2 | Profile Page | Pending | — |
| UI3 | Timeline Component | Pending | — |
| UI4 | Merge UI | Pending | — |

**Total Beads:** 31
**Estimated Effort:** 29 S/M/L/XL units (~6-8 weeks for single developer, ~2-3 weeks with agent swarm)

---

## Next Phase: Agent Swarm Implementation

Once you approve this plan, the agent swarm will:

1. **Foundation Agent** (F1, F2, F3) - Sets up types, DB, repositories
2. **Integration Agents** (I1-I5) - Builds API clients in parallel
3. **Webhook Agents** (W1-W4) - Builds ingestion handlers
4. **Processor Agents** (P1-P5) - Builds queue processors
5. **API Agents** (A1-A4) - Builds REST endpoints
6. **Scheduled Agents** (S1-S4) - Builds background jobs
7. **UI Agents** (UI1-UI4) - Builds React components

Each agent will:
- Read the plan
- Implement their assigned beads
- Run tests
- Update status
- Notify dependent agents when complete

**Ready to proceed?**
