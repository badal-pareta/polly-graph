// createGraph.ts
import 'd3-transition';
import { select } from 'd3-selection';
import { ZoomBehavior, zoomIdentity } from 'd3-zoom';
import { Simulation, forceCenter } from 'd3-force';

// Internal Core & Layering
import { createGraphLayers } from './core/create-graph-layers';
import { createZoom } from './core/create-zoom';
import { createGraphSimulation } from './core/create-graph-simulation';
import { createArrowMarker } from './core/create-arrow-marker';

// Components & UI
import { createGraphControls, GraphControlsInstance } from './controls/create-graph-controls';
import { createGraphLegend } from './legends/create-graph-legends';

// Renderers
import { getShortenedTargetPoint, RenderableGraphLink, renderLinks } from './renderer/links';
import { renderNodes } from './renderer/nodes';
import { renderNodeLabels } from './renderer/node-labels';
import { RenderableLinkLabel, renderLinkLabels } from './renderer/link-labels';

// Interactions & Utils
import { createDragBehavior } from './interactions/create-drag-behavior';
import { createNodeHover } from './interactions/create-node-hover';
import { bindNodeTooltip, NodeTooltipBinding } from './interactions/bind-node-tooltip';
import { observeResize } from './utils/observe-resize';
import { getLinkTargetPoint } from './utils/get-link-target-point';
import { captureAndDownloadGraph } from './utils/export-graph';

// Types
import { GraphConfig } from './contracts/graph-config.interface';
import { GraphInstance } from './contracts/graph-instance.interface';
import { GraphDimensions } from './contracts/resize.interface';
import { GraphNode, GraphLink } from './contracts/graph.types';
import { SimulationConfig } from './contracts/simulation.interface';

export function createGraph(config: GraphConfig): GraphInstance {
  let cleanupResize: VoidFunction | null = null;
  let cleanupZoom: VoidFunction | null = null;
  let tooltipBinding: NodeTooltipBinding | null = null;
  let controls: GraphControlsInstance | null = null;
  let legendCleanup: VoidFunction | null = null;

  // Timers for managing async transitions and debouncing
  let fitViewTimer: ReturnType<typeof setTimeout> | null = null;

  let dimensions: GraphDimensions = { width: 0, height: 0 };
  let rootGroup: SVGGElement | null = null;
  let svgElement: SVGSVGElement | null = null;

  let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null;
  let simulation: Simulation<GraphNode, GraphLink> | null = null;

  type NodeSelectHandler = (node: GraphNode, element: SVGCircleElement) => void;
  type LinkSelectHandler = (link: GraphLink, element: SVGLineElement) => void;

  const nodeSelectHandlers = new Set<NodeSelectHandler>();
  const linkSelectHandlers = new Set<LinkSelectHandler>();

  function on(event: 'nodeSelect', handler: NodeSelectHandler): () => void;
  function on(event: 'linkSelect', handler: LinkSelectHandler): () => void;
  function on(event: string, handler: NodeSelectHandler | LinkSelectHandler): () => void {
    if (event === 'nodeSelect') {
      nodeSelectHandlers.add(handler as NodeSelectHandler);
      return (): void => { nodeSelectHandlers.delete(handler as NodeSelectHandler); };
    }
    linkSelectHandlers.add(handler as LinkSelectHandler);
    return (): void => { linkSelectHandlers.delete(handler as LinkSelectHandler); };
  }

  function off(event: 'nodeSelect', handler: NodeSelectHandler): void;
  function off(event: 'linkSelect', handler: LinkSelectHandler): void;
  function off(event: string, handler: NodeSelectHandler | LinkSelectHandler): void {
    if (event === 'nodeSelect') {
      nodeSelectHandlers.delete(handler as NodeSelectHandler);
    } else {
      linkSelectHandlers.delete(handler as LinkSelectHandler);
    }
  }

  function render(): void {
    destroy();

    const layers = createGraphLayers(config.container);
    svgElement = layers.svg;
    rootGroup = layers.root;

    /**
     * Managed Resize Logic:
     * Resolves alignment and centering shifts seen during fullscreen transitions.
     * Uses a debounce to prevent the jitter observed in Recording 2026-05-04 at 13.48.29.gif.
     */
    cleanupResize = observeResize(config.container, (width: number, height: number): void => {
      dimensions = { width, height };

      // Update SVG viewport immediately
      layers.svg.setAttribute('width', String(width));
      layers.svg.setAttribute('height', String(height));
      layers.interactionRect.setAttribute('width', String(width));
      layers.interactionRect.setAttribute('height', String(height));

      if (simulation) {
        // Corrects the "Off-Center" issue by anchoring the physics engine to the new viewport middle
        simulation.force('center', forceCenter(width / 2, height / 2));
        simulation.alpha(0.3).restart();
      }

      // Debounce the fitView to wait for the browser layout to settle
      if (fitViewTimer) { clearTimeout(fitViewTimer); }
      fitViewTimer = setTimeout(() => {
        fitView();
        fitViewTimer = null;
      }, 150);
    });

    const zoomResult = createZoom({
      svg: layers.svg,
      interactionLayer: layers.interactionLayer,
      root: layers.root,
    });

    zoomBehavior = zoomResult.behavior;
    cleanupZoom = zoomResult.cleanup;

    const root = select(layers.root);
    const renderContext = { svg: layers.svg, root, interaction: config.interaction };
    
    const linkSelection = renderLinks(renderContext, config.links);
    const linkLabelSelection = renderLinkLabels(renderContext, config.links);
    const nodeSelection = renderNodes(renderContext, config.nodes);
    const labelSelection = renderNodeLabels(renderContext, config.nodes);

    const simulationConfig: SimulationConfig = {
      nodes: config.nodes,
      links: config.links,
      // Uses the observed dimensions to ensure physics are calculated on actual container size
      width: dimensions.width || config.container.clientWidth,
      height: dimensions.height || config.container.clientHeight
    };

    const simulationResult = createGraphSimulation(simulationConfig);
    simulation = simulationResult.simulation;

    simulation.on('tick', () => {
      linkSelection
        .attr('x1', (item: RenderableGraphLink): number => (item.link.source as GraphNode).x ?? 0)
        .attr('y1', (item: RenderableGraphLink): number => (item.link.source as GraphNode).y ?? 0)
        .attr('x2', (item: RenderableGraphLink): number => getShortenedTargetPoint(item.link, item.style).x)
        .attr('y2', (item: RenderableGraphLink): number => getShortenedTargetPoint(item.link, item.style).y);

      linkLabelSelection
        .attr('transform', (item: RenderableLinkLabel): string => {
            const link: GraphLink = item.link;
            const source: GraphNode = link.source as GraphNode;
            const targetPoint = getLinkTargetPoint(link);
            const x: number = ((source.x ?? 0) + targetPoint.x) / 2;
            const y: number = ((source.y ?? 0) + targetPoint.y) / 2;
            return `translate(${x}, ${y})`;
        })
        .each(function (): void {
          const group: SVGGElement = this as SVGGElement;
          const text = group.querySelector('text') as SVGTextElement | null;
          const rect = group.querySelector('rect') as SVGRectElement | null;
          if (!text || !rect) return;
          const bBox: DOMRect = text.getBBox();
          const padding: number = 6;
          rect.setAttribute('x', String(bBox.x - padding));
          rect.setAttribute('y', String(bBox.y - padding));
          rect.setAttribute('width', String(bBox.width + padding * 2));
          rect.setAttribute('height', String(bBox.height + padding * 2));
        });

      nodeSelection
        .attr('cx', (d: GraphNode) => d.x ?? 0)
        .attr('cy', (d: GraphNode) => d.y ?? 0);

      labelSelection
        .attr('x', (d: GraphNode) => d.x ?? 0)
        .attr('y', (d: GraphNode) => d.y ?? 0);

      tooltipBinding?.reposition();
    });

    if (config.interaction?.hover?.enabled) {
      if (config.interaction?.hover?.tooltip?.enabled) {
        tooltipBinding = bindNodeTooltip({
          container: config.container, 
          selection: nodeSelection,
          tooltipConfig: config.interaction.hover.tooltip
        });
      }
      createNodeHover(nodeSelection, config.interaction.hover.nodeStyle);
    }

    if (config.interaction?.drag?.enabled !== false) {
      nodeSelection.call(createDragBehavior(simulation));
    }

    const selectionConfig = config.interaction?.selection;
    if (selectionConfig?.enabled) {
      let selectedNodeElement: SVGCircleElement | null = null;
      let selectedLinkElement: SVGLineElement | null = null;

      // Only marker-end needs snapshotting — it's an SVG attribute, not a CSS property.
      // All other selection styles use inline CSS which the cascade handles automatically.
      const linkMarkerSnapshots = new Map<SVGLineElement, string | null>();
      linkSelection.each(function(): void {
        const linkElement = this as SVGLineElement;
        linkMarkerSnapshots.set(linkElement, linkElement.getAttribute('marker-end'));
      });

      const deselectNode = (): void => {
        if (!selectedNodeElement) { return; }
        const nodeElement = selectedNodeElement;
        nodeElement.style.fill = '';
        nodeElement.style.stroke = '';
        nodeElement.style.strokeWidth = '';
        nodeElement.style.opacity = '';
        nodeElement.style.removeProperty('r');
        root
          .selectAll<SVGGElement, RenderableLinkLabel>('.link-label.label-selection-pinned')
          .classed('label-selection-pinned', false)
          .interrupt()
          .transition()
          .duration(200)
          .style('opacity', 0)
          .style('pointer-events', 'none');
        selectedNodeElement = null;
      };

      const deselectLink = (): void => {
        if (!selectedLinkElement) { return; }
        const linkElement = selectedLinkElement;
        linkElement.style.stroke = '';
        linkElement.style.strokeWidth = '';
        linkElement.style.opacity = '';
        const originalMarkerEnd = linkMarkerSnapshots.get(linkElement);
        if (originalMarkerEnd) {
          linkElement.setAttribute('marker-end', originalMarkerEnd);
        } else {
          linkElement.removeAttribute('marker-end');
        }
        selectedLinkElement = null;
      };

      nodeSelection.on('click.select', function(event: MouseEvent, node: GraphNode): void {
        event.stopPropagation();
        const nodeElement = this as SVGCircleElement;

        if (selectedNodeElement === nodeElement) {
          deselectNode();
          return;
        }

        deselectNode();
        deselectLink();
        selectedNodeElement = nodeElement;

        const nodeStyle = selectionConfig.nodeStyle;
        if (nodeStyle) {
          if (nodeStyle.fill !== undefined) { nodeElement.style.fill = nodeStyle.fill; }
          if (nodeStyle.stroke !== undefined) { nodeElement.style.stroke = nodeStyle.stroke; }
          if (nodeStyle.strokeWidth !== undefined) { nodeElement.style.strokeWidth = String(nodeStyle.strokeWidth); }
          if (nodeStyle.opacity !== undefined) { nodeElement.style.opacity = String(nodeStyle.opacity); }
          if (nodeStyle.radius !== undefined) { nodeElement.style.setProperty('r', String(nodeStyle.radius)); }
        }

        root
          .selectAll<SVGGElement, RenderableLinkLabel>('.link-label')
          .filter((item: RenderableLinkLabel): boolean => {
            if (item.style.label.visibility !== 'hover') { return false; }
            const source = item.link.source as GraphNode;
            const target = item.link.target as GraphNode;
            return source.id === node.id || target.id === node.id;
          })
          .classed('label-selection-pinned', true)
          .interrupt()
          .transition()
          .duration(200)
          .style('opacity', 1)
          .style('pointer-events', 'auto');

        nodeSelectHandlers.forEach(handler => handler(node, nodeElement));
      });

      const selectLink = (event: MouseEvent, renderableLink: RenderableGraphLink, linkElement: SVGLineElement): void => {
        event.stopPropagation();

        if (selectedLinkElement === linkElement) {
          deselectLink();
          return;
        }

        deselectLink();
        deselectNode();
        selectedLinkElement = linkElement;

        const linkStyle = selectionConfig.linkStyle;
        if (linkStyle) {
          if (linkStyle.stroke !== undefined) { linkElement.style.stroke = linkStyle.stroke; }
          if (linkStyle.strokeWidth !== undefined) { linkElement.style.strokeWidth = String(linkStyle.strokeWidth); }
          if (linkStyle.opacity !== undefined) { linkElement.style.opacity = String(linkStyle.opacity); }

          if (linkStyle.stroke !== undefined && renderableLink.style.arrow.enabled) {
            const selectionMarkerStyle = {
              stroke: linkStyle.stroke,
              arrow: { fill: linkStyle.stroke, size: renderableLink.style.arrow.size }
            };
            const selectionMarkerId = createArrowMarker({ svg: layers.svg, style: selectionMarkerStyle });
            select(linkElement).attr('marker-end', `url(#${selectionMarkerId})`);
          }
        }

        linkSelectHandlers.forEach(handler => handler(renderableLink.link, linkElement));
      };

      linkSelection.on('click.select', function(event: MouseEvent, renderableLink: RenderableGraphLink): void {
        selectLink(event, renderableLink, this as SVGLineElement);
      });

      const linkHitAreaSelection = root
        .select('[data-layer="links"]')
        .selectAll<SVGLineElement, RenderableGraphLink>('line.link-hit-area')
        .data(linkSelection.data())
        .join('line')
        .attr('class', 'link-hit-area')
        .attr('stroke', 'rgba(0,0,0,0)')
        .attr('stroke-width', (item: RenderableGraphLink): number => item.style.arrow.size * 4)
        .style('pointer-events', 'stroke')
        .style('cursor', 'pointer')
        .attr('opacity', 0);

      simulation!.on('tick.hitarea', (): void => {
        linkHitAreaSelection
          .attr('x1', (item: RenderableGraphLink): number => (item.link.source as GraphNode).x ?? 0)
          .attr('y1', (item: RenderableGraphLink): number => (item.link.source as GraphNode).y ?? 0)
          .attr('x2', (item: RenderableGraphLink): number => (item.link.target as GraphNode).x ?? 0)
          .attr('y2', (item: RenderableGraphLink): number => (item.link.target as GraphNode).y ?? 0);
      });

      linkHitAreaSelection.on('click.select', function(event: MouseEvent, renderableLink: RenderableGraphLink): void {
        const visibleLinkNode = linkSelection.filter(d => d === renderableLink).node();
        if (visibleLinkNode) {
          selectLink(event, renderableLink, visibleLinkNode);
        }
      });

      select(layers.svg).on('click.deselect', (): void => {
        deselectNode();
        deselectLink();
      });
    }

    if (config.controls?.enabled) {
      controls = createGraphControls(
        layers.overlay,
        { zoomIn, zoomOut, resetView, fitView },
        config.controls
      );
      controls.mount();
    }

    if (config.legend?.enabled) {
      legendCleanup = createGraphLegend(layers.overlay, config.legend);
    }
  }

  function resetView(): void {
    if (!zoomBehavior || !svgElement) { return; }
    select(svgElement).transition().duration(400).call(zoomBehavior.transform, zoomIdentity);
  }

  function fitView(): void {
    if (!zoomBehavior || !rootGroup || !svgElement || dimensions.width === 0 || dimensions.height === 0) { return; }
    const bounds: DOMRect = rootGroup.getBBox();
    if (bounds.width === 0 || bounds.height === 0) { return; }

    const scale: number = Math.min(dimensions.width / bounds.width, dimensions.height / bounds.height) * 0.9;
    const translateX: number = (dimensions.width - bounds.width * scale) / 2 - bounds.x * scale;
    const translateY: number = (dimensions.height - bounds.height * scale) / 2 - bounds.y * scale;

    const transform = zoomIdentity.translate(translateX, translateY).scale(scale);
    // Smooth transition to settle the graph after size changes
    select(svgElement).transition().duration(400).call(zoomBehavior.transform, transform);
  }

  function zoomIn(): void {
    if (!zoomBehavior || !svgElement) { return; }
    select(svgElement).transition().call(zoomBehavior.scaleBy, 1.2);
  }

  function zoomOut(): void {
    if (!zoomBehavior || !svgElement) { return; }
    select(svgElement).transition().call(zoomBehavior.scaleBy, 0.8);
  }

  async function exportGraph(fileName?: string): Promise<void> {
    fitView();
    // Buffer to ensure fitView transition finishes before screenshot capture
    await new Promise(resolve => setTimeout(resolve, 500));
    await captureAndDownloadGraph(config.container, {
      fileName,
      pixelRatio: 2 
    });
  }

  function destroy(): void {
    // Clear active timers to prevent execution after destruction
    if (fitViewTimer) { 
      clearTimeout(fitViewTimer); 
      fitViewTimer = null; 
    }
    
    if (cleanupResize) { cleanupResize(); cleanupResize = null; }
    if (cleanupZoom) { cleanupZoom(); cleanupZoom = null; }
    if (tooltipBinding) { tooltipBinding.destroy(); tooltipBinding = null; }
    if (simulation) { simulation.stop(); simulation = null; }
    if (controls) { controls.destroy(); controls = null; }
    if (legendCleanup) { legendCleanup(); legendCleanup = null; }

    rootGroup = null;
    svgElement = null;
    zoomBehavior = null;

    while (config.container.firstChild) {
      config.container.removeChild(config.container.firstChild);
    }
  }

  return { render, zoomIn, zoomOut, resetView, fitView, destroy, exportGraph, on, off };
}