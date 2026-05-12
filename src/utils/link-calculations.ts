/**
 * Utility functions for link calculations to avoid circular imports
 */
import { GraphNode, GraphLink, ResolvedLinkStyle } from '../contracts/graph.types';

export function getShortenedTargetPoint(link: GraphLink, style: ResolvedLinkStyle): { x: number; y: number } {
  const source: GraphNode = link.source as GraphNode;
  const target: GraphNode = link.target as GraphNode;

  const sourceX: number = source.x ?? 0;
  const sourceY: number = source.y ?? 0;
  const targetX: number = target.x ?? 0;
  const targetY: number = target.y ?? 0;

  const dx: number = targetX - sourceX;
  const dy: number = targetY - sourceY;

  const distance: number = Math.sqrt(dx * dx + dy * dy) || 1;
  const targetRadius: number = target.style?.radius ?? 12;

  const arrowLength: number = style.arrow.enabled ? style.arrow.size * 2 : 0;
  const strokeCompensation: number = style.strokeWidth / 2;
  const visualSpacing: number = 2;
  const offset: number = targetRadius + arrowLength + strokeCompensation + visualSpacing;

  return {
    x: targetX - (dx / distance) * offset,
    y: targetY - (dy / distance) * offset,
  };
}