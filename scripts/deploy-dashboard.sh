#!/bin/bash
set -e

# Deploy CloudWatch Dashboard for Supporter 360
# This script creates a comprehensive monitoring dashboard

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DASHBOARD_FILE="$SCRIPT_DIR/cloudwatch-dashboard.json"

echo "📊 Deploying CloudWatch Dashboard for Supporter 360..."

# Check if dashboard file exists
if [ ! -f "$DASHBOARD_FILE" ]; then
    echo "❌ Error: Dashboard file not found at $DASHBOARD_FILE"
    exit 1
fi

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="eu-west-1"
DASHBOARD_NAME="Supporter360-Production"

echo "📍 Account: $ACCOUNT_ID"
echo "📍 Region: $REGION"
echo "📍 Dashboard: $DASHBOARD_NAME"

# Create/update dashboard
echo "📝 Creating/updating dashboard..."
aws cloudwatch put-dashboard \
    --dashboard-name "$DASHBOARD_NAME" \
    --dashboard-body file://"$DASHBOARD_FILE" \
    --region "$REGION" > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ Dashboard deployed successfully!"
    echo ""
    echo "🔗 Dashboard URL: https://$REGION.console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=$DASHBOARD_NAME"
    echo ""
    echo "📊 Dashboard includes:"
    echo "  • Lambda Overview (Invocations, Errors, Duration, Throttles)"
    echo "  • Lambda Errors by Function"
    echo "  • API Gateway Metrics (Count, Latency, Errors)"
    echo "  • RDS Database Metrics (CPU, Connections, Latency, Storage)"
    echo "  • SQS Queue Metrics (Messages Received)"
    echo "  • DLQ Message Count (Should be 0)"
    echo "  • SQS Queue Message Age (Should be < 3600s)"
    echo "  • Lambda Duration Percentiles"
    echo "  • Recent Webhook Logs (ERROR filter)"
    echo ""
else
    echo "❌ Failed to deploy dashboard"
    exit 1
fi
