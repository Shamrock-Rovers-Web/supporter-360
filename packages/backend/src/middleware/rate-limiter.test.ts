/**
 * Tests for Rate Limiting Middleware
 *
 * @packageDocumentation
 */

import { checkRateLimit, RateLimitTier, RATE_LIMITS, refillTokens, initializeRateLimiting } from './rate-limiter';
import { query } from '../db/connection';

// Mock the database query
jest.mock('../db/connection');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Rate Limiter Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('refillTokens', () => {
    it('should refill tokens based on elapsed time', () => {
      const config = RATE_LIMITS[RateLimitTier.DEFAULT];
      const now = Date.now();

      const state = refillTokens(
        {
          tokens: 50,
          lastRefill: now - 30000, // 30 seconds ago
        },
        config
      );

      // Should refill approximately 50 tokens (half the window)
      expect(state.tokens).toBeGreaterThan(50);
      expect(state.tokens).toBeLessThanOrEqual(config.limit);
      expect(state.lastRefill).toBeCloseTo(now, -2); // Within 100ms
    });

    it('should not exceed maximum tokens', () => {
      const config = RATE_LIMITS[RateLimitTier.DEFAULT];
      const now = Date.now();

      const state = refillTokens(
        {
          tokens: 90,
          lastRefill: now - 120000, // 2 minutes ago (more than full window)
        },
        config
      );

      // Should cap at the limit
      expect(state.tokens).toBe(config.limit);
    });

    it('should not refill if no time has passed', () => {
      const config = RATE_LIMITS[RateLimitTier.DEFAULT];
      const now = Date.now();

      const state = refillTokens(
        {
          tokens: 50,
          lastRefill: now,
        },
        config
      );

      // Should not add any tokens
      expect(state.tokens).toBe(50);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow first request and consume token', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await checkRateLimit('test-api-key', RATE_LIMITS[RateLimitTier.DEFAULT]);

      expect(result.allowed).toBe(true);
      expect(result.info.remaining).toBe(99); // 100 - 1 consumed
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should allow requests within limit', async () => {
      const now = Date.now();

      mockQuery.mockResolvedValueOnce({
        rows: [{
          state: JSON.stringify({
            tokens: 10,
            lastRefill: now,
          }),
        }],
        rowCount: 1,
      } as never);

      const result = await checkRateLimit('test-api-key', RATE_LIMITS[RateLimitTier.DEFAULT]);

      expect(result.allowed).toBe(true);
      expect(result.info.remaining).toBe(9); // 10 - 1 consumed
    });

    it('should deny requests when limit exceeded', async () => {
      const now = Date.now();

      mockQuery.mockResolvedValueOnce({
        rows: [{
          state: JSON.stringify({
            tokens: 0,
            lastRefill: now,
          }),
        }],
        rowCount: 1,
      } as never);

      const result = await checkRateLimit('test-api-key', RATE_LIMITS[RateLimitTier.DEFAULT]);

      expect(result.allowed).toBe(false);
      expect(result.info.remaining).toBe(0);
    });

    it('should refill tokens on subsequent requests', async () => {
      const thirtySecondsAgo = Date.now() - 30000;

      mockQuery.mockResolvedValueOnce({
        rows: [{
          state: JSON.stringify({
            tokens: 0,
            lastRefill: thirtySecondsAgo,
          }),
        }],
        rowCount: 1,
      } as never);

      const result = await checkRateLimit('test-api-key', RATE_LIMITS[RateLimitTier.DEFAULT]);

      // Should have refilled approximately 50 tokens (30 seconds out of 60 second window)
      expect(result.allowed).toBe(true);
      expect(result.info.remaining).toBeGreaterThan(0);
    });

    it('should handle different rate limit tiers', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const adminResult = await checkRateLimit('admin-key', RATE_LIMITS[RateLimitTier.ADMIN]);

      expect(adminResult.allowed).toBe(true);
      expect(adminResult.info.limit).toBe(1000); // Admin tier
      expect(adminResult.info.remaining).toBe(999);
    });

    it('should calculate correct reset timestamp', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await checkRateLimit('test-api-key', RATE_LIMITS[RateLimitTier.DEFAULT]);

      // Reset timestamp should be in the future
      expect(result.info.resetAt).toBeGreaterThan(Date.now());

      // With 99 tokens remaining, should be approximately 0.6 seconds away
      const timeUntilReset = result.info.resetAt - Date.now();
      expect(timeUntilReset).toBeGreaterThan(0);
      expect(timeUntilReset).toBeLessThan(1000);
    });
  });

  describe('RATE_LIMITS configuration', () => {
    it('should have correct default tier limits', () => {
      const defaultTier = RATE_LIMITS[RateLimitTier.DEFAULT];
      expect(defaultTier.limit).toBe(100);
      expect(defaultTier.window).toBe(60);
    });

    it('should have correct staff tier limits', () => {
      const staffTier = RATE_LIMITS[RateLimitTier.STAFF];
      expect(staffTier.limit).toBe(300);
      expect(staffTier.window).toBe(60);
    });

    it('should have correct admin tier limits', () => {
      const adminTier = RATE_LIMITS[RateLimitTier.ADMIN];
      expect(adminTier.limit).toBe(1000);
      expect(adminTier.window).toBe(60);
    });

    it('should have correct webhook tier limits', () => {
      const webhookTier = RATE_LIMITS[RateLimitTier.WEBHOOK];
      expect(webhookTier.limit).toBe(10);
      expect(webhookTier.window).toBe(1);
    });
  });

  describe('initializeRateLimiting', () => {
    it('should execute the CREATE TABLE statement', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await initializeRateLimiting();

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS rate_limits'),
        []
      );
    });
  });
});
