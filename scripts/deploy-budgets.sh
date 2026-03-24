#!/bin/bash
# deploy-budgets.sh
# Configures AWS Budgets for cost monitoring
# Usage: ./scripts/deploy-budgets.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGION="eu-west-1"
MONTHLY_BUDGET=50
WARNING_THRESHOLD=80
CRITICAL_THRESHOLD=100
FORECAST_WARNING_THRESHOLD=90

# Email for budget alerts (update this)
ALERT_EMAIL="gleesonb@gmail.com"

echo -e "${GREEN}=== Supporter 360 Cost Monitoring Setup ===${NC}"
echo ""

# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${YELLOW}Account ID: ${ACCOUNT_ID}${NC}"
echo -e "${YELLOW}Region: ${REGION}${NC}"
echo ""

# Step 1: Create SNS topic for budget alerts
echo -e "${YELLOW}Step 1: Creating SNS topic for budget alerts...${NC}"
SNS_TOPIC_NAME="supporter360-budget-alerts"

SNS_TOPIC_ARN=$(aws sns create-topic --name "${SNS_TOPIC_NAME}" --query 'TopicArn' --output text 2>/dev/null || echo "")

if [ -n "$SNS_TOPIC_ARN" ]; then
    echo -e "${GREEN}✓ Created SNS topic ${SNS_TOPIC_ARN}${NC}"
else
    # Topic may already exist
    SNS_TOPIC_ARN=$(aws sns list-topics --query "Topics[?contains(TopicArn, \`${SNS_TOPIC_NAME}\`)].TopicArn" --output text)
    echo -e "${YELLOW}⚠ SNS topic already exists${NC}"
fi

# Subscribe email to topic (only if not already subscribed)
echo -e "${YELLOW}Step 2: Subscribing email to budget alerts...${NC}"
if ! aws sns list-subscriptions-by-topic --topic-arn "${SNS_TOPIC_ARN}" --query "Subscriptions[?Endpoint=='\${ALERT_EMAIL}'].Endpoint" --output text | grep -q "${ALERT_EMAIL}"; then
    aws sns subscribe \
        --topic-arn "${SNS_TOPIC_ARN}" \
        --protocol email \
        --notification-endpoint "${ALERT_EMAIL}" >/dev/null

    echo -e "${GREEN}✓ Subscribed ${ALERT_EMAIL} to budget alerts${NC}"
    echo -e "${YELLOW}⚠ Please confirm subscription by clicking the link sent to ${ALERT_EMAIL}${NC}"
else
    echo -e "${GREEN}✓ ${ALERT_EMAIL} already subscribed${NC}"
fi

# Step 3: Create monthly cost budget
echo -e "${YELLOW}Step 3: Creating monthly cost budget...${NC}"
BUDGET_NAME="Supporter360-Monthly-Budget"

cat > /tmp/monthly-budget.json <<EOF
{
    "AccountId": "${ACCOUNT_ID}",
    "BudgetName": "${BUDGET_NAME}",
    "BudgetLimit": {
        "Amount": "${MONTHLY_BUDGET}",
        "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "TimePeriod": {
        "Start": "$(date -u +%Y-%m)-01",
        "End": "2087-06-15"
    },
    "CostFilters": {},
    "CostTypes": {
        "IncludeTax": true,
        "IncludeSubscription": true,
        "UseBlended": false,
        "IncludeRefund": true,
        "IncludeCredit": true,
        "IncludeUpfront": true,
        "IncludeRecurring": true,
        "IncludeOtherSubscription": true,
        "IncludeSupport": true,
        "IncludeDiscount": true,
        "UseAmortized": false
    },
    "BudgetType": "COST"
}
EOF

# Create budget with notifications
aws budgets create-budget \
    --account-id "${ACCOUNT_ID}" \
    --budget file:///tmp/monthly-budget.json \
    --notifications-with-subscribers '[
        {
            "Notification": {
                "NotificationType": "ACTUAL",
                "ComparisonOperator": "GREATER_THAN",
                "Threshold": ${WARNING_THRESHOLD},
                "ThresholdType": "PERCENTAGE",
                "NotificationState": "ALARM"
            },
            "Subscribers": [
                {
                    "SubscriptionType": "SNS",
                    "Address": "${SNS_TOPIC_ARN}"
                },
                {
                    "SubscriptionType": "EMAIL",
                    "Address": "${ALERT_EMAIL}"
                }
            ]
        },
        {
            "Notification": {
                "NotificationType": "FORECASTED",
                "ComparisonOperator": "GREATER_THAN",
                "Threshold": ${FORECAST_WARNING_THRESHOLD},
                "ThresholdType": "PERCENTAGE",
                "NotificationState": "ALARM"
            },
            "Subscribers": [
                {
                    "SubscriptionType": "SNS",
                    "Address": "${SNS_TOPIC_ARN}"
                },
                {
                    "SubscriptionType": "EMAIL",
                    "Address": "${ALERT_EMAIL}"
                }
            ]
        }
    ]' 2>/dev/null || echo -e "${YELLOW}⚠ Budget may already exist${NC}"

echo -e "${GREEN}✓ Created monthly cost budget${NC}"
echo -e "${GREEN}  Budget: \$${MONTHLY_BUDGET}/month${NC}"
echo -e "${GREEN}  Warning threshold: ${WARNING_THRESHOLD}%${NC}"
echo -e "${GREEN}  Forecast warning: ${FORECAST_WARNING_THRESHOLD}%${NC}"

# Step 4: Create service-specific budgets for high-cost services
echo -e "${YELLOW}Step 4: Creating service-specific budgets...${NC}"

# RDS budget (typically highest cost)
RDS_BUDGET=25
cat > /tmp/rds-budget.json <<EOF
{
    "AccountId": "${ACCOUNT_ID}",
    "BudgetName": "Supporter360-RDS-Budget",
    "BudgetLimit": {
        "Amount": "${RDS_BUDGET}",
        "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "TimePeriod": {
        "Start": "$(date -u +%Y-%m)-01",
        "End": "2087-06-15"
    },
    "CostFilters": {
        "Service": ["Amazon Relational Database Service"]
    },
    "CostTypes": {
        "IncludeTax": true,
        "IncludeSubscription": true,
        "UseBlended": false,
        "IncludeRefund": true,
        "IncludeCredit": true,
        "IncludeUpfront": true,
        "IncludeRecurring": true,
        "IncludeOtherSubscription": true,
        "IncludeSupport": true,
        "IncludeDiscount": true,
        "UseAmortized": false
    },
    "BudgetType": "COST"
}
EOF

aws budgets create-budget \
    --account-id "${ACCOUNT_ID}" \
    --budget file:///tmp/rds-budget.json \
    --notifications-with-subscribers '[
        {
            "Notification": {
                "NotificationType": "ACTUAL",
                "ComparisonOperator": "GREATER_THAN",
                "Threshold": 80,
                "ThresholdType": "PERCENTAGE",
                "NotificationState": "ALARM"
            },
            "Subscribers": [
                {
                    "SubscriptionType": "EMAIL",
                    "Address": "${ALERT_EMAIL}"
                }
            ]
        }
    ]' 2>/dev/null || echo -e "${YELLOW}⚠ RDS budget may already exist${NC}"

echo -e "${GREEN}✓ Created RDS budget: \$${RDS_BUDGET}/month${NC}"

# Lambda budget
LAMBDA_BUDGET=10
cat > /tmp/lambda-budget.json <<EOF
{
    "AccountId": "${ACCOUNT_ID}",
    "BudgetName": "Supporter360-Lambda-Budget",
    "BudgetLimit": {
        "Amount": "${LAMBDA_BUDGET}",
        "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "TimePeriod": {
        "Start": "$(date -u +%Y-%m)-01",
        "End": "2087-06-15"
    },
    "CostFilters": {
        "Service": ["AWS Lambda"]
    },
    "CostTypes": {
        "IncludeTax": true,
        "IncludeSubscription": true,
        "UseBlended": false,
        "IncludeRefund": true,
        "IncludeCredit": true,
        "IncludeUpfront": true,
        "IncludeRecurring": true,
        "IncludeOtherSubscription": true,
        "IncludeSupport": true,
        "IncludeDiscount": true,
        "UseAmortized": false
    },
    "BudgetType": "COST"
}
EOF

aws budgets create-budget \
    --account-id "${ACCOUNT_ID}" \
    --budget file:///tmp/lambda-budget.json \
    --notifications-with-subscribers '[
        {
            "Notification": {
                "NotificationType": "ACTUAL",
                "ComparisonOperator": "GREATER_THAN",
                "Threshold": 80,
                "ThresholdType": "PERCENTAGE",
                "NotificationState": "ALARM"
            },
            "Subscribers": [
                {
                    "SubscriptionType": "EMAIL",
                    "Address": "${ALERT_EMAIL}"
                }
            ]
        }
    ]' 2>/dev/null || echo -e "${YELLOW}⚠ Lambda budget may already exist${NC}"

echo -e "${GREEN}✓ Created Lambda budget: \$${LAMBDA_BUDGET}/month${NC}"

# Step 5: Create CloudWatch alarm for monthly spend
echo -e "${YELLOW}Step 5: Creating CloudWatch spend alarm...${NC}"

# Calculate threshold in dollars
WARNING_THRESHOLD_DOLLARS=$(echo "$MONTHLY_BUDGET * $WARNING_THRESHOLD / 100" | bc)

aws cloudwatch put-metric-alarm \
    --alarm-name supporter360-monthly-spend \
    --alarm-description "Alert when monthly spend exceeds warning threshold" \
    --metric-name EstimatedCharges \
    --namespace AWS/Billing \
    --statistic Maximum \
    --period 21600 \
    --evaluation-periods 1 \
    --threshold "${WARNING_THRESHOLD_DOLLARS}" \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=Currency,Value=USD \
    --alarm-actions "${SNS_TOPIC_ARN}" 2>/dev/null || echo -e "${YELLOW}⚠ Alarm may already exist${NC}"

echo -e "${GREEN}✓ Created CloudWatch spend alarm${NC}"

# Step 6: Create anomaly detection subscription (optional, requires Business or Enterprise Support)
echo -e "${YELLOW}Step 6: Setting up cost anomaly detection...${NC}"
echo -e "${YELLOW}⚠ Cost anomaly detection requires AWS Business or Enterprise Support${NC}"
echo -e "${YELLOW}  To enable, visit: https://${REGION}.console.aws.amazon.com/billing/home?region=${REGION}#/preferences/anomaly${NC}"

# Step 7: Create cost optimization recommendations
echo -e "${YELLOW}Step 7: Creating cost optimization recommendations...${NC}"
cat > /tmp/cost-optimization-tips.md <<EOF
# Supporter 360 Cost Optimization Tips

## Current Estimated Monthly Cost

Based on RDS Serverless v2 configuration:
- **RDS Aurora PostgreSQL**: \$25-40/month (0.5-2 ACU)
- **Lambda**: \$5-15/month (pay-per-use)
- **API Gateway**: \$2-5/month
- **SQS**: \$0.40/month
- **S3**: \$1-3/month
- **VPC Endpoints**: \$7/month
- **Total**: \$40-70/month

## Cost Optimization Strategies

### 1. RDS Optimization
- **Current**: 0.5-2 ACU Serverless v2
- **Optimization**: Monitor CPU utilization and adjust ACU range
- **Potential Savings**: \$10-20/month if utilization is low

\`\`\`bash
# Check RDS utilization
aws cloudwatch get-metric-statistics \\
    --namespace AWS/RDS \\
    --metric-name CPUUtilization \\
    --dimensions Name=DBClusterIdentifier,Value=${CLUSTER_ID} \\
    --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \\
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \\
    --period 3600 \\
    --statistics Average
\`\`\`

### 2. Lambda Optimization
- **Current**: Pay-per-use pricing
- **Optimization**: Optimize memory allocation and execution time
- **Potential Savings**: 10-20% with tuning

\`\`\`bash
# Check Lambda duration
aws cloudwatch get-metric-statistics \\
    --namespace AWS/Lambda \\
    --metric-name Duration \\
    --dimensions Name=FunctionName,Value=Supporter360StackV2-* \\
    --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \\
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \\
    --period 86400 \\
    --statistics Average
\`\`\`

### 3. S3 Lifecycle Policies
- **Current**: Raw payloads archived to Glacier after 30 days
- **Optimization**: Consider shorter retention for non-critical data
- **Potential Savings**: \$1-2/month

### 4. CloudWatch Logs
- **Current**: 7-30 day retention
- **Optimization**: Archive older logs to S3 Glacier
- **Potential Savings**: \$2-5/month

### 5. API Gateway Caching
- **Current**: No caching
- **Optimization**: Enable caching for read-heavy endpoints
- **Potential Savings**: \$1-3/month in Lambda costs
- **Trade-off**: Additional \$1-3/month for cache

## Cost Monitoring Commands

### Check current month's spend
\`\`\`bash
aws ce get-cost-and-usage \\
    --time-period Start=$(date -u +%Y-%m)-01,End=$(date -u +%Y-%m-%d) \\
    --granularity MONTHLY \\
    --metrics BlendedCost \\
    --group-by Type=DIMENSION,Key=SERVICE
\`\`\`

### Forecast remaining month
\`\`\`bash
aws ce get-cost-and-usage \\
    --time-period Start=$(date -u +%Y-%m)-01,End=$(date -u +%Y-%m-%d) \\
    --granularity MONTHLY \\
    --metrics BlendedCost \\
    --forecast BlendedCost
\`\`\`

### View budget status
\`\`\`bash
aws budgets describe-budget \\
    --account-id ${ACCOUNT_ID} \\
    --budget-name ${BUDGET_NAME}
\`\`\`

### List all budgets
\`\`\`bash
aws budgets describe-budgets \\
    --account-id ${ACCOUNT_ID} \\
    --query "Budgets[].{Name:BudgetName,Limit:BudgetLimit.Amount,Type:BudgetType}"
\`\`\`

## Alert Thresholds

- **Warning Alert**: 80% of \$${MONTHLY_BUDGET} (\$$(echo "$MONTHLY_BUDGET * $WARNING_THRESHOLD / 100" | bc))
- **Critical Alert**: 100% of \$${MONTHLY_BUDGET} (\$${MONTHLY_BUDGET})
- **Forecast Alert**: 90% of \$${MONTHLY_BUDGET} (\$$(echo "$MONTHLY_BUDGET * $FORECAST_WARNING_THRESHOLD / 100" | bc))

## Cost Anomaly Detection

If you have AWS Business or Enterprise Support, enable cost anomaly detection:
1. Visit: https://console.aws.amazon.com/billing/home#/preferences/anomaly
2. Enable anomaly detection
3. Set alert threshold (default: \$10)
4. Subscribe to SNS topic for alerts

## Reserved Instances vs. On-Demand

For Supporter 360, **Serverless v2 is more cost-effective** than Reserved Instances:
- Reserved Instances require 1-3 year commitment
- Serverless v2 scales to zero when not in use
- Current usage patterns don't justify RI commitment

## Next Actions

1. **Weekly**: Check budget status in Billing Console
2. **Monthly**: Review cost and usage report
3. **Quarterly**: Optimize based on usage patterns
4. **Annually**: Review reserved instance opportunities

## Cost Optimization Resources

- AWS Cost Explorer: https://console.aws.amazon.com/cost-management
- AWS Trusted Advisor: https://console.aws.amazon.com/trustedadvisor
- AWS Compute Optimizer: https://console.aws.amazon.com/compute-optimizer
EOF

echo -e "${GREEN}✓ Created cost optimization recommendations${NC}"

# Step 8: Summary
echo ""
echo -e "${GREEN}=== Cost Monitoring Summary ===${NC}"
echo -e "${GREEN}✓ Monthly Budget: \$${MONTHLY_BUDGET}${NC}"
echo -e "${GREEN}✓ Warning Threshold: ${WARNING_THRESHOLD}% (\$$(echo "$MONTHLY_BUDGET * $WARNING_THRESHOLD / 100" | bc))${NC}"
echo -e "${GREEN}✓ Forecast Warning: ${FORECAST_WARNING_THRESHOLD}%${NC}"
echo -e "${GREEN}✓ RDS Budget: \$${RDS_BUDGET}${NC}"
echo -e "${GREEN}✓ Lambda Budget: \$${LAMBDA_BUDGET}${NC}"
echo -e "${GREEN}✓ Alert Email: ${ALERT_EMAIL}${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. View budgets in AWS Console:"
echo -e "   https://console.aws.amazon.com/billing/home?region=${REGION}#/budgets"
echo -e "2. Monitor costs in Cost Explorer:"
echo -e "   https://console.aws.amazon.com/cost-management/home?region=${REGION}#/cost-usage"
echo -e "3. Set up monthly cost reports (optional):"
echo -e "   aws cur put-report-definition --report-definition file://cost-report.json"
echo -e "4. Review cost optimization tips:"
echo -e "   cat /tmp/cost-optimization-tips.md"
echo ""
