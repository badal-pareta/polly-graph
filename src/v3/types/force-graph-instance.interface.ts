// import { GraphNode, GraphLink } from '../../shared/contracts/graph.types';

// /**
//  * V3 Graph Instance interface matching V1 API
//  */
// export interface GraphInstance {
//   render(): void;
//   zoomIn(): void;
//   zoomOut(): void;
//   resetView(): void;
//   fitView(): void;
//   destroy(): void;
//   exportGraph(fileName?: string): void;
//   clearSelection(): void;
//   on(event: 'nodeSelect', handler: (node: GraphNode, element: Element) => void): () => void;
//   on(event: 'nodeDeselect', handler: (node: GraphNode, element: Element) => void): () => void;
//   on(event: 'linkSelect', handler: (link: GraphLink, element: Element) => void): () => void;
//   on(event: 'linkDeselect', handler: (link: GraphLink, element: Element) => void): () => void;
//   off(event: 'nodeSelect', handler: (node: GraphNode, element: Element) => void): void;
//   off(event: 'nodeDeselect', handler: (node: GraphNode, element: Element) => void): void;
//   off(event: 'linkSelect', handler: (link: GraphLink, element: Element) => void): void;
//   off(event: 'linkDeselect', handler: (link: GraphLink, element: Element) => void): void;
// }