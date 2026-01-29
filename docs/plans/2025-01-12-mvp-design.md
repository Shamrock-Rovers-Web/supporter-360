# Supporter 360 MVP - Full Implementation Design

**Date:** 2025-01-12
**Status:** Approved
**Scope:** Complete MVP including frontend, integrations, and authentication

## Overview

This design completes the Supporter 360 MVP by implementing the remaining components from the PRD:
- Future Ticketing integration (polling-based)
- Mailchimp integration (two-way: webhooks + tag sync)
- Supporter type auto-derivation
- Reconciliation jobs for missed webhooks
- React + Vite frontend with API key authentication

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React + Vite)                        │
│                    ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│                    │  Search  │ │ Profile  │ │  Admin   │                   │
│                    └─────┬────┘ └────┬─────┘ └────┬─────┘                   │
└──────────────────────────┼────────────┼────────────┼────────────────────────┘
                           │            │            │
                           ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Gateway (X-API-Key auth)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Webhook       │  │ API Handlers  │  │ Scheduled     │
│ Handlers      │  │               │  │ Functions     │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                    SQS                                      │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────┤
│   Shopify   │    Stripe   │ GoCardless  │   Mailchimp │  FT Poll Results    │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────────────┘
       ▼             ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Processor Lambdas                               │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────────┤
│   Shopify    │    Stripe    │  GoCardless  │   Mailchimp  │  Future Ticket  │
│  Processor   │  Processor   │  Processor   │  Processor   │    Processor    │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────────┘
                                           │
       ┌───────────────────────────────────┼─────────────────────────────────┐
       ▼                                   ▼                                 ▼
┌──────────────┐                  ┌──────────────┐               ┌──────────────┐
│  PostgreSQL  │                  │      S3      │               │  Mailchimp   │
│   (RDS)      │                  │  (Raw Payloads)             │    API       │
└──────────────┘                  └──────────────┘               └──────────────┘
```

## Backend Components

### 1. Future Ticketing Integration

**Pattern:** Polling (no webhooks available)

**Files:**
- `packages/backend/src/handlers/polling/futureticketing.handler.ts`
- `packages/backend/src/handlers/processors/futureticketing.processor.ts`
- `packages/backend/src/services/futureticketing.client.ts`

**Flow:**
1. EventBridge triggers every 15 minutes
2. Handler fetches checkpoint from `config` table
3. Queries FT API for:
   - Customers created/updated since checkpoint
   - Orders since checkpoint
   - Stadium entry logs since checkpoint
4. Results sent to SQS for processing
5. Processor creates:
   - `TicketPurchase` events for orders
   - `StadiumEntry` events for scans
   - Links customers via `linked_ids.futureticketing`

**Checkpoint Storage:**
```json
{
  "last_customer_fetch": "2025-01-12T10:00:00Z",
  "last_order_fetch": "2025-01-12T10:00:00Z",
  "last_entry_fetch": "2025-01-12T10:00:00Z"
}
```

### 2. Mailchimp Integration

**Two-way flow:**

**Inbound (Webhooks):**
- `packages/backend/src/handlers/webhooks/mailchimp.handler.ts`
- `packages/backend/src/handlers/processors/mailchimp.processor.ts`
- Click webhook events → `EmailClick` events with campaign, URL, timestamp

**Outbound (Tag Sync):**
- `packages/backend/src/services/mailchimp-sync.service.ts`
- EventBridge rule every 10 minutes
- Scans for changes in membership, purchases, stadium entry
- Writes tags to appropriate audiences:

| Tag | Condition | Audiences |
|-----|-----------|-----------|
| `Member:Active` | membership.status = 'Active' | Members, Everyone Else |
| `Member:PastDue` | membership.status = 'Past Due' | Members, Everyone Else |
| `ShopBuyer:Last90Days` | ShopOrder event in last 90 days | Shop, Everyone Else |
| `TicketBuyer:Last90Days` | TicketPurchase in last 90 days | Season Ticket Holders, Everyone Else |
| `AttendedMatch:Last90Days` | StadiumEntry in last 90 days | Season Ticket Holders, Everyone Else |
| `AwaySupporter:Last365Days` | Away Supporter product purchase | Season Ticket Holders, Everyone Else |
| `SeasonTicketHolder` | Has season ticket product | Season Ticket Holders, Everyone Else |

### 3. Supporter Type Derivation

**File:** `packages/backend/src/services/supporter-type.service.ts`

**Rules (in priority order):**
1. **Season Ticket Holder** - Purchased season ticket product (from `future_ticketing_product_mapping`)
2. **Member** - Membership status Active or within grace period
3. **Away Supporter** - Has `AwaySupporter:Last365Days` tag and this is primary activity
4. **Ticket Buyer** - TicketPurchase within last 365 days
5. **Shop Buyer** - ShopOrder within last 365 days
6. **Unknown** - No matching activity

**Trigger:** Scheduled every hour or on significant events

**Respect:** Never override if `supporter_type_source = 'admin_override'`

### 4. Reconciliation Jobs

**File:** `packages/backend/src/services/reconciler.service.ts`

**Per-integration reconciliation:**
- **Shopify:** API fetch orders since last reconciliation, compare with events
- **Stripe:** API fetch charges/payment_intents, compare
- **GoCardless:** API fetch payments, compare
- **Future Ticketing:** Already polling, minimal reconciliation needed

**Lookback:** 24 hours (configurable via `reconciliation_lookback_hours`)

**Output:** Events created for any gaps, logged to CloudWatch

### 5. Authentication

**Type:** API Key (MVP simple approach)

**Implementation:**
- `packages/backend/src/middleware/auth.ts`
- Lambda middleware or API Gateway request validator
- Keys stored in `config` table:

```json
{
  "api_keys": {
    "staff-key-xxx": { "role": "staff", "name": "Customer Service" },
    "admin-key-yyy": { "role": "admin", "name": "Admin User" }
  }
}
```

**Role-based access:**
- `staff`: Read-only (search, profile, timeline)
- `admin`: Read + write (merge, split, overrides)

## Frontend Components

### Technology Stack
- **Framework:** React + Vite
- **Routing:** React Router v7
- **State:** TanStack Query (React Query) for server state
- **UI:** TailwindCSS + shadcn/ui components
- **HTTP:** Axios or fetch wrapper
- **Build:** TypeScript

### Application Structure

```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Router setup
├── pages/
│   ├── SearchPage.tsx          # / - Search interface
│   ├── ProfilePage.tsx         # /supporters/:id - Full profile
│   └── AdminPage.tsx           # /admin - Merge/split/audit
├── components/
│   ├── ui/                     # shadcn/ui base components
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   ├── search/
│   │   ├── SearchBar.tsx
│   │   └── SearchResultCard.tsx
│   ├── profile/
│   │   ├── ProfileHeader.tsx
│   │   ├── OverviewTab.tsx
│   │   ├── TimelineTab.tsx
│   │   ├── PurchasesTab.tsx
│   │   ├── MembershipTab.tsx
│   │   ├── StadiumEntryTab.tsx
│   │   ├── MailchimpTab.tsx
│   │   └── AdminTab.tsx
│   └── admin/
│       ├── MergeModal.tsx
│       └── AuditLog.tsx
├── hooks/
│   ├── useAuth.ts              # API key auth
│   ├── useSupporters.ts        # React Query wrappers
│   └── useSupporterProfile.ts  # Profile data
├── services/
│   └── api.ts                  # API client
├── types/
│   └── api.ts                  # Frontend-specific types
└── styles/
    └── globals.css
```

### Key Pages

**SearchPage (/)**
- Search bar with email/name/phone fields
- Results grid with cards showing:
  - Name, email
  - Supporter type badge
  - Last ticket order date
  - Last shop order date
  - Membership status indicator
- Click card → navigate to profile

**ProfilePage (/supporters/:id)**
- Header: name, email(s), phone, supporter type, flags
- Tab navigation: Overview, Timeline, Purchases, Membership, Stadium Entry, Mailchimp, Admin
- Each tab loads data via React Query

**AdminPage (/admin)**
- Merge interface: search two supporters, compare, confirm merge
- Audit log table with pagination
- (Future) split interface

## Error Handling

### Backend
- **Webhooks:** Always return 200, queue for processing. Failures → DLQ with error metadata
- **API:** Standardized `{ error, code, details }` responses
- **Processors:** Try-catch with logging, failed messages stay in queue for retry

### Frontend
- **React Error Boundary** for crashes
- **TanStack Query** retry with exponential backoff
- **User-friendly error messages** for API failures
- **Loading states** for all async operations

## Testing Strategy

### Unit Tests (Jest/Vitest)
- Repository methods
- Service layer (supporter type, reconciliation, mailchimp sync)
- Utilities and helpers

### Integration Tests
- Lambda handlers with mock events
- API endpoint tests with test database

### Frontend Tests (Vitest + React Testing Library)
- Search flow
- Profile page rendering
- Admin merge flow

### E2E Tests (Playwright)
- Full user journey: search → view profile → filter timeline → merge supporters

## Deployment Updates

### CDK Stack Additions
```typescript
// New Lambda functions
- FutureTicketingPollingHandler
- MailchimpTagSyncHandler
- SupporterTypeDerivationHandler
- ReconciliationHandler

// New EventBridge rules
- FutureTicketingPollingRule (15 min)
- MailchimpTagSyncRule (10 min)
- SupporterTypeDerivationRule (1 hour)
- ReconciliationRule (daily)

// Frontend deployment
- S3 bucket for static assets
- CloudFront distribution
- API Gateway + CloudFront integration
```

### Environment Variables
```
FUTURE_TICKETING_API_URL=
FUTURE_TICKETING_API_KEY=
MAILCHIMP_API_KEY=
MAILCHIMP_DC=  # data center
```

## Configuration (config table)

```sql
INSERT INTO config (key, value, description) VALUES
('future_ticketing_checkpoint', '{"last_fetch": null}', 'FT polling checkpoint'),
('mailchimp_sync_last_run', null, 'Last tag sync timestamp'),
('supporter_type_last_run', null, 'Last type derivation timestamp'),
('api_keys', '{"staff-key": {"role": "staff"}, ...}', 'API keys and roles'),
('tag_sync_enabled', 'true', 'Enable Mailchimp tag sync');
```

## Implementation Order

1. Backend integrations (FT, Mailchimp)
2. Supporter type derivation service
3. Reconciliation jobs
4. API key authentication
5. Frontend scaffolding
6. Frontend pages (search, profile, admin)
7. Testing
8. Deployment configuration

## Success Criteria (from PRD)

- AC1: Search <3 seconds typical
- AC2-3: Profile shows both last ticket and last shop order
- AC4-5: Timeline shows all events, filterable
- AC6-7: Purchase lists with all required fields
- AC8-9: Membership tab with tier/cadence/status
- AC10: Away Supporter tagging within 10 minutes
- AC11-13: Merge/split with audit log
- AC14-15: Mailchimp tags sync within 10 minutes
- AC16-18: Reliability (DLQ, reconciliation)
