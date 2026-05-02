import 'd3-transition';
import { select } from 'd3-selection';
import { ZoomBehavior, zoomIdentity } from 'd3-zoom';
import { Simulation, forceX, forceY } from 'd3-force';
import { createGraphLayers } from './core/create-graph-layers';
import { createZoom } from './core/create-zoom';
import { createGraphSimulation } from './core/create-graph-simulation';
import { createGraphControls, GraphControlsInstance } from './controls/create-graph-controls';
import { getShortenedTargetPoint, RenderableGraphLink, renderLinks } from './renderer/links';
import { renderNodes } from './renderer/nodes';
import { renderNodeLabels } from './renderer/node-labels';
import { RenderableLinkLabel, renderLinkLabels } from './renderer/link-labels';
import { createDragBehavior } from './interactions/create-drag-behavior';
import { createNodeHover } from './interactions/create-node-hover';
import { bindNodeTooltip, NodeTooltipBinding } from './interactions/bind-node-tooltip';
import { observeResize } from './utils/observe-resize';
import { getLinkTargetPoint } from './utils/get-link-target-point';
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

  let dimensions: GraphDimensions = { width: 0, height: 0 };
  let rootGroup: SVGGElement | null = null;
  // let interactionGroup: SVGGElement | null = null;

  let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null;
  let simulation: Simulation<GraphNode, GraphLink> | null = null;

  function render(): void {
    destroy();

    const layers = createGraphLayers(config.container);

    rootGroup = layers.root;
    // interactionGroup = layers.interactionLayer;

    cleanupResize = observeResize(config.container, (width: number, height: number): void => {
      dimensions = { width, height };
  
      layers.interactionRect.setAttribute('width', String(width));
      layers.interactionRect.setAttribute('height', String(height));

      simulation?.force('x', forceX(width / 2).strength(0.03));
      simulation?.force('y', forceY(height / 2).strength(0.03));
      simulation?.alpha(0.25).restart();
    }
  );
    const zoomResult = createZoom({
  /**
   * D3 zoom must be attached to SVG
   * because it requires:
   *
   * width.baseVal
   * height.baseVal
   */
  svg: config.container,

  /**
   * Used for pointer semantics /
   * pan filtering only
   */
  interactionLayer:
    layers.interactionLayer,

  /**
   * Actual graph transform target
   */
  root: layers.root,
});
    zoomBehavior = zoomResult.behavior;
    cleanupZoom = zoomResult.cleanup;
    const root = select(layers.root);
    const renderContext = { svg: config.container, root, interaction: config.interaction };
    const linkSelection = renderLinks(renderContext, config.links);
    const linkLabelSelection = renderLinkLabels(renderContext, config.links);
    const nodeSelection = renderNodes(renderContext, config.nodes);
    const labelSelection = renderNodeLabels(renderContext, config.nodes);

    const simulationConfig: SimulationConfig = {
      nodes: config.nodes,
      links: config.links,
      width: config.container.clientWidth,
      height: config.container.clientHeight
    };
    const simulationResult = createGraphSimulation(simulationConfig);
    simulation = simulationResult.simulation;
    simulation.on(
      'tick',
      () => {
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

            if (!text || !rect) { return; }

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
        // fitView();
      }
    );

    
    if (config.interaction?.hover?.enabled) {
      if (config.interaction?.hover?.tooltip?.enabled) {
        tooltipBinding = bindNodeTooltip({
          container: config.container.parentElement as HTMLElement,
          selection: nodeSelection,
          tooltipConfig: config.interaction.hover.tooltip
        });
      }
      createNodeHover(nodeSelection, config.interaction.hover.nodeStyle);
    }

    if (config.interaction?.drag?.enabled !== false) {
      nodeSelection.call(createDragBehavior(simulation));
    }

    if (config.interaction?.selection?.enabled) {
      // Step next:
      // createNodeSelection(
      //   nodeSelection,
      //   config.interaction
      //     .selection
      //     .nodeStyle
      // );
    }

    if (config.controls?.enabled) {
      controls = createGraphControls(config.container, { zoomIn, zoomOut, resetView, fitView, destroy, render }, config.controls);
      controls.mount();
    }
  }

  function resetView(): void {
    /**
     * zoomBehavior is attached to SVG,
     * not interactionGroup (<g>)
     */
    if (!zoomBehavior) {
      return;
    }

    select(config.container)
      .transition()
      .call(
        zoomBehavior.transform,
        zoomIdentity,
      );
  }

  function fitView(): void {
    /**
     * rootGroup:
     * used for bbox measurement
     *
     * config.container:
     * used as zoom host
     */
    if (
      !zoomBehavior ||
      !rootGroup ||
      dimensions.width === 0 ||
      dimensions.height === 0
    ) {
      return;
    }

    const bounds: DOMRect =
      rootGroup.getBBox();

    if (
      bounds.width === 0 ||
      bounds.height === 0
    ) {
      return;
    }

    const width: number =
      dimensions.width;

    const height: number =
      dimensions.height;

    const scale: number =
      Math.min(
        width / bounds.width,
        height / bounds.height,
      ) * 0.9;

    const translateX: number =
      (width - bounds.width * scale) / 2 -
      bounds.x * scale;

    const translateY: number =
      (height - bounds.height * scale) / 2 -
      bounds.y * scale;

    const transform = zoomIdentity
      .translate(
        translateX,
        translateY,
      )
      .scale(scale);

    select(config.container)
      .transition()
      .call(
        zoomBehavior.transform,
        transform,
      );
  }

  function zoomIn(): void {
    /**
     * Must operate on SVG host,
     * never interactionGroup (<g>)
     */
    if (!zoomBehavior) {
      return;
    }

    select(config.container)
      .transition()
      .call(
        zoomBehavior.scaleBy,
        1.2,
      );
  }

  function zoomOut(): void {
    /**
     * Must operate on SVG host,
     * never interactionGroup (<g>)
     */
    if (!zoomBehavior) {
      return;
    }

    select(config.container)
      .transition()
      .call(
        zoomBehavior.scaleBy,
        0.8,
      );
  }

  function destroy(): void {
    if (cleanupResize) {
      cleanupResize();
      cleanupResize = null;
    }

    if (cleanupZoom) {
      cleanupZoom();
      cleanupZoom = null;
    }

    if (tooltipBinding) {
      tooltipBinding.destroy();
      tooltipBinding = null;
    }

    if (simulation) {
      simulation.stop();
      simulation = null;
    }

    if (controls) {
      controls.destroy();
      controls = null;
    }

    rootGroup = null;
    // interactionGroup = null;
    zoomBehavior = null;

    while (config.container.firstChild) {
      config.container.removeChild(config.container.firstChild);
    }
  }

  return { render, zoomIn, zoomOut, resetView, fitView, destroy };
}