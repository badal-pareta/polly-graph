/**
 * V2 Canvas Graph - Canvas Manager
 *
 * Manages canvas creation, setup, and lifecycle
 */

import ColorTracker from 'canvas-color-tracker';
import { CanvasUtils, ErrorHandler, ValidationError } from '../utils';
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
   * Destroy canvas system
   */
  destroy(): void {
    if (!this.state) return;

    try {
      const { canvas, colorTracker } = this.state;

      // Remove canvas from DOM
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }

      // Clear color tracker
      colorTracker.reset();

      this.state = undefined;
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Get canvas statistics
   */
  getStats(): {
    dimensions: { width: number; height: number };
    colorTracker: any;
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