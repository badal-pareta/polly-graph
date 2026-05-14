import { drag } from 'd3-drag';
import { Simulation } from 'd3-force';
import { GraphLink, GraphNode } from '../contracts/graph.types';

const DRAG_ALPHA_TARGET = 0.3;

export function createDragBehavior(
  simulation: Simulation<GraphNode, GraphLink>,
  onDragStart?: VoidFunction,
  canvasBounds?: { width: number; height: number }
) {
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
          // Check if node ended up outside canvas bounds
          const isOutside = canvasBounds && (
            event.x < 0 || event.x > canvasBounds.width ||
            event.y < 0 || event.y > canvasBounds.height
          );

          if (isOutside) {
            // Keep simulation active with low alpha to pull node back
            simulation.alphaTarget(0.1);
          } else {
            // Normal case - stop simulation
            simulation.alphaTarget(0);
          }
        }

        node.fx = null;
        node.fy = null;
        hasActuallyDragged = false;
    });
}