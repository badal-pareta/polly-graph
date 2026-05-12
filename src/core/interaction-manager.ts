import { Selection, select, BaseType } from 'd3-selection';

import { GraphManager } from './graph-manager';
import { createDragBehavior } from '../interactions/create-drag-behavior';
import { createNodeHover } from '../interactions/create-node-hover';
import { createLinkHover } from '../interactions/create-link-hover';
import { bindNodeTooltip } from '../interactions/bind-node-tooltip';
import { createLinkHitArea } from '../utils/node-link-selection.utils';
import { PerformanceTickManager } from '../utils/performance-tick-manager';
import { SelectionManager } from '../utils/selection-manager';

import { RenderableGraphLink } from '../renderer/links';
import { RenderableLinkLabel } from '../renderer/link-labels';
import { GraphNode } from '../contracts/graph.types';

/**
 * Interaction Manager - Handles all user interactions
 *
 * Responsibilities:
 * - Hover interactions
 * - Drag behavior
 * - Selection management
 * - Tooltip handling
 * - Hit area management
 */
export class InteractionManager {
  constructor(private manager: GraphManager) {}

  /**
   * Setup all interactions for the graph
   */
  setupInteractions(selections: {
    linkSelection: Selection<SVGLineElement, RenderableGraphLink, BaseType, unknown>;
    linkLabelSelection: Selection<SVGGElement, RenderableLinkLabel, SVGGElement, unknown>;
    nodeSelection: Selection<SVGCircleElement, GraphNode, BaseType, unknown>;
    labelSelection: Selection<SVGTextElement, GraphNode, BaseType, unknown>;
  }): void {
    console.log('[InteractionManager] Setting up interactions');

    // Setup performance tick manager
    this.setupTickManager(selections);

    // Setup hover interactions
    this.setupHoverInteractions(selections);

    // Setup drag behavior
    this.setupDragBehavior(selections);

    // Setup selection management
    this.setupSelectionManagement(selections);

    // Setup link hit areas
    this.setupLinkHitAreas(selections);

    console.log('[InteractionManager] All interactions setup complete');
  }

  /**
   * Setup performance tick manager
   */
  private setupTickManager(selections: any): void {
    if (!this.manager.tickManager) {
      this.manager.tickManager = new PerformanceTickManager({
        frameRate: 30,
        positionThreshold: 0.5,
        batchSize: 50,
        enableThrottling: true
      });
    }

    const optimizedTickHandler = this.manager.tickManager.createTickHandler({
      linkSelection: selections.linkSelection,
      linkLabelSelection: selections.linkLabelSelection,
      nodeSelection: selections.nodeSelection,
      labelSelection: selections.labelSelection,
      tooltipBinding: this.manager.tooltipBinding
    });

    if (this.manager.simulation) {
      this.manager.simulation.on('tick', optimizedTickHandler);
      console.log('[InteractionManager] Attached optimized tick handler');
    }
  }

  /**
   * Setup hover interactions
   */
  private setupHoverInteractions(selections: any): void {
    if (this.manager.config.interaction?.hover?.enabled) {
      // Setup tooltip if enabled
      if (this.manager.config.interaction.hover.tooltip?.enabled) {
        this.manager.tooltipBinding = bindNodeTooltip({
          container: this.manager.config.container,
          selection: selections.nodeSelection,
          tooltipConfig: this.manager.config.interaction.hover.tooltip
        });
        console.log('[InteractionManager] Setup node tooltips');
      }

      // Setup hover styles
      createNodeHover(selections.nodeSelection, this.manager.config.interaction.hover.nodeStyle);
      createLinkHover(selections.linkSelection, this.manager.config.interaction.hover.linkStyle);
      console.log('[InteractionManager] Setup hover interactions');
    }
  }

  /**
   * Setup drag behavior
   */
  private setupDragBehavior(selections: any): void {
    if (this.manager.config.interaction?.drag?.enabled !== false && this.manager.simulation) {
      selections.nodeSelection.call(
        createDragBehavior(this.manager.simulation, () => {
          this.manager.reheatSimulation(0.3);
        })
      );
      console.log('[InteractionManager] Setup drag behavior');
    }
  }

  /**
   * Setup selection management
   */
  private setupSelectionManagement(selections: any): void {
    if (this.manager.config.interaction?.selection?.enabled &&
        this.manager.eventEmitter &&
        this.manager.layers &&
        this.manager.rootGroup) {

      // Initialize link marker snapshots
      if (!this.manager.linkMarkerSnapshots) {
        this.manager.linkMarkerSnapshots = new Map<SVGLineElement, string | null>();
        const manager = this.manager;
        selections.linkSelection.each(function(this: SVGLineElement): void {
          const linkElement = this;
          manager.linkMarkerSnapshots!.set(linkElement, linkElement.getAttribute('marker-end'));
        });
      }

      // Initialize root selection
      if (!this.manager.rootSelection) {
        this.manager.rootSelection = select(this.manager.rootGroup);
      }

      // Initialize selection manager with correct parameters
      this.manager.selectionManager = new SelectionManager(
        this.manager.eventEmitter,
        this.manager.config.interaction.selection,
        this.manager.layers,
        this.manager.linkMarkerSnapshots,
        this.manager.rootSelection
      );

      // Setup selection event handlers
      this.setupSelectionHandlers(selections);
      console.log('[InteractionManager] Setup selection management');
    }
  }

  /**
   * Setup selection event handlers
   */
  private setupSelectionHandlers(selections: any): void {
    if (!this.manager.selectionManager) return;

    // Node selection
    selections.nodeSelection.on('click.select', (event: MouseEvent, node: any) => {
      const nodeElement = event.currentTarget as SVGCircleElement;
      this.manager.selectionManager?.selectNode(nodeElement, node);
    });

    // Link selection will be handled by hit areas
    console.log('[InteractionManager] Setup selection handlers');
  }

  /**
   * Setup link hit areas for better interaction
   */
  private setupLinkHitAreas(selections: any): void {
    if (!this.manager.rootGroup) {
      console.warn('[InteractionManager] No root group available for link hit areas');
      return;
    }

    const rootSelection = select(this.manager.rootGroup);
    const linkHitAreaSelection = createLinkHitArea(rootSelection, selections.linkSelection);

    if (linkHitAreaSelection && !linkHitAreaSelection.empty()) {
      // Setup hover for hit areas
      if (this.manager.config.interaction?.hover?.enabled) {
        createLinkHover(linkHitAreaSelection, this.manager.config.interaction.hover.linkStyle);
      }

      // Setup tick handler for hit areas
      if (this.manager.simulation) {
        this.manager.simulation.on('tick.hitarea', (): void => {
          linkHitAreaSelection
            .attr('x1', (item: RenderableGraphLink): number => (item.link.source as GraphNode).x ?? 0)
            .attr('y1', (item: RenderableGraphLink): number => (item.link.source as GraphNode).y ?? 0)
            .attr('x2', (item: RenderableGraphLink): number => (item.link.target as GraphNode).x ?? 0)
            .attr('y2', (item: RenderableGraphLink): number => (item.link.target as GraphNode).y ?? 0);
        });
      }

      // Setup selection for hit areas
      if (this.manager.selectionManager) {
        linkHitAreaSelection.on('click.select', (event: MouseEvent, renderableLink: RenderableGraphLink) => {
          const visibleLinkNode = selections.linkSelection.filter((d: RenderableGraphLink) => d === renderableLink).node();
          if (visibleLinkNode) {
            this.manager.selectionManager?.selectLink(visibleLinkNode, renderableLink, event);
          }
        });
      }

      console.log('[InteractionManager] Setup link hit areas');
    }
  }
}