/**
 * V2 Canvas Graph - Renderer (Force-Graph Pattern)
 *
 * Clean implementation following force-graph's exact architecture
 */

import { zoomTransform as d3ZoomTransform, ZoomTransform } from 'd3-zoom';
import { CanvasState } from '../core';
import { StateManager } from '../core/state-manager';
import { V2Node, V2Link, InteractionConfig } from '../types';
import { ErrorHandler, ValidationError, CanvasUtils, RenderError, StyleResolver, createStyleResolver } from '../utils';
import { HoverManager, SelectionManager } from '../interactions';
import { NodesRenderer } from './nodes-renderer';
import { NodeLabelsRenderer } from './node-labels-renderer';
import { OptimizedZIndexRenderer } from './z-index-renderer';
import { ZoomRenderer } from './zoom-renderer';
import { HitDetectionRenderer } from './hit-detection-renderer';
import { PerformanceMetricsManager } from './performance-metrics-manager';
import { LinkRenderer } from './link-renderer';
import { InteractionStateResolver } from './interaction-state-resolver';
import { DragOptimizer } from './drag-optimizer';
import { StatsMetrics } from '../types/generic.types';
// Rendering style interfaces


export class Renderer {
  private config?: { nodes: V2Node[]; links: V2Link[]; interaction?: InteractionConfig };
  private canvasState?: CanvasState;
  private hoverManager?: HoverManager;
  private selectionManager?: SelectionManager;
  private styleResolver?: StyleResolver;

  // Centralized state management for O(1) lookups
  private stateManager = new StateManager();

  // Performance metrics tracking
  private metricsManager = new PerformanceMetricsManager();

  // Interaction state resolution
  private interactionResolver = new InteractionStateResolver();

  // Drag optimization
  private dragOptimizer = new DragOptimizer();


  // Optimized Z-Index Renderer
  private zIndexRenderer = new OptimizedZIndexRenderer();

  // Dedicated Zoom Renderer for separation of concerns
  private zoomRenderer = new ZoomRenderer();

  // Dedicated Hit Detection Renderer for shadow canvas
  private hitDetectionRenderer = new HitDetectionRenderer();




  /**
   * Initialize the renderer
   */
  initialize(
    config: { nodes: V2Node[]; links: V2Link[]; interaction?: InteractionConfig },
    canvasState: CanvasState,
    hoverManager: HoverManager,
    selectionManager?: SelectionManager
  ): void {
    try {
      this.config = config;
      this.canvasState = canvasState;
      this.hoverManager = hoverManager;
      this.selectionManager = selectionManager;

      // Create style resolver with interaction configuration
      this.styleResolver = createStyleResolver(config.interaction);

      // Initialize state manager with graph data
      this.stateManager.initialize({ nodes: config.nodes, links: config.links });

      // Initialize interaction state resolver
      this.interactionResolver.updateManagers(hoverManager, selectionManager);

      // Initialize optimized z-index renderer
      this.initializeZIndexRenderer();

      // Initialize zoom renderer
      this.initializeZoomRenderer();

      // Initialize hit detection renderer
      this.initializeHitDetectionRenderer();

      // Initialize drag optimizer
      this.initializeDragOptimizer();

    } catch (error) {
      ErrorHandler.logError(error as Error, {
        nodeCount: config.nodes.length,
        linkCount: config.links.length
      });
      throw error;
    }
  }

  /**
   * Initialize the optimized z-index renderer with all required dependencies
   */
  private initializeZIndexRenderer(): void {
    if (!this.config || !this.styleResolver) return;

    const callbacks = this.interactionResolver.createCallbacks();
    this.zIndexRenderer.initialize({
      nodes: this.config.nodes,
      links: this.config.links,
      styleResolver: this.styleResolver,
      isNodeHovered: callbacks.isNodeHovered,
      isNodeSelected: callbacks.isNodeSelected,
      isLinkHovered: callbacks.isLinkHovered,
      isLinkSelected: callbacks.isLinkSelected,
      getLinkId: (link: V2Link) => this.getLinkId(link),
      getLinkMidpoint: (link: V2Link) => this.getLinkMidpoint(link),
      renderNodes: (ctx: CanvasRenderingContext2D, nodes: V2Node[]) => this.renderNodesLayer(ctx, nodes),
      renderLinks: (ctx: CanvasRenderingContext2D, links: V2Link[]) => this.renderLinksLayer(ctx, links),
      renderNodeLabels: (ctx: CanvasRenderingContext2D, nodes: V2Node[]) => this.renderNodeLabelsLayer(ctx, nodes)
    });
  }

  /**
   * Initialize the zoom renderer for zoom-specific optimizations
   */
  private initializeZoomRenderer(): void {
    if (!this.config || !this.styleResolver) return;

    this.zoomRenderer.initialize({
      nodes: this.config.nodes,
      links: this.config.links,
      styleResolver: this.styleResolver,
      stateManager: this.stateManager
    });
  }

  /**
   * Initialize the hit detection renderer for shadow canvas
   */
  private initializeHitDetectionRenderer(): void {
    if (!this.config || !this.styleResolver || !this.canvasState) return;

    this.hitDetectionRenderer.initialize({
      nodes: this.config.nodes,
      links: this.config.links,
      styleResolver: this.styleResolver,
      stateManager: this.stateManager,
      canvas: this.canvasState.canvas,
      shadowCtx: this.canvasState.shadowCtx,
      linkHoverPrecision: 4 // Default 4px like force-graph
    });
  }

  /**
   * Initialize the drag optimizer for fast drag rendering
   */
  private initializeDragOptimizer(): void {
    if (!this.config || !this.styleResolver) return;

    this.dragOptimizer.initialize({
      nodes: this.config.nodes,
      links: this.config.links,
      stateManager: this.stateManager,
      styleResolver: this.styleResolver,
      interactionResolver: this.interactionResolver,
      zIndexRenderer: this.zIndexRenderer
    });
  }

  /**
   * Main render method with performance metrics (Instrumented)
   */
  render(): void {
    if (!this.config || !this.canvasState) {
      throw new RenderError('Renderer not initialized');
    }

    const startTime = performance.now();
    this.metricsManager.incrementFrame();

    try {
      const { ctx } = this.canvasState;

      // Simple approach following force-graph pattern
      this.clearCanvas(ctx);

      // Use DragOptimizer if in drag mode, otherwise normal rendering
      this.dragOptimizer.render(ctx, this.metricsManager.getMetrics());

      // Mark shadow canvas for update
      this.hitDetectionRenderer.markShadowCanvasDirty();

      this.metricsManager.addTiming('renderTotal', performance.now() - startTime);

      // Log metrics every 100 frames
      if (this.metricsManager.shouldLogMetrics()) {
        this.metricsManager.logMetrics(this.config.nodes.length, this.config.links.length);
      }

    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw new RenderError('Failed to render graph', {
        nodeCount: this.config.nodes.length,
        linkCount: this.config.links.length,
        originalError: (error as Error).message
      });
    }
  }

  /**
   * Render with transform (called during zoom/pan) - OPTIMIZED PATTERN
   * Fast rendering during zoom, full rendering when stopped
   */
  renderWithTransform(): void {
    if (!this.canvasState) return;

    try {
      const { canvas, ctx } = this.canvasState;
      const transform = d3ZoomTransform(canvas);

      // Clear canvas and apply transform
      this.clearCanvas(ctx);
      this.applyTransform(transform, ctx);

      // Choose render mode: DragOptimizer for drag, ZoomRenderer for zoom, full render for normal
      const isDragging = this.dragOptimizer.getStats().isDragModeActive;
      const isZooming = this.zoomRenderer.getZoomState();

      if (isDragging) {
        // DRAG MODE: Use drag optimizer for fast drag rendering
        this.dragOptimizer.render(ctx, this.metricsManager.getMetrics());
      } else if (isZooming) {
        // ZOOM MODE: Use zoom renderer for fast zoom rendering
        this.zoomRenderer.render(ctx, this.zIndexRenderer);
      } else {
        // NORMAL MODE: Full detail rendering
        this.zIndexRenderer.render(ctx, this.metricsManager.getMetrics());
      }

      // Note: Shadow canvas update not needed for pure transform operations
      // Only mark dirty if actual content changed, not just transform

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Set zoom state for performance optimization (delegates to ZoomRenderer)
   */
  setZoomState(isZooming: boolean): void {
    this.zoomRenderer.setZoomState(isZooming);
  }

  /**
   * Set drag state for performance optimization (like setZoomState)
   */
  setDragState(isDragging: boolean): void {
    this.dragOptimizer.setDragState(isDragging);
  }

  /**
   * Set the currently dragged node
   */
  setDraggedNode(draggedNode: V2Node): void {
    this.dragOptimizer.setDraggedNode(draggedNode);
  }

  /**
   * Render shadow canvas for hit detection (delegates to HitDetectionRenderer)
   */
  renderShadowCanvas(): void {
    this.hitDetectionRenderer.renderShadowCanvas();
  }

  /**
   * Mark shadow canvas as dirty for next render (delegates to HitDetectionRenderer)
   */
  markShadowCanvasDirty(): void {
    this.hitDetectionRenderer.markShadowCanvasDirty();
  }

  /**
   * Force shadow canvas render (delegates to HitDetectionRenderer)
   */
  forceShadowCanvasRender(): void {
    this.hitDetectionRenderer.forceShadowCanvasRender();
  }

  /**
   * Clear canvas context
   */
  private clearCanvas(ctx: CanvasRenderingContext2D): void {
    if (!this.canvasState) return;

    try {
      const { width, height } = this.canvasState;
      CanvasUtils.resetTransform(ctx);
      ctx.clearRect(0, 0, width, height);
    } catch {
      throw new RenderError('Failed to clear canvas');
    }
  }


  /**
   * Apply transform to canvas context
   */
  private applyTransform(transform: ZoomTransform, ctx: CanvasRenderingContext2D): void {
    try {
      CanvasUtils.resetTransform(ctx);
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);
    } catch {
      throw new RenderError('Failed to apply transform');
    }
  }

  /**
   * Get unique link ID for tracking (delegates to StateManager)
   */
  private getLinkId(link: V2Link): string {
    return this.stateManager.getLinkId(link);
  }


  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.metricsManager.reset();
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): StatsMetrics {
    return this.metricsManager.getMetrics();
  }

  /**
   * Force log performance metrics immediately (for debugging)
   */
  forceLogMetrics(): void {
    const nodeCount = this.config?.nodes.length || 0;
    const linkCount = this.config?.links.length || 0;
    this.metricsManager.logMetrics(nodeCount, linkCount);
  }






  /**
   * Calculate midpoint of a link for label positioning (delegates to StateManager)
   */
  private getLinkMidpoint(link: V2Link): { x: number; y: number } | null {
    return this.stateManager.getLinkMidpoint(link);
  }





  /**
   * Initialize node positions if needed
   */
  initializeNodePositions(): void {
    if (!this.config || !this.canvasState) return;

    try {
      const { nodes } = this.config;
      const { width, height } = this.canvasState;

      // Let D3 handle initial positioning - don't set specific positions
      // The center force will pull nodes to (0,0) which works with identity transform
      for (const node of nodes) {
        if (node.x === undefined) node.x = Math.random() * width;
        if (node.y === undefined) node.y = Math.random() * height;
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<{ nodes: V2Node[]; links: V2Link[] }>): void {
    if (!this.config) return;

    try {
      Object.assign(this.config, updates);

      // Update z-index renderer with new configuration
      this.zIndexRenderer.updateConfig({
        nodes: this.config.nodes,
        links: this.config.links
      });




      // Update state manager with new data
      this.stateManager.updateState({ nodes: this.config.nodes, links: this.config.links });

      // Update zoom renderer with new configuration
      this.zoomRenderer.updateConfig({
        nodes: this.config.nodes,
        links: this.config.links,
        stateManager: this.stateManager
      });

      // Update hit detection renderer with new configuration
      this.hitDetectionRenderer.updateConfig({
        nodes: this.config.nodes,
        links: this.config.links,
        stateManager: this.stateManager
      });

      // Update drag optimizer with new configuration
      this.dragOptimizer.updateConfig({
        nodes: this.config.nodes,
        links: this.config.links,
        stateManager: this.stateManager,
        styleResolver: this.styleResolver,
        interactionResolver: this.interactionResolver,
        zIndexRenderer: this.zIndexRenderer
      });
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Get renderer statistics
   */
  getStats(): {
    renderCounts: { nodes: number; links: number };
    renderTime: { lastRender: number };
  } {
    if (!this.config) {
      throw new ValidationError('Renderer not initialized');
    }

    return {
      renderCounts: {
        nodes: this.config.nodes.length,
        links: this.config.links.length
      },
      renderTime: {
        lastRender: Date.now()
      }
    };
  }

  /**
   * Debug shadow canvas export (delegates to HitDetectionRenderer)
   */
  debugShadowCanvas(): void {
    this.hitDetectionRenderer.debugShadowCanvas();
  }


  private renderLinksLayer(ctx: CanvasRenderingContext2D, links: V2Link[]): void {
    if (!this.config || !this.styleResolver) return;

    // Simple performance fix: Use direct method calls but cache them per link
    const linkStateCache = new Map<string, { isHovered: boolean; isSelected: boolean }>();

    for (const link of links) {
      const sourceNode = typeof link.source === 'string'
        ? this.stateManager.getNode(link.source)
        : link.source;
      const targetNode = typeof link.target === 'string'
        ? this.stateManager.getNode(link.target)
        : link.target;

      if (sourceNode && targetNode && sourceNode.x && sourceNode.y && targetNode.x && targetNode.y) {
        const linkId = this.getLinkId(link);

        // Cache the state lookup to avoid repeated expensive calls
        let linkState = linkStateCache.get(linkId);
        if (!linkState) {
          linkState = this.interactionResolver.getLinkState(link);
          linkStateCache.set(linkId, linkState);
        }

        const style = this.styleResolver.resolveLinkStyle({
          link,
          isHovered: linkState.isHovered,
          isSelected: linkState.isSelected
        });
        const callbacks = this.interactionResolver.createCallbacks();
        LinkRenderer.renderDirectedLink(
          ctx,
          sourceNode,
          targetNode,
          style,
          this.styleResolver!,
          callbacks.isNodeHovered,
          callbacks.isNodeSelected
        );
      }
    }
  }


  private renderNodesLayer(ctx: CanvasRenderingContext2D, nodes: V2Node[]): void {
    if (!this.config || !this.styleResolver) return;

    // Simple performance fix: Cache node state lookups
    const nodeStateCache = new Map<string, { isHovered: boolean; isSelected: boolean }>();

    NodesRenderer.renderWithStyleResolver(
      ctx,
      nodes,
      this.styleResolver,
      (nodeId) => {
        let nodeState = nodeStateCache.get(nodeId);
        if (!nodeState) {
          nodeState = this.interactionResolver.getNodeState(nodeId);
          nodeStateCache.set(nodeId, nodeState);
        }
        return nodeState.isHovered;
      },
      (nodeId) => {
        let nodeState = nodeStateCache.get(nodeId);
        if (!nodeState) {
          nodeState = this.interactionResolver.getNodeState(nodeId);
          nodeStateCache.set(nodeId, nodeState);
        }
        return nodeState.isSelected;
      }
    );
  }

  private renderNodeLabelsLayer(ctx: CanvasRenderingContext2D, nodes: V2Node[]): void {
    if (!this.config || !this.styleResolver) return;

    // Performance optimization: For large graphs (>10K nodes), apply zoom-based node label rendering
    const nodeCount = this.config.nodes.length;
    const isLargeGraph = nodeCount > 10000;

    if (isLargeGraph) {
      // For large graphs only: Skip node labels if zoomed out too far
      const currentZoom = this.canvasState ? d3ZoomTransform(this.canvasState.canvas).k : 1;
      const isZoomedOutForNodes = currentZoom <= 0.8;

      if (isZoomedOutForNodes) {
        return;
      }
    }

    // Simple performance fix: Cache node state lookups
    const nodeStateCache = new Map<string, { isHovered: boolean; isSelected: boolean }>();

    NodeLabelsRenderer.renderWithStyleResolver(
      ctx,
      nodes,
      this.styleResolver,
      (nodeId) => {
        let nodeState = nodeStateCache.get(nodeId);
        if (!nodeState) {
          nodeState = this.interactionResolver.getNodeState(nodeId);
          nodeStateCache.set(nodeId, nodeState);
        }
        return nodeState.isHovered;
      },
      (nodeId) => {
        let nodeState = nodeStateCache.get(nodeId);
        if (!nodeState) {
          nodeState = this.interactionResolver.getNodeState(nodeId);
          nodeStateCache.set(nodeId, nodeState);
        }
        return nodeState.isSelected;
      }
    );
  }


  /**
   * Destroy renderer and clean up resources
   */
  destroy(): void {
    try {
      // Destroy renderers first
      this.zIndexRenderer.destroy();
      this.zoomRenderer.destroy();
      this.hitDetectionRenderer.destroy();
      this.dragOptimizer.destroy();

      this.config = undefined;
      this.canvasState = undefined;
      this.hoverManager = undefined;
      this.styleResolver = undefined;
      this.stateManager.destroy();
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }
}