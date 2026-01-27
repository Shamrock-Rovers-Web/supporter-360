import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';

const sqsClient = new SQSClient({});
const QUEUE_URL = process.env.MAILCHIMP_QUEUE_URL!;

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    const body = event.body || '';
    const params = new URLSearchParams(body);

    const type = params.get('type');
    const data = JSON.parse(params.get('data') || '{}');

    if (!type) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing type' }),
      };
    }

    if (type === 'click') {
      const payloadId = uuidv4();

      await sqsClient.send(new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify({
          type: 'click',
          data: {
            email: data.email,
            campaign_id: data.campaign_id,
            url: data.url,
            timestamp: data.fired_at || new Date().toISOString(),
          },
        }),
        MessageAttributes: {
          type: { DataType: 'String', StringValue: 'click' },
          source: { DataType: 'String', StringValue: 'mailchimp' },
        },
      }));

      console.log(`Queued Mailchimp click event: ${payloadId}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Mailchimp webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
