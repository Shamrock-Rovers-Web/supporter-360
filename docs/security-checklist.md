# Supporter 360 Security Checklist

This checklist provides comprehensive security guidelines for deploying and maintaining Supporter 360 in production.

## Pre-Deployment Security Checklist

Complete these checks before deploying to production.

### 1. Secrets Management

- [ ] **All credentials stored in AWS Secrets Manager**
  - No hardcoded secrets in code
  - No secrets in environment variables
  - No secrets in configuration files

- [ ] **Secrets versioning enabled**
  ```bash
  aws secretsmanager describe-secret --secret-id supporter360/shopify
  ```

- [ ] **Secret rotation configured** (where supported)
  - Database credentials
  - API keys

- [ ] **Secrets encryption using AWS KMS**
  - Verify encryption key used
  - Check key permissions

### 2. Database Security

- [ ] **SSL/TLS enabled for database connections**
  - `DB_SSL=true` in Lambda environment variables
  - Certificate verification enabled
  - No cleartext connections

- [ ] **Database security groups configured correctly**
  - Only Lambda functions can access database
  - No open access to 0.0.0.0/0
  - Specific port (5432) only

- [ ] **Database backups enabled**
  - Automated backups configured (7-day retention)
  - Backup encryption enabled
  - Point-in-time recovery enabled

- [ ] **Database credentials strong**
  - Minimum 16 characters
  - Mix of uppercase, lowercase, numbers, symbols
  - Not reused across services

### 3. Webhook Security

- [ ] **Webhook signature verification enabled**
  - Shopify: HMAC SHA-256 verification
  - Stripe: Timestamp tolerance check (3 minutes)
  - GoCardless: HMAC SHA-256 verification
  - Mailchimp: Basic validation

- [ ] **Webhook secrets stored securely**
  - In AWS Secrets Manager
  - Rotated regularly
  - Access logged

- [ ] **Replay attack prevention**
  - Timestamp validation (Stripe)
  - Nonce implementation (where applicable)

- [ ] **Webhook endpoint rate limiting**
  - Prevent abuse from malicious actors
  - Per-IP rate limits

### 4. API Security

- [ ] **Authentication implemented**
  - API key required for protected endpoints
  - Lambda authorizer configured
  - JWT tokens validated

- [ ] **Authorization checks in place**
  - Role-based access control (RBAC)
  - Admin endpoints protected
  - Resource-level permissions

- [ ] **CORS properly configured**
  - Specific origins allowed (not `*`)
  - Specific methods allowed
  - Specific headers allowed
  - Credentials policy correct

- [ ] **Rate limiting enabled**
  - API Gateway throttling configured
  - Per-API-key limits
  - Per-IP limits
  - Burst limits

- [ ] **Input validation**
  - Request body validation
  - SQL injection prevention
  - XSS prevention
  - Path traversal prevention

### 5. Network Security

- [ ] **VPC configuration**
  - Private subnets for Lambda
  - Isolated subnets for RDS
  - No public access to database

- [ ] **Security groups restrictive**
  - Minimum required ports open
  - Specific source/destination
  - No 0.0.0.0/0 rules

- [ ] **NAT Gateway secure**
  - Single NAT Gateway for cost
  - No public internet access to internal resources

### 6. S3 Security

- [ ] **Block public access enabled**
  - All S3 buckets block public access
  - No public ACLs
  - No public policies

- [ ] **Bucket encryption enabled**
  - SSE-S3 or SSE-KMS
  - Encryption at rest
  - Default encryption configured

- [ ] **Bucket policies restrictive**
  - Only specific principals can access
  - Condition-based access
  - IP restrictions if needed

- [ ] **Versioning enabled** (for critical buckets)
  - Raw payloads bucket
  - Frontend bucket

- [ ] **Lifecycle policies configured**
  - Old data archived to Glacier
  - Expired data deleted
  - Cost optimization

### 7. Lambda Security

- [ ] **Least privilege IAM roles**
  - Only required permissions
  - No wildcard permissions
  - Resource-specific policies

- [ ] **Environment variables secure**
  - No sensitive data in environment variables
  - Secrets referenced from Secrets Manager
  - No API keys in code

- [ ] **Dead Letter Queues configured**
  - All async Lambda functions have DLQ
  - DLQ monitored for failures
  - Failed messages investigated

- [ ] **Lambda timeouts appropriate**
  - Not too long (cost optimization)
  - Not too short (timeouts)

- [ ] **Memory configuration optimized**
  - Sufficient for workload
  - Cost-effective

### 8. API Gateway Security

- [ ] **WAF enabled** (recommended for production)
  - SQL injection rules
  - XSS rules
  - Rate limiting rules
  - IP reputation lists

- [ ] **API keys configured**
  - Required for protected endpoints
  - Rotated regularly
  - Usage plans configured

- [ ] **Logging enabled**
  - Execution logs
  - Access logs
  - CloudWatch integration

- [ ] **Throttling configured**
  - Rate limits per API key
  - Burst limits
  - Global throttling

### 9. CloudFront Security

- [ ] **HTTPS only**
  - Redirect HTTP to HTTPS
  - TLS 1.2 minimum
  - Modern cipher suites

- [ ] **Origin Access Control**
  - OAI or OAC configured
  - Direct S3 access blocked
  - Signed URLs if needed

- [ ] **Security headers**
  - X-Frame-Options
  - X-Content-Type-Options
  - Strict-Transport-Security
  - Content-Security-Policy

### 10. Monitoring and Logging

- [ ] **CloudWatch Logs enabled**
  - All Lambda functions log
  - API Gateway logs
  - RDS logs (slow query, error)

- [ ] **Log encryption enabled**
  - CloudWatch Logs encrypted
  - KMS key configured

- [ ] **Log retention configured**
  - Appropriate retention period
  - Cost optimization
  - Compliance requirements

- [ ] **CloudWatch Alarms configured**
  - Lambda error rate
  - API Gateway 5XX errors
  - RDS CPU/connections
  - DLQ messages
  - Security-related events

- [ ] **AWS Config enabled**
  - Compliance tracking
  - Configuration drift detection
  - Security rules

### 11. Compliance and Data Protection

- [ ] **GDPR compliance**
  - Data retention policies
  - Right to be forgotten
  - Data export functionality
  - Data minimization

- [ ] **Data classification**
  - Personal data identified
  - Sensitive data encrypted
  - Access logged

- [ ] **Privacy Policy**
  - Clear data usage policy
  - Cookie policy
  - User consent mechanism

### 12. Incident Response

- [ ] **Incident response plan**
  - Documented procedures
  - Contact information
  - Escalation matrix

- [ ] **Backup strategy**
  - Regular backups
  - Off-site storage
  - Restoration tested

- [ ] **Disaster recovery plan**
  - RTO/RPO defined
  - Recovery procedures documented
  - Regular drills

## Post-Deployment Security Monitoring

### Daily Checks

- [ ] Review CloudWatch logs for errors
- [ ] Check CloudWatch alarms
- [ ] Monitor DLQ for failed messages
- [ ] Review AWS Trusted Advisor recommendations

### Weekly Checks

- [ ] Review API usage patterns
- [ ] Check for unusual access patterns
- [ ] Verify security group rules
- [ ] Review cost and usage reports

### Monthly Checks

- [ ] Rotate secrets if needed
- [ ] Review and update IAM policies
- [ ] Check for vulnerabilities in dependencies
- [ ] Update AWS services to latest versions
- [ ] Review and update security checklist

## Security Assessment Questions

### Authentication and Authorization

1. Who can access what data?
2. How is authentication enforced?
3. What happens if authentication fails?
4. Are admin endpoints properly protected?

### Data Protection

1. Is sensitive data encrypted at rest?
2. Is sensitive data encrypted in transit?
3. Where is data stored?
4. How is data backed up?

### Network Security

1. What network paths exist?
2. Are firewalls configured correctly?
3. Is there unnecessary exposure to the internet?
4. Are VPNs required for admin access?

### Application Security

1. Are inputs validated?
2. Are outputs encoded?
3. Are known vulnerabilities patched?
4. Is dependency scanning performed?

### Operational Security

1. Who has access to AWS account?
2. How is access audited?
3. What happens during an incident?
4. How are updates deployed?

## Security Testing

### Automated Testing

- [ ] Run security linters
  ```bash
  npm audit
  npm run lint:security
  ```

- [ ] Run dependency checks
  ```bash
  npm audit audit-level=moderate
  ```

- [ ] Run SAST (Static Application Security Testing)
  - Code scanning
  - Secret scanning

### Manual Testing

- [ ] Penetration testing
  - OWASP Top 10 vulnerabilities
  - API security testing
  - Authentication bypass attempts

- [ ] Webhook testing
  - Signature verification
  - Replay attacks
  - Malformed payloads

## Security Resources

### AWS Security Services

- **AWS Shield**: DDoS protection
- **AWS WAF**: Web application firewall
- **AWS GuardDuty**: Threat detection
- **AWS Security Hub**: Security posture
- **AWS Config**: Configuration tracking
- **AWS CloudTrail**: Audit logging

### External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [AWS Security Best Practices](https://docs.aws.amazon.com/security/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

## Security Incident Response

### Detection

1. Monitor CloudWatch alarms
2. Review GuardDuty findings
3. Check Security Hub alerts
4. Analyze CloudTrail logs

### Containment

1. Isolate affected resources
2. Block malicious IPs
3. Disable compromised credentials
4. Take affected services offline

### Eradication

1. Identify root cause
2. Remove malware/malicious code
3. Patch vulnerabilities
4. Update security rules

### Recovery

1. Restore from clean backups
2. Verify system integrity
3. Monitor for recurrence
4. Document lessons learned

### Post-Incident

1. Conduct post-mortem
2. Update security policies
3. Improve detection
4. Train team

## Compliance

### GDPR Checklist

- [ ] Lawful basis for processing
- [ ] Privacy Notice provided
- [ ] Data subject rights implemented
- [ ] Data breach notification process
- [ ] Data Protection Impact Assessment (if needed)
- [ ] Data Processing Agreement with vendors
- [ ] Cookie consent mechanism
- [ ] Data retention policies

### SOC 2 Checklist

- [ ] Security policies documented
- [ ] Access controls implemented
- [ ] Monitoring and logging enabled
- [ ] Change management process
- [ ] Incident response plan
- [ ] Vendor risk management
- [ ] Regular security assessments
- [ ] Training programs

## Security Best Practices

### Code Security

1. **Never commit secrets** to version control
2. **Use environment variables** for configuration
3. **Implement proper error handling** (don't leak information)
4. **Validate all inputs** (whitelist, not blacklist)
5. **Use parameterized queries** (prevent SQL injection)
6. **Implement rate limiting** (prevent abuse)
7. **Use HTTPS everywhere** (encrypt in transit)
8. **Keep dependencies updated** (patch vulnerabilities)

### AWS Security

1. **Use MFA** for AWS accounts
2. **Enable CloudTrail** (audit all API calls)
3. **Use IAM roles** (not access keys)
4. **Enable encryption** (at rest and in transit)
5. **Use security groups** (not NACLs where possible)
6. **Enable AWS Config** (track configuration changes)
7. **Use AWS Secrets Manager** (not environment variables)
8. **Enable GuardDuty** (threat detection)

### Operational Security

1. **Principle of least privilege** (minimum required access)
2. **Defense in depth** (multiple security layers)
3. **Fail securely** (default deny)
4. **Trust but verify** (validate everything)
5. **Security by design** (build in from start)
6. **Continuous monitoring** (detect and respond)
7. **Regular updates** (patch and upgrade)
8. **Security training** (educate team)

## Contact and Reporting

### Security Issues

To report security issues:
1. Do NOT create public GitHub issues
2. Email security@yourdomain.com
3. Include detailed description
4. Allow time to fix before disclosure

### Security Team

- **Security Lead**: [Name, Contact]
- **Incident Response**: [Contact]
- **AWS Account Owner**: [Contact]

---

**Last Updated**: 2024-01-24
**Next Review**: 2024-02-24
**Version**: 1.0
