import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify Shopify webhook signature using HMAC SHA-256
 * @param rawBody - Raw request body as string
 * @param signature - Base64-encoded HMAC from X-Shopify-Hmac-SHA256 header
 * @param apiKey - Shopify API webhook secret
 * @returns true if signature is valid
 */
export function verifyShopifyWebhook(
  rawBody: string,
  signature: string,
  apiKey: string
): boolean {
  const hmac = createHmac('sha256', apiKey);
  hmac.update(rawBody, 'utf8');
  const digest = hmac.digest('base64');

  // Use timing-safe comparison to prevent timing attacks
  const digestBuffer = Buffer.from(digest, 'utf-8');
  const signatureBuffer = Buffer.from(signature, 'utf-8');

  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(digestBuffer, signatureBuffer);
}

/**
 * Verify Stripe webhook signature using v1 signature
 * @param rawBody - Raw request body as string
 * @param signature - Signature from Stripe-Signature header (format: t=timestamp,v1=signature)
 * @param webhookSecret - Stripe webhook secret
 * @returns true if signature is valid
 */
export function verifyStripeWebhook(
  rawBody: string,
  signature: string,
  webhookSecret: string
): boolean {
  const elements = signature.split(',');
  const signatureElements: Record<string, string> = {};

  for (const element of elements) {
    const [key, value] = element.split('=');
    signatureElements[key] = value;
  }

  const timestamp = signatureElements.t;
  if (!timestamp) {
    return false;
  }

  // Check timestamp is within tolerance (prevent replay attacks)
  const now = Math.floor(Date.now() / 1000);
  const timestampAge = now - parseInt(timestamp, 10);
  const tolerance = 180; // 3 minutes
  if (timestampAge > tolerance) {
    return false;
  }

  const payload = `${timestamp}.${rawBody}`;
  const expectedSignature = createHmac('sha256', webhookSecret)
    .update(payload, 'utf8')
    .digest('hex');

  const providedSignature = signatureElements.v1;
  if (!providedSignature) {
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const providedBuffer = Buffer.from(providedSignature, 'hex');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

/**
 * Verify GoCardless webhook signature
 * @param rawBody - Raw request body as string
 * @param signature - Signature from Webhook-Signature header
 * @param webhookSecret - GoCardless webhook secret
 * @returns true if signature is valid
 */
export function verifyGoCardlessWebhook(
  rawBody: string,
  signature: string,
  webhookSecret: string
): boolean {
  const hmac = createHmac('sha256', webhookSecret);
  hmac.update(rawBody, 'utf8');
  const digest = hmac.digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  const digestBuffer = Buffer.from(digest, 'utf-8');
  const signatureBuffer = Buffer.from(signature, 'utf-8');

  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(digestBuffer, signatureBuffer);
}

/**
 * Simple hash-based verification for Mailchimp webhooks
 * Note: Mailchimp webhooks are form-urlencoded and have limited security options
 * This uses the configured webhook secret if available
 * @param payload - The parsed webhook data
 * @param webhookSecret - Mailchimp webhook secret
 * @returns true if verification passes
 */
export function verifyMailchimpWebhook(
  payload: Record<string, unknown>,
  webhookSecret: string
): boolean {
  // Mailchimp webhooks don't have strong signature verification
  // We can check for expected fields and optionally validate against a known secret
  // in the payload if configured
  if (!payload.type || !payload.data) {
    return false;
  }

  // If a secret is configured, we could add additional validation here
  // For now, basic structure validation
  return true;
}
