# Supporter 360 Operational Handoff Document

**Purpose:** Comprehensive handoff guide for operational team taking over Supporter 360.

**Last Updated:** 2026-03-24
**Version:** 1.0

---

## Document Overview

This handoff document provides all necessary information for the operational team to manage, monitor, and troubleshoot Supporter 360 in production.

### Handoff Checklist

- [ ] Review this document entirely
- [ ] Complete training session (2 hours)
- [ ] Run post-deployment checklist
- [ ] Review runbooks
- [ ] Set up monitoring dashboards
- [ ] Test incident response procedures
- [ ] Configure alert subscriptions
- [ ] Join on-call rotation

---

## System Architecture Overview

### High-Level Architecture

```
External Systems (Shopify, Stripe, GoCardless, Mailchimp, Future Ticketing)
         ↓
Webhook Endpoints (API Gateway)
         ↓
Lambda Webhook Handlers (public subnets)
         ↓
SQS Queues + DLQs
         ↓
Lambda Processors (private subnets with VPC endpoints)
         ↓
PostgreSQL Database (RDS Serverless v2)
         ↓
S3 Raw Payloads (archived to Glacier after 90 days)
```

### Key Components

**AWS Infrastructure:**
- **VPC:** 2 AZ configuration with public and private isolated subnets
- **RDS Serverless v2:** Aurora PostgreSQL 14.15 (0.5-2 ACU scaling)
- **API Gateway:** REST API with `/prod` stage
- **Lambda:** 20 functions (webhook handlers, processors, API handlers)
- **SQS:** 8 queues (4 main + 4 DLQs)
- **S3:** Raw payloads bucket + frontend hosting bucket
- **VPC Endpoints:** Secrets Manager, SQS, S3 (cost-optimized)

**Integrations:**
- **Shopify:** EventBridge + HTTPS webhooks (customers working, orders need scope)
- **Stripe:** HTTPS webhooks (needs configuration)
- **GoCardless:** HTTPS webhooks (needs configuration)
- **Mailchimp:** HTTPS webhooks (needs configuration)
- **Future Ticketing:** Polling every 5 minutes ✅ WORKING

---

## Access and Credentials

### AWS Console Access

1. **AWS Account ID:** <your-account-id>
2. **Console URL:** https://<account-id>.signin.aws.amazon.com/console
3. **Region:** eu-west-1 (Ireland)
4. **Default Role:** Supporter360-Operators

### Required Permissions

Operators need access to:
- **Lambda:** View logs, invoke functions, update configuration
- **API Gateway:** View configuration, test endpoints
- **RDS:** View metrics, connect to database
- **SQS:** View queue attributes, purge queues
- **S3:** View buckets, access raw payloads
- **CloudWatch:** View metrics, create alarms, view logs
- **Secrets Manager:** View secret values (for troubleshooting)

### Database Access

```bash
# Get database credentials
aws secretsmanager get-secret-value \
  --secret-id Supporter360StackV2-postgres \
  --query SecretString \
  --output text

# Connect to database
psql -h <DB_HOST> -U <DB_USER> -d supporter360
```

### External Provider Access

- **Shopify Partners:** https://partners.shopify.com/ (Shop: shamrock-rovers-fc.myshopify.com)
- **Stripe Dashboard:** https://dashboard.stripe.com/
- **GoCardless Dashboard:** https://dashboard.gocardless.com/
- **Mailchimp Audience:** https://us5.admin.mailchimp.com/
- **Future Ticketing:** <FT-dashboard-URL>

---

## Monitoring and Alerting

### CloudWatch Dashboard

**Dashboard Name:** Supporter360-Production

**Key Metrics to Monitor:**
- Lambda duration (p95, p99)
- Lambda error rate
- API Gateway latency
- API Gateway 4XX/5XX errors
- RDS CPU utilization
- RDS connections
- SQS queue depth
- SQS message age

**Access:** AWS Console → CloudWatch → Dashboards → Supporter360-Production

### Critical Alarms

The following alarms should be configured and subscribed to:

1. **supporter360-lambda-errors** - Lambda error rate > 5%
2. **supporter360-api-5xx** - API Gateway 5XX errors
3. **supporter360-rds-cpu** - RDS CPU > 80%
4. **supporter360-shopify-dlq** - Shopify DLQ has messages
5. **supporter360-stripe-dlq** - Stripe DLQ has messages
6. **supporter360-gocardless-dlq** - GoCardless DLQ has messages
7. **supporter360-mailchimp-dlq** - Mailchimp DLQ has messages
8. **supporter360-queue-age** - Queue messages older than 1 hour

**Alert Subscription:** SNS topic: Supporter360-Alerts

### Log Analysis

**CloudWatch Log Groups:**
- `/aws/lambda/Supporter360StackV2-*` - Lambda function logs
- `/aws/apigateway/Supporter360` - API Gateway logs
- `/aws/vpc/flow-logs` - VPC flow logs (if enabled)

**Saved Queries:**
1. **Errors last hour:**
   ```
   fields @timestamp, @message
   | filter @message like /ERROR/
   | sort @timestamp desc
   | limit 100
   ```

2. **Webhook processing:**
   ```
   fields @timestamp, @message
   | parse @message "Webhook received: *" as webhookId
   | stats count() by webhookId
   | sort count() desc
   ```

---

## Operational Procedures

### Daily Operations (5 minutes)

1. **Check CloudWatch dashboard** - Verify metrics are normal
2. **Review alerts** - Check for any alarms in ALARM state
3. **Check DLQs** - Verify no messages in dead-letter queues
4. **Review error logs** - Look for new errors in last 24 hours

### Weekly Operations (30 minutes)

1. **Review Lambda duration trends** - Look for performance degradation
2. **Check queue processing** - Verify no backlog
3. **Review database performance** - Check CPU, connections, query latency
4. **Test external integrations** - Verify all webhooks receiving events
5. **Review security logs** - Check CloudTrail for unusual activity

### Monthly Operations (2 hours)

1. **Review and rotate secrets** - Update webhook secrets if needed
2. **Database maintenance** - Check for table bloat, run VACUUM if needed
3. **Cost review** - Check AWS billing for anomalies
4. **Backup verification** - Test restore procedure
5. **Documentation review** - Update runbooks with lessons learned

### On-Call Procedures

**When on-call:**

1. **Respond to alerts within 15 minutes** (P1/P2 incidents)
2. **Follow incident response runbook** - docs/runbooks/incident-response.md
3. **Create incident channel** - Name format: `inc-YYYYMMDD-<description>`
4. **Provide regular updates** - Every 30 minutes during active incident
5. **Document post-mortem** - Complete within 1 week of incident

**Escalation path:**
1. **On-Call Engineer** (you)
2. **Engineering Manager** [Contact]
3. **CTO** [Contact]

---

## Common Operational Tasks

### Check System Health

```bash
# Run health check script
./scripts/health-check.sh

# Or manually:
curl -I https://<api-id>.execute-api.eu-west-1.amazonaws.com/prod/search?q=test

# Check Lambda errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/Supporter360StackV2-* \
  --filter-pattern "ERROR" \
  --start-time $(date -d '15 minutes ago' +%s)000

# Check queue depths
for queue in shopify stripe gocardless mailchimp; do
  depth=$(aws sqs get-queue-attributes \
    --queue-url https://sqs.eu-west-1.amazonaws.com/<account>/supporter360-${queue}-queue \
    --attribute-names ApproximateNumberOfMessages \
    --query 'Attributes.ApproximateNumberOfMessages' \
    --output text)
  echo "${queue}: ${depth} messages"
done
```

### View Recent Logs

```bash
# Tail Lambda logs in real-time
aws logs tail /aws/lambda/Supporter360StackV2-ShopifyProcessor --follow

# Filter for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/Supporter360StackV2-ShopifyProcessor \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000
```

### Check Webhook Status

```bash
# Check webhook endpoint URLs
API_ID=$(aws apigateway get-rest-apis --query 'Items[?name==`Supporter360StackV2`].id' --output text)
echo "Shopify: https://${API_ID}.execute-api.eu-west-1.amazonaws.com/prod/webhooks/shopify"
echo "Stripe: https://${API_ID}.execute-api.eu-west-1.amazonaws.com/prod/webhooks/stripe"
echo "GoCardless: https://${API_ID}.execute-api.eu-west-1.amazonaws.com/prod/webhooks/gocardless"
echo "Mailchimp: https://${API_ID}.execute-api.eu-west-1.amazonaws.com/prod/webhooks/mailchimp"
```

### Purge Queue (Use with Caution)

```bash
# Purge main queue (WARNING: Deletes all messages)
aws sqs purge-queue \
  --queue-url https://sqs.eu-west-1.amazonaws.com/<account>/supporter360-shopify-queue
```

### Invoke Lambda Function Manually

```bash
# Test processor
aws lambda invoke \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --payload '{"Records":[{"body":"{\"test\":\"data\"}"}]}' \
  response.json

cat response.json
```

---

## Troubleshooting Guide

### Webhook Not Processing

**Symptoms:** Messages accumulating in queue, DLQ filling up

**Diagnosis:**
1. Check webhook handler logs for signature verification errors
2. Check processor logs for uncaught exceptions
3. Check SQS permissions for Lambda
4. Verify environment variables are set

**Resolution:** See Incident Response Runbook - Webhook Processing Failures

### Database Connection Issues

**Symptoms:** Lambda functions can't connect to database

**Diagnosis:**
1. Check RDS status
2. Check security group rules
3. Verify VPC endpoints
4. Test database connectivity

**Resolution:** See Incident Response Runbook - Database Connectivity Issues

### API Errors

**Symptoms:** API Gateway returning 5XX errors

**Diagnosis:**
1. Check Lambda function logs
2. Check Lambda timeout settings
3. Verify API key is valid
4. Check CORS configuration

**Resolution:** See Incident Response Runbook - API Gateway Errors

### Performance Degradation

**Symptoms:** Slow response times, high Lambda duration

**Diagnosis:**
1. Check Lambda duration metrics
2. Check RDS CPU and connections
3. Review query performance
4. Check for network latency

**Resolution:** See Performance Tuning Runbook

---

## Runbooks Reference

### Available Runbooks

All runbooks are located in `docs/runbooks/`:

1. **[incident-response.md](../runbooks/incident-response.md)** - Diagnose and respond to production incidents
2. **[rollback-procedures.md](../runbooks/rollback-procedures.md)** - Roll back changes to previous stable state
3. **[backup-restore.md](../runbooks/backup-restore.md)** - Backup and restore data and configuration
4. **[performance-tuning.md](../runbooks/performance-tuning.md)** - Optimize system performance
5. **[index.md](../runbooks/index.md)** - Runbook index and quick reference

### When to Use Runbooks

| Situation | Runbook | Severity |
|-----------|---------|----------|
| Webhook processing failing | Incident Response | P2 |
| Database connectivity issues | Incident Response | P1 |
| API errors or slow responses | Incident Response | P2 |
| Lambda functions crashing | Incident Response | P2 |
| SQS queue backlog | Incident Response | P2 |
| Need to rollback deployment | Rollback Procedures | P1-P2 |
| Need to restore database | Backup and Restore | P1 |
| System slow performance | Performance Tuning | P2 |

---

## Documentation Links

### Operational Documentation

- **Deployment Guide:** [docs/deployment.md](../deployment.md)
- **Deployment Verification:** [docs/deployment-verification.md](../deployment-verification.md)
- **Security Checklist:** [docs/security-checklist.md](../security-checklist.md)
- **Security Monitoring:** [docs/security-monitoring.md](../security-monitoring.md)
- **API Rate Limiting:** [docs/api-rate-limiting.md](../api-rate-limiting.md)

### Architecture Documentation

- **Project README:** [README.md](../README.md)
- **CLAUDE.md:** [CLAUDE.md](../CLAUDE.md) - Project instructions for Claude Code

### Scripts

- **Post-Deployment Checklist:** [scripts/post-deployment-checklist.sh](../scripts/post-deployment-checklist.sh)
- **Readiness Report Generator:** [scripts/generate-readiness-report.sh](../scripts/generate-readiness-report.sh)
- **Health Check:** [scripts/health-check.sh](../scripts/health-check.sh)
- **Security Validation:** [scripts/security-validation.ts](../scripts/security-validation.ts)

---

## Contact Information

### Team Contacts

- **Owner:** gleesonb@gmail.com
- **Engineering Manager:** [Contact]
- **On-Call Engineer:** [Contact]
- **Database Administrator:** [Contact]
- **Security Team:** [Contact]

### AWS Support

- **Account ID:** <your-account-id>
- **Region:** eu-west-1
- **Support Plan:** <your-support-plan>
- **Support URL:** https://console.aws.amazon.com/support/home

### External Provider Support

- **Shopify:** https://partners.shopify.com/
- **Stripe:** https://stripe.com/docs/support
- **GoCardless:** https://developer.gocardless.com/
- **Mailchimp:** https://mailchimp.com/developer/help/
- **Future Ticketing:** [Contact]

---

## Change Management

### Deployment Process

1. **Create deployment branch** from `main`
2. **Make changes** and test locally
3. **Create pull request** with description of changes
4. **Get approval** from team lead
5. **Deploy to staging** and test
6. **Run post-deployment checklist** in staging
7. **Deploy to production** during maintenance window
8. **Run post-deployment checklist** in production
9. **Monitor for 24 hours** for issues
10. **Close pull request** and document changes

### Change Freeze

Change freeze periods:
- **Black Friday/Cyber Monday:** Nov 15 - Dec 5
- **End of Year:** Dec 15 - Jan 5
- **Major Events:** As announced

During change freeze:
- No deployments unless emergency
- Emergency deployments require CTO approval
- All changes documented in incident report

---

## Training Resources

### Recommended Training

1. **AWS Lambda** - https://aws.amazon.com/lambda/getting-started/
2. **API Gateway** - https://docs.aws.amazon.com/apigateway/
3. **RDS Aurora** - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/
4. **CloudWatch** - https://docs.aws.amazon.com/AmazonCloudWatch/
5. **PostgreSQL** - https://www.postgresql.org/docs/

### Hands-On Practice

1. **Practice rollback procedure** in staging environment
2. **Test incident response** with simulated incident
3. **Practice database restore** from snapshot
4. **Review CloudWatch logs** for past incidents
5. **Run health check script** and understand outputs

---

## Frequently Asked Questions

### Q: How do I know if the system is healthy?

A: Run `./scripts/health-check.sh` or check CloudWatch dashboard. Key indicators:
- Lambda error rate < 1%
- API Gateway 5XX rate < 1%
- RDS CPU < 50%
- Queue depth < 100
- No DLQ messages

### Q: What should I do if an alarm triggers?

A: Follow this process:
1. Acknowledge the alarm
2. Check CloudWatch dashboard for related metrics
3. Review logs for errors
4. Follow relevant runbook
5. Create incident channel if impacting users
6. Escalate if needed

### Q: How do I rollback a deployment?

A: See Rollback Procedures Runbook. Quick process:
1. Checkout previous version
2. Run `cdk deploy Supporter360StackV2`
3. Verify with post-deployment checklist

### Q: Who do I contact for help?

A:
1. Check runbooks first
2. Contact on-call engineer
3. Escalate to engineering manager
4. Contact AWS Support if AWS service issue

### Q: How often should I check the system?

A:
- **Daily:** Check dashboards and alarms (5 minutes)
- **Weekly:** Review metrics and logs (30 minutes)
- **Monthly:** Maintenance tasks (2 hours)
- **Quarterly:** Security review and updates (4 hours)

---

## Appendix

### Glossary

- **ACU:** Aurora Capacity Unit - RDS Serverless v2 scaling unit
- **CDK:** AWS Cloud Development Kit - Infrastructure as Code
- **DLQ:** Dead-Letter Queue - Queue for failed messages
- **EventBridge:** AWS event bus service
- **P1/P2/P3/P4:** Incident severity levels (Critical/High/Medium/Low)
- **RPO:** Recovery Point Objective - Maximum acceptable data loss
- **RTO:** Recovery Time Objective - Maximum acceptable downtime
- **SQS:** Simple Queue Service - AWS message queue service
- **VPC:** Virtual Private Cloud - Isolated network in AWS

### Acronyms

- API: Application Programming Interface
- AWS: Amazon Web Services
- CLI: Command Line Interface
- CORS: Cross-Origin Resource Sharing
- GDPR: General Data Protection Regulation
- HTTPS: Hypertext Transfer Protocol Secure
- IAM: AWS Identity and Access Management
- JSON: JavaScript Object Notation
- KMS: Key Management Service
- Lambda: AWS serverless compute service
- RDS: Relational Database Service
- S3: Simple Storage Service
- SNS: Simple Notification Service
- SQL: Structured Query Language
- WAF: Web Application Firewall

---

## Handoff Sign-Off

**Handoff Date:** _______________

**Operational Team Lead:** _______________ Signature: _______________

**Engineering Manager:** _______________ Signature: _______________

**Training Completed:** ☐ Yes ☐ No

**Runbooks Reviewed:** ☐ Yes ☐ No

**Monitoring Configured:** ☐ Yes ☐ No

**Alert Subscriptions Configured:** ☐ Yes ☐ No

**Ready for Operations:** ☐ Yes ☐ No

**Comments:**
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________

---

**Document Version:** 1.0
**Last Updated:** 2026-03-24
**Next Review:** 2024-06-24 (Quarterly)

---

**For questions about this handoff document, contact:** gleesonb@gmail.com
