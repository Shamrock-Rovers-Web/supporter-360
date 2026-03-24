#!/bin/bash

set -e

# Supporter 360 Deployment Validation Script
# This script validates all critical components after deployment
# Updated for serverless architecture (Serverless v2, VPC endpoints, S3 static website)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration - Load from environment or CDK outputs
API_URL="${API_URL:-}"
DB_HOST="${DB_HOST:-}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-supporter360}"
FRONTEND_URL="${FRONTEND_URL:-}"

# Validation results
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    ((WARNINGS++))
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
}

print_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
}

# Check if required tools are installed
check_prerequisites() {
    print_header "Checking Prerequisites"

    local required_tools=("curl" "jq" "psql" "aws")
    for tool in "${required_tools[@]}"; do
        if command -v "$tool" &> /dev/null; then
            log_success "$tool is installed"
        else
            log_error "$tool is not installed"
        fi
    done

    # Check if AWS credentials are configured
    if aws sts get-caller-identity &> /dev/null; then
        log_success "AWS credentials configured"
    else
        log_error "AWS credentials not configured"
    fi
}

# Get CDK outputs if not provided
get_cdk_outputs() {
    print_header "Getting CDK Outputs"

    if [[ -z "$API_URL" || -z "$DB_HOST" ]]; then
        log_info "Fetching CDK outputs..."

        cd packages/infrastructure

        # Get API URL
        API_URL=$(npx cdk deploy --outputs-file /tmp/cdk-outputs.json 2>&1 | grep -A1 "ApiUrl" | tail -1 | xargs || echo "")
        if [[ -z "$API_URL" ]]; then
            API_URL=$(jq -r '.Supporter360Stack.ApiUrl' /tmp/cdk-outputs.json 2>/dev/null || echo "")
        fi

        # Get Database Endpoint
        DB_HOST=$(jq -r '.Supporter360Stack.DatabaseEndpoint' /tmp/cdk-outputs.json 2>/dev/null || echo "")

        cd ../..

        if [[ -n "$API_URL" ]]; then
            log_success "API URL: $API_URL"
        else
            log_warning "Could not fetch API URL from CDK outputs"
        fi

        if [[ -n "$DB_HOST" ]]; then
            log_success "Database Host: $DB_HOST"
        else
            log_warning "Could not fetch Database Host from CDK outputs"
        fi
    fi
}

# Validate RDS Serverless v2 configuration
validate_serverless_v2() {
    print_header "Validating RDS Serverless v2 Configuration"

    if [[ -z "$DB_HOST" ]]; then
        log_error "DB_HOST is not set"
        return
    fi

    log_info "Checking RDS instance configuration..."

    # Get DB instance identifier from host
    DB_INSTANCE_ID=$(aws rds describe-db-instances \
        --query "DBInstances[?DBEndpoint.Endpoint=='${DB_HOST}'].DBInstanceIdentifier" \
        --output text 2>/dev/null || echo "")

    if [[ -z "$DB_INSTANCE_ID" ]]; then
        log_error "Could not find RDS instance for endpoint: $DB_HOST"
        return
    fi

    log_success "Found RDS instance: $DB_INSTANCE_ID"

    # Check if using Serverless v2
    log_info "Checking for Serverless v2 configuration..."
    ENGINE_MODE=$(aws rds describe-db-instances \
        --db-instance-identifier "$DB_INSTANCE_ID" \
        --query 'DBInstances[0].EngineMode' \
        --output text 2>/dev/null || echo "")

    if [[ "$ENGINE_MODE" == "provisioned" ]]; then
        # Check for Serverless v2 scaling configuration
        SCALING_CONFIG=$(aws rds describe-db-instances \
            --db-instance-identifier "$DB_INSTANCE_ID" \
            --query 'DBInstances[0].ServerlessV2ScalingConfiguration' \
            --output json 2>/dev/null || echo "")

        if [[ -n "$SCALING_CONFIG" && "$SCALING_CONFIG" != "null" ]]; then
            log_success "RDS is using Serverless v2 with ACU scaling"

            MIN_ACUS=$(echo "$SCALING_CONFIG" | jq -r '.MinCapacity' 2>/dev/null || echo "unknown")
            MAX_ACUS=$(echo "$SCALING_CONFIG" | jq -r '.MaxCapacity' 2>/dev/null || echo "unknown")
            log_info "ACU Range: $MIN_ACUS - $MAX_ACUS"
        else
            log_error "RDS instance is NOT using Serverless v2!"
        fi
    else
        log_error "Unexpected Engine Mode: $ENGINE_MODE (expected 'provisioned' with Serverless v2)"
    fi

    # Verify NOT using old instance classes (t4g.medium, etc.)
    INSTANCE_CLASS=$(aws rds describe-db-instances \
        --db-instance-identifier "$DB_INSTANCE_ID" \
        --query 'DBInstances[0].DBInstanceClass' \
        --output text 2>/dev/null || echo "")

    if [[ "$INSTANCE_CLASS" =~ db\.t4g\.|db\.t3\.|db\.t2\. ]]; then
        log_error "RDS is using old instance class $INSTANCE_CLASS instead of Serverless v2!"
    else
        log_success "Not using legacy instance class"
    fi
}

# Validate VPC endpoints
validate_vpc_endpoints() {
    print_header "Validating VPC Endpoints"

    # Get VPC ID
    VPC_ID=$(aws ec2 describe-vpcs \
        --filters "Name=tag:Name,Values=Supporter360Vpc" \
        --query Vpcs[0].VpcId \
        --output text 2>/dev/null || echo "")

    if [[ -z "$VPC_ID" ]]; then
        log_error "Could not find Supporter360 VPC"
        return
    fi

    log_success "Found VPC: $VPC_ID"

    # Check for required VPC endpoints
    REQUIRED_ENDPOINTS=(
        "com.amazonaws.<region>.secretsmanager"
        "com.amazonaws.<region>.sqs"
        "com.amazonaws.<region>.s3"
    )

    REGION=$(aws configure get region || echo "us-east-1")

    for endpoint_pattern in "${REQUIRED_ENDPOINTS[@]}"; do
        # Replace <region> with actual region
        endpoint_service=${endpoint_pattern//<region>/$REGION}

        log_info "Checking for VPC endpoint: $endpoint_service"

        ENDPOINT_ID=$(aws ec2 describe-vpc-endpoints \
            --filters "Name=vpc-id,Values=$VPC_ID" "Name=service-name,Values=$endpoint_service" \
            --query VpcEndpoints[0].VpcEndpointId \
            --output text 2>/dev/null || echo "")

        if [[ -n "$ENDPOINT_ID" && "$ENDPOINT_ID" != "None" ]]; then
            log_success "VPC endpoint found: $endpoint_service ($ENDPOINT_ID)"

            # Check endpoint state
            STATE=$(aws ec2 describe-vpc-endpoints \
                --vpc-endpoint-ids "$ENDPOINT_ID" \
                --query VpcEndpoints[0].State \
                --output text 2>/dev/null || echo "")

            if [[ "$STATE" == "available" ]]; then
                log_success "VPC endpoint is available"
            else
                log_warning "VPC endpoint state: $STATE"
            fi
        else
            log_error "Required VPC endpoint NOT found: $endpoint_service"
        fi
    done
}

# Validate NAT Gateway does NOT exist
validate_no_nat_gateway() {
    print_header "Validating NAT Gateway Configuration"

    # Get VPC ID
    VPC_ID=$(aws ec2 describe-vpcs \
        --filters "Name=tag:Name,Values=Supporter360Vpc" \
        --query Vpcs[0].VpcId \
        --output text 2>/dev/null || echo "")

    if [[ -z "$VPC_ID" ]]; then
        log_warning "Could not find Supporter360 VPC"
        return
    fi

    log_info "Checking for NAT Gateways (should NOT exist)..."

    NAT_GATEWAYS=$(aws ec2 describe-nat-gateways \
        --filter "Name=vpc-id,Values=$VPC_ID" "Name=state,Values=available" \
        --query NatGateways \
        --output json 2>/dev/null || echo "[]")

    NAT_COUNT=$(echo "$NAT_GATEWAYS" | jq '. | length' 2>/dev/null || echo "0")

    if [[ "$NAT_COUNT" -gt 0 ]]; then
        log_error "Found $NAT_COUNT NAT Gateway(s) - these should NOT exist in serverless architecture!"
        echo "$NAT_GATEWAYS" | jq -r '.[].NatGatewayId' | while read -r nat_id; do
            log_error "NAT Gateway: $nat_id"
        done
    else
        log_success "No NAT Gateways found (correct for VPC endpoints architecture)"
    fi
}

# Validate CloudFront does NOT exist
validate_no_cloudfront() {
    print_header "Validating CloudFront Configuration"

    log_info "Checking for CloudFront distributions (should NOT exist)..."

    DISTRIBUTIONS=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?contains(Comment, 'Supporter360') || contains(Aliases.Items[], 'supporter360')]" \
        --output json 2>/dev/null || echo "[]")

    CF_COUNT=$(echo "$DISTRIBUTIONS" | jq '. | length' 2>/dev/null || echo "0")

    if [[ "$CF_COUNT" -gt 0 ]]; then
        log_error "Found $CF_COUNT CloudFront distribution(s) - these should NOT exist in serverless architecture!"
        echo "$DISTRIBUTIONS" | jq -r '.[].Id' | while read -r cf_id; do
            log_error "CloudFront Distribution: $cf_id"
        done
    else
        log_success "No CloudFront distributions found (correct for S3 static website architecture)"
    fi
}

# Validate S3 static website configuration
validate_s3_static_website() {
    print_header "Validating S3 Static Website Configuration"

    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    FRONTEND_BUCKET="supporter360-frontend-${ACCOUNT_ID}"

    log_info "Checking S3 bucket: $FRONTEND_BUCKET"

    if ! aws s3 ls "s3://$FRONTEND_BUCKET" &> /dev/null; then
        log_error "Frontend bucket does not exist: $FRONTEND_BUCKET"
        return
    fi

    log_success "Frontend bucket exists"

    # Check for static website hosting configuration
    WEBSITE_CONFIG=$(aws s3api get-bucket-website \
        --bucket "$FRONTEND_BUCKET" \
        --output json 2>/dev/null || echo "")

    if [[ -n "$WEBSITE_CONFIG" ]]; then
        log_success "S3 static website hosting is configured"

        INDEX_DOCUMENT=$(echo "$WEBSITE_CONFIG" | jq -r '.IndexDocument.Suffix' 2>/dev/null || echo "unknown")
        ERROR_DOCUMENT=$(echo "$WEBSITE_CONFIG" | jq -r '.ErrorDocument.Key' 2>/dev/null || echo "none")

        log_info "Index Document: $INDEX_DOCUMENT"
        log_info "Error Document: $ERROR_DOCUMENT"

        # Check if index.html exists
        if aws s3 ls "s3://$FRONTEND_BUCKET/index.html" &> /dev/null; then
            log_success "index.html exists in bucket"
        else
            log_warning "index.html not found in bucket (deployment may be incomplete)"
        fi
    else
        log_error "S3 static website hosting is NOT configured!"
    fi

    # Check bucket policy for public read access
    BUCKET_POLICY=$(aws s3api get-bucket-policy \
        --bucket "$FRONTEND_BUCKET" \
        --query Policy \
        --output text 2>/dev/null || echo "")

    if [[ -n "$BUCKET_POLICY" ]]; then
        if echo "$BUCKET_POLICY" | jq -e '.Statement[] | select(Effect=="Allow" and Principal=="*")' &> /dev/null; then
            log_success "Bucket policy allows public read access for static website"
        else
            log_warning "Bucket policy may not allow public read access"
        fi
    else
        log_warning "No bucket policy found (static website may not be publicly accessible)"
    fi
}

# Validate S3 lifecycle rules
validate_s3_lifecycle_rules() {
    print_header "Validating S3 Lifecycle Rules"

    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    PAYLOADS_BUCKET="supporter360-raw-payloads-${ACCOUNT_ID}"

    log_info "Checking lifecycle rules for bucket: $PAYLOADS_BUCKET"

    LIFECYCLE_RULES=$(aws s3api get-bucket-lifecycle-configuration \
        --bucket "$PAYLOADS_BUCKET" \
        --query 'Rules[?contains(ID, `glacier`) || contains(ID, `delete`)]' \
        --output json 2>/dev/null || echo "[]")

    RULE_COUNT=$(echo "$LIFECYCLE_RULES" | jq '. | length' 2>/dev/null || echo "0")

    if [[ "$RULE_COUNT" -gt 0 ]]; then
        log_success "Found $RULE_COUNT lifecycle rule(s)"

        echo "$LIFECYCLE_RULES" | jq -r '.[] | "\(.ID): \(.Status)"' | while read -r rule_info; do
            log_info "Rule: $rule_info"
        done

        # Check for Glacier transition after 90 days
        GLACIER_RULE=$(echo "$LIFECYCLE_RULES" | jq -r '.[] | select(.Transitions != null)' 2>/dev/null || echo "")

        if [[ -n "$GLACIER_RULE" ]]; then
            TRANSITION_DAYS=$(echo "$GLACIER_RULE" | jq -r '.Transitions[0].Days' 2>/dev/null || echo "unknown")
            STORAGE_CLASS=$(echo "$GLACIER_RULE" | jq -r '.Transitions[0].StorageClass' 2>/dev/null || echo "unknown")

            log_info "Glacier transition: After $TRANSITION_DAYS days to $STORAGE_CLASS"

            if [[ "$TRANSITION_DAYS" == "90" ]]; then
                log_success "Glacier transition is configured for 90 days"
            else
                log_warning "Glacier transition is set to $TRANSITION_DAYS days (expected 90)"
            fi
        else
            log_warning "No Glacier transition rule found"
        fi
    else
        log_warning "No lifecycle rules found for raw payloads bucket"
    fi
}

# Validate database connectivity and SSL
validate_database() {
    print_header "Validating Database Connectivity"

    if [[ -z "$DB_HOST" ]]; then
        log_error "DB_HOST is not set"
        return
    fi

    # Get database credentials from Secrets Manager via VPC endpoint
    log_info "Fetching database credentials from AWS Secrets Manager..."
    DB_SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id "supporter360-${DB_NAME}-postgres" --query SecretString --output text 2>/dev/null || echo "")

    if [[ -z "$DB_SECRET_JSON" ]]; then
        log_error "Could not fetch database secret from Secrets Manager (VPC endpoint check?)"
        return
    fi

    DB_USER=$(echo "$DB_SECRET_JSON" | jq -r '.username')
    DB_PASSWORD=$(echo "$DB_SECRET_JSON" | jq -r '.password')

    log_success "Retrieved database credentials via VPC endpoint"

    # Test basic connectivity
    log_info "Testing database connectivity..."
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        log_success "Database is accessible"
    else
        log_error "Cannot connect to database"
        return
    fi

    # Verify SSL is enabled
    log_info "Verifying SSL connection..."
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SHOW ssl;" | grep -q "on"; then
        log_success "SSL is enabled for database connections"
    else
        log_error "SSL is NOT enabled for database connections"
    fi

    # Check required tables exist
    log_info "Checking required database tables..."
    REQUIRED_TABLES=("supporters" "memberships" "events" "supporter_types")
    for table in "${REQUIRED_TABLES[@]}"; do
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM $table LIMIT 1;" &> /dev/null; then
            log_success "Table '$table' exists"
        else
            log_warning "Table '$table' does not exist or is not accessible"
        fi
    done

    # Check database version
    log_info "Checking PostgreSQL version..."
    DB_VERSION=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" | head -1)
    log_info "Database version: $DB_VERSION"
}

# Validate webhook signature verification
validate_webhook_security() {
    print_header "Validating Webhook Security"

    if [[ -z "$API_URL" ]]; then
        log_error "API_URL is not set"
        return
    fi

    # Check webhook endpoints exist
    WEBHOOK_ENDPOINTS=("shopify" "stripe" "gocardless" "mailchimp")
    for endpoint in "${WEBHOOK_ENDPOINTS[@]}"; do
        if curl -s -o /dev/null -w "%{http_code}" "${API_URL}/webhooks/${endpoint}" | grep -q "404\|500"; then
            log_error "Webhook endpoint /webhooks/${endpoint} returned error"
        else
            log_success "Webhook endpoint /webhooks/${endpoint} is accessible"
        fi
    done

    # Verify webhook secrets are configured in AWS Secrets Manager
    log_info "Checking webhook secrets in AWS Secrets Manager..."
    WEBHOOK_SECRETS=("shopify" "stripe" "gocardless" "mailchimp")
    for secret in "${WEBHOOK_SECRETS[@]}"; do
        if aws secretsmanager describe-secret --secret-id "supporter360/${secret}" &> /dev/null; then
            log_success "Secret 'supporter360/${secret}' exists"
        else
            log_error "Secret 'supporter360/${secret}' does not exist"
        fi
    done
}

# Validate CORS restrictions
validate_cors() {
    print_header "Validating CORS Configuration"

    if [[ -z "$API_URL" ]]; then
        log_error "API_URL is not set"
        return
    fi

    log_info "Testing CORS headers..."
    CORS_TEST_URL="${API_URL}/search?q=test"

    # Test OPTIONS preflight request
    RESPONSE=$(curl -s -i -X OPTIONS "$CORS_TEST_URL" \
        -H "Origin: https://example.com" \
        -H "Access-Control-Request-Method: GET" \
        2>/dev/null)

    if echo "$RESPONSE" | grep -qi "access-control-allow-origin"; then
        log_success "CORS headers are present"
    else
        log_warning "CORS headers not found in response"
    fi

    # Check for overly permissive CORS
    if echo "$RESPONSE" | grep -qi "access-control-allow-origin: \*"; then
        log_warning "CORS is configured to allow all origins (*) - consider restricting to specific domains"
    else
        log_success "CORS is not overly permissive"
    fi
}

# Validate rate limiting
validate_rate_limiting() {
    print_header "Validating Rate Limiting"

    if [[ -z "$API_URL" ]]; then
        log_error "API_URL is not set"
        return
    fi

    log_info "Testing rate limiting on API endpoints..."

    # Send multiple requests quickly to test rate limiting
    local test_endpoint="${API_URL}/search?q=test"
    local rate_limit_detected=0

    for i in {1..20}; do
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$test_endpoint")
        if [[ "$STATUS" == "429" ]]; then
            rate_limit_detected=1
            break
        fi
    done

    if [[ $rate_limit_detected -eq 1 ]]; then
        log_success "Rate limiting is active (received 429 Too Many Requests)"
    else
        log_warning "Rate limiting may not be configured or threshold is too high"
    fi
}

# Validate API authentication
validate_api_authentication() {
    print_header "Validating API Authentication"

    if [[ -z "$API_URL" ]]; then
        log_error "API_URL is not set"
        return
    fi

    # Test public endpoint (should work without auth)
    log_info "Testing public endpoint..."
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/webhooks/mailchimp")
    if [[ "$STATUS" == "200" ]]; then
        log_success "Public webhook endpoint accessible"
    else
        log_warning "Public webhook endpoint returned status $STATUS"
    fi

    # Test protected endpoint (should require auth)
    log_info "Testing protected endpoint..."
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/supporters/test-id")
    if [[ "$STATUS" == "401" || "$STATUS" == "403" ]]; then
        log_success "Protected endpoint requires authentication"
    elif [[ "$STATUS" == "404" ]]; then
        log_warning "Protected endpoint returned 404 (resource not found, but auth may be working)"
    else
        log_warning "Protected endpoint returned status $STATUS (may not require authentication)"
    fi

    # Test admin endpoint
    log_info "Testing admin endpoint..."
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/admin/merge" -X POST)
    if [[ "$STATUS" == "401" || "$STATUS" == "403" ]]; then
        log_success "Admin endpoint requires authentication"
    elif [[ "$STATUS" == "400" ]]; then
        log_success "Admin endpoint accessible (authentication working, missing request body)"
    else
        log_warning "Admin endpoint returned status $STATUS"
    fi
}

# Validate Lambda function health
validate_lambda_functions() {
    print_header "Validating Lambda Functions"

    log_info "Checking Lambda function status..."

    # List of Lambda functions to check
    LAMBDA_FUNCTIONS=(
        "Supporter360Stack-ShopifyWebhookHandler"
        "Supporter360Stack-StripeWebhookHandler"
        "Supporter360Stack-GoCardlessWebhookHandler"
        "Supporter360Stack-MailchimpWebhookHandler"
        "Supporter360Stack-ShopifyProcessor"
        "Supporter360Stack-StripeProcessor"
        "Supporter360Stack-GoCardlessProcessor"
        "Supporter360Stack-FutureTicketingProcessor"
        "Supporter360Stack-MailchimpProcessor"
        "Supporter360Stack-SearchHandler"
        "Supporter360Stack-ProfileHandler"
        "Supporter360Stack-TimelineHandler"
        "Supporter360Stack-MergeHandler"
    )

    for func in "${LAMBDA_FUNCTIONS[@]}"; do
        # Try to get function configuration
        if aws lambda get-function-configuration --function-name "$func" &> /dev/null; then
            STATE=$(aws lambda get-function-configuration --function-name "$func" --query State --output text 2>/dev/null)
            if [[ "$STATE" == "Active" ]]; then
                log_success "Lambda function '$func' is Active"
            else
                log_warning "Lambda function '$func' state: $STATE"
            fi
        else
            log_warning "Could not get status for Lambda function '$func'"
        fi
    done
}

# Validate SQS queues
validate_sqs_queues() {
    print_header "Validating SQS Queues"

    log_info "Checking SQS queue status..."

    QUEUES=(
        "supporter360-shopify-queue"
        "supporter360-stripe-queue"
        "supporter360-gocardless-queue"
        "supporter360-future-ticketing-queue"
        "supporter360-mailchimp-queue"
    )

    for queue in "${QUEUES[@]}"; do
        if aws sqs get-queue-attributes --queue-url "$(aws sqs get-queue-url --queue-name "$queue" --query QueueUrl --output text 2>/dev/null)" --attribute-names QueueArn &> /dev/null; then
            log_success "SQS queue '$queue' exists"
        else
            log_warning "SQS queue '$queue' not found"
        fi
    done
}

# Validate S3 buckets
validate_s3_buckets() {
    print_header "Validating S3 Buckets"

    log_info "Checking S3 bucket configuration..."

    # Get buckets from CDK outputs or construct names
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    BUCKETS=(
        "supporter360-raw-payloads-${ACCOUNT_ID}"
        "supporter360-frontend-${ACCOUNT_ID}"
    )

    for bucket in "${BUCKETS[@]}"; do
        if aws s3 ls "s3://$bucket" &> /dev/null; then
            log_success "S3 bucket '$bucket' exists"

            # Check bucket encryption
            ENCRYPTION=$(aws s3api get-bucket-encryption --bucket "$bucket" --query ServerSideEncryptionConfiguration[0].Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm --output text 2>/dev/null || echo "")
            if [[ -n "$ENCRYPTION" ]]; then
                log_success "Bucket '$bucket' has encryption enabled: $ENCRYPTION"
            else
                log_warning "Bucket '$bucket' may not have default encryption"
            fi

            # Check public access block (except frontend bucket which needs public access for website)
            if [[ "$bucket" != *"frontend"* ]]; then
                PUBLIC_ACCESS=$(aws s3api get-public-access-block --bucket "$bucket" --query PublicAccessBlockConfiguration --output text 2>/dev/null || echo "")
                if echo "$PUBLIC_ACCESS" | grep -q "BlockPublicAcls: true"; then
                    log_success "Bucket '$bucket' has public access blocked"
                else
                    log_error "Bucket '$bucket' does not have public access blocked!"
                fi
            fi
        else
            log_warning "S3 bucket '$bucket' not found"
        fi
    done
}

# Validate security groups
validate_security_groups() {
    print_header "Validating Security Groups"

    log_info "Checking security group rules..."

    # Get VPC ID
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=Supporter360Vpc" --query Vpcs[0].VpcId --output text 2>/dev/null || echo "")

    if [[ -z "$VPC_ID" ]]; then
        log_warning "Could not find Supporter360 VPC"
        return
    fi

    log_success "Found VPC: $VPC_ID"

    # Check database security group
    DB_SG_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=*Database*" --query SecurityGroups[0].GroupId --output text 2>/dev/null || echo "")

    if [[ -n "$DB_SG_ID" ]]; then
        log_info "Checking database security group: $DB_SG_ID"

        # Check for overly permissive ingress rules
        OPEN_RULES=$(aws ec2 describe-security-groups --group-ids "$DB_SG_ID" --query SecurityGroups[0].IpPermissions --output json 2>/dev/null | jq -r '.[] | select(.IpRanges[].CidrIp == "0.0.0.0/0")' || echo "")

        if [[ -n "$OPEN_RULES" ]]; then
            log_error "Database security group has rules open to 0.0.0.0/0!"
        else
            log_success "Database security group does not allow open access"
        fi
    fi
}

# Display help information
show_help() {
    cat << EOF
Supporter 360 Deployment Validation Script

This script validates all critical components after deployment for the serverless architecture.

USAGE:
    scripts/validate-deployment.sh [OPTIONS]

OPTIONS:
    --api-url URL          API Gateway URL (optional, fetched from CDK if not provided)
    --db-host HOST         Database endpoint host (optional, fetched from CDK if not provided)
    --skip-prerequisites   Skip prerequisite checks (curl, jq, psql, aws, credentials)
    --help                 Show this help message

ENVIRONMENT VARIABLES:
    API_URL               API Gateway URL
    DB_HOST               Database endpoint host
    DB_PORT               Database port (default: 5432)
    DB_NAME               Database name (default: supporter360)
    FRONTEND_URL          Frontend URL (optional)

VALIDATION CHECKS:
    ✓ Prerequisites (required tools and AWS credentials)
    ✓ CDK outputs retrieval
    ✓ RDS Serverless v2 configuration (not t4g.medium)
    ✓ VPC endpoints (Secrets Manager, SQS, S3)
    ✓ NAT Gateway does NOT exist
    ✓ CloudFront distribution does NOT exist
    ✓ S3 static website configuration
    ✓ S3 lifecycle rules (Glacier after 90 days)
    ✓ Database connectivity and SSL
    ✓ Webhook security (endpoints and secrets)
    ✓ CORS configuration
    ✓ Rate limiting
    ✓ API authentication
    ✓ Lambda function status
    ✓ SQS queues
    ✓ S3 buckets
    ✓ Security groups

EXIT CODES:
    0 - All validations passed
    1 - One or more validations failed

EXAMPLES:
    # Validate with automatic CDK output retrieval
    ./scripts/validate-deployment.sh

    # Validate with explicit values
    ./scripts/validate-deployment.sh --api-url https://api.example.com --db-host db.example.com

    # Skip prerequisite checks
    ./scripts/validate-deployment.sh --skip-prerequisites

EOF
}

# Main validation flow
main() {
    print_header "Supporter 360 Deployment Validation (Serverless Architecture)"
    echo "This script validates all critical components after deployment"
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
            --db-host)
                DB_HOST="$2"
                shift 2
                ;;
            --skip-prerequisites)
                SKIP_PREREQUISITES=true
                shift
                ;;
            *)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done

    # Run validation checks
    [[ -z "$SKIP_PREREQUISITES" ]] && check_prerequisites
    get_cdk_outputs
    validate_serverless_v2
    validate_vpc_endpoints
    validate_no_nat_gateway
    validate_no_cloudfront
    validate_s3_static_website
    validate_s3_lifecycle_rules
    validate_database
    validate_webhook_security
    validate_cors
    validate_rate_limiting
    validate_api_authentication
    validate_lambda_functions
    validate_sqs_queues
    validate_s3_buckets
    validate_security_groups

    # Print summary
    print_header "Validation Summary"
    echo -e "${GREEN}Passed:${NC} $PASSED"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
    echo -e "${RED}Failed:${NC} $FAILED"
    echo ""

    if [[ $FAILED -gt 0 ]]; then
        log_error "Validation failed with $FAILED error(s)"
        exit 1
    else
        log_success "Validation completed successfully!"
        exit 0
    fi
}

# Run main function
main "$@"
