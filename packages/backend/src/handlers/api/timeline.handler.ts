import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { EventRepository } from '../../db/repositories/event.repository';
import { TimelineRequest, EventType } from '@supporter360/shared';

const eventRepo = new EventRepository();

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    const supporterId = event.pathParameters?.id;

    if (!supporterId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Supporter ID is required' }),
      };
    }

    const queryParams = event.queryStringParameters || {};

    const eventTypes = queryParams.event_types
      ? (queryParams.event_types.split(',') as EventType[])
      : undefined;

    const timelineRequest: TimelineRequest = {
      supporter_id: supporterId,
      event_types: eventTypes,
      start_date: queryParams.start_date ? new Date(queryParams.start_date) : undefined,
      end_date: queryParams.end_date ? new Date(queryParams.end_date) : undefined,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 100,
      offset: queryParams.offset ? parseInt(queryParams.offset) : 0,
    };

    const timeline = await eventRepo.getTimeline(timelineRequest);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        supporter_id: supporterId,
        events: timeline,
        count: timeline.length,
        filters: {
          event_types: eventTypes,
          start_date: timelineRequest.start_date,
          end_date: timelineRequest.end_date,
        },
      }),
    };
  } catch (error) {
    console.error('Error in timeline handler:', error);
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
