import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import { query } from '../db/connection';

/**
 * Lambda Authorizer for API Gateway
 * Validates API keys and returns IAM policy for API Gateway
 *
 * This authorizer is called by API Gateway before the actual Lambda handler
 * It validates the X-API-Key header and returns a policy that allows/denies access
 */
export async function handler(event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> {
  console.log('Authorizer event:', JSON.stringify(event, null, 2));

  // Extract API key from authorization header
  // The token is passed as the Bearer token or directly as the API key
  const apiToken = event.authorizationToken?.replace(/^Bearer\s+/i, '');

  if (!apiToken) {
    console.log('No API key provided');
    throw new Error('Unauthorized');
  }

  try {
    // Fetch API keys from config table
    const result = await query(
      "SELECT value FROM config WHERE key = 'api_keys'"
    );

    if (result.rows.length === 0) {
      console.log('No API keys configured');
      throw new Error('Unauthorized');
    }

    const apiKeys = result.rows[0].value as Record<string, { role: 'staff' | 'admin'; name: string }>;
    const keyConfig = apiKeys[apiToken];

    if (!keyConfig) {
      console.log('Invalid API key');
      throw new Error('Unauthorized');
    }

    console.log(`API key validated: ${keyConfig.name} (${keyConfig.role})`);

    // Generate IAM policy
    // Allow access to all API resources - the actual role-based access control
    // is handled by the Lambda handlers themselves
    const policy = generatePolicy(apiToken, 'Allow', event.methodArn);

    // Add context information that can be accessed by the Lambda handlers
    policy.context = {
      role: keyConfig.role,
      keyName: keyConfig.name,
    };

    return policy;
  } catch (error) {
    console.error('Authorization error:', error);
    throw new Error('Unauthorized');
  }
}

/**
 * Generate IAM policy for API Gateway
 * Uses wildcard to allow access to all API methods (cache-friendly)
 */
function generatePolicy(principalId: string, effect: 'Allow' | 'Deny', resource: string): APIGatewayAuthorizerResult {
  // Extract the API ID and region from the method ARN to create a wildcard policy
  // methodArn format: arn:aws:execute-api:region:account-id:api-id/stage/method/resource
  const arnParts = resource.split(':');
  const apiGatewayArn = arnParts[5];
  const [apiId, stage] = apiGatewayArn.split('/');

  // Create a wildcard resource ARN that allows access to all methods
  const wildcardResource = `arn:aws:execute-api:${arnParts[3]}:${arnParts[4]}:${apiId}/${stage}/*`;

  const authResponse: APIGatewayAuthorizerResult = {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: wildcardResource,
        },
      ],
    },
  };

  return authResponse;
}
