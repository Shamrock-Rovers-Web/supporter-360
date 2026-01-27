import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SupporterRepository } from '../../db/repositories/supporter.repository';
import { EventRepository } from '../../db/repositories/event.repository';

const supporterRepo = new SupporterRepository();
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

    const profile = await supporterRepo.getProfile(supporterId);

    if (!profile) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Supporter not found' }),
      };
    }

    const ticketPurchases = await eventRepo.getTicketPurchases(supporterId);
    const shopOrders = await eventRepo.getShopOrders(supporterId);
    const stadiumEntries = await eventRepo.getStadiumEntries(supporterId);
    const paymentEvents = await eventRepo.getPaymentEvents(supporterId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        profile,
        purchases: {
          tickets: ticketPurchases,
          shop: shopOrders,
        },
        stadium_entries: stadiumEntries,
        payments: paymentEvents,
      }),
    };
  } catch (error) {
    console.error('Error in profile handler:', error);
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
