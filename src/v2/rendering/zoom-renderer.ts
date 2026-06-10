/**
 * V2 Canvas Graph - Zoom Renderer
 *
 * Specialized renderer for zoom operations with fast/full rendering modes.
 * Handles zoom-specific performance optimizations.
 */

import { V2Node, V2Link } from '../types';
import { ErrorHandler, StyleResolver } from '../utils';
import { StateManager } from '../core/state-manager';
import { OptimizedZIndexRenderer } from './z-index-renderer';

export interface ZoomRenderConfig {
  nodes: V2Node[];
  links: V2Link[];
  styleResolver: StyleResolver;
  stateManager: StateManager; // Centralized state management
}

export class ZoomRenderer {
  private config?: ZoomRenderConfig;
  private stateManager?: StateManager;
  private isZooming = false;

  // Fast zoom cache for O(1) lookups - everything pre-computed
  private fastZoomNodeCache = new Map<string, {
    radius: number;
    fill: string;
    truncatedLabel: string;  // Pre-computed truncated label
    textColor: string;
  }>();

  /**
   * Initialize zoom renderer
   */
  initialize(config: ZoomRenderConfig): void {
    this.config = config;
    this.stateManager = config.stateManager;
    this.buildFastZoomCache();
  }

  /**
   * Render with zoom optimization
   */
  render(ctx: CanvasRenderingContext2D, zIndexRenderer: OptimizedZIndexRenderer): void {
    if (!this.config) return;

    if (this.isZooming) {
      // FAST ZOOM MODE: Render only essential elements
      this.renderFastZoom(ctx);
    } else {
      // FULL DETAIL MODE: Normal rendering
      zIndexRenderer.render(ctx);
    }
  }

  /**
   * Fast rendering during zoom (O(1) cached properties)
   */
  private renderFastZoom(ctx: CanvasRenderingContext2D): void {
    if (!this.config) return;

    const { nodes, links } = this.config;

    // Render only simple links (hardcoded style for maximum speed)
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    for (const link of links) {
      const sourceNode = typeof link.source === 'string'
        ? this.stateManager!.getNode(link.source)
        : link.source;
      const targetNode = typeof link.target === 'string'
        ? this.stateManager!.getNode(link.target)
        : link.target;

      if (sourceNode && targetNode && sourceNode.x && sourceNode.y && targetNode.x && targetNode.y) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();
      }
    }

    // Render nodes using O(1) cached properties
    for (const node of nodes) {
      if (!node.x || !node.y) continue;

      // O(1) lookup for cached node properties
      const cachedProps = this.fastZoomNodeCache.get(node.id);
      if (!cachedProps) continue;

      ctx.beginPath();
      ctx.arc(node.x, node.y, cachedProps.radius, 0, 2 * Math.PI);
      ctx.fillStyle = cachedProps.fill;
      ctx.fill();
    }

    // Render cached node labels for zoom feedback
    this.renderFastZoomLabels(ctx);
  }

  /**
   * Render pre-computed node labels during zoom (true O(1) lookups)
   */
  private renderFastZoomLabels(ctx: CanvasRenderingContext2D): void {
    if (!this.config) return;

    const { nodes } = this.config;

    // Pre-set text positioning once (performance optimization)
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const node of nodes) {
      if (!node.x || !node.y) continue;

      // O(1) lookup for cached node properties
      const cachedProps = this.fastZoomNodeCache.get(node.id);
      if (!cachedProps?.truncatedLabel) continue;

      // Use cached text color and pre-computed label
      ctx.fillStyle = cachedProps.textColor;
      ctx.fillText(cachedProps.truncatedLabel, node.x, node.y);
    }
  }

  /**
   * Build fast zoom cache with pre-computed properties for true O(1) performance
   */
  private buildFastZoomCache(): void {
    if (!this.config) return;

    try {
      this.fastZoomNodeCache.clear();

      // Create temporary canvas context for measuring text during cache build
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // Set the same font as fast zoom rendering
      tempCtx.font = '9px Arial';

      for (const node of this.config.nodes) {
        // Resolve style once and cache the essential properties
        const nodeStyle = this.config.styleResolver.resolveNodeStyle({
          node,
          isHovered: false,
          isSelected: false
        });

        const label = node.label || node.id;
        const maxWidth = nodeStyle.radius * 2 - 6;

        // Pre-compute truncated label once during initialization
        const truncatedLabel = this.preComputeTruncatedLabel(tempCtx, label, maxWidth);

        // Extract text color using same logic as main renderer
        const textColor = nodeStyle.label?.textColor || '#ffffff';

        this.fastZoomNodeCache.set(node.id, {
          radius: nodeStyle.radius,
          fill: nodeStyle.fill,
          truncatedLabel,
          textColor
        });
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Pre-compute truncated label (called only during cache build)
   */
  private preComputeTruncatedLabel(ctx: CanvasRenderingContext2D, label: string, maxWidth: number): string {
    // Quick check if truncation needed
    if (ctx.measureText(label).width <= maxWidth) {
      return label;
    }

    // Truncate until it fits
    let truncated = label;
    while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }

    return truncated.length < label.length ? `${truncated}…` : truncated;
  }

  /**
   * Set zoom state for performance optimization
   */
  setZoomState(isZooming: boolean): void {
    this.isZooming = isZooming;
  }

  /**
   * Get current zoom state
   */
  getZoomState(): boolean {
    return this.isZooming;
  }

  /**
   * Update configuration and rebuild cache
   */
  updateConfig(updates: Partial<ZoomRenderConfig>): void {
    if (this.config) {
      Object.assign(this.config, updates);
      this.buildFastZoomCache();
    }
  }

  /**
   * Get performance stats
   */
  getStats(): {
    cachedNodeProperties: number;
    isZooming: boolean;
  } {
    return {
      cachedNodeProperties: this.fastZoomNodeCache.size,
      isZooming: this.isZooming
    };
  }

  /**
   * Destroy and clean up
   */
  destroy(): void {
    this.config = undefined;
    this.stateManager = undefined;
    this.fastZoomNodeCache.clear();
    this.isZooming = false;
  }
}