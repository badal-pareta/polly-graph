import { select, Selection, BaseType } from 'd3-selection';

import { createArrowMarker } from '../core/create-arrow-marker';
import { RenderableGraphLink } from '../renderer/links';
import { RenderableLinkLabel } from '../renderer/link-labels';
import { GraphNode } from '../contracts/graph.types';
import { GraphLayers } from '../contracts/graph-layers.interface';
import { NodeSelectHandler, LinkSelectHandler, SelectionInteractionConfig } from '../contracts/graph-config.interface';
import { TypedGraphEventEmitter } from './event-emitter';

export function deselectNode(
  nodeElement: SVGCircleElement,
  root: Selection<SVGGElement, unknown, null, undefined>,
  eventEmitter: TypedGraphEventEmitter
): void {

  nodeElement.style.fill = '';
  nodeElement.style.stroke = '';
  nodeElement.style.strokeWidth = '';
  nodeElement.style.opacity = '';
  nodeElement.style.removeProperty('r');

  root
    .selectAll<SVGGElement, RenderableLinkLabel>(
      '.link-label.label-selection-pinned'
    )
    .classed('label-selection-pinned', false)
    .interrupt()
    .transition()
    .duration(200)
    .style('opacity', 0)
    .style('pointer-events', 'none');

  const nodeData: GraphNode =
    select(nodeElement).datum() as GraphNode;

  eventEmitter.emit('nodeDeselect', { node: nodeData, element: nodeElement });

}

export function deselectLink(
  linkElement: SVGLineElement,
  linkMarkerSnapshots: Map<SVGLineElement, string | null>,
  eventEmitter: TypedGraphEventEmitter
): void {

  // Remove selected marker
  delete linkElement.dataset.selected;

  linkElement.style.stroke = '';
  linkElement.style.strokeWidth = '';
  linkElement.style.opacity = '';

  const originalMarkerEnd: string | null =
    linkMarkerSnapshots.get(linkElement) ?? null;

  if (originalMarkerEnd) {
    linkElement.setAttribute(
      'marker-end',
      originalMarkerEnd
    );
  } else {
    linkElement.removeAttribute('marker-end');
  }

  const linkData =
    (select(linkElement).datum() as RenderableGraphLink).link;

  // Hide link label if it was pinned for selection and visibility is 'hover'
  const rootElement = linkElement.closest('.pg-root');
  if (rootElement) {
    select(rootElement)
      .selectAll<SVGGElement, RenderableLinkLabel>('.link-label.label-selection-pinned')
      .filter((item: RenderableLinkLabel): boolean => {
        return item.link === linkData && item.style.label.visibility === 'hover';
      })
      .classed('label-selection-pinned', false)
      .interrupt()
      .transition()
      .duration(200)
      .style('opacity', 0)
      .style('pointer-events', 'none');
  }

  eventEmitter.emit('linkDeselect', { link: linkData, element: linkElement });

}

export function selectLink(
  event: MouseEvent,
  renderableLink: RenderableGraphLink,
  linkElement: SVGLineElement,
  selectionConfig: SelectionInteractionConfig,
  layers: GraphLayers,
  eventEmitter: TypedGraphEventEmitter
): void {
  event.stopPropagation();

  // Mark element as selected for hover logic
  linkElement.dataset.selected = 'true';

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

  // Show link label for selected link if it exists
  const root = select(layers.root);
  root
    .selectAll<SVGGElement, RenderableLinkLabel>('.link-label')
    .filter((item: RenderableLinkLabel): boolean => item.link === renderableLink.link)
    .classed('label-selection-pinned', true)
    .interrupt()
    .transition()
    .duration(200)
    .style('opacity', 1)
    .style('pointer-events', 'auto');

  eventEmitter.emit('linkSelect', { link: renderableLink.link, element: linkElement });
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
