import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { verifyStripeWebhook } from '../../utils/webhook-verification';

const sqsClient = new SQSClient({});
const s3Client = new S3Client({});

const QUEUE_URL = process.env.STRIPE_QUEUE_URL!;
const BUCKET_NAME = process.env.RAW_PAYLOADS_BUCKET!;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

if (!STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const stripeSignature = event.headers['Stripe-Signature'] || event.headers['stripe-signature'];

    // Verify webhook signature
    if (!stripeSignature) {
      console.warn('Stripe webhook missing signature');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Missing signature' }),
      };
    }

    if (!verifyStripeWebhook(event.body || '', stripeSignature, STRIPE_WEBHOOK_SECRET)) {
      console.warn('Stripe webhook signature verification failed');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid signature' }),
      };
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }
    const eventType = typeof payload.type === 'string' ? payload.type : 'unknown';
    const payloadId = uuidv4();
    const dateStr = new Date().toISOString().split('T')[0];
    const s3Key = `stripe/${dateStr}/${payloadId}.json`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: JSON.stringify({
          event: payload,
          receivedAt: new Date().toISOString(),
          headers: event.headers,
        }),
        ContentType: 'application/json',
      })
    );

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify({
          event: payload,
          s3Key,
          payloadId,
        }),
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: eventType,
          },
          source: {
            DataType: 'String',
            StringValue: 'stripe',
          },
        },
      })
    );

    console.log(`Queued Stripe webhook: ${eventType} - ${payloadId}`);

    return {
      statusCode: 202,
      body: JSON.stringify({ received: true, payloadId }),
    };
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
