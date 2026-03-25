#!/bin/bash

# Integration Verification Script for Supporter 360
# Tests Lambda connectivity to database, VPC endpoints, and internet access

set -e

DB_ENDPOINT="supporter360stackv2-supporter360database3a977b01-z5jaoh3fhyvr.cluster-cmfwmmgu7sye.eu-west-1.rds.amazonaws.com"
VPC_ID="vpc-0ed010a4411bc5c92"

echo "================================================================================"
echo "Supporter 360 - Integration Verification"
echo "================================================================================"
echo ""

# Test 1: VPC Endpoints
echo "TEST 1: VPC Endpoints"
echo "--------------------------------------------------------------------------------"

# Check Secrets Manager endpoint
SECRETS_ENDPOINT=$(aws ec2 describe-vpc-endpoints \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=service-name,Values=com.amazonaws.eu-west-1.secretsmanager" \
  --query "VpcEndpoints[0].State" --output text 2>/dev/null || echo "not_found")

# Check SQS endpoint
SQS_ENDPOINT=$(aws ec2 describe-vpc-endpoints \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=service-name,Values=com.amazonaws.eu-west-1.sqs" \
  --query "VpcEndpoints[0].State" --output text 2>/dev/null || echo "not_found")

# Check S3 endpoint
S3_ENDPOINT=$(aws ec2 describe-vpc-endpoints \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=service-name,Values=com.amazonaws.eu-west-1.s3" \
  --query "VpcEndpoints[0].State" --output text 2>/dev/null || echo "not_found")

echo "Secrets Manager: $SECRETS_ENDPOINT"
echo "SQS: $SQS_ENDPOINT"
echo "S3: $S3_ENDPOINT"

if [ "$SECRETS_ENDPOINT" = "available" ] && [ "$SQS_ENDPOINT" = "available" ] && [ "$S3_ENDPOINT" = "available" ]; then
  echo "Status: ✓ PASS - All VPC endpoints available"
  VPC_ENDPOINTS_PASS="true"
else
  echo "Status: ✗ FAIL - Some VPC endpoints missing"
  VPC_ENDPOINTS_PASS="false"
fi
echo ""

# Test 2: Database Connectivity
echo "TEST 2: Database Connectivity"
echo "--------------------------------------------------------------------------------"

# Test if we can reach the database port
if timeout 5 nc -zv "$DB_ENDPOINT" 5432 2>&1 | grep -q "succeeded\|open"; then
  echo "Status: ✓ PASS - Database $DB_ENDPOINT:5432 is reachable"
  DB_PASS="true"
else
  echo "Status: ✗ FAIL - Database $DB_ENDPOINT:5432 is NOT reachable"
  echo "Note: This may be due to network restrictions from this location"
  DB_PASS="false"
fi
echo ""

# Test 3: Secrets Manager Access
echo "TEST 3: Secrets Manager Access"
echo "--------------------------------------------------------------------------------"

check_secret() {
  local secret_name=$1
  if aws secretsmanager describe-secret --secret-id "$secret_name" --query "Name" --output text >/dev/null 2>&1; then
    echo "  $secret_name: ✓ PASS"
    return 0
  else
    echo "  $secret_name: ✗ FAIL"
    return 1
  fi
}

SECRETS_PASS="true"
check_secret "supporter360/shopify" || SECRETS_PASS="false"
check_secret "supporter360/stripe" || SECRETS_PASS="false"
check_secret "supporter360/gocardless" || SECRETS_PASS="false"
check_secret "supporter360/future-ticketing" || SECRETS_PASS="false"
check_secret "supporter360/mailchimp" || SECRETS_PASS="false"

echo ""

# Test 4: Lambda Subnet Placement
echo "TEST 4: Lambda Subnet Placement"
echo "--------------------------------------------------------------------------------"

check_lambda_subnet() {
  local lambda_name=$1
  local expected_type=$2

  # Get subnet IDs
  local subnet_ids=$(aws lambda get-function-configuration --function-name "$lambda_name" \
    --query "VpcConfig.SubnetIds" --output json 2>/dev/null | jq -r '.[]' | tr '\n' ',' | sed 's/,$//')

  if [ -z "$subnet_ids" ] || [ "$subnet_ids" = "null" ]; then
    echo "  $lambda_name: ✗ FAIL - No VPC configuration"
    return 1
  fi

  # Get subnet details
  local subnet_type=$(aws ec2 describe-subnets --subnet-ids $(echo "$subnet_ids" | jq -r '.[]' | tr '\n' ' ') \
    --query "Subnets[0].Tags[?Key=='Name'].Value|[0]" --output text 2>/dev/null)

  local actual_type="UNKNOWN"
  if echo "$subnet_type" | grep -qi "public"; then
    actual_type="PUBLIC"
  elif echo "$subnet_type" | grep -qi "private"; then
    actual_type="PRIVATE_ISOLATED"
  fi

  if [ "$actual_type" = "$expected_type" ]; then
    echo "  $lambda_name: ✓ PASS - $actual_type ($subnet_type)"
    return 0
  else
    echo "  $lambda_name: ✗ FAIL - Expected $expected_type, found $actual_type ($subnet_type)"
    return 1
  fi
}

SUBNET_PASS="true"

# Processors (should be PRIVATE_ISOLATED except GoCardless which is PUBLIC)
check_lambda_subnet "Supporter360StackV2-ShopifyProcessor723136A0-hINnaeFpYh7v" "PRIVATE_ISOLATED" || SUBNET_PASS="false"
check_lambda_subnet "Supporter360StackV2-StripeProcessorEABC2EA0-DbbG1Lh89O8D" "PRIVATE_ISOLATED" || SUBNET_PASS="false"
check_lambda_subnet "Supporter360StackV2-GoCardlessProcessorEDE64209-liTWJCEuDM8S" "PUBLIC" || SUBNET_PASS="false"
check_lambda_subnet "Supporter360StackV2-FutureTicketingProcessor720971-Vnsdl4VookR1" "PRIVATE_ISOLATED" || SUBNET_PASS="false"
check_lambda_subnet "Supporter360StackV2-MailchimpProcessorF1F3CE1B-ZARnE37f3lzl" "PRIVATE_ISOLATED" || SUBNET_PASS="false"

# API Handlers (should be PRIVATE_ISOLATED)
check_lambda_subnet "Supporter360StackV2-SearchHandler00CE2B50-XO9n0HtQZIV9" "PRIVATE_ISOLATED" || SUBNET_PASS="false"
check_lambda_subnet "Supporter360StackV2-ProfileHandler493DBCF6-9taT6IjVyq77" "PRIVATE_ISOLATED" || SUBNET_PASS="false"
check_lambda_subnet "Supporter360StackV2-TimelineHandler911152F8-VQwP0fvYtJzy" "PRIVATE_ISOLATED" || SUBNET_PASS="false"
check_lambda_subnet "Supporter360StackV2-MergeHandler5C0DE479-XIt2t48V6GVY" "PRIVATE_ISOLATED" || SUBNET_PASS="false"

# Scheduled functions
check_lambda_subnet "Supporter360StackV2-MailchimpSyncerB1500334-PqJI8QqeyZw3" "PUBLIC" || SUBNET_PASS="false"
check_lambda_subnet "Supporter360StackV2-FutureTicketingPoller8CAD55B4-J4dgZpIuAwbv" "PRIVATE_ISOLATED" || SUBNET_PASS="false"

echo ""

# Test 5: Security Group Configuration
echo "TEST 5: Security Group Configuration"
echo "--------------------------------------------------------------------------------"

SG_ID="sg-0fd92d7534dfaac4b"

# Check if security group allows outbound traffic
SG_OUTBOUND=$(aws ec2 describe-security-groups --group-ids "$SG_ID" \
  --query "SecurityGroups[0].IpPermissionsEgress" --output json 2>/dev/null)

if echo "$SG_OUTBOUND" | jq -e '.[].IpRanges[-1]' >/dev/null 2>&1; then
  echo "  Lambda Security Group ($SG_ID): ✓ PASS - Allows outbound traffic"
  SG_PASS="true"
else
  echo "  Lambda Security Group ($SG_ID): ✗ FAIL - No outbound rules"
  SG_PASS="false"
fi

# Check if database security group allows Lambda access
DB_SG_ID=$(aws rds describe-db-clusters --db-cluster-identifier supporter360stackv2-supporter360database3a977b01-z5jaoh3fhyvr \
  --query "DBClusters[0].VpcSecurityGroups[0].VpcSecurityGroupId" --output text 2>/dev/null)

if [ -n "$DB_SG_ID" ] && [ "$DB_SG_ID" != "None" ]; then
  DB_INGRESS=$(aws ec2 describe-security-groups --group-ids "$DB_SG_ID" \
    --query "SecurityGroups[0].IpPermissions[?ToPort==\`5432\`].UserIdGroupPairs" --output json 2>/dev/null)

  if echo "$DB_INGRESS" | jq -e ".[] | select(.GroupId==\"$SG_ID\")" >/dev/null 2>&1; then
    echo "  Database Security Group ($DB_SG_ID): ✓ PASS - Allows Lambda access on port 5432"
    DB_SG_PASS="true"
  else
    echo "  Database Security Group ($DB_SG_ID): ✗ FAIL - Does not allow Lambda access"
    DB_SG_PASS="false"
  fi
else
  echo "  Database Security Group: ✗ FAIL - Could not retrieve"
  DB_SG_PASS="false"
fi

echo ""

# Summary
echo "================================================================================"
echo "SUMMARY"
echo "================================================================================"
echo ""

TOTAL_TESTS=5
PASSED=0

if [ "$VPC_ENDPOINTS_PASS" = "true" ]; then ((PASSED++)); fi
if [ "$DB_PASS" = "true" ]; then ((PASSED++)); fi
if [ "$SECRETS_PASS" = "true" ]; then ((PASSED++)); fi
if [ "$SUBNET_PASS" = "true" ]; then ((PASSED++)); fi
if [ "$SG_PASS" = "true" ] && [ "$DB_SG_PASS" = "true" ]; then ((PASSED++)); fi

echo "Tests Passed: $PASSED / $TOTAL_TESTS"
echo ""

if [ "$PASSED" -eq "$TOTAL_TESTS" ]; then
  echo "Overall: ✓ ALL TESTS PASSED"
  echo "================================================================================"
  exit 0
else
  echo "Overall: ✗ SOME TESTS FAILED"
  echo "================================================================================"
  exit 1
fi
