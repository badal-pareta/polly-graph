// /**
//  * V2 Canvas Graph - V1 API Wrapper (Modular Version)
//  *
//  * Provides V1 API compatibility for the modular V2 implementation
//  */

// import { GraphConfig, GraphInstance, GraphNode, V2Config, V2Node, V2Link } from './types';
// import { ErrorHandler } from './utils';
// import { createV2Graph } from './v2-graph';

// /**
//  * Create V1-compatible graph using modular V2 implementation
//  */
// export function createGraph(config: GraphConfig): GraphInstance {
//   try {
//     // Convert V1 config to V2 config
//     const v2Config: V2Config = {
//       container: config.container,
//       nodes: config.nodes as V2Node[],
//       links: config.links as V2Link[],
//       width: config.width,
//       height: config.height,
//       backgroundColor: config.backgroundColor
//     };

//     // Create V2 instance using modular implementation
//     const v2Instance = createV2Graph(v2Config);

//     // Event handlers storage
//     const eventHandlers = new Map<string, Set<(...args: any[]) => void>>();

//     // Helper to emit events
//     const emitEvent = (event: string, ...args: any[]) => {
//       const handlers = eventHandlers.get(event);
//       if (handlers) {
//         handlers.forEach(handler => {
//           try {
//             handler(...args);
//           } catch (error) {
//             ErrorHandler.logError(error as Error, {
//               event,
//               handlerCount: handlers.size
//             });
//           }
//         });
//       }
//     };

//     // Create V1-compatible API
//     const graphInstance: GraphInstance = {
//       render() {
//         try {
//           v2Instance.render();
//         } catch (error) {
//           ErrorHandler.logError(error as Error);
//           throw error;
//         }
//       },

//       zoomIn() {
//         try {
//           const zoomBehavior = v2Instance.getZoomBehavior();
//           const canvas = v2Instance.getCanvas();

//           if (canvas && zoomBehavior) {
//             const rect = canvas.getBoundingClientRect();
//             const centerX = rect.width / 2;
//             const centerY = rect.height / 2;

//             // Use the V2Graph's zoomIn method if available
//             if ('zoomIn' in v2Instance) {
//               (v2Instance as any).zoomIn(1.5, [centerX, centerY]);
//             }
//           }
//         } catch (error) {
//           ErrorHandler.logError(error as Error);
//         }
//       },

//       zoomOut() {
//         try {
//           const zoomBehavior = v2Instance.getZoomBehavior();
//           const canvas = v2Instance.getCanvas();

//           if (canvas && zoomBehavior) {
//             const rect = canvas.getBoundingClientRect();
//             const centerX = rect.width / 2;
//             const centerY = rect.height / 2;

//             // Use the V2Graph's zoomOut method if available
//             if ('zoomOut' in v2Instance) {
//               (v2Instance as any).zoomOut(1.5, [centerX, centerY]);
//             }
//           }
//         } catch (error) {
//           ErrorHandler.logError(error as Error);
//         }
//       },

//       resetView() {
//         try {
//           // Use the V2Graph's resetView method if available
//           if ('resetView' in v2Instance) {
//             (v2Instance as any).resetView();
//           }
//         } catch (error) {
//           ErrorHandler.logError(error as Error);
//         }
//       },

//       fitView() {
//         try {
//           // Use the V2Graph's fitView method if available
//           if ('fitView' in v2Instance) {
//             v2Instance.fitView();
//           } else {
//             this.resetView();
//           }
//         } catch (error) {
//           ErrorHandler.logError(error as Error);
//           this.resetView(); // Fallback
//         }
//       },

//       destroy() {
//         try {
//           v2Instance.destroy();
//           eventHandlers.clear();
//         } catch (error) {
//           ErrorHandler.logError(error as Error);
//         }
//       },

//       exportGraph(fileName?: string) {
//         try {
//           const canvas = v2Instance.getCanvas();
//           if (canvas) {
//             const link = document.createElement('a');
//             link.download = fileName || 'graph.png';
//             link.href = canvas.toDataURL('image/png');
//             link.click();
//           }
//         } catch (error) {
//           ErrorHandler.logError(error as Error, { fileName });
//         }
//       },

//       clearSelection() {
//         // No-op for now - could be enhanced with selection tracking
//         // Future: emit clearSelection events
//       },

//       on(event: string, handler: (...args: any[]) => void): () => void {
//         try {
//           if (typeof handler !== 'function') {
//             throw new Error('Event handler must be a function');
//           }

//           if (!eventHandlers.has(event)) {
//             eventHandlers.set(event, new Set());
//           }
//           eventHandlers.get(event)!.add(handler);

//           // Return unsubscribe function
//           return () => {
//             const handlers = eventHandlers.get(event);
//             if (handlers) {
//               handlers.delete(handler);
//             }
//           };
//         } catch (error) {
//           ErrorHandler.logError(error as Error, { event });
//           return () => {}; // Return no-op unsubscribe
//         }
//       },

//       off(event: string, handler: (...args: any[]) => void) {
//         try {
//           const handlers = eventHandlers.get(event);
//           if (handlers) {
//             handlers.delete(handler);
//           }
//         } catch (error) {
//           ErrorHandler.logError(error as Error, { event });
//         }
//       },

//       // Test methods for demo compatibility
//       testHitDetection(x: number, y: number): GraphNode | null {
//         try {
//           return v2Instance.testHitDetection(x, y) as GraphNode | null;
//         } catch (error) {
//           ErrorHandler.logError(error as Error, { x, y });
//           return null;
//         }
//       },

//       testZoom(): { scale: number; x: number; y: number } {
//         try {
//           return v2Instance.testZoom();
//         } catch (error) {
//           ErrorHandler.logError(error as Error);
//           return { scale: 1, x: 0, y: 0 };
//         }
//       },



//     };

//     return graphInstance;

//   } catch (error) {
//     ErrorHandler.logError(error as Error, {
//       nodeCount: config.nodes?.length,
//       linkCount: config.links?.length,
//       containerTag: config.container?.tagName
//     });
//     throw error;
//   }
// }