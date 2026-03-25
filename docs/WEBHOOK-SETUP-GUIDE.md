# Webhook Setup Guide

**Purpose:** Quick reference for configuring webhook secrets after deployment.

**Last Updated:** 2026-03-25

---

## API Gateway Base URL

```
https://rxe97dwkr7.execute-api.eu-west-1.amazonaws.com/prod
```

---

## Quick Setup Summary

| Integration | Secret Name | Webhook URL |
|-------------|-------------|-------------|
| Shopify | `supporter360/shopify` | `/webhooks/shopify` |
| Stripe | `supporter360/stripe` | `/webhooks/stripe` |
| GoCardless | `supporter360/gocardless` | `/webhooks/gocardless` |
| Mailchimp | `supporter360/mailchimp` | `/webhooks/mailchimp` |

---

## 1. Shopify

### Where to Find Webhook Secret
1. Go to https://partners.shopify.com/
2. Select "Gleeson-app" → App settings → Webhooks
3. Find EventBridge configuration (already set up)
4. Note: EventBridge uses partner event source, not traditional webhook secret

### AWS Secret to Update
```
supporter360/shopify
```

### Update Command
```bash
aws secretsmanager update-secret \
  --secret-id supporter360/shopify \
  --secret-string '{
    "clientId":"YOUR_CLIENT_ID",
    "clientSecret":"shpss_YOUR_CLIENT_SECRET",
    "webhookSecret":"YOUR_WEBHOOK_SECRET"
  }'
```

### Webhook URL to Register (if using HTTP webhooks)
```
https://rxe97dwkr7.execute-api.eu-west-1.amazonaws.com/prod/webhooks/shopify
```

### Required Events
- `customers/create`
- `customers/update`
- `orders/create`
- `orders/updated`

### Verification
```bash
# Check secret is updated
aws secretsmanager get-secret-value --secret-id supporter360/shopify --query SecretString

# Trigger test webhook from Shopify Partners dashboard
# Check Lambda logs for signature verification success
aws logs tail /aws/lambda/Supporter360StackV2-WebhookHandler --since 5m
```

---

## 2. Stripe

### Where to Find Webhook Secret
1. Go to https://dashboard.stripe.com/
2. Navigate to Developers → Webhooks
3. Click "Add endpoint" (create webhook first)
4. After creation, click on endpoint → "Reveal signing secret"

### AWS Secret to Update
```
supporter360/stripe
```

### Update Command
```bash
aws secretsmanager update-secret \
  --secret-id supporter360/stripe \
  --secret-string '{
    "secretKey":"sk_live_YOUR_SECRET_KEY",
    "webhookSecret":"whsec_YOUR_SIGNING_SECRET"
  }'
```

### Webhook URL to Register
```
https://rxe97dwkr7.execute-api.eu-west-1.amazonaws.com/prod/webhooks/stripe
```

### Required Events
- `charge.succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

### Verification
```bash
# Check secret is updated
aws secretsmanager get-secret-value --secret-id supporter360/stripe --query SecretString

# Send test webhook from Stripe dashboard
# Check Lambda logs
aws logs tail /aws/lambda/Supporter360StackV2-WebhookHandler --since 5m
```

---

## 3. GoCardless

### Where to Find Webhook Secret
1. Go to https://dashboard.gocardless.com/
2. Navigate to Settings → Webhooks
3. Click "Add webhook" (create webhook first)
4. After creation, copy the webhook secret from webhook details

### AWS Secret to Update
```
supporter360/gocardless
```

### Update Command
```bash
aws secretsmanager update-secret \
  --secret-id supporter360/gocardless \
  --secret-string '{
    "accessToken":"live_YOUR_ACCESS_TOKEN",
    "webhookSecret":"YOUR_WEBHOOK_SECRET"
  }'
```

### Webhook URL to Register
```
https://rxe97dwkr7.execute-api.eu-west-1.amazonaws.com/prod/webhooks/gocardless
```

### Required Events
- `payments.created`
- `payments.confirmed`
- `payments.failed`
- `payments.cancelled`
- `mandates.created`
- `mandates.cancelled`
- `subscriptions.created`
- `subscriptions.updated`
- `subscriptions.cancelled`

### Verification
```bash
# Check secret is updated
aws secretsmanager get-secret-value --secret-id supporter360/gocardless --query SecretString

# Send test webhook from GoCardless dashboard
# Check Lambda logs
aws logs tail /aws/lambda/Supporter360StackV2-WebhookHandler --since 5m
```

---

## 4. Mailchimp

### Where to Find Webhook Secret
1. Go to https://admin.mailchimp.com/
2. Navigate to Audience → Settings → Webhooks
3. Click "Create new webhook"
4. Mailchimp sends validation GET request automatically

### AWS Secret to Update
```
supporter360/mailchimp
```

### Update Command
```bash
aws secretsmanager update-secret \
  --secret-id supporter360/mailchimp \
  --secret-string '{
    "apiKey":"us5-YOUR_API_KEY",
    "webhookSecret":"YOUR_WEBHOOK_SECRET",
    "audienceShop":"YOUR_SHOP_AUDIENCE_ID",
    "audienceMembers":"YOUR_MEMBERS_AUDIENCE_ID",
    "audienceSTH":"YOUR_STH_AUDIENCE_ID",
    "audienceEveryone":"YOUR_EVERYONE_AUDIENCE_ID"
  }'
```

### Webhook URL to Register
```
https://rxe97dwkr7.execute-api.eu-west-1.amazonaws.com/prod/webhooks/mailchimp
```

### Required Events
- `subscribe`
- `unsubscribe`
- `profile`
- `upemail`

### Verification
```bash
# Check secret is updated
aws secretsmanager get-secret-value --secret-id supporter360/mailchimp --query SecretString

# Mailchimp validates URL automatically on creation
# Check Lambda logs for validation request
aws logs tail /aws/lambda/Supporter360StackV2-WebhookHandler --since 5m
```

---

## Post-Configuration Verification Steps

### 1. Verify Secrets Are Not Placeholders
```bash
# Check all secrets
aws secretsmanager get-secret-value --secret-id supporter360/shopify --query SecretString
aws secretsmanager get-secret-value --secret-id supporter360/stripe --query SecretString
aws secretsmanager get-secret-value --secret-id supporter360/gocardless --query SecretString
aws secretsmanager get-secret-value --secret-id supporter360/mailchimp --query SecretString
```

### 2. Send Test Webhooks
Each provider dashboard has a "Send test webhook" feature:
- Stripe: Webhooks → Click endpoint → Send test webhook
- GoCardless: Webhooks → Click webhook → Send test
- Mailchimp: Webhooks → Click webhook → Send test
- Shopify: Partners → Webhooks → Send test notification

### 3. Check CloudWatch Logs
```bash
# Watch webhook handler logs
aws logs tail /aws/lambda/Supporter360StackV2-WebhookHandler --follow

# Watch processor logs
aws logs tail /aws/lambda/Supporter360StackV2-Processor --follow
```

### 4. Verify SQS Queues
```bash
# Check main queue has messages (after test webhooks)
aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-1.amazonaws.com/ACCOUNT/webhook-queue \
  --attribute-names ApproximateNumberOfMessages

# Check DLQ is empty
aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-1.amazonaws.com/ACCOUNT/webhook-dlq \
  --attribute-names ApproximateNumberOfMessages
```

### 5. Verify Database Records
```bash
# Connect to RDS and check for recent events
psql -h $DB_HOST -U $DB_USER -d supporter360 -c "
SELECT source_system, event_type, created_at
FROM event
ORDER BY created_at DESC
LIMIT 10;
"
```

---

## Troubleshooting

### "Invalid signature" errors
- Verify webhook secret in Secrets Manager matches provider dashboard
- Check secret format (Stripe: `whsec_...`, GoCardless: alphanumeric)
- Ensure no extra whitespace in secret value

### "Missing signature header" errors
- Provider may not be sending signature
- Check provider webhook settings
- Mailchimp uses basic validation, not HMAC

### Webhooks not received
- Verify API Gateway URL is correct in provider dashboard
- Check API Gateway logs for incoming requests
- Verify Lambda has correct environment variables

### Messages in DLQ
- Check processor Lambda logs for errors
- Verify database connectivity
- Check message format matches expected schema

---

## Related Documents

- [Credentials Checklist](./CREDENTIALS-CHECKLIST.md) - Detailed step-by-step instructions
- [Deployment Guide](./deployment.md) - Deployment procedures
- [Architecture Overview](../CLAUDE.md) - System architecture

---

**Document Owner:** Shamrock Rovers FC IT Team
**Version:** 1.0
