/**
 * V2 Canvas Graph - Nodes Renderer
 *
 * Dedicated renderer for nodes
 */

import { V2Node, NodeRenderStyle } from '../types';
import { ErrorHandler, RenderError, StyleResolver } from '../utils';

export class NodesRenderer {
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
   * Render nodes to canvas using StyleResolver for dynamic style resolution
   */
  static renderWithStyleResolver(
    ctx: CanvasRenderingContext2D,
    nodes: V2Node[],
    styleResolver: StyleResolver,
    isNodeHovered: (nodeId: string) => boolean,
    isNodeSelected?: (nodeId: string) => boolean
  ): void {
    try {
      for (const node of nodes) {
        const x = node.x!;
        const y = node.y!;

        // Use StyleResolver to get resolved style with hover and selection state
        const isHovered = isNodeHovered(node.id);
        const isSelected = isNodeSelected ? isNodeSelected(node.id) : false;
        const style = styleResolver.resolveNodeStyle({
          node,
          isHovered,
          isSelected
        });

        // Debug logging can be enabled here if needed for troubleshooting
        // console.log('Node Origin Debug:', { nodeId: node.id, center: { x, y } });

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
        const hitRadius = nodeRadius + 1; // Force-graph pattern: +1px for shadow canvas

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