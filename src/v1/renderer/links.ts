import { Selection, BaseType } from 'd3-selection';
import { GraphLink, GraphNode, ResolvedLinkStyle } from '../contracts/graph.types';
import { GraphRenderContext } from '../contracts/renderer.interface';
import { resolveLinkStyle } from '../utils/resolve-link-style';
import { createArrowMarker } from '../core/create-arrow-marker';
import { getNodeRadiusWithCache, NodeRadiusCache } from '../utils/node-radius-cache';

export interface RenderableGraphLink {
  readonly link: GraphLink;
  readonly style: ResolvedLinkStyle;
  readonly markerEnd: string;
}


interface MemoizedLinkCalculator {
  getSourcePoint(link: GraphLink, style: ResolvedLinkStyle, radiusCache?: NodeRadiusCache): { x: number; y: number };
  getTargetPoint(link: GraphLink, style: ResolvedLinkStyle, radiusCache?: NodeRadiusCache): { x: number; y: number };
  invalidate(link: GraphLink): void;
  clear(): void;
}

class LinkCalculatorImpl implements MemoizedLinkCalculator {
  private cache = new WeakMap<GraphLink, {
    sourcePoint?: { x: number; y: number; timestamp: number };
    targetPoint?: { x: number; y: number; timestamp: number };
  }>();

  private readonly CACHE_TTL = 100;

  getSourcePoint(link: GraphLink, style: ResolvedLinkStyle, radiusCache?: NodeRadiusCache): { x: number; y: number } {
    const cached = this.cache.get(link)?.sourcePoint;
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      return { x: cached.x, y: cached.y };
    }

    const point = getShortenedSourcePoint(link, style, radiusCache);

    const linkCache = this.cache.get(link) || {};
    linkCache.sourcePoint = { ...point, timestamp: now };
    this.cache.set(link, linkCache);

    return point;
  }

  getTargetPoint(link: GraphLink, style: ResolvedLinkStyle, radiusCache?: NodeRadiusCache): { x: number; y: number } {
    const cached = this.cache.get(link)?.targetPoint;
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      return { x: cached.x, y: cached.y };
    }

    const point = getShortenedTargetPoint(link, style, radiusCache);

    const linkCache = this.cache.get(link) || {};
    linkCache.targetPoint = { ...point, timestamp: now };
    this.cache.set(link, linkCache);

    return point;
  }

  invalidate(link: GraphLink): void {
    this.cache.delete(link);
  }

  clear(): void {
    this.cache = new WeakMap();
  }
}

export const linkCalculator = new LinkCalculatorImpl();

export function getShortenedSourcePoint(
  link: GraphLink,
  style: ResolvedLinkStyle,
  radiusCache?: NodeRadiusCache
): { x: number; y: number } {
  const source: GraphNode = link.source as GraphNode;
  const target: GraphNode = link.target as GraphNode;

  const sourceX: number = source.x ?? 0;
  const sourceY: number = source.y ?? 0;
  const targetX: number = target.x ?? 0;
  const targetY: number = target.y ?? 0;

  const dx: number = targetX - sourceX;
  const dy: number = targetY - sourceY;

  const distance: number = Math.sqrt(dx * dx + dy * dy) || 1;

  const fallbackRadius = source.style?.radius ?? 12;
  const sourceRadius = radiusCache
    ? getNodeRadiusWithCache(source.id, fallbackRadius, radiusCache)
    : fallbackRadius;

  const sourceStrokeWidth: number = source.style?.strokeWidth ?? 1.5;

  const linkStrokeCompensation: number = style.strokeWidth / 2;
  const nodeStrokeOffset: number = sourceStrokeWidth / 2;
  const visualSpacing: number = 2;
  const offset: number = sourceRadius + nodeStrokeOffset + linkStrokeCompensation + visualSpacing;

  return {
    x: sourceX + (dx / distance) * offset,
    y: sourceY + (dy / distance) * offset,
  };
}

export function getShortenedTargetPoint(
  link: GraphLink,
  style: ResolvedLinkStyle,
  radiusCache?: NodeRadiusCache
): { x: number; y: number } {
  const source: GraphNode = link.source as GraphNode;
  const target: GraphNode = link.target as GraphNode;

  const sourceX: number = source.x ?? 0;
  const sourceY: number = source.y ?? 0;
  const targetX: number = target.x ?? 0;
  const targetY: number = target.y ?? 0;

  const dx: number = targetX - sourceX;
  const dy: number = targetY - sourceY;

  const distance: number = Math.sqrt(dx * dx + dy * dy) || 1;

  const fallbackRadius = target.style?.radius ?? 12;
  const targetRadius = radiusCache
    ? getNodeRadiusWithCache(target.id, fallbackRadius, radiusCache)
    : fallbackRadius;

  const targetStrokeWidth: number = target.style?.strokeWidth ?? 1.5;

  const arrowLength: number = style.arrow.enabled ? style.arrow.size * 2 : 0;
  const linkStrokeCompensation: number = style.strokeWidth / 2;
  const nodeStrokeOffset: number = targetStrokeWidth / 2;
  const visualSpacing: number = 2;
  const offset: number = targetRadius + nodeStrokeOffset + arrowLength + linkStrokeCompensation + visualSpacing;

  return {
    x: targetX - (dx / distance) * offset,
    y: targetY - (dy / distance) * offset,
  };
}

function createRenderableLinks(ctx: GraphRenderContext, links: GraphLink[]): RenderableGraphLink[] {
  return links.map(
    (link: GraphLink): RenderableGraphLink => {
      const style: ResolvedLinkStyle = resolveLinkStyle({ link, interaction: ctx.interaction });
      const markerEnd: string = style.arrow.enabled
          ? `url(#${createArrowMarker({ svg: ctx.svg, style })})`
          : '';
      return { link, style, markerEnd };
    }
  );
}

function getLinkKey(link: GraphLink): string {
  const sourceId: string = typeof link.source === 'string' ? link.source : link.source.id;
  const targetId: string = typeof link.target === 'string' ? link.target : link.target.id;
  return `${sourceId}::${targetId}::${link.label ?? ''}`;
}

export function renderLinks(ctx: GraphRenderContext, links: GraphLink[]): Selection<SVGLineElement, RenderableGraphLink, BaseType, unknown> {
  const renderableLinks: RenderableGraphLink[] = createRenderableLinks(ctx, links);

  const linkSelection = ctx.root
    .select('[data-layer="links"]')
    .selectAll<SVGLineElement, RenderableGraphLink>('line')
    .data(renderableLinks, (item: RenderableGraphLink): string => getLinkKey(item.link))
    .join('line')
    .attr('class', 'graph-link')
    .attr('stroke', (item: RenderableGraphLink): string => item.style.stroke)
    .attr('stroke-width', (item: RenderableGraphLink): number => item.style.strokeWidth)
    .attr('opacity', (item: RenderableGraphLink): number => item.style.opacity)
    .attr('marker-end', (item: RenderableGraphLink): string => item.markerEnd)
    // Ensures thin lines are easily hoverable by capturing events on the stroke area
    .style('pointer-events', 'stroke')
    .style('cursor', 'pointer');


  return linkSelection;
}