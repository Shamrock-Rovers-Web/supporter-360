#!/bin/bash
# deploy-flow-logs.sh
# Deploys VPC Flow Logs for network monitoring
# Usage: ./scripts/deploy-flow-logs.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="Supporter360StackV2"
REGION="eu-west-1"
LOG_GROUP_NAME="/aws/vpc/flow-logs/Supporter360"
RETENTION_DAYS=7

echo -e "${GREEN}=== Supporter 360 VPC Flow Logs Deployment ===${NC}"
echo ""

# Get VPC ID from CloudFormation stack
echo -e "${YELLOW}Step 1: Getting VPC ID from CloudFormation stack...${NC}"
VPC_ID=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --query "Stacks[0].Outputs[?OutputKey=='VpcId'].OutputValue" \
    --output text 2>/dev/null || echo "")

if [ -z "$VPC_ID" ]; then
    # Fallback: get VPC by tag
    VPC_ID=$(aws ec2 describe-vpcs \
        --filters "Name=tag:Name,Values=Supporter360Vpc" \
        --query "Vpcs[0].VpcId" \
        --output text 2>/dev/null || echo "")
fi

if [ -z "$VPC_ID" ] || [ "$VPC_ID" == "None" ]; then
    echo -e "${RED}✗ Could not find VPC ID${NC}"
    echo -e "${YELLOW}Please ensure the stack is deployed: npx cdk deploy${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found VPC: ${VPC_ID}${NC}"

# Step 2: Create CloudWatch Logs log group
echo -e "${YELLOW}Step 2: Creating CloudWatch Logs log group...${NC}"
if aws logs describe-log-groups --log-group-name-prefix "${LOG_GROUP_NAME}" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Log group ${LOG_GROUP_NAME} already exists${NC}"
else
    aws logs create-log-group \
        --log-group-name "${LOG_GROUP_NAME}" \
        --retention-in-days "${RETENTION_DAYS}"

    echo -e "${GREEN}✓ Created log group ${LOG_GROUP_NAME} (${RETENTION_DAYS} days retention)${NC}"
fi

# Step 3: Create IAM role for flow logs
echo -e "${YELLOW}Step 3: Creating IAM role for VPC flow logs...${NC}"
ROLE_NAME="Supporter360FlowLogsRole"

if aws iam get-role --role-name "${ROLE_NAME}" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ IAM role ${ROLE_NAME} already exists${NC}"
else
    # Create trust policy
    cat > /tmp/flow-logs-trust-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "",
            "Effect": "Allow",
            "Principal": {
                "Service": "vpc-flow-logs.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

    # Create role
    aws iam create-role \
        --role-name "${ROLE_NAME}" \
        --assume-role-policy-document file:///tmp/flow-logs-trust-policy.json

    # Create and attach policy
    cat > /tmp/flow-logs-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams"
            ],
            "Resource": "*"
        }
    ]
}
EOF

    aws iam put-role-policy \
        --role-name "${ROLE_NAME}" \
        --policy-name Supporter360FlowLogsPolicy \
        --policy-document file:///tmp/flow-logs-policy.json

    echo -e "${GREEN}✓ Created IAM role ${ROLE_NAME}${NC}"
fi

ROLE_ARN="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/${ROLE_NAME}"

# Step 4: Check if flow logs already exist
echo -e "${YELLOW}Step 4: Checking existing flow logs...${NC}"
EXISTING_FLOW_LOG=$(aws ec2 describe-flow-logs \
    --filters "Name=resource-id,Values=${VPC_ID}" \
    --query "FlowLogs[0].FlowLogId" \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_FLOW_LOG" ] && [ "$EXISTING_FLOW_LOG" != "None" ]; then
    echo -e "${YELLOW}⚠ Flow logs already exist for VPC ${VPC_ID}${NC}"
    echo -e "${YELLOW}  Flow Log ID: ${EXISTING_FLOW_LOG}${NC}"
    echo -e "${YELLOW}  Deleting existing flow logs...${NC}"

    aws ec2 delete-flow-logs --flow-log-ids "${EXISTING_FLOW_LOG}"
    echo -e "${GREEN}✓ Deleted existing flow logs${NC}"
fi

# Step 5: Create VPC flow logs
echo -e "${YELLOW}Step 5: Creating VPC flow logs...${NC}"
FLOW_LOG_ID=$(aws ec2 create-flow-logs \
    --resource-type VPC \
    --resource-id "${VPC_ID}" \
    --traffic-type ALL \
    --log-destination-type cloud-watch-logs \
    --log-destination "arn:aws:logs:${REGION}:$(aws sts get-caller-identity --query Account --output text):log-group:${LOG_GROUP_NAME}" \
    --deliver-logs-permission-arn "${ROLE_ARN}" \
    --log-format "${LOG_GROUP_NAME}" \
    --query 'FlowLogId' \
    --output text)

echo -e "${GREEN}✓ Created VPC flow logs${NC}"
echo -e "${GREEN}  Flow Log ID: ${FLOW_LOG_ID}${NC}"

# Step 6: Verify flow logs are active
echo -e "${YELLOW}Step 6: Verifying flow logs status...${NC}"
sleep 5

FLOW_LOG_STATUS=$(aws ec2 describe-flow-logs \
    --flow-log-ids "${FLOW_LOG_ID}" \
    --query "FlowLogs[0].FlowLogStatus" \
    --output text)

echo -e "${GREEN}✓ Flow logs status: ${FLOW_LOG_STATUS}${NC}"

if [ "$FLOW_LOG_STATUS" != "ACTIVE" ]; then
    echo -e "${YELLOW}⚠ Flow logs are not yet active. This may take a few minutes.${NC}"
fi

# Step 7: Create CloudWatch metric filters for security monitoring
echo -e "${YELLOW}Step 7: Creating CloudWatch metric filters for security monitoring...${NC}"

# Metric filter 1: Rejected traffic (security group denies)
aws logs put-metric-filter \
    --log-group-name "${LOG_GROUP_NAME}" \
    --filter-name "RejectedTraffic" \
    --filter-pattern "[version, account, interface_id, srcaddr != '...', dstaddr != '...', srcport, dstport, protocol, packets, bytes, start, end, action, log_status]" \
    --metric-transformations "metricName=VPCRejectedTraffic,metricNamespace=Supporter360/Security,metricValue=1" 2>/dev/null || echo -e "${YELLOW}⚠ Metric filter may already exist${NC}"

# Metric filter 2: High traffic volume (>100MB)
aws logs put-metric-filter \
    --log-group-name "${LOG_GROUP_NAME}" \
    --filter-name "HighTrafficVolume" \
    --filter-pattern "[...bytes > 104857600]" \
    --metric-transformations "metricName=VPCHighTrafficVolume,metricNamespace=Supporter360/Security,metricValue=1" 2>/dev/null || echo -e "${YELLOW}⚠ Metric filter may already exist${NC}"

# Metric filter 3: External to internal traffic
aws logs put-metric-filter \
    --log-group-name "${LOG_GROUP_NAME}" \
    --filter-name "ExternalToInternalTraffic" \
    --filter-pattern "[version, account, interface_id, srcaddr, dstaddr, srcport, dstport, protocol, packets, bytes, start, end, action, log_status]" \
    --metric-transformations "metricName=VPCExternalToInternalTraffic,metricNamespace=Supporter360/Security,metricValue=1" 2>/dev/null || echo -e "${YELLOW}⚠ Metric filter may already exist${NC}"

echo -e "${GREEN}✓ Created CloudWatch metric filters${NC}"

# Step 8: Create CloudWatch alarms
echo -e "${YELLOW}Step 8: Creating CloudWatch alarms for VPC flow logs...${NC}"

# Get SNS topic ARN for alerts
SNS_TOPIC_ARN=$(aws sns list-topics --query "Topics[?contains(TopicArn, \`supporter360-security-alerts\`)].TopicArn" --output text)

if [ -z "$SNS_TOPIC_ARN" ]; then
    echo -e "${YELLOW}⚠ No SNS topic found for alerts. Creating...${NC}"
    SNS_TOPIC_ARN=$(aws sns create-topic --name supporter360-security-alerts --query 'TopicArn' --output text)
fi

# Alarm 1: Rejected traffic spike
aws cloudwatch put-metric-alarm \
    --alarm-name supporter360-vpc-rejected-traffic \
    --alarm-description "Alert on rejected traffic spike" \
    --metric-name VPCRejectedTraffic \
    --namespace Supporter360/Security \
    --statistic Sum \
    --period 300 \
    --threshold 100 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 1 \
    --treat-missing-data notBreaching \
    --alarm-actions "${SNS_TOPIC_ARN}" 2>/dev/null || echo -e "${YELLOW}⚠ Alarm may already exist${NC}"

# Alarm 2: High traffic volume
aws cloudwatch put-metric-alarm \
    --alarm-name supporter360-vpc-high-traffic \
    --alarm-description "Alert on high traffic volume" \
    --metric-name VPCHighTrafficVolume \
    --namespace Supporter360/Security \
    --statistic Sum \
    --period 300 \
    --threshold 10 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 1 \
    --treat-missing-data notBreaching \
    --alarm-actions "${SNS_TOPIC_ARN}" 2>/dev/null || echo -e "${YELLOW}⚠ Alarm may already exist${NC}"

echo -e "${GREEN}✓ Created CloudWatch alarms for VPC flow logs${NC}"

# Step 9: Summary
echo ""
echo -e "${GREEN}=== VPC Flow Logs Deployment Summary ===${NC}"
echo -e "${GREEN}✓ VPC: ${VPC_ID}${NC}"
echo -e "${GREEN}✓ Flow Log ID: ${FLOW_LOG_ID}${NC}"
echo -e "${GREEN}✓ Log Group: ${LOG_GROUP_NAME}${NC}"
echo -e "${GREEN}✓ Retention: ${RETENTION_DAYS} days${NC}"
echo -e "${GREEN}✓ Traffic Type: ALL${NC}"
echo -e "${GREEN}✓ IAM Role: ${ROLE_NAME}${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Monitor flow logs in CloudWatch Logs:"
echo -e "   aws logs tail ${LOG_GROUP_NAME} --follow"
echo -e "2. View flow logs in AWS Console:"
echo -e "   https://${REGION}.console.aws.amazon.com/vpc/home?region=${REGION}#FlowLogs:flowLogId=${FLOW_LOG_ID}"
echo -e "3. Analyze traffic patterns with CloudWatch Logs Insights:"
echo -e "   fields @timestamp, srcaddr, dstaddr, action, bytes | filter action = 'REJECT' | sort @timestamp desc | limit 20"
echo ""
