/**
 * V2 Canvas Graph - Nodes Renderer
 *
 * Dedicated renderer for nodes
 */

import { V2Node, NodeRenderStyle } from '../types';
import { StatsMetrics } from '../types/generic.types';
import { ErrorHandler, RenderError, StyleResolver } from '../utils';

export class NodesRenderer {
  /**
   * Render nodes with optimized hover/selection state (Critical Performance Fix)
   */
  static renderWithOptimizedStates(
    ctx: CanvasRenderingContext2D,
    nodes: V2Node[],
    styleResolver: StyleResolver,
    hoveredNodeId: string | null,
    selectedNodeId: string | null
  ): void {
    try {
      for (const node of nodes) {
        const x = node.x!;
        const y = node.y!;

        // OPTIMIZED: O(1) string comparison instead of 5K function calls
        const isHovered = hoveredNodeId === node.id;
        const isSelected = selectedNodeId === node.id;
        const style = styleResolver.resolveNodeStyle({
          node,
          isHovered,
          isSelected
        });

        ctx.beginPath();
        ctx.arc(x, y, style.radius, 0, 2 * Math.PI);

        // Apply style properties
        ctx.fillStyle = style.fill;
        ctx.globalAlpha = style.opacity;
        ctx.fill();

        // Apply stroke if specified
        if (style.strokeWidth > 0) {
          ctx.strokeStyle = style.stroke;
          ctx.lineWidth = style.strokeWidth;
          ctx.stroke();
        }

        // Reset global alpha for next render
        ctx.globalAlpha = 1.0;
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw new RenderError('Failed to render nodes with optimized states');
    }
  }

  /**
   * Render nodes to canvas
   */
  static render(
    ctx: CanvasRenderingContext2D,
    nodes: V2Node[],
    nodeStyle: NodeRenderStyle,
    hoverNodeStyle: NodeRenderStyle,
    isNodeHovered: (nodeId: string) => boolean
  ): void {
    try {
      for (const node of nodes) {
        const x = node.x!;
        const y = node.y!;

        // Use hover style if node is hovered
        const isHovered = isNodeHovered(node.id);
        const style = isHovered ? hoverNodeStyle : nodeStyle;

        ctx.beginPath();
        ctx.arc(x, y, style.radius, 0, 2 * Math.PI);

        // Apply style properties
        ctx.fillStyle = style.fill;
        ctx.globalAlpha = style.opacity;
        ctx.fill();

        // Apply stroke if specified
        if (style.strokeWidth > 0) {
          ctx.strokeStyle = style.stroke;
          ctx.lineWidth = style.strokeWidth;
          ctx.stroke();
        }

        // Reset global alpha for next render
        ctx.globalAlpha = 1.0;
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw new RenderError('Failed to render nodes');
    }
  }

  /**
   * Render nodes to canvas using StyleResolver with performance metrics
   */
  static renderWithStyleResolver(
    ctx: CanvasRenderingContext2D,
    nodes: V2Node[],
    styleResolver: StyleResolver,
    isNodeHovered: (nodeId: string) => boolean,
    isNodeSelected?: (nodeId: string) => boolean,
    isNodeHighlighted?: (nodeId: string) => boolean,
    performanceMetrics?: StatsMetrics
  ): void {
    try {
      for (const node of nodes) {
        const x = node.x!;
        const y = node.y!;

        // Measure hover/selection checks
        const hoverStart = performance.now();
        const isHovered = isNodeHovered(node.id);
        const isSelected = isNodeSelected ? isNodeSelected(node.id) : false;
        const isHighlighted = isNodeHighlighted ? isNodeHighlighted(node.id) : false;
        if (performanceMetrics) {
          performanceMetrics.hoverChecks += performance.now() - hoverStart;
        }

        // Measure style resolution
        const styleStart = performance.now();
        const style = styleResolver.resolveNodeStyle({
          node,
          isHovered,
          isSelected,
          isHighlighted
        });
        if (performanceMetrics) {
          performanceMetrics.styleResolution += performance.now() - styleStart;
        }

        // Measure canvas operations
        const canvasStart = performance.now();

        ctx.beginPath();
        ctx.arc(x, y, style.radius, 0, 2 * Math.PI);

        // Apply style properties
        ctx.fillStyle = style.fill;
        ctx.globalAlpha = style.opacity;
        ctx.fill();

        // Apply stroke if specified
        if (style.strokeWidth > 0) {
          ctx.strokeStyle = style.stroke;
          ctx.lineWidth = style.strokeWidth;
          ctx.stroke();
        }

        // Reset global alpha for next render
        ctx.globalAlpha = 1.0;

        if (performanceMetrics) {
          performanceMetrics.canvasCalls += performance.now() - canvasStart;
        }
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw new RenderError('Failed to render nodes with style resolver');
    }
  }

  /**
   * Render nodes to shadow canvas with exact RGB colors
   */
  static renderShadow(
    shadowCtx: CanvasRenderingContext2D,
    nodes: V2Node[],
    nodeRadius: number
  ): void {
    try {
      for (const node of nodes) {
        if (!node.__indexColorRGB) continue;

        const x = node.x!;
        const y = node.y!;

        // Use exact RGB values for perfect matching with canvas-color-tracker
        const [r, g, b] = node.__indexColorRGB;
        const rgbColor = `rgb(${r},${g},${b})`;
        // Calculate precise hit detection: radius + stroke half-width + minimal buffer
        const hitRadius = nodeRadius + 0.5 + 0.1; // 0.5 for strokeWidth/2, 0.1px minimal buffer

        shadowCtx.fillStyle = rgbColor;
        shadowCtx.beginPath();
        shadowCtx.arc(x, y, hitRadius, 0, 2 * Math.PI);
        shadowCtx.fill();
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }
}