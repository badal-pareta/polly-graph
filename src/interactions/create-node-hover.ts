import { Selection, BaseType, select } from 'd3-selection';
import { GraphNode, NodeStyle } from '../contracts/graph.types';
import { RenderableLinkLabel } from '../renderer/link-labels';

/**
 * Enhanced Node Hover Interaction
 * Handles circle style changes and managed visibility for connected link labels.
 */
export function createNodeHover(
  nodeSelection: Selection<SVGCircleElement, GraphNode, BaseType, unknown>,
  hoverStyle?: Partial<NodeStyle>
): void {
  // Guard clause for empty selections
  const firstNode = nodeSelection.node();
  if (!firstNode) return;

  // 1. Logic for Node Circle Visuals
  if (hoverStyle) {
    nodeSelection
      .on('mouseenter.hover', function (_event: MouseEvent, node: GraphNode): void {
        const circle = this as SVGCircleElement;
        circle.setAttribute('stroke', hoverStyle.stroke ?? node.style?.stroke ?? '#ffffff');
        circle.setAttribute('stroke-width', String(hoverStyle.strokeWidth ?? node.style?.strokeWidth ?? 1.5));
        circle.setAttribute('opacity', String(hoverStyle.opacity ?? node.style?.opacity ?? 1));
      })
      .on('mouseleave.hover', function (_event: MouseEvent, node: GraphNode): void {
        const circle = this as SVGCircleElement;
        circle.setAttribute('stroke', node.style?.stroke ?? '#ffffff');
        circle.setAttribute('stroke-width', String(node.style?.strokeWidth ?? 1.5));
        circle.setAttribute('opacity', String(node.style?.opacity ?? 1));
      });
  }

  /**
   * 2. Managed Link Label Visibility
   * Safe selection of the SVG root without 'any' casting.
   */
  const svgElement = firstNode.ownerSVGElement;
  if (!svgElement) return;

  const root = select<SVGSVGElement, unknown>(svgElement);
  const labelSelection = root.selectAll<SVGGElement, RenderableLinkLabel>('.link-label');

  nodeSelection
    .on('mouseenter.labels', (_event, d: GraphNode) => {
      labelSelection
        .filter(item => {
          // Only reveal labels explicitly configured for hover interaction
          if (item.style.label.visibility !== 'hover') return false;
          
          // Match if hovered node is source or target of the link
          const s = item.link.source as GraphNode;
          const t = item.link.target as GraphNode;
          return s.id === d.id || t.id === d.id;
        })
        .interrupt() 
        .transition()
        .duration(200)
        .style('opacity', 1)
        .style('pointer-events', 'auto'); // Enable interaction and cursor
    })
    .on('mouseleave.labels', (_event) => {
      labelSelection
        .filter(function(item: RenderableLinkLabel): boolean {
          return item.style.label.visibility === 'hover' &&
                 !(this as SVGGElement).classList.contains('label-selection-pinned');
        })
        .interrupt()
        .transition()
        .duration(200)
        .style('opacity', 0)
        .style('pointer-events', 'none'); // Disable interaction and cursor
    });
}