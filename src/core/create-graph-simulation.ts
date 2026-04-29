import { forceSimulation, forceManyBody, forceCenter, forceLink, forceCollide } from 'd3-force';
import { GraphLink, GraphNode } from '../contracts/graph.types';
import { SimulationConfig, SimulationResult } from '../contracts/simulation.interface';

export function createGraphSimulation(config: SimulationConfig): SimulationResult {
  const centerX: number = config.width / 2;
  const centerY: number = config.height / 2;
  const seedRadius: number = 80;
  config.nodes.forEach((node: GraphNode, index: number): void => {
    if (node.x == null || node.y == null) {
      const angle: number = (index / Math.max(config.nodes.length, 1)) * Math.PI *2;

      node.x = centerX + Math.cos(angle) * seedRadius;
      node.y = centerY + Math.sin(angle) * seedRadius;
    }
  });

  const simulation = forceSimulation<GraphNode>(config.nodes)
    .alpha(0.9)
    .alphaDecay(0.12)
    .alphaMin(0.03)
    .velocityDecay(0.5)
    .force('link', forceLink<GraphNode, GraphLink>(config.links)
      .id((d: GraphNode) => d.id)
      .distance(150)
      .strength(0.4)
    )
    .force('charge', forceManyBody().strength(-220))
    .force('collide', forceCollide<GraphNode>()
      .radius((node: GraphNode): number => (node.style?.radius ?? 12) + 10)
      .strength(0.9)
    )
    .force('center', forceCenter(centerX, centerY).strength(0.08));

  return { simulation };
}