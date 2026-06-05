/**
 * V2 Canvas Graph - Drag Manager
 *
 * Manages node dragging interactions with physics simulation
 */

import { select as d3Select } from 'd3-selection';
import { drag as d3Drag } from 'd3-drag';
import { zoomTransform as d3ZoomTransform } from 'd3-zoom';
import { sum as d3Sum } from 'd3-array';

import { ErrorHandler, InteractionError } from '../utils';
import { PointerManager } from './pointer-manager';
import { PhysicsManager } from '../core/physics-manager';

import { HoverManager } from './hover-manager';

export interface DragConfig {
  canvas: HTMLCanvasElement;
  pointerManager: PointerManager;
  physicsManager: PhysicsManager;
  hoverManager: HoverManager;
  onRender: () => void;
}

export interface DragState {
  isDragging: boolean;
  isPointerDragging: boolean;
}

export class DragManager {
  private config?: DragConfig;
  private state: DragState = {
    isDragging: false,
    isPointerDragging: false
  };

  private readonly DRAG_CLICK_TOLERANCE_PX = 3; // Force-graph constant

  /**
   * Initialize drag behavior
   */
  initialize(config: DragConfig): void {
    try {
      this.config = config;

      // Setup D3 drag behavior (exact force-graph pattern)
      d3Select(config.canvas).call(
        d3Drag<HTMLCanvasElement, unknown>()
          .subject(() => this.getDragSubject())
          .on('start', (ev) => this.handleDragStart(ev))
          .on('drag', (ev) => this.handleDrag(ev))
          .on('end', (ev) => this.handleDragEnd(ev))
      );

    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw new InteractionError('Failed to initialize drag manager', {
        originalError: (error as Error).message
      });
    }
  }

  /**
   * Get drag subject (node under pointer)
   */
  private getDragSubject(): any {
    if (!this.config) return null;

    try {
      const obj = this.config.hoverManager.getObjUnderPointer();
      return (obj && obj.type === 'Node') ? obj.d : null; // Only drag nodes
    } catch (error) {
      ErrorHandler.logError(error as Error);
      return null;
    }
  }

  /**
   * Handle drag start
   */
  private handleDragStart(event: any): void {
    if (!this.config) return;

    const obj = event.subject as any;
    if (!obj) return; // No node to drag

    try {
      // Store initial drag position (force-graph pattern)
      obj.__initialDragPos = {
        x: obj.x,
        y: obj.y,
        fx: obj.fx,
        fy: obj.fy
      };

      // Reheat simulation and fix node position
      if (!event.active) {
        this.config.physicsManager.reheat(0.3);
        obj.fx = obj.x;
        obj.fy = obj.y;
      }

      // Add drag cursor
      this.config.canvas.classList.add('grabbable');

    } catch (error) {
      ErrorHandler.logError(error as Error, {
        nodeId: obj?.id,
        eventActive: event.active
      });
    }
  }

  /**
   * Handle drag movement
   */
  private handleDrag(event: any): void {
    if (!this.config) return;

    const obj = event.subject as any;
    if (!obj) return; // No node to drag

    try {
      const initPos = obj.__initialDragPos;
      const dragPos = event;

      // Get current zoom scale
      const k = d3ZoomTransform(this.config.canvas).k;

      // Move fx/fy (and x/y) based on scaled drag distance
      obj.fx = obj.x = initPos.x + (dragPos.x - initPos.x) / k;
      obj.fy = obj.y = initPos.y + (dragPos.y - initPos.y) / k;

      // Only engage full drag if distance reaches threshold (force-graph pattern)
      if (!obj.__dragged && (this.DRAG_CLICK_TOLERANCE_PX >= Math.sqrt(d3Sum([
        (event.x - initPos.x) ** 2,
        (event.y - initPos.y) ** 2
      ])))) {
        return;
      }

      // Mark as being dragged
      this.state.isDragging = true;
      this.state.isPointerDragging = true;
      obj.__dragged = true;

      // Re-render during drag
      this.config.onRender();

    } catch (error) {
      ErrorHandler.logError(error as Error, {
        nodeId: obj?.id,
        dragPosition: { x: event.x, y: event.y }
      });
    }
  }

  /**
   * Handle drag end
   */
  private handleDragEnd(event: any): void {
    if (!this.config) return;

    const obj = event.subject as any;
    if (!obj) return; // No node was being dragged

    try {
      const initPos = obj.__initialDragPos;

      // Cool down simulation
      if (!event.active) {
        this.config.physicsManager.cooldown();
      }

      // Restore original fx/fy state
      if (initPos.fx === undefined) { obj.fx = undefined; }
      if (initPos.fy === undefined) { obj.fy = undefined; }
      delete obj.__initialDragPos;

      // Remove drag cursor
      this.config.canvas.classList.remove('grabbable');

      // Reset dragging state
      this.state.isDragging = false;
      this.state.isPointerDragging = false;

      // Final render if node was dragged
      if (obj.__dragged) {
        delete obj.__dragged;
        this.config.onRender();
      }

    } catch (error) {
      ErrorHandler.logError(error as Error, {
        nodeId: obj?.id,
        eventActive: event.active
      });
    }
  }

  /**
   * Get current drag state
   */
  getState(): DragState {
    return { ...this.state };
  }

  /**
   * Check if currently dragging
   */
  isDragging(): boolean {
    return this.state.isDragging;
  }

  /**
   * Check if pointer is dragging
   */
  isPointerDragging(): boolean {
    return this.state.isPointerDragging;
  }

  /**
   * Destroy drag manager
   */
  destroy(): void {
    try {
      if (this.config?.canvas) {
        // Remove D3 drag behavior
        d3Select(this.config.canvas).on('.drag', null);
        this.config.canvas.classList.remove('grabbable');
      }

      this.config = undefined;
      this.state = {
        isDragging: false,
        isPointerDragging: false
      };
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }
}