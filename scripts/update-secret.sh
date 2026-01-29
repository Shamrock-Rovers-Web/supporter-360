#!/bin/bash
# Update a single secret in AWS Secrets Manager
# Usage: ./scripts/update-secret.sh <secret-name> <json-payload>
# Example: ./scripts/update-secret.sh supporter360/future-ticketing '{"apiKey":"xxx","privateKey":"yyy"}'

set -e

AWS_REGION="${AWS_REGION:-eu-west-1}"
AWS_PROFILE="${AWS_PROFILE:-srfc}"

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "❌ Usage: $0 <secret-name> <json-payload>"
    echo ""
    echo "Examples:"
    echo "  $0 supporter360/future-ticketing '{\"apiKey\":\"xxx\",\"privateKey\":\"yyy\"}'"
    echo "  $0 supporter360/stripe '{\"secretKey\":\"sk_live_...\",\"webhookSecret\":\"whsec_...\"}'"
    exit 1
fi

SECRET_NAME="$1"
SECRET_VALUE="$2"

echo "🔐 Updating secret: $SECRET_NAME"
echo "Region: $AWS_REGION"
echo "Profile: $AWS_PROFILE"
echo ""

# Validate JSON syntax
if ! echo "$SECRET_VALUE" | jq empty 2>/dev/null; then
    echo "❌ Invalid JSON provided"
    exit 1
fi

# Update secret
aws secretsmanager put-secret-value \
    --secret-id "$SECRET_NAME" \
    --secret-string "$SECRET_VALUE" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Secret updated successfully!"
    echo ""
    echo "⚠️  Note: Lambda functions may take 1-2 minutes to pick up the new value."
    echo "If you need immediate effect, you can restart the Lambda functions."
else
    echo "❌ Failed to update secret"
    exit 1
fi
