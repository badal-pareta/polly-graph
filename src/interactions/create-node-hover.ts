import {
  Selection,
  BaseType
} from 'd3-selection';

import {
  GraphNode,
  NodeStyle
} from '../contracts/graph.types';

export function createNodeHover(
  nodeSelection: Selection<
    SVGCircleElement,
    GraphNode,
    BaseType,
    unknown
  >,
  hoverStyle?: Partial<NodeStyle>
): void {
  if (!hoverStyle) {
    return;
  }

  nodeSelection
    .on(
      'mouseenter.hover',
      function (
        _event: MouseEvent,
        node: GraphNode
      ): void {
        const circle =
          this as SVGCircleElement;

        const hoverStroke: string =
          hoverStyle.stroke ??
          node.style?.stroke ??
          '#ffffff';

        const hoverStrokeWidth: number =
          hoverStyle.strokeWidth ??
          node.style?.strokeWidth ??
          1.5;

        const hoverOpacity: number =
          hoverStyle.opacity ??
          node.style?.opacity ??
          1;

        circle.setAttribute(
          'stroke',
          hoverStroke
        );

        circle.setAttribute(
          'stroke-width',
          String(
            hoverStrokeWidth
          )
        );

        circle.setAttribute(
          'opacity',
          String(
            hoverOpacity
          )
        );
      }
    )
    .on(
      'mouseleave.hover',
      function (
        _event: MouseEvent,
        node: GraphNode
      ): void {
        const circle =
          this as SVGCircleElement;

        const defaultStroke: string =
          node.style?.stroke ??
          '#ffffff';

        const defaultStrokeWidth: number =
          node.style?.strokeWidth ??
          1.5;

        const defaultOpacity: number =
          node.style?.opacity ??
          1;

        circle.setAttribute(
          'stroke',
          defaultStroke
        );

        circle.setAttribute(
          'stroke-width',
          String(
            defaultStrokeWidth
          )
        );

        circle.setAttribute(
          'opacity',
          String(
            defaultOpacity
          )
        );
      }
    );
}