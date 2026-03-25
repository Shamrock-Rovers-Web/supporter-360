# Supporter 360

A unified supporter data platform for Shamrock Rovers FC.

## Overview

Supporter 360 consolidates supporter interactions from multiple systems into a single view:

- **Shopify** - Merchandise purchases and customer data
- **Future Ticketing** - Match tickets and stadium entry
- **Stripe** - One-off payments
- **GoCardless** - Direct debit membership payments
- **Mailchimp** - Email engagement and audience management

**Current Status**: Production infrastructure deployed. Webhook integrations ready for configuration.

## Architecture

### Serverless AWS Stack

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   External  │────▶│ API Gateway │────▶│   Lambda    │
│   Webhooks   │     │  (REST API)  │     │  (Handlers) │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                    │
                    ┌───────────────▼────────────────┐
                    │         SQS Queue            │
                    │   (Event Buffering)          │
                    └───────────────┬──────────────┘
                                    │
                    ┌───────────────▼────────────────┐
                    │   Lambda Processor          │
                    │   (Business Logic)           │
                    └───────────────┬──────────────┘
                                    │
                    ┌───────────────▼────────────────┐
                    │   RDS PostgreSQL 15         │
                    │   (Primary Database)         │
                    └──────────────────────────────┘
                                    │
                    ┌───────────────▼────────────────┐
                    │   S3 (Payload Archive)        │
                    │   (90-day Glacier tier)       │
                    └──────────────────────────────┘
```

### AWS Components

| Component | Purpose |
|-----------|---------|
| API Gateway | REST API for webhooks and public endpoints |
| Lambda (Node.js 18) | Webhook handlers, processors, API handlers |
| SQS + DLQ | Event queues with 14-day retention |
| RDS PostgreSQL 15 | Primary database (Serverless v2, 2-4 ACU) |
| S3 | Raw webhook payload archiving |
| WAF | API protection with rate limiting |
| Secrets Manager | Database credentials and webhook secrets |
| VPC | Network isolation with public subnets |

### Data Model

**Supporter Identity**
- `supporter_id` (UUID) - Primary identity
- Email NOT unique (supports family/shared emails via `email_alias` table)
- `linked_ids` JSONB stores external system references

**Event Deduplication**
- UNIQUE constraint on `(source_system, external_id)`
- Idempotent event processing

## Project Structure

```
supporter-360/
├── packages/
│   ├── backend/           # Lambda functions
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── connection.ts
│   │   │   │   └── repositories/
│   │   │   ├── handlers/
│   │   │   │   ├── webhooks/    # Webhook ingestion
│   │   │   │   ├── processors/   # Event processing
│   │   │   │   └── api/        # API endpoints
│   │   │   └── services/
│   │   └── package.json
│   ├── database/          # Schema
│   │   ├── schema.sql
│   │   └── package.json
│   ├── infrastructure/    # AWS CDK
│   │   ├── bin/
│   │   ├── lib/
│   │   │   └── supporter360-stack.ts
│   │   └── package.json
│   ├── frontend/          # React UI (planned)
│   └── shared/            # TypeScript types
├── docs/                # Documentation
│   ├── WEBHOOK-SETUP-GUIDE.md
│   ├── deployment.md
│   └── security-hardening.md
├── CLAUDE.md
├── NOTES.md
└── package.json
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- AWS CLI configured
- AWS CDK CLI (`npm install -g aws-cdk`)
- PostgreSQL client

### Installation

```bash
# Clone and install
git clone <repo-url>
cd supporter-360
npm install

# Build all packages
npm run build
```

### Database Setup

```bash
# Apply schema to PostgreSQL
psql -h <DB_HOST> -U <DB_USER> -d supporter360 -f packages/database/schema.sql
```

### AWS Deployment

```bash
# Configure AWS credentials
aws configure

# Bootstrap CDK (first time only)
cd packages/infrastructure
npx cdk bootstrap

# Deploy the stack
npx cdk deploy
```

**Deployment Outputs:**
- `ApiUrl` - API Gateway endpoint
- `DatabaseEndpoint` - RDS endpoint
- `DatabaseSecretArn` - Secrets Manager ARN
- `RawPayloadsBucketName` - S3 bucket for payload archiving

## API Endpoints

### Public API (Requires X-API-Key header)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search?q={query}` | Search supporters by email/name/phone |
| GET | `/supporters/{id}` | Get supporter profile |
| GET | `/supporters/{id}/timeline` | Get supporter event timeline |

### Webhook Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/shopify` | Shopify order/customer events |
| POST | `/webhooks/stripe` | Stripe payment events |
| POST | `/webhooks/gocardless` | GoCardless mandate events |
| POST | `/webhooks/mailchimp` | Mailchimp email events |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/merge` | Merge two supporter records |
| GET | `/admin/gdpr/export/{email}` | Export supporter data (GDPR) |
| DELETE | `/admin/gdpr/delete/{email}` | Delete supporter data (GDPR) |

## Webhook Configuration

See [docs/WEBHOOK-SETUP-GUIDE.md](docs/WEBHOOK-SETUP-GUIDE.md) for detailed setup instructions.

### Quick Reference

**Shopify** (`/webhooks/shopify`)
- Events: `orders/create`, `orders/paid`, `customers/create`, `customers/update`
- Verification: HMAC-SHA256 signature

**Stripe** (`/webhooks/stripe`)
- Events: All payment and customer events
- Verification: HMAC-SHA256 signature with tolerance

**GoCardless** (`/webhooks/gocardless`)
- Events: All mandate events
- Verification: HMAC-SHA256 signature

**Mailchimp** (`/webhooks/mailchimp`)
- Events: Subscribe, unsubscribe, campaign events
- Verification: Basic auth or signature

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `supporter` | Primary identity with linked_ids JSONB |
| `email_alias` | Multiple emails per supporter |
| `event` | Unified timeline with deduplication |
| `membership` | Membership status and payments |
| `mailchimp_membership` | Multi-audience Mailchimp mappings |
| `audit_log` | Admin action audit trail |
| `config` | System configuration values |

## Security

### Implemented

- ✅ Webhook signature verification (Shopify, Stripe, GoCardless)
- ✅ API key authentication via Lambda authorizer
- ✅ WAF rate limiting and common attack protection
- ✅ Database credentials in Secrets Manager
- ✅ VPC isolation for Lambda and RDS
- ✅ S3 bucket encryption
- ✅ GDPR endpoints for data export and deletion

### Configuration Required

- Webhook secrets in Secrets Manager
- API keys for admin access
- Email subscription for security alerts

## Monitoring

- **CloudWatch Logs** - Lambda function logs
- **SQS DLQ** - Failed event queue monitoring
- **CloudWatch Metrics** - API Gateway and Lambda performance
- **WAF** - Request logging and blocked requests

## Development

### Commands

```bash
npm run build          # Build all packages
npm test             # Run tests
npm run lint           # Lint code
```

### Local Development

Use AWS SAM or LocalStack for local Lambda testing:

```bash
npm install -g aws-sam
sam local start-api
```

## Documentation

- [CLAUDE.md](CLAUDE.md) - AI assistant instructions
- [NOTES.md](NOTES.md) - Current status and notes
- [docs/WEBHOOK-SETUP-GUIDE.md](docs/WEBHOOK-SETUP-GUIDE.md) - Webhook setup
- [docs/deployment.md](docs/deployment.md) - Deployment guide
- [docs/security-hardening.md](docs/security-hardening.md) - Security implementation

## Status

| Component | Status |
|-----------|--------|
| Infrastructure | ✅ Deployed |
| Database | ✅ Schema applied |
| Webhook Handlers | ✅ Implemented |
| Event Processors | ✅ Implemented |
| API Endpoints | ✅ Implemented |
| Security | ✅ Hardened |
| GDPR Compliance | ✅ Endpoints ready |
| Frontend | 🔲 Planned |
| Future Ticketing | 🔲 Planned |
| Mailchimp Processor | 🔲 Planned |

## License

Proprietary - Shamrock Rovers FC
