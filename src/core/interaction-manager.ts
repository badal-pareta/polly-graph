import { select } from 'd3-selection';

import { GraphManager } from './graph-manager';
import { GraphSelections } from './render-pipeline';
import { createDragBehavior } from '../interactions/create-drag-behavior';
import { createNodeHover } from '../interactions/create-node-hover';
import { createLinkHover } from '../interactions/create-link-hover';
import { bindNodeTooltip } from '../interactions/bind-node-tooltip';
import { createLinkHitArea } from '../utils/node-link-selection.utils';
import { PerformanceTickManager } from '../utils/performance-tick-manager';
import { SelectionManager } from '../utils/selection-manager';
import { resolveNodeStyle } from '../utils/resolve-node-style';

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
  setupInteractions(selections: GraphSelections): void {

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

  }

  /**
   * Setup performance tick manager
   */
  private setupTickManager(selections: GraphSelections): void {
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
    }
  }

  /**
   * Setup hover interactions
   */
  private setupHoverInteractions(selections: GraphSelections): void {
    if (this.manager.config.interaction?.hover?.enabled) {
      // Setup tooltip if enabled
      if (this.manager.config.interaction.hover.tooltip?.enabled) {
        this.manager.tooltipBinding = bindNodeTooltip({
          container: this.manager.config.container,
          selection: selections.nodeSelection,
          tooltipConfig: this.manager.config.interaction.hover.tooltip
        });
      }

      // Setup hover styles with defaults
      const defaultNodeHoverStyle = resolveNodeStyle({
        node: {} as GraphNode, // We don't need the actual node for defaults
        interaction: this.manager.config.interaction,
        isHovered: true
      });
      createNodeHover(selections.nodeSelection, defaultNodeHoverStyle);
      createLinkHover(selections.linkSelection, this.manager.config.interaction.hover.linkStyle);
    }
  }

  /**
   * Setup drag behavior
   */
  private setupDragBehavior(selections: GraphSelections): void {
    if (this.manager.config.interaction?.drag?.enabled !== false && this.manager.simulation) {
      selections.nodeSelection.call(
        createDragBehavior(
          this.manager.simulation,
          () => {
            this.manager.reheatSimulation(0.3);
          },
          this.manager.dimensions
        )
      );
    }
  }

  /**
   * Setup selection management
   */
  private setupSelectionManagement(selections: GraphSelections): void {
    if (this.manager.config.interaction?.selection?.enabled &&
        this.manager.eventEmitter &&
        this.manager.layers &&
        this.manager.rootGroup) {

      // Initialize link marker snapshots
      if (!this.manager.linkMarkerSnapshots) {
        this.manager.linkMarkerSnapshots = new Map<SVGLineElement, string | null>();
        const manager = this.manager;
        selections.linkSelection.each(function(this: SVGLineElement): void {
          manager.linkMarkerSnapshots!.set(this, this.getAttribute('marker-end'));
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

      // Setup background click to clear selection
      this.setupBackgroundClickHandler();

    }
  }

  /**
   * Setup selection event handlers
   */
  private setupSelectionHandlers(selections: GraphSelections): void {
    if (!this.manager.selectionManager) return;

    // Node selection
    selections.nodeSelection.on('click.select', (event: MouseEvent, node: GraphNode) => {
      const nodeElement = event.currentTarget as SVGCircleElement;
      this.manager.selectionManager?.selectNode(nodeElement, node);
    });

    // Link label selection - both text and background should be clickable
    selections.linkLabelSelection.on('click.select', (event: MouseEvent, renderableLinkLabel: RenderableLinkLabel) => {
      event.stopPropagation();

      // Find the corresponding visible link element for this label
      const correspondingLink = selections.linkSelection.filter((d: RenderableGraphLink) => d.link === renderableLinkLabel.link).node();
      if (correspondingLink && this.manager.selectionManager) {
        const linkData = selections.linkSelection.filter((d: RenderableGraphLink) => d.link === renderableLinkLabel.link).datum();
        this.manager.selectionManager.selectLink(correspondingLink, linkData, event);
      }
    });

    // Link selection will also be handled by hit areas for broader click area
  }

  /**
   * Setup background click to clear selection
   */
  private setupBackgroundClickHandler(): void {
    if (!this.manager.selectionManager || !this.manager.layers) return;

    // Add click listener to SVG root to handle background clicks
    select(this.manager.layers.svg).on('click.deselect', (event: MouseEvent) => {
      if (this.manager.selectionManager) {
        this.manager.selectionManager.handleBackgroundClick(
          event,
          this.manager.layers!.svg,
          this.manager.layers!.interactionRect
        );
      }
    });

  }

  /**
   * Setup link hit areas for better interaction
   */
  private setupLinkHitAreas(selections: GraphSelections): void {
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

    }
  }
}