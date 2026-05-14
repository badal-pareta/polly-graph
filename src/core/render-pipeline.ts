import { select, Selection, BaseType } from 'd3-selection';
import { forceCenter } from 'd3-force';

import { GraphManager } from './graph-manager';
import { createGraphLayers } from './create-graph-layers';
import { createZoom } from './create-zoom';
import { createGraphSimulation } from './create-graph-simulation';
import { observeResize } from '../utils/observe-resize';
import { ErrorHandler } from '../utils/error-handler';
import { GraphLayers } from '../contracts/graph-layers.interface';

import { renderLinks, RenderableGraphLink } from '../renderer/links';
import { renderNodes } from '../renderer/nodes';
import { renderNodeLabels } from '../renderer/node-labels';
import { renderLinkLabels, RenderableLinkLabel } from '../renderer/link-labels';
import { GraphNode } from '../contracts/graph.types';

import { SimulationConfig } from '../contracts/simulation.interface';

export interface GraphSelections {
  linkSelection: Selection<SVGLineElement, RenderableGraphLink, BaseType, unknown>;
  linkLabelSelection: Selection<SVGGElement, RenderableLinkLabel, SVGGElement, unknown>;
  nodeSelection: Selection<SVGCircleElement, GraphNode, BaseType, unknown>;
  labelSelection: Selection<SVGTextElement, GraphNode, BaseType, unknown>;
}

/**
 * Render Pipeline - Handles the rendering workflow
 *
 * Responsibilities:
 * - DOM setup and cleanup
 * - Component rendering
 * - Simulation initialization
 * - Resize handling
 */
export class RenderPipeline {
  constructor(private manager: GraphManager) {}

  /**
   * Execute the complete render pipeline
   */
  async execute(): Promise<GraphSelections> {

    // Step 1: Cleanup previous render
    this.cleanup();

    // Step 2: Initialize managers
    this.manager.initializeManagers();

    // Step 3: Create DOM layers
    const layers = this.createDOMStructure();

    // Step 4: Setup resize handling
    this.setupResizeHandling();

    // Step 5: Initialize zoom behavior
    this.initializeZoom(layers);

    // Step 6: Render components
    const selections = this.renderComponents(layers);

    // Step 7: Create and configure simulation
    await this.initializeSimulation(selections);

    return selections;
  }

  /**
   * Cleanup previous render
   */
  private cleanup(): void {
    ErrorHandler.safeDOMOperation(() => {
      if (this.manager.svgElement && this.manager.config.container.contains(this.manager.svgElement)) {
        this.manager.config.container.removeChild(this.manager.svgElement);
      }
    }, { operation: 'remove existing SVG', component: 'render-pipeline' });
  }

  /**
   * Create DOM structure and layers
   */
  private createDOMStructure() {
    const layers = createGraphLayers(this.manager.config.container);
    this.manager.layers = layers;
    this.manager.svgElement = layers.svg;
    this.manager.rootGroup = layers.root;

    // Capture initial dimensions
    const initialWidth = this.manager.config.container.clientWidth;
    const initialHeight = this.manager.config.container.clientHeight;
    this.manager.dimensions = { width: initialWidth, height: initialHeight };

    // Set initial SVG attributes
    if (initialWidth > 0 && initialHeight > 0) {
      layers.svg.setAttribute('width', String(initialWidth));
      layers.svg.setAttribute('height', String(initialHeight));
      layers.interactionRect.setAttribute('width', String(initialWidth));
      layers.interactionRect.setAttribute('height', String(initialHeight));
    }

    return layers;
  }

  /**
   * Setup resize handling
   */
  private setupResizeHandling(): void {
    const cleanupResize = observeResize(this.manager.config.container, (width, height) => {
      this.manager.dimensions = { width, height };

      if (this.manager.svgElement && this.manager.layers) {
        this.manager.svgElement.setAttribute('width', String(width));
        this.manager.svgElement.setAttribute('height', String(height));
        this.manager.layers.interactionRect.setAttribute('width', String(width));
        this.manager.layers.interactionRect.setAttribute('height', String(height));
      }

      if (this.manager.simulation) {
        this.manager.simulation.force('center', forceCenter(width / 2, height / 2));

        // If simulation was paused due to invalid dimensions, position nodes and restart
        if (this.manager.simulationPaused && width > 0 && height > 0) {

          // Position nodes with current dimensions
          this.positionNodesWithValidDimensions(width, height);

          // Start simulation
          this.manager.reheatSimulation(0.3);
          this.manager.simulationPaused = false;
        } else if (!this.manager.simulationPaused && this.manager.simulation.alpha() < 0.2) {
          this.manager.reheatSimulation(0.1);
        }
      }

      // Call fitView with debounce after resize
      if (this.manager.timerManager && this.manager.fitViewCallback) {
        this.manager.timerManager.debounce('fit-view-resize', () => {
          if (this.manager.fitViewCallback) {
            this.manager.fitViewCallback();
          }
        }, 150);
      }

    });

    this.manager.addCleanup(cleanupResize);
  }

  /**
   * Initialize zoom behavior
   */
  private initializeZoom(layers: GraphLayers): void {
    const zoomResult = createZoom({
      svg: layers.svg,
      interactionLayer: layers.interactionLayer,
      root: layers.root,
    });

    this.manager.zoomBehavior = zoomResult.behavior;
    this.manager.addCleanup(zoomResult.cleanup);

  }

  /**
   * Render graph components
   */
  private renderComponents(layers: GraphLayers): GraphSelections {
    const root = select(layers.root);
    const renderContext = {
      svg: layers.svg,
      root,
      interaction: this.manager.config.interaction
    };

    const linkSelection = renderLinks(renderContext, this.manager.config.links);
    const linkLabelSelection = renderLinkLabels(renderContext, this.manager.config.links);
    const nodeSelection = renderNodes(renderContext, this.manager.config.nodes);
    const labelSelection = renderNodeLabels(renderContext, this.manager.config.nodes);

    //   links: this.manager.config.links.length,
    //   linkLabels: linkLabelSelection.size(),
    //   nodes: this.manager.config.nodes.length,
    //   nodeLabels: labelSelection.size()
    // });

    return { linkSelection, linkLabelSelection, nodeSelection, labelSelection };
  }

  /**
   * Position nodes when valid dimensions become available
   */
  private positionNodesWithValidDimensions(width: number, height: number): void {

    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate radius that keeps nodes within container bounds with padding
    const padding = 50;
    const maxRadius = Math.min(
      (width - padding * 2) / 2,
      (height - padding * 2) / 2
    );
    const nodeBasedRadius = Math.max(50, Math.min(200, this.manager.config.nodes.length * 3));
    const seedRadius = Math.min(maxRadius, nodeBasedRadius);

    this.manager.config.nodes.forEach((node, index) => {
      if (node.x == null || node.y == null) {
        // Add some randomness to break perfect symmetry
        const angle = (index / Math.max(this.manager.config.nodes.length, 1)) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const radius = seedRadius * (0.3 + Math.random() * 0.7);

        // Calculate position
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        // Ensure nodes stay within container bounds
        const nodeRadius = 12; // Default node radius
        node.x = Math.max(nodeRadius, Math.min(width - nodeRadius, x));
        node.y = Math.max(nodeRadius, Math.min(height - nodeRadius, y));
      }
    });

    //   this.manager.config.nodes.map(n => ({ id: n.id, x: n.x, y: n.y })));
  }

  /**
   * Initialize and configure simulation
   */
  private async initializeSimulation(selections: GraphSelections): Promise<void> {
    const simulationConfig: SimulationConfig = {
      nodes: this.manager.config.nodes,
      links: this.manager.config.links,
      width: this.manager.dimensions.width || this.manager.config.container.clientWidth,
      height: this.manager.dimensions.height || this.manager.config.container.clientHeight,
      config: this.manager.config.simulation
    };

    //   nodeCount: simulationConfig.nodes.length,
    //   linkCount: simulationConfig.links.length,
    //   dimensions: { width: simulationConfig.width, height: simulationConfig.height },
    //   center: { x: simulationConfig.width / 2, y: simulationConfig.height / 2 },
    //   customForces: this.manager.config.simulation?.forces ? 'Yes' : 'No'
    // });

    // Debug: Check node positions before simulation creation
    //   this.manager.config.nodes.map(n => ({ id: n.id, x: n.x, y: n.y })));

    try {
      const simulationResult = createGraphSimulation(simulationConfig);
      this.manager.simulation = simulationResult.simulation;

      // Debug: Check node positions after simulation creation
      //   this.manager.config.nodes.map(n => ({ id: n.id, x: n.x, y: n.y })));

      // Apply center force with consistent coordinates
      const centerX = simulationConfig.width / 2;
      const centerY = simulationConfig.height / 2;
      this.manager.simulation.force('center', forceCenter(centerX, centerY));


      // Only start simulation if container has valid dimensions
      if (simulationConfig.width > 0 && simulationConfig.height > 0) {
        this.manager.reheatSimulation(0.3);
        this.manager.simulationPaused = false;

        // Signal that we need immediate fitView after render completes
        this.manager.needsImmediateFitView = true;

      } else {
        this.manager.simulation.stop();
        this.manager.simulationPaused = true;
      }

    } catch (error) {
      console.error('[RenderPipeline] Simulation creation failed:', error);
      ErrorHandler.handleSimulationError(
        error as Error,
        { operation: 'create simulation', component: 'render-pipeline', data: simulationConfig },
        this.manager.simulation
      );
    }
  }
}