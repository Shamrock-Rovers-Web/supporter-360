import { MailchimpClient } from './mailchimp.client';
import { query } from '../db/connection';
import { Supporter, MailchimpMembership } from '@supporter360/shared';

export interface TagMapping {
  supporterType: string;
  tag: string;
}

export interface SyncResult {
  success: boolean;
  processed: number;
  errors: number;
  errorDetails: Array<{ supporterId: string; error: string }>;
}

export class MailchimpSyncService {
  private mailchimpClient: MailchimpClient;

  constructor(mailchimpClient?: MailchimpClient) {
    this.mailchimpClient = mailchimpClient || new MailchimpClient();
  }

  /**
   * Sync all supporters across all configured Mailchimp audiences
   */
  async syncAll(): Promise<void> {
    // Get all audience IDs from config or environment
    const audiences = await this.getConfiguredAudiences();

    for (const audienceId of audiences) {
      try {
        await this.syncAllSupporters(audienceId);
        console.log(`Synced audience ${audienceId}`);
      } catch (error) {
        console.error(`Failed to sync audience ${audienceId}:`, error);
        throw error;
      }
    }
  }

  private async getConfiguredAudiences(): Promise<string[]> {
    // TODO: Get from config table or environment
    // For now, return empty array - will be configured via environment
    const audiences = process.env.MAILCHIMP_AUDIENCES;
    return audiences ? audiences.split(',') : [];
  }

  async syncSupporterTags(
    supporterId: string,
    audienceId: string
  ): Promise<void> {
    const supporter = await this.getSupporter(supporterId);
    if (!supporter) {
      throw new Error(`Supporter ${supporterId} not found`);
    }

    const membership = await this.getMailchimpMembership(supporterId, audienceId);
    const currentTags = membership?.tags || [];

    const expectedTag = this.getTagForSupporterType(supporter.supporter_type);
    const tagsToAdd = [expectedTag];
    const tagsToRemove = currentTags.filter(tag => tag !== expectedTag);

    const email = supporter.primary_email;
    if (!email) {
      throw new Error(`Supporter ${supporterId} has no email`);
    }

    const subscriberHash = this.hashEmail(email);

    if (tagsToAdd.length > 0) {
      await this.mailchimpClient.addTags(audienceId, subscriberHash, tagsToAdd);
    }

    if (tagsToRemove.length > 0) {
      await this.mailchimpClient.removeTags(audienceId, subscriberHash, tagsToRemove);
    }

    await this.updateMailchimpMembershipTags(supporterId, audienceId, [expectedTag]);
  }

  async syncAllSupporters(audienceId: string): Promise<SyncResult> {
    const supporters = await this.getAllSupporters();
    const result: SyncResult = {
      success: true,
      processed: 0,
      errors: 0,
      errorDetails: [],
    };

    for (const supporter of supporters) {
      if (!supporter.primary_email) {
        result.errors++;
        result.errorDetails.push({
          supporterId: supporter.supporter_id,
          error: 'No primary email',
        });
        continue;
      }

      try {
        await this.syncSupporterTags(supporter.supporter_id, audienceId);
        result.processed++;
      } catch (error) {
        result.errors++;
        result.errorDetails.push({
          supporterId: supporter.supporter_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (result.errors > 0) {
      result.success = false;
    }

    return result;
  }

  async reconcileTags(audienceId: string): Promise<SyncResult> {
    const memberships = await this.getAllMailchimpMemberships(audienceId);
    const result: SyncResult = {
      success: true,
      processed: 0,
      errors: 0,
      errorDetails: [],
    };

    for (const membership of memberships) {
      try {
        const supporter = await this.getSupporter(membership.supporter_id);
        if (!supporter) {
          result.errors++;
          result.errorDetails.push({
            supporterId: membership.supporter_id,
            error: 'Supporter not found',
          });
          continue;
        }

        await this.syncSupporterTags(membership.supporter_id, audienceId);
        result.processed++;
      } catch (error) {
        result.errors++;
        result.errorDetails.push({
          supporterId: membership.supporter_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (result.errors > 0) {
      result.success = false;
    }

    return result;
  }

  private getTagForSupporterType(supporterType: string): string {
    const tagMap: Record<string, string> = {
      'Member': 'Member',
      'Season Ticket Holder': 'SeasonTicketHolder',
      'Ticket Buyer': 'TicketBuyer',
      'Shop Buyer': 'ShopBuyer',
      'Away Supporter': 'AwaySupporter',
      'Staff/VIP': 'StaffVIP',
      'Unknown': 'Unknown',
    };

    return tagMap[supporterType] || 'Unknown';
  }

  private async getSupporter(supporterId: string): Promise<Supporter | null> {
    const result = await query<Supporter>(
      'SELECT * FROM supporter WHERE supporter_id = $1',
      [supporterId]
    );
    return result.rows[0] || null;
  }

  private async getAllSupporters(): Promise<Supporter[]> {
    const result = await query<Supporter>('SELECT * FROM supporter');
    return result.rows;
  }

  private async getMailchimpMembership(
    supporterId: string,
    audienceId: string
  ): Promise<MailchimpMembership | null> {
    const result = await query<MailchimpMembership>(
      'SELECT * FROM mailchimp_membership WHERE supporter_id = $1 AND audience_id = $2',
      [supporterId, audienceId]
    );
    return result.rows[0] || null;
  }

  private async getAllMailchimpMemberships(audienceId: string): Promise<MailchimpMembership[]> {
    const result = await query<MailchimpMembership>(
      'SELECT * FROM mailchimp_membership WHERE audience_id = $1',
      [audienceId]
    );
    return result.rows;
  }

  private async updateMailchimpMembershipTags(
    supporterId: string,
    audienceId: string,
    tags: string[]
  ): Promise<void> {
    await query(
      `UPDATE mailchimp_membership
       SET tags = $1, last_synced_at = NOW()
       WHERE supporter_id = $2 AND audience_id = $3`,
      [tags, supporterId, audienceId]
    );
  }

  private hashEmail(email: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5')
      .update(email.toLowerCase().trim())
      .digest('hex');
  }
}
