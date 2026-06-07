/**
 * V2 Canvas Graph - Renderer (Force-Graph Pattern)
 *
 * Clean implementation following force-graph's exact architecture
 */

import { zoomTransform as d3ZoomTransform, ZoomTransform } from 'd3-zoom';
import { CanvasState } from '../core';
import { V2Node, V2Link, LinkRenderStyle, InteractionConfig } from '../types';
import { ErrorHandler, ValidationError, CanvasUtils, RenderError, StyleResolver, createStyleResolver, ZIndexManager } from '../utils';
import { HoverManager, SelectionManager } from '../interactions';
import { NodesRenderer } from './nodes-renderer';
import { NodeLabelsRenderer } from './node-labels-renderer';
import { LinkLabelsRenderer } from './link-labels-renderer';
import { StatsMetrics } from '../types/generic.types';
// Rendering style interfaces


export class Renderer {
  private config?: { nodes: V2Node[]; links: V2Link[]; interaction?: InteractionConfig };
  private canvasState?: CanvasState;
  private hoverManager?: HoverManager;
  private selectionManager?: SelectionManager;
  private styleResolver?: StyleResolver;

  // Performance optimization: O(1) node lookups
  private nodeMap = new Map<string, V2Node>();

  // Shadow canvas optimization (Step 6 optimization)
  private shadowCanvasDirty = true;
  private lastShadowRenderTime = 0;
  private readonly SHADOW_RENDER_THROTTLE = 32; // ~30 FPS max for shadow canvas

  // Large graph optimization flag
  private hasLoggedLargeGraphOptimization = false;

  // Performance metrics
  private performanceMetrics: StatsMetrics = {
    renderTotal: 0,
    renderNodes: 0,
    renderLinks: 0,
    renderLinkLabels: 0,
    renderNodeLabels: 0,
    styleResolution: 0,
    hoverChecks: 0,
    canvasCalls: 0,
    frameCount: 0
  };

  // Force-graph pattern: configurable link hover precision
  private linkHoverPrecision = 4; // Default 4px like force-graph

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

      // Build node index for O(1) lookups (performance optimization)
      this.buildNodeIndex();

    } catch (error) {
      ErrorHandler.logError(error as Error, {
        nodeCount: config.nodes.length,
        linkCount: config.links.length
      });
      throw error;
    }
  }


  /**
   * Main render method with performance metrics (Instrumented)
   */
  render(): void {
    if (!this.config || !this.canvasState) {
      throw new RenderError('Renderer not initialized');
    }

    const startTime = performance.now();
    this.performanceMetrics.frameCount++;

    try {
      const { ctx } = this.canvasState;

      // Clear and render main canvas
      this.clearCanvas(ctx);

      // Render with z-index management and performance metrics
      this.renderWithLayersAndMetrics(ctx);

      // Mark shadow canvas for update (Step 6 optimization)
      this.markShadowCanvasDirty();

      this.performanceMetrics.renderTotal += performance.now() - startTime;

      // Log metrics every 100 frames
      if (this.performanceMetrics.frameCount % 100 === 0) {
        this.logPerformanceMetrics();
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
   * Render with transform (called during zoom/pan) with shadow canvas dirty marking (Step 6 optimization)
   */
  renderWithTransform(): void {
    if (!this.canvasState) return;

    try {
      const { canvas, ctx } = this.canvasState;
      const transform = d3ZoomTransform(canvas);


      // Clear and apply transform to main canvas
      this.clearCanvas(ctx);
      this.applyTransform(transform, ctx);

      // Render with z-index management (layered approach)
      this.renderWithLayers(ctx);

      // Mark shadow canvas for update since transform changed (Step 6 optimization)
      this.markShadowCanvasDirty();

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }


  /**
   * Render shadow canvas for hit detection with throttling (Step 6 optimization)
   */
  renderShadowCanvas(): void {
    if (!this.canvasState || !this.config) return;

    // Throttle shadow canvas updates (Step 6 optimization)
    // TEMP DEBUG: Force render shadow canvas for hit detection debugging
    const now = Date.now();
    // if (!this.shadowCanvasDirty || (now - this.lastShadowRenderTime) < this.SHADOW_RENDER_THROTTLE) {
    //   return; // Skip if not dirty or too frequent
    // }

    try {
      const { shadowCtx, canvas } = this.canvasState;
      const transform = d3ZoomTransform(canvas);

      // Clear shadow canvas
      this.clearCanvas(shadowCtx);

      // Apply transform to shadow canvas (same as main canvas for coordinate matching)
      this.applyTransform(transform, shadowCtx);

      // Render shadow versions with __indexColor
      this.renderShadowLinks(shadowCtx);
      this.renderShadowLinkLabels(shadowCtx);
      this.renderShadowNodes(shadowCtx);

      // Mark as clean and update timestamp (Step 6 optimization)
      this.shadowCanvasDirty = false;
      this.lastShadowRenderTime = now;

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Mark shadow canvas as dirty for next render (Step 6 optimization)
   */
  markShadowCanvasDirty(): void {
    this.shadowCanvasDirty = true;
  }

  /**
   * Force shadow canvas render (Step 6 optimization)
   */
  forceShadowCanvasRender(): void {
    this.shadowCanvasDirty = true;
    this.lastShadowRenderTime = 0;
    this.renderShadowCanvas();
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
   * Get unique link ID for tracking (consistent with LinkLabelsRenderer)
   */
  private getLinkId(link: V2Link): string {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    return `${sourceId}->${targetId}`;
  }


  /**
   * Render main canvas nodes
   */
  private renderNodes(ctx: CanvasRenderingContext2D): void {
    if (!this.config || !this.styleResolver) return;

    try {
      const { nodes } = this.config;

      // Use StyleResolver-based rendering with performance metrics
      NodesRenderer.renderWithStyleResolver(
        ctx,
        nodes,
        this.styleResolver,
        (nodeId) => this.isNodeHovered(nodeId),
        (nodeId) => this.isNodeSelected(nodeId),
        this.performanceMetrics
      );
    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw new RenderError('Failed to render nodes');
    }
  }

  /**
   * Render node labels
   */
  private renderNodeLabels(ctx: CanvasRenderingContext2D): void {
    if (!this.config || !this.styleResolver) return;

    try {
      const { nodes } = this.config;

      // Use default node radius from style resolver for labels positioning
      const defaultNodeStyle = this.styleResolver.resolveNodeStyle({
        node: { id: 'temp' } as V2Node
      });

      NodeLabelsRenderer.render(ctx, nodes, defaultNodeStyle.radius);
    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw new RenderError('Failed to render node labels');
    }
  }

  /**
   * Render shadow links with __indexColor (force-graph pattern)
   */
  private renderShadowLinks(shadowCtx: CanvasRenderingContext2D): void {
    if (!this.config || !this.styleResolver) return;

    try {
      const { links } = this.config;

      // Get default link style for shadow rendering thickness
      const defaultLinkStyle = this.styleResolver.resolveLinkStyle({
        link: { source: '', target: '' } as V2Link
      });

      for (const link of links) {
        if (!link.__indexColor) continue; // Skip if no index color assigned

        const sourceNode = typeof link.source === 'string'
          ? this.nodeMap.get(link.source)
          : link.source;
        const targetNode = typeof link.target === 'string'
          ? this.nodeMap.get(link.target)
          : link.target;

        if (sourceNode && targetNode && sourceNode.x && sourceNode.y && targetNode.x && targetNode.y && link.__indexColorRGB) {
          // Use exact RGB values for perfect matching with canvas-color-tracker
          const [r, g, b] = link.__indexColorRGB;
          const rgbColor = `rgb(${r},${g},${b})`;

          // Render link as filled rectangle for precise color matching (shadow canvas only)
          const dx = targetNode.x! - sourceNode.x!;
          const dy = targetNode.y! - sourceNode.y!;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const thickness = defaultLinkStyle.strokeWidth + this.linkHoverPrecision;

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
    if (!this.config || !this.styleResolver) return;

    try {
      // Simple performance fix: Cache link state lookups and build link lookup map
      const linkStateCache = new Map<string, { isHovered: boolean; isSelected: boolean }>();
      const linkIdToLinkMap = new Map<string, V2Link>();

      // Build link lookup map (needed for shadow rendering)
      for (const link of this.config.links) {
        const linkId = this.getLinkId(link);
        linkIdToLinkMap.set(linkId, link); // O(1) link lookup
      }

      // Get all link label positions that should be visible using cached lookups
      const labelPositions = LinkLabelsRenderer.calculateLabelPositions(
        this.config.links,
        (link) => {
          const linkId = this.getLinkId(link);

          // Cache the state lookup to avoid repeated expensive calls
          let linkState = linkStateCache.get(linkId);
          if (!linkState) {
            linkState = {
              isHovered: this.isLinkHovered(link),
              isSelected: this.isLinkSelected(link)
            };
            linkStateCache.set(linkId, linkState);
          }

          const style = this.styleResolver!.resolveLinkStyle({
            link,
            isHovered: linkState.isHovered,
            isSelected: linkState.isSelected
          });
          return style.label || null;
        },
        (link) => this.getLinkMidpoint(link),
        (linkId) => {
          let linkState = linkStateCache.get(linkId);
          if (!linkState) {
            const link = linkIdToLinkMap.get(linkId);
            if (link) {
              linkState = {
                isHovered: this.isLinkHovered(link),
                isSelected: this.isLinkSelected(link)
              };
              linkStateCache.set(linkId, linkState);
            }
          }
          return linkState?.isHovered || false;
        },
        (linkId) => {
          let linkState = linkStateCache.get(linkId);
          if (!linkState) {
            const link = linkIdToLinkMap.get(linkId);
            if (link) {
              linkState = {
                isHovered: this.isLinkHovered(link),
                isSelected: this.isLinkSelected(link)
              };
              linkStateCache.set(linkId, linkState);
            }
          }
          return linkState?.isSelected || false;
        }
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
   * Render shadow nodes with __indexColor (force-graph pattern)
   */
  private renderShadowNodes(shadowCtx: CanvasRenderingContext2D): void {
    if (!this.config || !this.styleResolver) return;

    try {
      const { nodes } = this.config;

      // Get default node radius for shadow rendering
      const defaultNodeStyle = this.styleResolver.resolveNodeStyle({
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
   * Get currently hovered node ID directly (Critical Performance Fix)
   */
  private getCurrentlyHoveredNodeId(): string | null {
    if (!this.hoverManager) return null;

    const hoverState = this.hoverManager.getHoverState();
    if (!hoverState.currentHovered || hoverState.currentHovered.d.entityType !== 'Node') {
      return null;
    }

    const hoveredNode = hoverState.currentHovered.d as V2Node;
    return hoveredNode ? hoveredNode.id : null;
  }

  /**
   * Get currently selected node ID directly (Critical Performance Fix)
   */
  private getCurrentlySelectedNodeId(): string | null {
    if (!this.selectionManager) return null;

    const selectionState = this.selectionManager.getSelectionState();
    return selectionState.selectedNode?.id || null;
  }

  /**
   * Get currently hovered link (Critical Performance Fix)
   */
  private getCurrentlyHoveredLink(): V2Link | null {
    if (!this.hoverManager) return null;

    const hoverState = this.hoverManager.getHoverState();
    if (!hoverState.currentHovered || hoverState.currentHovered.d.entityType !== 'Link') {
      return null;
    }

    return hoverState.currentHovered.d as V2Link;
  }

  /**
   * Get currently selected link (Critical Performance Fix)
   */
  private getCurrentlySelectedLink(): V2Link | null {
    if (!this.selectionManager) return null;

    const selectionState = this.selectionManager.getSelectionState();
    return selectionState.selectedLink || null;
  }

  /**
   * Log performance metrics for analysis
   */
  private logPerformanceMetrics(): void {
    const frames = this.performanceMetrics.frameCount;
    const nodeCount = this.config?.nodes.length || 0;
    const linkCount = this.config?.links.length || 0;

    console.log('🔍 PERFORMANCE METRICS (avg per frame over', frames, 'frames):');
    console.log('📊 Graph size:', nodeCount, 'nodes,', linkCount, 'links');
    console.log('⏱️  Total render:', (this.performanceMetrics.renderTotal / frames).toFixed(2), 'ms');
    console.log('🔗 Links render:', (this.performanceMetrics.renderLinks / frames).toFixed(2), 'ms');
    console.log('🏷️  Link labels:', (this.performanceMetrics.renderLinkLabels / frames).toFixed(2), 'ms');
    console.log('⭕ Nodes render:', (this.performanceMetrics.renderNodes / frames).toFixed(2), 'ms');
    console.log('📝 Node labels:', (this.performanceMetrics.renderNodeLabels / frames).toFixed(2), 'ms');
    console.log('🎨 Style resolution:', (this.performanceMetrics.styleResolution / frames).toFixed(2), 'ms');
    console.log('👆 Hover checks:', (this.performanceMetrics.hoverChecks / frames).toFixed(2), 'ms');
    console.log('🖼️  Canvas calls:', (this.performanceMetrics.canvasCalls / frames).toFixed(2), 'ms');
    console.log('---');
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      renderTotal: 0,
      renderNodes: 0,
      renderLinks: 0,
      renderLinkLabels: 0,
      renderNodeLabels: 0,
        styleResolution: 0,
      hoverChecks: 0,
      canvasCalls: 0,
      frameCount: 0
    };
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): StatsMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Force log performance metrics immediately (for debugging)
   */
  forceLogMetrics(): void {
    this.logPerformanceMetrics();
  }

  /**
   * Check if a node is currently hovered
   */
  private isNodeHovered(nodeId: string): boolean {
    if (!this.hoverManager) return false;

    const hoverState = this.hoverManager.getHoverState();
    if (!hoverState.currentHovered || hoverState.currentHovered.d.entityType !== 'Node') {
      return false;
    }

    const hoveredNode = hoverState.currentHovered.d as V2Node;
    return hoveredNode && hoveredNode.id === nodeId;
  }

  /**
   * Check if a link is currently hovered (either directly or through associated node hover)
   */
  private isLinkHovered(link: V2Link): boolean {
    if (!this.hoverManager) return false;

    const hoverState = this.hoverManager.getHoverState();
    if (!hoverState.currentHovered) return false;

    // Direct link hover
    if (hoverState.currentHovered.d.entityType === 'Link') {
      const hoveredLink = hoverState.currentHovered.d as V2Link;
      if (!hoveredLink) return false;

      const sourceId1 = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId1 = typeof link.target === 'string' ? link.target : link.target.id;
      const sourceId2 = typeof hoveredLink.source === 'string' ? hoveredLink.source : hoveredLink.source.id;
      const targetId2 = typeof hoveredLink.target === 'string' ? hoveredLink.target : hoveredLink.target.id;

      return sourceId1 === sourceId2 && targetId1 === targetId2;
    }

    // Node hover - check if this link is connected to the hovered node
    if (hoverState.currentHovered.d.entityType === 'Node') {
      const hoveredNode = hoverState.currentHovered.d as V2Node;
      if (!hoveredNode) return false;

      const linkSourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const linkTargetId = typeof link.target === 'string' ? link.target : link.target.id;

      // Return true if the hovered node is either the source or target of this link
      return hoveredNode.id === linkSourceId || hoveredNode.id === linkTargetId;
    }

    return false;
  }

  /**
   * Check if a node is currently selected
   */
  private isNodeSelected(nodeId: string): boolean {
    if (!this.selectionManager) return false;

    const selectionState = this.selectionManager.getSelectionState();
    return selectionState.selectedNode?.id === nodeId;
  }

  /**
   * Check if a link is currently selected
   */
  private isLinkSelected(link: V2Link): boolean {
    if (!this.selectionManager) return false;

    const selectionState = this.selectionManager.getSelectionState();
    if (!selectionState.selectedLink) return false;

    const sourceId1 = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId1 = typeof link.target === 'string' ? link.target : link.target.id;
    const selectedLink = selectionState.selectedLink;
    const sourceId2 = typeof selectedLink.source === 'string' ? selectedLink.source : selectedLink.source.id;
    const targetId2 = typeof selectedLink.target === 'string' ? selectedLink.target : selectedLink.target.id;

    return sourceId1 === sourceId2 && targetId1 === targetId2;
  }

  /**
   * Check if a link's label should be visible due to selection
   * (either the link itself is selected, or its connected node is selected)
   */
  private shouldShowLinkLabelForSelection(link: V2Link): boolean {
    if (!this.selectionManager) return false;

    const selectionState = this.selectionManager.getSelectionState();

    // Direct link selection
    if (selectionState.selectedLink) {
      const sourceId1 = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId1 = typeof link.target === 'string' ? link.target : link.target.id;
      const selectedLink = selectionState.selectedLink;
      const sourceId2 = typeof selectedLink.source === 'string' ? selectedLink.source : selectedLink.source.id;
      const targetId2 = typeof selectedLink.target === 'string' ? selectedLink.target : selectedLink.target.id;

      if (sourceId1 === sourceId2 && targetId1 === targetId2) {
        return true;
      }
    }

    // Node selection - check if this link is connected to the selected node
    if (selectionState.selectedNode) {
      const selectedNode = selectionState.selectedNode;
      const linkSourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const linkTargetId = typeof link.target === 'string' ? link.target : link.target.id;

      // Return true if the selected node is either the source or target of this link
      return selectedNode.id === linkSourceId || selectedNode.id === linkTargetId;
    }

    return false;
  }

  /**
   * Calculate midpoint of a link for label positioning
   */
  private getLinkMidpoint(link: V2Link): { x: number; y: number } | null {
    if (!this.config) return null;

    const sourceNode = typeof link.source === 'string'
      ? this.nodeMap.get(link.source)
      : link.source;
    const targetNode = typeof link.target === 'string'
      ? this.nodeMap.get(link.target)
      : link.target;

    if (!sourceNode || !targetNode ||
        sourceNode.x === undefined || sourceNode.y === undefined ||
        targetNode.x === undefined || targetNode.y === undefined) {
      return null;
    }

    return {
      x: (sourceNode.x + targetNode.x) / 2,
      y: (sourceNode.y + targetNode.y) / 2
    };
  }

  /**
   * Render directed link with arrow head
   */
  private renderDirectedLink(
    ctx: CanvasRenderingContext2D,
    source: V2Node,
    target: V2Node,
    style: LinkRenderStyle
  ): void {
    try {
      // Debug logging can be enabled here if needed for troubleshooting
      // console.log('Link Origin Debug:', { sourceId: source.id, targetId: target.id });

      // Calculate shortened points for both source and target
      const sourcePoint = this.getShortenedSourcePoint(source, target, style);
      const targetPoint = this.getShortenedTargetPoint(source, target, style);

      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = style.strokeWidth;
      ctx.globalAlpha = style.opacity;

      ctx.beginPath();
      ctx.moveTo(sourcePoint.x, sourcePoint.y);
      ctx.lineTo(targetPoint.x, targetPoint.y);
      ctx.stroke();

      // Draw arrow if enabled - use shortened points for proper positioning
      if (style.arrow?.enabled) {
        this.renderArrowAtPoint(ctx, sourcePoint, targetPoint, style.arrow);
      }

      ctx.globalAlpha = 1.0;
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * V1-compatible link shortening for source point
   */
  private getShortenedSourcePoint(
    source: V2Node,
    target: V2Node,
    _style: LinkRenderStyle
  ): { x: number; y: number } {
    const sourceX = source.x ?? 0;
    const sourceY = source.y ?? 0;
    const targetX = target.x ?? 0;
    const targetY = target.y ?? 0;

    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;

    // Get source node style using style resolver with current interaction state
    const sourceNodeStyle = this.styleResolver!.resolveNodeStyle({
      node: source,
      isHovered: this.isNodeHovered(source.id),
      isSelected: this.isNodeSelected(source.id)
    });

    // Link should stop outside the visual boundary of the source node
    const visualRadius = sourceNodeStyle.radius + sourceNodeStyle.strokeWidth/2;
    const offset = visualRadius + 1; // +1px buffer

    return {
      x: sourceX + (dx / distance) * offset,
      y: sourceY + (dy / distance) * offset,
    };
  }

  /**
   * V1-compatible link shortening for target point
   */
  private getShortenedTargetPoint(
    source: V2Node,
    target: V2Node,
    style: LinkRenderStyle
  ): { x: number; y: number } {
    const sourceX = source.x ?? 0;
    const sourceY = source.y ?? 0;
    const targetX = target.x ?? 0;
    const targetY = target.y ?? 0;

    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;

    // Get target node style using style resolver with current interaction state
    const targetNodeStyle = this.styleResolver!.resolveNodeStyle({
      node: target,
      isHovered: this.isNodeHovered(target.id),
      isSelected: this.isNodeSelected(target.id)
    });

    // Link should stop where arrow base will be positioned
    // Arrow base is positioned arrowLength back from arrow tip
    // Arrow tip should touch node edge (visualRadius from center)
    const visualRadius = targetNodeStyle.radius + targetNodeStyle.strokeWidth/2;
    const arrowLength = style.arrow?.enabled ? (style.arrow.size ?? 4) : 0;

    // Calculate offset: if arrow enabled, position so arrow tip touches node edge
    // We want: arrowTip = visualRadius, link extends arrowLength back from tip
    // So: linkEnd = visualRadius + arrowLength
    const offset = style.arrow?.enabled ? visualRadius + arrowLength : visualRadius + 1;

    const shortenedPoint = {
      x: targetX - (dx / distance) * offset,
      y: targetY - (dy / distance) * offset,
    };

    // Debug logging for target point calculation (can be enabled for troubleshooting)
    // const sourceId = source.id;
    // const targetId = target.id;
    // console.log('🎯 Target Point Debug:', { sourceId, targetId, offset });

    return shortenedPoint;
  }

  /**
   * Render arrow head at specific points
   */
  private renderArrowAtPoint(
    ctx: CanvasRenderingContext2D,
    sourcePoint: { x: number; y: number },
    targetPoint: { x: number; y: number },
    arrowStyle: { size?: number; fill?: string }
  ): void {
    try {
      const dx = targetPoint.x - sourcePoint.x;
      const dy = targetPoint.y - sourcePoint.y;
      // const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const arrowLength = arrowStyle.size ?? 4;

      // Arrow tip extends from link end toward node
      const arrowTipX = targetPoint.x + arrowLength * Math.cos(angle);
      const arrowTipY = targetPoint.y + arrowLength * Math.sin(angle);

      // Create proportional arrow using traditional 30-degree angles
      // Base points form triangle with tip, using standard arrow proportions
      const x1 = arrowTipX - arrowLength * Math.cos(angle - Math.PI / 6);
      const y1 = arrowTipY - arrowLength * Math.sin(angle - Math.PI / 6);
      const x2 = arrowTipX - arrowLength * Math.cos(angle + Math.PI / 6);
      const y2 = arrowTipY - arrowLength * Math.sin(angle + Math.PI / 6);

      // Comprehensive debug logging for arrow positioning (only for specific links)

      ctx.fillStyle = arrowStyle.fill ?? '#000000';
      ctx.beginPath();
      ctx.moveTo(arrowTipX, arrowTipY);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.closePath();
      ctx.fill();
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Render arrow head (legacy method for backward compatibility)
   */
  private renderArrow(
    ctx: CanvasRenderingContext2D,
    source: V2Node,
    target: V2Node,
    arrowStyle: { size?: number; fill?: string }
  ): void {
    this.renderArrowAtPoint(
      ctx,
      { x: source.x!, y: source.y! },
      { x: target.x!, y: target.y! },
      arrowStyle
    );
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
   * Debug shadow canvas export (force-graph pattern)
   */
  debugShadowCanvas(): void {
    try {
      if (!this.canvasState) return;

      const { shadowCanvas } = this.canvasState;
      const link = document.createElement('a');
      link.download = 'shadow-canvas-debug.png';
      link.href = shadowCanvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Build node index for O(1) lookups (Step 3 optimization)
   */
  private buildNodeIndex(): void {
    if (!this.config) return;

    try {
      // Clear existing index
      this.nodeMap.clear();

      // Build node index for fast lookups
      for (const node of this.config.nodes) {
        this.nodeMap.set(node.id, node);
      }

      // Pre-resolve link references for O(1) access
      for (const link of this.config.links) {
        // Convert string source/target to node objects if needed
        if (typeof link.source === 'string') {
          const sourceNode = this.nodeMap.get(link.source);
          if (sourceNode) {
            (link.source as V2Node | string) = sourceNode;
          }
        }
        if (typeof link.target === 'string') {
          const targetNode = this.nodeMap.get(link.target);
          if (targetNode) {
            (link.target as V2Node | string) = targetNode;
          }
        }
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Get node by ID using O(1) lookup (Step 3 optimization)
   */
  private getNodeById(nodeId: string): V2Node | undefined {
    return this.nodeMap.get(nodeId);
  }

  /**
   * Render with z-index layers (for renderWithTransform)
   */
  private renderWithLayers(ctx: CanvasRenderingContext2D): void {
    if (!this.config) return;

    try {
      // Get interaction states
      const hoveredNode = this.getHoveredNode();
      const selectedNode = this.getSelectedNode();
      const hoveredLink = this.getHoveredLink();
      const selectedLink = this.getSelectedLink();

      // Create highlight checkers
      const nodeHighlightChecker = ZIndexManager.createNodeHighlightChecker(
        hoveredNode?.id || null,
        selectedNode?.id || null
      );

      const linkHighlightChecker = ZIndexManager.createLinkHighlightChecker(
        hoveredNode?.id || null,
        selectedNode?.id || null,
        hoveredLink ? this.getLinkId(hoveredLink) : null,
        selectedLink ? this.getLinkId(selectedLink) : null
      );

      // Separate entities into layers
      const linkLayers = ZIndexManager.separateIntoLayers(this.config.links, linkHighlightChecker);
      const nodeLayers = ZIndexManager.separateIntoLayers(this.config.nodes, nodeHighlightChecker);

      // Render in z-index order (background first, foreground last)
      // BACKGROUND LAYER (appears behind)
      this.renderLinksLayer(ctx, linkLayers.background);
      this.renderLinkLabelsLayer(ctx, linkLayers.background);
      this.renderNodesWithLabelsLayer(ctx, nodeLayers.background);

      // FOREGROUND LAYER (appears on top)
      this.renderLinksLayer(ctx, linkLayers.foreground);
      this.renderLinkLabelsLayer(ctx, linkLayers.foreground);
      this.renderNodesWithLabelsLayer(ctx, nodeLayers.foreground);

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Render with z-index layers and performance metrics (for main render)
   */
  private renderWithLayersAndMetrics(ctx: CanvasRenderingContext2D): void {
    if (!this.config) return;

    try {
      // Get interaction states
      const hoveredNode = this.getHoveredNode();
      const selectedNode = this.getSelectedNode();
      const hoveredLink = this.getHoveredLink();
      const selectedLink = this.getSelectedLink();

      // Create highlight checkers
      const nodeHighlightChecker = ZIndexManager.createNodeHighlightChecker(
        hoveredNode?.id || null,
        selectedNode?.id || null
      );

      const linkHighlightChecker = ZIndexManager.createLinkHighlightChecker(
        hoveredNode?.id || null,
        selectedNode?.id || null,
        hoveredLink ? this.getLinkId(hoveredLink) : null,
        selectedLink ? this.getLinkId(selectedLink) : null
      );

      // Separate entities into layers
      const linkLayers = ZIndexManager.separateIntoLayers(this.config.links, linkHighlightChecker);
      const nodeLayers = ZIndexManager.separateIntoLayers(this.config.nodes, nodeHighlightChecker);

      // Render with correct z-order and performance metrics
      // Links (background and foreground)
      let stepStart = performance.now();
      this.renderLinksLayer(ctx, linkLayers.background);
      this.renderLinksLayer(ctx, linkLayers.foreground);
      this.performanceMetrics.renderLinks += performance.now() - stepStart;

      // Nodes (background and foreground)
      stepStart = performance.now();
      this.renderNodesLayer(ctx, nodeLayers.background);
      this.renderNodesLayer(ctx, nodeLayers.foreground);
      this.performanceMetrics.renderNodes += performance.now() - stepStart;

      // Link Labels (background and foreground)
      stepStart = performance.now();
      this.renderLinkLabelsLayer(ctx, linkLayers.background);
      this.renderLinkLabelsLayer(ctx, linkLayers.foreground);
      this.performanceMetrics.renderLinkLabels += performance.now() - stepStart;

      // Node Labels (background and foreground) - rendered last so they appear on top
      stepStart = performance.now();
      this.renderNodeLabelsLayer(ctx, nodeLayers.background);
      this.renderNodeLabelsLayer(ctx, nodeLayers.foreground);
      this.performanceMetrics.renderNodeLabels += performance.now() - stepStart;

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Helper methods for getting current interaction states
   */
  private getHoveredNode(): V2Node | null {
    if (!this.hoverManager) return null;
    const hoverState = this.hoverManager.getHoverState();
    return hoverState.currentHovered?.d.entityType === 'Node' ? hoverState.currentHovered.d as V2Node : null;
  }

  private getSelectedNode(): V2Node | null {
    if (!this.selectionManager) return null;
    const selectionState = this.selectionManager.getSelectionState();
    return selectionState.selectedNode;
  }

  private getHoveredLink(): V2Link | null {
    if (!this.hoverManager) return null;
    const hoverState = this.hoverManager.getHoverState();
    return hoverState.currentHovered?.d.entityType === 'Link' ? hoverState.currentHovered.d as V2Link : null;
  }

  private getSelectedLink(): V2Link | null {
    if (!this.selectionManager) return null;
    const selectionState = this.selectionManager.getSelectionState();
    return selectionState.selectedLink;
  }

  /**
   * Layer-specific rendering methods (render subsets of entities)
   */
  private renderNodesWithLabelsLayer(ctx: CanvasRenderingContext2D, nodes: V2Node[]): void {
    if (!this.config || !this.styleResolver) return;

    // Performance optimization: For large graphs (>10K nodes), apply zoom-based rendering
    const nodeCount = this.config.nodes.length;
    const isLargeGraph = nodeCount > 10000;

    let currentZoom = 1;
    let isZoomedOutForNodes = false;

    if (isLargeGraph) {
      currentZoom = this.canvasState ? d3ZoomTransform(this.canvasState.canvas).k : 1;
      isZoomedOutForNodes = currentZoom <= 0.8;
    }

    // Simple performance fix: Cache node state lookups
    const nodeStateCache = new Map<string, { isHovered: boolean; isSelected: boolean }>();

    for (const node of nodes) {
      if (!node.x || !node.y) continue;

      const nodeId = node.id;

      // Cache the state lookup to avoid repeated expensive calls
      let nodeState = nodeStateCache.get(nodeId);
      if (!nodeState) {
        nodeState = {
          isHovered: this.isNodeHovered(nodeId),
          isSelected: this.isNodeSelected(nodeId)
        };
        nodeStateCache.set(nodeId, nodeState);
      }

      // Render the node first
      const nodeStyle = this.styleResolver.resolveNodeStyle({
        node,
        isHovered: nodeState.isHovered,
        isSelected: nodeState.isSelected
      });

      // Render node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeStyle.radius, 0, 2 * Math.PI);
      ctx.fillStyle = nodeStyle.fill;
      ctx.fill();

      if (nodeStyle.stroke && nodeStyle.strokeWidth > 0) {
        ctx.strokeStyle = nodeStyle.stroke;
        ctx.lineWidth = nodeStyle.strokeWidth;
        ctx.stroke();
      }

      // Then render the node's label immediately after
      // Skip labels for large graphs when zoomed out
      if (isLargeGraph && isZoomedOutForNodes) {
        continue;
      }

      // Resolve label style and check if enabled
      const nodeStyleWithLabel = nodeStyle;
      if (nodeStyleWithLabel.label && !nodeStyleWithLabel.label.enabled) continue;

      // Use node.label if it exists, otherwise use node.id
      const fullLabel = node.label || node.id;

      // Apply text styling from resolved style or fall back to defaults
      const defaultStyle = {
        font: '9px sans-serif',
        textAlign: 'center' as CanvasTextAlign,
        textBaseline: 'middle' as CanvasTextBaseline,
        fillStyle: '#ffffff',
        offsetY: 0
      };

      if (nodeStyleWithLabel.label) {
        ctx.font = nodeStyleWithLabel.label.font || defaultStyle.font;
        ctx.textAlign = (nodeStyleWithLabel.label.textAlign as CanvasTextAlign) || defaultStyle.textAlign;
        ctx.textBaseline = (nodeStyleWithLabel.label.textBaseline as CanvasTextBaseline) || defaultStyle.textBaseline;
        ctx.fillStyle = nodeStyleWithLabel.label.textColor || defaultStyle.fillStyle;
      } else {
        // Use default style when no label config exists
        ctx.font = defaultStyle.font;
        ctx.textAlign = defaultStyle.textAlign;
        ctx.textBaseline = defaultStyle.textBaseline;
        ctx.fillStyle = defaultStyle.fillStyle;
      }

      // Truncate label to fit within node diameter
      const maxWidth = (nodeStyle.radius * 2) - 6;
      const truncatedLabel = this.truncateLabel(ctx, fullLabel, maxWidth);

      // Render label at offset position
      const labelY = node.y + (nodeStyleWithLabel.label?.offsetY || defaultStyle.offsetY);
      ctx.fillText(truncatedLabel, node.x, labelY);
    }
  }

  /**
   * Helper method to truncate labels (copied from NodeLabelsRenderer)
   */
  private truncateLabel(ctx: CanvasRenderingContext2D, label: string, maxWidth: number): string {
    let truncatedLabel = label;

    // Check if label fits
    if (ctx.measureText(truncatedLabel).width <= maxWidth) {
      return truncatedLabel;
    }

    // Truncate until it fits
    while (truncatedLabel.length > 1 && ctx.measureText(`${truncatedLabel}…`).width > maxWidth) {
      truncatedLabel = truncatedLabel.slice(0, -1);
    }

    return truncatedLabel.length < label.length ? `${truncatedLabel}…` : truncatedLabel;
  }
  private renderLinksLayer(ctx: CanvasRenderingContext2D, links: V2Link[]): void {
    if (!this.config || !this.styleResolver) return;

    // Simple performance fix: Use direct method calls but cache them per link
    const linkStateCache = new Map<string, { isHovered: boolean; isSelected: boolean }>();

    for (const link of links) {
      const sourceNode = typeof link.source === 'string'
        ? this.nodeMap.get(link.source)
        : link.source;
      const targetNode = typeof link.target === 'string'
        ? this.nodeMap.get(link.target)
        : link.target;

      if (sourceNode && targetNode && sourceNode.x && sourceNode.y && targetNode.x && targetNode.y) {
        const linkId = this.getLinkId(link);

        // Cache the state lookup to avoid repeated expensive calls
        let linkState = linkStateCache.get(linkId);
        if (!linkState) {
          linkState = {
            isHovered: this.isLinkHovered(link),
            isSelected: this.isLinkSelected(link)
          };
          linkStateCache.set(linkId, linkState);
        }

        const style = this.styleResolver.resolveLinkStyle({
          link,
          isHovered: linkState.isHovered,
          isSelected: linkState.isSelected
        });
        this.renderDirectedLink(ctx, sourceNode, targetNode, style);
      }
    }
  }

  private renderLinkLabelsLayer(ctx: CanvasRenderingContext2D, links: V2Link[]): void {
    if (!this.config || !this.styleResolver) return;

    // Performance optimization: For large graphs (>10K nodes), only show link labels on interaction
    const nodeCount = this.config.nodes.length;
    const isLargeGraph = nodeCount > 10000;

    if (isLargeGraph && !this.hasLoggedLargeGraphOptimization) {
      console.log(`🚀 Large graph optimization: ${nodeCount} nodes detected. Link labels will only show on hover/selection for better performance.`);
      this.hasLoggedLargeGraphOptimization = true;
    }

    // For large graphs only: Skip link labels if zoomed out too far (improves performance and readability)
    if (isLargeGraph) {
      const currentZoom = this.canvasState ? d3ZoomTransform(this.canvasState.canvas).k : 1;
      const isZoomedOut = currentZoom <= 1.0;

      if (isZoomedOut) {
        return;
      }
    }

    // Simple performance fix: Cache link state lookups
    const linkStateCache = new Map<string, { isHovered: boolean; isSelected: boolean }>();

    LinkLabelsRenderer.renderWithVisibility(
      ctx,
      links,
      (link) => {
        // Only render labels for links that have a label text
        if (!link.label) {
          return null;
        }

        const linkId = this.getLinkId(link);

        // Cache the state lookup to avoid repeated expensive calls
        let linkState = linkStateCache.get(linkId);
        if (!linkState) {
          linkState = {
            isHovered: this.isLinkHovered(link),
            isSelected: this.isLinkSelected(link)
          };
          linkStateCache.set(linkId, linkState);
        }

        // For large graphs (>3K nodes), only show labels on interaction
        if (isLargeGraph) {
          const isInteractive = linkState.isHovered || linkState.isSelected;
          if (!isInteractive) {
            return null; // Skip non-interactive labels in large graphs
          }
        }

        const style = this.styleResolver!.resolveLinkStyle({
          link,
          isHovered: linkState.isHovered,
          isSelected: linkState.isSelected
        });
        return style.label || null;
      },
      (link) => this.getLinkMidpoint(link),
      (linkId) => {
        let linkState = linkStateCache.get(linkId);
        if (!linkState) {
          const link = links.find(l => this.getLinkId(l) === linkId);
          if (link) {
            linkState = {
              isHovered: this.isLinkHovered(link),
              isSelected: this.isLinkSelected(link)
            };
            linkStateCache.set(linkId, linkState);
          }
        }
        return linkState?.isHovered || false;
      },
      (linkId) => {
        let linkState = linkStateCache.get(linkId);
        if (!linkState) {
          const link = links.find(l => this.getLinkId(l) === linkId);
          if (link) {
            linkState = {
              isHovered: this.isLinkHovered(link),
              isSelected: this.isLinkSelected(link)
            };
            linkStateCache.set(linkId, linkState);
          }
        }
        return linkState?.isSelected || false;
      }
    );
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
          nodeState = {
            isHovered: this.isNodeHovered(nodeId),
            isSelected: this.isNodeSelected(nodeId)
          };
          nodeStateCache.set(nodeId, nodeState);
        }
        return nodeState.isHovered;
      },
      (nodeId) => {
        let nodeState = nodeStateCache.get(nodeId);
        if (!nodeState) {
          nodeState = {
            isHovered: this.isNodeHovered(nodeId),
            isSelected: this.isNodeSelected(nodeId)
          };
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
          nodeState = {
            isHovered: this.isNodeHovered(nodeId),
            isSelected: this.isNodeSelected(nodeId)
          };
          nodeStateCache.set(nodeId, nodeState);
        }
        return nodeState.isHovered;
      },
      (nodeId) => {
        let nodeState = nodeStateCache.get(nodeId);
        if (!nodeState) {
          nodeState = {
            isHovered: this.isNodeHovered(nodeId),
            isSelected: this.isNodeSelected(nodeId)
          };
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
      this.config = undefined;
      this.canvasState = undefined;
      this.hoverManager = undefined;
      this.styleResolver = undefined;
      this.nodeMap.clear();
      // Reset shadow canvas optimization state (Step 6 optimization)
      this.shadowCanvasDirty = false;
      this.lastShadowRenderTime = 0;
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }
}