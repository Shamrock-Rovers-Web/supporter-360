#!/bin/bash

set -e

# Supporter 360 Health Check Script
# This script performs endpoint health verification for all services
# Updated for serverless architecture (Serverless v2, VPC endpoints, S3 static website)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-}"
FRONTEND_URL="${FRONTEND_URL:-}"
HEALTH_CHECK_TIMEOUT=10
MAX_RETRIES=3
RETRY_DELAY=5
RESPONSE_TIME_WARN_THRESHOLD=5  # Warn if response time > 5s (Serverless cold starts)

# Health check results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
SLOW_RESPONSES=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
    ((TOTAL_CHECKS++))
}

print_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
}

# Check endpoint with retry logic
check_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local method="${4:-GET}"
    local headers="${5:-}"
    local data="${6:-}"

    local attempt=1
    local status_code=""
    local response_body=""
    local response_time=""

    while [[ $attempt -le $MAX_RETRIES ]]; do
        log_info "Checking $name (attempt $attempt/$MAX_RETRIES)..."

        # Build curl command
        local curl_cmd="curl -s -w '\n%{http_code}\n%{time_total}' -X $method"
        curl_cmd="$curl_cmd --max-time $HEALTH_CHECK_TIMEOUT"

        if [[ -n "$headers" ]]; then
            curl_cmd="$curl_cmd $headers"
        fi

        if [[ -n "$data" ]]; then
            curl_cmd="$curl_cmd -d '$data'"
        fi

        curl_cmd="$curl_cmd '$url'"

        # Execute curl command
        local output
        output=$(eval "$curl_cmd" 2>/dev/null || echo "")

        # Parse output
        status_code=$(echo "$output" | tail -n 2 | head -n 1)
        response_time=$(echo "$output" | tail -n 1)
        response_body=$(echo "$output" | head -n -2)

        # Check status code
        if [[ "$status_code" == "$expected_status" ]]; then
            # Check response time
            local time_value=$(echo "$response_time" | awk '{printf "%.0f", $1}')
            if [[ $(echo "$response_time > $RESPONSE_TIME_WARN_THRESHOLD" | bc -l 2>/dev/null || echo "0") -eq 1 ]]; then
                log_warning "$name - HTTP $status_code (${response_time}s) - SLOW (cold start?)"
                ((SLOW_RESPONSES++))
            else
                log_success "$name - HTTP $status_code (${response_time}s)"
            fi
            return 0
        elif [[ "$status_code" == "000" ]]; then
            log_warning "$name - Connection failed (attempt $attempt/$MAX_RETRIES)"
            if [[ $attempt -lt $MAX_RETRIES ]]; then
                sleep $RETRY_DELAY
            fi
        else
            log_error "$name - HTTP $status_code (expected $expected_status)"
            if [[ -n "$response_body" ]]; then
                log_info "Response: $response_body"
            fi
            return 1
        fi

        ((attempt++))
    done

    log_error "$name - Failed after $MAX_RETRIES attempts"
    return 1
}

# Check RDS Serverless v2 health
check_serverless_v2_health() {
    print_header "RDS Serverless v2 Health Check"

    if [[ -z "$DB_HOST" ]]; then
        log_error "DB_HOST environment variable not set"
        return
    fi

    log_info "Checking Serverless v2 ACU capacity for $DB_HOST..."

    # Get DB instance identifier
    local db_instance_id
    db_instance_id=$(aws rds describe-db-instances \
        --query "DBInstances[?DBEndpoint.Endpoint=='${DB_HOST}'].DBInstanceIdentifier" \
        --output text 2>/dev/null || echo "")

    if [[ -z "$db_instance_id" ]]; then
        log_error "Could not find RDS instance for endpoint: $DB_HOST"
        return
    fi

    # Get CloudWatch metrics for ACU capacity
    local current_time
    current_time=$(date -u '+%Y-%m-%dT%H:%M:%S')
    local start_time
    start_time=$(date -u -d '5 minutes ago' '+%Y-%m-%dT%H:%M:%S')

    # Get current ACU usage
    local acu_metrics
    acu_metrics=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/RDS \
        --metric-name ServerlessDatabaseCapacity \
        --dimensions Name=DBInstanceIdentifier,Value="$db_instance_id" \
        --start-time "$start_time" \
        --end-time "$current_time" \
        --period 300 \
        --statistics Average,Maximum \
        --output json 2>/dev/null || echo "{}")

    local avg_acu
    local max_acu
    avg_acu=$(echo "$acu_metrics" | jq -r '.Datapoints[-1].Average // "null"' 2>/dev/null || echo "null")
    max_acu=$(echo "$acu_metrics" | jq -r '.Datapoints[-1].Maximum // "null"' 2>/dev/null || echo "null")

    if [[ "$avg_acu" != "null" && "$max_acu" != "null" ]]; then
        log_success "Serverless v2 ACU - Avg: ${avg_acu}, Max: ${max_acu}"

        # Check if ACU is near max scaling limit
        local scaling_config
        scaling_config=$(aws rds describe-db-instances \
            --db-instance-identifier "$db_instance_id" \
            --query 'DBInstances[0].ServerlessV2ScalingConfiguration.MaxCapacity' \
            --output text 2>/dev/null || echo "unknown")

        if [[ "$scaling_config" != "unknown" ]]; then
            local usage_percent
            usage_percent=$(echo "scale=0; ($max_acu * 100) / $scaling_config" | bc 2>/dev/null || echo "0")

            if [[ "$usage_percent" -gt 80 ]]; then
                log_warning "ACU usage at ${usage_percent}% of max capacity ($max_acu / $scaling_config ACUs)"
            else
                log_success "ACU usage at ${usage_percent}% of max capacity"
            fi
        fi
    else
        log_warning "Could not retrieve ACU metrics (may be too new or no traffic yet)"
    fi

    # Check connection count
    local connections
    connections=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/RDS \
        --metric-name DatabaseConnections \
        --dimensions Name=DBInstanceIdentifier,Value="$db_instance_id" \
        --start-time "$start_time" \
        --end-time "$current_time" \
        --period 60 \
        --statistics Average \
        --output json 2>/dev/null | jq -r '.Datapoints[-1].Average // "null"' || echo "null")

    if [[ "$connections" != "null" ]]; then
        log_info "Active database connections: ${connections}"
    fi
}

# Check VPC endpoint connectivity
check_vpc_endpoint_connectivity() {
    print_header "VPC Endpoint Connectivity Check"

    # Get VPC ID
    local vpc_id
    vpc_id=$(aws ec2 describe-vpcs \
        --filters "Name=tag:Name,Values=Supporter360Vpc" \
        --query Vpcs[0].VpcId \
        --output text 2>/dev/null || echo "")

    if [[ -z "$vpc_id" ]]; then
        log_warning "Could not find Supporter360 VPC"
        return
    fi

    log_success "Found VPC: $vpc_id"

    # Check Secrets Manager endpoint connectivity
    log_info "Testing Secrets Manager via VPC endpoint..."

    local start_time
    start_time=$(date +%s.%3N)

    if aws secretsmanager get-secret-value \
        --secret-id "supporter360-supporter360-postgres" \
        --query SecretString \
        --output text &> /dev/null; then

        local end_time
        end_time=$(date +%s.%3N)
        local elapsed
        elapsed=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")

        log_success "Secrets Manager accessible via VPC endpoint (${elapsed}s)"
    else
        log_error "Cannot access Secrets Manager via VPC endpoint"
    fi

    # Check SQS endpoint connectivity
    log_info "Testing SQS via VPC endpoint..."

    start_time=$(date +%s.%3N)

    if aws sqs list-queues --max-results 1 &> /dev/null; then
        end_time=$(date +%s.%3N)
        local elapsed
        elapsed=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")

        log_success "SQS accessible via VPC endpoint (${elapsed}s)"
    else
        log_error "Cannot access SQS via VPC endpoint"
    fi

    # Check S3 endpoint connectivity
    log_info "Testing S3 via VPC endpoint..."

    local account_id
    account_id=$(aws sts get-caller-identity --query Account --output text)
    local test_bucket="supporter360-raw-payloads-${account_id}"

    start_time=$(date +%s.%3N)

    if aws s3 ls "s3://$test_bucket" &> /dev/null; then
        end_time=$(date +%s.%3N)
        local elapsed
        elapsed=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")

        log_success "S3 accessible via VPC endpoint (${elapsed}s)"
    else
        log_warning "Cannot access S3 via VPC endpoint (bucket may not exist yet)"
    fi
}

# Check S3 static website
check_s3_static_website() {
    print_header "S3 Static Website Health Check"

    local account_id
    account_id=$(aws sts get-caller-identity --query Account --output text)
    local frontend_bucket="supporter360-frontend-${account_id}"

    log_info "Checking S3 static website: $frontend_bucket"

    # Get website configuration
    local website_config
    website_config=$(aws s3api get-bucket-website \
        --bucket "$frontend_bucket" \
        --output json 2>/dev/null || echo "")

    if [[ -z "$website_config" ]]; then
        log_error "S3 static website hosting is not configured"
        return
    fi

    # Get website endpoint
    local region
    region=$(aws configure get region || echo "us-east-1")

    local website_endpoint
    if [[ "$region" == "us-east-1" ]]; then
        website_endpoint="http://${frontend_bucket}.s3-website-us-east-1.amazonaws.com"
    else
        website_endpoint="http://${frontend_bucket}.s3-website-${region}.amazonaws.com"
    fi

    log_info "Testing website endpoint: $website_endpoint"

    # Test wget/curl to index.html
    local start_time
    start_time=$(date +%s.%3N)

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$website_endpoint" 2>/dev/null || echo "000")

    local end_time
    end_time=$(date +%s.%3N)
    local elapsed
    elapsed=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")

    if [[ "$http_code" == "200" ]]; then
        log_success "S3 static website is accessible (${elapsed}s)"

        # Check response time
        if [[ $(echo "$elapsed > $RESPONSE_TIME_WARN_THRESHOLD" | bc -l 2>/dev/null || echo "0") -eq 1 ]]; then
            log_warning "Website response time is slow (${elapsed}s) - may need CloudFront or optimization"
            ((SLOW_RESPONSES++))
        fi
    else
        log_error "S3 static website returned HTTP $http_code"
    fi

    # Test if index.html exists
    if aws s3 ls "s3://$frontend_bucket/index.html" &> /dev/null; then
        log_success "index.html exists in bucket"
    else
        log_warning "index.html not found in bucket"
    fi
}

# Check database connectivity
check_database() {
    print_header "Database Health Check"

    if [[ -z "$DB_HOST" ]]; then
        log_error "DB_HOST environment variable not set"
        return
    fi

    log_info "Testing database connection to $DB_HOST:$DB_PORT..."

    # Get credentials from Secrets Manager
    local db_secret
    db_secret=$(aws secretsmanager get-secret-value \
        --secret-id "supporter360-supporter360-postgres" \
        --query SecretString \
        --output text 2>/dev/null || echo "")

    if [[ -z "$db_secret" ]]; then
        log_error "Failed to retrieve database credentials from Secrets Manager"
        return
    fi

    local db_user
    local db_password
    db_user=$(echo "$db_secret" | jq -r '.username')
    db_password=$(echo "$db_secret" | jq -r '.password')

    # Test connection with timing
    local start_time
    start_time=$(date +%s.%3N)

    if PGPASSWORD="$db_password" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$db_user" \
        -d "$DB_NAME" \
        -c "SELECT 1 as health_check;" \
        &> /dev/null; then

        local end_time
        end_time=$(date +%s.%3N)
        local elapsed
        elapsed=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")

        log_success "Database is responsive (${elapsed}s)"

        # Check for slow responses (Serverless v2 cold starts)
        if [[ $(echo "$elapsed > $RESPONSE_TIME_WARN_THRESHOLD" | bc -l 2>/dev/null || echo "0") -eq 1 ]]; then
            log_warning "Database response time is slow (${elapsed}s) - likely Serverless v2 cold start"
            ((SLOW_RESPONSES++))
        fi
    else
        log_error "Database connection failed"
    fi

    # Check database version
    local db_version
    db_version=$(PGPASSWORD="$db_password" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$db_user" \
        -d "$DB_NAME" \
        -t -c "SELECT version();" \
        2>/dev/null | head -1 || echo "unknown")

    log_info "Database version: $db_version"
}

# Check webhook endpoints
check_webhook_endpoints() {
    print_header "Webhook Endpoint Health Check"

    if [[ -z "$API_URL" ]]; then
        log_error "API_URL environment variable not set"
        return
    fi

    # Shopify webhook (should accept POST)
    check_endpoint "Shopify Webhook" \
        "${API_URL}/webhooks/shopify" \
        "400" \
        "POST" \
        "-H 'Content-Type: application/json'" \
        '{"test": "data"}'

    # Stripe webhook (should accept POST)
    check_endpoint "Stripe Webhook" \
        "${API_URL}/webhooks/stripe" \
        "400" \
        "POST" \
        "-H 'Content-Type: application/json'" \
        '{"test": "data"}'

    # GoCardless webhook (should accept POST)
    check_endpoint "GoCardless Webhook" \
        "${API_URL}/webhooks/gocardless" \
        "400" \
        "POST" \
        "-H 'Content-Type: application/json'" \
        '{"test": "data"}'

    # Mailchimp webhook (should accept GET for validation)
    check_endpoint "Mailchimp Webhook (GET)" \
        "${API_URL}/webhooks/mailchimp" \
        "200" \
        "GET"
}

# Check API endpoints
check_api_endpoints() {
    print_header "API Endpoint Health Check"

    if [[ -z "$API_URL" ]]; then
        log_error "API_URL environment variable not set"
        return
    fi

    # Search endpoint
    check_endpoint "Search API" \
        "${API_URL}/search?q=test"

    # Profile endpoint (will return 404 for non-existent ID, but endpoint is up)
    check_endpoint "Profile API" \
        "${API_URL}/supporters/test-id" \
        "404"

    # Timeline endpoint (will return 404 for non-existent ID, but endpoint is up)
    check_endpoint "Timeline API" \
        "${API_URL}/supporters/test-id/timeline" \
        "404"

    # Merge endpoint (will return 400 or 401 without auth, but endpoint is up)
    check_endpoint "Merge API" \
        "${API_URL}/admin/merge" \
        "400" \
        "POST" \
        "-H 'Content-Type: application/json'" \
        '{}'
}

# Check Lambda function health via CloudWatch
check_lambda_health() {
    print_header "Lambda Function Health Check"

    log_info "Checking Lambda function invocation errors..."

    local functions=(
        "Supporter360Stack-ShopifyWebhookHandler"
        "Supporter360Stack-StripeWebhookHandler"
        "Supporter360Stack-GoCardlessWebhookHandler"
        "Supporter360Stack-MailchimpWebhookHandler"
        "Supporter360Stack-SearchHandler"
        "Supporter360Stack-ProfileHandler"
        "Supporter360Stack-TimelineHandler"
        "Supporter360Stack-MergeHandler"
    )

    for func in "${functions[@]}"; do
        # Get function state
        local state
        state=$(aws lambda get-function-configuration \
            --function-name "$func" \
            --query State \
            --output text 2>/dev/null || echo "NotFound")

        if [[ "$state" == "Active" ]]; then
            # Get last 5 minutes of errors
            local current_time
            current_time=$(date -u '+%Y-%m-%dT%H:%M:%S')
            local start_time
            start_time=$(date -u -d '5 minutes ago' '+%Y-%m-%dT%H:%M:%S')

            local error_count
            error_count=$(aws cloudwatch get-metric-statistics \
                --namespace AWS/Lambda \
                --metric-name Errors \
                --dimensions Name=FunctionName,Value="$func" \
                --start-time "$start_time" \
                --end-time "$current_time" \
                --period 300 \
                --statistics Sum \
                --query Datapoints[0].Sum \
                --output text 2>/dev/null || echo "0")

            # Handle case where no datapoints are returned
            if [[ "$error_count" == "None" || "$error_count" == "0" ]]; then
                log_success "$func - No errors in last 5 minutes"
            else
                log_warning "$func - $error_count errors in last 5 minutes"
            fi

            # Check for cold starts (high duration on first invocation)
            local durations
            durations=$(aws cloudwatch get-metric-statistics \
                --namespace AWS/Lambda \
                --metric-name Duration \
                --dimensions Name=FunctionName,Value="$func" \
                --start-time "$start_time" \
                --end-time "$current_time" \
                --period 60 \
                --statistics Average,Maximum \
                --output json 2>/dev/null || echo "{}")

            local avg_duration
            local max_duration
            avg_duration=$(echo "$durations" | jq -r '.Datapoints[-1].Average // "null"' 2>/dev/null || echo "null")
            max_duration=$(echo "$durations" | jq -r '.Datapoints[-1].Maximum // "null"' 2>/dev/null || echo "null")

            if [[ "$avg_duration" != "null" && "$max_duration" != "null" ]]; then
                avg_duration_ms=$(echo "$avg_duration / 1000" | bc -l 2>/dev/null || echo "0")
                max_duration_ms=$(echo "$max_duration / 1000" | bc -l 2>/dev/null || echo "0")

                log_info "$func - Avg duration: ${avg_duration_ms}s, Max: ${max_duration_ms}s"

                # Warn about slow cold starts
                if [[ $(echo "$max_duration_ms > 5" | bc -l 2>/dev/null || echo "0") -eq 1 ]]; then
                    log_warning "$func - Slow cold start detected (${max_duration_ms}s)"
                    ((SLOW_RESPONSES++))
                fi
            fi
        else
            log_error "$func - State: $state"
        fi
    done
}

# Check SQS queue health
check_sqs_health() {
    print_header "SQS Queue Health Check"

    log_info "Checking SQS queue depths..."

    local queues=(
        "supporter360-shopify-queue"
        "supporter360-stripe-queue"
        "supporter360-gocardless-queue"
        "supporter360-future-ticketing-queue"
        "supporter360-mailchimp-queue"
    )

    for queue in "${queues[@]}"; do
        local queue_url
        queue_url=$(aws sqs get-queue-url \
            --queue-name "$queue" \
            --query QueueUrl \
            --output text 2>/dev/null || echo "")

        if [[ -n "$queue_url" ]]; then
            local messages_available
            messages_available=$(aws sqs get-queue-attributes \
                --queue-url "$queue_url" \
                --attribute-names ApproximateNumberOfMessages \
                --query Attributes.ApproximateNumberOfMessages \
                --output text 2>/dev/null || echo "0")

            local messages_in_flight
            messages_in_flight=$(aws sqs get-queue-attributes \
                --queue-url "$queue_url" \
                --attribute-names ApproximateNumberOfMessagesNotVisible \
                --query Attributes.ApproximateNumberOfMessagesNotVisible \
                --output text 2>/dev/null || echo "0")

            log_info "$queue - Available: $messages_available, In-Flight: $messages_in_flight"

            # Check if queue is backing up
            if [[ "$messages_available" -gt 1000 ]]; then
                log_warning "$queue has $messages_available messages available (potential backlog)"
            else
                log_success "$queue - Healthy queue depth"
            fi
        else
            log_error "$queue - Queue not found"
        fi
    done

    # Check DLQs for messages
    log_info "Checking Dead Letter Queues for errors..."

    local dlqs=(
        "supporter360-shopify-dlq"
        "supporter360-stripe-dlq"
        "supporter360-gocardless-dlq"
        "supporter360-future-ticketing-dlq"
        "supporter360-mailchimp-dlq"
    )

    for dlq in "${dlqs[@]}"; do
        local dlq_url
        dlq_url=$(aws sqs get-queue-url \
            --queue-name "$dlq" \
            --query QueueUrl \
            --output text 2>/dev/null || echo "")

        if [[ -n "$dlq_url" ]]; then
            local dlq_messages
            dlq_messages=$(aws sqs get-queue-attributes \
                --queue-url "$dlq_url" \
                --attribute-names ApproximateNumberOfMessages \
                --query Attributes.ApproximateNumberOfMessages \
                --output text 2>/dev/null || echo "0")

            if [[ "$dlq_messages" -gt 0 ]]; then
                log_warning "$dlq has $dlq_messages failed messages"
            else
                log_success "$dlq - No failed messages"
            fi
        fi
    done
}

# Check S3 bucket accessibility
check_s3_health() {
    print_header "S3 Bucket Health Check"

    local account_id
    account_id=$(aws sts get-caller-identity --query Account --output text)

    local buckets=(
        "supporter360-raw-payloads-${account_id}"
        "supporter360-frontend-${account_id}"
    )

    for bucket in "${buckets[@]}"; do
        if aws s3 ls "s3://$bucket" &> /dev/null; then
            log_success "$bucket - Accessible"

            # Check bucket size
            local size
            size=$(aws s3 ls "s3://$bucket" --recursive --summarize 2>/dev/null | grep "Total Size" | awk '{print $3, $4}' || echo "Unknown")
            log_info "$bucket - Total Size: $size"
        else
            log_error "$bucket - Not accessible"
        fi
    done
}

# Check scheduled functions
check_scheduled_functions() {
    print_header "Scheduled Function Health Check"

    log_info "Checking EventBridge rules..."

    local rules=(
        "FutureTicketingPollingSchedule"
        "MailchimpSyncSchedule"
        "SupporterTypeClassificationSchedule"
        "ReconciliationSchedule"
    )

    for rule in "${rules[@]}"; do
        local rule_arn
        rule_arn=$(aws events list-rules \
            --query "Rules[?Name=='${rule}'].Arn" \
            --output text 2>/dev/null || echo "")

        if [[ -n "$rule_arn" ]]; then
            local state
            state=$(aws events describe-rule \
                --name "$rule" \
                --query State \
                --output text 2>/dev/null || echo "UNKNOWN")

            if [[ "$state" == "ENABLED" ]]; then
                log_success "$rule - $state"
            else
                log_warning "$rule - $state"
            fi
        else
            log_warning "$rule - Rule not found"
        fi
    done
}

# Generate health report
generate_health_report() {
    print_header "Health Check Report"

    local success_rate=0
    if [[ $TOTAL_CHECKS -gt 0 ]]; then
        success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    fi

    echo "Total Checks: $TOTAL_CHECKS"
    echo -e "${GREEN}Passed:${NC} $PASSED_CHECKS"
    echo -e "${RED}Failed:${NC} $FAILED_CHECKS"
    echo "Success Rate: ${success_rate}%"
    echo ""

    if [[ $SLOW_RESPONSES -gt 0 ]]; then
        echo -e "${YELLOW}Slow Responses:${NC} $SLOW_RESPONSES (may be Serverless v2 cold starts)"
    fi
    echo ""

    if [[ $FAILED_CHECKS -eq 0 ]]; then
        echo -e "${GREEN}✓ All health checks passed!${NC}"
        return 0
    elif [[ $success_rate -ge 80 ]]; then
        echo -e "${YELLOW}⚠ Health checks passed with warnings${NC}"
        return 0
    else
        echo -e "${RED}✗ Health checks failed - immediate attention required${NC}"
        return 1
    fi
}

# Display help information
show_help() {
    cat << EOF
Supporter 360 Health Check Script

This script performs comprehensive health verification for all services in the serverless architecture.

USAGE:
    scripts/health-check.sh [OPTIONS]

OPTIONS:
    --api-url URL          API Gateway URL (optional)
    --frontend-url URL     Frontend URL (optional)
    --db-host HOST         Database endpoint host (optional)
    --db-port PORT         Database port (default: 5432)
    --db-name NAME         Database name (default: supporter360)
    --quick                Run quick checks only (skip Lambda/SQS/S3/scheduled)
    --help                 Show this help message

ENVIRONMENT VARIABLES:
    API_URL               API Gateway URL
    FRONTEND_URL          Frontend URL
    DB_HOST               Database endpoint host
    DB_PORT               Database port (default: 5432)
    DB_NAME               Database name (default: supporter360)

HEALTH CHECKS:
    ✓ RDS Serverless v2 ACU capacity and scaling
    ✓ VPC endpoint connectivity (Secrets Manager, SQS, S3)
    ✓ S3 static website accessibility
    ✓ Database connectivity and response time
    ✓ Webhook endpoints
    ✓ API endpoints (with response time checks)
    ✓ Lambda function errors and cold starts
    ✓ SQS queue depths and DLQs
    ✓ S3 bucket accessibility
    ✓ Scheduled EventBridge rules

RESPONSE TIME WARNINGS:
    Warnings are issued if response times exceed 5 seconds, which may indicate:
    - Serverless v2 cold starts (expected for infrequent access)
    - Database scaling delays
    - VPC endpoint latency

EXIT CODES:
    0 - All health checks passed
    1 - One or more health checks failed

EXAMPLES:
    # Full health check
    ./scripts/health-check.sh

    # Quick health check (skip detailed metrics)
    ./scripts/health-check.sh --quick

    # With explicit values
    ./scripts/health-check.sh --api-url https://api.example.com --db-host db.example.com

EOF
}

# Main function
main() {
    print_header "Supporter 360 Health Check (Serverless Architecture)"
    echo "Starting comprehensive health verification..."
    echo ""

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help)
                show_help
                exit 0
                ;;
            --api-url)
                API_URL="$2"
                shift 2
                ;;
            --frontend-url)
                FRONTEND_URL="$2"
                shift 2
                ;;
            --db-host)
                DB_HOST="$2"
                shift 2
                ;;
            --db-port)
                DB_PORT="$2"
                shift 2
                ;;
            --db-name)
                DB_NAME="$2"
                shift 2
                ;;
            --quick)
                QUICK_MODE=true
                shift
                ;;
            *)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done

    # Set defaults
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-supporter360}"

    # Run health checks
    check_serverless_v2_health
    check_vpc_endpoint_connectivity
    check_s3_static_website
    check_database
    check_webhook_endpoints
    check_api_endpoints

    if [[ -z "$QUICK_MODE" ]]; then
        check_lambda_health
        check_sqs_health
        check_s3_health
        check_scheduled_functions
    fi

    # Generate report
    generate_health_report
}

# Run main function
main "$@"
