/**
 * V2 Canvas Graph - Renderer (Force-Graph Pattern)
 *
 * Clean implementation following force-graph's exact architecture
 */

import { zoomTransform as d3ZoomTransform } from 'd3-zoom';
import { CanvasState } from '../core';
import { V2Node, V2Link, NodeRenderStyle, LinkRenderStyle, InteractionConfig } from '../types';
import { ErrorHandler, ValidationError, CanvasUtils, RenderError, StyleResolver, createStyleResolver } from '../utils';
import { HoverManager, SelectionManager } from '../interactions';
import { NodesRenderer } from './nodes-renderer';
import { NodeLabelsRenderer } from './node-labels-renderer';
import { LinkLabelsRenderer } from './link-labels-renderer';
// Rendering style interfaces


export class Renderer {
  private config?: { nodes: V2Node[]; links: V2Link[]; interaction?: InteractionConfig };
  private canvasState?: CanvasState;
  private hoverManager?: HoverManager;
  private selectionManager?: SelectionManager;
  private styleResolver?: StyleResolver;

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

    } catch (error) {
      ErrorHandler.logError(error as Error, {
        nodeCount: config.nodes.length,
        linkCount: config.links.length
      });
      throw error;
    }
  }


  /**
   * Main render method
   */
  render(): void {
    if (!this.config || !this.canvasState) {
      throw new RenderError('Renderer not initialized');
    }

    try {
      const { ctx } = this.canvasState;

      // Clear and render main canvas
      this.clearCanvas(ctx);
      this.renderLinks(ctx);
      this.renderLinkLabels(ctx);
      this.renderNodes(ctx);
      this.renderNodeLabels(ctx);

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
   * Render with transform (called during zoom/pan)
   */
  renderWithTransform(): void {
    if (!this.canvasState) return;

    try {
      const { canvas, ctx } = this.canvasState;
      const transform = d3ZoomTransform(canvas);

      // Clear and apply transform to main canvas
      this.clearCanvas(ctx);
      this.applyTransform(transform, ctx);

      // Render to main canvas
      this.renderLinks(ctx);
      this.renderLinkLabels(ctx);
      this.renderNodes(ctx);
      this.renderNodeLabels(ctx);

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Render shadow canvas for hit detection (force-graph pattern)
   */
  renderShadowCanvas(): void {
    if (!this.canvasState || !this.config) return;

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

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
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
    } catch (error) {
      throw new RenderError('Failed to clear canvas');
    }
  }

  /**
   * Apply transform to canvas context
   */
  private applyTransform(transform: any, ctx: CanvasRenderingContext2D): void {
    try {
      CanvasUtils.resetTransform(ctx);
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);
    } catch (error) {
      throw new RenderError('Failed to apply transform');
    }
  }

  /**
   * Render main canvas links
   */
  private renderLinks(ctx: CanvasRenderingContext2D): void {
    if (!this.config || !this.styleResolver) return;

    try {
      const { links, nodes } = this.config;

      for (const link of links) {
        const sourceNode = typeof link.source === 'string'
          ? nodes.find(n => n.id === link.source)
          : link.source;
        const targetNode = typeof link.target === 'string'
          ? nodes.find(n => n.id === link.target)
          : link.target;

        if (sourceNode && targetNode && sourceNode.x && sourceNode.y && targetNode.x && targetNode.y) {
          // Use style resolver to get resolved style with hover and selection state
          const isHovered = this.isLinkHovered(link);
          const isSelected = this.isLinkSelected(link);
          const style = this.styleResolver.resolveLinkStyle({
            link,
            isHovered,
            isSelected
          });
          this.renderDirectedLink(ctx, sourceNode, targetNode, style);
        }
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw new RenderError('Failed to render links');
    }
  }

  /**
   * Render link labels
   */
  private renderLinkLabels(ctx: CanvasRenderingContext2D): void {
    if (!this.config || !this.styleResolver) return;

    try {
      LinkLabelsRenderer.renderWithVisibility(
        ctx,
        this.config.links,
        (link) => {
          const style = this.styleResolver!.resolveLinkStyle({
            link,
            isHovered: this.isLinkHovered(link),
            isSelected: this.isLinkSelected(link)
          });
          return style.label || null;
        },
        (link) => this.getLinkMidpoint(link),
        (linkId) => {
          const link = this.config!.links.find(l =>
            `${typeof l.source === 'string' ? l.source : l.source.id}->${typeof l.target === 'string' ? l.target : l.target.id}` === linkId
          );
          return link ? this.isLinkHovered(link) : false;
        },
        (linkId) => {
          const link = this.config!.links.find(l =>
            `${typeof l.source === 'string' ? l.source : l.source.id}->${typeof l.target === 'string' ? l.target : l.target.id}` === linkId
          );
          return link ? this.shouldShowLinkLabelForSelection(link) : false;
        }
      );
    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw new RenderError('Failed to render link labels');
    }
  }

  /**
   * Render main canvas nodes
   */
  private renderNodes(ctx: CanvasRenderingContext2D): void {
    if (!this.config || !this.styleResolver) return;

    try {
      const { nodes } = this.config;

      // Use StyleResolver-based rendering
      NodesRenderer.renderWithStyleResolver(
        ctx,
        nodes,
        this.styleResolver,
        (nodeId) => this.isNodeHovered(nodeId),
        (nodeId) => this.isNodeSelected(nodeId)
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
      const { nodes, links } = this.config;

      // Get default link style for shadow rendering thickness
      const defaultLinkStyle = this.styleResolver.resolveLinkStyle({
        link: { source: '', target: '' } as V2Link
      });

      for (const link of links) {
        if (!link.__indexColor) continue; // Skip if no index color assigned

        const sourceNode = typeof link.source === 'string'
          ? nodes.find(n => n.id === link.source)
          : link.source;
        const targetNode = typeof link.target === 'string'
          ? nodes.find(n => n.id === link.target)
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
      // Get all link label positions that should be visible
      const labelPositions = LinkLabelsRenderer.calculateLabelPositions(
        this.config.links,
        (link) => {
          const style = this.styleResolver!.resolveLinkStyle({
            link,
            isHovered: this.isLinkHovered(link),
            isSelected: this.isLinkSelected(link)
          });
          return style.label || null;
        },
        (link) => this.getLinkMidpoint(link),
        (linkId) => {
          const link = this.config!.links.find(l =>
            `${typeof l.source === 'string' ? l.source : l.source.id}->${typeof l.target === 'string' ? l.target : l.target.id}` === linkId
          );
          return link ? this.isLinkHovered(link) : false;
        },
        (linkId) => {
          const link = this.config!.links.find(l =>
            `${typeof l.source === 'string' ? l.source : l.source.id}->${typeof l.target === 'string' ? l.target : l.target.id}` === linkId
          );
          return link ? this.shouldShowLinkLabelForSelection(link) : false;
        }
      );

      // Render shadow rectangles for each visible label using the link's color
      for (const [linkId, position] of labelPositions) {
        const link = this.config.links.find(l =>
          `${typeof l.source === 'string' ? l.source : l.source.id}->${typeof l.target === 'string' ? l.target : l.target.id}` === linkId
        );

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
   * Check if a node is currently hovered
   */
  private isNodeHovered(nodeId: string): boolean {
    if (!this.hoverManager) return false;

    const hoverState = this.hoverManager.getHoverState();
    if (!hoverState.currentHovered || hoverState.currentHovered.type !== 'Node') {
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
    if (hoverState.currentHovered.type === 'Link') {
      const hoveredLink = hoverState.currentHovered.d as V2Link;
      if (!hoveredLink) return false;

      const sourceId1 = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId1 = typeof link.target === 'string' ? link.target : link.target.id;
      const sourceId2 = typeof hoveredLink.source === 'string' ? hoveredLink.source : hoveredLink.source.id;
      const targetId2 = typeof hoveredLink.target === 'string' ? hoveredLink.target : hoveredLink.target.id;

      return sourceId1 === sourceId2 && targetId1 === targetId2;
    }

    // Node hover - check if this link is connected to the hovered node
    if (hoverState.currentHovered.type === 'Node') {
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

    const { nodes } = this.config;
    const sourceNode = typeof link.source === 'string'
      ? nodes.find(n => n.id === link.source)
      : link.source;
    const targetNode = typeof link.target === 'string'
      ? nodes.find(n => n.id === link.target)
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
    style: LinkRenderStyle
  ): { x: number; y: number } {
    const sourceX = source.x ?? 0;
    const sourceY = source.y ?? 0;
    const targetX = target.x ?? 0;
    const targetY = target.y ?? 0;

    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;

    // Get source node style using style resolver
    const sourceNodeStyle = this.styleResolver!.resolveNodeStyle({ node: source });

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

    // Get target node style using style resolver
    const targetNodeStyle = this.styleResolver!.resolveNodeStyle({ node: target });

    // Link should stop where arrow base will be positioned
    // Arrow base is positioned arrowLength back from arrow tip
    // Arrow tip should touch node edge (visualRadius from center)
    const visualRadius = targetNodeStyle.radius + targetNodeStyle.strokeWidth/2;
    const arrowLength = style.arrow?.enabled ? style.arrow.length : 0;

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
    arrowStyle: { length: number; width: number; fill: string }
  ): void {
    try {
      const dx = targetPoint.x - sourcePoint.x;
      const dy = targetPoint.y - sourcePoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const arrowLength = arrowStyle.length;

      // Arrow tip should touch the node circumference
      // Calculate node center from the original source/target coordinates
      const nodeCenterX = sourcePoint.x + (dx * distance / Math.sqrt(dx * dx + dy * dy));
      const nodeCenterY = sourcePoint.y + (dy * distance / Math.sqrt(dx * dx + dy * dy));

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
      // Note: We can't easily get source/target IDs here, but we can identify by coordinates
      const isDebugLink = Math.abs(sourcePoint.x - 408.97) < 5 && Math.abs(targetPoint.x - 386.36) < 5;

      if (isDebugLink) {
        console.log('🏹 Arrow Vector Debug (3→4):', {
          linkVector: {
            sourcePoint: { x: sourcePoint.x, y: sourcePoint.y },
            targetPoint: { x: targetPoint.x, y: targetPoint.y },
            dx, dy, distance,
            angleRadians: angle,
            angleDegrees: (angle * 180 / Math.PI).toFixed(1)
          },
          arrowGeometry: {
            length: arrowLength,
            width: arrowStyle.width,
            fill: arrowStyle.fill
          },
          arrowPositions: {
            tip: { x: arrowTipX, y: arrowTipY },
            base1: { x: x1, y: y1 },
            base2: { x: x2, y: y2 }
          },
          calculations: {
            tipOffset: {
              x: arrowLength * Math.cos(angle),
              y: arrowLength * Math.sin(angle),
              description: 'Tip extends FROM targetPoint by this amount'
            },
            base1Offset: {
              x: arrowLength * Math.cos(angle - Math.PI / 6),
              y: arrowLength * Math.sin(angle - Math.PI / 6),
              description: 'Base point 1 calculation'
            },
            base2Offset: {
              x: arrowLength * Math.cos(angle + Math.PI / 6),
              y: arrowLength * Math.sin(angle + Math.PI / 6),
              description: 'Base point 2 calculation'
            }
          },
          arrowTriangle: {
            vertices: [
              { x: arrowTipX, y: arrowTipY, label: 'tip' },
              { x: x1, y: y1, label: 'base1' },
              { x: x2, y: y2, label: 'base2' }
            ],
            center: {
              x: (arrowTipX + x1 + x2) / 3,
              y: (arrowTipY + y1 + y2) / 3
            },
            tipDirection: {
              pointingToward: 'node center',
              tipToTargetCenter: {
                dx: 373.82 - arrowTipX,
                dy: 280.34 - arrowTipY,
                distance: Math.sqrt((373.82 - arrowTipX) ** 2 + (280.34 - arrowTipY) ** 2)
              }
            }
          }
        });
      }

      ctx.fillStyle = arrowStyle.fill;
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
    arrowStyle: { length: number; width: number; fill: string }
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
   * Destroy renderer and clean up resources
   */
  destroy(): void {
    try {
      this.config = undefined;
      this.canvasState = undefined;
      this.hoverManager = undefined;
      this.styleResolver = undefined;
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }
}