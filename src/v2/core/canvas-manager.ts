/**
 * V2 Canvas Graph - Canvas Manager
 *
 * Manages canvas creation, setup, and lifecycle
 */

import ColorTracker from 'canvas-color-tracker';
import { CanvasUtils, ErrorHandler, ValidationError, observeResize, calculateCanvasDimensions } from '../utils';
import { V2Config } from '../types';

export interface CanvasState {
  canvas: HTMLCanvasElement;
  shadowCanvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  shadowCtx: CanvasRenderingContext2D;
  colorTracker: ColorTracker;
  width: number;
  height: number;
}

export class CanvasManager {
  private state?: CanvasState;
  private resizeCleanup?: () => void;
  private resizeCallback?: (width: number, height: number) => void;

  /**
   * Initialize canvas system
   */
  initialize(config: V2Config): CanvasState {
    try {
      const container = ErrorHandler.validateContainer(config.container);

      // Calculate dimensions
      const containerRect = container.getBoundingClientRect();
      const width = config.width || containerRect.width || 800;
      const height = config.height || containerRect.height || 600;

      if (width <= 0 || height <= 0) {
        throw new ValidationError('Canvas dimensions must be positive', {
          width,
          height,
          containerWidth: containerRect.width,
          containerHeight: containerRect.height
        });
      }

      // Create main canvas
      const canvas = document.createElement('canvas');
      if (config.backgroundColor) {
        canvas.style.background = config.backgroundColor;
      }
      // Set initial cursor to grab to indicate canvas is pannable
      canvas.style.cursor = 'grab';
      container.appendChild(canvas);

      // Setup main canvas
      const ctx = CanvasUtils.setupCanvas(canvas, width, height);

      // Create shadow canvas for hit detection
      const { canvas: shadowCanvas, ctx: shadowCtx } = CanvasUtils.createShadowCanvas(width, height);

      // Initialize color tracker
      const colorTracker = new ColorTracker();

      this.state = {
        canvas,
        shadowCanvas,
        ctx,
        shadowCtx,
        colorTracker,
        width,
        height
      };

      return this.state;
    } catch (error) {
      ErrorHandler.logError(error as Error, {
        configWidth: config.width,
        configHeight: config.height,
        backgroundColor: config.backgroundColor
      });
      throw error;
    }
  }

  /**
   * Get current canvas state
   */
  getState(): CanvasState {
    if (!this.state) {
      throw new ValidationError('Canvas manager not initialized');
    }
    return this.state;
  }

  /**
   * Clear both canvases
   */
  clear(): void {
    if (!this.state) return;

    const { ctx, shadowCtx, width, height } = this.state;

    try {
      // Reset transforms and clear
      [ctx, shadowCtx].forEach(c => {
        CanvasUtils.resetTransform(c);
        c.clearRect(0, 0, width, height);
      });
    } catch (error) {
      ErrorHandler.logError(error as Error, { width, height });
    }
  }

  /**
   * Apply transform to both canvases
   */
  applyTransform(transform: { x: number; y: number; k: number }): void {
    if (!this.state) return;

    const { ctx, shadowCtx } = this.state;

    try {
      [ctx, shadowCtx].forEach(c => {
        CanvasUtils.resetTransform(c);
        c.translate(transform.x, transform.y);
        c.scale(transform.k, transform.k);
      });
    } catch (error) {
      ErrorHandler.logError(error as Error, { transform });
    }
  }

  /**
   * Setup resize observer for responsive canvas
   * Following force-graph patterns for container-driven resizing
   */
  setupResize(container: HTMLElement, onResize?: (width: number, height: number) => void): void {
    this.resizeCallback = onResize;

    try {
      this.resizeCleanup = observeResize(container, (width, height) => {
        this.resizeCanvas(width, height);

        // Call external resize callback if provided
        if (this.resizeCallback) {
          this.resizeCallback(width, height);
        }
      });
    } catch (error) {
      ErrorHandler.logError(error as Error, {
        containerTag: container?.tagName
      });
    }
  }

  /**
   * Resize canvas to new dimensions
   * Following force-graph's adjustCanvasSize pattern with device pixel ratio scaling
   */
  resizeCanvas(width: number, height: number): void {
    if (!this.state) return;

    try {
      const dimensions = calculateCanvasDimensions(width, height);
      const { canvas, shadowCanvas } = this.state;

      // Update both main and shadow canvas following force-graph pattern
      [canvas, shadowCanvas].forEach(canvasEl => {
        // Element size (CSS pixels)
        canvasEl.style.width = `${dimensions.styleWidth}px`;
        canvasEl.style.height = `${dimensions.styleHeight}px`;

        // Memory size (scaled for device pixel ratio to avoid blurriness)
        canvasEl.width = dimensions.canvasWidth;
        canvasEl.height = dimensions.canvasHeight;

        // Scale context to handle device pixel ratio (force-graph pattern)
        const ctx = canvasEl.getContext('2d');
        if (ctx && dimensions.devicePixelRatio !== 1) {
          ctx.scale(dimensions.devicePixelRatio, dimensions.devicePixelRatio);
        }
      });

      // Update internal state
      this.state.width = width;
      this.state.height = height;

    } catch (error) {
      ErrorHandler.logError(error as Error, { width, height });
    }
  }

  /**
   * Get current canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    if (!this.state) {
      return { width: 0, height: 0 };
    }
    return {
      width: this.state.width,
      height: this.state.height
    };
  }

  /**
   * Destroy canvas system
   */
  destroy(): void {
    if (!this.state) return;

    try {
      const { canvas, colorTracker } = this.state;

      // Cleanup resize observer
      if (this.resizeCleanup) {
        this.resizeCleanup();
        this.resizeCleanup = undefined;
      }

      // Remove canvas from DOM
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }

      // Clear color tracker
      colorTracker.reset();

      this.state = undefined;
      this.resizeCallback = undefined;
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Get canvas statistics
   */
  getStats(): {
    dimensions: { width: number; height: number };
    colorTracker: ColorTracker;
    devicePixelRatio: number;
  } {
    if (!this.state) {
      throw new ValidationError('Canvas manager not initialized');
    }

    return {
      dimensions: {
        width: this.state.width,
        height: this.state.height
      },
      colorTracker: this.state.colorTracker,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  }
}