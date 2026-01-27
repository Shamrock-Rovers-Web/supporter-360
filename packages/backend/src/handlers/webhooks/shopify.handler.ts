import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const sqsClient = new SQSClient({});
const s3Client = new S3Client({});

const QUEUE_URL = process.env.SHOPIFY_QUEUE_URL!;
const BUCKET_NAME = process.env.RAW_PAYLOADS_BUCKET!;

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const shopifyTopic = event.headers['X-Shopify-Topic'] || event.headers['x-shopify-topic'];
    const shopifyDomain = event.headers['X-Shopify-Shop-Domain'] || event.headers['x-shopify-shop-domain'];

    if (!shopifyTopic) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing X-Shopify-Topic header' }),
      };
    }

    const payload = JSON.parse(event.body || '{}');
    const payloadId = uuidv4();
    const s3Key = `shopify/${new Date().toISOString().split('T')[0]}/${payloadId}.json`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: JSON.stringify({
          topic: shopifyTopic,
          domain: shopifyDomain,
          payload,
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
          topic: shopifyTopic,
          domain: shopifyDomain,
          payload,
          s3Key,
          payloadId,
        }),
        MessageAttributes: {
          topic: {
            DataType: 'String',
            StringValue: shopifyTopic,
          },
          source: {
            DataType: 'String',
            StringValue: 'shopify',
          },
        },
      })
    );

    console.log(`Queued Shopify webhook: ${shopifyTopic} - ${payloadId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, payloadId }),
    };
  } catch (error) {
    console.error('Error processing Shopify webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
