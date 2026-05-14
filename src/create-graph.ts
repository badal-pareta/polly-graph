// create-graph.ts - Clean modular orchestration layer
import 'd3-transition';
import { zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import { extent } from 'd3';

// Core modules
import { GraphManager } from './core/graph-manager';
import { RenderPipeline } from './core/render-pipeline';
import { InteractionManager } from './core/interaction-manager';

// Components & Utils
import { createGraphControls } from './controls/create-graph-controls';
import { createGraphLegend } from './legends/create-graph-legends';
import { captureAndDownloadGraph } from './utils/export-graph';
import { GraphValidator, GraphValidationError } from './utils/validation';

// Types
import { GraphConfig } from './contracts/graph-config.interface';
import { GraphInstance } from './contracts/graph-instance.interface';
import { GraphNode, GraphLink, GraphNodeWithInitial } from './contracts/graph.types';
import { GraphEventMap } from './utils/event-emitter';

/**
 * Main Graph Factory - Creates and manages a graph instance
 *
 * Clean modular architecture:
 * - GraphManager: State management and coordination
 * - RenderPipeline: Rendering workflow
 * - InteractionManager: User interactions
 */
export function createGraph(config: GraphConfig): GraphInstance {
  // === 1. VALIDATION ===
  const envValidation = GraphValidator.validateEnvironment();
  if (!envValidation.isValid) {
    throw new GraphValidationError(envValidation);
  }

  if (envValidation.warnings.length > 0) {
    console.warn('[Polly Graph] Environment warnings:', envValidation.warnings);
  }

  const configValidation = GraphValidator.validateConfig(config);
  if (!configValidation.isValid) {
    throw new GraphValidationError(configValidation);
  }

  if (configValidation.warnings.length > 0) {
    console.warn('[Polly Graph] Configuration warnings:', configValidation.warnings);
  }

  // === 2. INITIALIZE CORE MODULES ===
  const graphManager = new GraphManager(config);
  const renderPipeline = new RenderPipeline(graphManager);
  const interactionManager = new InteractionManager(graphManager);


  // === 3. RENDER FUNCTION ===
  function render(): void {
    try {
      // Execute render pipeline
      renderPipeline.execute().then(selections => {
        // Setup interactions
        interactionManager.setupInteractions(selections);

        // Setup additional components
        setupAdditionalComponents();

        // Check if we need immediate fitView after initial positioning
        if (graphManager.needsImmediateFitView) {
          graphManager.needsImmediateFitView = false;
          fitViewWithInitialPositions();
        }

      }).catch(error => {
        console.error('[Polly Graph] Render failed:', error);
      });
    } catch (error) {
      console.error('[Polly Graph] Render failed:', error);
    }
  }

  // === 4. ADDITIONAL COMPONENTS ===
  function setupAdditionalComponents(): void {
    // Setup controls if enabled
    if (config.controls?.enabled && graphManager.layers) {
      graphManager.controls = createGraphControls(
        graphManager.layers.overlay,
        { zoomIn, zoomOut, resetView, fitView },
        config.controls
      );
      graphManager.controls.mount();
    }

    // Setup legend if enabled
    if (config.legend?.enabled && graphManager.layers) {
      const legendCleanup = createGraphLegend(
        graphManager.layers.overlay,
        config.legend,
        config.nodes
      );
      graphManager.addCleanup(legendCleanup);
    }

    // Setup visibility handler
    const handleVisibilityChange = (): void => {
      if (!graphManager.simulation || !graphManager.timerManager) return;

      graphManager.timerManager.clearTimer('simulation-cooldown');

      if (document.hidden) {
        graphManager.simulation.stop();
        return;
      }

      graphManager.reheatSimulation(0.3);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    graphManager.addCleanup(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    });
  }

  // === 5. ZOOM UTILITIES ===
  function zoomIn(): void {
    if (!graphManager.zoomBehavior || !graphManager.svgElement) {
      console.warn('[Polly Graph] Zoom behavior not available');
      return;
    }

    const svg = graphManager.svgElement;

    select(svg)
      .transition()
      .duration(400)
      .call(graphManager.zoomBehavior.scaleBy, 1.5);
  }

  function zoomOut(): void {
    if (!graphManager.zoomBehavior || !graphManager.svgElement) {
      console.warn('[Polly Graph] Zoom behavior not available');
      return;
    }

    const svg = graphManager.svgElement;

    select(svg)
      .transition()
      .duration(400)
      .call(graphManager.zoomBehavior.scaleBy, 1 / 1.5);
  }

  function resetView(): void {
    if (!graphManager.zoomBehavior || !graphManager.svgElement) {
      console.warn('[Polly Graph] Zoom behavior not available');
      return;
    }

    const svg = graphManager.svgElement;

    select(svg)
      .transition()
      .duration(400)
      .call(graphManager.zoomBehavior.transform, zoomIdentity);
  }

  function fitView(): void {

    if (!graphManager.simulation || !graphManager.svgElement) {
      console.warn('[Polly Graph] Cannot fit view: simulation or SVG not available');
      return;
    }

    const svg = graphManager.svgElement;
    const nodes = config.nodes;

    if (nodes.length === 0) return;

    // Calculate bounding box of nodes
    const positions = nodes.map(node => ({
      x: node.x ?? 0,
      y: node.y ?? 0
    }));


    // Calculate node bounds for fit view

    const xExtent = extent(positions, (d: {x: number, y: number}) => d.x) as [number, number];
    const yExtent = extent(positions, (d: {x: number, y: number}) => d.y) as [number, number];


    const padding = 50;
    const width = graphManager.dimensions.width - padding * 2;
    const height = graphManager.dimensions.height - padding * 2;

    const nodeWidth = xExtent[1] - xExtent[0];
    const nodeHeight = yExtent[1] - yExtent[0];

    if (nodeWidth === 0 || nodeHeight === 0) {
      return;
    }

    const scale = Math.min(width / nodeWidth, height / nodeHeight, 3); // Max scale of 3x
    const centerX = (xExtent[0] + xExtent[1]) / 2;
    const centerY = (yExtent[0] + yExtent[1]) / 2;


    const transform = zoomIdentity
      .translate(graphManager.dimensions.width / 2, graphManager.dimensions.height / 2)
      .scale(scale)
      .translate(-centerX, -centerY);

    if (graphManager.zoomBehavior) {
      select(svg)
        .transition()
        .duration(400)
        .call(graphManager.zoomBehavior.transform, transform);
    }
  }

  function fitViewWithInitialPositions(): void {

    if (!graphManager.simulation || !graphManager.svgElement) {
      console.warn('[Polly Graph] Cannot fit view: simulation or SVG not available');
      return;
    }

    const svg = graphManager.svgElement;
    const nodes = config.nodes;

    if (nodes.length === 0) return;

    // Use stored initial positions instead of current positions
    const positions = nodes.map((node: GraphNodeWithInitial) => ({
      x: node.initialX ?? node.x ?? 0,
      y: node.initialY ?? node.y ?? 0
    }));


    // Calculate bounds using initial positions

    const xExtent = extent(positions, (d: {x: number, y: number}) => d.x) as [number, number];
    const yExtent = extent(positions, (d: {x: number, y: number}) => d.y) as [number, number];


    const padding = 50;
    const width = graphManager.dimensions.width - padding * 2;
    const height = graphManager.dimensions.height - padding * 2;

    const nodeWidth = xExtent[1] - xExtent[0];
    const nodeHeight = yExtent[1] - yExtent[0];

    if (nodeWidth === 0 || nodeHeight === 0) {
      return;
    }

    const scale = Math.min(width / nodeWidth, height / nodeHeight, 3); // Max scale of 3x
    const centerX = (xExtent[0] + xExtent[1]) / 2;
    const centerY = (yExtent[0] + yExtent[1]) / 2;


    const transform = zoomIdentity
      .translate(graphManager.dimensions.width / 2, graphManager.dimensions.height / 2)
      .scale(scale)
      .translate(-centerX, -centerY);

    if (graphManager.zoomBehavior) {
      select(svg)
        .transition()
        .duration(400)
        .call(graphManager.zoomBehavior.transform, transform);
    }
  }

  // === 6. EXPORT UTILITIES ===
  function exportGraph(fileName?: string): void {
    if (!graphManager.svgElement) {
      console.warn('[Polly Graph] Cannot export: no SVG element');
      return;
    }

    captureAndDownloadGraph(config.container, {
      fileName: fileName ?? 'polly-graph-export',
      pixelRatio: 2
    });
  }

  // === 7. SELECTION UTILITIES ===
  function clearSelection(): void {
    if (graphManager.selectionManager) {
      graphManager.selectionManager.clearSelection();
    }
  }

  // === 8. EVENT SYSTEM ===
  function on(event: 'nodeSelect', handler: (node: GraphNode, element: SVGCircleElement) => void): () => void;
  function on(event: 'nodeDeselect', handler: (node: GraphNode, element: SVGCircleElement) => void): () => void;
  function on(event: 'linkSelect', handler: (link: GraphLink, element: SVGLineElement) => void): () => void;
  function on(event: 'linkDeselect', handler: (link: GraphLink, element: SVGLineElement) => void): () => void;
  function on(
    event: 'nodeSelect' | 'nodeDeselect' | 'linkSelect' | 'linkDeselect',
    handler: ((node: GraphNode, element: SVGCircleElement) => void) | ((link: GraphLink, element: SVGLineElement) => void)
  ): () => void {
    if (!graphManager.eventEmitter) {
      console.warn('[Polly Graph] Event emitter not available');
      return () => {};
    }

    switch (event) {
      case 'nodeSelect':
        return graphManager.eventEmitter.on('nodeSelect', (data) => (handler as (node: GraphNode, element: SVGCircleElement) => void)(data.node, data.element));
      case 'nodeDeselect':
        return graphManager.eventEmitter.on('nodeDeselect', (data) => (handler as (node: GraphNode, element: SVGCircleElement) => void)(data.node, data.element));
      case 'linkSelect':
        return graphManager.eventEmitter.on('linkSelect', (data) => (handler as (link: GraphLink, element: SVGLineElement) => void)(data.link, data.element));
      case 'linkDeselect':
        return graphManager.eventEmitter.on('linkDeselect', (data) => (handler as (link: GraphLink, element: SVGLineElement) => void)(data.link, data.element));
      default:
        console.warn('[Polly Graph] Unknown event:', event);
        return () => {};
    }
  }

  function off(event: 'nodeSelect', handler: (node: GraphNode, element: SVGCircleElement) => void): void;
  function off(event: 'nodeDeselect', handler: (node: GraphNode, element: SVGCircleElement) => void): void;
  function off(event: 'linkSelect', handler: (link: GraphLink, element: SVGLineElement) => void): void;
  function off(event: 'linkDeselect', handler: (link: GraphLink, element: SVGLineElement) => void): void;
  function off(event: string, _handler?: unknown): void {
    if (!graphManager.eventEmitter) return;
    graphManager.eventEmitter.removeAllListeners(event as keyof GraphEventMap);
  }

  // === 9. CLEANUP ===
  function destroy(): void {
    graphManager.destroy();
  }

  // === 10. PUBLIC API ===

  // Set fitView callback so render pipeline can call it on resize
  graphManager.fitViewCallback = () => {
    fitView();
  };

  return {
    render,
    zoomIn,
    zoomOut,
    resetView,
    fitView,
    destroy,
    exportGraph,
    clearSelection,
    on,
    off
  };
}