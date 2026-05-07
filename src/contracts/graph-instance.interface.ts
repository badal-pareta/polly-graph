import { GraphNode, GraphLink } from './graph.types';

export interface GraphInstance {
  render(): void;
  zoomIn(): void;
  zoomOut(): void;
  resetView(): void;
  fitView(): void;
  destroy(): void;
  exportGraph(fileName?: string): void;
  on(event: 'nodeSelect', handler: (node: GraphNode, element: SVGCircleElement) => void): () => void;
  on(event: 'linkSelect', handler: (link: GraphLink, element: SVGLineElement) => void): () => void;
  off(event: 'nodeSelect', handler: (node: GraphNode, element: SVGCircleElement) => void): void;
  off(event: 'linkSelect', handler: (link: GraphLink, element: SVGLineElement) => void): void;
}