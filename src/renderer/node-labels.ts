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

export function renderNodeLabels(
  ctx: GraphRenderContext,
  nodes: GraphNode[]
): Selection<
  SVGTextElement,
  GraphNode,
  BaseType,
  unknown
> {
  const selection = ctx.root
    .select('[data-layer="node-labels"]')
    .selectAll<
      SVGTextElement,
      GraphNode
    >('text')
    .data(
      nodes,
      (d: GraphNode) => d.id
    )
    .join('text')
    .attr(
      'text-anchor',
      'middle'
    )
    .attr(
      'dominant-baseline',
      'middle'
    )
    .attr(
      'font-size',
      11
    )
    .attr(
      'fill',
      (node: GraphNode) =>
        node.style?.textColor ??
        '#ffffff'
    )
    .attr(
      'pointer-events',
      'none'
    )
    .text(
      (node: GraphNode) =>
        node.label ?? node.id
    );

  selection.each(function (
    node: GraphNode
  ): void {
    const textElement =
      this as SVGTextElement;

    const fullLabel: string =
      node.label ?? node.id;

    const radius: number =
      node.style?.radius ?? 8;

    const maxWidth: number =
      (radius * 2) - 6;

    let truncatedLabel: string =
      fullLabel;

    textElement.textContent =
      truncatedLabel;

    while (
      truncatedLabel.length > 1 &&
      textElement.getComputedTextLength() >
        maxWidth
    ) {
      truncatedLabel =
        truncatedLabel.slice(
          0,
          -1
        );

      textElement.textContent =
        `${truncatedLabel}…`;
    }
  });

  return selection;
}