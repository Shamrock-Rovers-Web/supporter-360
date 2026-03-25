import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { verifyMailchimpWebhook } from '../../utils/webhook-verification';

const sqsClient = new SQSClient({});
const s3Client = new S3Client({});

const QUEUE_URL = process.env.MAILCHIMP_QUEUE_URL!;
const BUCKET_NAME = process.env.RAW_PAYLOADS_BUCKET!;
const MAILCHIMP_WEBHOOK_SECRET = process.env.MAILCHIMP_WEBHOOK_SECRET!;

if (!MAILCHIMP_WEBHOOK_SECRET) {
  throw new Error('MAILCHIMP_WEBHOOK_SECRET environment variable is required');
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify webhook signature first
    const mailchimpSignature = event.headers['X-Mailchimp-Signature'] || event.headers['x-mailchimp-signature'];

    if (!mailchimpSignature) {
      console.warn('Mailchimp webhook missing signature');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Missing signature' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        },
      };
    }

    if (!verifyMailchimpWebhook(event.body || '', mailchimpSignature, MAILCHIMP_WEBHOOK_SECRET)) {
      console.warn('Mailchimp webhook signature verification failed');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid signature' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        },
      };
    }

    const body = event.body || '';
    const params = new URLSearchParams(body);

    const type = params.get('type');
    const dataRaw = params.get('data');
    let data: Record<string, unknown>;
    if (dataRaw) {
      try {
        data = JSON.parse(dataRaw);
      } catch {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid JSON in data field' }),
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          },
        };
      }
    } else {
      data = {};
    }

    if (!type) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing type' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        },
      };
    }

    const payloadId = uuidv4();
    const dateStr = new Date().toISOString().split('T')[0];
    const s3Key = `mailchimp/${dateStr}/${payloadId}.json`;

    // Store raw payload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: JSON.stringify({
          type,
          data,
          receivedAt: new Date().toISOString(),
          headers: event.headers,
        }),
        ContentType: 'application/json',
      })
    );

    // Handle click events
    if (type === 'click') {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: QUEUE_URL,
          MessageBody: JSON.stringify({
            type: 'click',
            data: {
              email: data.email,
              campaign_id: data.campaign_id,
              url: data.url,
              timestamp: data.fired_at || new Date().toISOString(),
            },
            s3Key,
            payloadId,
          }),
          MessageAttributes: {
            type: { DataType: 'String', StringValue: 'click' },
            source: { DataType: 'String', StringValue: 'mailchimp' },
          },
        })
      );

      console.log(`Queued Mailchimp click event: ${payloadId}`);
    } else {
      // For other Mailchimp event types, still queue them
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: QUEUE_URL,
          MessageBody: JSON.stringify({
            type,
            data,
            s3Key,
            payloadId,
          }),
          MessageAttributes: {
            type: { DataType: 'String', StringValue: type },
            source: { DataType: 'String', StringValue: 'mailchimp' },
          },
        })
      );

      console.log(`Queued Mailchimp ${type} event: ${payloadId}`);
    }

    return {
      statusCode: 202,
      body: JSON.stringify({ received: true, payloadId }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      },
    };
  } catch (error) {
    console.error('Mailchimp webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      },
    };
  }
};
