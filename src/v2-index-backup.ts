// /**
//  * V2 Canvas Graph - High-Performance Canvas Implementation
//  *
//  * This file contains the monolithic implementation for reference.
//  * For production use, import from /modular/ instead.
//  *
//  * Features:
//  * - Canvas-based rendering for high performance
//  * - D3 force simulation with physics
//  * - Exact force-graph behavior patterns
//  * - Full V1 API compatibility
//  * - Zoom/pan/drag interactions
//  * - Shadow canvas hit detection
//  */

// import { zoom as d3Zoom, zoomTransform as d3ZoomTransform, zoomIdentity } from 'd3-zoom';
// import { select as d3Select } from 'd3-selection';
// import { drag as d3Drag } from 'd3-drag';
// import { sum as d3Sum } from 'd3-array';
// import {
//   forceSimulation as d3ForceSimulation,
//   forceLink as d3ForceLink,
//   forceManyBody as d3ForceManyBody,
//   forceCenter as d3ForceCenter,
//   SimulationNodeDatum,
//   SimulationLinkDatum
// } from 'd3-force';

// export interface V2Node extends SimulationNodeDatum {
//   id: string;
//   x?: number;
//   y?: number;
//   fx?: number | null;
//   fy?: number | null;
//   vx?: number;
//   vy?: number;
// }

// export interface V2Link extends SimulationLinkDatum<V2Node> {
//   source: string | V2Node;
//   target: string | V2Node;
// }

// export interface V2Config {
//   container: HTMLElement;
//   nodes: V2Node[];
//   links: V2Link[];
//   width?: number;
//   height?: number;
//   backgroundColor?: string;
// }

// export interface V2Instance {
//   render(): void;
//   destroy(): void;
//   testHitDetection(x: number, y: number): V2Node | null;
//   testZoom(): { scale: number; x: number; y: number };
//   // Expose zoom behavior for V1 wrapper
//   getZoomBehavior(): any;
//   getCanvas(): HTMLCanvasElement;
// }

// // V1 API compatibility interfaces
// export interface GraphNode {
//   id: string;
//   type: string;
//   label?: string;
//   tooltip?: string;
//   x?: number;
//   y?: number;
//   fx?: number | null;
//   fy?: number | null;
//   vx?: number;
//   vy?: number;
// }

// export interface GraphLink {
//   source: string | GraphNode;
//   target: string | GraphNode;
//   label?: string;
//   tooltip?: string;
// }

// export interface GraphConfig {
//   container: HTMLElement;
//   nodes: GraphNode[];
//   links: GraphLink[];
//   width?: number;
//   height?: number;
//   backgroundColor?: string;
// }

// export interface GraphInstance {
//   render(): void;
//   zoomIn(): void;
//   zoomOut(): void;
//   resetView(): void;
//   fitView(): void;
//   destroy(): void;
//   exportGraph(fileName?: string): void;
//   clearSelection(): void;
//   on(event: string, handler: (...args: any[]) => void): () => void;
//   off(event: string, handler: (...args: any[]) => void): void;
//   // Test methods for demo compatibility
//   testHitDetection?(x: number, y: number): GraphNode | null;
//   testZoom?(): { scale: number; x: number; y: number };
// }

// // Simple color tracker implementation (like force-graph's canvas-color-tracker)
// class ColorTracker {
//   private colorMap = new Map<string, any>();
//   private colorIndex = 1; // Start from 1 (0 is background)

//   register(obj: any): Uint8Array {
//     // Convert index to RGB color (24-bit color space)
//     const r = (this.colorIndex >> 16) & 0xFF;
//     const g = (this.colorIndex >> 8) & 0xFF;
//     const b = this.colorIndex & 0xFF;

//     const key = `${r},${g},${b}`;
//     this.colorMap.set(key, obj);

//     this.colorIndex++;
//     return new Uint8Array([r, g, b, 255]);
//   }

//   lookup(colorData: Uint8Array): any {
//     if (!colorData || colorData.length < 3) return null;

//     const [r, g, b] = colorData;
//     const key = `${r},${g},${b}`;
//     return this.colorMap.get(key) || null;
//   }
// }

// /**
//  * Create V2 Canvas Graph - Step 3: Shadow Canvas + Hit Detection
//  */
// export function createV2Graph(config: V2Config): V2Instance {
//   const { container, nodes, links } = config;

//   // Get container dimensions
//   const containerRect = container.getBoundingClientRect();
//   const width = config.width || containerRect.width || 800;
//   const height = config.height || containerRect.height || 600;

//   // Create main canvas exactly like force-graph
//   const canvas = document.createElement('canvas');
//   if (config.backgroundColor) {
//     canvas.style.background = config.backgroundColor;
//   }
//   container.appendChild(canvas);

//   // Create shadow canvas exactly like force-graph
//   const shadowCanvas = document.createElement('canvas');
//   // Note: force-graph doesn't append shadow canvas to DOM (it's hidden)

//   // Get 2D contexts
//   const ctx = canvas.getContext('2d')!;
//   const shadowCtx = shadowCanvas.getContext('2d', { willReadFrequently: true })!;

//   // Set canvas dimensions for both canvases
//   const pxScale = window.devicePixelRatio || 1;

//   [canvas, shadowCanvas].forEach(cnv => {
//     cnv.width = width * pxScale;
//     cnv.height = height * pxScale;
//     cnv.style.width = `${width}px`;
//     cnv.style.height = `${height}px`;
//   });

//   ctx.scale(pxScale, pxScale);
//   shadowCtx.scale(pxScale, pxScale);

//   // Color tracker for hit detection
//   const colorTracker = new ColorTracker();

//   // Pointer position tracking (force-graph pattern)
//   const pointerPos = { x: -1e12, y: -1e12 };

//   // Hit detection function exactly like force-graph
//   const getObjUnderPointer = () => {
//     let obj = null;
//     const pxScale = window.devicePixelRatio;
//     const px = (pointerPos.x > 0 && pointerPos.y > 0)
//       ? shadowCtx.getImageData(pointerPos.x * pxScale, pointerPos.y * pxScale, 1, 1)
//       : null;
//     // Lookup object per pixel color
//     px && (obj = colorTracker.lookup(new Uint8Array(px.data)));
//     return obj;
//   };

//   // Reset transform function exactly like force-graph
//   function resetTransform(ctx: CanvasRenderingContext2D) {
//     const pxRatio = window.devicePixelRatio;
//     ctx.setTransform(pxRatio, 0, 0, pxRatio, 0, 0);
//   }

//   // Force-graph getOffset function
//   function getOffset(el: HTMLElement) {
//     const rect = el.getBoundingClientRect(),
//       scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
//       scrollTop = window.pageYOffset || document.documentElement.scrollTop;
//     return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
//   }

//   // Setup pointer position tracking exactly like force-graph
//   ['pointermove', 'pointerdown'].forEach(evType =>
//     container.addEventListener(evType, (ev) => {
//       const pointerEvent = ev as PointerEvent;
//       // Update the pointer pos using force-graph coordinates
//       const offset = getOffset(container);
//       pointerPos.x = pointerEvent.pageX - offset.left;
//       pointerPos.y = pointerEvent.pageY - offset.top;
//     }, { passive: true })
//   );

//   const DRAG_CLICK_TOLERANCE_PX = 3; // Force-graph constant

//   // Setup node drag interaction exactly like force-graph (BEFORE zoom)
//   d3Select(canvas).call(
//     d3Drag<HTMLCanvasElement, unknown>()
//       .subject(() => {
//         const obj = getObjUnderPointer();
//         return (obj && obj.type === 'Node') ? obj.d : null; // Only drag nodes
//       })
//       .on('start', (ev) => {
//         const obj = ev.subject as any;
//         if (!obj) return; // No node to drag

//         obj.__initialDragPos = {
//           x: obj.x,
//           y: obj.y,
//           fx: obj.fx,
//           fy: obj.fy
//         };

//         // keep engine running at low intensity throughout drag (force-graph pattern)
//         if (!ev.active) {
//           simulation.alphaTarget(0.3).restart(); // reheat simulation
//           obj.fx = obj.x; obj.fy = obj.y; // Fix points
//         }

//         // drag cursor
//         canvas.classList.add('grabbable');
//       })
//       .on('drag', (ev) => {
//         const obj = ev.subject as any;
//         if (!obj) return; // No node to drag

//         const initPos = obj.__initialDragPos;
//         const dragPos = ev;

//         const k = d3ZoomTransform(canvas).k;

//         // Move fx/fy (and x/y) of nodes based on the scaled drag distance since the drag start
//         obj.fx = obj.x = initPos.x + (dragPos.x - initPos.x) / k;
//         obj.fy = obj.y = initPos.y + (dragPos.y - initPos.y) / k;

//         // Only engage full drag if distance reaches above threshold
//         if (!obj.__dragged && (DRAG_CLICK_TOLERANCE_PX >= Math.sqrt(d3Sum([
//           (ev.x - initPos.x)**2,
//           (ev.y - initPos.y)**2
//         ])))) return;

//         // Mark as being dragged (force-graph pattern - only after threshold)
//         isNodeDragging = true;
//         obj.__dragged = true;

//         // Re-render during drag
//         renderWithCurrentTransform();
//       })
//       .on('end', (ev) => {
//         const obj = ev.subject as any;
//         if (!obj) return; // No node was being dragged

//         const initPos = obj.__initialDragPos;

//         // Cool down simulation after drag (force-graph pattern)
//         if (!ev.active) {
//           simulation.alphaTarget(0);
//         }

//         if (initPos.fx === undefined) { obj.fx = undefined; }
//         if (initPos.fy === undefined) { obj.fy = undefined; }
//         delete obj.__initialDragPos;

//         canvas.classList.remove('grabbable');

//         // Reset dragging state (force-graph pattern)
//         isNodeDragging = false;

//         if (obj.__dragged) {
//           delete obj.__dragged;
//           // Final render after drag
//           renderWithCurrentTransform();
//         }
//       })
//   );

//   // Setup zoom behavior exactly like force-graph (AFTER drag)
//   const zoom = d3Zoom<HTMLCanvasElement, unknown>();
//   const zoomBaseElem = d3Select(canvas);

//   zoom(zoomBaseElem); // Attach to canvas
//   zoomBaseElem.on('dblclick.zoom', null); // Disable double-click to zoom

//   zoom
//     .scaleExtent([0.01, 1000]) // Same as force-graph default
//     .filter((ev) => {
//       // Exact force-graph filter - no drag state checking here
//       return !ev.button;
//     })
//     .on('zoom', (ev) => {
//       const t = ev.transform;
//       // Apply transform to both main and shadow canvas
//       [ctx, shadowCtx].forEach(c => {
//         resetTransform(c);
//         c.translate(t.x, t.y);
//         c.scale(t.k, t.k);
//       });
//       // Re-render with new transform
//       renderWithCurrentTransform();
//     });

//   // Setup D3 force simulation exactly like force-graph
//   const simulation = d3ForceSimulation<V2Node>(nodes)
//     .force('link', d3ForceLink<V2Node, V2Link>(links).id((d: V2Node) => d.id))
//     .force('charge', d3ForceManyBody())
//     .force('center', d3ForceCenter(width / 2, height / 2))
//     .on('tick', () => {
//       // Re-render on each simulation tick
//       renderWithCurrentTransform();
//     });

//   // Initialize node positions once
//   function initializePositions(): void {
//     for (const node of nodes) {
//       if (!node.x || !node.y) {
//         node.x = Math.random() * width;
//         node.y = Math.random() * height;
//       }
//     }
//   }

//   function renderWithCurrentTransform(): void {
//     // Clear both canvases with reset transform first (like force-graph)
//     [ctx, shadowCtx].forEach(c => {
//       resetTransform(c);
//       c.clearRect(0, 0, width, height);
//     });

//     // Get current zoom transform and reapply
//     const t = d3ZoomTransform(canvas);
//     [ctx, shadowCtx].forEach(c => {
//       resetTransform(c);
//       c.translate(t.x, t.y);
//       c.scale(t.k, t.k);
//     });

//     // Render links first (behind nodes)
//     ctx.strokeStyle = '#999';
//     ctx.lineWidth = 1;
//     for (const link of links) {
//       const sourceNode = typeof link.source === 'string'
//         ? nodes.find(n => n.id === link.source)
//         : link.source;
//       const targetNode = typeof link.target === 'string'
//         ? nodes.find(n => n.id === link.target)
//         : link.target;

//       if (sourceNode && targetNode && sourceNode.x && sourceNode.y && targetNode.x && targetNode.y) {
//         ctx.beginPath();
//         ctx.moveTo(sourceNode.x, sourceNode.y);
//         ctx.lineTo(targetNode.x, targetNode.y);
//         ctx.stroke();
//       }
//     }

//     // Render nodes to both main and shadow canvas
//     ctx.fillStyle = '#1f77b4';

//     for (const node of nodes) {
//       const x = node.x!;
//       const y = node.y!;

//       // Render to main canvas (visible)
//       ctx.beginPath();
//       ctx.arc(x, y, 5, 0, 2 * Math.PI);
//       ctx.fill();

//       // Render to shadow canvas with unique color for hit detection
//       const nodeColor = colorTracker.register({ type: 'Node', d: node });
//       const [r, g, b] = nodeColor;
//       shadowCtx.fillStyle = `rgb(${r},${g},${b})`;
//       shadowCtx.beginPath();
//       shadowCtx.arc(x, y, 5, 0, 2 * Math.PI);
//       shadowCtx.fill();
//     }
//   }

//   function render(): void {
//     // Initialize positions on first render
//     initializePositions();

//     // Reset both canvases to default transform and render
//     [ctx, shadowCtx].forEach(c => resetTransform(c));
//     renderWithCurrentTransform();
//   }

//   function destroy(): void {
//     container.removeChild(canvas);
//   }

//   function testHitDetection(x: number, y: number): V2Node | null {
//     // Update pointer position for testing
//     pointerPos.x = x;
//     pointerPos.y = y;

//     // Get object under pointer
//     const obj = getObjUnderPointer();
//     return (obj && obj.type === 'Node') ? obj.d : null;
//   }

//   function testZoom(): { scale: number; x: number; y: number } {
//     const transform = d3ZoomTransform(canvas);
//     return {
//       scale: transform.k,
//       x: transform.x,
//       y: transform.y
//     };
//   }

//   return {
//     render,
//     destroy,
//     testHitDetection,
//     testZoom,
//     getZoomBehavior: () => zoom,
//     getCanvas: () => canvas
//   };
// }

// /**
//  * Create Graph - V1 API Compatible Wrapper for V2 Canvas Implementation
//  * This provides the same API as the existing polly-graph library
//  */
// export function createGraph(config: GraphConfig): GraphInstance {
//   // Convert V1 config to V2 config
//   const v2Config: V2Config = {
//     container: config.container,
//     nodes: config.nodes as V2Node[],
//     links: config.links as V2Link[],
//     width: config.width,
//     height: config.height,
//     backgroundColor: config.backgroundColor
//   };

//   // Create V2 instance
//   const v2Instance = createV2Graph(v2Config);

//   // Get canvas and zoom behavior from V2 instance
//   const canvas = v2Instance.getCanvas();
//   const zoomBehavior = v2Instance.getZoomBehavior();

//   // Event handlers storage (simple implementation)
//   const eventHandlers = new Map<string, Set<(...args: any[]) => void>>();


//   // V1 compatible API
//   const graphInstance: GraphInstance = {
//     render() {
//       v2Instance.render();
//     },

//     zoomIn() {
//       if (canvas && zoomBehavior) {
//         const rect = canvas.getBoundingClientRect();
//         const centerX = rect.width / 2;
//         const centerY = rect.height / 2;

//         d3Select(canvas)
//           .transition()
//           .duration(300)
//           .call(zoomBehavior.scaleBy, 1.5, [centerX, centerY]);
//       }
//     },

//     zoomOut() {
//       if (canvas && zoomBehavior) {
//         const rect = canvas.getBoundingClientRect();
//         const centerX = rect.width / 2;
//         const centerY = rect.height / 2;

//         d3Select(canvas)
//           .transition()
//           .duration(300)
//           .call(zoomBehavior.scaleBy, 1 / 1.5, [centerX, centerY]);
//       }
//     },

//     resetView() {
//       if (canvas && zoomBehavior) {
//         d3Select(canvas).transition().duration(500).call(zoomBehavior.transform, zoomIdentity);
//       }
//     },

//     fitView() {
//       if (!canvas || !zoomBehavior || !config.nodes.length) {
//         this.resetView();
//         return;
//       }

//       // Force-graph zoomToFit implementation
//       const transitionDuration = 750;
//       const padding = 10;

//       // Calculate bounding box including node radii (force-graph pattern)
//       const nodeRadius = 4; // Default node radius
//       const nodesPos = config.nodes.map(node => ({
//         x: node.x || 0,
//         y: node.y || 0,
//         r: nodeRadius
//       }));

//       if (!nodesPos.length) {
//         this.resetView();
//         return;
//       }

//       const bbox = {
//         x: [
//           Math.min(...nodesPos.map(node => node.x - node.r)),
//           Math.max(...nodesPos.map(node => node.x + node.r))
//         ] as [number, number],
//         y: [
//           Math.min(...nodesPos.map(node => node.y - node.r)),
//           Math.max(...nodesPos.map(node => node.y + node.r))
//         ] as [number, number]
//       };

//       // Calculate center point (force-graph pattern)
//       const center = {
//         x: (bbox.x[0]! + bbox.x[1]!) / 2,
//         y: (bbox.y[0]! + bbox.y[1]!) / 2,
//       };

//       // Calculate zoom scale (force-graph pattern)
//       const canvasRect = canvas.getBoundingClientRect();
//       const dx = bbox.x[1]! - bbox.x[0]!;
//       const dy = bbox.y[1]! - bbox.y[0]!;
//       const zoomK = Math.max(1e-12, Math.min(1e12,
//         (canvasRect.width - padding * 2) / dx,
//         (canvasRect.height - padding * 2) / dy)
//       );

//       // Create transform (force-graph pattern)
//       const transform = zoomIdentity
//         .translate(canvasRect.width / 2, canvasRect.height / 2)
//         .scale(zoomK)
//         .translate(-center.x, -center.y);

//       // Apply transform with animation
//       d3Select(canvas)
//         .transition()
//         .duration(transitionDuration)
//         .call(zoomBehavior.transform, transform);
//     },

//     destroy() {
//       v2Instance.destroy();
//       eventHandlers.clear();
//     },

//     exportGraph(fileName?: string) {
//       // Simple canvas export
//       if (canvas) {
//         const link = document.createElement('a');
//         link.download = fileName || 'graph.png';
//         link.href = canvas.toDataURL();
//         link.click();
//       }
//     },

//     clearSelection() {
//       // No-op for now - could be enhanced with selection tracking
//     },

//     on(event: string, handler: (...args: any[]) => void): () => void {
//       if (!eventHandlers.has(event)) {
//         eventHandlers.set(event, new Set());
//       }
//       eventHandlers.get(event)!.add(handler);

//       // Return unsubscribe function
//       return () => {
//         const handlers = eventHandlers.get(event);
//         if (handlers) {
//           handlers.delete(handler);
//         }
//       };
//     },

//     off(event: string, handler: (...args: any[]) => void) {
//       const handlers = eventHandlers.get(event);
//       if (handlers) {
//         handlers.delete(handler);
//       }
//     },

//     // Add test methods for compatibility with demo
//     testHitDetection(x: number, y: number): GraphNode | null {
//       return v2Instance.testHitDetection(x, y) as GraphNode | null;
//     },

//     testZoom(): { scale: number; x: number; y: number } {
//       return v2Instance.testZoom();
//     }
//   };

//   return graphInstance;
// }