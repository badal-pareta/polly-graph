import { select, Selection, BaseType } from 'd3-selection';

import { createArrowMarker } from '../core/create-arrow-marker';
import { RenderableGraphLink } from '../renderer/links';
import { RenderableLinkLabel } from '../renderer/link-labels';
import { GraphNode } from '../contracts/graph.types';
import { GraphLayers } from '../contracts/graph-layers.interface';
import { SelectionInteractionConfig } from '../contracts/graph-config.interface';
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
): Selection<SVGRectElement, RenderableGraphLink, BaseType, unknown> {
  return root
    .select('[data-layer="links"]')
    .selectAll<SVGRectElement, RenderableGraphLink>('rect.link-hit-area')
    .data(linkSelection.data())
    .join('rect')
    .attr('class', 'link-hit-area')
    .attr('fill', 'rgba(0,0,0,0)')
    .style('pointer-events', 'fill')
    .style('cursor', 'pointer')
    .attr('opacity', 0)
    .each(function(item: RenderableGraphLink) {
      const rectElement = this as SVGRectElement;
      updateHitAreaDimensions(rectElement, item, root);
    });
}

function updateHitAreaDimensions(
  rectElement: SVGRectElement,
  item: RenderableGraphLink,
  root: Selection<SVGGElement, unknown, null, undefined>
): void {
  const source = item.link.source as GraphNode;
  const target = item.link.target as GraphNode;

  if (!source.x || !source.y || !target.x || !target.y) return;

  // Calculate link vector and length
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const linkLength = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // Calculate link midpoint (where label will be positioned)
  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;

  // Default thickness based on link stroke width and arrow size
  const thickness = Math.max((item.style.strokeWidth || 2) * 4, item.style.arrow.size * 2, 20);

  // For length, use full link length plus arrow size to ensure arrowhead is covered
  let length = linkLength + (item.style.arrow.size * 2);
  let width = thickness;

  // Try to get label dimensions if label exists and adjust width accordingly
  if (item.link.label) {
    const labelElement = root.select('[data-layer="link-labels"]')
      .selectAll<SVGGElement, RenderableLinkLabel>('.link-label')
      .filter((labelItem: RenderableLinkLabel) => labelItem.link === item.link)
      .node();

    if (labelElement) {
      try {
        const textElement = labelElement.querySelector('text');
        const rectElement = labelElement.querySelector('rect');

        if (textElement && rectElement) {
          const bbox = textElement.getBBox();
          const labelWidth = bbox.width + (item.style.label.paddingX * 2);
          const labelHeight = bbox.height + (item.style.label.paddingY * 2);

          // Use label dimensions plus some padding
          width = Math.max(width, labelHeight + 10);
          length = Math.max(length, labelWidth + 20);
        }
      } catch {
        // Fallback to estimated label size
        const text = item.link.label ?? '';
        const fontSize = item.style.label.fontSize;
        const estimatedWidth = text.length * fontSize * 0.6 + (item.style.label.paddingX * 2) + 20;
        const estimatedHeight = fontSize + (item.style.label.paddingY * 2) + 10;

        width = Math.max(width, estimatedHeight);
        length = Math.max(length, estimatedWidth);
      }
    }
  }

  // Create a rotated rectangle that covers the entire link including arrowhead
  // First, position rectangle at midpoint
  const rectX = midX - length / 2;
  const rectY = midY - width / 2;

  // Set dimensions
  rectElement.setAttribute('width', String(length));
  rectElement.setAttribute('height', String(width));

  // Set position
  rectElement.setAttribute('x', String(rectX));
  rectElement.setAttribute('y', String(rectY));

  // Apply rotation to align with link direction
  const degrees = (angle * 180) / Math.PI;
  rectElement.setAttribute('transform', `rotate(${degrees}, ${midX}, ${midY})`);
}
