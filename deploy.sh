#!/bin/bash

set -e

# Supporter 360 Deployment Script
# This script deploys the entire Supporter 360 stack to AWS

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SKIP_TESTS=false
SKIP_SECRETS_POPULATION=false
DRY_RUN=false

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-secrets)
                SKIP_SECRETS_POPULATION=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-tests       Skip running tests before deployment"
                echo "  --skip-secrets     Skip secrets population prompt"
                echo "  --dry-run          Show deployment steps without executing"
                echo "  --help             Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use --help to see available options"
                exit 1
                ;;
        esac
    done
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check if Node.js is installed
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_success "Node.js is installed: $NODE_VERSION"
    else
        log_error "Node.js is not installed"
        exit 1
    fi

    # Check if npm is installed
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_success "npm is installed: $NPM_VERSION"
    else
        log_error "npm is not installed"
        exit 1
    fi

    # Check if AWS CLI is installed
    if command -v aws &> /dev/null; then
        AWS_VERSION=$(aws --version)
        log_success "AWS CLI is installed: $AWS_VERSION"
    else
        log_error "AWS CLI is not installed"
        exit 1
    fi

    # Check AWS credentials
    if aws sts get-caller-identity &> /dev/null; then
        AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
        AWS_USER=$(aws sts get-caller-identity --query Arn --output text)
        log_success "AWS credentials configured for account: $AWS_ACCOUNT"
        log_info "Authenticated as: $AWS_USER"
    else
        log_error "AWS credentials not configured. Run 'aws configure' first."
        exit 1
    fi

    # Check if CDK is installed
    if npx cdk --version &> /dev/null; then
        CDK_VERSION=$(npx cdk --version)
        log_success "AWS CDK is installed: $CDK_VERSION"
    else
        log_error "AWS CDK is not installed"
        exit 1
    fi

    # Check if required environment variables are set
    if [[ -z "$AWS_REGION" ]]; then
        log_warning "AWS_REGION not set, using default region"
        AWS_REGION=$(aws configure get region || echo "us-east-1")
        log_info "Using region: $AWS_REGION"
    fi
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log_warning "Skipping tests (--skip-tests flag provided)"
        return
    fi

    print_header "Running Tests"

    log_info "Running backend tests..."
    cd packages/backend
    if npm test; then
        log_success "Backend tests passed"
    else
        log_error "Backend tests failed"
        exit 1
    fi
    cd ../..

    log_info "Running infrastructure tests..."
    cd packages/infrastructure
    if npm test; then
        log_success "Infrastructure tests passed"
    else
        log_error "Infrastructure tests failed"
        exit 1
    fi
    cd ../..
}

# Bootstrap CDK if needed
bootstrap_cdk() {
    print_header "Bootstrapping CDK"

    log_info "Checking if CDK is bootstrapped in region $AWS_REGION..."

    if npx cdk bootstrap "aws://${AWS_ACCOUNT}/${AWS_REGION}" --region "$AWS_REGION" 2>&1 | grep -q "already bootstrapped"; then
        log_success "CDK is already bootstrapped"
    else
        log_info "Bootstrapping CDK..."
        npx cdk bootstrap "aws://${AWS_ACCOUNT}/${AWS_REGION}"
        log_success "CDK bootstrapped successfully"
    fi
}

# Populate secrets if needed
populate_secrets() {
    if [[ "$SKIP_SECRETS_POPULATION" == true ]]; then
        log_warning "Skipping secrets population (--skip-secrets flag provided)"
        return
    fi

    print_header "AWS Secrets Setup"

    # Check if secrets already exist
    local secrets_exist=true
    local secrets=("shopify" "stripe" "gocardless" "mailchimp" "future-ticketing")

    for secret in "${secrets[@]}"; do
        if ! aws secretsmanager describe-secret --secret-id "supporter360/${secret}" &> /dev/null; then
            secrets_exist=false
            break
        fi
    done

    if [[ "$secrets_exist" == true ]]; then
        log_success "All required secrets already exist in AWS Secrets Manager"
        return
    fi

    log_warning "Some secrets are missing from AWS Secrets Manager"
    log_info "You can populate secrets using: ./scripts/populate-secrets.sh"
    log_info "Or create them manually in the AWS Console"

    read -p "Do you want to populate secrets now? (y/N) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [[ -f "./scripts/populate-secrets.sh" ]]; then
            bash ./scripts/populate-secrets.sh
        else
            log_error "populate-secrets.sh not found"
            log_info "Please populate secrets manually before deployment"
            exit 1
        fi
    else
        log_warning "Skipping secrets population"
        log_info "Note: Deployment may fail if required secrets are missing"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Build packages
build_packages() {
    print_header "Building Packages"

    log_info "Installing root dependencies..."
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] npm install"
    else
        npm install
    fi

    log_info "Building shared package..."
    cd packages/shared
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] npm run build"
    else
        npm run build
    fi
    cd ../..

    log_info "Building backend package..."
    cd packages/backend
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] npm run build"
    else
        npm run build
    fi
    cd ../..

    log_info "Building infrastructure package..."
    cd packages/infrastructure
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] npm run build"
    else
        npm run build
    fi
    cd ../..

    log_success "All packages built successfully"
}

# Deploy infrastructure
deploy_infrastructure() {
    print_header "Deploying AWS Infrastructure"

    cd packages/infrastructure

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] npx cdk deploy --require-approval never"
        cd ../..
        return
    fi

    log_info "Deploying AWS CDK stack..."
    log_warning "This will create/modify AWS resources in account $AWS_ACCOUNT"

    # Capture CDK outputs
    npx cdk deploy --require-approval never 2>&1 | tee /tmp/cdk-deploy.log

    # Extract outputs
    API_URL=$(grep "ApiUrl = " /tmp/cdk-deploy.log | awk '{print $3}' || echo "")
    DB_ENDPOINT=$(grep "DatabaseEndpoint = " /tmp/cdk-deploy.log | awk '{print $3}' || echo "")
    FRONTEND_URL=$(grep "FrontendUrl = " /tmp/cdk-deploy.log | awk '{print $3}' || echo "")

    cd ../..

    log_success "Infrastructure deployed successfully"
}

# Run database migrations
run_migrations() {
    print_header "Running Database Migrations"

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Database migrations would be run here"
        return
    fi

    log_info "Invoking database migration Lambda function..."

    # Get migration function name
    local migration_function
    migration_function=$(aws lambda list-functions \
        --query "Functions[?contains(FunctionName, 'DbMigration')].FunctionName" \
        --output text 2>/dev/null || echo "")

    if [[ -z "$migration_function" ]]; then
        log_error "Could not find database migration function"
        return
    fi

    log_info "Migration function: $migration_function"

    # Invoke migration function
    local response
    response=$(aws lambda invoke \
        --function-name "$migration_function" \
        --payload '{}' \
        /tmp/migration-response.json 2>&1)

    if [[ $? -eq 0 ]]; then
        log_success "Database migrations completed"
    else
        log_warning "Migration invocation failed or returned errors"
        log_info "Check Lambda logs for details"
    fi
}

# Run post-deployment validation
run_validation() {
    print_header "Post-Deployment Validation"

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Validation would be run here"
        return
    fi

    log_info "Running health checks..."

    if [[ -f "./scripts/health-check.sh" ]]; then
        log_info "Running health check script..."
        bash ./scripts/health-check.sh --quick || log_warning "Health check completed with warnings"
    else
        log_warning "Health check script not found"
    fi

    log_info "Running deployment validation..."
    if [[ -f "./scripts/validate-deployment.sh" ]]; then
        bash ./scripts/validate-deployment.sh || log_warning "Validation completed with warnings"
    else
        log_warning "Validation script not found"
    fi
}

# Print deployment summary
print_summary() {
    print_header "Deployment Summary"

    log_success "Supporter 360 deployed successfully!"
    echo ""

    if [[ -n "$API_URL" ]]; then
        log_info "API Gateway URL: $API_URL"
    fi

    if [[ -n "$DB_ENDPOINT" ]]; then
        log_info "Database Endpoint: $DB_ENDPOINT"
    fi

    if [[ -n "$FRONTEND_URL" ]]; then
        log_info "Frontend URL: $FRONTEND_URL"
    fi

    echo ""
    log_info "Next Steps:"
    echo "  1. Run health checks: ./scripts/health-check.sh"
    echo "  2. Run full validation: ./scripts/validate-deployment.sh"
    echo "  3. Configure webhook URLs in external services:"
    echo "     - Shopify: ${API_URL}/webhooks/shopify"
    echo "     - Stripe: ${API_URL}/webhooks/stripe"
    echo "     - GoCardless: ${API_URL}/webhooks/gocardless"
    echo "     - Mailchimp: ${API_URL}/webhooks/mailchimp"
    echo "  4. Deploy frontend to S3: npm run deploy:frontend"
    echo ""
    log_info "Documentation: See docs/deployment.md for detailed information"
}

# Main deployment flow
main() {
    print_header "Supporter 360 Deployment"
    echo "This script will deploy the entire Supporter 360 stack"
    echo ""

    parse_args "$@"
    check_prerequisites
    run_tests
    bootstrap_cdk
    populate_secrets
    build_packages
    deploy_infrastructure
    run_migrations
    run_validation
    print_summary
}

# Run main function
main "$@"
