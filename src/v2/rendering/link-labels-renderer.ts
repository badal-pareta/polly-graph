/**
 * V2 Canvas Graph - Link Labels Renderer
 *
 * Dedicated renderer for link labels
 */

import { V2Link, LinkLabelRenderStyle } from '../types';
import { ErrorHandler, RenderError } from '../utils';

export interface LinkLabelPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class LinkLabelsRenderer {
  private static textMetricsCache = new Map<string, TextMetrics>();

  // Link ID cache for performance (Step 5 optimization)
  private static linkIdCache = new Map<V2Link, string>();

  /**
   * Render link labels to canvas
   */
  static render(
    ctx: CanvasRenderingContext2D,
    links: V2Link[],
    getLinkLabelStyle: (link: V2Link) => LinkLabelRenderStyle | null,
    getLinkMidpoint: (link: V2Link) => { x: number; y: number } | null
  ): void {
    try {
      for (const link of links) {
        if (!link.label) continue;

        const labelStyle = getLinkLabelStyle(link);
        if (!labelStyle || !labelStyle.enabled) continue;

        const midpoint = getLinkMidpoint(link);
        if (!midpoint) continue;

        this.renderSingleLabel(ctx, link.label, midpoint.x, midpoint.y, labelStyle);
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw new RenderError('Failed to render link labels');
    }
  }

  /**
   * Render link labels with visibility control - optimized for performance (Step 5 optimization)
   */
  static renderWithVisibility(
    ctx: CanvasRenderingContext2D,
    links: V2Link[],
    getLinkLabelStyle: (link: V2Link) => LinkLabelRenderStyle | null,
    getLinkMidpoint: (link: V2Link) => { x: number; y: number } | null,
    isLinkHovered: (linkId: string) => boolean,
    isLinkSelected: (linkId: string) => boolean
  ): void {
    try {
      // Pre-filter links that have labels (Step 5 optimization)
      const labelsToRender: Array<{
        link: V2Link;
        linkId: string;
        labelStyle: LinkLabelRenderStyle;
        midpoint: { x: number; y: number };
      }> = [];

      // First pass: filter and prepare all data (Step 5 optimization)
      for (const link of links) {
        if (!link.label) continue;

        const labelStyle = getLinkLabelStyle(link);
        if (!labelStyle || !labelStyle.enabled) continue;

        // Cache link ID to avoid recomputation
        const linkId = this.getLinkIdCached(link);
        const isHovered = isLinkHovered(linkId);
        const isSelected = isLinkSelected(linkId);

        const shouldShow = this.shouldShowLabel(labelStyle.visibility ?? 'always', isHovered, isSelected);
        if (!shouldShow) continue;

        const midpoint = getLinkMidpoint(link);
        if (!midpoint) continue;

        labelsToRender.push({
          link,
          linkId,
          labelStyle,
          midpoint
        });
      }

      // Second pass: batch render all visible labels (Step 5 optimization)
      for (const item of labelsToRender) {
        this.renderSingleLabel(
          ctx,
          item.link.label!,
          item.midpoint.x,
          item.midpoint.y,
          item.labelStyle
        );
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw new RenderError('Failed to render link labels with visibility control');
    }
  }

  /**
   * Calculate link label positions for hit testing - optimized (Step 5 optimization)
   */
  static calculateLabelPositions(
    links: V2Link[],
    getLinkLabelStyle: (link: V2Link) => LinkLabelRenderStyle | null,
    getLinkMidpoint: (link: V2Link) => { x: number; y: number } | null,
    isLinkHovered: (linkId: string) => boolean,
    isLinkSelected: (linkId: string) => boolean
  ): Map<string, LinkLabelPosition> {
    const positions = new Map<string, LinkLabelPosition>();

    try {
      // Pre-filter and batch process links that need position calculation (Step 5 optimization)
      const linksNeedingPositions: Array<{
        link: V2Link;
        linkId: string;
        labelStyle: LinkLabelRenderStyle;
        midpoint: { x: number; y: number };
      }> = [];

      // First pass: filter visible links (Step 5 optimization)
      for (const link of links) {
        if (!link.label) continue;

        const labelStyle = getLinkLabelStyle(link);
        if (!labelStyle || !labelStyle.enabled) continue;

        const linkId = this.getLinkIdCached(link);
        const isHovered = isLinkHovered(linkId);
        const isSelected = isLinkSelected(linkId);

        const shouldShow = this.shouldShowLabel(labelStyle.visibility ?? 'always', isHovered, isSelected);
        if (!shouldShow) continue;

        const midpoint = getLinkMidpoint(link);
        if (!midpoint) continue;

        linksNeedingPositions.push({
          link,
          linkId,
          labelStyle,
          midpoint
        });
      }

      // Create temporary canvas once for all measurements (Step 5 optimization)
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return positions;

      // Second pass: batch calculate all positions (Step 5 optimization)
      for (const item of linksNeedingPositions) {
        // Measure text with caching
        const cacheKey = `${item.labelStyle.font}_${item.link.label}`;
        let metrics = this.textMetricsCache.get(cacheKey);
        if (!metrics) {
          tempCtx.font = item.labelStyle.font ?? '10px Arial';
          metrics = tempCtx.measureText(item.link.label!);
          this.textMetricsCache.set(cacheKey, metrics);
        }

        const width = metrics.width + ((item.labelStyle.paddingX ?? 8) * 2);
        const height = (metrics.actualBoundingBoxAscent || 10) + (metrics.actualBoundingBoxDescent || 4) + ((item.labelStyle.paddingY ?? 4) * 2);

        positions.set(item.linkId, {
          x: item.midpoint.x - width / 2,
          y: item.midpoint.y - height / 2,
          width,
          height
        });
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }

    return positions;
  }

  /**
   * Render a single label at given coordinates
   */
  private static renderSingleLabel(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    style: LinkLabelRenderStyle
  ): void {
    // Set font first for text measurement
    ctx.font = style.font ?? '10px Arial';

    // Measure text
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = (metrics.actualBoundingBoxAscent || 10) + (metrics.actualBoundingBoxDescent || 4);

    // Calculate background rectangle dimensions
    const rectWidth = textWidth + ((style.paddingX ?? 8) * 2);
    const rectHeight = textHeight + ((style.paddingY ?? 4) * 2);
    const rectX = x - rectWidth / 2;
    const rectY = y - rectHeight / 2;

    // Draw background rectangle
    if (style.backgroundColor && style.backgroundColor !== 'transparent') {
      ctx.fillStyle = style.backgroundColor;
      this.roundRect(ctx, rectX, rectY, rectWidth, rectHeight, style.borderRadius ?? 4);
      ctx.fill();
    }

    // Draw border
    if ((style.borderWidth ?? 0) > 0 && style.borderColor && style.borderColor !== 'transparent') {
      ctx.strokeStyle = style.borderColor;
      ctx.lineWidth = style.borderWidth ?? 1;
      this.roundRect(ctx, rectX, rectY, rectWidth, rectHeight, style.borderRadius ?? 4);
      ctx.stroke();
    }

    // Draw text
    ctx.fillStyle = style.textColor ?? '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  /**
   * Helper to draw rounded rectangle
   */
  private static roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    if (radius === 0) {
      ctx.rect(x, y, width, height);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Determine if label should be shown based on visibility setting
   */
  private static shouldShowLabel(
    visibility: 'always' | 'hover' | 'selection',
    isHovered: boolean,
    isSelected: boolean
  ): boolean {
    // Always show label when link is selected (override visibility mode)
    if (isSelected) {
      return true;
    }

    switch (visibility) {
      case 'always':
        return true;
      case 'hover':
        return isHovered;
      case 'selection':
        return false; // Only show when selected (handled above)
      default:
        return true;
    }
  }

  /**
   * Get unique link ID for tracking with caching (Step 5 optimization)
   */
  private static getLinkIdCached(link: V2Link): string {
    let linkId = this.linkIdCache.get(link);
    if (linkId === undefined) {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      linkId = `${sourceId}->${targetId}`;
      this.linkIdCache.set(link, linkId);
    }
    return linkId;
  }

  /**
   * Get unique link ID for tracking (legacy method for backward compatibility)
   */
  private static getLinkId(link: V2Link): string {
    return this.getLinkIdCached(link);
  }

  /**
   * Clear link ID cache (Step 5 optimization)
   */
  static clearCache(): void {
    this.linkIdCache.clear();
    this.textMetricsCache.clear();
  }
}