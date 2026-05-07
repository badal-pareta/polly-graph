import { select, Selection, BaseType } from 'd3-selection';

import { createArrowMarker } from '../core/create-arrow-marker';
import { RenderableGraphLink } from '../renderer/links';
import { RenderableLinkLabel } from '../renderer/link-labels';
import { GraphNode } from '../contracts/graph.types';
import { GraphLayers } from '../contracts/graph-layers.interface';
import { NodeSelectHandler, LinkSelectHandler, SelectionInteractionConfig } from '../contracts/graph-config.interface';

export function deselectNode(
  nodeElement: SVGCircleElement,
  root: Selection<SVGGElement, unknown, null, undefined>,
  nodeSelectHandlers: Set<NodeSelectHandler>,
  nodeDeselectHandlers: Set<NodeSelectHandler>
): void {
  nodeElement.style.fill = '';
  nodeElement.style.stroke = '';
  nodeElement.style.strokeWidth = '';
  nodeElement.style.opacity = '';
  nodeElement.style.removeProperty('r');
  root
    .selectAll<SVGGElement, RenderableLinkLabel>('.link-label.label-selection-pinned')
    .classed('label-selection-pinned', false)
    .interrupt()
    .transition()
    .duration(200)
    .style('opacity', 0)
    .style('pointer-events', 'none');
  const nodeData = select(nodeElement).datum() as GraphNode;
  nodeSelectHandlers.clear();
  nodeDeselectHandlers.forEach(handler => handler(nodeData, nodeElement));
}

export function deselectLink(
  linkElement: SVGLineElement,
  linkMarkerSnapshots: Map<SVGLineElement, string | null>,
  linkSelectHandlers: Set<LinkSelectHandler>,
  linkDeselectHandlers: Set<LinkSelectHandler>
): void {
  linkElement.style.stroke = '';
  linkElement.style.strokeWidth = '';
  linkElement.style.opacity = '';
  const originalMarkerEnd = linkMarkerSnapshots.get(linkElement);
  if (originalMarkerEnd) {
    linkElement.setAttribute('marker-end', originalMarkerEnd);
  } else {
    linkElement.removeAttribute('marker-end');
  }
  const linkData = (select(linkElement).datum() as RenderableGraphLink).link;
  linkSelectHandlers.clear();
  linkDeselectHandlers.forEach(handler => handler(linkData, linkElement));
}

export function selectLink(
  event: MouseEvent,
  renderableLink: RenderableGraphLink,
  linkElement: SVGLineElement,
  selectionConfig: SelectionInteractionConfig,
  layers: GraphLayers,
  linkSelectHandlers: Set<LinkSelectHandler>
): void {
  event.stopPropagation();

  const linkStyle = selectionConfig.linkStyle;
  if (linkStyle) {
    if (linkStyle.stroke !== undefined) { linkElement.style.stroke = linkStyle.stroke; }
    if (linkStyle.strokeWidth !== undefined) { linkElement.style.strokeWidth = String(linkStyle.strokeWidth); }
    if (linkStyle.opacity !== undefined) { linkElement.style.opacity = String(linkStyle.opacity); }

    if (linkStyle.stroke !== undefined && renderableLink.style.arrow.enabled) {
      const selectionMarkerStyle = {
        stroke: linkStyle.stroke,
        arrow: { fill: linkStyle.stroke, size: renderableLink.style.arrow.size }
      };
      const selectionMarkerId = createArrowMarker({ svg: layers.svg, style: selectionMarkerStyle });
      select(linkElement).attr('marker-end', `url(#${selectionMarkerId})`);
    }
  }

  linkSelectHandlers.forEach(handler => handler(renderableLink.link, linkElement));
}

export function createLinkHitArea(
  root: Selection<SVGGElement, unknown, null, undefined>,
  linkSelection: Selection<SVGLineElement, RenderableGraphLink, BaseType, unknown>
): Selection<SVGLineElement, RenderableGraphLink, BaseType, unknown> {
  return root
    .select('[data-layer="links"]')
    .selectAll<SVGLineElement, RenderableGraphLink>('line.link-hit-area')
    .data(linkSelection.data())
    .join('line')
    .attr('class', 'link-hit-area')
    .attr('stroke', 'rgba(0,0,0,0)')
    .attr('stroke-width', (item: RenderableGraphLink): number => item.style.arrow.size * 4)
    .style('pointer-events', 'stroke')
    .style('cursor', 'pointer')
    .attr('opacity', 0);
}
