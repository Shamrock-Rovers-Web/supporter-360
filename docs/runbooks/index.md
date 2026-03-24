# Supporter 360 Runbooks

**Purpose:** Operational procedures for Supporter 360 serverless infrastructure.

**Last Updated:** 2026-03-24

---

## What are Runbooks?

Runbooks are step-by-step procedures for common operational tasks, incidents, and maintenance activities. They enable faster response times, reduce human error, and ensure consistency across team members.

---

## Quick Reference

| Situation | Runbook | Severity |
|-----------|---------|----------|
| Webhook processing failing | [Incident Response](#incident-response) | P2 |
| Database connectivity issues | [Incident Response](#database-connectivity-issues) | P1 |
| API errors or slow responses | [Incident Response](#api-gateway-errors) | P2 |
| Lambda functions crashing | [Incident Response](#lambda-function-failures) | P2 |
| SQS queue backlog | [Incident Response](#sqs-queue-backlog) | P2 |
| External integration outage | [Incident Response](#external-integration-outages) | P3 |
| Security incident | [Incident Response](#security-incidents) | P1 |
| Need to rollback deployment | [Rollback Procedures](#rollback-procedures) | P1-P2 |
| Need to restore database | [Backup and Restore](#backup-and-restore) | P1 |
| System slow performance | [Performance Tuning](#performance-tuning) | P2 |

---

## Available Runbooks

### 1. Incident Response Runbook

**File:** [incident-response.md](./incident-response.md)

**Purpose:** Diagnose and respond to production incidents.

**Contents:**
- Initial response checklist
- Common incident scenarios:
  - Webhook processing failures
  - Database connectivity issues
  - API Gateway errors
  - Lambda function failures
  - SQS queue backlog
  - External integration outages
  - Security incidents
- Communication procedures
- Post-incident procedures

**When to use:**
- System is down or degraded
- Errors are occurring
- Users are impacted
- Security breach detected

**Typical response time:** 15-30 minutes

---

### 2. Rollback Procedures Runbook

**File:** [rollback-procedures.md](./rollback-procedures.md)

**Purpose:** Roll back infrastructure and application changes to previous stable states.

**Contents:**
- Pre-rollback checklist
- CDK infrastructure rollback
- Lambda function rollback
- Database rollback
- Configuration rollback
- Webhook configuration rollback
- Complete stack rollback
- Post-rollback verification

**When to use:**
- Deployment caused critical issues
- Need to revert to previous version
- Data corruption occurred
- Performance severely degraded

**Typical rollback time:** 30-60 minutes

---

### 3. Backup and Restore Runbook

**File:** [backup-restore.md](./backup-restore.md)

**Purpose:** Backup and restore procedures for data and configuration.

**Contents:**
- Backup strategy overview
- Automated backups (RDS, S3, Lambda)
- Manual backup procedures
- Restore procedures:
  - Database restore
  - S3 data restore
  - Lambda function restore
  - Configuration restore
- Backup verification
- Disaster recovery

**When to use:**
- Need to restore from backup
- Setting up backup procedures
- Testing disaster recovery
- Before making risky changes

**Typical restore time:** 1-2 hours

---

### 4. Performance Tuning Runbook

**File:** [performance-tuning.md](./performance-tuning.md)

**Purpose:** Optimize performance of all system components.

**Contents:**
- Performance baselines
- Lambda performance optimization
- Database performance optimization
- API Gateway performance optimization
- SQS performance optimization
- Cost-performance optimization

**When to use:**
- System is slow
- Need to optimize costs
- Planning capacity
- Proactive performance review

**Typical optimization time:** 2-4 hours

---

## Incident Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **P1 - Critical** | System down, data loss, security breach | 15 minutes | Database down, security breach, complete API failure |
| **P2 - High** | Major feature broken, significant degradation | 1 hour | Webhook processing failing, API errors, queue backlog |
| **P3 - Medium** | Partial degradation, workarounds available | 4 hours | Single integration down, slow performance on one endpoint |
| **P4 - Low** | Minor issues, no user impact | 1 day | Non-critical bug, cosmetic issue |

---

## Quick Start Guides

### For New Team Members

1. **Read all runbooks** (1-2 hours)
2. **Practice rollback procedure** in staging environment
3. **Set up monitoring dashboards**
4. **Join on-call rotation**

### During an Incident

1. **Stay calm** - follow the runbook step by step
2. **Communicate** - create incident channel, send status updates
3. **Diagnose** - use the diagnostic commands in the runbook
4. **Fix or rollback** - choose the best option based on impact
5. **Verify** - confirm the fix worked
6. **Document** - update runbook with lessons learned

### Before Making Changes

1. **Read relevant runbook** for the component you're changing
2. **Create backup** if recommended
3. **Test in staging** first
4. **Have rollback plan** ready
5. **Notify team** of upcoming changes

---

## Contact Information

### On-Call
- **On-Call Engineer:** [Contact]
- **Escalation:** [Manager contact]
- **After-hours:** [Emergency contact]

### Subject Matter Experts
- **Database:** [DBA contact]
- **Security:** [Security team contact]
- **External Integrations:** [Integration owner contact]
- **Infrastructure:** [DevOps contact]

### External Support
- **AWS Support:** [Account ID, Support Plan]
- **Shopify Support:** https://partners.shopify.com/
- **Stripe Support:** https://stripe.com/docs/support
- **GoCardless Support:** https://developer.gocardless.com/
- **Mailchimp Support:** https://mailchimp.com/developer/help/
- **Future Ticketing:** [Contact]

---

## Maintenance Windows

### Scheduled Maintenance

| Maintenance Type | Frequency | Day | Time (UTC) | Duration |
|------------------|-----------|-----|------------|----------|
| **Database Maintenance** | Monthly | First Sunday | 02:00 | 1 hour |
| **Security Updates** | Quarterly | As announced | As announced | 2 hours |
| **Infrastructure Updates** | As needed | As announced | As announced | Variable |

### Before Maintenance

1. **Notify stakeholders** 1 week in advance
2. **Create backup** (if risky)
3. **Set up monitoring** for quick issue detection
4. **Have rollback plan** ready
5. **Document expected changes**

### During Maintenance

1. **Update incident channel** regularly
2. **Monitor metrics** closely
3. **Test critical functionality** after changes
4. **Be ready to rollback** if issues arise

### After Maintenance

1. **Verify all functionality** works
2. **Check error rates** are normal
3. **Monitor for 24 hours** for delayed issues
4. **Document any issues** found
5. **Update runbooks** with lessons learned

---

## Common Commands

### System Health Check

```bash
# Quick health check
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

# Check database connectivity
psql -h <DB_HOST> -U <DB_USER> -d supporter360 -c "SELECT 1;"
```

### Get System Information

```bash
# Get API Gateway URL
API_ID=$(aws apigateway get-rest-apis --query 'Items[?name==`Supporter360StackV2`].id' --output text)
echo "https://${API_ID}.execute-api.eu-west-1.amazonaws.com/prod"

# Get database endpoint
aws rds describe-db-clusters \
  --db-cluster-identifier supporter360-supporter360-database \
  --query 'DBClusters[0].Endpoint' \
  --output text

# Get Lambda function names
aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `Supporter360`)].FunctionName' \
  --output table

# Get SQS queue URLs
aws sqs list-queues \
  --query 'QueueUrls[?contains(@, `supporter360`)]' \
  --output table
```

---

## Runbook Maintenance

### When to Update Runbooks

- **After every incident** - Add new scenarios or improve procedures
- **After deployment** - Update with new components or changes
- **Quarterly review** - Check for outdated information
- **When procedures change** - Update to match current process
- **When errors found** - Fix incorrect commands or information

### How to Update Runbooks

1. **Edit the markdown file** directly
2. **Test the new procedure** in staging if possible
3. **Get review** from another team member
4. **Commit to Git** with descriptive commit message
5. **Notify team** of significant changes

### Runbook Quality Checklist

- [ ] **Accurate** - All commands work as written
- [ ] **Complete** - All steps are documented
- [ ] **Clear** - Easy to follow, no ambiguity
- [ ] **Tested** - Procedure has been tested (if possible)
- [ ] **Formatted** - Consistent formatting, code blocks for commands
- [ ] **Links work** - All internal and external links are valid

---

## Related Documentation

- [Deployment Guide](../deployment.md) - How to deploy Supporter 360
- [Deployment Verification Report](../deployment-verification.md) - Current system status
- [Security Checklist](../security-checklist.md) - Security procedures
- [Security Monitoring](../security-monitoring.md) - Security monitoring procedures
- [API Rate Limiting](../api-rate-limiting.md) - Rate limiting configuration
- [Project README](../README.md) - Project overview and architecture

---

## Feedback and Contributions

**Found an error?** Submit a PR to fix it.

**Missing information?** Request it in a GitHub issue.

**Have a better procedure?** Submit a PR to improve the runbook.

**Remember:** Runbooks are living documents. They should evolve with the system.

---

**Last Review:** 2026-03-24
**Next Review:** 2024-06-24 (Quarterly)

---

## Emergency Quick Reference

### If Everything Is Down

1. **Check AWS Service Health Dashboard** - https://status.aws.amazon.com/
2. **Check CloudWatch Alarms** - Look for P1 alerts
3. **Check Database** - Can you connect?
4. **Check API Gateway** - Is it responding?
5. **Check Lambda** - Are functions running?
6. **Create Incident Channel** - Notify team
7. **Start Rollback** - If recent deployment caused it
8. **Contact AWS Support** - If AWS service is down

### If Database Is Down

1. **Check RDS status** - `aws rds describe-db-clusters`
2. **Check security groups** - Are ports open?
3. **Check VPC** - Is database in correct subnet?
4. **Initiate failover** - If multi-AZ: `aws rds failover-db-cluster`
5. **Restore from snapshot** - If corruption detected

### If Webhooks Are Failing

1. **Check webhook secrets** - Are they correct in Secrets Manager?
2. **Check signature verification** - Are webhooks signed?
3. **Check SQS queues** - Are messages being queued?
4. **Check processor logs** - Are processors crashing?
5. **Check external provider** - Is their service up?

### If Security Breach Detected

1. **Isolate systems** - Revoke API keys, rotate secrets
2. **Preserve evidence** - Enable CloudTrail, export logs
3. **Notify stakeholders** - Security team, management, users
4. **Document everything** - Timeline, actions taken
5. **Follow incident response** - See security incident runbook

---

**Stay calm, follow the runbook, communicate often.**
