import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SupporterRepository } from '../../../db/repositories/supporter.repository';
import { MergeRequest } from '@supporter360/shared';

const supporterRepo = new SupporterRepository();

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    const body: MergeRequest = JSON.parse(event.body || '{}');

    if (!body.primary_supporter_id || !body.secondary_supporter_id || !body.actor_user_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: primary_supporter_id, secondary_supporter_id, actor_user_id',
        }),
      };
    }

    const mergedSupporter = await supporterRepo.merge(
      body.primary_supporter_id,
      body.secondary_supporter_id,
      body.actor_user_id,
      body.reason
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        supporter: mergedSupporter,
      }),
    };
  } catch (error) {
    console.error('Error in merge handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
