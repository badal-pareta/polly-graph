import { Selection } from 'd3-selection';
import { GraphLink, ResolvedLinkStyle } from '../contracts/graph.types';
import { GraphRenderContext } from '../contracts/renderer.interface';
import { resolveLinkStyle } from '../utils/resolve-link-style';

export interface RenderableLinkLabel {
  readonly link: GraphLink;
  readonly style: ResolvedLinkStyle;
}

function createRenderableLinks(params: GraphRenderContext, links: GraphLink[]): RenderableLinkLabel[] {
  return links
    .map(
      (link: GraphLink): RenderableLinkLabel => ({ 
        link, 
        style: resolveLinkStyle({ link, interaction: params.interaction }) 
      }),
    )
    .filter(
      (item: RenderableLinkLabel): boolean => item.style.label.enabled && Boolean(item.link.label)
    );
}

function getLinkKey(link: GraphLink): string {
  const sourceId: string = typeof link.source === 'string' ? link.source : link.source.id;
  const targetId: string = typeof link.target === 'string' ? link.target : link.target.id;

  return `${sourceId}::${targetId}::${link.label ?? ''}`;
}

export function renderLinkLabels(params: GraphRenderContext, links: GraphLink[]): Selection<SVGGElement, RenderableLinkLabel, SVGGElement, unknown> {
  const renderableLinks: RenderableLinkLabel[] = createRenderableLinks(params, links);

  const labelSelection = params.root
    .select<SVGGElement>('[data-layer="link-labels"]')
    .selectAll<SVGGElement, RenderableLinkLabel>('.link-label')
    .data(renderableLinks, (item: RenderableLinkLabel): string => getLinkKey(item.link))
    .join('g')
    .attr('class', 'link-label')
    /**
     * Managed Visual State:
     * We use opacity instead of 'display: none' to preserve the ability to use D3 transitions
     * for smooth fading.
     */
    .style('opacity', (item: RenderableLinkLabel): number => {
      const visibility = item.style.label.visibility ?? 'always';
      return visibility === 'always' ? 1 : 0;
    })
    /**
     * Managed Interaction State:
     * When opacity is 0, we must set pointer-events to 'none' so these
     * "ghost" elements don't block interaction with nodes/links underneath.
     */
    .style('pointer-events', (item: RenderableLinkLabel): string => {
      const visibility = item.style.label.visibility ?? 'always';
      return visibility === 'always' ? 'auto' : 'none';
    })
    /**
     * Cursor state is only active when pointer-events are 'auto'.
     */
    .style('cursor', 'pointer');

  labelSelection
    .selectAll<SVGRectElement, RenderableLinkLabel>('rect')
    .data((item: RenderableLinkLabel): RenderableLinkLabel[] => [item])
    .join('rect')
    .attr('rx', (item: RenderableLinkLabel): number => item.style.label.borderRadius)
    .attr('ry', (item: RenderableLinkLabel): number => item.style.label.borderRadius)
    .attr('height', (item: RenderableLinkLabel): number => item.style.label.height)
    .attr('fill', (item: RenderableLinkLabel): string => item.style.label.backgroundFill)
    .attr('stroke', (item: RenderableLinkLabel): string => item.style.label.borderColor)
    .attr('stroke-width', (item: RenderableLinkLabel): number => item.style.label.borderWidth);

  labelSelection
    .selectAll<SVGTextElement, RenderableLinkLabel>('text')
    .data((item: RenderableLinkLabel): RenderableLinkLabel[] => [item])
    .join('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('font-size', (item: RenderableLinkLabel): number => item.style.label.fontSize)
    .attr('fill', (item: RenderableLinkLabel): string => item.style.label.textColor)
    .text((item: RenderableLinkLabel): string => item.link.label ?? '');

  return labelSelection;
}