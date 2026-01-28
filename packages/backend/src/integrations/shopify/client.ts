/**
 * Shopify Integration Client
 *
 * Provides methods to interact with the Shopify Admin API and verify webhooks.
 * API Documentation: https://shopify.dev/docs/api/admin-rest
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type {
  ShopifyCustomer,
  ShopifyOrder,
  ShopifyLineItem,
  ShopifyListResponse,
  ShopifyError,
  ShopifyWebhookEventType,
} from './types.js';

export interface ShopifyConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
}

export interface ShopifyClientOptions {
  timeout?: number;
  retryAttempts?: number;
}

/**
 * Shopify API Client
 */
export class ShopifyClient {
  private config: ShopifyConfig;
  private options: Required<ShopifyClientOptions>;
  private baseUrl: string;

  constructor(config: ShopifyConfig, options: ShopifyClientOptions = {}) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion || '2024-01',
    };
    this.options = {
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 3,
    };
    this.baseUrl = `https://${this.config.shopDomain}/admin/api/${this.config.apiVersion}`;
  }

  /**
   * Get a customer by ID
   * @param customerId - The Shopify customer ID
   * @returns The customer object or null if not found
   */
  async getCustomer(customerId: number | string): Promise<ShopifyCustomer | null> {
    try {
      const response = await this.request<{ customer: ShopifyCustomer }>(
        `/customers/${customerId}.json`
      );
      return response.customer;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get orders for a customer
   * @param customerId - The Shopify customer ID
   * @param status - Optional order status filter (any, open, cancelled, closed)
   * @param limit - Maximum number of orders to return (default: 50, max: 250)
   * @returns Array of orders
   */
  async getOrders(
    customerId: number | string,
    status: 'any' | 'open' | 'cancelled' | 'closed' = 'any',
    limit: number = 50
  ): Promise<ShopifyOrder[]> {
    const params = new URLSearchParams({
      limit: Math.min(limit, 250).toString(),
      status,
    });

    const response = await this.request<{ orders: ShopifyOrder[] }>(
      `/customers/${customerId}/orders.json?${params.toString()}`
    );
    return response.orders;
  }

  /**
   * Get an order by ID
   * @param orderId - The Shopify order ID
   * @returns The order object or null if not found
   */
  async getOrder(orderId: number | string): Promise<ShopifyOrder | null> {
    try {
      const response = await this.request<{ order: ShopifyOrder }>(
        `/orders/${orderId}.json`
      );
      return response.order;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get orders created or updated since a given date
   * @param since - ISO 8601 date string
   * @param limit - Maximum number of orders to return
   * @returns Array of orders
   */
  async getOrdersSince(since: string, limit: number = 250): Promise<ShopifyOrder[]> {
    const params = new URLSearchParams({
      limit: Math.min(limit, 250).toString(),
      updated_at_min: since,
    });

    const response = await this.request<{ orders: ShopifyOrder[] }>(
      `/orders.json?${params.toString()}`
    );
    return response.orders;
  }

  /**
   * Verify a Shopify webhook signature
   * @param rawBody - The raw request body as a buffer or string
   * @param signature - The HMAC SHA-256 signature from the X-Shopify-Hmac-Sha256 header
   * @returns True if the signature is valid, false otherwise
   */
  verifyWebhook(rawBody: Buffer | string, signature: string): boolean {
    // Ensure rawBody is a buffer for consistent hashing
    const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);

    // Compute HMAC SHA-256
    const hmac = createHmac('sha256', this.config.accessToken);
    hmac.update(bodyBuffer);
    const computedSignature = hmac.digest('base64');

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature);
    const computedBuffer = Buffer.from(computedSignature);

    if (signatureBuffer.length !== computedBuffer.length) {
      return false;
    }

    try {
      return timingSafeEqual(signatureBuffer, computedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Verify webhook and parse the JSON payload
   * @param rawBody - The raw request body
   * @param signature - The HMAC signature
   * @returns The parsed webhook topic and data
   */
  async parseWebhook<T = unknown>(
    rawBody: Buffer | string,
    signature: string,
    topic: ShopifyWebhookEventType
  ): Promise<{ valid: boolean; data: T | null; error?: string }> {
    if (!this.verifyWebhook(rawBody, signature)) {
      return { valid: false, data: null, error: 'Invalid webhook signature' };
    }

    try {
      const data = JSON.parse(rawBody.toString()) as T;
      return { valid: true, data };
    } catch {
      return { valid: false, data: null, error: 'Invalid JSON payload' };
    }
  }

  /**
   * Make an authenticated request to the Shopify API
   */
  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.options.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': this.config.accessToken,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Handle rate limiting
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : this.calculateBackoff(attempt);

            if (attempt < this.options.retryAttempts - 1) {
              await this.sleep(delay);
              continue;
            }
          }

          const error = await response.text();
          throw new ShopifyApiError(
            `Shopify API error: ${response.status} - ${error}`,
            response.status
          );
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on 4xx errors (except 429)
        if (error instanceof ShopifyApiError && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }

        // Retry on network errors or 5xx
        if (attempt < this.options.retryAttempts - 1) {
          await this.sleep(this.calculateBackoff(attempt));
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    // Exponential backoff: 2^attempt * 100ms, with jitter
    const baseDelay = Math.pow(2, attempt) * 100;
    const jitter = Math.random() * 100;
    return Math.min(baseDelay + jitter, 5000); // Cap at 5 seconds
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if an error is a "not found" error
   */
  private isNotFoundError(error: unknown): boolean {
    return error instanceof ShopifyApiError && error.status === 404;
  }
}

/**
 * Custom error class for Shopify API errors
 */
export class ShopifyApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ShopifyApiError';
  }
}

/**
 * Factory function to create a configured Shopify client from environment variables
 */
export function createShopifyClient(): ShopifyClient {
  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shopDomain || !accessToken) {
    throw new Error('Missing Shopify configuration: SHOPIFY_SHOP_DOMAIN and SHOPIFY_ACCESS_TOKEN are required');
  }

  return new ShopifyClient({ shopDomain, accessToken });
}

// Export types
export type { ShopifyCustomer, ShopifyOrder, ShopifyLineItem, ShopifyWebhookEventType };
