/**
 * V2 Canvas Graph - Hit Detection Renderer
 *
 * Specialized renderer for shadow canvas hit detection.
 * Handles all hit detection rendering logic separately from main renderer.
 */

import { zoomTransform as d3ZoomTransform } from 'd3-zoom';
import { V2Node, V2Link } from '../types';
import { ErrorHandler, StyleResolver, CanvasUtils } from '../utils';
import { StateManager } from '../core/state-manager';
import { NodesRenderer } from './nodes-renderer';
import { LinkLabelsRenderer } from './link-labels-renderer';

export interface HitDetectionConfig {
  nodes: V2Node[];
  links: V2Link[];
  styleResolver: StyleResolver;
  stateManager: StateManager; // Centralized state management
  canvas: HTMLCanvasElement;
  shadowCtx: CanvasRenderingContext2D;
  linkHoverPrecision?: number; // Default: 4px
}

export class HitDetectionRenderer {
  private config?: HitDetectionConfig;
  private stateManager?: StateManager;

  // Shadow canvas optimization (throttling)
  private shadowCanvasDirty = true;
  private lastShadowRenderTime = 0;
  private readonly SHADOW_RENDER_THROTTLE = 32; // ~30 FPS max for shadow canvas

  /**
   * Initialize hit detection renderer
   */
  initialize(config: HitDetectionConfig): void {
    this.config = config;
    this.stateManager = config.stateManager;
  }

  /**
   * Render shadow canvas for hit detection with throttling
   */
  renderShadowCanvas(): void {
    if (!this.config) return;

    // Throttle shadow canvas updates for performance
    const now = Date.now();
    // Uncomment for throttling:
    // if (!this.shadowCanvasDirty || (now - this.lastShadowRenderTime) < this.SHADOW_RENDER_THROTTLE) {
    //   return; // Skip if not dirty or too frequent
    // }

    try {
      const { shadowCtx, canvas } = this.config;
      const transform = d3ZoomTransform(canvas);

      // Clear shadow canvas
      this.clearCanvas(shadowCtx);

      // Apply transform to shadow canvas (same as main canvas for coordinate matching)
      this.applyTransform(transform, shadowCtx);

      // Render shadow versions with __indexColor
      this.renderShadowLinks(shadowCtx);
      this.renderShadowLinkLabels(shadowCtx);
      this.renderShadowNodes(shadowCtx);

      // Mark as clean and update timestamp
      this.shadowCanvasDirty = false;
      this.lastShadowRenderTime = now;

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Mark shadow canvas as dirty for next render
   */
  markShadowCanvasDirty(): void {
    this.shadowCanvasDirty = true;
  }

  /**
   * Force shadow canvas render
   */
  forceShadowCanvasRender(): void {
    this.shadowCanvasDirty = true;
    this.lastShadowRenderTime = 0;
    this.renderShadowCanvas();
  }

  /**
   * Clear shadow canvas context
   */
  private clearCanvas(ctx: CanvasRenderingContext2D): void {
    if (!this.config) return;

    try {
      const { canvas } = this.config;
      const { width, height } = canvas;
      CanvasUtils.resetTransform(ctx);
      ctx.clearRect(0, 0, width, height);
    } catch (error) {
      ErrorHandler.logError(error as Error, { message: 'Failed to clear shadow canvas' });
    }
  }

  /**
   * Apply transform to shadow canvas context
   */
  private applyTransform(transform: { x: number; y: number; k: number }, ctx: CanvasRenderingContext2D): void {
    try {
      CanvasUtils.resetTransform(ctx);
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);
    } catch (error) {
      ErrorHandler.logError(error as Error, { message: 'Failed to apply transform to shadow canvas' });
    }
  }

  /**
   * Render shadow links with __indexColor for hit detection
   */
  private renderShadowLinks(shadowCtx: CanvasRenderingContext2D): void {
    if (!this.config) return;

    try {
      const { links, stateManager, styleResolver, linkHoverPrecision = 4 } = this.config;

      // Get default link style for shadow rendering thickness
      const defaultLinkStyle = styleResolver.resolveLinkStyle({
        link: { source: '', target: '' } as V2Link
      });

      for (const link of links) {
        if (!link.__indexColor) continue; // Skip if no index color assigned

        const sourceNode = typeof link.source === 'string'
          ? stateManager.getNode(link.source)
          : link.source;
        const targetNode = typeof link.target === 'string'
          ? stateManager.getNode(link.target)
          : link.target;

        if (sourceNode && targetNode && sourceNode.x != null && sourceNode.y != null && targetNode.x != null && targetNode.y != null && link.__indexColorRGB) {
          // Use exact RGB values for perfect matching with canvas-color-tracker
          const [r, g, b] = link.__indexColorRGB;
          const rgbColor = `rgb(${r},${g},${b})`;

          // Render link as filled rectangle for precise color matching (shadow canvas only)
          const dx = targetNode.x! - sourceNode.x!;
          const dy = targetNode.y! - sourceNode.y!;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const thickness = defaultLinkStyle.strokeWidth + linkHoverPrecision;

          shadowCtx.save();
          shadowCtx.translate(sourceNode.x!, sourceNode.y!);
          shadowCtx.rotate(angle);
          shadowCtx.fillStyle = rgbColor;
          shadowCtx.fillRect(0, -thickness/2, length, thickness);
          shadowCtx.restore();
        }
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Render shadow link labels for hit detection
   */
  private renderShadowLinkLabels(shadowCtx: CanvasRenderingContext2D): void {
    if (!this.config) return;

    try {
      const { links, styleResolver } = this.config;

      // Simple performance fix: Cache link state lookups and build link lookup map
      const linkStateCache = new Map<string, { isHovered: boolean; isSelected: boolean }>();
      const linkIdToLinkMap = new Map<string, V2Link>();

      // Build link lookup map (needed for shadow rendering)
      for (const link of links) {
        const linkId = this.getLinkId(link);
        linkIdToLinkMap.set(linkId, link); // O(1) link lookup
      }

      // Get all link label positions that should be visible using cached lookups
      const labelPositions = LinkLabelsRenderer.calculateLabelPositions(
        links,
        (link) => {
          const linkId = this.getLinkId(link);

          // Cache the state lookup to avoid repeated expensive calls
          let linkState = linkStateCache.get(linkId);
          if (!linkState) {
            linkState = {
              isHovered: false, // For hit detection, we don't need actual hover state
              isSelected: false // For hit detection, we don't need actual selection state
            };
            linkStateCache.set(linkId, linkState);
          }

          const style = styleResolver.resolveLinkStyle({
            link,
            isHovered: linkState.isHovered,
            isSelected: linkState.isSelected
          });
          return style.label || null;
        },
        (link) => this.getLinkMidpoint(link),
        (_linkId) => false, // isHovered - not needed for hit detection
        (_linkId) => false  // isSelected - not needed for hit detection
      );

      // Render shadow rectangles for each visible label using the link's color with O(1) lookups
      for (const [linkId, position] of labelPositions) {
        const link = linkIdToLinkMap.get(linkId); // O(1) lookup instead of O(n) find

        if (link && link.__indexColorRGB) {
          const [r, g, b] = link.__indexColorRGB;
          const rgbColor = `rgb(${r},${g},${b})`;

          shadowCtx.fillStyle = rgbColor;
          shadowCtx.fillRect(position.x, position.y, position.width, position.height);
        }
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Render shadow nodes with __indexColor for hit detection
   */
  private renderShadowNodes(shadowCtx: CanvasRenderingContext2D): void {
    if (!this.config) return;

    try {
      const { nodes, styleResolver } = this.config;

      // Get default node radius for shadow rendering
      const defaultNodeStyle = styleResolver.resolveNodeStyle({
        node: { id: 'temp' } as V2Node
      });

      NodesRenderer.renderShadow(
        shadowCtx,
        nodes,
        defaultNodeStyle.radius
      );
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Get unique link ID for tracking (delegates to StateManager)
   */
  private getLinkId(link: V2Link): string {
    return this.stateManager!.getLinkId(link);
  }

  /**
   * Calculate midpoint of a link for label positioning (delegates to StateManager)
   */
  private getLinkMidpoint(link: V2Link): { x: number; y: number } | null {
    return this.stateManager!.getLinkMidpoint(link);
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<HitDetectionConfig>): void {
    if (this.config) {
      Object.assign(this.config, updates);
    }
  }

  /**
   * Debug shadow canvas export
   */
  debugShadowCanvas(): void {
    try {
      if (!this.config) return;

      const { shadowCtx } = this.config;
      const shadowCanvas = shadowCtx.canvas;
      const link = document.createElement('a');
      link.download = 'shadow-canvas-debug.png';
      link.href = shadowCanvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Get hit detection stats
   */
  getStats(): {
    shadowCanvasDirty: boolean;
    throttleRate: number;
    lastRenderTime: number;
  } {
    return {
      shadowCanvasDirty: this.shadowCanvasDirty,
      throttleRate: this.SHADOW_RENDER_THROTTLE,
      lastRenderTime: this.lastShadowRenderTime
    };
  }

  /**
   * Destroy and clean up
   */
  destroy(): void {
    this.config = undefined;
    this.stateManager = undefined;
    this.shadowCanvasDirty = false;
    this.lastShadowRenderTime = 0;
  }
}