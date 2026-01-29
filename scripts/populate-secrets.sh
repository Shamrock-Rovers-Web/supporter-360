#!/bin/bash
set -e

# Script to populate AWS Secrets Manager with integration credentials
# Usage: ./scripts/populate-secrets.sh

AWS_REGION="${AWS_REGION:-eu-west-1}"
AWS_PROFILE="${AWS_PROFILE:-srfc}"

echo "🔐 Populating Secrets Manager for Supporter360..."
echo "Region: $AWS_REGION"
echo "Profile: $AWS_PROFILE"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &>/dev/null; then
    echo "❌ AWS profile '$AWS_PROFILE' not configured or invalid"
    exit 1
fi

# Prompt for each credential
echo "==================================="
echo "📝 Future Ticketing Credentials"
echo "==================================="
read -p "FT API Key: " FT_API_KEY
read -p "FT Private Key: " FT_PRIVATE_KEY

echo ""
echo "==================================="
echo "📝 Shopify Credentials"
echo "==================================="
read -p "Shopify Client Secret: " SHOPIFY_CLIENT_SECRET
read -p "Shopify Webhook Secret: " SHOPIFY_WEBHOOK_SECRET

echo ""
echo "==================================="
echo "📝 Stripe Credentials"
echo "==================================="
read -p "Stripe Secret Key (sk_live_...): " STRIPE_SECRET_KEY
read -p "Stripe Webhook Secret (whsec_...): " STRIPE_WEBHOOK_SECRET

echo ""
echo "==================================="
echo "📝 GoCardless Credentials"
echo "==================================="
read -p "GoCardless Access Token: " GC_ACCESS_TOKEN
read -p "GoCardless Webhook Secret: " GC_WEBHOOK_SECRET

echo ""
echo "==================================="
echo "📝 Mailchimp Credentials"
echo "==================================="
read -p "Mailchimp API Key (xxx-xxxxxxxxxxxxxx-usxx): " MC_API_KEY
read -p "Mailchimp Webhook Secret: " MC_WEBHOOK_SECRET

echo ""
echo "==================================="
echo "💾 Creating secrets in AWS Secrets Manager..."
echo "==================================="

# Future Ticketing
aws secretsmanager create-secret \
    --name supporter360/future-ticketing \
    --description "Future Ticketing API credentials (apiKey, privateKey)" \
    --secret-string "{\"apiKey\":\"$FT_API_KEY\",\"privateKey\":\"$FT_PRIVATE_KEY\"}" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" 2>/dev/null || \
aws secretsmanager put-secret-value \
    --secret-id supporter360/future-ticketing \
    --secret-string "{\"apiKey\":\"$FT_API_KEY\",\"privateKey\":\"$FT_PRIVATE_KEY\"}" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"

echo "✅ Future Ticketing secret created/updated"

# Shopify
aws secretsmanager create-secret \
    --name supporter360/shopify \
    --description "Shopify integration credentials (clientSecret, webhookSecret)" \
    --secret-string "{\"clientSecret\":\"$SHOPIFY_CLIENT_SECRET\",\"webhookSecret\":\"$SHOPIFY_WEBHOOK_SECRET\"}" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" 2>/dev/null || \
aws secretsmanager put-secret-value \
    --secret-id supporter360/shopify \
    --secret-string "{\"clientSecret\":\"$SHOPIFY_CLIENT_SECRET\",\"webhookSecret\":\"$SHOPIFY_WEBHOOK_SECRET\"}" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"

echo "✅ Shopify secret created/updated"

# Stripe
aws secretsmanager create-secret \
    --name supporter360/stripe \
    --description "Stripe integration credentials (secretKey, webhookSecret)" \
    --secret-string "{\"secretKey\":\"$STRIPE_SECRET_KEY\",\"webhookSecret\":\"$STRIPE_WEBHOOK_SECRET\"}" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" 2>/dev/null || \
aws secretsmanager put-secret-value \
    --secret-id supporter360/stripe \
    --secret-string "{\"secretKey\":\"$STRIPE_SECRET_KEY\",\"webhookSecret\":\"$STRIPE_WEBHOOK_SECRET\"}" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"

echo "✅ Stripe secret created/updated"

# GoCardless
aws secretsmanager create-secret \
    --name supporter360/gocardless \
    --description "GoCardless integration credentials (accessToken, webhookSecret)" \
    --secret-string "{\"accessToken\":\"$GC_ACCESS_TOKEN\",\"webhookSecret\":\"$GC_WEBHOOK_SECRET\"}" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" 2>/dev/null || \
aws secretsmanager put-secret-value \
    --secret-id supporter360/gocardless \
    --secret-string "{\"accessToken\":\"$GC_ACCESS_TOKEN\",\"webhookSecret\":\"$GC_WEBHOOK_SECRET\"}" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"

echo "✅ GoCardless secret created/updated"

# Mailchimp
aws secretsmanager create-secret \
    --name supporter360/mailchimp \
    --description "Mailchimp integration credentials (apiKey, webhookSecret)" \
    --secret-string "{\"apiKey\":\"$MC_API_KEY\",\"webhookSecret\":\"$MC_WEBHOOK_SECRET\"}" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" 2>/dev/null || \
aws secretsmanager put-secret-value \
    --secret-id supporter360/mailchimp \
    --secret-string "{\"apiKey\":\"$MC_API_KEY\",\"webhookSecret\":\"$MC_WEBHOOK_SECRET\"}" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"

echo "✅ Mailchimp secret created/updated"

echo ""
echo "==================================="
echo "✅ All secrets populated successfully!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Deploy the CDK stack: cd packages/infrastructure && npm run build && cdk deploy"
echo "2. Verify secrets are accessible: aws secretsmanager get-secret-value --secret-id supporter360/future-ticketing --profile $AWS_PROFILE"
