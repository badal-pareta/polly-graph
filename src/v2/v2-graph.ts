/**
 * V2 Canvas Graph - Modular Implementation
 *
 * High-performance canvas-based graph with comprehensive error handling
 * and modular architecture.
 */

import { V2Config, V2Instance, V2Node } from './types';
import { ErrorHandler, ValidationError } from './utils';
import { CanvasManager, PhysicsManager } from './core';
import { PointerManager, DragManager, ZoomManager, HoverManager, SelectionManager } from './interactions';
import { Renderer } from './rendering';

export class V2Graph implements V2Instance {
  private config?: V2Config;
  private canvasManager = new CanvasManager();
  private physicsManager = new PhysicsManager();
  private pointerManager = new PointerManager();
  private dragManager = new DragManager();
  private zoomManager = new ZoomManager();
  private hoverManager = new HoverManager();
  private selectionManager = new SelectionManager();
  private renderer = new Renderer();

  /**
   * Initialize the graph
   */
  initialize(config: V2Config): void {
    try {
      // Validate configuration
      this.validateConfig(config);
      this.config = config;

      // Initialize canvas system
      const canvasState = this.canvasManager.initialize(config);

      // Assign __indexColor to objects (force-graph pattern lines 135-150)
      this.assignIndexColors(config, canvasState.colorTracker);

      // Initialize renderer
      this.renderer.initialize({
        nodes: config.nodes,
        links: config.links,
        interaction: config.interaction
      }, canvasState, this.hoverManager, this.selectionManager);

      // Initialize pointer tracking
      this.pointerManager.initialize(config.container, canvasState);

      // Initialize physics simulation
      this.physicsManager.initialize({
        nodes: config.nodes,
        links: config.links,
        width: canvasState.width,
        height: canvasState.height,
        onTick: () => this.renderer.renderWithTransform(),
        onEnd: () => {
          // Auto fit view when simulation ends (similar to react-force-graph)
          // Only auto-fit on the initial simulation end, not after user interactions
          if (config.autoFitView !== false && this.physicsManager.shouldDoInitialAutoFitView()) {
            setTimeout(() => {
              this.fitView();
            }, 100); // Small delay to ensure final positions are stable
          }
        },
        cooldownTime: config.cooldownTime || 2000, // Default 2 seconds like react-force-graph
        autoFitView: config.autoFitView
      });

      // Adjust link distances to account for visual shortening
      this.physicsManager.adjustLinkDistancesForVisualShortening();

      // Initialize hover system
      this.hoverManager.initialize(canvasState);

      // Initialize selection system
      this.selectionManager.initialize(canvasState);

      // Connect hover events to trigger re-renders for visual effects
      this.setupHoverRerender();

      // Connect selection events to trigger re-renders for visual effects
      this.setupSelectionRerender();

      // Setup shadow canvas update handler
      this.setupShadowCanvasHandler();

      // Initialize interactions
      this.dragManager.initialize({
        canvas: canvasState.canvas,
        pointerManager: this.pointerManager,
        physicsManager: this.physicsManager,
        hoverManager: this.hoverManager,
        onRender: () => this.renderer.renderWithTransform()
      });

      // Coordinate drag and hover states (force-graph pattern)
      this.coordinateDragHover();

      this.zoomManager.initialize({
        canvas: canvasState.canvas,
        canvasManager: this.canvasManager,
        onRender: () => this.renderer.renderWithTransform(),
        isOverEntity: () => {
          // Check if hover manager has an entity under pointer
          const hoverState = this.hoverManager.getHoverState();
          return hoverState.currentHovered !== null;
        }
      });

    } catch (error) {
      ErrorHandler.logError(error as Error, {
        nodeCount: config.nodes.length,
        linkCount: config.links.length,
        containerTag: config.container?.tagName
      });
      throw error;
    }
  }

  /**
   * Assign __indexColor to objects (force-graph pattern)
   */
  private assignIndexColors(config: V2Config, colorTracker: any): void {
    try {
      // Process nodes and links like force-graph (lines 135-150)
      [{ type: 'Node', objs: config.nodes }, { type: 'Link', objs: config.links }].forEach(hexIndex);

      function hexIndex({ type, objs }: { type: string; objs: any[] }) {
        objs
          .filter(d => {
            if (!d.hasOwnProperty('__indexColor')) return true;
            const cur = colorTracker.lookup(d.__indexColor);
            return (!cur || !cur.hasOwnProperty('d') || cur.d !== d);
          })
          .forEach(d => {
            // store object lookup color (force-graph line 148)
            const hexColor = colorTracker.register({ type, d });
            d.__indexColor = hexColor;

            // Convert hex to exact RGB values for shadow canvas rendering
            const hex = hexColor.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);

            // Store RGB values for shadow rendering
            d.__indexColorRGB = [r, g, b];

          });
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Setup shadow canvas update handler
   */
  private setupShadowCanvasHandler(): void {
    this.hoverManager.on('shadowCanvasUpdate', () => {
      // Render to shadow canvas when requested by hover manager
      this.renderer.renderShadowCanvas();
    });
  }

  /**
   * Setup hover event listeners to trigger re-renders for visual effects
   */
  private setupHoverRerender(): void {
    let renderTimeout: number | undefined;

    const debouncedRender = () => {
      if (renderTimeout) {
        clearTimeout(renderTimeout);
      }
      renderTimeout = window.setTimeout(() => {
        this.renderer.renderWithTransform();
      }, 0); // Defer to next frame to ensure hover state is stable
    };

    // Listen to hover events and trigger re-renders for visual feedback
    this.hoverManager.on('nodeHover', () => {
      debouncedRender();
    });

    this.hoverManager.on('nodeUnhover', () => {
      debouncedRender();
    });

    this.hoverManager.on('linkHover', () => {
      debouncedRender();
    });

    this.hoverManager.on('linkUnhover', () => {
      debouncedRender();
    });
  }

  /**
   * Setup selection event listeners to trigger re-renders for visual effects
   */
  private setupSelectionRerender(): void {
    let renderTimeout: number | undefined;

    const debouncedRender = () => {
      if (renderTimeout) {
        clearTimeout(renderTimeout);
      }
      renderTimeout = window.setTimeout(() => {
        this.renderer.renderWithTransform();
      }, 0); // Defer to next frame to ensure selection state is stable
    };

    // Listen to selection events and trigger re-renders for visual feedback
    this.selectionManager.on('nodeSelect', () => {
      debouncedRender();
    });

    this.selectionManager.on('nodeDeselect', () => {
      debouncedRender();
    });

    this.selectionManager.on('linkSelect', () => {
      debouncedRender();
    });

    this.selectionManager.on('linkDeselect', () => {
      debouncedRender();
    });
  }

  /**
   * Coordinate drag and hover interactions (force-graph pattern)
   */
  private coordinateDragHover(): void {
    // Coordinate drag and hover states
    const originalRender = this.renderer.renderWithTransform.bind(this.renderer);

    this.renderer.renderWithTransform = () => {
      // Update drag state for hover manager (don't hover during drag)
      const dragState = this.dragManager.getState();
      this.hoverManager.setDragging(dragState.isPointerDragging);

      // Call original render method
      originalRender();
    };
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: V2Config): void {
    ErrorHandler.validateContainer(config.container);
    ErrorHandler.validateNodes(config.nodes);
    ErrorHandler.validateLinks(config.links);

    if (config.width !== undefined && (config.width <= 0 || !Number.isFinite(config.width))) {
      throw new ValidationError('Width must be a positive finite number', {
        width: config.width
      });
    }

    if (config.height !== undefined && (config.height <= 0 || !Number.isFinite(config.height))) {
      throw new ValidationError('Height must be a positive finite number', {
        height: config.height
      });
    }
  }

  /**
   * Render the graph
   */
  render(): void {
    try {
      if (!this.config) {
        throw new ValidationError('Graph not initialized');
      }

      // Initialize node positions
      this.renderer.initializeNodePositions();
      this.physicsManager.initializePositions();

      // Initial render
      this.renderer.render();

      // Initial hover update to establish baseline state
      this.hoverManager.updateHover();

    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw error;
    }
  }

  /**
   * Test hit detection at coordinates
   */
  testHitDetection(x: number, y: number): V2Node | null {
    try {
      const obj = this.pointerManager.testHitDetection(x, y);
      return (obj && obj.type === 'Node') ? obj.d : null;
    } catch (error) {
      ErrorHandler.logError(error as Error, { x, y });
      return null;
    }
  }

  /**
   * Get current zoom transform
   */
  testZoom(): { scale: number; x: number; y: number } {
    try {
      return this.zoomManager.getTransform();
    } catch (error) {
      ErrorHandler.logError(error as Error);
      return { scale: 1, x: 0, y: 0 };
    }
  }

  /**
   * Get zoom behavior (for V1 API compatibility)
   */
  getZoomBehavior(): any {
    return this.zoomManager.getZoomBehavior();
  }

  /**
   * Get canvas element (for V1 API compatibility)
   */
  getCanvas(): HTMLCanvasElement {
    try {
      const canvasState = this.canvasManager.getState();
      return canvasState.canvas;
    } catch (error) {
      throw new ValidationError('Canvas not available - graph not initialized');
    }
  }

  /**
   * Zoom in programmatically
   */
  zoomIn(factor?: number, center?: [number, number]): void {
    this.zoomManager.zoomIn(factor, center);
  }

  /**
   * Zoom out programmatically
   */
  zoomOut(factor?: number, center?: [number, number]): void {
    this.zoomManager.zoomOut(factor, center);
  }

  /**
   * Reset zoom to identity
   */
  resetView(): void {
    this.zoomManager.resetZoom();
  }


  /**
   * Fit view to content (force-graph zoomToFit implementation)
   */
  fitView(): void {
    if (!this.config) return;

    try {
      // Calculate content bounds using force-graph pattern
      const { nodes } = this.config;
      if (nodes.length === 0) return;

      // Initialize positions if not set
      this.renderer.initializeNodePositions();

      // Calculate bounding box including node radii (force-graph pattern)
      const nodeRadius = 4; // Default node radius
      const nodesPos = nodes.map(node => ({
        x: node.x || 0,
        y: node.y || 0,
        r: nodeRadius
      }));

      if (!nodesPos.length) {
        this.resetView();
        return;
      }

      // Check if nodes have positions
      const hasPositions = nodesPos.some(node => node.x !== 0 || node.y !== 0);
      if (!hasPositions) {
        this.resetView();
        return;
      }

      const bounds = {
        x: [
          Math.min(...nodesPos.map(node => node.x - node.r)),
          Math.max(...nodesPos.map(node => node.x + node.r))
        ] as [number, number],
        y: [
          Math.min(...nodesPos.map(node => node.y - node.r)),
          Math.max(...nodesPos.map(node => node.y + node.r))
        ] as [number, number]
      };
      this.zoomManager.fitView(bounds);
    } catch (error) {
      ErrorHandler.logError(error as Error);
      // Fallback to reset view
      this.resetView();
    }
  }

  /**
   * Debug hover state (for development)
   */
  debugHover(): void {
    this.hoverManager.debugHoverState();
  }

  /**
   * Debug shadow canvas (for development)
   */
  debugShadowCanvas(): void {
    this.renderer.debugShadowCanvas();
  }

  /**
   * Clear current selection
   */
  clearSelection(): void {
    this.selectionManager.clearSelection();
  }

  /**
   * Add selection event listener
   */
  on(event: string, handler: (...args: any[]) => void): () => void {
    if (event.includes('select') || event.includes('Select')) {
      this.selectionManager.on(event, handler);

      // Return unsubscribe function
      return () => {
        this.selectionManager.off(event, handler);
      };
    }

    // For now, return a no-op for other events
    return () => {};
  }

  /**
   * Remove selection event listener
   */
  off(event: string, handler: (...args: any[]) => void): void {
    if (event.includes('select') || event.includes('Select')) {
      this.selectionManager.off(event, handler);
    }
  }

  /**
   * Get comprehensive statistics
   */
  getStats(): {
    canvas: ReturnType<CanvasManager['getStats']>;
    physics: ReturnType<PhysicsManager['getStats']>;
    zoom: ReturnType<ZoomManager['getStats']>;
    renderer: ReturnType<Renderer['getStats']>;
    dragState: ReturnType<DragManager['getState']>;
  } {
    try {
      return {
        canvas: this.canvasManager.getStats(),
        physics: this.physicsManager.getStats(),
        zoom: this.zoomManager.getStats(),
        renderer: this.renderer.getStats(),
        dragState: this.dragManager.getState()
      };
    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw new ValidationError('Cannot get stats - graph not fully initialized');
    }
  }

  /**
   * Destroy the graph and clean up resources
   */
  destroy(): void {
    try {
      // Destroy in reverse order of initialization
      this.zoomManager.destroy();
      this.dragManager.destroy();
      this.selectionManager.destroy();
      this.hoverManager.destroy();
      this.pointerManager.destroy();
      this.physicsManager.destroy();
      this.renderer.destroy();
      this.canvasManager.destroy();

      this.config = undefined;
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }
}

/**
 * Factory function for creating V2 graphs
 */
export function createV2Graph(config: V2Config): V2Instance {
  const graph = new V2Graph();
  graph.initialize(config);
  return graph;
}