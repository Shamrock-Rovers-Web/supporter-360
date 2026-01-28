# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Always Read Current Status Notes

**Before starting work, read `NOTES.md` for the current status of the project, pending work, and recent changes.**

This file contains session-to-session continuity notes about what's been done, what's broken, and what needs to happen next.

## Project Overview

Supporter 360 is an internal staff tool for Shamrock Rovers FC that consolidates supporter data from multiple systems (Shopify, Future Ticketing, Stripe, GoCardless, Mailchimp) into a unified PostgreSQL database with a serverless AWS backend.

## Common Commands

### Building
```bash
npm run build              # Build all packages
cd packages/backend && npm run build    # Build backend only
cd packages/infrastructure && npm run build  # Build CDK infrastructure
```

### Database
```bash
# Apply schema to PostgreSQL
psql -h <DB_HOST> -U <DB_USER> -d supporter360 -f packages/database/schema.sql
```

### Deployment
```bash
cd packages/infrastructure
npx cdk bootstrap         # First time only
npx cdk synth             # Synthesize CloudFormation
npx cdk deploy            # Deploy stack
```

### Testing
```bash
npm test                  # Run tests across all packages
```

## Architecture

### Monorepo Structure (npm workspaces)
- `packages/backend` - Lambda functions (handlers, repositories, services)
- `packages/database` - PostgreSQL schema and migrations
- `packages/infrastructure` - AWS CDK stack definition
- `packages/shared` - TypeScript types shared across packages
- `packages/frontend` - React UI (planned, not yet implemented)

### Ingestion Pattern (Queue-First Design)
```
Webhook → API Gateway → Lambda (Webhook Handler) → SQS → Lambda (Processor) → PostgreSQL
                                                            ↓
                                                         S3 (Raw Payload Archive)
```

Each external system has:
1. **Webhook Handler** (`handlers/webhooks/{system}.handler.ts`) - Lightweight ingestion, stores raw payload to S3, queues message
2. **Processor** (`handlers/processors/{system}.processor.ts`) - Runs in VPC, processes queue messages, writes to PostgreSQL

### AWS Components
- **API Gateway** - REST API for webhooks and public endpoints
- **Lambda** - Node.js 18 handlers for webhooks, processors, and API endpoints
- **SQS + DLQ** - Event queues with 14-day retention for failed events
- **RDS PostgreSQL 15** - Primary database in VPC private subnets
- **S3** - Raw webhook payload archiving with Glacier transition after 90 days
- **EventBridge** - Scheduled reconciliation jobs (planned)

### Key Data Model Concepts

**Supporter Identity**
- `supporter_id` (UUID) is the primary identity
- Email is NOT unique due to shared/family emails - use `email_alias` table for multiple supporters per email
- `linked_ids` JSONB field stores external system IDs (shopify, futureticketing, stripe, gocardless)

**Event Deduplication**
- `event` table has `UNIQUE(source_system, external_id)` constraint
- Always use external event IDs as dedupe keys when inserting

**Supporter Type Derivation**
- Auto-derived from behavior, stored in `supporter_type` field
- `supporter_type_source` indicates if it's 'auto' or 'admin_override'
- Configurable via `config` table (e.g., `paid_up_grace_days_monthly`)

### Repository Pattern
Database access is through repository classes in `packages/backend/src/db/repositories/`:
- `SupporterRepository` - supporter CRUD, search, merge, profile
- `EventRepository` - timeline queries, event insertion

Always use `transaction()` from `connection.ts` for multi-step operations.

## Lambda Handlers

### Webhook Handlers
Return quickly after queuing - no heavy processing. Each stores raw payload to S3 with key pattern: `{system}/{date}/{uuid}.json`

### API Handlers
- `search.handler.ts` - Search by email/name/phone
- `profile.handler.ts` - Get full supporter profile
- `timeline.handler.ts` - Get filtered timeline events
- `admin/merge.handler.ts` - Merge two supporter records

## Environment Variables (Lambda)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL connection (from Secrets Manager)
- `RAW_PAYLOADS_BUCKET` - S3 bucket for payload archiving
- `{SYSTEM}_QUEUE_URL` - SQS queue URL for each webhook source

## Important Implementation Notes

### Membership Logic (MVP)
Uses configurable defaults - "paid up" business logic is deliberately simple for MVP:
- `paid_up_grace_days_monthly`: 35 days default
- `annual_validity_days`: 365 days default
- Full business rules deferred to Phase 2

### Away Supporter Detection
Uses `future_ticketing_product_mapping` table to categorize products as Away Supporter, Season Ticket, etc.

### Merge Operations
Must use transactions - merge updates all related records (events, email_aliases, memberships, mailchimp_memberships) and writes to `audit_log`.

## Pending Features (MVP Scope)
- Future Ticketing integration (polling/API for tickets + stadium entry)
- Mailchimp integration (multi-audience tag sync + click event ingestion)
- Supporter type auto-derivation logic
- Reconciliation jobs for missed webhooks
- Frontend UI
- Authentication/authorization
