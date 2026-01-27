import { validateApiKey, AuthContext } from './auth';
import { query } from '../db/connection';

jest.mock('../db/connection');

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockApiKeys = {
    'staff-key-123': { role: 'staff' as const, name: 'Customer Service' },
    'admin-key-456': { role: 'admin' as const, name: 'Admin User' },
  };

  it('should reject request with no API key', async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [{ value: mockApiKeys }]
    });

    const event = {
      headers: {},
      httpMethod: 'GET',
      path: '/search',
    } as any;

    const result = await validateApiKey(event);
    expect(result.authorized).toBe(false);
  });

  it('should reject invalid API key', async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [{ value: mockApiKeys }]
    });

    const event = {
      headers: { 'X-API-Key': 'invalid-key' },
      httpMethod: 'GET',
      path: '/search',
    } as any;

    const result = await validateApiKey(event);
    expect(result.authorized).toBe(false);
  });

  it('should authorize staff key for staff endpoint', async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [{ value: mockApiKeys }]
    });

    const event = {
      headers: { 'X-API-Key': 'staff-key-123' },
      httpMethod: 'GET',
      path: '/search',
    } as any;

    const result = await validateApiKey(event);
    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.context.role).toBe('staff');
    }
  });

  it('should reject staff key for admin endpoint', async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [{ value: mockApiKeys }]
    });

    const event = {
      headers: { 'X-API-Key': 'staff-key-123' },
      httpMethod: 'POST',
      path: '/admin/merge',
    } as any;

    const result = await validateApiKey(event);
    expect(result.authorized).toBe(false);
  });
});
