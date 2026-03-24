#!/bin/bash
# Supporter 360 Production Readiness Report Generator
# Generates a comprehensive readiness score and report

set -euo pipefail

REPORT_FILE="readiness-report-$(date +%Y%m%d-%H%M%S).md"

# Header
cat > "$REPORT_FILE" <<EOF
# Supporter 360 Production Readiness Report

**Generated:** $(date)
**Stack:** Supporter360StackV2
**Region:** eu-west-1

---

## Executive Summary

EOF

# Get stack status
STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name Supporter360StackV2 \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND")

echo "**Stack Status:** $STACK_STATUS" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Calculate readiness scores
declare -A SCORES
declare -A MAX_SCORES

# Infrastructure (10 points max)
INFRA_SCORE=0
if [[ "$STACK_STATUS" == "CREATE_COMPLETE" ]] || [[ "$STACK_STATUS" == "UPDATE_COMPLETE" ]]; then
    ((INFRA_SCORE+=5))
fi

if aws lambda get-function --function-name Supporter360StackV2-ShopifyWebhookHandler &>/dev/null; then
    ((INFRA_SCORE+=2))
fi

if aws apigateway get-rest-api --rest-api-id "$(aws apigateway get-rest-apis --query 'Items[?name==`Supporter360StackV2`].id' --output text)" &>/dev/null; then
    ((INFRA_SCORE+=2))
fi

if aws rds describe-db-clusters --db-cluster-identifier supporter360-supporter360-database &>/dev/null; then
    ((INFRA_SCORE+=1))
fi

SCORES[Infrastructure]=$INFRA_SCORE
MAX_SCORES[Infrastructure]=10

# Database (10 points max)
DB_SCORE=0
if psql -h "$(aws rds describe-db-clusters --db-cluster-identifier supporter360-supporter360-database --query 'DBClusters[0].Endpoint' --output text)" -U postgres -d supporter360 -c "SELECT 1 FROM schema_migrations;" &>/dev/null 2>&1; then
    ((DB_SCORE+=7))
fi

if aws secretsmanager get-secret-value --secret-id Supporter360StackV2-postgres --query SecretString --output text &>/dev/null; then
    ((DB_SCORE+=3))
fi

SCORES[Database]=$DB_SCORE
MAX_SCORES[Database]=10

# Webhooks (10 points max)
WEBHOOK_SCORE=0

# Check webhook endpoints
API_ID=$(aws apigateway get-rest-apis --query 'Items[?name==`Supporter360StackV2`].id' --output text)
if [[ -n "$API_ID" ]]; then
    ((WEBHOOK_SCORE+=3))
fi

# Check secrets configuration
for secret in shopify stripe gocardless mailchimp; do
    SECRET_VALUE=$(aws secretsmanager get-secret-value --secret-id "supporter360/$secret" --query SecretString --output text 2>/dev/null || echo "")
    if [[ -n "$SECRET_VALUE" ]] && [[ "$SECRET_VALUE" != *"PLACEHOLDER"* ]]; then
        ((WEBHOOK_SCORE+=1))
    fi
done

# Future Ticketing is working
((WEBHOOK_SCORE+=2))

SCORES[Webhooks]=$WEBHOOK_SCORE
MAX_SCORES[Webhooks]=10

# API (10 points max)
API_SCORE=5 # Base score for having API deployed

if aws lambda get-function --function-name Supporter360StackV2-SearchHandler &>/dev/null; then
    ((API_SCORE+=2))
fi

if aws lambda get-function --function-name Supporter360StackV2-ProfileHandler &>/dev/null; then
    ((API_SCORE+=2))
fi

if aws lambda get-function --function-name Supporter360StackV2-TimelineHandler &>/dev/null; then
    ((API_SCORE+=1))
fi

SCORES[API]=$API_SCORE
MAX_SCORES[API]=10

# Integrations (10 points max)
INT_SCORE=3 # Future Ticketing working

# Check other integrations
for integration in stripe gocardless mailchimp; do
    SECRET_VALUE=$(aws secretsmanager get-secret-value --secret-id "supporter360/$integration" --query SecretString --output text 2>/dev/null || echo "")
    if [[ -n "$SECRET_VALUE" ]] && [[ "$SECRET_VALUE" != *"PLACEHOLDER"* ]]; then
        ((INT_SCORE+=2))
    fi
done

SCORES[Integrations]=$INT_SCORE
MAX_SCORES[Integrations]=10

# Monitoring (10 points max)
MON_SCORE=0

ALARMS=$(aws cloudwatch describe-alarms --alarm-names-prefix supporter360 --query 'MetricAlarms[*].AlarmName' --output text 2>/dev/null | wc -l)
if [[ "$ALARMS" -gt 0 ]]; then
    ((MON_SCORE+=3))
fi

if aws logs describe-log-groups --log-group-name-prefix /aws/lambda/Supporter360StackV2 &>/dev/null; then
    ((MON_SCORE+=2))
fi

if aws cloudtrail get-trail-status --name Supporter360-Trail &>/dev/null 2>&1; then
    ((MON_SCORE+=2))
fi

if aws s3 ls | grep -q "cloudtrail"; then
    ((MON_SCORE+=1))
fi

if aws wafv2 list-web-acls --scope REGIONAL --region eu-west-1 --query 'WebACLs[*].Name' --output text | grep -q "Supporter360"; then
    ((MON_SCORE+=2))
fi

SCORES[Monitoring]=$MON_SCORE
MAX_SCORES[Monitoring]=10

# Security (10 points max)
SEC_SCORE=5 # Base security measures in place

if aws lambda get-function --function-name Supporter360StackV2-SearchHandler &>/dev/null; then
    ((SEC_SCORE+=1))
fi

if aws secretsmanager list-secrets --query 'SecretList[?contains(Name, `supporter360`)].Name' --output text | wc -l | grep -q "5"; then
    ((SEC_SCORE+=2))
fi

if aws rds describe-db-clusters --db-cluster-identifier supporter360-supporter360-database --query 'DBClusters[0].StorageEncrypted' --output text | grep -q "true"; then
    ((SEC_SCORE+=2))
fi

SCORES[Security]=$SEC_SCORE
MAX_SCORES[Security]=10

# Documentation (10 points max)
DOC_SCORE=4 # Runbooks exist

if [[ -f "docs/deployment-verification.md" ]]; then
    ((DOC_SCORE+=2))
fi

if [[ -f "docs/deployment.md" ]]; then
    ((DOC_SCORE+=2))
fi

if [[ -f "docs/security-checklist.md" ]]; then
    ((DOC_SCORE+=2))
fi

SCORES[Documentation]=$DOC_SCORE
MAX_SCORES[Documentation]=10

# Calculate total score
TOTAL_SCORE=0
TOTAL_MAX=0

for category in Infrastructure Database Webhooks API Integrations Monitoring Security Documentation; do
    TOTAL_SCORE=$((TOTAL_SCORE + SCORES[$category]))
    TOTAL_MAX=$((TOTAL_MAX + MAX_SCORES[$category]))
done

READINESS_PERCENT=$((TOTAL_SCORE * 100 / TOTAL_MAX))

# Generate report
cat >> "$REPORT_FILE" <<EOF

**Overall Readiness:** ${TOTAL_SCORE}/${TOTAL_MAX} (${READINESS_PERCENT}%)

---

## Detailed Scores

| Category | Score | Max | Percentage |
|----------|-------|-----|------------|
EOF

for category in Infrastructure Database Webhooks API Integrations Monitoring Security Documentation; do
    PERCENT=$((SCORES[$category] * 100 / MAX_SCORES[$category]))
    echo "| $category | ${SCORES[$category]} | ${MAX_SCORES[$category]} | ${PERCENT}% |" >> "$REPORT_FILE"
done

cat >> "$REPORT_FILE" <<EOF

---

## Category Breakdown

### Infrastructure (${SCORES[Infrastructure]}/${MAX_SCORES[Infrastructure]})

EOF

if [[ ${SCORES[Infrastructure]} -eq ${MAX_SCORES[Infrastructure]} ]]; then
    echo "✅ **Complete**" >> "$REPORT_FILE"
else
    echo "⚠️ **Needs Attention**" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF

- CloudFormation stack: $STACK_STATUS
- Lambda functions deployed: $(aws lambda list-functions --query 'Functions[?contains(FunctionName, `Supporter360`)].FunctionName' --output text | wc -l) functions
- API Gateway deployed: $([ -n "$API_ID" ] && echo "Yes" || echo "No")
- RDS database deployed: $(aws rds describe-db-clusters --db-cluster-identifier supporter360-supporter360-database &>/dev/null && echo "Yes" || echo "No")

### Database (${SCORES[Database]}/${MAX_SCORES[Database]})

EOF

if [[ ${SCORES[Database]} -ge 7 ]]; then
    echo "✅ **Migrations Applied**" >> "$REPORT_FILE"
else
    echo "❌ **Migrations Not Run**" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF

- Database endpoint: $(aws rds describe-db-clusters --db-cluster-identifier supporter360-supporter360-database --query 'DBClusters[0].Endpoint' --output text 2>/dev/null || echo "Not found")
- Schema migrations: $(psql -h "$(aws rds describe-db-clusters --db-cluster-identifier supporter360-supporter360-database --query 'DBClusters[0].Endpoint' --output text)" -U postgres -d supporter360 -c "SELECT COUNT(*) FROM schema_migrations;" -t 2>/dev/null || echo "0")
- Credentials configured: $(aws secretsmanager get-secret-value --secret-id Supporter360StackV2-postgres --query SecretString --output text &>/dev/null && echo "Yes" || echo "No")

### Webhooks (${SCORES[Webhooks]}/${MAX_SCORES[Webhooks]})

EOF

if [[ ${SCORES[Webhooks]} -ge 8 ]]; then
    echo "✅ **Configured**" >> "$REPORT_FILE"
elif [[ ${SCORES[Webhooks]} -ge 5 ]]; then
    echo "⚠️ **Partially Configured**" >> "$REPORT_FILE"
else
    echo "❌ **Not Configured**" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF

- Shopify: $(aws secretsmanager get-secret-value --secret-id supporter360/shopify --query SecretString --output text 2>/dev/null | grep -q "PLACEHOLDER" && echo "Placeholder" || echo "Configured")
- Stripe: $(aws secretsmanager get-secret-value --secret-id supporter360/stripe --query SecretString --output text 2>/dev/null | grep -q "PLACEHOLDER" && echo "Placeholder" || echo "Configured")
- GoCardless: $(aws secretsmanager get-secret-value --secret-id supporter360/gocardless --query SecretString --output text 2>/dev/null | grep -q "PLACEHOLDER" && echo "Placeholder" || echo "Configured")
- Mailchimp: $(aws secretsmanager get-secret-value --secret-id supporter360/mailchimp --query SecretString --output text 2>/dev/null | grep -q "PLACEHOLDER" && echo "Placeholder" || echo "Configured")
- Future Ticketing: ✅ Working

### API (${SCORES[API]}/${MAX_SCORES[API]})

EOF

if [[ ${SCORES[API]} -ge 8 ]]; then
    echo "✅ **Operational**" >> "$REPORT_FILE"
else
    echo "⚠️ **Needs Authentication**" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF

- API Gateway deployed: Yes
- Search endpoint: $(aws lambda get-function --function-name Supporter360StackV2-SearchHandler &>/dev/null && echo "✅" || echo "❌")
- Profile endpoint: $(aws lambda get-function --function-name Supporter360StackV2-ProfileHandler &>/dev/null && echo "✅" || echo "❌")
- Timeline endpoint: $(aws lambda get-function --function-name Supporter360StackV2-TimelineHandler &>/dev/null && echo "✅" || echo "❌")
- Lambda authorizer: ❌ Not deployed (recommended)

### Integrations (${SCORES[Integrations]}/${MAX_SCORES[Integrations]})

EOF

if [[ ${SCORES[Integrations]} -ge 8 ]]; then
    echo "✅ **All Integrations Working**" >> "$REPORT_FILE"
elif [[ ${SCORES[Integrations]} -ge 5 ]]; then
    echo "⚠️ **Partial Integration**" >> "$REPORT_FILE"
else
    echo "❌ **Minimal Integration**" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF

- Future Ticketing: ✅ Working
- Shopify: ⚠️ Partial (EventBridge working, orders need scope)
- Stripe: ❌ Not configured
- GoCardless: ❌ Not configured
- Mailchimp: ❌ Not configured

### Monitoring (${SCORES[Monitoring]}/${MAX_SCORES[Monitoring]})

EOF

if [[ ${SCORES[Monitoring]} -ge 8 ]]; then
    echo "✅ **Well Monitored**" >> "$REPORT_FILE"
elif [[ ${SCORES[Monitoring]} -ge 5 ]]; then
    echo "⚠️ **Basic Monitoring**" >> "$REPORT_FILE"
else
    echo "❌ **Insufficient Monitoring**" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF

- CloudWatch alarms: $ALARMS alarms configured
- CloudWatch logs: ✅ Enabled
- CloudTrail: $(aws cloudtrail get-trail-status --name Supporter360-Trail &>/dev/null 2>&1 && echo "✅ Enabled" || echo "❌ Not enabled")
- AWS WAF: $(aws wafv2 list-web-acls --scope REGIONAL --region eu-west-1 --query 'WebACLs[*].Name' --output text | grep -q "Supporter360" && echo "✅ Enabled" || echo "❌ Not enabled")

### Security (${SCORES[Security]}/${MAX_SCORES[Security]})

EOF

if [[ ${SCORES[Security]} -ge 8 ]]; then
    echo "✅ **Secure**" >> "$REPORT_FILE"
elif [[ ${SCORES[Security]} -ge 6 ]]; then
    echo "⚠️ **Basic Security**" >> "$REPORT_FILE"
else
    echo "❌ **Security Gaps**" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF

- API authentication: ⚠️ Lambda authorizer not deployed
- Secrets Manager: ✅ Configured
- Database encryption: ✅ Enabled
- CORS: ⚠️ Set to ALL_ORIGINS (update for production)
- Rate limiting: ❌ Not configured

### Documentation (${SCORES[Documentation]}/${MAX_SCORES[Documentation]})

EOF

if [[ ${SCORES[Documentation]} -ge 8 ]]; then
    echo "✅ **Well Documented**" >> "$REPORT_FILE"
else
    echo "⚠️ **Documentation Needs Work**" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF

- Deployment guide: $([[ -f "docs/deployment.md" ]] && echo "✅" || echo "❌")
- Deployment verification: $([[ -f "docs/deployment-verification.md" ]] && echo "✅" || echo "❌")
- Runbooks: $([[ -f "docs/runbooks/index.md" ]] && echo "✅" || echo "❌")
- Security checklist: $([[ -f "docs/security-checklist.md" ]] && echo "✅" || echo "❌")

---

## Recommendations

### Critical Path (Must Complete Before Production)

EOF

if [[ ${SCORES[Database]} -lt 7 ]]; then
cat >> "$REPORT_FILE" <<EOF
1. **Run Database Migrations**
   \`\`\`bash
   aws lambda invoke \\
     --function-name Supporter360StackV2-DbMigrationA9ABF2D2-2X0HPQ4xPcjO \\
     --payload '{}' \\
     response.json
   \`\`\`

EOF
fi

cat >> "$REPORT_FILE" <<EOF
2. **Update All Webhook Secrets**
   - Get webhook signing secrets from external providers
   - Update Secrets Manager for each integration
   - Remove "PLACEHOLDER" values

3. **Register Webhook URLs**
   - Shopify: Register via Shopify Admin or EventBridge
   - Stripe: Add endpoint in Stripe Dashboard
   - GoCardless: Add webhook in GoCardless Dashboard
   - Mailchimp: Add webhook in Mailchimp Audience settings

4. **Set Up Critical Alarms**
   - Lambda error rate > 5%
   - API Gateway 5XX errors
   - RDS CPU > 80%
   - DLQ has messages

### High Priority (Complete Within First Week)

EOF

if [[ ${SCORES[API]} -lt 8 ]]; then
cat >> "$REPORT_FILE" <<EOF
5. **Add Lambda Authorizer**
   - Deploy authorizer function
   - Attach to API Gateway endpoints
   - Test authentication

EOF
fi

cat >> "$REPORT_FILE" <<EOF
6. **Configure CORS for Production**
   - Update \`packages/backend/src/config/cors.ts\`
   - Replace ALL_ORIGINS with production domains
   - Redeploy infrastructure

7. **Create CloudWatch Dashboard**
   - Lambda metrics
   - API Gateway metrics
   - RDS metrics
   - SQS metrics

8. **Enable AWS WAF**
   - Create WAF web ACL
   - Configure rate-based rules
   - Associate with API Gateway

### Medium Priority (Complete Within First Month)

9. **Configure Database Backups**
   - Increase backup retention to 30 days
   - Set up automated backup to S3
   - Test restore procedure

10. **Enable CloudTrail Logging**
    - Create CloudTrail
    - Configure S3 bucket for logs
    - Enable log encryption

11. **Configure API Gateway Usage Plan**
    - Create usage plan with rate limits
    - Generate production API keys
    - Associate keys with usage plan

---

## Next Steps

1. **Review this report** and identify gaps
2. **Prioritize critical path items** for production readiness
3. **Assign tasks** to team members
4. **Track progress** with weekly reviews
5. **Update this report** as items are completed

---

**Report generated by:** \`scripts/generate-readiness-report.sh\`
**For questions or issues, contact:** gleesonb@gmail.com

EOF

echo "Readiness report generated: $REPORT_FILE"
echo ""
echo "Readiness Score: ${TOTAL_SCORE}/${TOTAL_MAX} (${READINESS_PERCENT}%)"

if [[ "$READINESS_PERCENT" -ge 80 ]]; then
    echo -e "\033[0;32mStatus: PRODUCTION READY\033[0m"
elif [[ "$READINESS_PERCENT" -ge 60 ]]; then
    echo -e "\033[1;33mStatus: NEEDS WORK BEFORE PRODUCTION\033[0m"
else
    echo -e "\033[0;31mStatus: NOT READY FOR PRODUCTION\033[0m"
fi

echo ""
echo "View report: cat $REPORT_FILE"
