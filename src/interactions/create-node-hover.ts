import { Selection, BaseType, select } from 'd3-selection';
import { GraphNode, NodeStyle } from '../contracts/graph.types';
import { RenderableGraphLink } from '../renderer/links';
import { RenderableLinkLabel } from '../renderer/link-labels';
import { applyHoverStyles, removeHoverStyles } from '../utils/node-style-manager';
import { TimerManager } from '../utils/timer-manager';

/**
 * Enhanced Node Hover Interaction
 * Uses single-hover-state management to eliminate ghost hover effects.
 * Only one node can be hovered at a time, ensuring clean state transitions.
 */

// Global hover state - only one node can be hovered at a time
let currentHoveredNode: { element: SVGCircleElement, node: GraphNode } | null = null;

// Timer manager for optional debouncing of rapid state changes
const hoverTimerManager = new TimerManager();

export function createNodeHover(
  nodeSelection: Selection<SVGCircleElement, GraphNode, BaseType, unknown>,
  hoverStyle?: Partial<NodeStyle>,
  options?: {
    /** Enable debouncing for very rapid mouse movements (default: false) */
    enableDebouncing?: boolean;
    /** Debounce delay in ms for enter (default: 16ms ~1 frame) */
    enterDelay?: number;
    /** Debounce delay in ms for leave (default: 50ms) */
    leaveDelay?: number;
  }
): void {
  // Guard clause for empty selections
  const firstNode = nodeSelection.node();
  if (!firstNode) return;

  // Extract options with defaults
  const {
    enableDebouncing = false,
    enterDelay = 16, // ~1 frame at 60fps
    leaveDelay = 50  // Longer delay for smoother transitions
  } = options || {};

  // 1. Single-hover-state management for clean state transitions
  if (hoverStyle) {
    nodeSelection
      .on('mouseenter.hover', function (_event: MouseEvent, node: GraphNode): void {
        const circle = this as SVGCircleElement;

        const applyHover = () => {
          // Clear any existing hover state immediately before applying new one
          if (currentHoveredNode && currentHoveredNode.element !== circle) {
            removeHoverStyles(currentHoveredNode.element, currentHoveredNode.node);
            clearAllHoverLayers();
          }

          // Set new hover state
          currentHoveredNode = { element: circle, node };
          applyHoverStyles(circle, node, hoverStyle);
        };

        if (enableDebouncing) {
          // Clear any pending operations
          hoverTimerManager.clearTimer('hover-enter');
          hoverTimerManager.clearTimer('hover-leave');

          // Debounced hover application
          hoverTimerManager.debounce('hover-enter', applyHover, enterDelay);
        } else {
          // Immediate hover application (default behavior)
          applyHover();
        }
      })
      .on('mouseleave.hover', function (_event: MouseEvent, node: GraphNode): void {
        const circle = this as SVGCircleElement;

        const removeHover = () => {
          // Only clear if this is the currently hovered node
          if (currentHoveredNode?.element === circle) {
            currentHoveredNode = null;
            removeHoverStyles(circle, node);
            clearAllHoverLayers();
          }
        };

        if (enableDebouncing) {
          // Clear any pending enter operation
          hoverTimerManager.clearTimer('hover-enter');

          // Debounced hover removal
          hoverTimerManager.debounce('hover-leave', removeHover, leaveDelay);
        } else {
          // Immediate hover removal (default behavior)
          removeHover();
        }
      });
  }

  /**
   * 2. Trigger Link Hover for Connected Links
   * This will automatically handle link styling and label visibility
   */
  const svgElement = firstNode.ownerSVGElement;
  if (!svgElement) return;

  const root = select<SVGSVGElement, unknown>(svgElement);

  // Simple hover/restore using dedicated layers - no need to track positions

  // Helper function to clear all hover layers
  function clearAllHoverLayers(): void {
    // Move all nodes back to base nodes layer
    const hoverNodesLayer = root.select('[data-layer="hover-nodes"]').node() as SVGGElement;
    const nodesLayer = root.select('[data-layer="nodes"]').node() as SVGGElement;
    if (hoverNodesLayer && nodesLayer) {
      while (hoverNodesLayer.firstChild) {
        nodesLayer.appendChild(hoverNodesLayer.firstChild);
      }
    }

    // Move all node labels back to base node labels layer
    const hoverNodeLabelsLayer = root.select('[data-layer="hover-node-labels"]').node() as SVGGElement;
    const nodeLabelsLayer = root.select('[data-layer="node-labels"]').node() as SVGGElement;
    if (hoverNodeLabelsLayer && nodeLabelsLayer) {
      while (hoverNodeLabelsLayer.firstChild) {
        nodeLabelsLayer.appendChild(hoverNodeLabelsLayer.firstChild);
      }
    }

    // Move all links back to base links layer and trigger unhover
    const hoverLinksLayer = root.select('[data-layer="hover-links"]').node() as SVGGElement;
    const linksLayer = root.select('[data-layer="links"]').node() as SVGGElement;
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
    const hoverLinkLabelsLayer = root.select('[data-layer="hover-link-labels"]').node() as SVGGElement;
    const linkLabelsLayer = root.select('[data-layer="link-labels"]').node() as SVGGElement;
    if (hoverLinkLabelsLayer && linkLabelsLayer) {
      while (hoverLinkLabelsLayer.firstChild) {
        const labelElement = hoverLinkLabelsLayer.firstChild as SVGGElement;

        // Reset opacity for hover-only labels before moving
        const labelData = (labelElement as unknown as { __data__: RenderableLinkLabel }).__data__;
        if (labelData && labelData.style.label.visibility === 'hover' &&
            !labelElement.classList.contains('label-selection-pinned')) {
          labelElement.style.opacity = '0';
          labelElement.style.pointerEvents = 'none';
        }

        linkLabelsLayer.appendChild(labelElement);
      }
    }
  }

  nodeSelection
    .on('mouseenter.links', function(_event, hoveredNode: GraphNode) {
      const hoveredNodeElement = this as SVGCircleElement;

      // Skip hover if this node is already selected (to not interfere with selection layers)
      if (hoveredNodeElement.dataset.selected === 'true') {
        return;
      }

      // Only proceed if this is the currently hovered node (prevents conflicts)
      if (!currentHoveredNode || currentHoveredNode.element !== hoveredNodeElement) {
        return;
      }

      // Clear any previous hover state before applying new one
      clearAllHoverLayers();

      // Move the hovered node itself to hover nodes layer
      const hoverNodesLayer = root.select('[data-layer="hover-nodes"]').node() as SVGGElement;
      if (hoverNodesLayer) {
        hoverNodesLayer.appendChild(hoveredNodeElement);
      }

      // Move the hovered node's label to hover node labels layer
      root.selectAll<SVGTextElement, GraphNode>('text')
        .filter((d: GraphNode): boolean => d.id === hoveredNode.id)
        .each(function() {
          const labelElement = this as SVGTextElement;
          const hoverNodeLabelsLayer = root.select('[data-layer="hover-node-labels"]').node() as SVGGElement;
          if (hoverNodeLabelsLayer) {
            hoverNodeLabelsLayer.appendChild(labelElement);
          }
        });

      // Find all links connected to this node
      const connectedLinks = root.selectAll<SVGLineElement, RenderableGraphLink>('line:not(.link-hit-area)')
        .filter((renderableLink: RenderableGraphLink) => {
          const source = renderableLink.link.source as GraphNode;
          const target = renderableLink.link.target as GraphNode;
          return source.id === hoveredNode.id || target.id === hoveredNode.id;
        });

      connectedLinks.each(function(_renderableLink: RenderableGraphLink) {
        const linkElement = this as SVGLineElement;

        // Move link to hover links sub-layer for proper visual hierarchy
        const hoverLinksLayer = root.select('[data-layer="hover-links"]').node() as SVGGElement;
        if (hoverLinksLayer) {
          hoverLinksLayer.appendChild(linkElement);
        }

        // Trigger hover state
        const event = new MouseEvent('mouseenter', {
          bubbles: true,
          cancelable: false,
          view: window
        });
        linkElement.dispatchEvent(event);
      });

      // Also move connected link labels to hover link labels layer and make them visible
      root.selectAll<SVGGElement, RenderableLinkLabel>('.link-label')
        .filter((item: RenderableLinkLabel): boolean => {
          const source = item.link.source as GraphNode;
          const target = item.link.target as GraphNode;
          return source.id === hoveredNode.id || target.id === hoveredNode.id;
        })
        .each(function(item: RenderableLinkLabel) {
          const labelElement = this as SVGGElement;
          const hoverLinkLabelsLayer = root.select('[data-layer="hover-link-labels"]').node() as SVGGElement;
          if (hoverLinkLabelsLayer) {
            hoverLinkLabelsLayer.appendChild(labelElement);

            // Make hover-only labels visible when connected to hovered node
            if (item.style.label.visibility === 'hover') {
              labelElement.style.opacity = '1';
              labelElement.style.pointerEvents = 'auto';
            }
          }
        });
    })
    .on('mouseleave.links', function(_event, _hoveredNode: GraphNode) {
      const hoveredNodeElement = this as SVGCircleElement;

      // Only clear if this is the currently hovered node
      if (currentHoveredNode?.element === hoveredNodeElement) {
        clearAllHoverLayers();
      }
    });
}

/**
 * Clear all hover states - useful for cleanup or when graph is updated
 */
export function clearAllNodeHoverStates(): void {
  // Clear any pending timer operations
  hoverTimerManager.clearTimer('hover-enter');
  hoverTimerManager.clearTimer('hover-leave');

  // Clear current hover state
  if (currentHoveredNode) {
    removeHoverStyles(currentHoveredNode.element, currentHoveredNode.node);
    currentHoveredNode = null;
  }
}

/**
 * Destroy hover manager - cleans up all resources
 */
export function destroyNodeHoverManager(): void {
  clearAllNodeHoverStates();
  hoverTimerManager.destroy();
}