#!/bin/bash
set -e

# Deploy CloudWatch Alarms for Supporter 360
# This script creates critical alarms for production monitoring

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚨 Deploying CloudWatch Alarms for Supporter 360..."

# Get AWS account ID and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="eu-west-1"
SNS_TOPIC_NAME="Supporter360-Alerts"
SNS_TOPIC_ARN="arn:aws:sns:$REGION:$ACCOUNT_ID:$SNS_TOPIC_NAME"

echo "📍 Account: $ACCOUNT_ID"
echo "📍 Region: $REGION"
echo "📍 SNS Topic: $SNS_TOPIC_ARN"

# Check if SNS topic exists, create if not
echo ""
echo "📢 Checking SNS topic..."
if aws sns get-topic-attributes --topic-arn "$SNS_TOPIC_ARN" --region "$REGION" > /dev/null 2>&1; then
    echo "✅ SNS topic already exists: $SNS_TOPIC_NAME"
else
    echo "📝 Creating SNS topic: $SNS_TOPIC_NAME"
    aws sns create-topic --name "$SNS_TOPIC_NAME" --region "$REGION" > /dev/null
    echo "✅ SNS topic created: $SNS_TOPIC_NAME"
    echo ""
    echo "⚠️  IMPORTANT: Subscribe to this topic to receive alerts:"
    echo "   aws sns subscribe \\"
    echo "     --topic-arn $SNS_TOPIC_ARN \\"
    echo "     --protocol email \\"
    echo "     --notification-endpoint your-email@example.com"
    echo ""
    read -p "Press Enter to continue after subscribing to alerts..."
fi

# Function to create or update alarm
create_alarm() {
    local alarm_name=$1
    local alarm_description=$2
    local metric_name=$3
    local namespace=$4
    local statistic=$5
    local period=$6
    local threshold=$7
    local comparison_operator=$8
    local evaluation_periods=$9
    local dimensions=${10}

    echo "🔔 Creating alarm: $alarm_name"

    # Build dimensions JSON if provided
    local dims_param=""
    if [ -n "$dimensions" ]; then
        dims_param="--dimensions $dimensions"
    fi

    aws cloudwatch put-metric-alarm \
        --alarm-name "$alarm_name" \
        --alarm-description "$alarm_description" \
        --metric-name "$metric_name" \
        --namespace "$namespace" \
        --statistic "$statistic" \
        --period "$period" \
        --threshold "$threshold" \
        --comparison-operator "$comparison_operator" \
        --evaluation-periods "$evaluation_periods" \
        --alarm-actions "$SNS_TOPIC_ARN" \
        --region "$REGION" \
        $dims_param > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        echo "   ✅ Created: $alarm_name"
    else
        echo "   ⚠️  Warning: Failed to create $alarm_name (may already exist)"
    fi
}

echo ""
echo "🔔 Creating Critical Alarms..."
echo ""

# ========================================
# CRITICAL ALARMS
# ========================================

# 1. Lambda Error Rate > 5%
echo "📊 Lambda Error Rate Alarms"
for function_pattern in "ShopifyWebhookHandler" "StripeWebhookHandler" "GoCardlessWebhookHandler" "MailchimpWebhookHandler" "ShopifyProcessor" "StripeProcessor" "GoCardlessProcessor" "MailchimpProcessor"; do
    create_alarm \
        "supporter360-${function_pattern}-errors" \
        "Alert when ${function_pattern} error rate exceeds 5%" \
        "Errors" \
        "AWS/Lambda" \
        "Sum" \
        "300" \
        "5" \
        "GreaterThanThreshold" \
        "2" \
        "Name=FunctionName,Value=Supporter360StackV2-${function_pattern}"
done

# 2. API Gateway 5XX Errors
echo ""
echo "📊 API Gateway Error Alarms"
create_alarm \
    "supporter360-api-5xx" \
    "Alert when API Gateway has 5XX errors" \
    "5XXError" \
    "AWS/ApiGateway" \
    "Sum" \
    "60" \
    "5" \
    "GreaterThanThreshold" \
    "2" \
    ""

# 3. RDS CPU > 80%
echo ""
echo "📊 RDS Database Alarms"
create_alarm \
    "supporter360-rds-cpu" \
    "Alert when RDS CPU exceeds 80%" \
    "CPUUtilization" \
    "AWS/RDS" \
    "Average" \
    "300" \
    "80" \
    "GreaterThanThreshold" \
    "3" \
    "Name=DBClusterIdentifier,Value=supporter360-supporter360-database"

# 4. RDS Connections > 80% (assuming max 1000 connections)
create_alarm \
    "supporter360-rds-connections" \
    "Alert when RDS connections exceed 800 (80% of max)" \
    "DatabaseConnections" \
    "AWS/RDS" \
    "Average" \
    "300" \
    "800" \
    "GreaterThanThreshold" \
    "2" \
    "Name=DBClusterIdentifier,Value=supporter360-supporter360-database"

# 5. DLQ has messages (all 4 DLQs)
echo ""
echo "📊 Dead Letter Queue Alarms"
for queue in shopify stripe gocardless mailchimp; do
    create_alarm \
        "supporter360-${queue}-dlq" \
        "Alert when ${queue} DLQ has messages (processing failed)" \
        "ApproximateNumberOfMessagesVisible" \
        "AWS/SQS" \
        "Average" \
        "300" \
        "1" \
        "GreaterThanThreshold" \
        "1" \
        "Name=QueueName,Value=supporter360-${queue}-dlq"
done

# 6. SQS queue age > 1 hour (all 4 main queues)
echo ""
echo "📊 SQS Queue Processing Delay Alarms"
for queue in shopify stripe gocardless mailchimp; do
    create_alarm \
        "supporter360-${queue}-queue-age" \
        "Alert when ${queue} queue messages are older than 1 hour" \
        "ApproximateAgeOfOldestMessage" \
        "AWS/SQS" \
        "Average" \
        "300" \
        "3600" \
        "GreaterThanThreshold" \
        "1" \
        "Name=QueueName,Value=supporter360-${queue}-queue"
done

# 7. Lambda Duration > 30s (performance degradation)
echo ""
echo "📊 Lambda Performance Alarms"
for function_pattern in "ShopifyProcessor" "StripeProcessor" "GoCardlessProcessor" "MailchimpProcessor" "FutureTicketingProcessor"; do
    create_alarm \
        "supporter360-${function_pattern}-duration" \
        "Alert when ${function_pattern} duration exceeds 30 seconds" \
        "Duration" \
        "AWS/Lambda" \
        "Average" \
        "300" \
        "30000" \
        "GreaterThanThreshold" \
        "2" \
        "Name=FunctionName,Value=Supporter360StackV2-${function_pattern}"
done

# ========================================
# WARNING ALARMS
# ========================================

# 8. API Gateway 4XX errors > 10% (possible client errors)
echo ""
echo "📊 API Gateway Warning Alarms"
create_alarm \
    "supporter360-api-4xx" \
    "Warning: API Gateway 4XX error rate > 10%" \
    "4XXError" \
    "AWS/ApiGateway" \
    "Sum" \
    "60" \
    "10" \
    "GreaterThanThreshold" \
    "3" \
    ""

# 9. RDS Free Storage < 5GB
echo ""
echo "📊 RDS Storage Warning Alarms"
create_alarm \
    "supporter360-rds-storage" \
    "Warning: RDS free storage < 5GB" \
    "FreeStorageSpace" \
    "AWS/RDS" \
        "Average" \
    "300" \
    "5368709120" \
    "LessThanThreshold" \
    "1" \
    "Name=DBClusterIdentifier,Value=supporter360-supporter360-database"

# 10. Lambda Concurrent Executions > 80% (assuming limit of 1000)
echo ""
echo "📊 Lambda Concurrency Alarms"
create_alarm \
    "supporter360-lambda-concurrent" \
    "Warning: Lambda concurrent executions > 800" \
    "ConcurrentExecutions" \
    "AWS/Lambda" \
    "Average" \
    "300" \
    "800" \
    "GreaterThanThreshold" \
    "2" \
    ""

echo ""
echo "✅ All alarms deployed successfully!"
echo ""
echo "📊 Alarms created:"
echo "  • Lambda Error Rate (8 functions)"
echo "  • API Gateway 5XX Errors"
echo "  • API Gateway 4XX Errors (warning)"
echo "  • RDS CPU Utilization"
echo "  • RDS Database Connections"
echo "  • RDS Free Storage (warning)"
echo "  • DLQ Messages (4 queues)"
echo "  • SQS Queue Age (4 queues)"
echo "  • Lambda Duration (5 processors)"
echo "  • Lambda Concurrent Executions"
echo ""
echo "🔗 CloudWatch Console: https://$REGION.console.aws.amazon.com/cloudwatch/home?region=$REGION#alarmsV2:"
echo ""
echo "⚠️  IMPORTANT: Make sure to subscribe to the SNS topic to receive alerts!"
echo "   Topic ARN: $SNS_TOPIC_ARN"
echo ""
