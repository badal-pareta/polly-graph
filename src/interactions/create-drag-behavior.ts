import { drag } from 'd3-drag';
import { Simulation } from 'd3-force';
import { GraphLink, GraphNode } from '../contracts/graph.types';

const DRAG_ALPHA_TARGET = 0.3;

export function createDragBehavior(simulation: Simulation<GraphNode, GraphLink>, onDragStart?: VoidFunction) {
  let hasActuallyDragged = false;

  return drag<SVGCircleElement, GraphNode>()
    .on('start', (event, node): void => {
        hasActuallyDragged = false;
        // Don't restart simulation immediately - wait for actual drag movement
        node.fx = node.x;
        node.fy = node.y;
      }
    )
    .on('drag', (event, node): void => {
        // Only restart simulation on first actual drag movement
        if (!hasActuallyDragged) {
          hasActuallyDragged = true;
          if (!event.active) {
            simulation.alphaTarget(DRAG_ALPHA_TARGET).restart();
          }
          onDragStart?.();
        }

        node.fx = event.x;
        node.fy = event.y;
    })

    .on('end', (event, node): void => {
        if (hasActuallyDragged && !event.active) {
          simulation.alphaTarget(0);
        }

        node.fx = null;
        node.fy = null;
        hasActuallyDragged = false;
    });
}