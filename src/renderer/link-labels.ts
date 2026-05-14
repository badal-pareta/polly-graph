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

  // First create rectangles as background
  labelSelection
    .selectAll<SVGRectElement, RenderableLinkLabel>('rect')
    .data((item: RenderableLinkLabel): RenderableLinkLabel[] => [item])
    .join('rect')
    .attr('rx', (item: RenderableLinkLabel): number => item.style.label.borderRadius)
    .attr('ry', (item: RenderableLinkLabel): number => item.style.label.borderRadius)
    .attr('fill', (item: RenderableLinkLabel): string => item.style.label.backgroundFill)
    .attr('stroke', (item: RenderableLinkLabel): string => item.style.label.borderColor)
    .attr('stroke-width', (item: RenderableLinkLabel): number => item.style.label.borderWidth);

  // Then create text elements on top
  const textSelection = labelSelection
    .selectAll<SVGTextElement, RenderableLinkLabel>('text')
    .data((item: RenderableLinkLabel): RenderableLinkLabel[] => [item])
    .join('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('font-size', (item: RenderableLinkLabel): number => item.style.label.fontSize)
    .attr('fill', (item: RenderableLinkLabel): string => item.style.label.textColor)
    .text((item: RenderableLinkLabel): string => item.link.label ?? '');

  // Now size rectangles based on text getBBox() after text is rendered
  textSelection.each(function(item: RenderableLinkLabel) {
    const textElement = this as SVGTextElement;
    const parentGroup = textElement.parentNode as SVGGElement;

    // Find the corresponding rect element in the same group
    const rectElement = parentGroup.querySelector('rect') as SVGRectElement;

    if (rectElement) {
      try {
        const bbox = textElement.getBBox();
        const paddingX = item.style.label.paddingX;
        const paddingY = item.style.label.paddingY;

        // Set rectangle dimensions based on text bbox + padding
        rectElement.setAttribute('width', String(bbox.width + paddingX * 2));
        rectElement.setAttribute('height', String(bbox.height + paddingY * 2));
        rectElement.setAttribute('x', String(bbox.x - paddingX));
        rectElement.setAttribute('y', String(bbox.y - paddingY));
      } catch {
        // Fallback to estimation if getBBox() fails
        const text = item.link.label ?? '';
        const fontSize = item.style.label.fontSize;
        const textWidth = text.length * fontSize * 0.6;
        const rectWidth = textWidth + (item.style.label.paddingX * 2);

        rectElement.setAttribute('width', String(rectWidth));
        rectElement.setAttribute('height', String(item.style.label.height));
        rectElement.setAttribute('x', String(-rectWidth / 2));
        rectElement.setAttribute('y', String(-item.style.label.height / 2));
      }
    }
  });

  return labelSelection;
}