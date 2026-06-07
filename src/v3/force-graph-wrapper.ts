// /**
//  * V3 Force-Graph Wrapper
//  *
//  * Wraps the force-graph library to provide V1-compatible API
//  * while leveraging canvas-based rendering for better performance.
//  */

// import ForceGraph from 'force-graph';
// import type { GraphConfig } from '../shared/contracts/graph-config.interface';
// import type { GraphNode, GraphLink } from '../shared/contracts/graph.types';
// import type { GraphInstance } from './types/force-graph-instance.interface';

// /**
//  * Event emitter for V1-compatible events
//  */
// class GraphEventEmitter {
//   private listeners: Map<string, Function[]> = new Map();

//   on(event: string, handler: Function): () => void {
//     if (!this.listeners.has(event)) {
//       this.listeners.set(event, []);
//     }
//     this.listeners.get(event)!.push(handler);

//     // Return unsubscribe function
//     return () => {
//       const handlers = this.listeners.get(event);
//       if (handlers) {
//         const index = handlers.indexOf(handler);
//         if (index > -1) {
//           handlers.splice(index, 1);
//         }
//       }
//     };
//   }

//   off(event: string, handler?: Function): void {
//     if (handler) {
//       const handlers = this.listeners.get(event);
//       if (handlers) {
//         const index = handlers.indexOf(handler);
//         if (index > -1) {
//           handlers.splice(index, 1);
//         }
//       }
//     } else {
//       this.listeners.delete(event);
//     }
//   }

//   emit(event: string, ...args: any[]): void {
//     const handlers = this.listeners.get(event);
//     if (handlers) {
//       handlers.forEach(handler => handler(...args));
//     }
//   }
// }

// /**
//  * Type adapters to convert V1 types to force-graph compatible types
//  */
// function adaptV1NodeToForceGraph(node: GraphNode) {
//   return {
//     id: node.id,
//     name: node.label || node.id,
//     val: node.style?.radius ? Math.PI * node.style.radius * node.style.radius : 1,
//     color: node.style?.fill || '#1f77b4',
//     // Handle null values for force-graph compatibility
//     x: node.x,
//     y: node.y,
//     vx: node.vx,
//     vy: node.vy,
//     fx: node.fx === null ? undefined : node.fx,
//     fy: node.fy === null ? undefined : node.fy,
//     index: node.index,
//     // Keep V1 specific properties for event handlers
//     type: node.type,
//     label: node.label,
//     tooltip: node.tooltip,
//     style: node.style
//   };
// }

// function adaptV1LinkToForceGraph(link: GraphLink) {
//   return {
//     source: typeof link.source === 'string' ? link.source : link.source.id,
//     target: typeof link.target === 'string' ? link.target : link.target.id,
//     name: link.label,
//     color: link.style?.stroke || '#999',
//     width: link.style?.strokeWidth || 1,
//     // Keep V1 specific properties for event handlers
//     label: link.label,
//     tooltip: link.tooltip,
//     style: link.style
//   };
// }

// /**
//  * Creates a V1-compatible graph using force-graph library
//  */
// export function createGraph(config: GraphConfig): GraphInstance {
//   const eventEmitter = new GraphEventEmitter();
//   let selectedNodes = new Set<string>();
//   let selectedLinks = new Set<string>();

//   // Adapt V1 data to force-graph format
//   const adaptedNodes = config.nodes.map(adaptV1NodeToForceGraph);
//   const adaptedLinks = config.links.map(adaptV1LinkToForceGraph);

//   // Create force-graph instance (following the working example pattern)
//   const graph = new ForceGraph(config.container as HTMLElement);

//   // Configure graph data and dimensions
//   graph
//     .graphData({ nodes: adaptedNodes, links: adaptedLinks })
//     .width((config.container as HTMLElement).clientWidth)
//     .height((config.container as HTMLElement).clientHeight);

//   // Configure simulation with better spacing
//   graph
//     .cooldownTime(5000) // Let simulation run longer for visibility
//     .d3AlphaDecay(0.02) // Slower cooling for more movement
//     .d3VelocityDecay(0.4) // Default velocity decay
//     .nodeRelSize(6) // Increase base node size for better visibility
//     .onEngineStop(() => {
//       // Auto fit view when simulation stops
//       graph.zoomToFit(400);
//     });

//   // Modify the default forces for better spacing
//   // Get and modify the charge force
//   const chargeForce = graph.d3Force('charge');
//   if (chargeForce && typeof chargeForce === 'object' && 'strength' in chargeForce) {
//     (chargeForce as any).strength(-400); // Stronger repulsion
//   }

//   // Get and modify the link force
//   const linkForce = graph.d3Force('link');
//   if (linkForce && typeof linkForce === 'object' && 'distance' in linkForce) {
//     (linkForce as any).distance(100).strength(0.5); // Longer links
//   }

//   // Configure node appearance
//   graph
//     .nodeVal((node: any) => node.val || 4) // Node size
//     .nodeColor((node: any) => node.color || '#1f77b4') // Node color
//     .nodeLabel((node: any) => node.tooltip || node.label || node.name || node.id); // Hover tooltip

//   // Configure node canvas rendering - render labels AFTER default nodes (like reference)
//   graph
//     .nodeCanvasObjectMode(() => 'after')
//     .nodeCanvasObject((node, ctx) => {
//       const nodeData = node as any;
//       const label = nodeData.label || nodeData.name || nodeData.id;

//       if (!label) return;
//       if (typeof nodeData.x !== 'number' || typeof nodeData.y !== 'number') return;

//       // Use same font styling as reference
//       ctx.font = `1.7px Sans-Serif`;
//       ctx.fillStyle = nodeData.style?.textColor || 'black';
//       ctx.textAlign = 'center';
//       ctx.textBaseline = 'middle';
//       ctx.fillText(label, nodeData.x, nodeData.y);
//     });

//   // Configure link styling using property access patterns
//   graph
//     .linkLabel('name') // Use property name
//     .linkColor((link) => {
//       const linkWithProps = link as ReturnType<typeof adaptV1LinkToForceGraph>;
//       const sourceId = typeof linkWithProps.source === 'string' ? linkWithProps.source : String(linkWithProps.source);
//       const targetId = typeof linkWithProps.target === 'string' ? linkWithProps.target : String(linkWithProps.target);
//       const linkId = `${sourceId}-${targetId}`;
//       if (selectedLinks.has(linkId)) {
//         return linkWithProps.color || '#ff6b6b'; // Highlight selected links
//       }
//       return linkWithProps.color || '#999';
//     })
//     .linkWidth('width'); // Use property name

//   // Handle node interactions using reference patterns
//   graph.onNodeClick((node, event: MouseEvent) => {
//     const nodeWithProps = node as ReturnType<typeof adaptV1NodeToForceGraph>;
//     const nodeId = nodeWithProps.id || '';
//     const wasSelected = selectedNodes.has(nodeId);

//     if (!config.interaction?.selection?.multiSelect) {
//       // Clear other selections in single mode
//       const previouslySelected = Array.from(selectedNodes);
//       selectedNodes.clear();

//       // Emit deselect events for previously selected nodes
//       previouslySelected.forEach(prevNodeId => {
//         const prevNode = adaptedNodes.find(n => n.id === prevNodeId);
//         if (prevNode && prevNodeId !== nodeId) {
//           eventEmitter.emit('nodeDeselect', prevNode, event.target as Element);
//         }
//       });
//     }

//     if (wasSelected) {
//       selectedNodes.delete(nodeId);
//       eventEmitter.emit('nodeDeselect', nodeWithProps, event.target as Element);
//     } else {
//       selectedNodes.add(nodeId);
//       eventEmitter.emit('nodeSelect', nodeWithProps, event.target as Element);
//     }

//     // Refresh graph to update visual selection state
//     graph.graphData(graph.graphData());
//   });

//   // Handle link interactions using reference patterns
//   graph.onLinkClick((link, event: MouseEvent) => {
//     const linkWithProps = link as ReturnType<typeof adaptV1LinkToForceGraph>;
//     const sourceId = typeof linkWithProps.source === 'string' ? linkWithProps.source : String(linkWithProps.source);
//     const targetId = typeof linkWithProps.target === 'string' ? linkWithProps.target : String(linkWithProps.target);
//     const linkId = `${sourceId}-${targetId}`;
//     const wasSelected = selectedLinks.has(linkId);

//     if (!config.interaction?.selection?.multiSelect) {
//       // Clear other selections in single mode
//       const previouslySelected = Array.from(selectedLinks);
//       selectedLinks.clear();

//       // Emit deselect events for previously selected links
//       previouslySelected.forEach(prevLinkId => {
//         const prevLink = adaptedLinks.find(l => {
//           const prevSourceId = typeof l.source === 'string' ? l.source : String(l.source);
//           const prevTargetId = typeof l.target === 'string' ? l.target : String(l.target);
//           return `${prevSourceId}-${prevTargetId}` === prevLinkId;
//         });
//         if (prevLink && prevLinkId !== linkId) {
//           eventEmitter.emit('linkDeselect', prevLink, event.target as Element);
//         }
//       });
//     }

//     if (wasSelected) {
//       selectedLinks.delete(linkId);
//       eventEmitter.emit('linkDeselect', linkWithProps, event.target as Element);
//     } else {
//       selectedLinks.add(linkId);
//       eventEmitter.emit('linkSelect', linkWithProps, event.target as Element);
//     }

//     // Refresh graph to update visual selection state
//     graph.graphData(graph.graphData());
//   });

//   // Configure drag behavior
//   if (config.interaction?.drag?.enabled !== false) {
//     graph.enableNodeDrag(true);
//   }

//   // Configure zoom and pan behavior
//   graph.enableZoomInteraction(true);
//   graph.enablePanInteraction(true);

//   // Handle background clicks for deselection
//   graph.onBackgroundClick(() => {
//     if (config.interaction?.selection?.enabled) {
//       clearSelection();
//     }
//   });

//   function render(): void {
//     // Force-graph renders automatically, just ensure simulation is running
//     graph.d3ReheatSimulation();
//   }

//   function zoomIn(): void {
//     const currentZoom = graph.zoom();
//     graph.zoom(currentZoom * 1.5, 400);
//   }

//   function zoomOut(): void {
//     const currentZoom = graph.zoom();
//     graph.zoom(currentZoom / 1.5, 400);
//   }

//   function resetView(): void {
//     graph.zoom(1, 400);
//     graph.centerAt(0, 0, 400);
//   }

//   function fitView(): void {
//     graph.zoomToFit(750, 40);
//   }

//   function destroy(): void {
//     // Clear selections and event listeners
//     selectedNodes.clear();
//     selectedLinks.clear();
//     eventEmitter.off('nodeSelect');
//     eventEmitter.off('nodeDeselect');
//     eventEmitter.off('linkSelect');
//     eventEmitter.off('linkDeselect');

//     // Force-graph cleanup handled automatically when container is removed
//   }

//   function exportGraph(fileName?: string): void {
//     // Get canvas element from force-graph
//     const canvas = config.container.querySelector('canvas') as HTMLCanvasElement;
//     if (canvas) {
//       const link = document.createElement('a');
//       link.download = fileName || 'polly-graph-export.png';
//       link.href = canvas.toDataURL();
//       link.click();
//     } else {
//       console.warn('[Polly Graph V3] Cannot export: canvas not found');
//     }
//   }

//   function clearSelection(): void {
//     const prevSelectedNodes = Array.from(selectedNodes);
//     const prevSelectedLinks = Array.from(selectedLinks);

//     selectedNodes.clear();
//     selectedLinks.clear();

//     // Emit deselect events
//     prevSelectedNodes.forEach(nodeId => {
//       const node = adaptedNodes.find(n => n.id === nodeId);
//       if (node) {
//         eventEmitter.emit('nodeDeselect', node, null);
//       }
//     });

//     prevSelectedLinks.forEach(linkId => {
//       const link = adaptedLinks.find(l =>
//         `${l.source}-${l.target}` === linkId
//       );
//       if (link) {
//         eventEmitter.emit('linkDeselect', link, null);
//       }
//     });

//     // Refresh graph to update visual selection state
//     graph.graphData(graph.graphData());
//   }

//   // Event system methods
//   function on(event: string, handler: Function): () => void {
//     return eventEmitter.on(event, handler);
//   }

//   function off(event: string, handler?: Function): void {
//     eventEmitter.off(event, handler);
//   }

//   return {
//     render,
//     zoomIn,
//     zoomOut,
//     resetView,
//     fitView,
//     destroy,
//     exportGraph,
//     clearSelection,
//     on: on as GraphInstance['on'],
//     off: off as GraphInstance['off']
//   };
// }