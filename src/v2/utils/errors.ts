/**
 * V2 Canvas Graph - Error Handling
 */

import { V2Link, V2Node } from '../types';

type ErrorContext = Record<string, unknown>;

export class V2GraphError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: ErrorContext
  ) {
    super(message);
    this.name = 'V2GraphError';
  }
}

export class ValidationError extends V2GraphError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export class RenderError extends V2GraphError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'RENDER_ERROR', context);
    this.name = 'RenderError';
  }
}

export class InteractionError extends V2GraphError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'INTERACTION_ERROR', context);
    this.name = 'InteractionError';
  }
}

export class ConfigurationError extends V2GraphError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'CONFIGURATION_ERROR', context);
    this.name = 'ConfigurationError';
  }
}

/**
 * Error handler utility functions
 */
export const ErrorHandler = {
  /**
   * Validates container element
   */
  validateContainer(container: unknown): HTMLElement {
    if (!container) {
      throw new ValidationError('Container element is required');
    }

    if (!(container instanceof HTMLElement)) {
      throw new ValidationError('Container must be an HTMLElement', {
        received: typeof container
      });
    }

    if (!document.contains(container)) {
      throw new ValidationError('Container element must be attached to the DOM');
    }

    return container;
  },

  /**
   * Validates nodes array
   */
  validateNodes(nodes: unknown): V2Node[] {
    if (!Array.isArray(nodes)) {
      throw new ValidationError('Nodes must be an array', {
        received: typeof nodes
      });
    }

    nodes.forEach((node, index) => {
      if (!node || typeof node !== 'object') {
        throw new ValidationError(`Node at index ${index} must be an object`, {
          index,
          received: typeof node
        });
      }

      if (!node.id || typeof node.id !== 'string') {
        throw new ValidationError(`Node at index ${index} must have a valid string id`, {
          index,
          nodeId: node.id
        });
      }
    });

    return nodes;
  },

  /**
   * Validates links array
   */
  validateLinks(links: unknown): V2Link[] {
    if (!Array.isArray(links)) {
      throw new ValidationError('Links must be an array', {
        received: typeof links
      });
    }

    links.forEach((link, index) => {
      if (!link || typeof link !== 'object') {
        throw new ValidationError(`Link at index ${index} must be an object`, {
          index,
          received: typeof link
        });
      }

      if (!link.source) {
        throw new ValidationError(`Link at index ${index} must have a source`, {
          index
        });
      }

      if (!link.target) {
        throw new ValidationError(`Link at index ${index} must have a target`, {
          index
        });
      }
    });

    return links;
  },

  /**
   * Safe canvas context getter with error handling
   */
  getCanvasContext(canvas: HTMLCanvasElement, type: '2d'): CanvasRenderingContext2D {
    const ctx = canvas.getContext(type);
    if (!ctx) {
      throw new RenderError(`Failed to get ${type} context from canvas`, {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      });
    }
    return ctx;
  },

  /**
   * Safely handles async operations with error recovery
   */
  async withRetry<T>(
    operation: () => T | Promise<T>,
    maxRetries: number = 3,
    delay: number = 100
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          throw new V2GraphError(
            `Operation failed after ${maxRetries + 1} attempts: ${lastError.message}`,
            'MAX_RETRIES_EXCEEDED',
            { attempts: maxRetries + 1, originalError: lastError.message }
          );
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }

    throw lastError!;
  },

  /**
   * Logs errors with context in development
   */
  logError(error: Error, context?: ErrorContext): void {
    if (process.env.NODE_ENV !== 'production') {
      console.group('🚫 V2 Canvas Graph Error');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);

      if (context) {
        console.error('Context:', context);
      }

      if (error instanceof V2GraphError) {
        console.error('Error Code:', error.code);
        console.error('Error Context:', error.context);
      }

      console.groupEnd();
    }
  }
};