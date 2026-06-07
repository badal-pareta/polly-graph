/**
 * V2 Canvas Graph - Zoom Manager
 *
 * Manages zoom and pan interactions
 */

import { select as d3Select } from 'd3-selection';
import { zoom as d3Zoom, zoomTransform as d3ZoomTransform, zoomIdentity } from 'd3-zoom';
import type { D3ZoomEvent, ZoomBehavior } from 'd3-zoom';

import { ErrorHandler, InteractionError } from '../utils';
import { CanvasManager } from '../core/canvas-manager';

export interface ZoomConfig {
  canvas: HTMLCanvasElement;
  canvasManager: CanvasManager;
  onRender: () => void;
  minZoom?: number;
  maxZoom?: number;
  isOverEntity?: () => boolean; // Function to check if mouse is over an entity
}

type CanvasZoomEvent = D3ZoomEvent<HTMLCanvasElement, unknown>;

export class ZoomManager {
  private config?: ZoomConfig;
  private zoomBehavior?: ZoomBehavior<HTMLCanvasElement, unknown>;

  /**
   * Initialize zoom behavior
   */
  initialize(config: ZoomConfig): void {
    try {
      this.config = config;

      // Create D3 zoom behavior (force-graph pattern)
      this.zoomBehavior = d3Zoom<HTMLCanvasElement, unknown>();
      const zoomBaseElem = d3Select(config.canvas);

      // Attach zoom to canvas
      this.zoomBehavior(zoomBaseElem);

      // Disable double-click to zoom (force-graph pattern)
      zoomBaseElem.on('dblclick.zoom', null);

      // Configure zoom behavior
      this.zoomBehavior
        .scaleExtent([config.minZoom || 0.01, config.maxZoom || 1000])
        .filter((event) => {
          // Stop event propagation to prevent document bubbling
          event.stopPropagation();
          event.preventDefault();

          // Don't pan if right mouse button
          if (event.button) return false;

          // // Don't pan if mouse is over an entity (let selection/hover handle it)
          // if (config.isOverEntity && config.isOverEntity()) return false;

          if (config.isOverEntity && config.isOverEntity() && event.type !== 'wheel') {
            return false;
          }

          return true;
        })
        .on('start', (event: CanvasZoomEvent) => this.handleZoomStart(event))
        .on('zoom', (event: CanvasZoomEvent) => this.handleZoom(event))
        .on('end', (event: CanvasZoomEvent) => this.handleZoomEnd(event));

      // Don't set initial transform here - let it be set after physics starts

    } catch (error) {
      ErrorHandler.logError(error as Error, {
        minZoom: config.minZoom,
        maxZoom: config.maxZoom
      });
      throw new InteractionError('Failed to initialize zoom manager', {
        originalError: (error as Error).message
      });
    }
  }

  /**
   * Set initial centered transform (call after physics starts)
   */
  setInitialTransform(): void {
    if (!this.config?.canvas || !this.zoomBehavior) return;

    try {
      const canvasDims = this.config.canvasManager.getDimensions();
      const initialTransform = zoomIdentity.translate(canvasDims.width / 2, canvasDims.height / 2);

      const zoomBaseElem = d3Select(this.config.canvas);
      zoomBaseElem.call(this.zoomBehavior.transform, initialTransform);
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Handle zoom start (when panning begins)
   */
  private handleZoomStart(event: CanvasZoomEvent): void {
    if (!this.config) return;

    try {
      // Stop event propagation
      event.sourceEvent?.stopPropagation();
      event.sourceEvent?.preventDefault();

      // Change cursor to grabbing when panning starts
      this.config.canvas.style.cursor = 'grabbing';
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Handle zoom events
   */
  private handleZoom(event: CanvasZoomEvent): void {
    if (!this.config) return;

    try {
      // Stop event propagation
      event.sourceEvent?.stopPropagation();
      event.sourceEvent?.preventDefault();

      const transform = event.transform;

      // Apply transform to canvases
      this.config.canvasManager.clear();
      this.config.canvasManager.applyTransform(transform);

      // Re-render with new transform
      this.config.onRender();

    } catch (error) {
      ErrorHandler.logError(error as Error, {
        transform: event.transform
      });
    }
  }

  /**
   * Handle zoom end (when panning ends)
   */
  private handleZoomEnd(event: CanvasZoomEvent): void {
    if (!this.config) return;

    try {
      // Stop event propagation
      event.sourceEvent?.stopPropagation();
      event.sourceEvent?.preventDefault();

      // Only reset cursor to grab if we're not hovering over an entity
      // The hover manager will handle cursor when over entities
      const currentCursor = this.config.canvas.style.cursor;
      if (currentCursor === 'grabbing') {
        this.config.canvas.style.cursor = 'grab';
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Get zoom behavior instance
   */
  getZoomBehavior(): ZoomBehavior<HTMLCanvasElement, unknown> | undefined {
    return this.zoomBehavior;
  }

  /**
   * Get current zoom transform
   */
  getTransform(): { scale: number; x: number; y: number } {
    if (!this.config?.canvas) {
      throw new InteractionError('Zoom manager not initialized');
    }

    try {
      const transform = d3ZoomTransform(this.config.canvas);
      return {
        scale: transform.k,
        x: transform.x,
        y: transform.y
      };
    } catch (error) {
      ErrorHandler.logError(error as Error);
      return { scale: 1, x: 0, y: 0 };
    }
  }

  /**
   * Programmatically zoom in
   */
  zoomIn(factor: number = 1.5, center?: [number, number]): void {
    if (!this.config?.canvas || !this.zoomBehavior) return;

    try {
      const canvas = this.config.canvas;

      if (center) {
        // Use provided center point
        d3Select(canvas)
          .transition()
          .duration(300)
          .call(this.zoomBehavior.scaleBy, factor, center);
      } else {
        // No center specified - let D3 use default behavior (viewport center)
        // This matches V1 behavior and zooms toward the viewport center
        d3Select(canvas)
          .transition()
          .duration(300)
          .call(this.zoomBehavior.scaleBy, factor);
      }

    } catch (error) {
      ErrorHandler.logError(error as Error, { factor, center });
    }
  }

  /**
   * Programmatically zoom out
   */
  zoomOut(factor: number = 1.5, center?: [number, number]): void {
    this.zoomIn(1 / factor, center);
  }

  /**
   * Reset zoom to scale=1 but center the content like fitView
   */
  resetZoom(duration: number = 500): void {
    if (!this.config?.canvas || !this.zoomBehavior) return;

    try {
      // Get canvas dimensions
      const canvasDims = this.config.canvasManager.getDimensions();

      // Create transform that centers content at scale=1 (like force-graph reset)
      // This moves the viewport to show content centered, similar to fitView but with scale=1
      const transform = zoomIdentity.translate(canvasDims.width / 2, canvasDims.height / 2);

      d3Select(this.config.canvas)
        .transition()
        .duration(duration)
        .call(this.zoomBehavior.transform, transform);
    } catch (error) {
      ErrorHandler.logError(error as Error, { duration });
    }
  }

  /**
   * Set zoom to specific transform
   */
  setTransform(transform: { k: number; x: number; y: number }, duration: number = 0): void {
    if (!this.config?.canvas || !this.zoomBehavior) return;

    try {
      const selection = d3Select(this.config.canvas);

      // Create proper ZoomTransform from object
      const zoomTransform = zoomIdentity.translate(transform.x, transform.y).scale(transform.k);

      if (duration > 0) {
        selection
          .transition()
          .duration(duration)
          .call(this.zoomBehavior.transform, zoomTransform);
      } else {
        selection.call(this.zoomBehavior.transform, zoomTransform);
      }

    } catch (error) {
      ErrorHandler.logError(error as Error, { transform, duration });
    }
  }

  /**
   * Fit view to content bounds (force-graph zoomToFit implementation)
   */
  fitView(bounds: { x: [number, number]; y: [number, number] }, padding: number = 10): Promise<void> {
    return new Promise((resolve) => {
      if (!this.config?.canvas || !this.zoomBehavior) {
        resolve();
        return;
      }

    try {
      const canvas = this.config.canvas;
      const transitionDuration = 750;

      // Get canvas dimensions from CanvasManager (more reliable than getBoundingClientRect during resize)
      const canvasDims = this.config.canvasManager.getDimensions();

      const dx = bounds.x[1] - bounds.x[0];
      const dy = bounds.y[1] - bounds.y[0];

      // Avoid division by zero and ensure minimum bounds
      if (dx <= 0 || dy <= 0) {
        this.resetZoom();
        resolve();
        return;
      }

      // Calculate center point (force-graph pattern)
      const center = {
        x: (bounds.x[0] + bounds.x[1]) / 2,
        y: (bounds.y[0] + bounds.y[1]) / 2,
      };

      // Calculate zoom scale (force-graph pattern)
      const zoomK = Math.max(1e-12, Math.min(1e12,
        (canvasDims.width - padding * 2) / dx,
        (canvasDims.height - padding * 2) / dy)
      );


      // Create transform using D3 zoomIdentity pattern (like monolithic version)
      const transform = zoomIdentity
        .translate(canvasDims.width / 2, canvasDims.height / 2)
        .scale(zoomK)
        .translate(-center.x, -center.y);

      // Apply transform directly using D3 selection
      d3Select(canvas)
        .transition()
        .duration(transitionDuration)
        .call(this.zoomBehavior.transform, transform)
        .on('end', () => resolve());

      } catch (error) {
        ErrorHandler.logError(error as Error, { bounds, padding });
        // Fallback to reset zoom on error
        this.resetZoom();
        resolve();
      }
    });
  }

  /**
   * Check if zoom is at reset state (scale=1, centered)
   */
  isAtIdentity(): boolean {
    if (!this.config?.canvas) return false;

    const transform = this.getTransform();
    const canvasDims = this.config.canvasManager.getDimensions();
    const expectedX = canvasDims.width / 2;
    const expectedY = canvasDims.height / 2;

    return transform.scale === 1 &&
           Math.abs(transform.x - expectedX) < 1 &&
           Math.abs(transform.y - expectedY) < 1;
  }

  /**
   * Get zoom statistics
   */
  getStats(): {
    transform: { scale: number; x: number; y: number };
    scaleExtent: [number, number];
    isAtIdentity: boolean;
  } {
    if (!this.zoomBehavior) {
      throw new InteractionError('Zoom manager not initialized');
    }

    return {
      transform: this.getTransform(),
      scaleExtent: this.zoomBehavior.scaleExtent() as [number, number],
      isAtIdentity: this.isAtIdentity()
    };
  }

  /**
   * Destroy zoom manager
   */
  destroy(): void {
    try {
      if (this.config?.canvas && this.zoomBehavior) {
        // Remove zoom behavior
        d3Select(this.config.canvas).on('.zoom', null);
      }

      this.config = undefined;
      this.zoomBehavior = undefined;
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }
}