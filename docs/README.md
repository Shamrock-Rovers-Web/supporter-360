# Supporter 360 Documentation

**Welcome to the Supporter 360 documentation hub.**

This directory contains comprehensive documentation for deploying, operating, and maintaining the Supporter 360 serverless system.

---

## Quick Start

### New to Supporter 360?

Start here:
1. **[Project README](../README.md)** - Project overview and architecture
2. **[Deployment Guide](deployment.md)** - How to deploy Supporter 360
3. **[Deployment Verification Report](deployment-verification.md)** - Current system status

### Operating the System?

Essential reading for operations:
1. **[Runbooks](runbooks/)** - Operational procedures and incident response
2. **[Handoff Document](handoff.md)** - Operational handoff and training guide
3. **[Security Checklist](security-checklist.md)** - Security procedures and best practices

---

## Documentation Index

### Deployment & Infrastructure

| Document | Description | Last Updated |
|----------|-------------|--------------|
| **[Deployment Guide](deployment.md)** | Step-by-step deployment instructions | 2024-03-24 |
| **[Deployment Verification Report](deployment-verification.md)** | Comprehensive system status and configuration | 2024-03-24 |
| **[Migration Plan](serverless-migration-plan.md)** | Serverless migration strategy and timeline | 2024-03-24 |
| **[Testing Plan](migration-testing-plan.md)** | Migration testing procedures and validation | 2024-03-24 |
| **[Rollback Procedures](migration-rollback.md)** | Migration rollback procedures | 2024-03-24 |

### Operations & Runbooks

| Document | Description | Last Updated |
|----------|-------------|--------------|
| **[Runbooks Index](runbooks/index.md)** | Quick reference for all runbooks | 2024-03-24 |
| **[Incident Response Runbook](runbooks/incident-response.md)** | Diagnose and respond to production incidents | 2024-03-24 |
| **[Rollback Procedures Runbook](runbooks/rollback-procedures.md)** | Roll back changes to previous state | 2024-03-24 |
| **[Backup and Restore Runbook](runbooks/backup-restore.md)** | Backup and restore procedures | 2024-03-24 |
| **[Performance Tuning Runbook](runbooks/performance-tuning.md)** | Optimize system performance | 2024-03-24 |
| **[Handoff Document](handoff.md)** | Operational handoff and training guide | 2024-03-24 |

### Security & Compliance

| Document | Description | Last Updated |
|----------|-------------|--------------|
| **[Security Checklist](security-checklist.md)** | Security procedures and best practices | 2024-03-24 |
| **[Security Monitoring](security-monitoring.md)** | Security monitoring and alerting | 2024-03-24 |
| **[API Rate Limiting](api-rate-limiting.md)** | Rate limiting configuration | 2024-03-24 |
| **[CORS and Auth Guide](README-CORS-AUTH.md)** | CORS and authentication configuration | 2024-03-24 |

### Scripts & Automation

| Script | Description | Location |
|--------|-------------|----------|
| **Post-Deployment Checklist** | Validate deployment health | `scripts/post-deployment-checklist.sh` |
| **Readiness Report Generator** | Generate production readiness score | `scripts/generate-readiness-report.sh` |
| **Health Check** | Quick system health check | `scripts/health-check.sh` |
| **Security Validation** | Validate security configuration | `scripts/security-validation.ts` |
| **Deployment Validation** | Comprehensive deployment validation | `scripts/validate-deployment.sh` |

---

## Documentation by Role

### For Developers

- **[Project README](../README.md)** - Architecture and code organization
- **[Deployment Guide](deployment.md)** - How to deploy changes
- **[Security Checklist](security-checklist.md)** - Security best practices
- **[API Rate Limiting](api-rate-limiting.md)** - Rate limiting configuration

### For Operators

- **[Runbooks Index](runbooks/index.md)** - All operational procedures
- **[Handoff Document](handoff.md)** - Training and operational guide
- **[Incident Response Runbook](runbooks/incident-response.md)** - Incident procedures
- **[Deployment Verification Report](deployment-verification.md)** - Current system status

### For Security Engineers

- **[Security Checklist](security-checklist.md)** - Security procedures
- **[Security Monitoring](security-monitoring.md)** - Security monitoring setup
- **[CORS and Auth Guide](README-CORS-AUTH.md)** - Authentication configuration

### For Managers

- **[Deployment Verification Report](deployment-verification.md)** - Production readiness status
- **[Handoff Document](handoff.md)** - Operational overview
- **[Migration Plan](serverless-migration-plan.md)** - Migration timeline and strategy

---

## Quick Links

### Monitoring

- **CloudWatch Dashboard:** AWS Console → CloudWatch → Dashboards → Supporter360-Production
- **CloudWatch Logs:** AWS Console → CloudWatch → Log Groups → /aws/lambda/Supporter360StackV2-*
- **CloudTrail:** AWS Console → CloudTrail → Supporter360-Trail

### System Status

- **API Gateway:** https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod
- **Webhook Endpoints:** https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod/webhooks/*
- **Database:** supporter360-supporter360-database.cluster-<region>.rds.amazonaws.com

### External Providers

- **Shopify:** https://partners.shopify.com/ (Shop: shamrock-rovers-fc.myshopify.com)
- **Stripe:** https://dashboard.stripe.com/
- **GoCardless:** https://dashboard.gocardless.com/
- **Mailchimp:** https://us5.admin.mailchimp.com/
- **Future Ticketing:** <dashboard-url>

---

## Common Tasks

### Deploy Changes

```bash
cd packages/infrastructure
npm run build
cdk deploy Supporter360StackV2 --require-approval never
```

### Check System Health

```bash
./scripts/health-check.sh
```

### Validate Deployment

```bash
./scripts/post-deployment-checklist.sh
```

### Generate Readiness Report

```bash
./scripts/generate-readiness-report.sh
```

### View Logs

```bash
# Tail Lambda logs
aws logs tail /aws/lambda/Supporter360StackV2-ShopifyProcessor --follow

# Filter for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/Supporter360StackV2-* \
  --filter-pattern "ERROR"
```

---

## Documentation Standards

### Writing Documentation

1. **Use clear, concise language** - Avoid jargon where possible
2. **Include examples** - Show code snippets and commands
3. **Keep it current** - Update docs when making changes
4. **Use consistent formatting** - Follow markdown best practices
5. **Add diagrams** - Visual aids help understanding

### Documentation Review

- **Review quarterly** - Check for outdated information
- **Update after incidents** - Add lessons learned to runbooks
- **Update after deployments** - Document new features or changes
- **Get peer review** - Have someone else review your changes

### File Organization

```
docs/
├── README.md                           # This file
├── deployment.md                       # Deployment guide
├── deployment-verification.md          # System status
├── handoff.md                          # Operational handoff
├── security-checklist.md               # Security procedures
├── security-monitoring.md              # Security monitoring
├── api-rate-limiting.md                # Rate limiting
├── runbooks/                           # Operational procedures
│   ├── index.md                        # Runbook index
│   ├── incident-response.md            # Incident response
│   ├── rollback-procedures.md          # Rollback procedures
│   ├── backup-restore.md               # Backup/restore
│   └── performance-tuning.md           # Performance tuning
├── serverless-migration-plan.md        # Migration plan
├── migration-testing-plan.md           # Testing plan
└── migration-rollback.md               # Rollback plan
```

---

## Getting Help

### Documentation Issues

Found an error or missing information?
- **Report a bug:** Create a GitHub issue
- **Submit a fix:** Create a pull request
- **Request documentation:** Create a GitHub issue with label "documentation"

### Operational Issues

Need help with operations?
- **Check runbooks:** docs/runbooks/index.md
- **Contact on-call:** [On-call contact]
- **Escalate to manager:** [Manager contact]
- **AWS Support:** https://console.aws.amazon.com/support/home

### Technical Questions

Have technical questions?
- **Check CLAUDE.md:** Project instructions for AI assistants
- **Review code comments:** Source code has detailed comments
- **Check GitHub issues:** May already be answered
- **Ask in team chat:** Get help from team members

---

## Contributing

### How to Contribute

We welcome contributions to documentation!

1. **Fork the repository**
2. **Create a documentation branch** (`git checkout -b docs/my-change`)
3. **Make your changes**
4. **Test procedures** (if possible)
5. **Submit a pull request** with description of changes

### Contribution Guidelines

- **Be respectful** - Use inclusive language
- **Be clear** - Write for your audience
- **Be thorough** - Include all necessary steps
- **Be accurate** - Test procedures if possible
- **Be consistent** - Follow existing formatting

### Documentation Templates

#### Runbook Template

```markdown
# Title

**Purpose:** Brief description of what this runbook covers.

**Last Updated:** YYYY-MM-DD

## When to Use This Runbook

[Describe when to use this runbook]

## Prerequisites

[List any prerequisites]

## Procedure

### Step 1: [Title]

[Detailed steps with code examples]

## Verification

[How to verify the procedure worked]

## Troubleshooting

[Common issues and solutions]
```

#### Procedure Template

```markdown
## [Procedure Name]

**Purpose:** [Why this procedure exists]

**Prerequisites:** [What's needed before starting]

**Estimated Time:** [How long it takes]

### Steps

1. [First step]
   ```bash
   [Command]
   ```

2. [Second step]
   ```bash
   [Command]
   ```

**Expected Result:** [What should happen]

**Troubleshooting:** [Link to relevant runbook or troubleshooting section]
```

---

## Document Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2024-03-24 | Initial documentation library created | Documentation Worker |

---

## Quick Reference

### Emergency Contacts

- **On-Call:** [Contact]
- **Manager:** [Contact]
- **Security:** [Contact]
- **AWS Support:** [Account ID, Support Plan]

### Critical Commands

```bash
# System health
./scripts/health-check.sh

# Deployment validation
./scripts/post-deployment-checklist.sh

# Readiness report
./scripts/generate-readiness-report.sh

# View Lambda logs
aws logs tail /aws/lambda/Supporter360StackV2-* --follow

# Check queue depths
aws sqs get-queue-attributes --queue-url <queue-url> --attribute-names All

# Database connection
psql -h <DB_HOST> -U <DB_USER> -d supporter360
```

### Important Locations

- **Documentation:** `docs/`
- **Runbooks:** `docs/runbooks/`
- **Scripts:** `scripts/`
- **Infrastructure:** `packages/infrastructure/`
- **Backend:** `packages/backend/`
- **Database:** `packages/database/`

---

**Last Updated:** 2024-03-24
**Documentation Maintainer:** gleesonb@gmail.com

**For the most up-to-date information, always check the Git repository.**
