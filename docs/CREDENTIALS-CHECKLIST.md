# Credentials Checklist for Supporter360

Use this checklist to gather all required credentials before populating Secrets Manager.

## Test Account
**Email**: gleesonb@gmail.com
**Purpose**: Verify all integrations are working

---

## 1. Future Ticketing ✅

**Status**: Currently polling (but needs credentials)

**Where to find**:
1. Log into https://external.futureticketing.ie
2. Navigate to Dashboard → Settings → API Credentials
3. You'll see API Key and Private Key

**Required**:
- `apiKey`: Typically looks like `ft_123abc456def`
- `privateKey`: Longer alphanumeric string

**Test**: After updating, check if Bill Gleeson's orders appear in the system

---

## 2. Shopify ⚠️ NEEDS ATTENTION

**Status**: Customer webhooks working, Orders need `read_orders` scope

**Where to find**:
1. Log into https://partners.shopify.com
2. Apps → Gleeson-app
3. App settings → Configuration

**Required**:
- `clientSecret`: Starts with `shpss_`
- `webhookSecret`: HMAC from webhook configuration

**Action Required**:
1. Add `read_orders` scope to the app
2. Reinstall the app on shamrock-rovers-fc.myshopify.com
3. Note the webhook secret for HMAC verification

**Test**: Check if Gleeson's orders appear in Shopify → Orders

---

## 3. Stripe 🔴 CRITICAL

**Status**: LIVE key exposed - must rotate immediately

**Where to find**:
1. Log into https://dashboard.stripe.com
2. Developers → API keys
3. You'll see Publishable key and Secret key
4. Webhooks → Select your webhook → Click "..." → Reveal signing secret

**Required**:
- `secretKey`: Currently `sk_live_51F7JnlK...` (EXPOSED - must rotate!)
  - Roll this key immediately
  - New key will be provided after rolling
- `webhookSecret`: Currently `whsec_8Dxrwl9...` (EXPOSED - must rotate!)
  - Rotate webhook secret
  - Update webhook endpoint if it changes

**Action Required**:
1. Roll the secret key (Stripe Dashboard → API keys → Roll)
2. Rotate webhook secret (Webhooks → Click webhook → Reveal → Rotate)
3. Update webhook endpoint URL to new API Gateway URL (if changed)
4. Use the NEW credentials in Secrets Manager

**Test**: Make a test payment in Stripe and check if it appears in Supporter360

---

## 4. GoCardless 🔴 CRITICAL

**Status**: LIVE token exposed - must rotate immediately

**Where to find**:
1. Log into https://manage.gocardless.com
2. Settings → Developers
3. Access tokens

**Required**:
- `accessToken`: Currently `***REMOVED***` (EXPOSED!)
  - Revoke this token immediately
  - Generate new access token
- `webhookSecret`: Currently `***REMOVED***` (EXPOSED!)
  - Rotate webhook secret
  - Update in GoCardless dashboard

**Action Required**:
1. Revoke the exposed access token
2. Generate a new access token
3. Update webhook secret in GoCardless dashboard
4. Use the NEW credentials in Secrets Manager

**Test**: Create a test mandate/payment and check if it appears in Supporter360

---

## 5. Mailchimp 🔴 CRITICAL

**Status**: API key exposed - must rotate immediately

**Where to find**:
1. Log into https://admin.mailchimp.com
2. Account → Extras → API keys
3. Create or view existing API keys

**Required**:
- `apiKey`: Currently `***REMOVED***` (EXPOSED!)
  - Invalidate this key
  - Generate new API key
  - Format: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-usxx` (datacenter prefix)
- `webhookSecret`: Currently `***REMOVED***` (EXPOSED!)
  - Rotate webhook secret

**Action Required**:
1. Invalidate the exposed API key
2. Generate a new API key
3. Update webhook secret in Mailchimp dashboard
4. Note your audience IDs:
   - Shop customers audience
   - Members audience
   - Season ticket holders audience
   - Everyone audience

**Test**: Subscribe gleesonb@gmail.com to a list and check if it appears in Supporter360

---

## Quick Reference: Credential Rotation Order

1. **Stripe** (highest priority - payment processing)
   - Roll secret key
   - Rotate webhook secret
   - Update webhook endpoint if needed

2. **GoCardless** (direct debit)
   - Revoke access token
   - Generate new token
   - Rotate webhook secret

3. **Mailchimp** (marketing)
   - Invalidate API key
   - Generate new API key
   - Rotate webhook secret

4. **Shopify** (ecommerce)
   - Add `read_orders` scope
   - Reinstall app
   - Get webhook secret

5. **Future Ticketing** (ticketing)
   - Get API key + private key from dashboard

---

## After Rotation

Once you have all NEW credentials:

```bash
# Run the populate script
./scripts/populate-secrets.sh

# It will prompt for each credential:
# - Future Ticketing API Key
# - Future Ticketing Private Key
# - Shopify Client Secret
# - Shopify Webhook Secret
# - Stripe Secret Key (NEW!)
# - Stripe Webhook Secret (NEW!)
# - GoCardless Access Token (NEW!)
# - GoCardless Webhook Secret (NEW!)
# - Mailchimp API Key (NEW!)
# - Mailchimp Webhook Secret (NEW!)
```

---

## Security Notes

⚠️ **Never** commit the actual credentials to git
⚠️ **Always** use test mode when available (`sk_test_` for Stripe)
⚠️ **Monitor** logs for unauthorized access after rotation
⚠️ **Review** all activity in each service dashboard

---

## Verification Checklist

After deployment and credential population:

- [ ] Future Ticketing poller runs without errors
- [ ] Stripe webhooks accept test payments
- [ ] GoCardless webhooks accept test payments
- [ ] Mailchimp webhooks accept test subscriptions
- [ ] Shopify webhooks receive customer/order events
- [ ] Search for gleesonb@gmail.com shows aggregated data
- [ ] Timeline shows events from all sources
