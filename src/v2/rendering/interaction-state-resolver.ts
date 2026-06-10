/**
 * V2 Canvas Graph - Interaction State Resolver
 *
 * Specialized service for resolving hover and selection states.
 * Extracted from main Renderer to follow single responsibility principle.
 */

import { V2Node, V2Link } from '../types';
import { HoverManager, SelectionManager } from '../interactions';

export class InteractionStateResolver {
  constructor(
    private hoverManager?: HoverManager,
    private selectionManager?: SelectionManager
  ) {}

  /**
   * Check if a node is currently hovered
   */
  isNodeHovered(nodeId: string): boolean {
    if (!this.hoverManager) return false;

    const hoverState = this.hoverManager.getHoverState();
    if (!hoverState.currentHovered || hoverState.currentHovered.d.entityType !== 'Node') {
      return false;
    }

    const hoveredNode = hoverState.currentHovered.d as V2Node;
    return hoveredNode && hoveredNode.id === nodeId;
  }

  /**
   * Check if a link is currently hovered (either directly or through associated node hover)
   */
  isLinkHovered(link: V2Link): boolean {
    if (!this.hoverManager) return false;

    const hoverState = this.hoverManager.getHoverState();
    if (!hoverState.currentHovered) return false;

    // Direct link hover
    if (hoverState.currentHovered.d.entityType === 'Link') {
      const hoveredLink = hoverState.currentHovered.d as V2Link;
      if (!hoveredLink) return false;

      const sourceId1 = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId1 = typeof link.target === 'string' ? link.target : link.target.id;
      const sourceId2 = typeof hoveredLink.source === 'string' ? hoveredLink.source : hoveredLink.source.id;
      const targetId2 = typeof hoveredLink.target === 'string' ? hoveredLink.target : hoveredLink.target.id;

      return sourceId1 === sourceId2 && targetId1 === targetId2;
    }

    // Node hover - check if this link is connected to the hovered node
    if (hoverState.currentHovered.d.entityType === 'Node') {
      const hoveredNode = hoverState.currentHovered.d as V2Node;
      if (!hoveredNode) return false;

      const linkSourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const linkTargetId = typeof link.target === 'string' ? link.target : link.target.id;

      // Return true if the hovered node is either the source or target of this link
      return hoveredNode.id === linkSourceId || hoveredNode.id === linkTargetId;
    }

    return false;
  }

  /**
   * Check if a node is currently selected
   */
  isNodeSelected(nodeId: string): boolean {
    if (!this.selectionManager) return false;

    const selectionState = this.selectionManager.getSelectionState();
    return selectionState.selectedNode?.id === nodeId;
  }

  /**
   * Check if a link is currently selected
   */
  isLinkSelected(link: V2Link): boolean {
    if (!this.selectionManager) return false;

    const selectionState = this.selectionManager.getSelectionState();
    if (!selectionState.selectedLink) return false;

    const sourceId1 = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId1 = typeof link.target === 'string' ? link.target : link.target.id;
    const selectedLink = selectionState.selectedLink;
    const sourceId2 = typeof selectedLink.source === 'string' ? selectedLink.source : selectedLink.source.id;
    const targetId2 = typeof selectedLink.target === 'string' ? selectedLink.target : selectedLink.target.id;

    return sourceId1 === sourceId2 && targetId1 === targetId2;
  }

  /**
   * Get interaction state for a node (optimized for caching)
   */
  getNodeState(nodeId: string): { isHovered: boolean; isSelected: boolean } {
    return {
      isHovered: this.isNodeHovered(nodeId),
      isSelected: this.isNodeSelected(nodeId)
    };
  }

  /**
   * Get interaction state for a link (optimized for caching)
   */
  getLinkState(link: V2Link): { isHovered: boolean; isSelected: boolean } {
    return {
      isHovered: this.isLinkHovered(link),
      isSelected: this.isLinkSelected(link)
    };
  }

  /**
   * Create callback functions for external use (useful for renderers)
   */
  createCallbacks() {
    return {
      isNodeHovered: (nodeId: string) => this.isNodeHovered(nodeId),
      isNodeSelected: (nodeId: string) => this.isNodeSelected(nodeId),
      isLinkHovered: (link: V2Link) => this.isLinkHovered(link),
      isLinkSelected: (link: V2Link) => this.isLinkSelected(link)
    };
  }

  /**
   * Update the managers (useful for re-initialization)
   */
  updateManagers(hoverManager?: HoverManager, selectionManager?: SelectionManager): void {
    this.hoverManager = hoverManager;
    this.selectionManager = selectionManager;
  }
}