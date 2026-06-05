/**
 * V2 Canvas Graph - Node Labels Renderer
 *
 * Dedicated renderer for node labels
 */

import { V2Node } from '../types';
import { ErrorHandler, RenderError } from '../utils';

export interface NodeLabelStyle {
  font: string;
  fillStyle: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  offsetY: number; // Offset from node center
}

export class NodeLabelsRenderer {
  // V1-compatible default label style
  private static defaultStyle: NodeLabelStyle = {
    font: '9px sans-serif', // V1: font-size: 9
    fillStyle: '#ffffff', // V1: node.style?.textColor ?? '#ffffff'
    textAlign: 'center', // V1: text-anchor: middle
    textBaseline: 'middle', // V1: dominant-baseline: middle
    offsetY: 0 // V1 renders labels centered on nodes
  };

  /**
   * Render node labels to canvas (with V1-compatible truncation)
   */
  static render(
    ctx: CanvasRenderingContext2D,
    nodes: V2Node[],
    nodeRadius: number = 8,
    style: Partial<NodeLabelStyle> = {}
  ): void {
    try {
      const resolvedStyle = { ...this.defaultStyle, ...style };

      // Apply text styling
      ctx.font = resolvedStyle.font;
      ctx.textAlign = resolvedStyle.textAlign;
      ctx.textBaseline = resolvedStyle.textBaseline;
      ctx.fillStyle = resolvedStyle.fillStyle;

      for (const node of nodes) {
        const x = node.x!;
        const y = node.y!;

        // Use node.label if it exists, otherwise use node.id
        const fullLabel = (node as any).label || node.id;

        // V1-compatible truncation: fit label within node diameter minus padding
        const maxWidth = (nodeRadius * 2) - 6; // V1 calculation
        const truncatedLabel = this.truncateLabel(ctx, fullLabel, maxWidth);

        // Render label at offset position
        const labelY = y + resolvedStyle.offsetY;

        ctx.fillText(truncatedLabel, x, labelY);
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw new RenderError('Failed to render node labels');
    }
  }

  /**
   * Truncate label to fit within maxWidth (V1-compatible logic)
   */
  private static truncateLabel(ctx: CanvasRenderingContext2D, label: string, maxWidth: number): string {
    let truncatedLabel = label;

    // Check if label fits
    if (ctx.measureText(truncatedLabel).width <= maxWidth) {
      return truncatedLabel;
    }

    // Truncate until it fits (V1 logic)
    while (truncatedLabel.length > 1 && ctx.measureText(`${truncatedLabel}…`).width > maxWidth) {
      truncatedLabel = truncatedLabel.slice(0, -1);
    }

    return truncatedLabel.length < label.length ? `${truncatedLabel}…` : truncatedLabel;
  }

  /**
   * Get text metrics for a label (useful for layout calculations)
   */
  static getTextMetrics(
    ctx: CanvasRenderingContext2D,
    text: string,
    style: Partial<NodeLabelStyle> = {}
  ): TextMetrics {
    const resolvedStyle = { ...this.defaultStyle, ...style };

    // Temporarily apply font to measure
    const originalFont = ctx.font;
    ctx.font = resolvedStyle.font;
    const metrics = ctx.measureText(text);
    ctx.font = originalFont;

    return metrics;
  }
}