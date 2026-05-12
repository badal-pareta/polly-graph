/**
 * Centralized selection management for graph nodes and links.
 * Simplifies selection logic and ensures consistent behavior.
 */

import { Selection } from 'd3-selection';
import { GraphNode, GraphLink } from '../contracts/graph.types';
import { RenderableLinkLabel } from '../renderer/link-labels';
import { TypedGraphEventEmitter } from './event-emitter';
import { SelectionInteractionConfig } from '../contracts/graph-config.interface';
import { GraphLayers } from '../contracts/graph-layers.interface';
import { createArrowMarker } from '../core/create-arrow-marker';
import { RenderableGraphLink } from '../renderer/links';

export interface SelectionState {
  selectedNode: {
    element: SVGCircleElement;
    data: GraphNode;
  } | null;
  selectedLink: {
    element: SVGLineElement;
    data: GraphLink;
    originalMarker: string | null;
  } | null;
}

export class SelectionManager {
  private state: SelectionState = {
    selectedNode: null,
    selectedLink: null
  };

  private readonly eventEmitter: TypedGraphEventEmitter;
  private readonly config: SelectionInteractionConfig;
  private readonly layers: GraphLayers;
  private readonly linkMarkerSnapshots: Map<SVGLineElement, string | null>;
  private readonly root: Selection<SVGGElement, unknown, null, undefined>;

  constructor(
    eventEmitter: TypedGraphEventEmitter,
    config: SelectionInteractionConfig,
    layers: GraphLayers,
    linkMarkerSnapshots: Map<SVGLineElement, string | null>,
    root: Selection<SVGGElement, unknown, null, undefined>
  ) {
    this.eventEmitter = eventEmitter;
    this.config = config;
    this.layers = layers;
    this.linkMarkerSnapshots = linkMarkerSnapshots;
    this.root = root;
  }

  /**
   * Select a node, automatically deselecting any current selection
   */
  selectNode(nodeElement: SVGCircleElement, nodeData: GraphNode): void {
    // Clear any existing selections
    this.clearSelection();

    // Apply node selection styles
    if (this.config.nodeStyle) {
      const style = this.config.nodeStyle;
      if (style.fill !== undefined) nodeElement.style.fill = style.fill;
      if (style.stroke !== undefined) nodeElement.style.stroke = style.stroke;
      if (style.strokeWidth !== undefined) nodeElement.style.strokeWidth = String(style.strokeWidth);
      if (style.opacity !== undefined) nodeElement.style.opacity = String(style.opacity);
      if (style.radius !== undefined) nodeElement.style.setProperty('r', String(style.radius));
    }

    // Show related link labels on hover visibility
    this.root
      .selectAll<SVGGElement, RenderableLinkLabel>('.link-label')
      .filter((item: RenderableLinkLabel): boolean => {
        if (item.style.label.visibility !== 'hover') return false;
        const source = item.link.source as GraphNode;
        const target = item.link.target as GraphNode;
        return source.id === nodeData.id || target.id === nodeData.id;
      })
      .classed('label-selection-pinned', true)
      .interrupt()
      .transition()
      .duration(200)
      .style('opacity', 1)
      .style('pointer-events', 'auto');

    // Update state
    this.state.selectedNode = { element: nodeElement, data: nodeData };

    // Emit event
    console.log('SelectionManager: Emitting nodeSelect event for:', nodeData);
    this.eventEmitter.emit('nodeSelect', { node: nodeData, element: nodeElement });
  }

  /**
   * Select a link, automatically deselecting any current selection
   */
  selectLink(
    linkElement: SVGLineElement,
    renderableLink: RenderableGraphLink,
    event?: MouseEvent
  ): void {
    if (event) {
      event.stopPropagation();
    }

    // Clear any existing selections
    this.clearSelection();

    // Mark element as selected for hover logic
    linkElement.dataset.selected = 'true';

    // Apply link selection styles
    if (this.config.linkStyle) {
      const style = this.config.linkStyle;
      if (style.stroke !== undefined) linkElement.style.stroke = style.stroke;
      if (style.strokeWidth !== undefined) linkElement.style.strokeWidth = String(style.strokeWidth);
      if (style.opacity !== undefined) linkElement.style.opacity = String(style.opacity);

      // Update arrow marker if needed
      if (style.stroke !== undefined && renderableLink.style.arrow.enabled) {
        const selectionMarkerStyle = {
          stroke: style.stroke,
          arrow: { fill: style.stroke, size: renderableLink.style.arrow.size }
        };
        const selectionMarkerId = createArrowMarker({ svg: this.layers.svg, style: selectionMarkerStyle });
        linkElement.setAttribute('marker-end', `url(#${selectionMarkerId})`);
      }
    }

    // Show link label if it exists
    this.root
      .selectAll<SVGGElement, RenderableLinkLabel>('.link-label')
      .filter((item: RenderableLinkLabel): boolean => item.link === renderableLink.link)
      .classed('label-selection-pinned', true)
      .interrupt()
      .transition()
      .duration(200)
      .style('opacity', 1)
      .style('pointer-events', 'auto');

    // Store original marker for restoration
    const originalMarker = this.linkMarkerSnapshots.get(linkElement) || null;

    // Update state
    this.state.selectedLink = {
      element: linkElement,
      data: renderableLink.link,
      originalMarker
    };

    // Emit event
    this.eventEmitter.emit('linkSelect', { link: renderableLink.link, element: linkElement });
  }

  /**
   * Deselect the currently selected node
   */
  private deselectNode(): void {
    if (!this.state.selectedNode) return;

    const { element, data } = this.state.selectedNode;

    // Reset styles
    element.style.fill = '';
    element.style.stroke = '';
    element.style.strokeWidth = '';
    element.style.opacity = '';
    element.style.removeProperty('r');

    // Hide pinned link labels
    this.root
      .selectAll<SVGGElement, RenderableLinkLabel>('.link-label.label-selection-pinned')
      .classed('label-selection-pinned', false)
      .interrupt()
      .transition()
      .duration(200)
      .style('opacity', 0)
      .style('pointer-events', 'none');

    // Clear state
    this.state.selectedNode = null;

    // Emit event
    this.eventEmitter.emit('nodeDeselect', { node: data, element });
  }

  /**
   * Deselect the currently selected link
   */
  private deselectLink(): void {
    if (!this.state.selectedLink) return;

    const { element, data, originalMarker } = this.state.selectedLink;

    // Remove selected marker
    delete element.dataset.selected;

    // Reset styles
    element.style.stroke = '';
    element.style.strokeWidth = '';
    element.style.opacity = '';

    // Restore original marker
    if (originalMarker) {
      element.setAttribute('marker-end', originalMarker);
    } else {
      element.removeAttribute('marker-end');
    }

    // Hide link label if it was pinned for selection and visibility is 'hover'
    this.root
      .selectAll<SVGGElement, RenderableLinkLabel>('.link-label.label-selection-pinned')
      .filter((item: RenderableLinkLabel): boolean => {
        return item.link === data && item.style.label.visibility === 'hover';
      })
      .classed('label-selection-pinned', false)
      .interrupt()
      .transition()
      .duration(200)
      .style('opacity', 0)
      .style('pointer-events', 'none');

    // Clear state
    this.state.selectedLink = null;

    // Emit event
    this.eventEmitter.emit('linkDeselect', { link: data, element });
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.deselectNode();
    this.deselectLink();
  }

  /**
   * Get current selection state
   */
  getSelectionState(): SelectionState {
    return { ...this.state };
  }

  /**
   * Check if a specific node is selected
   */
  isNodeSelected(nodeData: GraphNode): boolean {
    return this.state.selectedNode?.data.id === nodeData.id;
  }

  /**
   * Check if a specific link is selected
   */
  isLinkSelected(linkData: GraphLink): boolean {
    if (!this.state.selectedLink) return false;
    const selectedLink = this.state.selectedLink.data;
    const sourceId = typeof selectedLink.source === 'string' ? selectedLink.source : selectedLink.source.id;
    const targetId = typeof selectedLink.target === 'string' ? selectedLink.target : selectedLink.target.id;
    const checkSourceId = typeof linkData.source === 'string' ? linkData.source : linkData.source.id;
    const checkTargetId = typeof linkData.target === 'string' ? linkData.target : linkData.target.id;

    return sourceId === checkSourceId && targetId === checkTargetId;
  }

  /**
   * Handle click on background (deselect all)
   */
  handleBackgroundClick(event: MouseEvent, svg: SVGSVGElement, interactionRect: SVGRectElement): void {
    if (event.target !== svg && event.target !== interactionRect) return;
    this.clearSelection();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.clearSelection();
  }
}