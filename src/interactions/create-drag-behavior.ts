import { drag } from 'd3-drag';
import { Simulation } from 'd3-force';
import { GraphLink, GraphNode } from '../contracts/graph.types';

export function createDragBehavior(simulation: Simulation<GraphNode, GraphLink>) {
  return drag<SVGCircleElement, GraphNode>()
    .on('start', (event, d) => {
      /**
       * Reheat strongly so
       * node + label-anchor
       * collision can resolve
       * during drag.
       */
      if (!event.active) {
        simulation.alphaTarget(0.8).restart();
      }

      d.fx = d.x;
      d.fy = d.y;
    })
    .on('drag', (event, d) => {
      d.fx = event.x;
      d.fy = event.y;

      /**
       * Keep simulation alive
       * while dragging so
       * midpoint labels can
       * re-stabilize correctly.
       */
      simulation.alpha(0.4).restart();
    })
    .on('end', (event, d) => {
      if (!event.active) {
        simulation.alphaTarget(0);
      }

      d.fx = null;
      d.fy = null;
    });
}