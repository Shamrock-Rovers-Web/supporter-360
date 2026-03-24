#!/bin/bash
# deploy-cloudtrail.sh
# Deploys AWS CloudTrail for audit logging
# Usage: ./scripts/deploy-cloudtrail.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="Supporter360StackV2"
REGION="eu-west-1"
TRAIL_NAME="Supporter360-Trail"
BUCKET_NAME="supporter360-cloudtrail-logs-$(aws sts get-caller-identity --query Account --output text)"
SNS_TOPIC_NAME="supporter360-cloudtrail-alerts"

echo -e "${GREEN}=== Supporter 360 CloudTrail Deployment ===${NC}"
echo ""

# Step 1: Create S3 bucket for CloudTrail logs
echo -e "${YELLOW}Step 1: Creating S3 bucket for CloudTrail logs...${NC}"
if aws s3 ls "s3://${BUCKET_NAME}" 2>/dev/null; then
    echo -e "${GREEN}✓ S3 bucket ${BUCKET_NAME} already exists${NC}"
else
    aws s3api create-bucket \
        --bucket "${BUCKET_NAME}" \
        --region "${REGION}" \
        --create-bucket-configuration "LocationConstraint=${REGION}"

    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "${BUCKET_NAME}" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }'

    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "${BUCKET_NAME}" \
        --versioning-configuration Status=Enabled

    # Block public access
    aws s3api put-public-access-block \
        --bucket "${BUCKET_NAME}" \
        --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

    # Add bucket policy for CloudTrail
    cat > /tmp/cloudtrail-bucket-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AWSCloudTrailAclCheck",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudtrail.amazonaws.com"
            },
            "Action": "s3:GetBucketAcl",
            "Resource": "arn:aws:s3:::${BUCKET_NAME}"
        },
        {
            "Sid": "AWSCloudTrailWrite",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudtrail.amazonaws.com"
            },
            "Action": "s3:PutObject",
            "Resource": "arn:aws:s3:::${BUCKET_NAME}/AWSLogs/$(aws sts get-caller-identity --query Account --output text)/*",
            "Condition": {
                "StringEquals": {
                    "s3:x-amz-acl": "bucket-owner-full-control"
                }
            }
        }
    ]
}
EOF

    aws s3api put-bucket-policy \
        --bucket "${BUCKET_NAME}" \
        --policy file:///tmp/cloudtrail-bucket-policy.json

    # Set lifecycle policy (transition to Glacier after 30 days, delete after 365 days)
    aws s3api put-bucket-lifecycle-configuration \
        --bucket "${BUCKET_NAME}" \
        --lifecycle-configuration '{
            "Rules": [
                {
                    "Id": "CloudTrailLogsTransition",
                    "Status": "Enabled",
                    "Filter": {},
                    "Transitions": [
                        {
                            "Days": 30,
                            "StorageClass": "GLACIER"
                        },
                        {
                            "Days": 90,
                            "StorageClass": "DEEP_ARCHIVE"
                        }
                    ],
                    "Expiration": {
                        "Days": 365
                    }
                }
            ]
        }'

    echo -e "${GREEN}✓ Created S3 bucket ${BUCKET_NAME}${NC}"
fi

# Step 2: Create SNS topic for CloudTrail alerts
echo -e "${YELLOW}Step 2: Creating SNS topic for CloudTrail alerts...${NC}"
SNS_TOPIC_ARN=$(aws sns create-topic --name "${SNS_TOPIC_NAME}" --query 'TopicArn' --output text 2>/dev/null || echo "")

if [ -n "$SNS_TOPIC_ARN" ]; then
    echo -e "${GREEN}✓ Created SNS topic ${SNS_TOPIC_ARN}${NC}"
    echo -e "${YELLOW}  Subscribe to this topic to receive CloudTrail alerts:${NC}"
    echo -e "  aws sns subscribe --topic-arn ${SNS_TOPIC_ARN} --protocol email --notification-endpoint your-email@example.com"
else
    echo -e "${YELLOW}⚠ SNS topic may already exist${NC}"
    SNS_TOPIC_ARN=$(aws sns list-topics --query "Topics[?contains(TopicArn, \`${SNS_TOPIC_NAME}\`)].TopicArn" --output text)
fi

# Step 3: Create CloudTrail
echo -e "${YELLOW}Step 3: Creating CloudTrail...${NC}"

# Check if trail already exists
if aws cloudtrail get-trail --name "${TRAIL_NAME}" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ CloudTrail ${TRAIL_NAME} already exists${NC}"
    echo -e "${YELLOW}  Updating existing trail...${NC}"

    aws cloudtrail update-trail \
        --name "${TRAIL_NAME}" \
        --s3-bucket-name "${BUCKET_NAME}" \
        --include-global-services \
        --is-multi-region-trail \
        --enable-log-file-validation \
        --cloud-watch-logs-log-group-arn "arn:aws:logs:${REGION}:$(aws sts get-caller-identity --query Account --output text):log-group:/aws/cloudtrail/Supporter360Trail" \
        --cloud-watch-logs-role-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/CloudTrail_CloudWatchLogs_Role"

    echo -e "${GREEN}✓ Updated CloudTrail ${TRAIL_NAME}${NC}"
else
    # Create IAM role for CloudWatch Logs if needed
    cat > /tmp/cloudtrail-trust-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudtrail.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

    ROLE_NAME="CloudTrail_CloudWatchLogs_Role"
    if ! aws iam get-role --role-name "${ROLE_NAME}" >/dev/null 2>&1; then
        aws iam create-role \
            --role-name "${ROLE_NAME}" \
            --assume-role-policy-document file:///tmp/cloudtrail-trust-policy.json

        # Create and attach policy
        cat > /tmp/cloudtrail-logs-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:${REGION}:$(aws sts get-caller-identity --query Account --output text):log-group:/aws/cloudtrail/*"
        }
    ]
}
EOF

        aws iam put-role-policy \
            --role-name "${ROLE_NAME}" \
            --policy-name CloudTrail_CloudWatchLogs_Policy \
            --policy-document file:///tmp/cloudtrail-logs-policy.json
    fi

    # Create CloudWatch Logs log group
    LOG_GROUP_NAME="/aws/cloudtrail/Supporter360Trail"
    if ! aws logs describe-log-groups --log-group-name-prefix "${LOG_GROUP_NAME}" >/dev/null 2>&1; then
        aws logs create-log-group \
            --log-group-name "${LOG_GROUP_NAME}" \
            --retention-in-days 30
    fi

    # Create CloudTrail
    TRAIL_ARN=$(aws cloudtrail create-trail \
        --name "${TRAIL_NAME}" \
        --s3-bucket-name "${BUCKET_NAME}" \
        --include-global-services \
        --is-multi-region-trail \
        --enable-log-file-validation \
        --cloud-watch-logs-log-group-arn "arn:aws:logs:${REGION}:$(aws sts get-caller-identity --query Account --output text):log-group:${LOG_GROUP_NAME}" \
        --cloud-watch-logs-role-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/${ROLE_NAME}" \
        --query 'TrailARN' \
        --output text)

    echo -e "${GREEN}✓ Created CloudTrail ${TRAIL_NAME}${NC}"
    echo -e "${GREEN}  Trail ARN: ${TRAIL_ARN}${NC}"
fi

# Step 4: Start logging
echo -e "${YELLOW}Step 4: Starting CloudTrail logging...${NC}"
aws cloudtrail start-logging --name "${TRAIL_NAME}"
echo -e "${GREEN}✓ CloudTrail logging started${NC}"

# Step 5: Create CloudWatch Alarms for suspicious activity
echo -e "${YELLOW}Step 5: Creating CloudWatch alarms for security events...${NC}"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Alarm 1: Unauthorized API calls
aws cloudwatch put-metric-alarm \
    --alarm-name supporter360-cloudtrail-unauthorized-api \
    --alarm-description "Alert on unauthorized API calls" \
    --metric-name UnauthorizedOperationCount \
    --namespace AWS/CloudTrail \
    --statistic Sum \
    --period 300 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --evaluation-periods 1 \
    --treat-missing-data notBreaching \
    --alarm-actions "${SNS_TOPIC_ARN}" 2>/dev/null || echo -e "${YELLOW}⚠ Could not create alarm (may already exist)${NC}"

# Alarm 2: Console login failures
aws cloudwatch put-metric-alarm \
    --alarm-name supporter360-cloudtrail-console-login-failures \
    --alarm-description "Alert on console login failures" \
    --metric-name ConsoleLoginFailureCount \
    --namespace AWS/CloudTrail \
    --statistic Sum \
    --period 300 \
    --threshold 3 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --evaluation-periods 1 \
    --treat-missing-data notBreaching \
    --alarm-actions "${SNS_TOPIC_ARN}" 2>/dev/null || echo -e "${YELLOW}⚠ Could not create alarm (may already exist)${NC}"

# Alarm 3: IAM policy changes
aws cloudwatch put-metric-alarm \
    --alarm-name supporter360-cloudtrail-iam-changes \
    --alarm-description "Alert on IAM policy changes" \
    --metric-name IAMPolicyChangeCount \
    --namespace AWS/CloudTrail \
    --statistic Sum \
    --period 300 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --evaluation-periods 1 \
    --treat-missing-data notBreaching \
    --alarm-actions "${SNS_TOPIC_ARN}" 2>/dev/null || echo -e "${YELLOW}⚠ Could not create alarm (may already exist)${NC}"

echo -e "${GREEN}✓ Created CloudWatch alarms for security events${NC}"

# Step 6: Summary
echo ""
echo -e "${GREEN}=== CloudTrail Deployment Summary ===${NC}"
echo -e "${GREEN}✓ CloudTrail: ${TRAIL_NAME}${NC}"
echo -e "${GREEN}✓ S3 Bucket: ${BUCKET_NAME}${NC}"
echo -e "${GREEN}✓ SNS Topic: ${SNS_TOPIC_ARN}${NC}"
echo -e "${GREEN}✓ Log File Validation: Enabled${NC}"
echo -e "${GREEN}✓ Multi-Region: Enabled${NC}"
echo -e "${GREEN}✓ Global Services: Enabled${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Subscribe to SNS topic to receive alerts:"
echo -e "   aws sns subscribe --topic-arn ${SNS_TOPIC_ARN} --protocol email --notification-endpoint your-email@example.com"
echo -e "2. Monitor CloudTrail logs in CloudWatch Logs:"
echo -e "   aws logs tail /aws/cloudtrail/Supporter360Trail --follow"
echo -e "3. View CloudTrail in AWS Console:"
echo -e "   https://${REGION}.console.aws.amazon.com/cloudtrail/home?region=${REGION}#/trails/${TRAIL_NAME}"
echo ""
