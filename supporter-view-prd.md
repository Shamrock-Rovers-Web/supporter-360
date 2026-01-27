| Expert(s) | Product Manager (PRD); CRM/Data Architect; Solutions Architect (AWS Serverless + Integrations); QA Lead                                                                                                                                                                                                                                                                                             |
| :-------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Question  | Write a single consolidated, coder-ready PRD for Supporter 360 that unifies Shopify, Future Ticketing (incl. stadium entry + Away Supporter inference), Stripe (one-offs + arrears), GoCardless (direct debit), legacy DynamoDB/spreadsheet backfill, and Mailchimp (multi-audience tag sync + click events), deployed serverless on AWS with Postgres.                                             |
| Plan      | Produce a clean PRD you can paste into Notion/Google Docs: overview, goals, users, scope, functional requirements (numbered), user stories, data model, identity rules, integrations + endpoints checklist, architecture, migration plan, analytics, security, acceptance criteria, and test plan. Keep membership “paid up” logic configurable/placeholder and call out open questions explicitly. |

## PRD — Supporter 360 (“Single Pane of Glass”) — v1.0 (MVP)

### 1) Overview

Supporter 360 is an internal staff tool that provides a single consolidated view of each supporter’s interactions with Shamrock Rovers across ticketing, stadium entry, shop purchases, membership payments, and email engagement.

**MVP:** internal-only for Customer Support, Ticket Office, and Membership Admin.
**Phase 2+:** supporter-facing portal built on the same data model.

---

### 2) Problem Statement

Supporters interact through multiple systems:

* Shopify store (shop.shamrockrovers.ie)
* Future Ticketing (futureticketing.ie) for match tickets + stadium entry
* GoCardless for direct debit membership payments
* Stripe for one-off payments and arrears payments
* Mailchimp for comms and engagement tracking (multiple audiences)
* Legacy data in a DynamoDB table and a spreadsheet

Staff currently jump between these systems, making it hard to answer basic questions quickly:

* “Has this person paid their membership?”
* “What was their last shop order?”
* “What was their last ticket order?”
* “Did they attend (scan in)?”
* “What emails did they click?”

---

### 3) Sponsor

CEO

---

### 4) Goals (MVP)

G1. Staff can search by email/name/phone and open a single supporter profile.
G2. Profile shows both **last ticket order** and **last shop order**.
G3. Unified timeline shows ticket purchases, stadium entry, shop orders, membership/payment events, and Mailchimp click events.
G4. Admin can merge/split supporter identities with a full audit trail.
G5. Mailchimp tags stay in sync across multiple audiences; click events appear in the timeline.
G6. Near real-time ingestion via webhooks (with reconciliation to catch misses).

---

### 5) Non-goals (MVP)

NG1. Replace Shopify/Future Ticketing/Stripe/GoCardless admin tools.
NG2. Staff editing supporter contact details in Supporter 360 (read-only contact fields).
NG3. Full membership “paid up” business logic in phase 1. MVP uses a regular model + configurable rules.
NG4. Supporter-facing portal (phase 2+).
NG5. Full marketing automation (beyond Mailchimp tag sync + click ingestion).

---

### 6) Users and Key Questions

#### Primary users (MVP)

* Customer Support
* Ticket Office
* Membership Admin

#### Key questions to answer fast

* “Has this person paid their monthly membership?” *(placeholder logic in MVP)*
* “What was their last ticket order?”
* “What was their last shop order?”
* “Did they attend (stadium entry)?”
* “What emails did they click?”

---

## 7) Scope and Functional Requirements (MVP)

### 7.1 Search

**R1. Search fields**

* Email (primary)
* Name (partial match)
* Phone (partial match)

**R2. Search results list must show**

* Name, email, supporter type
* Last ticket order date
* Last shop order date
* Membership status (coarse)
* Last stadium entry date (if any)

**R3. Performance**

* Typical searches return results in <3 seconds.

---

### 7.2 Supporter Profile (read-only)

**R4. Header fields (Day 1)**

* Name
* Primary email (read-only)
* Phone (read-only if available)
* Supporter type (auto-derived + admin override)
* Flags:

  * Shared email
  * Duplicate candidate
* Linked system IDs (if available):

  * Shopify customer ID
  * Future Ticketing customer ID
  * Stripe customer ID
  * GoCardless customer ID
  * Internal supporter_id

**R5. Tabs**

1. Overview
2. Timeline
3. Purchases (Tickets + Shop)
4. Membership
5. Stadium Entry
6. Mailchimp
7. Admin (admin-only)

---

### 7.3 Overview tab

**R6. Overview cards**

* Last ticket order: date, match/event, value, order id
* Last shop order: date, items summary, value, order id, fulfilment status
* Membership: tier, cadence, status, last payment date
* Last stadium entry: event/match, timestamp, location/gate if available
* Mailchimp: audiences + top tags + last click date

---

### 7.4 Purchases

**R7. Tickets list**

* Order date
* Match/event name
* Quantity
* Value
* Order id
* Link-out to Future Ticketing record (if feasible)

**R8. Shop list**

* Order date
* Items summary
* Value
* Fulfilment status
* Tracking id (if available)
* Order id
* Link-out to Shopify order (if feasible)

**R9. Last order requirement**

* Profile must show **both** last ticket order and last shop order separately.

---

### 7.5 Timeline (unified event stream)

**R10. Timeline must include event types**

* TicketPurchase (Future Ticketing)
* StadiumEntry (Future Ticketing)
* ShopOrder (Shopify)
* MembershipEvent (GoCardless/Stripe)
* PaymentEvent (Stripe one-offs + arrears)
* EmailClick (Mailchimp)

**R11. Timeline event card fields**

* Timestamp
* Source system
* Event type
* Key metadata (order id, match name, amount, clicked link, etc.)
* Link-out (if possible)

**R12. Timeline features**

* Filter by event type
* Sort by date (default newest first)
* View “all available” history

---

### 7.6 Membership (regular model, MVP)

You have:

* Tiers: Full / OAP / Student / Overseas
* Cadence: Monthly / Annual
* Billing method: GoCardless (direct debit) + Stripe (one-offs/arrears)

**R13. Membership view shows**

* Tier
* Cadence
* Billing method
* Status (coarse): Active / Past Due / Cancelled / Unknown
* Last successful payment date
* Next expected payment date (if available)
* Stripe arrears payments listed as PaymentEvent entries

**R14. Membership “paid up” rule**

* MVP uses configurable defaults:

  * `paid_up_grace_days_monthly` default 35
  * `annual_validity_days` default 365
* Detailed business rules deferred to Phase 2.

---

### 7.7 Supporter Type (taxonomy + rules)

Supporter types (MVP):

* Member
* Season Ticket Holder
* Ticket Buyer
* Shop Buyer
* Away Supporter
* Staff/VIP (optional)
* Unknown

**R15. Supporter type derivation**

* Auto-derived from behaviour and membership data
* Admin override allowed

**R16. Draft derivation logic (MVP defaults)**

* Member: membership status Active (or within grace)
* Season Ticket Holder: has purchased season ticket product/category in Future Ticketing
* Ticket Buyer: ticket purchase within last 365 days
* Shop Buyer: Shopify order within last 365 days
* Away Supporter: inferred via Future Ticketing product/category mapping (see R25)
* Unknown: none match

---

### 7.8 Away Supporter inference (Future Ticketing)

**R17. Away Supporter tagging**

* If supporter bought a ticket in a Future Ticketing product/category flagged “Away Supporter” within last 365 days:

  * add tag `AwaySupporter:Last365Days`
* If Away Supporter is the only meaningful activity:

  * supporter_type may become Away Supporter
* Admin can override.

**R18. Product/category mapping**

* Maintain a mapping table/config for Future Ticketing product/category → meaning:

  * Away Supporter
  * Season Ticket
  * Match Ticket
  * etc.

---

### 7.9 Identity & dedupe (admin-only merge/split)

Email is a primary identifier but not unique (family emails exist). Supporter 360 must support split/merge with audit.

**R19. Shared email**

* Supporter 360 supports multiple supporters sharing the same email.
* System flags “SharedEmail” when one email maps to more than one supporter profile.

**R20. Merge**

* Admin can merge two supporters.
* System preserves historical references and linked IDs.
* System keeps email aliases.

**R21. Split**

* Admin can split a supporter profile into two.
* Admin can reassign linked IDs and select events to the new profile.

**R22. Auto-linking**

* Default: link records on exact email only when email is not flagged shared and only one supporter exists for that email.
* If shared, no auto-merge; route to admin review queue.

**R23. Audit**

* Every merge/split/override recorded:

  * actor, timestamp, before/after, reason

---

### 7.10 Mailchimp (multi-audience + tags + click events)

Mailchimp audiences:

* Shop
* Members
* Season Ticket Holders
* Everyone Else

**R24. Multi-audience model**

* Supporter can exist in multiple Mailchimp audiences.
* Supporter 360 manages this with tags (no forced consolidation).

**R25. Tag sync (outbound)**
Supporter 360 writes tags to the correct audience(s) within 10 minutes of qualifying event.

Draft tags:

* Membership:

  * `Member:Active|PastDue|Lapsed`
  * `Member:Tier:Full|OAP|Student|Overseas`
  * `Member:Cadence:Monthly|Annual`
* Purchases/behaviour:

  * `ShopBuyer:Last90Days`
  * `TicketBuyer:Last90Days`
  * `AttendedMatch:Last90Days`
  * `AwaySupporter:Last365Days`
  * `SeasonTicketHolder`

**R26. Click events (inbound)**

* Ingest Mailchimp click events and attach them to supporter timeline.
* If possible, include: campaign name/id, link clicked, timestamp.

---

## 8) User Stories (MVP)

### Customer Support

US1. As support staff, I search by email and see a supporter profile with last ticket order, last shop order, membership status, and last entry.
US2. As support staff, I open the timeline and filter to see only purchases or email clicks.

### Ticket Office

US3. As ticket office staff, I view ticket purchase history and stadium entry for a supporter.
US4. As ticket office staff, I identify Away Supporter behaviour from ticket product/category.

### Membership Admin

US5. As membership admin, I check tier/cadence and recent payment events, including arrears payments via Stripe.

### Admin

US6. As admin, I merge two duplicate supporter records and see a clean single record.
US7. As admin, I split a supporter record when a family email must be separated.
US8. As admin, I view audit logs for merges/splits/tag changes.

---

## 9) Architecture (AWS Serverless + Postgres)

### 9.1 Components

* **API Gateway**: public endpoints for web app + webhook endpoints
* **Lambda**:

  * API handlers (search, profile, timeline, admin actions)
  * Webhook ingest handlers per source
  * Event processor Lambdas (from SQS)
  * Reconciliation job Lambdas
* **SQS + DLQ**:

  * webhook events are queued first
  * retries + DLQ for failures
* **Postgres (RDS or Aurora Serverless v2 Postgres)**:

  * supporter, events, mailchimp mappings, audit logs
* **S3**:

  * archive raw payloads (for debugging, replay)
* **EventBridge Scheduler**:

  * reconciliation jobs (nightly + optional hourly)
* **Auth (MVP choices)**:

  * Simple auth to start, or Cognito for staff + admin RBAC

### 9.2 Ingestion pattern (per source)

Webhook → API Gateway → Lambda → SQS → Processor Lambda → Postgres (+ raw payload to S3)

### 9.3 Reliability requirements

* Idempotency: use external event IDs as dedupe keys
* DLQ: failed payloads stored + replay supported
* Reconciliation: catch missed webhooks within 24 hours

---

## 10) Data Model (MVP)

### supporter

* supporter_id (UUID)
* name
* primary_email
* phone
* supporter_type
* supporter_type_source (auto|admin_override)
* flags: shared_email, duplicate_candidate
* linked_ids (json: shopify, futureticketing, stripe, gocardless)
* created_at, updated_at

### email_alias

* email
* supporter_id
* is_shared
* created_at

### event

* event_id (UUID)
* supporter_id
* source_system
* event_type
* event_time
* external_id
* amount, currency (optional)
* metadata (json)
* raw_payload_ref (s3 key)

### mailchimp_membership

* supporter_id
* audience_id
* mailchimp_contact_id
* tags (array)
* last_synced_at

### future_ticketing_product_mapping

* product_id/category_id
* meaning (AwaySupporter, SeasonTicket, etc.)
* effective_from
* notes

### audit_log

* audit_id
* actor_user_id
* action_type
* timestamp
* before (json)
* after (json)
* reason (text)

---

## 11) Integrations — checklist (coder implementation)

### Shopify

* Webhooks: orders/create, orders/paid, orders/fulfilled, orders/refunded; customers/create, customers/update
* Backfill: customers + orders (all available)

### Stripe

* Webhooks: payment_intent.*, charge.*, checkout.session.*, customer.*
* Also invoice.* / subscription.* if used for annual membership
* Backfill: customers + charges/payment_intents + invoices (if needed)

### GoCardless

* Webhooks: mandate created/cancelled; payment created/confirmed/failed; subscription created/cancelled (if used)
* Backfill: customers + mandates + payments + subscriptions

### Future Ticketing

* Pull customers + orders + stadium entry logs + season ticket products
* Away Supporter inference via product/category mapping

### Mailchimp

* Read audiences + members
* Write tags to the correct audiences
* Ingest click events and map to supporter by email where possible

---

## 12) Legacy migration (DynamoDB + spreadsheet)

### Phase 0: Discovery task (MVP requirement)

Since you don’t have access right now:

* Engineer must inventory:

  * DynamoDB table name(s), keys, fields
  * Spreadsheet structure and ownership
  * Current logic used to compute membership status and supporter type

Deliverable: mapping doc + import plan.

### Phase 1: Backfill

* Import historical events from Shopify/Stripe/GoCardless/Future Ticketing.
* Import legacy supporter/payment events from DynamoDB + spreadsheet once discovered.
* Generate supporter_id records and apply identity matching rules.

### Phase 2: Ongoing ingestion

* Turn on webhooks/polling
* Reconciliation jobs live

---

## 13) Security, Permissions, and Audit

* Roles:

  * Staff: read-only access
  * Admin: merge/split, overrides, tag rule changes, access audit
* All admin actions written to audit_log
* Store raw payloads securely with limited access

---

## 14) Analytics (MVP)

* Supporter counts
* Events ingested by source per day
* % supporters with linked IDs per system
* # shared email cases
* DLQ volume and replay success
* Reconciliation “recovered events” count

---

## 15) Acceptance Criteria (MVP)

### Search & Profile

AC1. Search works by email/name/phone and returns results in <3 seconds typical.
AC2. Profile shows name, email, supporter type and linked IDs where available.
AC3. Profile shows both last ticket order and last shop order (separately).

### Timeline

AC4. Timeline shows events across all connected systems for a supporter with that history.
AC5. Timeline is filterable by event type and shows “all available” history.

### Purchases

AC6. Ticket purchase list shows order id, match/event, value, date.
AC7. Shop order list shows order id, items summary, value, date, fulfilment status.

### Membership

AC8. Membership tab shows tier/cadence/status and last payment date.
AC9. Stripe arrears payments appear as PaymentEvent entries.

### Away Supporter

AC10. If Future Ticketing product/category indicates Away Supporter:

* Tag `AwaySupporter:Last365Days` appears within 10 minutes
* Mailchimp tags update within 10 minutes in the right audiences

### Identity admin controls

AC11. Admin can merge two supporters and see combined timeline.
AC12. Admin can split a supporter and reassign linked IDs + selected events.
AC13. Audit log records merge/split actions.

### Mailchimp

AC14. Supporter 360 writes tags to correct audiences within 10 minutes of qualifying change.
AC15. Mailchimp click events appear in timeline (campaign + click link + time if available).

### Reliability

AC16. Webhook bursts queue correctly; no dropped events (queue-first design).
AC17. Failures go to DLQ and can be replayed.
AC18. Reconciliation recovers missed events within 24 hours.

---

## 16) Test Plan (MVP)

* Identity tests:

  * same email two supporters → flagged shared → no auto-merge
  * admin merge and split → audit log correct
* Timeline tests:

  * supporter with 1 event per source shows 5+ event types correctly sorted
* Mailchimp tests:

  * tag changes write to multiple audiences
  * click events ingest and attach to correct supporter
* Future Ticketing tests:

  * Away Supporter product mapping tags supporter
  * stadium entry logs appear as events
* Load tests:

  * 1000 webhook events in 60 seconds processed without loss

---

## 17) Open Items / Follow-ups (explicitly deferred)

1. Final membership paid-up rules (monthly/annual/arrears specifics)
2. Exact legacy DynamoDB and spreadsheet schema (discovery needed)
3. Decision on long-term Mailchimp audience consolidation (not MVP)

---

## 18) Implementation Checklist (first 2 weeks)

1. Provision AWS stack (API Gateway, Lambdas, SQS, DLQ, S3, Postgres).
2. Create Postgres schema + migrations.
3. Build ingestion pipeline for Shopify/Stripe/GoCardless via webhooks.
4. Build reconciliation job framework.
5. Build UI: search → profile → timeline → purchases.
6. Build Future Ticketing ingest (orders + entry logs).
7. Implement Future Ticketing product/category mapping for Away Supporter and ST holder detection.
8. Build Mailchimp:

   * multi-audience mapping
   * tag sync writer
   * click ingestion
9. Build admin merge/split + audit log.
10. Run backfill for “all available” from each system.
11. Produce data quality report.

---

If you want, I can also generate:

* a “requirements-only” checklist version for the coder (one page)
* a sample Postgres schema (SQL)
* the event-type JSON schema for each source (Shopify/Stripe/GoCardless/Future Ticketing/Mailchimp)
