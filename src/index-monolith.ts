/**
 * V2 Canvas Graph - High-Performance Canvas Implementation (MONOLITH VERSION)
 *
 * This is the complete monolithic implementation for reference.
 * For production use, prefer the modular version in /src/v2/modular/
 *
 * Features:
 * - Canvas-based rendering for high performance
 * - D3 force simulation with physics
 * - Exact force-graph behavior patterns
 * - Full V1 API compatibility
 * - Zoom/pan/drag interactions
 * - Shadow canvas hit detection
 */

import { zoom as d3Zoom, zoomTransform as d3ZoomTransform, zoomIdentity } from 'd3-zoom';
import { select as d3Select } from 'd3-selection';
import { drag as d3Drag } from 'd3-drag';
import { sum as d3Sum } from 'd3-array';
import {
  forceSimulation as d3ForceSimulation,
  forceLink as d3ForceLink,
  forceManyBody as d3ForceManyBody,
  forceCenter as d3ForceCenter,
  SimulationNodeDatum,
  SimulationLinkDatum
} from 'd3-force';

export interface V2Node extends SimulationNodeDatum {
  id: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface V2Link extends SimulationLinkDatum<V2Node> {
  source: string | V2Node;
  target: string | V2Node;
}

export interface V2Config {
  container: HTMLElement;
  nodes: V2Node[];
  links: V2Link[];
  width?: number;
  height?: number;
  backgroundColor?: string;
}

export interface V2Instance {
  render(): void;
  destroy(): void;
  testHitDetection(x: number, y: number): V2Node | null;
  testZoom(): { scale: number; x: number; y: number };
  getZoomBehavior(): any;
  getCanvas(): HTMLCanvasElement;
}

// V1 API compatibility interfaces
export interface GraphNode {
  id: string;
  type: string;
  label?: string;
  tooltip?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  label?: string;
  tooltip?: string;
}

export interface GraphConfig {
  container: HTMLElement;
  nodes: GraphNode[];
  links: GraphLink[];
  width?: number;
  height?: number;
  backgroundColor?: string;
}

export interface GraphInstance {
  render(): void;
  zoomIn(): void;
  zoomOut(): void;
  resetView(): void;
  fitView(): void;
  destroy(): void;
  exportGraph(fileName?: string): void;
  clearSelection(): void;
  on(event: string, handler: (...args: any[]) => void): () => void;
  off(event: string, handler: (...args: any[]) => void): void;
  testHitDetection?(x: number, y: number): GraphNode | null;
  testZoom?(): { scale: number; x: number; y: number };
}

class ColorTracker {
  private colorMap = new Map<string, any>();
  private colorIndex = 1;

  register(obj: any): Uint8Array {
    const r = (this.colorIndex >> 16) & 0xFF;
    const g = (this.colorIndex >> 8) & 0xFF;
    const b = this.colorIndex & 0xFF;

    const key = `${r},${g},${b}`;
    this.colorMap.set(key, obj);

    this.colorIndex++;
    return new Uint8Array([r, g, b, 255]);
  }

  lookup(colorData: Uint8Array): any {
    if (!colorData || colorData.length < 3) return null;

    const [r, g, b] = colorData;
    const key = `${r},${g},${b}`;
    return this.colorMap.get(key) || null;
  }
}

export function createV2Graph(config: V2Config): V2Instance {
  const { container, nodes, links } = config;

  const containerRect = container.getBoundingClientRect();
  const width = config.width || containerRect.width || 800;
  const height = config.height || containerRect.height || 600;

  const canvas = document.createElement('canvas');
  if (config.backgroundColor) {
    canvas.style.background = config.backgroundColor;
  }
  container.appendChild(canvas);

  const shadowCanvas = document.createElement('canvas');

  const ctx = canvas.getContext('2d')!;
  const shadowCtx = shadowCanvas.getContext('2d', { willReadFrequently: true })!;

  const pxScale = window.devicePixelRatio || 1;

  [canvas, shadowCanvas].forEach(cnv => {
    cnv.width = width * pxScale;
    cnv.height = height * pxScale;
    cnv.style.width = `${width}px`;
    cnv.style.height = `${height}px`;
  });

  ctx.scale(pxScale, pxScale);
  shadowCtx.scale(pxScale, pxScale);

  const colorTracker = new ColorTracker();
  const pointerPos = { x: -1e12, y: -1e12 };
  let isPointerDragging = false;
  let isNodeDragging = false;

  const getObjUnderPointer = () => {
    let obj = null;
    const pxScale = window.devicePixelRatio;
    const px = (pointerPos.x > 0 && pointerPos.y > 0)
      ? shadowCtx.getImageData(pointerPos.x * pxScale, pointerPos.y * pxScale, 1, 1)
      : null;
    px && (obj = colorTracker.lookup(new Uint8Array(px.data)));
    return obj;
  };

  function resetTransform(ctx: CanvasRenderingContext2D) {
    const pxRatio = window.devicePixelRatio;
    ctx.setTransform(pxRatio, 0, 0, pxRatio, 0, 0);
  }

  function getOffset(el: HTMLElement) {
    const rect = el.getBoundingClientRect(),
      scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
      scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
  }

  ['pointermove', 'pointerdown'].forEach(evType =>
    container.addEventListener(evType, (ev) => {
      const pointerEvent = ev as PointerEvent;
      const offset = getOffset(container);
      pointerPos.x = pointerEvent.pageX - offset.left;
      pointerPos.y = pointerEvent.pageY - offset.top;
    }, { passive: true })
  );

  const DRAG_CLICK_TOLERANCE_PX = 3;

  d3Select(canvas).call(
    d3Drag<HTMLCanvasElement, unknown>()
      .subject(() => {
        const obj = getObjUnderPointer();
        return (obj && obj.type === 'Node') ? obj.d : null;
      })
      .on('start', (ev) => {
        const obj = ev.subject as any;
        if (!obj) return;

        obj.__initialDragPos = {
          x: obj.x,
          y: obj.y,
          fx: obj.fx,
          fy: obj.fy
        };

        if (!ev.active) {
          simulation.alphaTarget(0.3).restart();
          obj.fx = obj.x; obj.fy = obj.y;
        }

        canvas.classList.add('grabbable');
      })
      .on('drag', (ev) => {
        const obj = ev.subject as any;
        if (!obj) return;

        const initPos = obj.__initialDragPos;
        const dragPos = ev;

        const k = d3ZoomTransform(canvas).k;

        obj.fx = obj.x = initPos.x + (dragPos.x - initPos.x) / k;
        obj.fy = obj.y = initPos.y + (dragPos.y - initPos.y) / k;

        if (!obj.__dragged && (DRAG_CLICK_TOLERANCE_PX >= Math.sqrt(d3Sum([
          (ev.x - initPos.x)**2,
          (ev.y - initPos.y)**2
        ])))) return;

        isNodeDragging = true;
        isPointerDragging = true;
        obj.__dragged = true;

        renderWithCurrentTransform();
      })
      .on('end', (ev) => {
        const obj = ev.subject as any;
        if (!obj) return;

        const initPos = obj.__initialDragPos;

        if (!ev.active) {
          simulation.alphaTarget(0);
        }

        if (initPos.fx === undefined) { obj.fx = undefined; }
        if (initPos.fy === undefined) { obj.fy = undefined; }
        delete obj.__initialDragPos;

        canvas.classList.remove('grabbable');

        isNodeDragging = false;
        isPointerDragging = false;

        if (obj.__dragged) {
          delete obj.__dragged;
          renderWithCurrentTransform();
        }
      })
  );

  const zoom = d3Zoom<HTMLCanvasElement, unknown>();
  const zoomBaseElem = d3Select(canvas);

  zoom(zoomBaseElem);
  zoomBaseElem.on('dblclick.zoom', null);

  zoom
    .scaleExtent([0.01, 1000])
    .filter((ev) => {
      return !ev.button;
    })
    .on('zoom', (ev) => {
      const t = ev.transform;
      [ctx, shadowCtx].forEach(c => {
        resetTransform(c);
        c.translate(t.x, t.y);
        c.scale(t.k, t.k);
      });
      renderWithCurrentTransform();
    });

  const simulation = d3ForceSimulation<V2Node>(nodes)
    .force('link', d3ForceLink<V2Node, V2Link>(links).id((d: V2Node) => d.id))
    .force('charge', d3ForceManyBody())
    .force('center', d3ForceCenter(width / 2, height / 2))
    .on('tick', () => {
      renderWithCurrentTransform();
    });

  function initializePositions(): void {
    for (const node of nodes) {
      if (!node.x || !node.y) {
        node.x = Math.random() * width;
        node.y = Math.random() * height;
      }
    }
  }

  function renderWithCurrentTransform(): void {
    [ctx, shadowCtx].forEach(c => {
      resetTransform(c);
      c.clearRect(0, 0, width, height);
    });

    const t = d3ZoomTransform(canvas);
    [ctx, shadowCtx].forEach(c => {
      resetTransform(c);
      c.translate(t.x, t.y);
      c.scale(t.k, t.k);
    });

    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    for (const link of links) {
      const sourceNode = typeof link.source === 'string'
        ? nodes.find(n => n.id === link.source)
        : link.source;
      const targetNode = typeof link.target === 'string'
        ? nodes.find(n => n.id === link.target)
        : link.target;

      if (sourceNode && targetNode && sourceNode.x && sourceNode.y && targetNode.x && targetNode.y) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#1f77b4';

    for (const node of nodes) {
      const x = node.x!;
      const y = node.y!;

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();

      const nodeColor = colorTracker.register({ type: 'Node', d: node });
      const [r, g, b] = nodeColor;
      shadowCtx.fillStyle = `rgb(${r},${g},${b})`;
      shadowCtx.beginPath();
      shadowCtx.arc(x, y, 5, 0, 2 * Math.PI);
      shadowCtx.fill();
    }
  }

  function render(): void {
    initializePositions();
    [ctx, shadowCtx].forEach(c => resetTransform(c));
    renderWithCurrentTransform();
  }

  function destroy(): void {
    container.removeChild(canvas);
  }

  function testHitDetection(x: number, y: number): V2Node | null {
    pointerPos.x = x;
    pointerPos.y = y;
    const obj = getObjUnderPointer();
    return (obj && obj.type === 'Node') ? obj.d : null;
  }

  function testZoom(): { scale: number; x: number; y: number } {
    const transform = d3ZoomTransform(canvas);
    return {
      scale: transform.k,
      x: transform.x,
      y: transform.y
    };
  }

  return {
    render,
    destroy,
    testHitDetection,
    testZoom,
    getZoomBehavior: () => zoom,
    getCanvas: () => canvas
  };
}

export function createGraph(config: GraphConfig): GraphInstance {
  const v2Config: V2Config = {
    container: config.container,
    nodes: config.nodes as V2Node[],
    links: config.links as V2Link[],
    width: config.width,
    height: config.height,
    backgroundColor: config.backgroundColor
  };

  const v2Instance = createV2Graph(v2Config);
  const canvas = v2Instance.getCanvas();
  const zoomBehavior = v2Instance.getZoomBehavior();

  const eventHandlers = new Map<string, Set<(...args: any[]) => void>>();

  const emitEvent = (event: string, ...args: any[]) => {
    const handlers = eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  };

  const graphInstance: GraphInstance = {
    render() {
      v2Instance.render();
    },

    zoomIn() {
      if (canvas && zoomBehavior) {
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        d3Select(canvas)
          .transition()
          .duration(300)
          .call(zoomBehavior.scaleBy, 1.5, [centerX, centerY]);
      }
    },

    zoomOut() {
      if (canvas && zoomBehavior) {
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        d3Select(canvas)
          .transition()
          .duration(300)
          .call(zoomBehavior.scaleBy, 1 / 1.5, [centerX, centerY]);
      }
    },

    resetView() {
      if (canvas && zoomBehavior) {
        d3Select(canvas).transition().duration(500).call(zoomBehavior.transform, zoomIdentity);
      }
    },

    fitView() {
      if (!canvas || !zoomBehavior || !config.nodes.length) {
        this.resetView();
        return;
      }

      // Force-graph zoomToFit implementation
      const transitionDuration = 750;
      const padding = 10;

      // Calculate bounding box including node radii (force-graph pattern)
      const nodeRadius = 4; // Default node radius
      const nodesPos = config.nodes.map(node => ({
        x: node.x || 0,
        y: node.y || 0,
        r: nodeRadius
      }));

      if (!nodesPos.length) {
        this.resetView();
        return;
      }

      const bbox = {
        x: [
          Math.min(...nodesPos.map(node => node.x - node.r)),
          Math.max(...nodesPos.map(node => node.x + node.r))
        ],
        y: [
          Math.min(...nodesPos.map(node => node.y - node.r)),
          Math.max(...nodesPos.map(node => node.y + node.r))
        ]
      };

      // Calculate center point (force-graph pattern)
      const center = {
        x: (bbox.x[0] + bbox.x[1]) / 2,
        y: (bbox.y[0] + bbox.y[1]) / 2,
      };

      // Calculate zoom scale (force-graph pattern)
      const canvasRect = canvas.getBoundingClientRect();
      const zoomK = Math.max(1e-12, Math.min(1e12,
        (canvasRect.width - padding * 2) / (bbox.x[1] - bbox.x[0]),
        (canvasRect.height - padding * 2) / (bbox.y[1] - bbox.y[0]))
      );

      // Create transform (force-graph pattern)
      const transform = zoomIdentity
        .translate(canvasRect.width / 2, canvasRect.height / 2)
        .scale(zoomK)
        .translate(-center.x, -center.y);

      // Apply transform with animation
      d3Select(canvas)
        .transition()
        .duration(transitionDuration)
        .call(zoomBehavior.transform, transform);
    },

    destroy() {
      v2Instance.destroy();
      eventHandlers.clear();
    },

    exportGraph(fileName?: string) {
      if (canvas) {
        const link = document.createElement('a');
        link.download = fileName || 'graph.png';
        link.href = canvas.toDataURL();
        link.click();
      }
    },

    clearSelection() {
      // No-op for now
    },

    on(event: string, handler: (...args: any[]) => void): () => void {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set());
      }
      eventHandlers.get(event)!.add(handler);

      return () => {
        const handlers = eventHandlers.get(event);
        if (handlers) {
          handlers.delete(handler);
        }
      };
    },

    off(event: string, handler: (...args: any[]) => void) {
      const handlers = eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    },

    testHitDetection(x: number, y: number): GraphNode | null {
      return v2Instance.testHitDetection(x, y) as GraphNode | null;
    },

    testZoom(): { scale: number; x: number; y: number } {
      return v2Instance.testZoom();
    }
  };

  return graphInstance;
}