/**
 * Mailchimp Integration Client
 *
 * Provides methods to interact with the Mailchimp Marketing API for managing
 * audiences, members, and tags across multiple configured audiences.
 * API Documentation: https://mailchimp.com/developer/marketing/api/
 */

import { createHash } from 'crypto';
import type {
  MailchimpAudience,
  MailchimpMember,
  MailchimpTagFull,
  MailchimpClickEvent,
  MailchimpClickReport,
  MailchimpListResponse,
  MailchimpAudienceConfig,
} from './types.js';

export interface MailchimpConfig {
  apiKey: string;
  apiVersion?: string;
  audiences?: MailchimpAudienceConfig[];
}

export interface MailchimpClientOptions {
  timeout?: number;
  retryAttempts?: number;
}

/**
 * Mailchimp API Client
 */
export class MailchimpClient {
  private config: MailchimpConfig;
  private options: Required<MailchimpClientOptions>;
  private baseUrl: string;
  private dataCenter: string;

  constructor(config: MailchimpConfig, options: MailchimpClientOptions = {}) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion || '3.0',
      audiences: config.audiences || [],
    };
    this.options = {
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 3,
    };
    this.dataCenter = this.extractDataCenter(this.config.apiKey);
    this.baseUrl = `https://${this.dataCenter}.api.mailchimp.com/${this.config.apiVersion}`;
  }

  /**
   * Extract data center from API key (format: xxxxxxxxxxxxxxxxxxxxxxxx-usX)
   */
  private extractDataCenter(apiKey: string): string {
    const match = apiKey.match(/-(.+)$/);
    return match ? match[1] : 'us1';
  }

  /**
   * Get all configured audiences
   * @returns Array of audience configurations
   */
  getConfiguredAudiences(): MailchimpAudienceConfig[] {
    return this.config.audiences || [];
  }

  /**
   * Get a list of all audiences (lists) in the Mailchimp account
   * @param count - Number of audiences to return (default: 100)
   * @param offset - Number of audiences to skip (for pagination)
   * @returns Array of audiences
   */
  async getAllAudiences(count: number = 100, offset: number = 0): Promise<MailchimpAudience[]> {
    const params = new URLSearchParams({
      count: Math.min(count, 1000).toString(),
      offset: offset.toString(),
    });

    const response = await this.request<{ lists: MailchimpAudience[] }>(
      `/lists?${params.toString()}`
    );
    return response.lists || [];
  }

  /**
   * Get a specific audience by ID
   * @param audienceId - The Mailchimp audience ID
   * @returns The audience or null if not found
   */
  async getAudience(audienceId: string): Promise<MailchimpAudience | null> {
    try {
      const response = await this.request<MailchimpAudience>(`/lists/${audienceId}`);
      return response;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get a member from an audience by email address
   * @param audienceId - The audience ID
   * @param email - The member's email address
   * @returns The member or null if not found
   */
  async getMember(audienceId: string, email: string): Promise<MailchimpMember | null> {
    const subscriberHash = this.hashEmail(email);

    try {
      const response = await this.request<MailchimpMember>(
        `/lists/${audienceId}/members/${subscriberHash}`
      );
      return response;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Find a member across all configured audiences
   * @param email - The member's email address
   * @returns Array of { audienceId, member } tuples
   */
  async getMemberAudiences(email: string): Promise<Array<{ audienceId: string; audienceName: string; member: MailchimpMember | null }>> {
    const audiences = this.config.audiences.length > 0
      ? this.config.audiences.filter(a => a.enabled)
      : await this.getAllAudiences();

    const results = await Promise.all(
      audiences.map(async (audience) => {
        const audienceId = typeof audience === 'string' ? audience : audience.id;
        const member = await this.getMember(audienceId, email);

        // Get audience name if not already present
        let audienceName = typeof audience === 'string' ? '' : audience.name;
        if (!audienceName) {
          const fullAudience = await this.getAudience(audienceId);
          audienceName = fullAudience?.name || '';
        }

        return {
          audienceId,
          audienceName,
          member,
        };
      })
    );

    return results.filter(r => r.member !== null);
  }

  /**
   * Add or update a member in an audience
   * @param audienceId - The audience ID
   * @param email - The member's email
   * @param status - The subscription status
   * @param mergeFields - Optional merge fields
   * @param tags - Optional tags to set
   * @returns The created or updated member
   */
  async upsertMember(
    audienceId: string,
    email: string,
    status: 'subscribed' | 'pending' | 'unsubscribed' | 'cleaned' = 'pending',
    mergeFields?: Record<string, unknown>,
    tags?: string[]
  ): Promise<MailchimpMember> {
    const subscriberHash = this.hashEmail(email);

    const body = {
      email_address: email,
      status,
      merge_fields: mergeFields || {},
      ...(tags && { tags: tags.map(tag => ({ name: tag, status: 'active' as const })) }),
    };

    const response = await this.request<MailchimpMember>(
      `/lists/${audienceId}/members/${subscriberHash}`,
      'PUT',
      body
    );
    return response;
  }

  /**
   * Update tags for a member (additive update)
   * @param audienceId - The audience ID
   * @param email - The member's email
   * @param tagsToAdd - Tags to add (will be set to active)
   * @param tagsToRemove - Tags to remove (will be set to inactive)
   * @returns void
   */
  async updateTags(
    audienceId: string,
    email: string,
    tagsToAdd: string[] = [],
    tagsToRemove: string[] = []
  ): Promise<void> {
    const subscriberHash = this.hashEmail(email);

    // Build tag operations
    const tagOperations = [
      ...tagsToAdd.map(tag => ({ name: tag, status: 'active' as const })),
      ...tagsToRemove.map(tag => ({ name: tag, status: 'inactive' as const })),
    ];

    if (tagOperations.length === 0) {
      return;
    }

    await this.request<{ tags: MailchimpTagFull[] }>(
      `/lists/${audienceId}/members/${subscriberHash}/tags`,
      'POST',
      { tags: tagOperations }
    );
  }

  /**
   * Get all tags for a member
   * @param audienceId - The audience ID
   * @param email - The member's email
   * @returns Array of tag names
   */
  async getMemberTags(audienceId: string, email: string): Promise<string[]> {
    const subscriberHash = this.hashEmail(email);

    try {
      const response = await this.request<{ tags: MailchimpTagFull[] }>(
        `/lists/${audienceId}/members/${subscriberHash}/tags`
      );
      return response.tags?.map(t => t.name) || [];
    } catch {
      return [];
    }
  }

  /**
   * Get all available tags for an audience
   * @param audienceId - The audience ID
   * @param count - Number of tags to return
   * @returns Array of tags
   */
  async getAudienceTags(audienceId: string, count: number = 100): Promise<MailchimpTagFull[]> {
    const params = new URLSearchParams({
      count: count.toString(),
    });

    const response = await this.request<{ tags: MailchimpTagFull[] }>(
      `/lists/${audienceId}/tag-search?${params.toString()}`
    );
    return response.tags || [];
  }

  /**
   * Get click events for a campaign
   * @param campaignId - The campaign ID
   * @param since - Optional ISO 8601 date string to filter events after
   * @returns Array of click reports
   */
  async getCampaignClicks(campaignId: string, since?: string): Promise<MailchimpClickReport[]> {
    const params = new URLSearchParams();
    if (since) {
      params.set('since', since);
    }

    const response = await this.request<{ urls_clicked: MailchimpClickReport[] }>(
      `/reports/${campaignId}/click-details?${params.toString()}`
    );
    return response.urls_clicked || [];
  }

  /**
   * Get click events for a specific member across campaigns
   * @param email - The member's email
   * @param since - Optional ISO 8601 date string to filter events after
   * @returns Array of click events
   */
  async getClickEvents(email: string, since?: string): Promise<MailchimpClickEvent[]> {
    // Mailchimp doesn't provide a direct API for historical click events by email.
    // This would typically be handled via webhooks or the Ecommerce events API.
    // Returning empty array as fallback, webhook handler should be used instead.
    return [];
  }

  /**
   * Get recent activity for a member (opens, clicks, etc.)
   * @param audienceId - The audience ID
   * @param email - The member's email
   * @returns Activity summary
   */
  async getMemberActivity(audienceId: string, email: string): Promise<{
    opens: number;
    clicks: number;
    lastOpen?: string;
    lastClick?: string;
  }> {
    const subscriberHash = this.hashEmail(email);

    try {
      const response = await this.request<{
        total?: number;
        opens?: Array<{ timestamp: string }>;
        clicks?: Array<{ timestamp: string }>;
      }>(`/lists/${audienceId}/members/${subscriberHash}/activity`);

      const opens = response.opens?.length || 0;
      const clicks = response.clicks?.length || 0;
      const lastOpen = response.opens?.[0]?.timestamp;
      const lastClick = response.clicks?.[0]?.timestamp;

      return {
        opens,
        clicks,
        lastOpen,
        lastClick,
      };
    } catch {
      return {
        opens: 0,
        clicks: 0,
      };
    }
  }

  /**
   * Get campaign reports with click activity since a given date
   * @param since - ISO 8601 date string
   * @param count - Number of campaigns to check
   * @returns Array of campaigns with click data
   */
  async getRecentCampaignsWithClicks(since: string, count: number = 20): Promise<Array<{
    campaignId: string;
    campaignName: string;
    sendTime: string;
    clicks: number;
  }>> {
    const params = new URLSearchParams({
      count: count.toString(),
      since_send_time: since,
    });

    const response = await this.request<{ campaigns: Array<{
      id: string;
      settings: { subject_line: string };
      send_time: string;
      report_summary: { clicks?: number };
    }> }>(`/campaigns?${params.toString()}`);

    return (response.campaigns || []).map(c => ({
      campaignId: c.id,
      campaignName: c.settings.subject_line,
      sendTime: c.send_time,
      clicks: c.report_summary?.clicks || 0,
    }));
  }

  /**
   * Add a subscriber to an audience
   * @param audienceId - The audience ID
   * @param email - The subscriber's email
   * @param mergeFields - Optional merge fields
   * @param tags - Optional tags
   * @param doubleOptIn - Whether to require double opt-in (default: true)
   * @returns The created member
   */
  async subscribe(
    audienceId: string,
    email: string,
    mergeFields?: Record<string, unknown>,
    tags?: string[],
    doubleOptIn: boolean = true
  ): Promise<MailchimpMember> {
    return this.upsertMember(
      audienceId,
      email,
      doubleOptIn ? 'pending' : 'subscribed',
      mergeFields,
      tags
    );
  }

  /**
   * Unsubscribe a member from an audience
   * @param audienceId - The audience ID
   * @param email - The member's email
   * @returns The updated member
   */
  async unsubscribe(audienceId: string, email: string): Promise<MailchimpMember> {
    const subscriberHash = this.hashEmail(email);

    const response = await this.request<MailchimpMember>(
      `/lists/${audienceId}/members/${subscriberHash}`,
      'PATCH',
      { status: 'unsubscribed' }
    );
    return response;
  }

  /**
   * Hash an email address for Mailchimp API (MD5, lowercase, trimmed)
   */
  private hashEmail(email: string): string {
    const normalized = email.toLowerCase().trim();
    return createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Verify a Mailchimp webhook signature
   * Note: Mailchimp webhooks can be verified by checking the X-Mailchimp-Signature header
   * @param payload - The raw webhook payload
   * @param signature - The signature from the X-Mailchimp-Signature header
   * @returns True if valid
   */
  verifyWebhook(payload: string, signature: string): boolean {
    // Mailchimp webhook signature format: base64(hmac_sha256(apiKey, payload))
    // Note: The full API key is used for HMAC, not just the secret part

    const [timestamp, expectedSignature] = signature.split('|');

    // Check timestamp to prevent replay attacks (5 minute tolerance)
    if (timestamp) {
      const now = Math.floor(Date.now() / 1000);
      const ts = parseInt(timestamp, 10);
      if (Math.abs(now - ts) > 300) {
        return false;
      }
    }

    // Compute HMAC SHA-256 using the full API key
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.config.apiKey);
    hmac.update(payload);
    const computedSignature = hmac.digest('base64');

    // For timestamped signatures, verify just the signature part
    const signatureToCheck = timestamp ? expectedSignature : signature;

    return crypto.timingSafeEqual(
      Buffer.from(signatureToCheck),
      Buffer.from(computedSignature)
    );
  }

  /**
   * Parse a webhook payload
   * @param payload - The raw webhook payload
   * @returns The parsed event type and data
   */
  parseWebhook(payload: string): { type: string; data: Record<string, unknown> } | null {
    try {
      const data = JSON.parse(payload);
      return {
        type: data.type || 'unknown',
        data: data.data || {},
      };
    } catch {
      return null;
    }
  }

  /**
   * Make an authenticated request to the Mailchimp API
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.options.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: body ? JSON.stringify(body) : undefined,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Handle rate limiting
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter
              ? parseInt(retryAfter, 10) * 1000
              : this.calculateBackoff(attempt);

            if (attempt < this.options.retryAttempts - 1) {
              await this.sleep(delay);
              continue;
            }
          }

          const error = await response.text();
          throw new MailchimpApiError(
            `Mailchimp API error: ${response.status} - ${error}`,
            response.status
          );
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on 4xx errors (except 429)
        if (
          error instanceof MailchimpApiError &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 429
        ) {
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
    return error instanceof MailchimpApiError && error.status === 404;
  }
}

/**
 * Custom error class for Mailchimp API errors
 */
export class MailchimpApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'MailchimpApiError';
  }
}

/**
 * Factory function to create a configured Mailchimp client from environment variables
 */
export function createMailchimpClient(): MailchimpClient {
  const apiKey = process.env.MAILCHIMP_API_KEY;

  if (!apiKey) {
    throw new Error('Missing Mailchimp configuration: MAILCHIMP_API_KEY is required');
  }

  // Load audience configurations from environment
  const audiences: MailchimpAudienceConfig[] = [];

  if (process.env.MAILCHIMP_AUDIENCE_SHOP) {
    audiences.push({
      id: process.env.MAILCHIMP_AUDIENCE_SHOP,
      name: 'Shop Customers',
      type: 'Shop',
      enabled: true,
    });
  }

  if (process.env.MAILCHIMP_AUDIENCE_MEMBERS) {
    audiences.push({
      id: process.env.MAILCHIMP_AUDIENCE_MEMBERS,
      name: 'Members',
      type: 'Members',
      enabled: true,
    });
  }

  if (process.env.MAILCHIMP_AUDIENCE_STH) {
    audiences.push({
      id: process.env.MAILCHIMP_AUDIENCE_STH,
      name: 'Season Ticket Holders',
      type: 'SeasonTicketHolders',
      enabled: true,
    });
  }

  if (process.env.MAILCHIMP_AUDIENCE_EVERYONE) {
    audiences.push({
      id: process.env.MAILCHIMP_AUDIENCE_EVERYONE,
      name: 'Everyone Else',
      type: 'EveryoneElse',
      enabled: true,
    });
  }

  return new MailchimpClient({ apiKey, audiences });
}

// Export types
export type {
  MailchimpAudience,
  MailchimpMember,
  MailchimpTagFull,
  MailchimpClickEvent,
  MailchimpAudienceConfig,
};
