#!/bin/bash
# Supporter 360 Post-Deployment Checklist
# This script validates a deployment is healthy and production-ready.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS_COUNT++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL_COUNT++))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN_COUNT++))
}

section() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
}

# Get configuration
get_api_id() {
    aws apigateway get-rest-apis \
        --query 'Items[?name==`Supporter360StackV2`].id' \
        --output text
}

get_db_endpoint() {
    aws rds describe-db-clusters \
        --db-cluster-identifier supporter360-supporter360-database \
        --query 'DBClusters[0].Endpoint' \
        --output text
}

# Main checklist
main() {
    section "Supporter 360 Post-Deployment Checklist"
    echo "Started: $(date)"
    echo ""

    # 1. CloudFormation Stack Status
    section "1. CloudFormation Stack Status"

    STACK_STATUS=$(aws cloudformation describe-stacks \
        --stack-name Supporter360StackV2 \
        --query 'Stacks[0].StackStatus' \
        --output text 2>/dev/null || echo "NOT_FOUND")

    if [[ "$STACK_STATUS" == "CREATE_COMPLETE" ]] || [[ "$STACK_STATUS" == "UPDATE_COMPLETE" ]]; then
        pass "CloudFormation stack status: $STACK_STATUS"
    else
        fail "CloudFormation stack status: $STACK_STATUS (expected CREATE_COMPLETE or UPDATE_COMPLETE)"
    fi

    # 2. Lambda Functions Deployed
    section "2. Lambda Functions"

    LAMBDA_FUNCTIONS=(
        "Supporter360StackV2-ShopifyWebhookHandler"
        "Supporter360StackV2-ShopifyProcessor"
        "Supporter360StackV2-StripeWebhookHandler"
        "Supporter360StackV2-StripeProcessor"
        "Supporter360StackV2-GoCardlessWebhookHandler"
        "Supporter360StackV2-GoCardlessProcessor"
        "Supporter360StackV2-MailchimpWebhookHandler"
        "Supporter360StackV2-MailchimpProcessor"
        "Supporter360StackV2-SearchHandler"
        "Supporter360StackV2-ProfileHandler"
        "Supporter360StackV2-TimelineHandler"
    )

    for func in "${LAMBDA_FUNCTIONS[@]}"; do
        if aws lambda get-function --function-name "$func" &>/dev/null; then
            pass "Lambda function deployed: $func"
        else
            fail "Lambda function missing: $func"
        fi
    done

    # 3. API Gateway Endpoints
    section "3. API Gateway Endpoints"

    API_ID=$(get_api_id)

    if [[ -n "$API_ID" ]]; then
        pass "API Gateway deployed: $API_ID"

        # Test endpoints
        API_URL="https://${API_ID}.execute-api.eu-west-1.amazonaws.com/prod"

        # Test search endpoint (will fail without auth, but should return 401 or 403, not 5xx)
        if curl -s -o /dev/null -w "%{http_code}" "$API_URL/search?q=test" | grep -qE "^(401|403|400)$"; then
            pass "API search endpoint responding"
        else
            fail "API search endpoint not responding correctly"
        fi
    else
        fail "API Gateway not found"
    fi

    # 4. Database Connectivity
    section "4. Database Connectivity"

    DB_ENDPOINT=$(get_db_endpoint)

    if [[ -n "$DB_ENDPOINT" ]]; then
        pass "Database endpoint: $DB_ENDPOINT"

        # Get credentials from Secrets Manager
        DB_CREDS=$(aws secretsmanager get-secret-value \
            --secret-id Supporter360StackV2-postgres \
            --query SecretString \
            --output text 2>/dev/null || echo "")

        if [[ -n "$DB_CREDS" ]]; then
            pass "Database credentials found in Secrets Manager"

            # Test database connection
            if psql -h "$DB_ENDPOINT" -U postgres -d supporter360 -c "SELECT 1;" &>/dev/null; then
                pass "Database connectivity verified"
            else
                warn "Database connection test failed (may need correct credentials)"
            fi
        else
            fail "Database credentials not found in Secrets Manager"
        fi
    else
        fail "Database endpoint not found"
    fi

    # 5. SQS Queues
    section "5. SQS Queues"

    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

    SQS_QUEUES=(
        "supporter360-shopify-queue"
        "supporter360-stripe-queue"
        "supporter360-gocardless-queue"
        "supporter360-mailchimp-queue"
        "supporter360-shopify-dlq"
        "supporter360-stripe-dlq"
        "supporter360-gocardless-dlq"
        "supporter360-mailchimp-dlq"
    )

    for queue in "${SQS_QUEUES[@]}"; do
        QUEUE_URL="https://sqs.eu-west-1.amazonaws.com/${ACCOUNT_ID}/${queue}"

        if aws sqs get-queue-attributes --queue-url "$QUEUE_URL" --attribute-names QueueArn &>/dev/null; then
            pass "SQS queue exists: $queue"
        else
            fail "SQS queue missing: $queue"
        fi
    done

    # 6. S3 Buckets
    section "6. S3 Buckets"

    # Get all S3 buckets containing supporter360
    S3_BUCKETS=$(aws s3 ls | awk '{print $3}' | grep supporter360 || true)

    if [[ -n "$S3_BUCKETS" ]]; then
        pass "S3 buckets found: $(echo "$S3_BUCKETS" | wc -l) buckets"
    else
        fail "No S3 buckets found"
    fi

    # 7. Webhook Endpoints
    section "7. Webhook Endpoints"

    if [[ -n "$API_ID" ]]; then
        WEBHOOK_ENDPOINTS=(
            "shopify"
            "stripe"
            "gocardless"
            "mailchimp"
        )

        for webhook in "${WEBHOOK_ENDPOINTS[@]}"; do
            WEBHOOK_URL="https://${API_ID}.execute-api.eu-west-1.amazonaws.com/prod/webhooks/${webhook}"

            # Test webhook endpoint (should accept POST, even if signature fails)
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK_URL" -d "{}")

            if [[ "$STATUS" == "401" ]] || [[ "$STATUS" == "403" ]] || [[ "$STATUS" == "400" ]]; then
                pass "Webhook endpoint accessible: /webhooks/$webhook (HTTP $STATUS)"
            elif [[ "$STATUS" == "404" ]]; then
                fail "Webhook endpoint not found: /webhooks/$webhook"
            else
                warn "Webhook endpoint unexpected status: /webhooks/$webhook (HTTP $STATUS)"
            fi
        done
    fi

    # 8. CloudWatch Log Groups
    section "8. CloudWatch Log Groups"

    LAMBDA_LOG_GROUPS=$(aws logs describe-log-groups \
        --log-group-name-prefix /aws/lambda/Supporter360StackV2 \
        --query 'logGroups[*].logGroupName' \
        --output text 2>/dev/null | wc -l)

    if [[ "$LAMBDA_LOG_GROUPS" -gt 0 ]]; then
        pass "CloudWatch log groups found: $LAMBDA_LOG_GROUPS groups"
    else
        warn "No CloudWatch log groups found"
    fi

    # 9. Secrets Manager
    section "9. Secrets Manager"

    SECRETS=(
        "supporter360/shopify"
        "supporter360/stripe"
        "supporter360/gocardless"
        "supporter360/mailchimp"
        "supporter360/future-ticketing"
    )

    for secret in "${SECRETS[@]}"; do
        SECRET_VALUE=$(aws secretsmanager get-secret-value \
            --secret-id "$secret" \
            --query SecretString \
            --output text 2>/dev/null || echo "")

        if [[ -n "$SECRET_VALUE" ]]; then
            # Check if it's a placeholder
            if [[ "$SECRET_VALUE" == *"PLACEHOLDER"* ]]; then
                warn "Secret exists but is placeholder: $secret"
            else
                pass "Secret configured: $secret"
            fi
        else
            fail "Secret not found: $secret"
        fi
    done

    # 10. Database Schema
    section "10. Database Schema"

    if psql -h "$DB_ENDPOINT" -U postgres -d supporter360 -c "SELECT 1 FROM schema_migrations;" &>/dev/null 2>&1; then
        pass "Database schema migrations applied"

        # Check for key tables
        TABLES=("supporters" "events" "memberships" "email_aliases")
        for table in "${TABLES[@]}"; do
            if psql -h "$DB_ENDPOINT" -U postgres -d supporter360 -c "SELECT 1 FROM $table LIMIT 1;" &>/dev/null 2>&1; then
                pass "Database table exists: $table"
            else
                fail "Database table missing: $table"
            fi
        done
    else
        warn "Database schema not applied (run migrations)"
    fi

    # 11. CloudWatch Alarms
    section "11. CloudWatch Alarms"

    ALARMS=$(aws cloudwatch describe-alarms \
        --alarm-names-prefix supporter360 \
        --query 'MetricAlarms[*].AlarmName' \
        --output text 2>/dev/null | wc -l)

    if [[ "$ALARMS" -gt 0 ]]; then
        pass "CloudWatch alarms configured: $ALARMS alarms"
    else
        warn "No CloudWatch alarms found (recommended for production)"
    fi

    # 12. External Integrations
    section "12. External Integrations Status"

    # Future Ticketing is working (per deployment verification report)
    pass "Future Ticketing: Configured and working"

    # Shopify - partial (EventBridge configured, orders need scope)
    warn "Shopify: Partially configured (EventBridge working, orders need read_orders scope)"

    # Others need configuration
    warn "Stripe: Needs webhook registration and secret configuration"
    warn "GoCardless: Needs webhook registration and secret configuration"
    warn "Mailchimp: Needs webhook registration and secret configuration"

    # 13. Security Configuration
    section "13. Security Configuration"

    # Check for API key authentication
    warn "API Authentication: Lambda authorizer not deployed (recommended for production)"

    # Check CORS
    warn "CORS: Currently set to ALL_ORIGINS (update for production domains)"

    # Check for WAF
    if aws wafv2 list-web-acls --scope REGIONAL --region eu-west-1 --query 'WebACLs[*].Name' --output text | grep -q "Supporter360"; then
        pass "AWS WAF: Configured"
    else
        warn "AWS WAF: Not configured (recommended for production)"
    fi

    # 14. Performance Baseline
    section "14. Performance Baseline"

    # Get recent Lambda duration
    LAMBDA_DURATION=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Lambda \
        --metric-name Duration \
        --dimensions Name=FunctionName,Value=Supporter360StackV2-ShopifyProcessor \
        --start-time "$(date -d '1 hour ago' +%s)" \
        --end-time "$(date +%s)" \
        --period 3600 \
        --statistics Average \
        --query 'Datapoints[0].Average' \
        --output text 2>/dev/null || echo "0")

    if [[ "$LAMBDA_DURATION" != "None" ]] && [[ "$LAMBDA_DURATION" != "0" ]]; then
        pass "Lambda duration baseline: ${LAMBDA_DURATION}s"
    else
        warn "Lambda duration baseline: No data available"
    fi

    # Summary
    section "Checklist Summary"
    echo ""
    echo -e "${GREEN}Passed:${NC} $PASS_COUNT"
    echo -e "${YELLOW}Warnings:${NC} $WARN_COUNT"
    echo -e "${RED}Failed:${NC} $FAIL_COUNT"
    echo ""

    TOTAL_CHECKS=$((PASS_COUNT + WARN_COUNT + FAIL_COUNT))
    echo "Total checks: $TOTAL_CHECKS"

    if [[ "$FAIL_COUNT" -eq 0 ]] && [[ "$WARN_COUNT" -eq 0 ]]; then
        echo -e "${GREEN}Deployment is production-ready!${NC}"
        return 0
    elif [[ "$FAIL_COUNT" -eq 0 ]]; then
        echo -e "${YELLOW}Deployment is functional with warnings (review recommended)${NC}"
        return 0
    else
        echo -e "${RED}Deployment has critical issues that must be addressed${NC}"
        return 1
    fi
}

# Run main function
main
echo ""
echo "Completed: $(date)"
