/**
 * Centralized error handling for framework-independent graph operations.
 * Provides graceful degradation and helpful error messages.
 */

export interface ErrorContext {
  readonly operation: string;
  readonly component?: string;
  readonly data?: any;
}

export class GraphError extends Error {
  readonly code: string;
  readonly context: ErrorContext;
  readonly recoverable: boolean;

  constructor(
    message: string,
    code: string,
    context: ErrorContext,
    recoverable: boolean = false
  ) {
    super(message);
    this.name = 'GraphError';
    this.code = code;
    this.context = context;
    this.recoverable = recoverable;
  }
}

export class ErrorHandler {
  private static isDestroyed = false;

  /**
   * Handle errors with appropriate logging and recovery
   */
  static handle(error: Error, context: ErrorContext, fallback?: () => void): void {
    if (this.isDestroyed) return;

    const graphError = error instanceof GraphError ? error :
      new GraphError(
        error.message,
        'UNKNOWN_ERROR',
        context,
        true
      );

    // Log error with context
    console.error(`[Polly Graph] ${graphError.code}:`, {
      message: graphError.message,
      context: graphError.context,
      stack: graphError.stack
    });

    // Attempt recovery for recoverable errors
    if (graphError.recoverable && fallback) {
      try {
        fallback();
      } catch (fallbackError) {
        console.error('[Polly Graph] Fallback failed:', fallbackError);
      }
    } else if (!graphError.recoverable) {
      throw graphError;
    }
  }

  /**
   * Wrap async operations with error handling
   */
  static async wrapAsync<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    fallback?: () => T
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handle(error as Error, context, fallback ? () => fallback() : undefined);

      if (fallback) {
        return fallback();
      }

      throw error;
    }
  }

  /**
   * Wrap synchronous operations with error handling
   */
  static wrap<T>(
    operation: () => T,
    context: ErrorContext,
    fallback?: () => T
  ): T | undefined {
    try {
      return operation();
    } catch (error) {
      this.handle(error as Error, context, fallback);
      return fallback ? fallback() : undefined;
    }
  }

  /**
   * Safe DOM operation wrapper
   */
  static safeDOMOperation<T>(
    operation: () => T,
    context: ErrorContext,
    fallback?: () => T
  ): T | undefined {
    if (!document || this.isDestroyed) {
      if (fallback) {
        return fallback();
      }
      return undefined;
    }

    return this.wrap(operation, {
      ...context,
      operation: `DOM: ${context.operation}`
    }, fallback);
  }

  /**
   * Safe D3 operation wrapper
   */
  static safeD3Operation<T>(
    operation: () => T,
    context: ErrorContext,
    fallback?: () => T
  ): T | undefined {
    return this.wrap(operation, {
      ...context,
      operation: `D3: ${context.operation}`
    }, fallback);
  }

  /**
   * Create recoverable error for non-critical failures
   */
  static createRecoverableError(
    message: string,
    code: string,
    context: ErrorContext
  ): GraphError {
    return new GraphError(message, code, context, true);
  }

  /**
   * Create non-recoverable error for critical failures
   */
  static createCriticalError(
    message: string,
    code: string,
    context: ErrorContext
  ): GraphError {
    return new GraphError(message, code, context, false);
  }

  /**
   * Validate and handle D3 selection operations
   */
  static validateSelection<T>(
    selection: any,
    context: ErrorContext,
    operation: (sel: T) => void
  ): void {
    if (!selection || !selection.size || selection.size() === 0) {
      this.handle(
        this.createRecoverableError(
          'D3 selection is empty',
          'SELECTION_EMPTY',
          context
        ),
        context
      );
      return;
    }

    this.safeD3Operation(() => operation(selection), context);
  }

  /**
   * Handle simulation errors with graceful degradation
   */
  static handleSimulationError(
    error: Error,
    context: ErrorContext,
    simulation?: any
  ): void {
    const graphError = this.createRecoverableError(
      `Simulation error: ${error.message}`,
      'SIMULATION_ERROR',
      context
    );

    this.handle(graphError, context, () => {
      // Attempt to stop and restart simulation
      if (simulation && typeof simulation.stop === 'function') {
        simulation.stop();
      }
    });
  }

  /**
   * Mark error handler as destroyed to prevent further operations
   */
  static destroy(): void {
    this.isDestroyed = true;
  }

  /**
   * Reset error handler state
   */
  static reset(): void {
    this.isDestroyed = false;
  }
}