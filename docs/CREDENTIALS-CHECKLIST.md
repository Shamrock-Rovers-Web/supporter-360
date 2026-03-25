# Webhook Credentials Checklist

**Purpose:** Track collection and configuration of webhook signing secrets for all external integrations.

**Last Updated:** 2026-03-24
**Status:** IN PROGRESS - All secrets are placeholders

---

## API Gateway Base URL

```
https://rxe97dwkr7.execute-api.eu-west-1.amazonaws.com/prod
```

**Webhook Endpoints:**
- Shopify: `https://rxe97dwkr7.execute-api.eu-west-1.amazonaws.com/prod/webhooks/shopify`
- Stripe: `https://rxe97dwkr7.execute-api.eu-west-1.amazonaws.com/prod/webhooks/stripe`
- GoCardless: `https://rxe97dwkr7.execute-api.eu-west-1.amazonaws.com/prod/webhooks/gocardless`
- Mailchimp: `https://rxe97dwkr7.execute-api.eu-west-1.amazonaws.com/prod/webhooks/mailchimp`

---

## Integration Status Summary

| Integration | API Key | Webhook Secret | Webhook Registered | Signature Status | Events Flowing |
|-------------|---------|----------------|-------------------|------------------|----------------|
| **Shopify** | ❌ Placeholder | ❌ Placeholder | ⚠️ Partial (EventBridge) | ❌ N/A | ✅ Customers only |
| **Stripe** | ❌ Placeholder | ❌ Placeholder | ❌ No | ❌ Failing | ❌ No |
| **GoCardless** | ❌ Placeholder | ❌ Placeholder | ❌ No | ❌ Failing | ❌ No |
| **Mailchimp** | ❌ Placeholder | ❌ Placeholder | ❌ No | ❌ Failing | ❌ No |
| **Future Ticketing** | ✅ Configured | N/A | N/A (Polling) | N/A | ✅ Yes |

---

## Quick Reference: Update All Secrets

```bash
# 1. Shopify
aws secretsmanager update-secret \
  --secret-id supporter360/shopify \
  --secret-string '{"clientId":"ACTUAL_CLIENT_ID","clientSecret":"ACTUAL_CLIENT_SECRET","webhookSecret":"ACTUAL_WEBHOOK_SECRET"}'

# 2. Stripe
aws secretsmanager update-secret \
  --secret-id supporter360/stripe \
  --secret-string '{"secretKey":"sk_live_...","webhookSecret":"whsec_..."}'

# 3. GoCardless
aws secretsmanager update-secret \
  --secret-id supporter360/gocardless \
  --secret-string '{"accessToken":"live_...","webhookSecret":"..."}'

# 4. Mailchimp
aws secretsmanager update-secret \
  --secret-id supporter360/mailchimp \
  --secret-string '{"apiKey":"us5-...","webhookSecret":"...","audienceShop":"...","audienceMembers":"...","audienceSTH":"...","audienceEveryone":"..."}'
```

**For detailed step-by-step instructions for each integration, see the sections below.**

---

## Document Sections

1. [Shopify Integration](#1-shopify-integration)
2. [Stripe Integration](#2-stripe-integration)
3. [GoCardless Integration](#3-gocardless-integration)
4. [Mailchimp Integration](#4-mailchimp-integration)
5. [Testing Checklist](#testing-checklist)
6. [Troubleshooting](#troubleshooting)
7. [Security Best Practices](#security-best-practices)
8. [Completion Checklist](#completion-checklist)

---

## 1. Shopify Integration

### Secret Name: `supporter360/shopify`

### Current Status
- **Secrets Manager:** ❌ All values are placeholders
- **Webhook Registration:** ⚠️ Partial
  - ✅ EventBridge partner event source configured
  - ✅ Customer webhooks working (customers/create, customers/update)
  - ❌ Order webhooks blocked - missing `read_orders` app scope

### Required Credentials

#### 1. Client ID
- **Where to get:** Shopify Partners → Your App → App settings → Client credentials
- **Format:** Alphanumeric string (e.g., `e5e5abc1adf25556a930aa87dba80d97`)
- **Current value:** `placeholder-update`
- **Steps:**
  1. Go to https://partners.shopify.com/
  2. Select "Gleeson-app"
  3. Navigate to App settings → Client credentials
  4. Copy Client ID
  5. Update secret (see "Update Secret" section below)

#### 2. Client Secret
- **Where to get:** Shopify Partners → Your App → App settings → Client credentials
- **Format:** Starts with `shpss_` (e.g., `shpss_abc123...`)
- **Current value:** `placeholder-update`
- **Steps:**
  1. In Shopify Partners, same location as Client ID
  2. Click "Reveal" or "Show" next to Client Secret
  3. Copy the secret
  4. Update secret

#### 3. Webhook Secret (EventBridge)
- **Where to get:** Shopify Partners → Your App → Webhooks
- **Format:** Alphanumeric string
- **Current value:** `placeholder-update`
- **Note:** EventBridge webhooks don't use HMAC signatures like HTTP webhooks
- **Steps:**
  1. Go to Shopify Partners → Gleeson-app → Webhooks
  2. Find the EventBridge webhook configuration
  3. Note the webhook secret (if available)
  4. Update secret

### ⚠️ CRITICAL: Fix Shopify Orders Webhook

**Problem:** Orders webhooks are not being received because the app lacks `read_orders` scope.

**Solution:**
1. Go to Shopify Partners → Gleeson-app → App settings → Configuration
2. Add "Read Orders" to the app's scoped access
3. Reinstall the app on the store
4. Verify orders webhooks are registered

### Webhook Registration Steps

#### Option A: EventBridge (Recommended - Already Configured)
✅ **Status:** Already configured
- Event Bus: `aws.partner/shopify.com/313809895425/supporter360`
- Topics: `customers/create`, `customers/update`, `orders/create`, `orders/updated`

**Action Required:** Fix orders webhooks by adding `read_orders` scope (see above)

#### Option B: HTTP Webhooks (Alternative)
1. Go to Shopify Admin → Settings → Notifications → Webhooks
2. Click "Create webhook"
3. Enter webhook URL: `https://rxe97dwkr7.execute-api.eu-west-1.amazonaws.com/prod/webhooks/shopify`
4. Select event topics:
   - `customers/create`
   - `customers/update`
   - `orders/create`
   - `orders/updated`
5. Webhook API version: latest
6. Copy webhook secret and update Secrets Manager

### Update Secret Command

```bash
# After collecting all credentials
aws secretsmanager update-secret \
  --secret-id supporter360/shopify \
  --secret-string '{
    "clientId":"ACTUAL_CLIENT_ID_FROM_SHOPIFY_PARTNERS",
    "clientSecret":"ACTUAL_SHOPIFY_CLIENT_SECRET_STARTING_WITH_SHPSS_",
    "webhookSecret":"ACTUAL_WEBHOOK_SECRET_IF_USING_HTTP_WEBHOOKS"
  }'
```

---

## 2. Stripe Integration

### Secret Name: `supporter360/stripe`

### Current Status
- **Secrets Manager:** ❌ All values are placeholders
- **Webhook Registration:** ❌ Not configured
- **Signature Verification:** ❌ Failing (secret is placeholder)

### Required Credentials

#### 1. Secret Key
- **Where to get:** Stripe Dashboard → Developers → API keys
- **Format:** Starts with `sk_live_` (production) or `sk_test_` (test mode)
- **Current value:** `placeholder-update`
- **Steps:**
  1. Go to https://dashboard.stripe.com/
  2. Navigate to Developers → API keys
  3. Find "Secret key"
  4. Click "Reveal" to see the full key
  5. Copy the key (starts with `sk_live_` or `sk_test_`)
  6. Update secret

#### 2. Webhook Signing Secret
- **Where to get:** Stripe Dashboard → Developers → Webhooks → Click webhook endpoint
- **Format:** Starts with `whsec_` (e.g., `whsec_abc123...`)
- **Current value:** `placeholder-update`
- **Steps:**
  1. Go to Stripe Dashboard → Developers → Webhooks
  2. **First, register the webhook** (see "Webhook Registration" below)
  3. Click on the newly created webhook endpoint
  4. Click "Reveal signing secret" in the webhook details
  5. Copy the signing secret (starts with `whsec_`)
  6. Update secret

### Webhook Registration Steps

1. **Create Webhook Endpoint**
   ```
   1. Go to https://dashboard.stripe.com/
   2. Navigate to Developers → Webhooks
   3. Click "Add endpoint"
   4. Endpoint URL: https://rxe97dwkr7.execute-api.eu-west-1.amazonaws.com/prod/webhooks/stripe
   5. Click "Add endpoint"
   ```

2. **Select Events to Listen For**

   Click "Listen to events" and select:
   - `charge.succeeded` - When a payment succeeds
   - `customer.subscription.created` - When a subscription is created
   - `customer.subscription.updated` - When a subscription is updated
   - `customer.subscription.deleted` - When a subscription is cancelled
   - `invoice.paid` - When an invoice is paid
   - `invoice.payment_failed` - When a payment fails

3. **Copy Webhook Signing Secret**
   - After creating the webhook, click on it
   - Find "Signing secret" section
   - Click "Reveal" to see `whsec_...` string
   - Copy this secret

### Update Secret Command

```bash
# After registering webhook and collecting credentials
aws secretsmanager update-secret \
  --secret-id supporter360/stripe \
  --secret-string '{
    "secretKey":"sk_live_YOUR_ACTUAL_STRIPE_SECRET_KEY",
    "webhookSecret":"whsec_YOUR_ACTUAL_WEBHOOK_SIGNING_SECRET"
  }'
```

---

## 3. GoCardless Integration

### Secret Name: `supporter360/gocardless`

### Current Status
- **Secrets Manager:** ❌ All values are placeholders
- **Webhook Registration:** ❌ Not configured
- **Signature Verification:** ❌ Failing (secret is placeholder)

### Required Credentials

#### 1. Access Token
- **Where to get:** GoCardless Dashboard → Settings → Developers
- **Format:** Starts with `live_` (production) or `sandbox_` (test mode)
- **Current value:** `placeholder-update`
- **Steps:**
  1. Go to https://dashboard.gocardless.com/
  2. Navigate to Settings → Developers
  3. Find "Access token" section
  4. Click "Generate access token" if not exists
  5. Copy the access token
  6. Update secret

#### 2. Webhook Secret
- **Where to get:** GoCardless Dashboard → Settings → Webhooks → Click webhook
- **Format:** Alphanumeric string (generated when you create a webhook)
- **Current value:** `placeholder-update`
- **Steps:**
  1. Go to GoCardless Dashboard → Settings → Webhooks
  2. **First, register the webhook** (see "Webhook Registration" below)
  3. Click on the newly created webhook
  4. Find "Webhook secret" section
  5. Copy the webhook secret
  6. Update secret

### Webhook Registration Steps

1. **Create Webhook Endpoint**
   ```
   1. Go to https://dashboard.gocardless.com/
   2. Navigate to Settings → Webhooks
   3. Click "Add webhook"
   4. Endpoint URL: https://rxe97dwkr7.execute-api.eu-west-1.amazonaws.com/prod/webhooks/gocardless
   5. Click "Save webhook"
   ```

2. **Select Events to Send**

   After creating the webhook, click "Edit" and select:
   - `payments.created` - When a payment is created
   - `payments.confirmed` - When a payment is confirmed
   - `payments.failed` - When a payment fails
   - `payments.cancelled` - When a payment is cancelled
   - `mandates.created` - When a mandate is created
   - `mandates.cancelled` - When a mandate is cancelled
   - `subscriptions.created` - When a subscription is created
   - `subscriptions.updated` - When a subscription is updated
   - `subscriptions.cancelled` - When a subscription is cancelled

3. **Copy Webhook Secret**
   - After creating the webhook, click on it
   - Find "Webhook secret" section
   - Copy the webhook secret

### Update Secret Command

```bash
# After registering webhook and collecting credentials
aws secretsmanager update-secret \
  --secret-id supporter360/gocardless \
  --secret-string '{
    "accessToken":"live_YOUR_ACTUAL_GOCARDLESS_ACCESS_TOKEN",
    "webhookSecret":"YOUR_ACTUAL_WEBHOOK_SECRET"
  }'
```

---

## 4. Mailchimp Integration

### Secret Name: `supporter360/mailchimp`

### Current Status
- **Secrets Manager:** ❌ All values are placeholders
- **Webhook Registration:** ❌ Not configured
- **Signature Verification:** ⚠️ Not required (Mailchimp uses basic validation)

### Required Credentials

#### 1. API Key
- **Where to get:** Mailchimp Audience → Settings → API keys
- **Format:** `{datacenter}-{key}` (e.g., `us5-abc123def456...`)
- **Current value:** `placeholder-update`
- **Steps:**
  1. Go to https://admin.mailchimp.com/
  2. Navigate to Audience → Settings → API keys
  3. Click "Create A Key" if not exists
  4. Copy the API key (note the datacenter prefix like `us5`)
  5. Update secret

#### 2. Webhook Secret
- **Where to get:** Mailchimp Audience → Settings → Webhooks → Click webhook
- **Format:** Alphanumeric string
- **Current value:** `placeholder-update`
- **Note:** Mailchimp webhooks don't use HMAC signatures for validation
- **Purpose:** Used for basic validation (Mailchimp sends a GET request first)

#### 3. Audience IDs
- **Where to get:** Mailchimp Audience → Settings → Audience name and defaults
- **Format:** Alphanumeric string (e.g., `a1b2c3d4e5f6`)
- **Required:**
  - `audienceShop` - Audience ID for shop customers
  - `audienceMembers` - Audience ID for members
  - `audienceSTH` - Audience ID for season ticket holders
  - `audienceEveryone` - Audience ID for all supporters
- **Steps:**
  1. For each audience, go to Audience → Settings → Audience name and defaults
  2. Copy the Audience ID
  3. Update secret with all audience IDs

### Webhook Registration Steps

1. **Create Webhook Endpoint**
   ```
   1. Go to https://admin.mailchimp.com/
   2. Navigate to Audience → Settings → Webhooks
   3. Click "Create new webhook"
   4. Callback URL: https://rxe97dwkr7.execute-api.eu-west-1.amazonaws.com/prod/webhooks/mailchimp
   5. Click "Save"
   ```

2. **Select Events to Send**

   After creating the webhook, select these events:
   - `subscribe` - When someone subscribes to the audience
   - `unsubscribe` - When someone unsubscribes
   - `profile` - When someone updates their profile
   - `upemail` - When someone changes their email address
   - `campaign` - When campaign activity occurs (optional)

3. **Validation**
   - Mailchimp will send a GET request to validate the URL
   - The webhook handler will automatically respond to the validation request

### Update Secret Command

```bash
# After registering webhook and collecting credentials
aws secretsmanager update-secret \
  --secret-id supporter360/mailchimp \
  --secret-string '{
    "apiKey":"us5-YOUR_ACTUAL_MAILCHIMP_API_KEY",
    "webhookSecret":"YOUR_WEBHOOK_SECRET_IF_AVAILABLE",
    "audienceShop":"YOUR_SHOP_AUDIENCE_ID",
    "audienceMembers":"YOUR_MEMBERS_AUDIENCE_ID",
    "audienceSTH":"YOUR_STH_AUDIENCE_ID",
    "audienceEveryone":"YOUR_EVERYONE_AUDIENCE_ID"
  }'
```

---

## Testing Checklist

After configuring each integration, complete these tests:

### Phase 1: Secret Configuration
- [ ] Secrets Manager updated with actual credentials
- [ ] Secret values verified (not placeholders)
- [ ] API keys/access tokens are correct
- [ ] Webhook secrets are collected

### Phase 2: Webhook Registration
- [ ] Webhook URLs registered with external provider
- [ ] Appropriate events selected
- [ ] Webhook secrets copied from provider dashboard
- [ ] Webhook endpoint validated (provider sends test request)

### Phase 3: Signature Verification
- [ ] Webhook handler logs show successful signature verification
- [ ] No "missing signature" or "invalid signature" warnings
- [ ] Test webhooks accepted and queued

### Phase 4: Message Processing
- [ ] SQS queue receives messages
- [ ] DLQ remains empty
- [ ] Processor logs show successful processing
- [ ] Database records created/updated

### Phase 5: End-to-End Verification
- [ ] Test event triggered in external system
- [ ] Webhook received by API Gateway
- [ ] Message queued in SQS
- [ ] Processor consumes message
- [ ] Database updated with new data
- [ ] API returns new data in search/profile/timeline

---

## Completion Checklist

When all webhooks are configured and tested:

- [ ] All 4 integrations have actual credentials (not placeholders)
- [ ] All webhooks registered with external providers
- [ ] Signature verification working for all webhooks
- [ ] Test events flowing through system
- [ ] DLQs empty
- [ ] Database populated with integration data
- [ ] CloudWatch logs showing successful processing
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Runbooks created for troubleshooting

**Next Steps:**
1. Complete webhook configuration
2. Run end-to-end tests
3. Set up monitoring and alerts
4. Create runbooks
5. Handoff to operations team

---

**Document Owner:** gleesonb@gmail.com
**Last Modified:** 2026-03-24
**Version:** 1.0
