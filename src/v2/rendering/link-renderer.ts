/**
 * V2 Canvas Graph - Link Renderer
 *
 * Specialized renderer for links and arrows.
 * Extracted from main Renderer to follow single responsibility principle.
 */

import { V2Node, LinkRenderStyle } from '../types';
import { ErrorHandler, StyleResolver } from '../utils';

export interface ArrowStyle {
  size?: number;
  fill?: string;
}

export class LinkRenderer {
  /**
   * Render a directed link with optional arrow head
   */
  static renderDirectedLink(
    ctx: CanvasRenderingContext2D,
    source: V2Node,
    target: V2Node,
    style: LinkRenderStyle,
    styleResolver: StyleResolver,
    isNodeHovered: (nodeId: string) => boolean,
    isNodeSelected: (nodeId: string) => boolean
  ): void {
    try {
      // Calculate shortened points for both source and target
      const sourcePoint = this.getShortenedSourcePoint(
        source,
        target,
        style,
        styleResolver,
        isNodeHovered,
        isNodeSelected
      );
      const targetPoint = this.getShortenedTargetPoint(
        source,
        target,
        style,
        styleResolver,
        isNodeHovered,
        isNodeSelected
      );

      // Render the link line
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = style.strokeWidth;
      ctx.globalAlpha = style.opacity;

      ctx.beginPath();
      ctx.moveTo(sourcePoint.x, sourcePoint.y);
      ctx.lineTo(targetPoint.x, targetPoint.y);
      ctx.stroke();

      // Draw arrow if enabled - use shortened points for proper positioning
      if (style.arrow?.enabled) {
        this.renderArrow(ctx, sourcePoint, targetPoint, style.arrow);
      }

      ctx.globalAlpha = 1.0;
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * V1-compatible link shortening for source point
   */
  private static getShortenedSourcePoint(
    source: V2Node,
    target: V2Node,
    _style: LinkRenderStyle,
    styleResolver: StyleResolver,
    isNodeHovered: (nodeId: string) => boolean,
    isNodeSelected: (nodeId: string) => boolean
  ): { x: number; y: number } {
    const sourceX = source.x ?? 0;
    const sourceY = source.y ?? 0;
    const targetX = target.x ?? 0;
    const targetY = target.y ?? 0;

    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;

    // Get source node style using style resolver with current interaction state
    const sourceNodeStyle = styleResolver.resolveNodeStyle({
      node: source,
      isHovered: isNodeHovered(source.id),
      isSelected: isNodeSelected(source.id)
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
  private static getShortenedTargetPoint(
    source: V2Node,
    target: V2Node,
    style: LinkRenderStyle,
    styleResolver: StyleResolver,
    isNodeHovered: (nodeId: string) => boolean,
    isNodeSelected: (nodeId: string) => boolean
  ): { x: number; y: number } {
    const sourceX = source.x ?? 0;
    const sourceY = source.y ?? 0;
    const targetX = target.x ?? 0;
    const targetY = target.y ?? 0;

    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;

    // Get target node style using style resolver with current interaction state
    const targetNodeStyle = styleResolver.resolveNodeStyle({
      node: target,
      isHovered: isNodeHovered(target.id),
      isSelected: isNodeSelected(target.id)
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

    return shortenedPoint;
  }

  /**
   * Render arrow head at specific points
   */
  private static renderArrow(
    ctx: CanvasRenderingContext2D,
    sourcePoint: { x: number; y: number },
    targetPoint: { x: number; y: number },
    arrowStyle: ArrowStyle
  ): void {
    try {
      const dx = targetPoint.x - sourcePoint.x;
      const dy = targetPoint.y - sourcePoint.y;
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
}