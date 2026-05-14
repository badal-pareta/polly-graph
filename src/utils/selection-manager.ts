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
    // Clear hover state first to prevent layer conflicts
    this.clearHoverState();

    // Clear any existing selections
    this.clearSelection();

    // Bring node and related elements to front
    this.bringNodeToFront(nodeElement, nodeData);

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

    // Bring link to front
    this.bringLinkToFront(linkElement, renderableLink);

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

    // Restore elements to their original layers
    this.restoreSelectedElements(data);

    // Reset styles
    element.style.fill = '';
    element.style.stroke = '';
    element.style.strokeWidth = '';
    element.style.opacity = '';
    element.style.removeProperty('r');

    // Clear selected marker
    delete element.dataset.selected;

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

    // Restore link to original layer
    this.layers.links.appendChild(element);

    // Also restore corresponding link label to original layer
    this.root
      .selectAll<SVGGElement, RenderableLinkLabel>('.link-label')
      .filter((item: RenderableLinkLabel): boolean => item.link === data)
      .each((d, i, nodes) => {
        const element = nodes[i];
        if (element) {
          this.layers.linkLabels.appendChild(element);
        }
      });

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
   * Bring node and related elements to front using selection layer sub-layers
   */
  private bringNodeToFront(nodeElement: SVGCircleElement, nodeData: GraphNode): void {

    // Move the node itself to selection nodes sub-layer
    this.layers.selectionLayer.nodes.appendChild(nodeElement);

    // Mark node as selected to prevent hover interference
    nodeElement.dataset.selected = 'true';

    // Move related links to selection links sub-layer (using same selector as hover)
    const connectedLinks = this.root
      .selectAll<SVGLineElement, RenderableGraphLink>('line:not(.link-hit-area)')
      .filter((d: RenderableGraphLink): boolean => {
        const source = d.link.source as GraphNode;
        const target = d.link.target as GraphNode;
        return source.id === nodeData.id || target.id === nodeData.id;
      });

    connectedLinks.each((d, i, nodes) => {
      const element = nodes[i];
      if (element) {
        this.layers.selectionLayer.links.appendChild(element);
      }
    });

    // Move node label to selection node labels sub-layer
    this.root
      .selectAll<SVGTextElement, GraphNode>('text')
      .filter((d: GraphNode): boolean => d.id === nodeData.id)
      .each((d, i, nodes) => {
        const element = nodes[i];
        if (element) {
          this.layers.selectionLayer.nodeLabels.appendChild(element);
        }
      });

    // Move related link labels to selection link labels sub-layer
    this.root
      .selectAll<SVGGElement, RenderableLinkLabel>('.link-label')
      .filter((item: RenderableLinkLabel): boolean => {
        const source = item.link.source as GraphNode;
        const target = item.link.target as GraphNode;
        return source.id === nodeData.id || target.id === nodeData.id;
      })
      .each((d, i, nodes) => {
        const element = nodes[i];
        if (element) {
          this.layers.selectionLayer.linkLabels.appendChild(element);
        }
      });
  }

  /**
   * Bring link and its label to front using selection layer
   */
  private bringLinkToFront(linkElement: SVGLineElement, renderableLink: RenderableGraphLink): void {
    // Move link to selection layer
    this.layers.selectionLayer.links.appendChild(linkElement);

    // Also move corresponding link label to selection layer
    this.root
      .selectAll<SVGGElement, RenderableLinkLabel>('.link-label')
      .filter((item: RenderableLinkLabel): boolean => item.link === renderableLink.link)
      .each((d, i, nodes) => {
        const element = nodes[i];
        if (element) {
          this.layers.selectionLayer.linkLabels.appendChild(element);
        }
      });
  }

  /**
   * Restore elements back to their original layers
   */
  private restoreSelectedElements(nodeData: GraphNode): void {
    // Move node back to nodes layer
    this.root.selectAll<SVGCircleElement, GraphNode>('circle')
      .filter((d: GraphNode) => d.id === nodeData.id)
      .each((d, i, nodes) => {
        const element = nodes[i];
        if (element) {
          this.layers.nodes.appendChild(element);
        }
      });

    // Move related links back to links layer
    this.root.selectAll<SVGLineElement, RenderableGraphLink>('line')
      .filter((d: RenderableGraphLink): boolean => {
        const source = d.link.source as GraphNode;
        const target = d.link.target as GraphNode;
        return source.id === nodeData.id || target.id === nodeData.id;
      })
      .each((d, i, nodes) => {
        const element = nodes[i];
        if (element) {
          this.layers.links.appendChild(element);
        }
      });

    // Move node labels back to nodeLabels layer
    this.root.selectAll<SVGTextElement, GraphNode>('text')
      .filter((d: GraphNode): boolean => d.id === nodeData.id)
      .each((d, i, nodes) => {
        const element = nodes[i];
        if (element) {
          this.layers.nodeLabels.appendChild(element);
        }
      });

    // Move link labels back to linkLabels layer
    this.root.selectAll<SVGGElement, RenderableLinkLabel>('.link-label')
      .filter((item: RenderableLinkLabel): boolean => {
        const source = item.link.source as GraphNode;
        const target = item.link.target as GraphNode;
        return source.id === nodeData.id || target.id === nodeData.id;
      })
      .each((d, i, nodes) => {
        const element = nodes[i];
        if (element) {
          this.layers.linkLabels.appendChild(element);
        }
      });
  }


  /**
   * Utility method to bring any SVG element to front using appendChild
   * Based on the reference implementation pattern
   */
  private bringElementToFront(element: Element): void {
    if (element.parentNode) {
      element.parentNode.appendChild(element);
    }
  }

  /**
   * Clear hover state to prevent conflicts with selection
   * Similar to the clearAllHoverLayers function in create-node-hover.ts
   */
  private clearHoverState(): void {

    // Move all nodes back to base nodes layer
    const hoverNodesLayer = this.root.select('[data-layer="hover-nodes"]').node() as SVGGElement;
    const nodesLayer = this.root.select('[data-layer="nodes"]').node() as SVGGElement;
    if (hoverNodesLayer && nodesLayer) {
      while (hoverNodesLayer.firstChild) {
        nodesLayer.appendChild(hoverNodesLayer.firstChild);
      }
    }

    // Move all node labels back to base node labels layer
    const hoverNodeLabelsLayer = this.root.select('[data-layer="hover-node-labels"]').node() as SVGGElement;
    const nodeLabelsLayer = this.root.select('[data-layer="node-labels"]').node() as SVGGElement;
    if (hoverNodeLabelsLayer && nodeLabelsLayer) {
      while (hoverNodeLabelsLayer.firstChild) {
        nodeLabelsLayer.appendChild(hoverNodeLabelsLayer.firstChild);
      }
    }

    // Move all links back to base links layer and trigger unhover
    const hoverLinksLayer = this.root.select('[data-layer="hover-links"]').node() as SVGGElement;
    const linksLayer = this.root.select('[data-layer="links"]').node() as SVGGElement;
    if (hoverLinksLayer && linksLayer) {
      while (hoverLinksLayer.firstChild) {
        const linkElement = hoverLinksLayer.firstChild as SVGLineElement;
        linksLayer.appendChild(linkElement);

        // Trigger unhover event
        const event = new MouseEvent('mouseleave', {
          bubbles: true,
          cancelable: false,
          view: window
        });
        linkElement.dispatchEvent(event);
      }
    }

    // Move all link labels back to base link labels layer and reset opacity
    const hoverLinkLabelsLayer = this.root.select('[data-layer="hover-link-labels"]').node() as SVGGElement;
    const linkLabelsLayer = this.root.select('[data-layer="link-labels"]').node() as SVGGElement;
    if (hoverLinkLabelsLayer && linkLabelsLayer) {
      while (hoverLinkLabelsLayer.firstChild) {
        const labelElement = hoverLinkLabelsLayer.firstChild as SVGGElement;

        // Reset opacity for hover-only labels before moving
        const labelData = (labelElement as SVGGElement & { __data__: RenderableLinkLabel }).__data__;
        if (labelData && labelData.style.label.visibility === 'hover' &&
            !labelElement.classList.contains('label-selection-pinned')) {
          labelElement.style.opacity = '0';
          labelElement.style.pointerEvents = 'none';
        }

        linkLabelsLayer.appendChild(labelElement);
      }
    }

  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.clearSelection();
  }
}