/**
 * Structured Test Logger
 *
 * Provides detailed logging for test execution with trace ID correlation,
 * context tracking, and formatted output for debugging.
 *
 * Usage:
 * ```ts
 * const logger = new TestLogger('MyTest');
 * logger.info('Starting test', { userId: '123', action: 'create' });
 * await logger.trace('database query', async () => {
 *   return await repository.create(data);
 * });
 * ```
 *
 * @packageDocumentation
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  test_name: string;
  trace_id: string;
  message: string;
  context?: Record<string, unknown>;
  duration_ms?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: COLORS.dim,
  info: COLORS.blue,
  warn: COLORS.yellow,
  error: COLORS.red,
};

/**
 * Test Logger Class
 *
 * Provides structured logging with trace ID correlation, timing,
 * and context tracking for test debugging.
 */
export class TestLogger {
  private readonly testName: string;
  private readonly traceId: string;
  private entries: LogEntry[] = [];
  private startTime: number;

  constructor(testName: string, traceId?: string) {
    this.testName = testName;
    this.traceId = traceId || this.generateTraceId();
    this.startTime = Date.now();
  }

  /**
   * Generate a unique trace ID for this test run
   */
  private generateTraceId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Log a message at the specified level
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      test_name: this.testName,
      trace_id: this.traceId,
      message,
      context,
      duration_ms: Date.now() - this.startTime,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.entries.push(entry);
    this.output(entry);
  }

  /**
   * Format and output log entry to console
   */
  private output(entry: LogEntry): void {
    const color = LEVEL_COLORS[entry.level];
    const reset = COLORS.reset;

    const timestamp = entry.timestamp.split('T')[1].substring(0, 12); // HH:MM:SS.mmm
    const traceIdShort = entry.trace_id.substring(0, 12);
    const duration = entry.duration_ms !== undefined ? ` +${entry.duration_ms}ms` : '';

    let output = `${color}[${timestamp}]${reset} [${entry.test_name}]${reset} [${traceIdShort}]${reset} ${entry.message}${duration}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = Object.entries(entry.context)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(' ');
      output += `\n    ${COLORS.dim}Context: ${contextStr}${reset}`;
    }

    if (entry.error) {
      output += `\n    ${COLORS.red}Error: ${entry.error.name}: ${entry.error.message}${reset}`;
      if (entry.error.stack) {
        output += `\n    ${COLORS.dim}Stack: ${entry.error.stack.split('\n').slice(0, 2).join('\n')}${reset}`;
      }
    }

    console.log(output);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, context, error);
  }

  /**
   * Execute an async function with logging around it
   */
  async trace<T>(
    label: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    this.debug(`Starting: ${label}`, context);
    const startTime = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.info(`Completed: ${label}`, { ...context, duration_ms: duration });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(`Failed: ${label}`, error as Error, { ...context, duration_ms: duration });
      throw error;
    }
  }

  /**
   * Get all log entries for this test
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Get the trace ID for this test run
   */
  getTraceId(): string {
    return this.traceId;
  }

  /**
   * Print summary of test execution
   */
  printSummary(): void {
    const duration = Date.now() - this.startTime;
    const counts = this.entries.reduce((acc, entry) => {
      acc[entry.level] = (acc[entry.level] || 0) + 1;
      return acc;
    }, {} as Record<LogLevel, number>);

    console.log(`\n${COLORS.cyan}═══ Test Summary: ${this.testName} ═══${COLORS.reset}`);
    console.log(`Trace ID: ${this.traceId}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Entries: ${this.entries.length}`);
    console.log(`  Debug: ${counts.debug || 0}`);
    console.log(`  Info: ${counts.info || 0}`);
    console.log(`  Warn: ${counts.warn || 0}`);
    console.log(`  Error: ${counts.error || 0}`);
  }

  /**
   * Clear all log entries
   */
  clear(): void {
    this.entries = [];
  }
}

/**
 * Create a test logger instance
 */
export function createTestLogger(testName: string, traceId?: string): TestLogger {
  return new TestLogger(testName, traceId);
}

/**
 * Global test logger singleton for tests that don't need separate instances
 */
let globalLogger: TestLogger | null = null;

export function setGlobalLogger(logger: TestLogger): void {
  globalLogger = logger;
}

export function getGlobalLogger(): TestLogger | null {
  return globalLogger;
}

export function clearGlobalLogger(): void {
  globalLogger = null;
}
