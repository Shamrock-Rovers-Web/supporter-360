import { ScheduledHandler } from 'aws-lambda';
import { MailchimpSyncService } from '../../services/mailchimp-sync.service';

const syncService = new MailchimpSyncService();

export const handler: ScheduledHandler = async (event) => {
  console.log('Mailchimp sync triggered', JSON.stringify(event));

  try {
    await syncService.syncAll();
    console.log('Mailchimp sync complete');
  } catch (error) {
    console.error('Mailchimp sync error:', error);
    throw error;
  }
};
