import { Selection, BaseType } from 'd3-selection';
import { GraphLink, GraphNode, ResolvedLinkStyle } from '../contracts/graph.types';
import { GraphRenderContext } from '../contracts/renderer.interface';
import { resolveLinkStyle } from '../utils/resolve-link-style';
import { createArrowMarker } from '../core/create-arrow-marker';

export interface RenderableGraphLink {
  readonly link: GraphLink;
  readonly style: ResolvedLinkStyle;
  readonly markerEnd: string;
}

export function getShortenedSourcePoint(link: GraphLink, style: ResolvedLinkStyle): { x: number; y: number } {
  const source: GraphNode = link.source as GraphNode;
  const target: GraphNode = link.target as GraphNode;

  const sourceX: number = source.x ?? 0;
  const sourceY: number = source.y ?? 0;
  const targetX: number = target.x ?? 0;
  const targetY: number = target.y ?? 0;

  const dx: number = targetX - sourceX;
  const dy: number = targetY - sourceY;

  const distance: number = Math.sqrt(dx * dx + dy * dy) || 1;

  // Get current radius from DOM if available (accounts for selection changes)
  let sourceRadius: number = source.style?.radius ?? 12;
  if (typeof document !== 'undefined') {
    // Find the circle element - prefer selection layer, then regular layer
    // First try selection layer
    let circle = document.querySelector(`[data-layer="selection-nodes"] circle[data-node-id="${source.id}"]`) as SVGCircleElement | null;

    // If not in selection layer, try regular nodes layer
    if (!circle) {
      // Find by iterating through circles with D3 data binding
      const circles = Array.from(document.querySelectorAll('circle'));
      for (const c of circles) {
        const boundData = (c as SVGCircleElement & { __data__: GraphNode }).__data__;
        if (boundData && boundData.id === source.id) {
          circle = c;
          break;
        }
      }
    }

    if (circle) {
      const currentRadius = parseFloat(circle.getAttribute('r') || '12');
      sourceRadius = currentRadius;
    }
  }

  const sourceStrokeWidth: number = source.style?.strokeWidth ?? 1.5;

  // Calculate offset from source node edge including ring/stroke
  const linkStrokeCompensation: number = style.strokeWidth / 2;
  const nodeStrokeOffset: number = sourceStrokeWidth / 2;
  const visualSpacing: number = 2;
  const offset: number = sourceRadius + nodeStrokeOffset + linkStrokeCompensation + visualSpacing;

  return {
    x: sourceX + (dx / distance) * offset,
    y: sourceY + (dy / distance) * offset,
  };
}

export function getShortenedTargetPoint(link: GraphLink, style: ResolvedLinkStyle): { x: number; y: number } {
  const source: GraphNode = link.source as GraphNode;
  const target: GraphNode = link.target as GraphNode;

  const sourceX: number = source.x ?? 0;
  const sourceY: number = source.y ?? 0;
  const targetX: number = target.x ?? 0;
  const targetY: number = target.y ?? 0;

  const dx: number = targetX - sourceX;
  const dy: number = targetY - sourceY;

  const distance: number = Math.sqrt(dx * dx + dy * dy) || 1;

  // Get current radius from DOM if available (accounts for selection changes)
  let targetRadius: number = target.style?.radius ?? 12;
  if (typeof document !== 'undefined') {
    // Find the circle element - prefer selection layer, then regular layer
    // First try selection layer
    let circle = document.querySelector(`[data-layer="selection-nodes"] circle[data-node-id="${target.id}"]`) as SVGCircleElement | null;

    // If not in selection layer, try regular nodes layer
    if (!circle) {
      // Find by iterating through circles with D3 data binding
      const circles = Array.from(document.querySelectorAll('circle'));
      for (const c of circles) {
        const boundData = (c as SVGCircleElement & { __data__: GraphNode }).__data__;
        if (boundData && boundData.id === target.id) {
          circle = c;
          break;
        }
      }
    }

    if (circle) {
      const currentRadius = parseFloat(circle.getAttribute('r') || '12');
      targetRadius = currentRadius;
    }
  }

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