#!/bin/bash

# Deploy API Gateway Usage Plan and Rate Limiting for Supporter 360
# This script creates a usage plan with throttle and quota settings,
# generates secure API keys, and stores them in the database.

set -euo pipefail

# Configuration
STACK_NAME="Supporter360StackV2"
API_NAME="Supporter 360 API"
USAGE_PLAN_NAME="Supporter360-Production"
THROTTLE_RATE_LIMIT=300
THROTTLE_BURST_LIMIT=100
QUOTA_LIMIT=10000
QUOTA_PERIOD="MONTH"
REGION="eu-west-1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    log_error "jq is not installed. Please install it first."
    exit 1
fi

log_info "Starting API Gateway usage plan deployment for ${STACK_NAME}..."

# Step 1: Get API Gateway ID
log_info "Step 1: Getting API Gateway ID..."
API_ID=$(aws apigateway get-rest-apis \
    --region "${REGION}" \
    --query "Items[?name=='${API_NAME}'].id" \
    --output text)

if [[ -z "${API_ID}" ]] || [[ "${API_ID}" == "None" ]]; then
    log_error "API Gateway '${API_NAME}' not found. Please deploy the stack first."
    exit 1
fi

log_info "Found API Gateway ID: ${API_ID}"

# Step 2: Create Usage Plan
log_info "Step 2: Creating usage plan..."
USAGE_PLAN_ID=$(aws apigateway create-usage-plan \
    --region "${REGION}" \
    --name "${USAGE_PLAN_NAME}" \
    --description "Production usage plan for Supporter 360 API with rate limiting" \
    --throttle "RateLimit=${THROTTLE_RATE_LIMIT},BurstLimit=${THROTTLE_BURST_LIMIT}" \
    --quota "Limit=${QUOTA_LIMIT},Period=${QUOTA_PERIOD}" \
    --query "id" \
    --output text)

log_info "Created usage plan: ${USAGE_PLAN_ID}"

# Step 3: Get API Gateway Stage
log_info "Step 3: Getting API Gateway stage..."
STAGE="prod"

# Associate API with usage plan
log_info "Step 4: Associating API with usage plan..."
aws apigateway create-usage-plan-key \
    --region "${REGION}" \
    --usage-plan-id "${USAGE_PLAN_ID}" \
    --key-id "${API_ID}" \
    --key-type APIGateway > /dev/null

log_info "Associated API ${API_ID} with usage plan ${USAGE_PLAN_ID}"

# Step 5: Generate secure API keys
log_info "Step 5: Generating secure API keys..."

# Function to generate secure random API key
generate_api_key() {
    openssl rand -hex 32
}

# Create production API keys
declare -A API_KEYS
API_KEYS["Production-Staff-Key"]="Production API key for staff access"
API_KEYS["Production-Admin-Key"]="Production API key for admin access"
API_KEYS["Production-Integration-Key"]="Production API key for third-party integrations"

API_KEY_IDS=()

for key_name in "${!API_KEYS[@]}"; do
    key_description="${API_KEYS[$key_name]}"
    key_value=$(generate_api_key)

    log_info "Creating API key: ${key_name}"

    # Create API key
    KEY_ID=$(aws apigateway create-api-key \
        --region "${REGION}" \
        --name "${key_name}" \
        --description "${key_description}" \
        --value "${key_value}" \
        --enabled \
        --stage-keys "restApiId=${API_ID},stage=${STAGE}" \
        --query "id" \
        --output text)

    API_KEY_IDS+=("${KEY_ID}")

    # Associate API key with usage plan
    aws apigateway create-usage-plan-key \
        --region "${REGION}" \
        --usage-plan-id "${USAGE_PLAN_ID}" \
        --key-id "${KEY_ID}" \
        --key-type API_KEY > /dev/null

    log_info "Created API key ${KEY_ID} and associated with usage plan"

    # Store API key securely (in production, this should go to a secrets manager)
    echo "${key_name}: ${key_value}" >> .api-keys.tmp
done

# Step 6: Display usage plan details
log_info "Step 6: Usage plan details..."
aws apigateway get-usage-plan \
    --region "${REGION}" \
    --usage-plan-id "${USAGE_PLAN_ID}"

# Step 7: Test API key (optional)
log_info "Step 7: API Gateway endpoint..."
API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}"
log_info "API URL: ${API_URL}"

# Step 8: Store API keys in database (if database is available)
log_info "Step 8: Storing API keys in database..."

# Get database credentials from Secrets Manager
DB_SECRET_ARN="arn:aws:secretsmanager:${REGION}:$(aws sts get-caller-identity --query Account --output text):secret:${STACK_NAME}-postgres"

# Check if database migration has been run
if aws secretsmanager describe-secret --secret-id "${STACK_NAME}-postgres" --region "${REGION}" &> /dev/null; then
    log_info "Database secret found. Attempting to store API keys..."

    # Get database credentials
    DB_CREDENTIALS=$(aws secretsmanager get-secret-value \
        --secret-id "${STACK_NAME}-postgres" \
        --region "${REGION}" \
        --query SecretString \
        --output text)

    DB_HOST=$(echo "${DB_CREDENTIALS}" | jq -r '.host')
    DB_USER=$(echo "${DB_CREDENTIALS}" | jq -r '.username')
    DB_PASS=$(echo "${DB_CREDENTIALS}" | jq -r '.password')
    DB_NAME="supporter360"

    # Check if we can connect to the database
    if PGPASSWORD="${DB_PASS}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1" &> /dev/null; then
        log_info "Database connection successful. Inserting API keys..."

        # Insert API keys into rate_limits table
        while IFS=': ' read -r key_name key_value; do
            log_info "Inserting ${key_name} into database..."

            PGPASSWORD="${DB_PASS}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" <<EOF
INSERT INTO rate_limits (api_key, key_name, rate_limit, burst_limit, quota_limit, quota_period, created_at, updated_at)
VALUES ('${key_value}', '${key_name}', ${THROTTLE_RATE_LIMIT}, ${THROTTLE_BURST_LIMIT}, ${QUOTA_LIMIT}, '${QUOTA_PERIOD}', NOW(), NOW())
ON CONFLICT (api_key) DO UPDATE SET
    key_name = EXCLUDED.key_name,
    rate_limit = EXCLUDED.rate_limit,
    burst_limit = EXCLUDED.burst_limit,
    quota_limit = EXCLUDED.quota_limit,
    quota_period = EXCLUDED.quota_period,
    updated_at = NOW();
EOF
        done < .api-keys.tmp

        log_info "API keys stored in database successfully."
    else
        log_warn "Could not connect to database. API keys not stored in database."
        log_warn "Please run database migrations first and then re-run this script."
    fi
else
    log_warn "Database secret not found. API keys not stored in database."
    log_warn "Please run database migrations first and then re-run this script."
fi

# Step 9: Display API keys (WARNING: In production, delete this file immediately)
log_info "Step 9: API keys generated..."
log_warn "API keys have been saved to .api-keys.tmp"
log_warn "IMPORTANT: Store these keys securely and delete .api-keys.tmp immediately!"
echo ""
cat .api-keys.tmp
echo ""

# Step 10: Test rate limiting (optional)
log_info "Step 10: Testing rate limiting..."
log_info "To test rate limiting, run:"
log_info "  curl -H 'X-API-Key: <your-api-key>' ${API_URL}/search?q=test"
log_info "  # Send many requests quickly to test throttling"

# Summary
log_info "Deployment complete!"
log_info "Summary:"
log_info "  - Usage Plan ID: ${USAGE_PLAN_ID}"
log_info "  - Throttle: Rate=${THROTTLE_RATE_LIMIT}, Burst=${THROTTLE_BURST_LIMIT}"
log_info "  - Quota: ${QUOTA_LIMIT} requests/${QUOTA_PERIOD}"
log_info "  - API Keys Created: ${#API_KEY_IDS[@]}"
log_info "  - API URL: ${API_URL}"
echo ""
log_warn "NEXT STEPS:"
log_warn "1. Store the API keys securely (e.g., in AWS Secrets Manager or 1Password)"
log_warn "2. Delete .api-keys.tmp file immediately"
log_warn "3. Test API endpoints with the API keys"
log_warn "4. Monitor usage in AWS Console: API Gateway > Usage Plans"
log_warn "5. Set up CloudWatch alarms for quota limits"

exit 0
