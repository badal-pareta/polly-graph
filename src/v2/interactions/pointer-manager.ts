/**
 * V2 Canvas Graph - Pointer Manager
 *
 * Manages pointer position tracking and hit detection
 */

import { CanvasUtils, ErrorHandler, InteractionError } from '../utils';
import { CanvasState } from '../core/canvas-manager';

export interface PointerState {
  x: number;
  y: number;
}

export class PointerManager {
  private pointerPos: PointerState = { x: -1e12, y: -1e12 };
  private container?: HTMLElement;
  private canvasState?: CanvasState;

  /**
   * Initialize pointer tracking
   */
  initialize(container: HTMLElement, canvasState: CanvasState): void {
    try {
      this.container = container;
      this.canvasState = canvasState;

      // Setup pointer event listeners (force-graph pattern)
      ['pointermove', 'pointerdown'].forEach(evType =>
        container.addEventListener(evType, this.handlePointerEvent.bind(this), { passive: true })
      );

    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw new InteractionError('Failed to initialize pointer manager', {
        originalError: (error as Error).message
      });
    }
  }

  /**
   * Handle pointer events
   */
  private handlePointerEvent(event: Event): void {
    try {
      if (!this.container) return;

      const pointerEvent = event as PointerEvent;
      const offset = CanvasUtils.getElementOffset(this.container);

      this.pointerPos.x = pointerEvent.pageX - offset.left;
      this.pointerPos.y = pointerEvent.pageY - offset.top;
    } catch (error) {
      ErrorHandler.logError(error as Error, {
        eventType: event.type,
        pointerType: (event as PointerEvent).pointerType
      });
    }
  }

  /**
   * Get current pointer position
   */
  getPosition(): PointerState {
    return { ...this.pointerPos };
  }

  /**
   * Update pointer position manually (for testing)
   */
  setPosition(x: number, y: number): void {
    this.pointerPos.x = x;
    this.pointerPos.y = y;
  }

  /**
   * Get object under pointer using hit detection
   */
  getObjectUnderPointer(): any {
    if (!this.canvasState) return null;

    try {
      const { shadowCtx, colorTracker } = this.canvasState;
      const pixelData = CanvasUtils.getPixelData(
        shadowCtx,
        this.pointerPos.x,
        this.pointerPos.y
      );

      if (!pixelData) return null;

      return colorTracker.lookup(pixelData);
    } catch (error) {
      ErrorHandler.logError(error as Error, {
        pointerPosition: this.pointerPos
      });
      return null;
    }
  }

  /**
   * Test hit detection at specific coordinates
   */
  testHitDetection(x: number, y: number): any {
    const originalPos = { ...this.pointerPos };

    try {
      this.setPosition(x, y);
      return this.getObjectUnderPointer();
    } finally {
      this.pointerPos = originalPos;
    }
  }

  /**
   * Check if pointer is within canvas bounds
   */
  isWithinBounds(): boolean {
    if (!this.canvasState) return false;

    const { width, height } = this.canvasState;
    return (
      this.pointerPos.x >= 0 &&
      this.pointerPos.x <= width &&
      this.pointerPos.y >= 0 &&
      this.pointerPos.y <= height
    );
  }

  /**
   * Destroy pointer manager
   */
  destroy(): void {
    try {
      if (this.container) {
        ['pointermove', 'pointerdown'].forEach(evType => {
          this.container!.removeEventListener(evType, this.handlePointerEvent.bind(this));
        });
      }

      this.container = undefined;
      this.canvasState = undefined;
      this.pointerPos = { x: -1e12, y: -1e12 };
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }
}