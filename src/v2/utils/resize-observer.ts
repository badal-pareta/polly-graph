/**
 * V2 Canvas Graph - Resize Observer Utility
 *
 * Observes HTMLElement for size changes and triggers canvas resize
 * Based on V1 implementation but adapted for V2 canvas architecture
 */

import { ErrorHandler } from './errors';

export interface ResizeCallback {
  (width: number, height: number): void;
}

/**
 * Observe element for size changes using ResizeObserver
 * Returns cleanup function to disconnect observer
 */
export function observeResize(element: HTMLElement, onResize: ResizeCallback): () => void {
  try {
    const observer = new ResizeObserver((entries: ResizeObserverEntry[]): void => {
      const entry = entries[0];
      if (!entry) return;

      /**
       * Use borderBoxSize for more accurate container dimensions,
       * falling back to contentRect for older browser compatibility.
       */
      const width = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;

      // Only trigger if dimensions are valid to prevent canvas/simulation crashes
      if (width > 0 && height > 0) {
        onResize(width, height);
      }
    });

    observer.observe(element);

    return (): void => {
      try {
        observer.disconnect();
      } catch (error) {
        ErrorHandler.logError(error as Error);
      }
    };
  } catch (error) {
    ErrorHandler.logError(error as Error, {
      hasResizeObserver: typeof ResizeObserver !== 'undefined',
      elementTag: element?.tagName
    });

    // Return no-op cleanup if ResizeObserver fails
    return () => {};
  }
}

/**
 * Calculate canvas dimensions with device pixel ratio scaling
 * Following force-graph patterns for retina display support
 */
export function calculateCanvasDimensions(width: number, height: number): {
  styleWidth: number;
  styleHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  devicePixelRatio: number;
} {
  const devicePixelRatio = window.devicePixelRatio || 1;

  return {
    styleWidth: width,
    styleHeight: height,
    canvasWidth: Math.floor(width * devicePixelRatio),
    canvasHeight: Math.floor(height * devicePixelRatio),
    devicePixelRatio
  };
}