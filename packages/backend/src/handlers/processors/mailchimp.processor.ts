import { SQSHandler } from 'aws-lambda';
import { query } from '../../db/connection';

interface MailchimpMessage {
  type: 'click';
  data: {
    email: string;
    campaign_id?: string;
    url?: string;
    timestamp: string;
  };
}

export const handler: SQSHandler = async (event) => {
  console.log(`Processing ${event.Records.length} Mailchimp messages`);

  for (const record of event.Records) {
    try {
      const message: MailchimpMessage = JSON.parse(record.body);
      await processClick(message.data);
      console.log(`Processed click event for ${message.data.email}`);
    } catch (error) {
      console.error('Error processing record:', error);
      throw error;
    }
  }
};

async function processClick(data: MailchimpMessage['data']) {
  const supporterResult = await query(
    `SELECT s.supporter_id FROM supporter s
     JOIN email_alias ea ON s.supporter_id = ea.supporter_id
     WHERE ea.email = $1`,
    [data.email]
  );

  if (supporterResult.rows.length === 0) {
    console.log(`Supporter not found for email ${data.email}, skipping click event`);
    return;
  }

  const supporterId = supporterResult.rows[0].supporter_id;

  await query(
    `INSERT INTO event (supporter_id, source_system, event_type, event_time, metadata)
     VALUES ($1, 'mailchimp', 'EmailClick', $2, $3)`,
    [
      supporterId,
      data.timestamp,
      JSON.stringify({
        campaign_id: data.campaign_id,
        url: data.url,
        email: data.email,
      }),
    ]
  );
}
