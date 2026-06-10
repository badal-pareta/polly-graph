/**
 * V2 Canvas Graph - Drag Manager
 *
 * Manages node dragging interactions with physics simulation
 */

import { select as d3Select } from 'd3-selection';
import { drag as d3Drag, D3DragEvent } from 'd3-drag';
import { zoomTransform as d3ZoomTransform } from 'd3-zoom';
import { sum as d3Sum } from 'd3-array';

import { ErrorHandler, InteractionError } from '../utils';
import { PhysicsManager } from '../core/physics-manager';
import { V2Node } from '../types/graph.types';

import { HoverManager } from './hover-manager';

// Extended node type with drag-specific properties
interface DraggableV2Node extends V2Node {
  __initialDragPos?: {
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
  };
  __dragged?: boolean;
}

export interface DragConfig {
  canvas: HTMLCanvasElement;
  // pointerManager: PointerManager;
  physicsManager: PhysicsManager;
  hoverManager: HoverManager;
  onRender: () => void;
  renderer?: { setDragState(isDragging: boolean): void; setDraggedNode(node: V2Node): void };
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

  // RAF throttling for smooth drag performance
  private dragRenderPending = false;
  private lastDragRenderTime = 0;

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
  private getDragSubject(): DraggableV2Node | null {
    if (!this.config) return null;

    try {
      const obj = this.config.hoverManager.getObjUnderPointer();
      return (obj && obj.d.entityType === 'Node') ? obj.d as DraggableV2Node : null; // Only drag nodes
    } catch (error) {
      ErrorHandler.logError(error as Error);
      return null;
    }
  }

  /**
   * Handle drag start
   */
  private handleDragStart(event: D3DragEvent<HTMLCanvasElement, unknown, DraggableV2Node>): void {
    if (!this.config) return;

    const obj = event.subject;
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
        this.config.physicsManager.reheat();
        obj.fx = obj.x;
        obj.fy = obj.y;
      }

      // Add drag cursor
      this.config.canvas.classList.add('grabbable');

      // Set dragged node for optimization (like ZoomManager pattern)
      if (this.config.renderer) {
        this.config.renderer.setDraggedNode(obj);
        this.config.renderer.setDragState(true);
      }

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
  private handleDrag(event: D3DragEvent<HTMLCanvasElement, unknown, DraggableV2Node>): void {
    if (!this.config) return;

    const obj = event.subject;
    if (!obj) return; // No node to drag

    try {
      const initPos = obj.__initialDragPos;
      if (!initPos) return; // No initial position stored

      const dragPos = event;

      // Get current zoom scale
      const k = d3ZoomTransform(this.config.canvas).k;

      // Move fx/fy (and x/y) based on scaled drag distance
      const initX = initPos.x ?? 0;
      const initY = initPos.y ?? 0;
      obj.fx = obj.x = initX + (dragPos.x - initX) / k;
      obj.fy = obj.y = initY + (dragPos.y - initY) / k;

      // Only engage full drag if distance reaches threshold (force-graph pattern)
      if (!obj.__dragged && (this.DRAG_CLICK_TOLERANCE_PX >= Math.sqrt(d3Sum([
        (event.x - initX) ** 2,
        (event.y - initY) ** 2
      ])))) {
        return;
      }

      // Mark as being dragged
      this.state.isDragging = true;
      this.state.isPointerDragging = true;
      obj.__dragged = true;

      // RAF-throttled re-render during drag (like ZoomManager)
      this.throttledDragRender();

    } catch (error) {
      ErrorHandler.logError(error as Error, {
        nodeId: obj?.id,
        dragPosition: { x: event.x, y: event.y }
      });
    }
  }

  /**
   * RAF-throttled render during drag (like ZoomManager pattern)
   */
  private throttledDragRender(): void {
    if (!this.config) return;

    // Only render if enough time has passed (16ms = ~60fps)
    const now = performance.now();
    if (now - this.lastDragRenderTime < 16) return;

    // RAF throttling for smooth performance
    if (this.dragRenderPending) return;

    this.dragRenderPending = true;
    requestAnimationFrame(() => {
      this.dragRenderPending = false;
      this.lastDragRenderTime = performance.now();

      if (this.config && this.state.isPointerDragging) {
        this.config.onRender();
      }
    });
  }

  /**
   * Handle drag end
   */
  private handleDragEnd(event: D3DragEvent<HTMLCanvasElement, unknown, DraggableV2Node>): void {
    if (!this.config) return;

    const obj = event.subject;
    if (!obj) return; // No node was being dragged

    try {
      const initPos = obj.__initialDragPos;

      // Cool down simulation
      if (!event.active) {
        this.config.physicsManager.cooldown();
      }

      // Restore original fx/fy state if initPos exists
      if (initPos) {
        if (initPos.fx === undefined) { obj.fx = undefined; }
        if (initPos.fy === undefined) { obj.fy = undefined; }
      }
      delete obj.__initialDragPos;

      // Remove drag cursor
      this.config.canvas.classList.remove('grabbable');

      // Reset dragging state
      this.state.isDragging = false;
      this.state.isPointerDragging = false;

      // End drag optimization (like ZoomManager pattern)
      if (this.config.renderer) {
        this.config.renderer.setDragState(false);
      }

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