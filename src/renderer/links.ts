import { Selection, BaseType } from 'd3-selection';
import { GraphLink, GraphNode, ResolvedLinkStyle } from '../contracts/graph.types';
import { GraphRenderContext } from '../contracts/renderer.interface';
import { resolveLinkStyle } from '../utils/resolve-link-style';
import { createArrowMarker } from '../core/create-arrow-marker';
import { RenderableLinkLabel } from './link-labels';

export interface RenderableGraphLink {
  readonly link: GraphLink;
  readonly style: ResolvedLinkStyle;
  readonly markerEnd: string;
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
  const targetRadius: number = target.style?.radius ?? 12;

  const arrowLength: number = style.arrow.enabled ? style.arrow.size * 2 : 0;
  const strokeCompensation: number = style.strokeWidth / 2;
  const visualSpacing: number = 2;
  const offset: number = targetRadius + arrowLength + strokeCompensation + visualSpacing;

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
    .style('pointer-events', 'stroke');

  /**
   * Managed Link Label Hover:
   * Reveals the associated label for this specific link if visibility is set to 'hover'.
   */
  const labelSelection = ctx.root.selectAll<SVGGElement, RenderableLinkLabel>('.link-label');

  linkSelection
    .on('mouseenter.label-hover', (_event, d: RenderableGraphLink) => {
      labelSelection
        .filter(labelItem => labelItem.link === d.link && labelItem.style.label.visibility === 'hover')
        .interrupt()
        .transition()
        .duration(200)
        .style('opacity', 1);
    })
    .on('mouseleave.label-hover', (_event, d: RenderableGraphLink) => {
      labelSelection
        .filter(labelItem => labelItem.link === d.link && labelItem.style.label.visibility === 'hover')
        .interrupt()
        .transition()
        .duration(200)
        .style('opacity', 0);
    });

  return linkSelection;
}