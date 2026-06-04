import { Selection, BaseType } from 'd3-selection';
import { GraphNode } from '../contracts/graph.types';
import { GraphRenderContext } from '../contracts/renderer.interface';

export function renderNodes(ctx: GraphRenderContext, nodes: GraphNode[]): Selection<SVGCircleElement, GraphNode, BaseType, unknown> {
  return ctx.root
    .select('[data-layer="nodes"]')
    .selectAll<SVGCircleElement, GraphNode>('circle')
    .data(nodes, (d: GraphNode) => d.id)
    .join('circle')
    .attr('r', (node: GraphNode) => node.style?.radius ?? 8)
    .attr('fill', (node: GraphNode) => node.style?.fill ?? '#6c5ce7')
    .call(selection => {
      // Only set stroke attributes if node has custom stroke styling
      selection.each(function(node) {
        const element = this as SVGCircleElement;
        if (node.style?.stroke !== undefined) {
          element.setAttribute('stroke', node.style.stroke);
        }
        if (node.style?.strokeWidth !== undefined) {
          element.setAttribute('stroke-width', String(node.style.strokeWidth));
        }
      });
    })
    .attr('opacity', (node: GraphNode) => node.style?.opacity ?? 1)
    .style('cursor', 'pointer');
}