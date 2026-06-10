/**
 * V2 Canvas Graph - Selection Manager
 *
 * Manages node and link selection interactions and events
 */

import { ErrorHandler } from '../utils';
import { CanvasState } from '../core';
import { V2Node, V2Link } from '../types';

export interface SelectionState {
  selectedNode: V2Node | null;
  selectedLink: V2Link | null;
}

export interface SelectionEvent {
  type: 'nodeSelect' | 'nodeDeselect' | 'linkSelect' | 'linkDeselect';
  current: V2Node | V2Link | null;
  previous: V2Node | V2Link | null;
}

export class SelectionManager {
  private canvasState?: CanvasState;
  private selectionState: SelectionState = {
    selectedNode: null,
    selectedLink: null
  };
  private eventHandlers = new Map<string, Set<(event: SelectionEvent) => void>>();
  private container?: HTMLElement;

  // Store bound handlers for proper cleanup
  private boundHandlers = new Map<string, EventListener>();

  /**
   * Initialize selection manager
   */
  initialize(canvasState: CanvasState): void {
    try {
      this.canvasState = canvasState;
      this.container = canvasState.canvas.parentElement as HTMLElement;

      if (!this.container) {
        throw new Error('Canvas container not found - canvas may not be added to DOM yet');
      }

      // Setup click/tap listeners for selection
      this.setupSelectionListeners();

    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw error;
    }
  }

  /**
   * Setup click/tap listeners for selection
   */
  private setupSelectionListeners(): void {
    if (!this.container || !this.canvasState) return;

    // Handle click events for selection - store bound handler for proper cleanup
    const clickHandler = (event: Event) => {
      this.handleSelectionClick(event as MouseEvent);
    };
    this.boundHandlers.set('click', clickHandler);
    this.container.addEventListener('click', clickHandler, { passive: false });

    // Handle escape key to clear selection - store bound handler for proper cleanup
    const keydownHandler = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === 'Escape') {
        this.clearSelection();
      }
    };
    this.boundHandlers.set('keydown', keydownHandler);
    document.addEventListener('keydown', keydownHandler);
  }

  /**
   * Handle selection click
   */
  private handleSelectionClick(event: MouseEvent): void {
    if (!this.canvasState) return;

    try {
      // Get click position relative to container
      const rect = this.container!.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Get object under click using shadow canvas hit detection
      const obj = this.getObjUnderPointer(x, y);

      if (obj) {
        if (obj.d.entityType === 'Node') {
          this.selectNode(obj.d as V2Node);
        } else if (obj.d.entityType === 'Link') {
          this.selectLink(obj.d as V2Link);
        }
      } else {
        // Clicked on empty space - clear selection
        this.clearSelection();
      }

    } catch (error) {
      ErrorHandler.logError(error as Error, {
        clickX: event.clientX,
        clickY: event.clientY
      });
    }
  }

  /**
   * Get object under pointer coordinates (using shadow canvas)
   */
  private getObjUnderPointer(x: number, y: number): { type: 'Node' | 'Link'; d: V2Node | V2Link } | null {
    if (!this.canvasState) return null;

    try {
      const { shadowCtx, colorTracker } = this.canvasState;
      const pxScale = window.devicePixelRatio;

      // Get pixel data with device pixel ratio scaling
      const px = (x > 0 && y > 0)
        ? shadowCtx.getImageData(x * pxScale, y * pxScale, 1, 1)
        : null;

      // Lookup object per pixel color
      if (px && px.data.length >= 3) {
        // Convert Uint8ClampedArray to RGB array for canvas-color-tracker
        const rgb: [number, number, number] = [px.data[0] ?? 0, px.data[1] ?? 0, px.data[2] ?? 0];
        return colorTracker.lookup(rgb);
      }

      return null;

    } catch (error) {
      ErrorHandler.logError(error as Error, { x, y });
      return null;
    }
  }

  /**
   * Select a node
   */
  selectNode(node: V2Node): void {
    try {
      const previousNode = this.selectionState.selectedNode;
      const previousLink = this.selectionState.selectedLink;

      // Clear any existing link selection
      if (previousLink) {
        this.selectionState.selectedLink = null;
        this.emit('linkDeselect', {
          type: 'linkDeselect',
          current: null,
          previous: previousLink
        });
      }

      // Check if clicking the same node (deselect)
      if (previousNode && this.isSameNode(previousNode, node)) {
        this.selectionState.selectedNode = null;
        this.emit('nodeDeselect', {
          type: 'nodeDeselect',
          current: null,
          previous: previousNode
        });
      } else {
        // Deselect previous node if different
        if (previousNode && !this.isSameNode(previousNode, node)) {
          this.emit('nodeDeselect', {
            type: 'nodeDeselect',
            current: null,
            previous: previousNode
          });
        }

        // Select new node
        this.selectionState.selectedNode = node;
        this.emit('nodeSelect', {
          type: 'nodeSelect',
          current: node,
          previous: previousNode
        });
      }

    } catch (error) {
      ErrorHandler.logError(error as Error, { nodeId: node.id });
    }
  }

  /**
   * Select a link
   */
  selectLink(link: V2Link): void {
    try {
      const previousNode = this.selectionState.selectedNode;
      const previousLink = this.selectionState.selectedLink;

      // Clear any existing node selection
      if (previousNode) {
        this.selectionState.selectedNode = null;
        this.emit('nodeDeselect', {
          type: 'nodeDeselect',
          current: null,
          previous: previousNode
        });
      }

      // Check if clicking the same link (deselect)
      if (previousLink && this.isSameLink(previousLink, link)) {
        this.selectionState.selectedLink = null;
        this.emit('linkDeselect', {
          type: 'linkDeselect',
          current: null,
          previous: previousLink
        });
      } else {
        // Deselect previous link if different
        if (previousLink && !this.isSameLink(previousLink, link)) {
          this.emit('linkDeselect', {
            type: 'linkDeselect',
            current: null,
            previous: previousLink
          });
        }

        // Select new link
        this.selectionState.selectedLink = link;
        this.emit('linkSelect', {
          type: 'linkSelect',
          current: link,
          previous: previousLink
        });
      }

    } catch (error) {
      ErrorHandler.logError(error as Error, {
        linkSource: typeof link.source === 'string' ? link.source : link.source?.id,
        linkTarget: typeof link.target === 'string' ? link.target : link.target?.id
      });
    }
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    try {
      const previousNode = this.selectionState.selectedNode;
      const previousLink = this.selectionState.selectedLink;

      if (previousNode) {
        this.selectionState.selectedNode = null;
        this.emit('nodeDeselect', {
          type: 'nodeDeselect',
          current: null,
          previous: previousNode
        });
      }

      if (previousLink) {
        this.selectionState.selectedLink = null;
        this.emit('linkDeselect', {
          type: 'linkDeselect',
          current: null,
          previous: previousLink
        });
      }

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Check if two nodes are the same
   */
  private isSameNode(node1: V2Node, node2: V2Node): boolean {
    return node1.id === node2.id;
  }

  /**
   * Check if two links are the same
   */
  private isSameLink(link1: V2Link, link2: V2Link): boolean {
    const source1 = typeof link1.source === 'string' ? link1.source : link1.source?.id;
    const target1 = typeof link1.target === 'string' ? link1.target : link1.target?.id;
    const source2 = typeof link2.source === 'string' ? link2.source : link2.source?.id;
    const target2 = typeof link2.target === 'string' ? link2.target : link2.target?.id;

    return source1 === source2 && target1 === target2;
  }

  /**
   * Check if a node is currently selected
   */
  isNodeSelected(node: V2Node): boolean {
    return this.selectionState.selectedNode?.id === node.id;
  }

  /**
   * Check if a link is currently selected
   */
  isLinkSelected(link: V2Link): boolean {
    if (!this.selectionState.selectedLink) return false;

    return this.isSameLink(this.selectionState.selectedLink, link);
  }

  /**
   * Get current selection state
   */
  getSelectionState(): SelectionState {
    return { ...this.selectionState };
  }

  /**
   * Add event listener
   */
  on(event: string, handler: (event: SelectionEvent) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: (event: SelectionEvent) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, data?: SelectionEvent): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data as SelectionEvent);
        } catch (error) {
          ErrorHandler.logError(error as Error, { event });
        }
      });
    }
  }

  /**
   * Destroy selection manager
   */
  destroy(): void {
    try {
      // Remove event listeners using stored bound handlers
      if (this.container && this.boundHandlers.has('click')) {
        this.container.removeEventListener('click', this.boundHandlers.get('click')!);
      }

      if (this.boundHandlers.has('keydown')) {
        document.removeEventListener('keydown', this.boundHandlers.get('keydown')!);
      }

      // Clear bound handlers
      this.boundHandlers.clear();

      this.eventHandlers.clear();
      this.selectionState = {
        selectedNode: null,
        selectedLink: null
      };
      this.canvasState = undefined;
      this.container = undefined;
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }
}