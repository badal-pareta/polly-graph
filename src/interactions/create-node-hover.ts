import { Selection, BaseType, select } from 'd3-selection';
import { GraphNode, NodeStyle } from '../contracts/graph.types';
import { RenderableGraphLink } from '../renderer/links';
import { RenderableLinkLabel } from '../renderer/link-labels';

/**
 * Enhanced Node Hover Interaction
 * Handles circle style changes and triggers hover states for connected links.
 * Connected links are moved to dedicated hover layer maintaining proper visual hierarchy.
 */
export function createNodeHover(
  nodeSelection: Selection<SVGCircleElement, GraphNode, BaseType, unknown>,
  hoverStyle?: Partial<NodeStyle>
): void {
  // Guard clause for empty selections
  const firstNode = nodeSelection.node();
  if (!firstNode) return;

  // 1. Logic for Node Circle Visuals
  if (hoverStyle) {
    nodeSelection
      .on('mouseenter.hover', function (_event: MouseEvent, node: GraphNode): void {
        const circle = this as SVGCircleElement;
        circle.setAttribute('stroke', hoverStyle.stroke ?? node.style?.stroke ?? '#ffffff');
        circle.setAttribute('stroke-width', String(hoverStyle.strokeWidth ?? node.style?.strokeWidth ?? 1.5));
        circle.setAttribute('opacity', String(hoverStyle.opacity ?? node.style?.opacity ?? 1));
      })
      .on('mouseleave.hover', function (_event: MouseEvent, node: GraphNode): void {
        const circle = this as SVGCircleElement;
        circle.setAttribute('stroke', node.style?.stroke ?? '#ffffff');
        circle.setAttribute('stroke-width', String(node.style?.strokeWidth ?? 1.5));
        circle.setAttribute('opacity', String(node.style?.opacity ?? 1));
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
        const labelData = (labelElement as any).__data__ as RenderableLinkLabel;
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

      connectedLinks.each(function(renderableLink: RenderableGraphLink) {
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
    .on('mouseleave.links', function(_event, hoveredNode: GraphNode) {
      // Clear all hover state when leaving any node
      clearAllHoverLayers();
    });
}