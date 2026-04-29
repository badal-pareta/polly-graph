import {
  Selection,
  BaseType
} from 'd3-selection';

import {
  GraphNode
} from '../contracts/graph.types';

import {
  GraphRenderContext
} from '../contracts/renderer.interface';

export function renderNodes(
  ctx: GraphRenderContext,
  nodes: GraphNode[]
): Selection<
  SVGCircleElement,
  GraphNode,
  BaseType,
  unknown
> {
  return ctx.root
    .select('[data-layer="nodes"]')
    .selectAll<
      SVGCircleElement,
      GraphNode
    >('circle')
    .data(
      nodes,
      (d: GraphNode) => d.id
    )
    .join('circle')
    .attr(
      'r',
      (node: GraphNode) =>
        node.style?.radius ?? 8
    )
    .attr(
      'fill',
      (node: GraphNode) =>
        node.style?.fill ?? '#6c5ce7'
    )
    .attr(
      'stroke',
      (node: GraphNode) =>
        node.style?.stroke ?? '#ffffff'
    )
    .attr(
      'stroke-width',
      (node: GraphNode) =>
        node.style?.strokeWidth ?? 1.5
    )
    .attr(
      'opacity',
      (node: GraphNode) =>
        node.style?.opacity ?? 1
    );
}