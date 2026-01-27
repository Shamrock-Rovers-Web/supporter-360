import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const sqsClient = new SQSClient({});
const s3Client = new S3Client({});

const QUEUE_URL = process.env.GOCARDLESS_QUEUE_URL!;
const BUCKET_NAME = process.env.RAW_PAYLOADS_BUCKET!;

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const webhookSignature = event.headers['Webhook-Signature'] || event.headers['webhook-signature'];

    if (!webhookSignature) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing Webhook-Signature header' }),
      };
    }

    const payload = JSON.parse(event.body || '{}');
    const payloadId = uuidv4();
    const s3Key = `gocardless/${new Date().toISOString().split('T')[0]}/${payloadId}.json`;

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

    const events = payload.events || [];

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
      statusCode: 200,
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
