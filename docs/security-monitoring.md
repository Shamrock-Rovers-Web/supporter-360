# Security Monitoring and Alerting Guide

This guide covers the complete security monitoring infrastructure for Supporter 360, including CloudWatch dashboards, SNS alerts, and structured logging implementation.

## Table of Contents

1. [Overview](#overview)
2. [Structured Logging](#structured-logging)
3. [CloudWatch Dashboards](#cloudwatch-dashboards)
4. [SNS Alert Configuration](#sns-alert-configuration)
5. [Security Event Categories](#security-event-categories)
6. [Incident Response Procedures](#incident-response-procedures)
7. [Monitoring Metrics](#monitoring-metrics)
8. [Troubleshooting](#troubleshooting)

## Overview

The security monitoring system provides:

- **Structured Logging**: Consistent, queryable logs for all security events
- **Real-time Dashboards**: CloudWatch dashboards for visual monitoring
- **Automated Alerts**: SNS-based notifications for critical security events
- **Audit Trails**: Complete traceability of all security-relevant actions
- **Compliance Support**: Built-in logging for GDPR and other regulations

### Architecture

```
Application Layer
    ↓
Security Logger (Structured Events)
    ↓
CloudWatch Logs (Long-term Storage)
    ↓
CloudWatch Metrics (Aggregation)
    ↓
CloudWatch Alarms (Threshold Monitoring)
    ↓
SNS Topics (Alert Distribution)
    ↓
Alert Subscribers (Email, SMS, PagerDuty, etc.)
```

## Structured Logging

### Logger Implementation

The security logger is implemented in `packages/backend/src/utils/logger.ts` with the following features:

- Singleton pattern for consistent logging across the application
- Automatic trace ID generation for request correlation
- CloudWatch integration with buffered writes
- Context-aware logging with user, session, and request metadata
- Level-based logging (debug, info, warn, error, critical)
- Automatic alerting for critical events

### Usage Examples

#### Authentication Events

```typescript
import { security } from './utils/logger';

// Successful login
security.auth('login_success', {
  userId: 'user_123',
  method: 'oauth',
  provider: 'github',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
});

// Failed login attempt
security.auth('login_failed', {
  userId: 'user_123',
  reason: 'invalid_credentials',
  ip: '192.168.1.1',
  attemptCount: 3,
});

// Password change
security.auth('password_changed', {
  userId: 'user_123',
  method: 'self_service',
  ip: '192.168.1.1',
});
```

#### Authorization Events

```typescript
// Permission check
security.authz('permission_checked', {
  userId: 'user_123',
  resource: 'contacts',
  action: 'write',
  granted: true,
});

// Role change
security.authz('role_changed', {
  userId: 'user_123',
  oldRole: 'member',
  newRole: 'admin',
  changedBy: 'admin_456',
});

// Access denied
security.authz('access_denied', {
  userId: 'user_123',
  resource: 'admin/settings',
  action: 'update',
  reason: 'insufficient_permissions',
});
```

#### Data Access Events

```typescript
// Record accessed
security.data('record_accessed', {
  userId: 'user_123',
  recordType: 'contact',
  recordId: 'contact_456',
  action: 'read',
});

// Record created
security.data('record_created', {
  userId: 'user_123',
  recordType: 'contact',
  recordId: 'contact_789',
  action: 'create',
});

// Sensitive data export
security.data('sensitive_data_export', {
  userId: 'user_123',
  recordType: 'contacts',
  recordCount: 150,
  format: 'csv',
  reason: 'gdpr_request',
});
```

#### API Activity Events

```typescript
// Webhook received
security.api('webhook_received', {
  source: 'github',
  deliveryId: '12345-67890',
  event: 'push',
  repository: 'org/repo',
});

// Rate limit exceeded
security.api('rate_limit_exceeded', {
  userId: 'user_123',
  endpoint: '/api/contacts',
  limit: 100,
  window: '15m',
});

// API error
security.api('api_error', {
  endpoint: '/api/webhooks/github',
  method: 'POST',
  statusCode: 500,
  errorId: 'err_abc123',
});
```

#### Compliance Events

```typescript
// GDPR data request
security.compliance('gdpr_data_request', {
  userId: 'user_123',
  requestType: 'data_export',
  format: 'json',
});

// GDPR deletion request
security.compliance('gdpr_deletion_request', {
  userId: 'user_123',
  requestType: 'right_to_be_forgotten',
  status: 'pending',
});

// Audit log export
security.compliance('audit_log_export', {
  requestedBy: 'admin_456',
  dateRange: '2024-01-01:2024-01-31',
  recordCount: 1523,
  format: 'csv',
});
```

#### Error and Critical Events

```typescript
// Security error
security.error('webhook_signature_invalid', new Error('Signature verification failed'), {
  source: 'github',
  deliveryId: '12345-67890',
  ip: '192.168.1.1',
});

// Critical security incident
security.critical('unauthorized_access_attempt', new Error('Multiple failed access attempts'), {
  userId: 'user_123',
  attemptCount: 10,
  window: '5m',
  ip: '192.168.1.1',
  targets: ['/admin', '/api/users', '/api/settings'],
});
```

## CloudWatch Dashboards

### Dashboard Configuration

Create a CloudWatch Dashboard with the following widgets:

#### 1. Authentication Overview

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Logs", "IncomingLogEvents", "LogGroupName", "/aws/supporter-360-backend/security", {"stat": "Sum", "period": 300, "label": "Total Auth Events"}],
          [".", ".", ".", ".", {"stat": "Sum", "period": 300, "label": "Failed Logins", "search": "{ $.event_type = \"authentication\" && $.event_name = \"login_failed\" }"}]
        ],
        "region": "us-east-1",
        "title": "Authentication Events",
        "period": 300,
        "stat": "Sum"
      }
    }
  ]
}
```

#### 2. Failed Login Attempts

```json
{
  "widgets": [
    {
      "type": "log",
      "properties": {
        "logGroupName": "/aws/supporter-360-backend/security",
        "title": "Failed Login Attempts",
        "query": "fields @timestamp, event_name, context.userId, context.reason\n| filter event_type = \"authentication\" and event_name = \"login_failed\"\n| sort @timestamp desc\n| limit 100"
      }
    }
  ]
}
```

#### 3. Authorization Denials

```json
{
  "widgets": [
    {
      "type": "log",
      "properties": {
        "logGroupName": "/aws/supporter-360-backend/security",
        "title": "Authorization Denials",
        "query": "fields @timestamp, event_name, context.userId, context.resource, context.reason\n| filter event_type = \"authorization\" and event_name = \"access_denied\"\n| sort @timestamp desc\n| limit 100"
      }
    }
  ]
}
```

#### 4. API Error Rate

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Logs", "IncomingLogEvents", "LogGroupName", "/aws/supporter-360-backend/security", {"stat": "Sum", "period": 60, "label": "API Errors", "search": "{ $.level = \"error\" && $.event_type = \"api_activity\" }"}]
        ],
        "region": "us-east-1",
        "title": "API Error Rate",
        "period": 60,
        "stat": "Sum",
        "yAxis": {"left": {"min": 0}}
      }
    }
  ]
}
```

#### 5. Critical Security Events

```json
{
  "widgets": [
    {
      "type": "log",
      "properties": {
        "logGroupName": "/aws/supporter-360-backend/security",
        "title": "Critical Security Events",
        "query": "fields @timestamp, event_name, error.name, error.message, context\n| filter level = \"critical\"\n| sort @timestamp desc\n| limit 50"
      }
    }
  ]
}
```

#### 6. Data Access Patterns

```json
{
  "widgets": [
    {
      "type": "log",
      "properties": {
        "logGroupName": "/aws/supporter-360-backend/security",
        "title": "Data Access by User",
        "query": "fields context.userId, count(*) as requestCount\n| filter event_type = \"data_access\"\n| stats count(*) by context.userId\n| sort requestCount desc\n| limit 20"
      }
    }
  ]
}
```

#### 7. Webhook Activity

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Logs", "IncomingLogEvents", "LogGroupName", "/aws/supporter-360-backend/security", {"stat": "Sum", "period": 300, "label": "Webhooks Received", "search": "{ $.event_type = \"api_activity\" && $.event_name = \"webhook_received\" }"}],
          [".", ".", ".", ".", {"stat": "Sum", "period": 300, "label": "Webhook Failures", "search": "{ $.event_type = \"api_activity\" && $.level = \"error\" }"}]
        ],
        "region": "us-east-1",
        "title": "Webhook Activity",
        "period": 300,
        "stat": "Sum"
      }
    }
  ]
}
```

#### 8. Compliance Events

```json
{
  "widgets": [
    {
      "type": "log",
      "properties": {
        "logGroupName": "/aws/supporter-360-backend/security",
        "title": "GDPR Requests",
        "query": "fields @timestamp, event_name, context.userId, context.requestType\n| filter event_type = \"compliance\"\n| sort @timestamp desc\n| limit 100"
      }
    }
  ]
}
```

### Dashboard Deployment

#### AWS CLI Command

```bash
aws cloudwatch put-dashboard \
  --dashboard-name supporter-360-security \
  --dashboard-body file://dashboard-config.json
```

#### Terraform Configuration

```hcl
resource "aws_cloudwatch_dashboard" "security" {
  dashboard_name = "supporter-360-security"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        properties = {
          metrics = [
            ["AWS/Logs", "IncomingLogEvents", "LogGroupName", "/aws/supporter-360-backend/security"]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1"
          title  = "Security Events"
        }
      }
    ]
  })
}
```

## SNS Alert Configuration

### Alert Topics

Create separate SNS topics for different alert severities:

#### 1. Critical Alerts Topic

```bash
aws sns create-topic \
  --name supporter-360-security-critical \
  --region us-east-1
```

#### 2. Error Alerts Topic

```bash
aws sns create-topic \
  --name supporter-360-security-errors \
  --region us-east-1
```

#### 3. Compliance Alerts Topic

```bash
aws sns create-topic \
  --name supporter-360-compliance \
  --region us-east-1
```

### Subscription Configuration

#### Email Subscriptions

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:supporter-360-security-critical \
  --protocol email \
  --notification-endpoint security-team@company.com

aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:supporter-360-security-critical \
  --protocol email \
  --notification-endpoint oncall@company.com
```

#### SMS Subscriptions

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:supporter-360-security-critical \
  --protocol sms \
  --notification-endpoint +15551234567
```

#### HTTPS/PagerDuty Subscriptions

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:supporter-360-security-critical \
  --protocol https \
  --notification-endpoint https://events.pagerduty.com/integration/XXX/enqueue
```

### CloudWatch Alarms

#### 1. Failed Login Rate Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name supporter-360-failed-login-rate \
  --alarm-description "Alert on high failed login rate" \
  --metric-name IncomingLogEvents \
  --namespace AWS/Logs \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=LogGroupName,Value=/aws/supporter-360-backend/security \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:supporter-360-security-critical \
  --region us-east-1
```

#### 2. Critical Events Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name supporter-360-critical-events \
  --alarm-description "Alert on any critical security events" \
  --metric-name IncomingLogEvents \
  --namespace AWS/Logs \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 1 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=LogGroupName,Value=/aws/supporter-360-backend/security \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:supporter-360-security-critical \
  --region us-east-1
```

#### 3. API Error Rate Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name supporter-360-api-error-rate \
  --alarm-description "Alert on high API error rate" \
  --metric-name IncomingLogEvents \
  --namespace AWS/Logs \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=LogGroupName,Value=/aws/supporter-360-backend/security \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:supporter-360-security-errors \
  --region us-east-1
```

#### 4. Authorization Denial Rate Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name supporter-360-auth-denial-rate \
  --alarm-description "Alert on high authorization denial rate" \
  --metric-name IncomingLogEvents \
  --namespace AWS/Logs \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=LogGroupName,Value=/aws/supporter-360-backend/security \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:supporter-360-security-errors \
  --region us-east-1
```

## Security Event Categories

### 1. Authentication Events

| Event Name | Level | Description | Alert? |
|------------|-------|-------------|--------|
| `login_success` | info | User successfully logged in | No |
| `login_failed` | warn | User login attempt failed | Yes (if > 10/hour) |
| `logout` | info | User logged out | No |
| `password_changed` | info | User changed password | No |
| `password_reset_requested` | info | User requested password reset | No |
| `mfa_enabled` | info | User enabled MFA | No |
| `mfa_disabled` | warn | User disabled MFA | Yes |
| `session_created` | info | New session created | No |
| `session_destroyed` | info | Session destroyed | No |
| `suspicious_activity` | error | Potential account compromise | Yes |

### 2. Authorization Events

| Event Name | Level | Description | Alert? |
|------------|-------|-------------|--------|
| `permission_checked` | info | Permission was checked | No |
| `access_granted` | info | Access was granted | No |
| `access_denied` | warn | Access was denied | Yes (if > 50/hour) |
| `role_changed` | info | User role changed | No |
| `privilege_escalation` | error | User gained higher privileges | Yes |
| `admin_access` | info | Admin area accessed | No |

### 3. Data Access Events

| Event Name | Level | Description | Alert? |
|------------|-------|-------------|--------|
| `record_accessed` | info | Record was read | No |
| `record_created` | info | Record was created | No |
| `record_updated` | info | Record was updated | No |
| `record_deleted` | info | Record was deleted | No |
| `bulk_export` | warn | Large data export | Yes |
| `sensitive_data_access` | info | Sensitive data accessed | No |
| `gdpr_data_access` | info | GDPR-related data access | Yes |

### 4. API Activity Events

| Event Name | Level | Description | Alert? |
|------------|-------|-------------|--------|
| `webhook_received` | info | Webhook received | No |
| `webhook_processed` | info | Webhook processed successfully | No |
| `webhook_failed` | error | Webhook processing failed | Yes |
| `rate_limit_exceeded` | warn | API rate limit exceeded | Yes (if > 100/hour) |
| `api_error` | error | API error occurred | Yes (if > 50/hour) |
| `invalid_request` | warn | Invalid API request | No |

### 5. Infrastructure Events

| Event Name | Level | Description | Alert? |
|------------|-------|-------------|--------|
| `database_connected` | info | Database connection established | No |
| `database_connection_failed` | error | Database connection failed | Yes |
| `external_api_call` | info | External API called | No |
| `external_api_failed` | warn | External API call failed | Yes (if > 10/hour) |
| `cache_hit` | debug | Cache hit | No |
| `cache_miss` | debug | Cache miss | No |

### 6. Compliance Events

| Event Name | Level | Description | Alert? |
|------------|-------|-------------|--------|
| `gdpr_data_request` | info | GDPR data request received | Yes |
| `gdpr_deletion_request` | info | GDPR deletion request received | Yes |
| `gdpr_export_completed` | info | GDPR data export completed | Yes |
| `gdpr_deletion_completed` | info | GDPR deletion completed | Yes |
| `audit_log_export` | info | Audit log exported | Yes |
| `compliance_report_generated` | info | Compliance report generated | Yes |

## Incident Response Procedures

### Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|----------------|----------|
| **P1 - Critical** | System-wide security breach, data exposure | Immediate (15 min) | Unauthorized data access, system compromise |
| **P2 - High** | Significant security issue affecting users | Within 1 hour | Brute force attacks, mass authorization failures |
| **P3 - Medium** | Security issue with limited impact | Within 4 hours | Suspicious activity, elevated error rates |
| **P4 - Low** | Minor security issue or policy violation | Within 24 hours | Policy violations, failed logins |

### Standard Operating Procedures

#### P1 - Critical Incident Response

1. **Immediate Response (0-15 min)**
   - Acknowledge alert via SNS/PagerDuty
   - Assemble incident response team
   - Create incident channel (Slack/Teams)
   - Begin initial investigation

2. **Investigation (15-60 min)**
   - Review CloudWatch logs and dashboards
   - Identify affected systems and users
   - Determine scope and impact
   - Document initial findings

3. **Containment (1-4 hours)**
   - Isolate affected systems
   - Block malicious IPs/accounts
   - Revoke compromised credentials
   - Implement emergency fixes

4. **Eradication (4-24 hours)**
   - Identify root cause
   - Remove vulnerabilities
   - Patch security gaps
   - Verify all traces removed

5. **Recovery (24-72 hours)**
   - Restore from clean backups
   - Monitor for recurrence
   - Validate all systems
   - Gradual service restoration

6. **Post-Incident (7 days)**
   - Complete incident report
   - Update security procedures
   - Implement monitoring improvements
   - Conduct lessons learned meeting

#### P2 - High Priority Incident Response

1. **Immediate Response (0-1 hour)**
   - Acknowledge alert
   - Assign incident owner
   - Begin investigation

2. **Investigation (1-4 hours)**
   - Review logs and metrics
   - Identify affected users
   - Assess impact
   - Determine root cause

3. **Resolution (4-24 hours)**
   - Implement fixes
   - Monitor effectiveness
   - Update documentation
   - Communicate with stakeholders

#### P3 - Medium Priority Incident Response

1. **Response (0-4 hours)**
   - Acknowledge alert
   - Investigate issue
   - Assess severity

2. **Resolution (4-24 hours)**
   - Implement fixes
   - Update documentation
   - Monitor for recurrence

#### P4 - Low Priority Incident Response

1. **Response (0-24 hours)**
   - Acknowledge alert
   - Investigate issue
   - Document findings

2. **Resolution (24-48 hours)**
   - Implement fixes
   - Update documentation

### Escalation Matrix

| Role | Contact | P1 | P2 | P3 | P4 |
|------|---------|----|----|----|-----|
| Security Engineer | security@company.com | Yes | Yes | Yes | Yes |
| Security Lead | security-lead@company.com | Yes | Yes | No | No |
| CTO | cto@company.com | Yes | No | No | No |
| Incident Commander | oncall@company.com | Yes | Yes | No | No |

### Communication Templates

#### Initial Incident Notification

```
SUBJECT: [P1] Security Incident - {Incident Title}

SEVERITY: P1 - Critical
STARTED: {Timestamp}
ASSIGNED TO: {Incident Owner}

SUMMARY:
{Brief description of the incident}

IMPACT:
- Affected Users: {Count or Estimate}
- Affected Systems: {List systems}
- Data Exposure: {Yes/No}

CURRENT STATUS:
{Current state of the incident}

NEXT STEPS:
{Immediate action items}

UPDATES:
All updates will be posted in {Incident Channel}
```

#### Incident Resolution Notification

```
SUBJECT: [RESOLVED] Security Incident - {Incident Title}

SEVERITY: P{1/2/3/4}
DURATION: {Start} - {End}
INCIDENT OWNER: {Name}

SUMMARY:
{Brief description}

ROOT CAUSE:
{Technical explanation}

RESOLUTION:
{Steps taken to resolve}

PREVENTIVE MEASURES:
{Actions to prevent recurrence}

INCIDENT REPORT:
{Link to full incident report}
```

## Monitoring Metrics

### Key Performance Indicators (KPIs)

#### Security Metrics
- **Failed Login Rate**: Failed logins / Total logins
- **Authorization Denial Rate**: Access denied / Total authorization checks
- **Critical Event Rate**: Critical events per hour
- **Error Rate**: Error events / Total events
- **Response Time**: Average time to detect and respond to incidents

#### Operational Metrics
- **Log Volume**: Total log entries per hour
- **Dashboard Views**: Number of dashboard views
- **Alert Accuracy**: True positives / Total alerts
- **Mean Time to Detect (MTTD)**: Time from event to detection
- **Mean Time to Respond (MTTR)**: Time from detection to resolution

#### Compliance Metrics
- **GDPR Request Response Time**: Time to complete GDPR requests
- **Audit Log Completeness**: Percentage of events logged
- **Data Export Requests**: Total and trend
- **Compliance Report Generation**: Frequency and success rate

### Metric Queries

#### CloudWatch Insights Queries

```sql
-- Failed login rate by hour
fields @timestamp, count(*) as failed_logins
| filter event_type = "authentication" and event_name = "login_failed"
| stats count(*) by bin(1h)
| sort @timestamp desc

-- Top 10 users by failed login attempts
fields context.userId, count(*) as failed_attempts
| filter event_type = "authentication" and event_name = "login_failed"
| stats count(*) by context.userId
| sort failed_attempts desc
| limit 10

-- Authorization denial rate by resource
fields context.resource, count(*) as denials
| filter event_type = "authorization" and event_name = "access_denied"
| stats count(*) by context.resource
| sort denials desc

-- Error rate by event type
fields event_type, count(*) as errors
| filter level = "error"
| stats count(*) by event_type
| sort errors desc

-- Critical events timeline
fields @timestamp, event_name, error.message
| filter level = "critical"
| sort @timestamp desc
```

## Troubleshooting

### Common Issues

#### 1. Logs Not Appearing in CloudWatch

**Symptoms**: No log entries in CloudWatch Logs console

**Diagnosis**:
```bash
# Check CloudWatch configuration
aws logs describe-log-groups --log-group-name-prefix /aws/supporter-360-backend

# Check IAM permissions
aws iam get-role-policy --role-name supporter-360-backend --policy-name CloudWatchLogsPolicy
```

**Solutions**:
- Verify `CLOUDWATCH_ENABLED` environment variable is set to `true`
- Check IAM permissions for CloudWatch Logs
- Ensure log group exists: `aws logs create-log-group --log-group-name /aws/supporter-360-backend/security`
- Verify network connectivity to CloudWatch endpoint

#### 2. High False Positive Alert Rate

**Symptoms**: Too many alerts for non-critical events

**Diagnosis**:
```sql
-- Review recent alerts
fields @timestamp, level, event_name, context
| filter level = "error" or level = "critical"
| sort @timestamp desc
| limit 100
```

**Solutions**:
- Adjust alert thresholds in CloudWatch Alarms
- Implement alert aggregation to reduce noise
- Add filtering rules to suppress expected errors
- Review and tune logging levels

#### 3. Missing Security Events

**Symptoms**: Expected security events not logged

**Diagnosis**:
```bash
# Check logger initialization
grep -r "SecurityLogger.getInstance()" packages/backend/src

# Check for error in logger initialization
grep -r "Failed to initialize CloudWatch" /var/log/supporter-360
```

**Solutions**:
- Verify logger is imported and initialized in all modules
- Check for silent errors in logger implementation
- Ensure proper error handling in logger code
- Review application logs for initialization failures

#### 4. CloudWatch Costs Too High

**Symptoms**: Unexpectedly high CloudWatch bills

**Diagnosis**:
```bash
# Check log volume
aws logs get-metric-filters --log-group-name /aws/supporter-360-backend/security

# Review ingestion rates
aws cloudwatch get-metric-statistics \
  --namespace AWS/Logs \
  --metric-name IncomingLogEvents \
  --dimensions Name=LogGroupName,Value=/aws/supporter-360-backend/security \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 86400 \
  --statistics Sum
```

**Solutions**:
- Implement log sampling for high-volume events
- Reduce log verbosity for debug events
- Set appropriate log retention periods (e.g., 7 days for debug, 30 days for security)
- Use CloudWatch Logs Insights filters to reduce data transfer
- Consider archival to S3 for long-term storage

### Performance Optimization

#### Log Buffer Tuning

```typescript
// Adjust buffer size based on volume
const config = {
  maxBufferSize: 100,        // Increase for high-volume scenarios
  flushInterval: 5000,       // Decrease for faster alerting
};
```

#### CloudWatch Log Filtering

```bash
# Create metric filters to reduce ingestion
aws logs put-metric-filter \
  --log-group-name /aws/supporter-360-backend/security \
  --filter-name critical-events \
  --filter-pattern "{ $.level = \"critical\" }" \
  --metric-transformations metricName=CriticalEvents,metricNamespace=Security,metricValue=1
```

#### Cost Optimization

```typescript
// Implement log level filtering
const shouldLog = (level: LogLevel) => {
  if (process.env.NODE_ENV === 'production') {
    return ['error', 'critical', 'warn'].includes(level);
  }
  return true; // Log everything in development
};
```

### Maintenance Tasks

#### Daily
- Review CloudWatch dashboard for anomalies
- Check alert queues for unresolved issues
- Verify log ingestion rates

#### Weekly
- Review and tune alert thresholds
- Analyze false positive alerts
- Update incident response documentation

#### Monthly
- Conduct security review of all events
- Update compliance reports
- Review and optimize CloudWatch costs
- Test alert notification channels

#### Quarterly
- Full security audit of logging infrastructure
- Review and update incident response procedures
- Conduct tabletop incident response exercises
- Update security monitoring strategy based on new threats

## Appendix

### Environment Variables

```bash
# CloudWatch Configuration
CLOUDWATCH_ENABLED=true
AWS_REGION=us-east-1
CLOUDWATCH_LOG_GROUP=/aws/supporter-360-backend/security
CLOUDWATCH_LOG_STREAM=production-1.0.0

# SNS Alert Configuration
SNS_ALERT_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:supporter-360-security-critical
SNS_ERROR_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:supporter-360-security-errors

# Application Configuration
SERVICE_NAME=supporter-360-backend
SERVICE_VERSION=1.0.0
NODE_ENV=production
```

### IAM Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:us-east-1:*:log-group:/aws/supporter-360-backend/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": [
        "arn:aws:sns:us-east-1:*:supporter-360-security-*"
      ]
    }
  ]
}
```

### Quick Reference

| Task | Command |
|------|---------|
| View real-time logs | `aws logs tail /aws/supporter-360-backend/security --follow` |
| Search for critical events | `aws logs start-query --log-group-name /aws/supporter-360-backend/security --start-time 0 --end-time $(date +%s) --query-string "filter level = \"critical\""` |
| Create CloudWatch alarm | `aws cloudwatch put-metric-alarm --alarm-name ...` |
| List SNS subscriptions | `aws sns list-subscriptions-by-topic --topic-arn arn:aws:sns:...` |
| Test SNS alert | `aws sns publish --topic-arn arn:aws:sns:... --message "Test alert"` |

---

For questions or issues with the security monitoring system, contact the security team at security@company.com or create an issue in the Supporter 360 repository.
