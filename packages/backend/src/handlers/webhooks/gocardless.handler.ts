import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { verifyGoCardlessWebhook } from '../../utils/webhook-verification';

const sqsClient = new SQSClient({});
const s3Client = new S3Client({});

const QUEUE_URL = process.env.GOCARDLESS_QUEUE_URL!;
const BUCKET_NAME = process.env.RAW_PAYLOADS_BUCKET!;
const GOCARDLESS_WEBHOOK_SECRET = process.env.GOCARDLESS_WEBHOOK_SECRET!;

if (!GOCARDLESS_WEBHOOK_SECRET) {
  throw new Error('GOCARDLESS_WEBHOOK_SECRET environment variable is required');
}

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const webhookSignature = event.headers['Webhook-Signature'] || event.headers['webhook-signature'];

    // Verify webhook signature
    if (!webhookSignature) {
      console.warn('GoCardless webhook missing signature');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Missing signature' }),
      };
    }

    if (!verifyGoCardlessWebhook(event.body || '', webhookSignature, GOCARDLESS_WEBHOOK_SECRET)) {
      console.warn('GoCardless webhook signature verification failed');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid signature' }),
      };
    }

    let payload: { events?: unknown[] };
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    const events = (Array.isArray(payload.events) ? payload.events : []) as Array<{
      resource_type?: string;
      action?: string;
      [key: string]: unknown;
    }>;
    const payloadId = uuidv4();
    const dateStr = new Date().toISOString().split('T')[0];
    const s3Key = `gocardless/${dateStr}/${payloadId}.json`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: JSON.stringify({
          events: payload.events,
          receivedAt: new Date().toISOString(),
          headers: event.headers,
        }),
        ContentType: 'application/json',
      })
    );

    for (const gcEvent of events) {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: QUEUE_URL,
          MessageBody: JSON.stringify({
            event: gcEvent,
            s3Key,
            payloadId,
          }),
          MessageAttributes: {
            resourceType: {
              DataType: 'String',
              StringValue: gcEvent.resource_type || 'unknown',
            },
            action: {
              DataType: 'String',
              StringValue: gcEvent.action || 'unknown',
            },
            source: {
              DataType: 'String',
              StringValue: 'gocardless',
            },
          },
        })
      );
    }

    console.log(`Queued ${events.length} GoCardless webhook events - ${payloadId}`);

    return {
      statusCode: 202,
      body: JSON.stringify({ received: true, payloadId, eventsProcessed: events.length }),
    };
  } catch (error) {
    console.error('Error processing GoCardless webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
