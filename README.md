# Supporter 360

Single pane of glass for Shamrock Rovers supporter data across ticketing, shop, membership, and email engagement.

## Overview

Supporter 360 is an internal staff tool that consolidates supporter interactions from multiple systems into a unified view:

- **Shopify** - Shop purchases and customer data
- **Future Ticketing** - Match tickets and stadium entry logs
- **Stripe** - One-off payments and arrears
- **GoCardless** - Direct debit membership payments
- **Mailchimp** - Email engagement and multi-audience tag management

## Architecture

### Serverless AWS Stack

- **API Gateway** - REST API endpoints
- **Lambda Functions** - Webhook handlers, processors, and API handlers
- **SQS + DLQ** - Event queue with dead letter queue for retries
- **RDS PostgreSQL** - Primary database
- **S3** - Raw webhook payload storage
- **EventBridge** - Scheduled reconciliation jobs

### Data Flow

```
Webhook → API Gateway → Lambda (Webhook Handler) → SQS → Lambda (Processor) → PostgreSQL
                                                            ↓
                                                         S3 (Raw Payload Archive)
```

## Project Structure

```
supporter-view/
├── packages/
│   ├── backend/           # Lambda functions and business logic
│   │   ├── src/
│   │   │   ├── db/        # Database connection and repositories
│   │   │   ├── handlers/  # Lambda handlers
│   │   │   │   ├── webhooks/    # Webhook ingestion
│   │   │   │   ├── processors/  # Event processors
│   │   │   │   └── api/         # API endpoints
│   │   │   └── services/        # Business logic services
│   │   └── package.json
│   ├── database/          # Database schema and migrations
│   │   ├── schema.sql
│   │   └── package.json
│   ├── infrastructure/    # AWS CDK infrastructure
│   │   ├── bin/
│   │   ├── lib/
│   │   └── package.json
│   ├── frontend/          # React UI (future)
│   └── shared/            # Shared types and utilities
│       ├── src/
│       │   └── types.ts
│       └── package.json
├── package.json           # Root package.json (workspace)
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- AWS CLI configured
- AWS CDK CLI (`npm install -g aws-cdk`)
- PostgreSQL client (for local development)

### Installation

1. Clone the repository:
```bash
cd supporter-view
```

2. Install dependencies:
```bash
npm install
```

3. Build all packages:
```bash
npm run build
```

### Database Setup

1. The database schema is in `packages/database/schema.sql`

2. Connect to your PostgreSQL database and run the schema:
```bash
psql -h <DB_HOST> -U <DB_USER> -d supporter360 -f packages/database/schema.sql
```

### AWS Deployment

1. Configure AWS credentials:
```bash
aws configure
```

2. Bootstrap CDK (first time only):
```bash
cd packages/infrastructure
npx cdk bootstrap
```

3. Deploy the stack:
```bash
npx cdk deploy
```

4. Note the outputs:
   - API Gateway URL
   - Database endpoint
   - Database secret ARN
   - S3 bucket name

### Environment Variables

Set these in Lambda function environment:

```bash
DB_HOST=<RDS_ENDPOINT>
DB_PORT=5432
DB_NAME=supporter360
DB_USER=postgres
DB_PASSWORD=<FROM_SECRETS_MANAGER>
RAW_PAYLOADS_BUCKET=supporter360-raw-payloads-<ACCOUNT_ID>
GOCARDLESS_ACCESS_TOKEN=<YOUR_TOKEN>
```

## API Endpoints

### Public API

- `GET /search?q={query}` - Search supporters by email/name/phone
- `GET /supporters/{id}` - Get supporter profile
- `GET /supporters/{id}/timeline` - Get supporter timeline

### Webhook Endpoints

- `POST /webhooks/shopify` - Shopify webhooks
- `POST /webhooks/stripe` - Stripe webhooks
- `POST /webhooks/gocardless` - GoCardless webhooks

### Admin Endpoints

- `POST /admin/merge` - Merge two supporter records

## Database Schema

### Core Tables

- `supporter` - Supporter identity and linked IDs
- `email_alias` - Email addresses (supports shared emails)
- `event` - Unified event timeline
- `membership` - Membership status and payments
- `mailchimp_membership` - Multi-audience Mailchimp mappings
- `future_ticketing_product_mapping` - Product categorization
- `audit_log` - Admin action audit trail
- `config` - System configuration

## Webhook Configuration

### Shopify

Configure webhooks in Shopify Admin → Settings → Notifications:

- `orders/create` → `{API_URL}/webhooks/shopify`
- `orders/paid` → `{API_URL}/webhooks/shopify`
- `orders/fulfilled` → `{API_URL}/webhooks/shopify`
- `customers/create` → `{API_URL}/webhooks/shopify`
- `customers/update` → `{API_URL}/webhooks/shopify`

### Stripe

Configure webhooks in Stripe Dashboard → Developers → Webhooks:

- Endpoint URL: `{API_URL}/webhooks/stripe`
- Events to listen:
  - `payment_intent.*`
  - `charge.*`
  - `customer.*`
  - `invoice.*`
  - `checkout.session.*`

### GoCardless

Configure webhooks in GoCardless Dashboard → Developers → Webhooks:

- Endpoint URL: `{API_URL}/webhooks/gocardless`
- All events enabled

## Features Implemented

- Webhook ingestion for Shopify, Stripe, and GoCardless
- Event queue with retry and DLQ
- Supporter search by email/name/phone
- Unified profile view
- Timeline view with filtering
- Database repositories for supporter and event data
- AWS CDK infrastructure as code
- S3 raw payload archiving

## Features Pending

- Future Ticketing integration (polling/API)
- Mailchimp integration (multi-audience + tags + click events)
- Supporter type derivation logic
- Admin UI for merge/split operations
- Reconciliation jobs for missed webhooks
- Backfill scripts for historical data
- Frontend UI (React/Next.js)
- Authentication and authorization

## Development

### Running Locally

For local development, you can use AWS SAM or LocalStack to test Lambda functions locally.

### Testing

```bash
npm run test
```

### Linting

```bash
npm run lint
```

## Deployment

Deploy updates:

```bash
cd packages/backend
npm run build

cd ../infrastructure
npx cdk deploy
```

## Monitoring

- CloudWatch Logs for Lambda function logs
- SQS DLQ monitoring for failed events
- CloudWatch Metrics for API Gateway and Lambda

## Security

- All webhooks should use signature verification (implement in production)
- Database credentials stored in AWS Secrets Manager
- VPC isolation for Lambda and RDS
- S3 bucket encryption enabled
- No public access to S3 buckets

## Support

For issues and questions, contact the development team.

## License

Proprietary - Shamrock Rovers FC
