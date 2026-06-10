/**
 * V2 Canvas Graph - Drag Optimizer
 *
 * High-performance drag optimizations using zoom-renderer patterns.
 * Pre-caches styles and uses fast rendering during drag operations.
 */

import { V2Node, V2Link } from '../types';
import { ErrorHandler, StyleResolver } from '../utils';
import { StateManager } from '../core/state-manager';
import { InteractionStateResolver } from './interaction-state-resolver';
import { OptimizedZIndexRenderer } from './z-index-renderer';
import { StatsMetrics } from '../types/generic.types';
import { dragObjectPool, Vector2D, NodeState } from '../utils/object-pool';

export interface DragOptimizationConfig {
  nodes: V2Node[];
  links: V2Link[];
  stateManager: StateManager;
  styleResolver: StyleResolver;
  interactionResolver: InteractionStateResolver;
  zIndexRenderer: OptimizedZIndexRenderer;
}

export interface DragOptimizationState {
  isDragModeActive: boolean;
  draggedNodeId?: string;
  lastDragRenderTime: number;
}

interface CachedDragNodeProps {
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  textColor: string;
  truncatedLabel: string;
}


export class DragOptimizer {
  private config?: DragOptimizationConfig;
  private state: DragOptimizationState = {
    isDragModeActive: false,
    lastDragRenderTime: 0
  };

  // Fast drag cache for O(1) lookups - everything pre-computed
  private fastDragNodeCache = new Map<string, CachedDragNodeProps>();

  // Object pool optimization
  private reusableNodeStates: NodeState[] = [];
  private reusableVectors: Vector2D[] = [];


  /**
   * Initialize drag optimizer with object pooling optimizations
   */
  initialize(config: DragOptimizationConfig): void {
    this.config = config;
    this.buildFastDragCache();

    // Pre-allocate object pool arrays
    this.reusableNodeStates = dragObjectPool.getReusableNodeArray();
    this.reusableVectors = dragObjectPool.getReusableVector2DArray();
  }


  /**
   * Set the dragged node (like zoom renderer - simple state tracking)
   */
  setDraggedNode(draggedNode: V2Node): void {
    if (!this.config) return;

    try {
      this.state.draggedNodeId = draggedNode.id;

      // Debug logging to verify fast drag mode
      console.log(`🚀 Fast drag mode - rendering ALL ${this.config.nodes.length} nodes and ${this.config.links.length} links with simplified styling`);

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Render with drag optimization using object pooling
   */
  render(ctx: CanvasRenderingContext2D, performanceMetrics?: StatsMetrics): void {
    if (!this.config) return;

    if (this.state.isDragModeActive) {
      // FAST DRAG MODE: Optimized canvas rendering with object pooling
      this.renderFastDragOptimized(ctx);
    } else {
      // FULL DETAIL MODE: Normal rendering
      this.config.zIndexRenderer.render(ctx, performanceMetrics);
    }
  }

  /**
   * Handle drag movement with RAF throttling
   */
  handleDragMove(): void {
    if (!this.config || !this.state.isDragModeActive) return;

    // Only update time if we're actively dragging
    this.state.lastDragRenderTime = performance.now();
  }

  /**
   * End drag mode and restore full rendering
   */
  endDragMode(): void {
    if (!this.config) return;

    try {
      this.state.isDragModeActive = false;
      this.state.draggedNodeId = undefined;

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Optimized fast rendering with object pooling and minimal GC
   */
  private renderFastDragOptimized(ctx: CanvasRenderingContext2D): void {
    if (!this.config) return;

    const { nodes, links } = this.config;
    const startTime = performance.now();

    // Use object pool for temporary calculations
    this.reusableNodeStates = dragObjectPool.getReusableNodeArray();
    this.reusableVectors = dragObjectPool.getReusableVector2DArray();

    try {
      // Pre-allocate vectors for link calculations
      const linkVectors = dragObjectPool.batchAcquireVectors(links.length * 2); // 2 per link
      let vectorIndex = 0;

      // Render ALL links with hardcoded style for maximum speed
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;

      for (const link of links) {
        const sourceNode = typeof link.source === 'string'
          ? this.config.stateManager.getNode(link.source)
          : link.source;
        const targetNode = typeof link.target === 'string'
          ? this.config.stateManager.getNode(link.target)
          : link.target;

        if (sourceNode?.x != null && sourceNode?.y != null &&
            targetNode?.x != null && targetNode?.y != null) {

          // Use pooled vectors for position calculations
          const sourceVec = linkVectors[vectorIndex++];
          const targetVec = linkVectors[vectorIndex++];

          if (sourceVec && targetVec) {
            sourceVec.x = sourceNode.x;
            sourceVec.y = sourceNode.y;
            targetVec.x = targetNode.x;
            targetVec.y = targetNode.y;

            ctx.beginPath();
            ctx.moveTo(sourceVec.x, sourceVec.y);
            ctx.lineTo(targetVec.x, targetVec.y);
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1.0;

      // Render ALL nodes using O(1) cached properties
      for (const node of nodes) {
        if (node.x == null || node.y == null) continue;

        // O(1) lookup for cached node properties
        const cachedProps = this.fastDragNodeCache.get(node.id);
        if (!cachedProps) continue;

        // Render node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, cachedProps.radius, 0, 2 * Math.PI);
        ctx.fillStyle = cachedProps.fill;
        ctx.fill();

        // Render border if present
        if (cachedProps.strokeWidth > 0) {
          ctx.strokeStyle = cachedProps.stroke;
          ctx.lineWidth = cachedProps.strokeWidth;
          ctx.stroke();
        }
      }

      // Render simplified labels for ALL nodes
      this.renderFastDragLabelsOptimized(ctx);

      // Return pooled objects
      dragObjectPool.batchReleaseVectors(linkVectors);

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }

    // Track performance
    this.state.lastDragRenderTime = performance.now() - startTime;
  }


  /**
   * Optimized label rendering with minimal object allocation
   */
  private renderFastDragLabelsOptimized(ctx: CanvasRenderingContext2D): void {
    if (!this.config) return;

    const { nodes } = this.config;

    // Pre-set text properties once (performance optimization)
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const node of nodes) {
      if (node.x == null || node.y == null) continue;

      // O(1) lookup for cached node properties
      const cachedProps = this.fastDragNodeCache.get(node.id);
      if (!cachedProps?.truncatedLabel) continue;

      // Use cached text color and pre-computed label
      ctx.fillStyle = cachedProps.textColor;
      ctx.fillText(cachedProps.truncatedLabel, node.x, node.y);
    }
  }


  /**
   * Build fast drag cache with pre-computed properties (zoom-renderer pattern)
   */
  private buildFastDragCache(): void {
    if (!this.config) return;

    try {
      this.fastDragNodeCache.clear();

      // Create temporary canvas for text measurement
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCtx.font = '10px Arial';

      // Cache node properties
      for (const node of this.config.nodes) {
        const nodeStyle = this.config.styleResolver.resolveNodeStyle({
          node,
          isHovered: false,
          isSelected: false
        });

        const label = node.label || node.id;
        const maxWidth = nodeStyle.radius * 2 - 6;
        const truncatedLabel = this.preComputeTruncatedLabel(tempCtx, label, maxWidth);
        const textColor = nodeStyle.label?.textColor || '#ffffff';

        this.fastDragNodeCache.set(node.id, {
          radius: nodeStyle.radius,
          fill: nodeStyle.fill,
          stroke: nodeStyle.stroke,
          strokeWidth: nodeStyle.strokeWidth,
          textColor,
          truncatedLabel
        });
      }

      // Links use hardcoded styling during drag (like zoom renderer), no caching needed

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Pre-compute truncated label (zoom-renderer pattern)
   */
  private preComputeTruncatedLabel(ctx: CanvasRenderingContext2D, label: string, maxWidth: number): string {
    if (ctx.measureText(label).width <= maxWidth) {
      return label;
    }

    let truncated = label;
    while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }

    return truncated.length < label.length ? `${truncated}…` : truncated;
  }


  /**
   * Set drag state for performance optimization (like ZoomRenderer.setZoomState)
   */
  setDragState(isDragging: boolean): void {
    if (isDragging) {
      // Start drag optimization mode
      this.state.isDragModeActive = true;
    } else {
      // End drag optimization mode
      this.state.isDragModeActive = false;
      this.state.draggedNodeId = undefined;
    }
  }

  /**
   * Update configuration and rebuild cache
   */
  updateConfig(updates: Partial<DragOptimizationConfig>): void {
    if (this.config) {
      Object.assign(this.config, updates);
      this.buildFastDragCache();
    }
  }

  /**
   * Get drag optimization statistics including object pool metrics
   */
  getStats(): {
    isDragModeActive: boolean;
    cachedNodeProperties: number;
    lastRenderTime: number;
    objectPool: {
      vector2D: { available: number; maxSize: number; utilization: number };
      nodeState: { available: number; maxSize: number; utilization: number };
      memoryEstimate: { totalBytes: number };
    };
  } {
    const poolStats = dragObjectPool.getStats();

    return {
      isDragModeActive: this.state.isDragModeActive,
      cachedNodeProperties: this.fastDragNodeCache.size,
      lastRenderTime: this.state.lastDragRenderTime,
      objectPool: {
        vector2D: poolStats.vector2D,
        nodeState: poolStats.nodeState,
        memoryEstimate: poolStats.memoryEstimate
      }
    };
  }

  /**
   * Destroy and clean up all resources
   */
  destroy(): void {
    // Clear object pool arrays (they'll be reused by the global pool)
    this.reusableNodeStates.length = 0;
    this.reusableVectors.length = 0;

    // Clear caches
    this.config = undefined;
    this.fastDragNodeCache.clear();
    this.state = {
      isDragModeActive: false,
      lastDragRenderTime: 0
    };
  }

  /**
   * Force memory optimization by clearing and rebuilding caches
   */
  optimizeMemory(): void {
    // Clear and rebuild fast drag cache
    this.buildFastDragCache();

    // Optimize object pool memory
    dragObjectPool.optimizeMemory();
  }
}