/**
 * Jest Test Setup
 *
 * Global setup for all test suites. Configures test environment,
 * sets up mocks for external services, and provides test utilities.
 *
 * @packageDocumentation
 */

// Set test environment variables before any tests run
process.env.NODE_ENV = 'test';

// Default test values if not set
process.env.AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '5432';
process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'supporter360_test';
process.env.TEST_DB_USER = process.env.TEST_DB_USER || 'supporter';
process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'supporter360_dev_password';

// Suppress console output during tests unless explicitly enabled
if (process.env.ENABLE_TEST_LOGGING !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error logging for test failures
    error: console.error,
  };
}

// Extend Jest matchers with custom assertions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidSupporter(): R;
      toBeValidEvent(): R;
      toBeValidMembership(): R;
    }
  }
}

// Custom matcher for supporter objects
expect.extend({
  toBeValidSupporter(received: unknown) {
    const pass = (
      typeof received === 'object' &&
      received !== null &&
      'supporter_id' in received &&
      'primary_email' in received &&
      'supporter_type' in received
    );

    return {
      pass,
      message: () => pass
        ? `Expected ${received} not to be a valid supporter`
        : `Expected ${received} to be a valid supporter with supporter_id, primary_email, and supporter_type`,
    };
  },
});

// Custom matcher for event objects
expect.extend({
  toBeValidEvent(received: unknown) {
    const pass = (
      typeof received === 'object' &&
      received !== null &&
      'event_id' in received &&
      'supporter_id' in received &&
      'source_system' in received &&
      'event_type' in received
    );

    return {
      pass,
      message: () => pass
        ? `Expected ${received} not to be a valid event`
        : `Expected ${received} to be a valid event with event_id, supporter_id, source_system, and event_type`,
    };
  },
});

// Custom matcher for membership objects
expect.extend({
  toBeValidMembership(received: unknown) {
    const pass = (
      typeof received === 'object' &&
      received !== null &&
      'membership_id' in received &&
      'supporter_id' in received &&
      'status' in received &&
      'cadence' in received
    );

    return {
      pass,
      message: () => pass
        ? `Expected ${received} not to be a valid membership`
        : `Expected ${received} to be a valid membership with membership_id, supporter_id, status, and cadence`,
    };
  },
});

// Increase timeout for database operations
jest.setTimeout(30000);
