/**
 * Type definitions for Jest tests
 *
 * Suppresses type checking errors in test files
 */

declare module 'jest' {
  interface MockedFunction<T extends (...args: any[]) => any> {
    mockResolvedValue: (value: any) => any;
    mockResolvedValueOnce: (value: any) => any;
    mockRejectedValue: (value: any) => any;
    mockRejectedValueOnce: (value: any) => any;
    mockReturnValue: (value: any) => any;
    mockReturnValueOnce: (value: any) => any;
    mockImplementation: (fn: any) => any;
    mockClear: () => void;
    mockReset: () => void;
    calls: any[][];
  }
}
