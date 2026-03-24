#!/bin/bash
set -e

# Enable Performance Insights for Supporter 360 RDS Database
# Performance Insights provides advanced database performance monitoring

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔍 Enabling Performance Insights for Supporter 360..."

# Get AWS account ID and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="eu-west-1"

# Auto-detect database cluster identifier
echo ""
echo "🔍 Detecting database cluster..."
DB_CLUSTER_IDENTIFIER=$(aws rds describe-db-clusters \
    --region "$REGION" \
    --query 'DBClusters[?contains(DBClusterIdentifier, `supporter360`)].DBClusterIdentifier | [0]' \
    --output text)

if [ -z "$DB_CLUSTER_IDENTIFIER" ] || [ "$DB_CLUSTER_IDENTIFIER" = "None" ]; then
    echo "❌ Error: Could not find Supporter 360 database cluster"
    exit 1
fi

echo "📍 Account: $ACCOUNT_ID"
echo "📍 Region: $REGION"
echo "📍 Database Cluster: $DB_CLUSTER_IDENTIFIER"

# Check if database cluster exists
echo ""
echo "🔍 Checking database cluster..."
if ! aws rds describe-db-clusters \
    --db-cluster-identifier "$DB_CLUSTER_IDENTIFIER" \
    --region "$REGION" > /dev/null 2>&1; then
    echo "❌ Error: Database cluster not found: $DB_CLUSTER_IDENTIFIER"
    exit 1
fi

echo "✅ Database cluster found"

# Note: Performance Insights is NOT available for Aurora Serverless v2
# This script provides alternative monitoring setup

echo ""
echo "⚠️  NOTE: Performance Insights is NOT available for Aurora Serverless v2"
echo "   Aurora Serverless v2 uses different performance monitoring capabilities"
echo ""
echo "   Setting up alternative performance monitoring..."
echo ""

# Enable CloudWatch Logs Export for performance schema
echo "📝 Enabling CloudWatch Logs Export for performance monitoring..."
aws rds modify-db-cluster \
    --db-cluster-identifier "$DB_CLUSTER_IDENTIFIER" \
    --cloudwatch-logs-export-configuration '{"EnableLogTypes":["postgresql"],"DisableLogTypes":[]}' \
    --apply-immediately \
    --region "$REGION" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ CloudWatch Logs Export enabled for performance monitoring"
else
    echo "⚠️  Warning: Could not enable CloudWatch Logs Export (may already be enabled)"
fi

# Create CloudWatch Logs Insights saved queries
echo ""
echo "📝 Creating CloudWatch Logs Insights saved queries..."

# Query 1: Slow queries
QUERY_NAME_1="supporter360-slow-queries"
aws logs put-query-definition \
    --name "$QUERY_NAME_1" \
    --log-group-name "/aws/rds/cluster/$DB_CLUSTER_IDENTIFIER/slowquery" \
    --query-string 'fields @timestamp, @message
| filter @message like /duration:/
| parse @message "duration: * ms" as duration
| where duration > 1000
| sort @timestamp desc
| limit 50' \
    --region "$REGION" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "   ✅ Created query: $QUERY_NAME_1"
else
    echo "   ⚠️  Warning: Could not create slow query (may already exist)"
fi

# Query 2: Database errors
QUERY_NAME_2="supporter360-db-errors"
aws logs put-query-definition \
    --name "$QUERY_NAME_2" \
    --log-group-name "/aws/rds/cluster/$DB_CLUSTER_IDENTIFIER/postgresql" \
    --query-string 'fields @timestamp, @message
| filter @message like /ERROR/ or @message like /FATAL/
| sort @timestamp desc
| limit 50' \
    --region "$REGION" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "   ✅ Created query: $QUERY_NAME_2"
else
    echo "   ⚠️  Warning: Could not create error query (may already exist)"
fi

# Query 3: Connection issues
QUERY_NAME_3="supporter360-connection-issues"
aws logs put-query-definition \
    --name "$QUERY_NAME_3" \
    --log-group-name "/aws/rds/cluster/$DB_CLUSTER_IDENTIFIER/postgresql" \
    --query-string 'fields @timestamp, @message
| filter @message like /connection/ or @message like /authentication/
| sort @timestamp desc
| limit 50' \
    --region "$REGION" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "   ✅ Created query: $QUERY_NAME_3"
else
    echo "   ⚠️  Warning: Could not create connection query (may already exist)"
fi

echo ""
echo "✅ Performance monitoring setup complete!"
echo ""
echo "📊 Available monitoring tools:"
echo "   1. CloudWatch Dashboard: https://$REGION.console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=Supporter360-Production"
echo "   2. RDS Metrics: https://$REGION.console.aws.amazon.com/rds/home?region=$REGION#database:id=$DB_CLUSTER_IDENTIFIER;is-cluster=true"
echo "   3. CloudWatch Logs Insights: https://$REGION.console.aws.amazon.com/cloudwatch/home?region=$REGION#logsV2:logs-insights"
echo ""
echo "   Saved Queries:"
echo "   • supporter360-slow-queries - Queries taking > 1 second"
echo "   • supporter360-db-errors - Database errors and failures"
echo "   • supporter360-connection-issues - Connection and authentication issues"
echo ""
