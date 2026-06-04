import {
  GraphLink,
  GraphNode
} from '../contracts/graph.types';

export function getLinkTargetPoint(
  link: GraphLink
): {
  x: number;
  y: number;
} {
  const source =
    link.source as GraphNode;

  const target =
    link.target as GraphNode;

  const sourceX: number =
    source.x ?? 0;

  const sourceY: number =
    source.y ?? 0;

  const targetX: number =
    target.x ?? 0;

  const targetY: number =
    target.y ?? 0;

  const dx: number =
    targetX - sourceX;

  const dy: number =
    targetY - sourceY;

  const distance: number =
    Math.sqrt(
      dx * dx +
      dy * dy
    ) || 1;

  const targetRadius: number =
    target.style?.radius ?? 12;

  const targetStrokeWidth: number =
    target.style?.strokeWidth ?? 2;

  // const markerLength: number = 12;

  const gap: number = 4;

  const offset: number =
    targetRadius +
    targetStrokeWidth +
    // markerLength +
    gap;

  return {
    x:
      targetX -
      (dx / distance) * offset,

    y:
      targetY -
      (dy / distance) * offset
  };
}