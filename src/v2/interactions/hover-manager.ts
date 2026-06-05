/**
 * V2 Canvas Graph - Hover Manager (Force-Graph Pattern)
 *
 * Exact replication of force-graph's hover detection mechanism
 */

import { throttle } from 'lodash-es';
import { ErrorHandler } from '../utils';
import { CanvasState } from '../core';
import { V2Node, V2Link } from '../types';

export interface HoverState {
  currentHovered: {
    type: 'Node' | 'Link';
    d: V2Node | V2Link;
  } | null;
  previousHovered: {
    type: 'Node' | 'Link';
    d: V2Node | V2Link;
  } | null;
  pointerPosition: { x: number; y: number } | null;
  isDragging: boolean;
}

export interface HoverEvent {
  type: 'nodeHover' | 'nodeUnhover' | 'linkHover' | 'linkUnhover';
  current: V2Node | V2Link | null;
  previous: V2Node | V2Link | null;
}

// Force-graph throttle delay for shadow canvas updates
const HOVER_CANVAS_THROTTLE_DELAY = 800; // ms

export class HoverManager {
  private canvasState?: CanvasState;
  private hoverState: HoverState = {
    currentHovered: null,
    previousHovered: null,
    pointerPosition: null,
    isDragging: false
  };
  private eventHandlers = new Map<string, Set<(event: HoverEvent) => void>>();
  private container?: HTMLElement;
  private refreshShadowCanvas?: () => void;
  private flushShadowCanvas?: () => void;
  private hasValidPointerPosition = false;

  /**
   * Initialize hover manager with force-graph pattern
   */
  initialize(canvasState: CanvasState): void {
    try {
      this.canvasState = canvasState;
      this.container = canvasState.canvas.parentElement as HTMLElement;

      if (!this.container) {
        console.error('Canvas parent element is null. Canvas:', canvasState.canvas);
        console.error('Canvas parent:', canvasState.canvas.parentElement);
        console.error('Canvas in DOM:', document.contains(canvasState.canvas));
        throw new Error('Canvas container not found - canvas may not be added to DOM yet');
      }

      // Setup pointer tracking (force-graph pattern)
      this.setupPointerTracking();

      // Setup throttled shadow canvas refresh (force-graph pattern)
      this.setupShadowCanvasThrottling();

    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw error;
    }
  }

  /**
   * Setup pointer position tracking (exact force-graph pattern)
   */
  private setupPointerTracking(): void {
    if (!this.container || !this.canvasState) return;

    // Initialize pointer position
    this.hoverState.pointerPosition = { x: -1e12, y: -1e12 };

    // Capture pointer coords on move or touchstart (force-graph lines 522-551)
    ['pointermove', 'pointerdown'].forEach(evType =>
      this.container!.addEventListener(evType, (ev: Event) => {
        const pointerEvent = ev as PointerEvent;
        // Update the pointer pos (force-graph pattern)
        if (!this.container) {
          console.warn('Container not available for pointer tracking');
          return;
        }
        const offset = this.getOffset(this.container);
        const newX = pointerEvent.pageX - offset.left;
        const newY = pointerEvent.pageY - offset.top;

        // Store in hover state
        this.hoverState.pointerPosition = { x: newX, y: newY };
        this.hasValidPointerPosition = true;

        // Update hover immediately when pointer moves
        if (evType === 'pointermove') {
          this.updateHover();
        }

      }, { passive: true })
    );
  }

  /**
   * Get element offset (force-graph lines 544-549)
   */
  private getOffset(el: HTMLElement): { top: number; left: number } {
    if (!el) {
      console.error('getOffset called with null/undefined element');
      return { top: 0, left: 0 };
    }
    const rect = el.getBoundingClientRect();
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
  }

  /**
   * Setup shadow canvas throttling (force-graph pattern lines 598-609)
   */
  private setupShadowCanvasThrottling(): void {
    if (!this.canvasState) return;

    this.refreshShadowCanvas = throttle(() => {
      this.renderShadowCanvas();
    }, HOVER_CANVAS_THROTTLE_DELAY);

    // Hook to immediately invoke shadow canvas paint (force-graph line 609)
    this.flushShadowCanvas = (this.refreshShadowCanvas as any).flush;
  }

  /**
   * Render shadow canvas for hit detection
   */
  private renderShadowCanvas(): void {
    if (!this.canvasState) return;

    try {
      const { shadowCtx, width, height } = this.canvasState;

      // Clear shadow canvas (force-graph line 600)
      shadowCtx.save();
      const pxRatio = window.devicePixelRatio;
      shadowCtx.setTransform(pxRatio, 0, 0, pxRatio, 0, 0);
      shadowCtx.clearRect(0, 0, width, height);
      shadowCtx.restore();


      // Trigger shadow canvas rendering via event
      this.emit('shadowCanvasUpdate');

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Get object under pointer (exact force-graph pattern lines 386-395)
   */
  getObjUnderPointer(): { type: 'Node' | 'Link'; d: V2Node | V2Link } | null {
    if (!this.canvasState || !this.hoverState.pointerPosition) {
      return null;
    }

    try {
      const { shadowCtx, colorTracker } = this.canvasState;
      const { pointerPosition } = this.hoverState;

      let obj = null;
      const pxScale = window.devicePixelRatio;

      // Get pixel data with device pixel ratio scaling (force-graph lines 389-390)
      const px = (pointerPosition.x > 0 && pointerPosition.y > 0)
        ? shadowCtx.getImageData(
            pointerPosition.x * pxScale,
            pointerPosition.y * pxScale,
            1, 1
          )
        : null;

      // Lookup object per pixel color (force-graph lines 393-394)
      if (px && px.data.length >= 3) {
        // Force-graph passes px.data directly, which is Uint8ClampedArray
        obj = colorTracker.lookup(px.data);

      }

      return obj;

    } catch (error) {
      ErrorHandler.logError(error as Error, {
        pointerPosition: this.hoverState.pointerPosition
      });
      return null;
    }
  }

  /**
   * Compare two hover objects for equality
   */
  private isSameHoverObject(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    if (!obj1 || !obj2) return false;
    if (obj1.type !== obj2.type) return false;

    // Compare by ID for nodes, or by source/target for links
    if (obj1.type === 'Node') {
      return (obj1.d as any)?.id === (obj2.d as any)?.id;
    } else if (obj1.type === 'Link') {
      const link1 = obj1.d as any;
      const link2 = obj2.d as any;
      const source1 = typeof link1?.source === 'string' ? link1.source : link1?.source?.id;
      const target1 = typeof link1?.target === 'string' ? link1.target : link1?.target?.id;
      const source2 = typeof link2?.source === 'string' ? link2.source : link2?.source?.id;
      const target2 = typeof link2?.target === 'string' ? link2.target : link2?.target?.id;
      return source1 === source2 && target1 === target2;
    }

    return false;
  }

  /**
   * Update hover state (force-graph pattern lines 618-646)
   */
  updateHover(): void {
    if (!this.canvasState || this.hoverState.isDragging || !this.hasValidPointerPosition) {
      return; // don't hover during drag or before pointer is initialized (force-graph line 619)
    }

    try {
      const obj = this.getObjUnderPointer();

      // Compare objects
      const isSameObject = this.isSameHoverObject(obj, this.hoverState.currentHovered);

      if (!isSameObject) {
        const prevObj = this.hoverState.currentHovered;
        const prevObjType = prevObj ? prevObj.type : null;
        const objType = obj ? obj.type : null;

        // Update state before emitting events
        this.hoverState.previousHovered = prevObj;
        this.hoverState.currentHovered = obj;

        // Update cursor based on hover state
        this.updateCursor(obj);

        // Hover out event (force-graph lines 625-629)
        if (prevObjType && prevObjType !== objType && prevObj) {
          this.emit(`${prevObjType.toLowerCase()}Unhover`, {
            type: `${prevObjType.toLowerCase()}Unhover` as any,
            current: null,
            previous: prevObj.d
          });
        }

        // Hover in event (force-graph lines 630-634)
        if (objType && obj) {
          this.emit(`${objType.toLowerCase()}Hover`, {
            type: `${objType.toLowerCase()}Hover` as any,
            current: obj.d,
            previous: prevObjType === objType && prevObj ? prevObj.d : null
          });
        }
      }

      // Refresh shadow canvas on redraw (force-graph line 647)
      this.refreshShadowCanvas && this.refreshShadowCanvas();

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Set dragging state (to disable hover during drag)
   */
  setDragging(isDragging: boolean): void {
    this.hoverState.isDragging = isDragging;
  }

  /**
   * Update cursor based on hover state
   */
  private updateCursor(obj: { type: 'Node' | 'Link'; d: V2Node | V2Link } | null): void {
    if (!this.canvasState?.canvas) return;

    const canvas = this.canvasState.canvas;

    if (obj) {
      // Set pointer cursor for hoverable/selectable entities
      canvas.style.cursor = 'pointer';
    } else {
      // Reset to grab cursor for empty canvas (pannable)
      canvas.style.cursor = 'grab';
    }
  }

  /**
   * Get current hover state
   */
  getHoverState(): HoverState {
    return { ...this.hoverState };
  }

  /**
   * Add event listener
   */
  on(event: string, handler: (event: HoverEvent) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: (event: HoverEvent) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, data?: HoverEvent): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data as HoverEvent);
        } catch (error) {
          ErrorHandler.logError(error as Error, { event });
        }
      });
    }
  }

  /**
   * Flush shadow canvas immediately (force-graph pattern)
   */
  flushShadow(): void {
    this.flushShadowCanvas && this.flushShadowCanvas();
  }

  /**
   * Debug hover state
   */
  debugHoverState(): void {
    console.log('Hover State:', {
      current: this.hoverState.currentHovered,
      previous: this.hoverState.previousHovered,
      pointer: this.hoverState.pointerPosition,
      isDragging: this.hoverState.isDragging
    });
  }

  /**
   * Destroy hover manager
   */
  destroy(): void {
    try {
      this.eventHandlers.clear();
      this.hoverState = {
        currentHovered: null,
        previousHovered: null,
        pointerPosition: null,
        isDragging: false
      };
      this.canvasState = undefined;
      this.container = undefined;
      this.refreshShadowCanvas = undefined;
      this.flushShadowCanvas = undefined;
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }
}