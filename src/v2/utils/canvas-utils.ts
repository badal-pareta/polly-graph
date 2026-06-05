/**
 * V2 Canvas Graph - Canvas Utilities
 */

import { ErrorHandler, RenderError } from './errors';

/**
 * Canvas transformation utilities
 */
export const CanvasUtils = {
  /**
   * Reset canvas transform to device pixel ratio
   */
  resetTransform(ctx: CanvasRenderingContext2D): void {
    try {
      const pxRatio = window.devicePixelRatio || 1;
      ctx.setTransform(pxRatio, 0, 0, pxRatio, 0, 0);
    } catch (error) {
      throw new RenderError('Failed to reset canvas transform', {
        devicePixelRatio: window.devicePixelRatio
      });
    }
  },

  /**
   * Setup canvas with proper dimensions and scaling
   */
  setupCanvas(
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ): CanvasRenderingContext2D {
    try {
      const ctx = ErrorHandler.getCanvasContext(canvas, '2d');
      const pxScale = window.devicePixelRatio || 1;

      // Set actual canvas size
      canvas.width = width * pxScale;
      canvas.height = height * pxScale;

      // Set display size
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Scale context for crisp rendering
      ctx.scale(pxScale, pxScale);

      return ctx;
    } catch (error) {
      throw new RenderError('Failed to setup canvas', {
        width,
        height,
        devicePixelRatio: window.devicePixelRatio,
        originalError: (error as Error).message
      });
    }
  },

  /**
   * Create shadow canvas for hit detection
   */
  createShadowCanvas(width: number, height: number): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  } {
    try {
      const shadowCanvas = document.createElement('canvas');

      // Create context with performance optimization for frequent reads and disabled anti-aliasing
      const shadowCtx = shadowCanvas.getContext('2d', {
        willReadFrequently: true,
        alpha: false // Disable alpha channel for better performance and color precision
      });
      if (!shadowCtx) {
        throw new Error('Failed to get 2D context');
      }

      // Disable anti-aliasing for pixel-perfect color matching
      shadowCtx.imageSmoothingEnabled = false;

      this.setupCanvas(shadowCanvas, width, height);
      return { canvas: shadowCanvas, ctx: shadowCtx };
    } catch (error) {
      throw new RenderError('Failed to create shadow canvas', {
        width,
        height,
        originalError: (error as Error).message
      });
    }
  },

  /**
   * Get element offset (force-graph pattern)
   */
  getElementOffset(el: HTMLElement): { top: number; left: number } {
    try {
      const rect = el.getBoundingClientRect();
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      return {
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft
      };
    } catch (error) {
      throw new RenderError('Failed to get element offset', {
        elementTag: el.tagName,
        originalError: (error as Error).message
      });
    }
  },

  /**
   * Safe image data extraction
   */
  getPixelData(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    pixelRatio: number = window.devicePixelRatio || 1
  ): Uint8Array | null {
    try {
      if (x <= 0 || y <= 0) {
        return null;
      }

      const imageData = ctx.getImageData(
        x * pixelRatio,
        y * pixelRatio,
        1,
        1
      );

      return new Uint8Array(imageData.data);
    } catch (error) {
      // Silently fail for out-of-bounds access
      if ((error as Error).name === 'IndexSizeError') {
        return null;
      }

      ErrorHandler.logError(error as Error, {
        x,
        y,
        pixelRatio
      });

      return null;
    }
  }
};