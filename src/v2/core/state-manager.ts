/**
 * V2 Canvas Graph - State Manager
 *
 * Centralized state management for O(1) lookups across all renderers.
 * Eliminates duplicate Maps and provides consistent caching patterns.
 */

import { V2Node, V2Link } from '../types';
import { ErrorHandler } from '../utils';

export interface GraphState {
  nodes: V2Node[];
  links: V2Link[];
}

export interface NodeLookupState {
  isHovered: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
}

export interface LinkLookupState {
  isHovered: boolean;
  isSelected: boolean;
}

export class StateManager {
  // Core entity maps for O(1) lookups
  private nodeMap = new Map<string, V2Node>();
  private linkMap = new Map<string, V2Link>(); // Using linkId as key

  // State cache maps for performance
  private nodeStateCache = new Map<string, NodeLookupState>();
  private linkStateCache = new Map<string, LinkLookupState>();

  // Link ID to Link mapping for efficient lookups
  private linkIdToLinkMap = new Map<string, V2Link>();

  // Highlight state tracking
  private highlightedNodes = new Set<string>();

  /**
   * Initialize with graph data
   */
  initialize(state: GraphState): void {
    try {
      this.buildNodeMap(state.nodes);
      this.buildLinkMaps(state.links);
      this.clearStateCache();
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Update with new graph data
   */
  updateState(state: GraphState): void {
    try {
      // Clear existing maps
      this.nodeMap.clear();
      this.linkMap.clear();
      this.linkIdToLinkMap.clear();

      // Rebuild with new data
      this.buildNodeMap(state.nodes);
      this.buildLinkMaps(state.links);
      this.clearStateCache();
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Build node map for O(1) node lookups
   */
  private buildNodeMap(nodes: V2Node[]): void {
    for (const node of nodes) {
      this.nodeMap.set(node.id, node);
    }

    // Node map is built - pre-resolution handled in buildLinkMaps
  }

  /**
   * Build link maps for O(1) link lookups
   */
  private buildLinkMaps(links: V2Link[]): void {
    for (const link of links) {
      const linkId = this.getLinkId(link);
      this.linkMap.set(linkId, link);
      this.linkIdToLinkMap.set(linkId, link);

      // Pre-resolve link references for O(1) access
      if (typeof link.source === 'string') {
        const sourceNode = this.nodeMap.get(link.source);
        if (sourceNode) {
          (link.source as V2Node | string) = sourceNode;
        }
      }
      if (typeof link.target === 'string') {
        const targetNode = this.nodeMap.get(link.target);
        if (targetNode) {
          (link.target as V2Node | string) = targetNode;
        }
      }
    }
  }

  /**
   * Get node by ID (O(1) lookup)
   */
  getNode(nodeId: string): V2Node | undefined {
    return this.nodeMap.get(nodeId);
  }

  /**
   * Get link by link ID (O(1) lookup)
   */
  getLink(linkId: string): V2Link | undefined {
    return this.linkMap.get(linkId);
  }

  /**
   * Get link by source/target IDs (O(1) lookup)
   */
  getLinkByNodes(sourceId: string, targetId: string): V2Link | undefined {
    const linkId = `${sourceId}->${targetId}`;
    return this.linkMap.get(linkId);
  }

  /**
   * Get all nodes (returns reference to avoid copying)
   */
  getAllNodes(): V2Node[] {
    return Array.from(this.nodeMap.values());
  }

  /**
   * Get all links (returns reference to avoid copying)
   */
  getAllLinks(): V2Link[] {
    return Array.from(this.linkMap.values());
  }

  /**
   * Get node map (for renderers that need direct map access)
   */
  getNodeMap(): Map<string, V2Node> {
    return this.nodeMap;
  }

  /**
   * Get link ID to link map (for renderers that need direct map access)
   */
  getLinkIdToLinkMap(): Map<string, V2Link> {
    return this.linkIdToLinkMap;
  }

  /**
   * Cache node state for performance (avoid repeated hover/selection checks)
   */
  cacheNodeState(nodeId: string, state: NodeLookupState): void {
    this.nodeStateCache.set(nodeId, state);
  }

  /**
   * Get cached node state
   */
  getCachedNodeState(nodeId: string): NodeLookupState | undefined {
    return this.nodeStateCache.get(nodeId);
  }

  /**
   * Cache link state for performance (avoid repeated hover/selection checks)
   */
  cacheLinkState(linkId: string, state: LinkLookupState): void {
    this.linkStateCache.set(linkId, state);
  }

  /**
   * Get cached link state
   */
  getCachedLinkState(linkId: string): LinkLookupState | undefined {
    return this.linkStateCache.get(linkId);
  }

  /**
   * Clear state caches (call when hover/selection state changes)
   */
  clearStateCache(): void {
    this.nodeStateCache.clear();
    this.linkStateCache.clear();
  }

  /**
   * Clear only node state cache
   */
  clearNodeStateCache(): void {
    this.nodeStateCache.clear();
  }

  /**
   * Clear only link state cache
   */
  clearLinkStateCache(): void {
    this.linkStateCache.clear();
  }

  /**
   * Generate consistent link ID
   */
  getLinkId(link: V2Link): string {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    return `${sourceId}->${targetId}`;
  }

  /**
   * Calculate link midpoint (common utility)
   */
  getLinkMidpoint(link: V2Link): { x: number; y: number } | null {
    const sourceNode = typeof link.source === 'string'
      ? this.nodeMap.get(link.source)
      : link.source;
    const targetNode = typeof link.target === 'string'
      ? this.nodeMap.get(link.target)
      : link.target;

    if (!sourceNode || !targetNode ||
        sourceNode.x === undefined || sourceNode.y === undefined ||
        targetNode.x === undefined || targetNode.y === undefined) {
      return null;
    }

    return {
      x: (sourceNode.x + targetNode.x) / 2,
      y: (sourceNode.y + targetNode.y) / 2
    };
  }

  /**
   * Highlight a node by ID
   */
  highlightNode(nodeId: string): void {
    if (this.nodeMap.has(nodeId)) {
      this.highlightedNodes.add(nodeId);
      this.clearSingleNodeStateCache(nodeId);
    }
  }

  /**
   * Highlight multiple nodes by IDs
   */
  highlightNodes(nodeIds: string[]): void {
    for (const nodeId of nodeIds) {
      if (this.nodeMap.has(nodeId)) {
        this.highlightedNodes.add(nodeId);
        this.clearSingleNodeStateCache(nodeId);
      }
    }
  }

  /**
   * Remove highlight from a node
   */
  unhighlightNode(nodeId: string): void {
    if (this.highlightedNodes.has(nodeId)) {
      this.highlightedNodes.delete(nodeId);
      this.clearSingleNodeStateCache(nodeId);
    }
  }

  /**
   * Clear all node highlights
   */
  clearHighlights(): void {
    const highlightedIds = Array.from(this.highlightedNodes);
    this.highlightedNodes.clear();

    // Clear state cache for previously highlighted nodes
    for (const nodeId of highlightedIds) {
      this.clearSingleNodeStateCache(nodeId);
    }
  }

  /**
   * Check if a node is highlighted
   */
  isNodeHighlighted(nodeId: string): boolean {
    return this.highlightedNodes.has(nodeId);
  }

  /**
   * Get all highlighted node IDs
   */
  getHighlightedNodes(): Set<string> {
    return new Set(this.highlightedNodes);
  }

  /**
   * Clear state cache for a specific node
   */
  private clearSingleNodeStateCache(nodeId: string): void {
    this.nodeStateCache.delete(nodeId);
  }

  /**
   * Get statistics about cached state
   */
  getStats(): {
    nodeCount: number;
    linkCount: number;
    cachedNodeStates: number;
    cachedLinkStates: number;
    highlightedNodes: number;
  } {
    return {
      nodeCount: this.nodeMap.size,
      linkCount: this.linkMap.size,
      cachedNodeStates: this.nodeStateCache.size,
      cachedLinkStates: this.linkStateCache.size,
      highlightedNodes: this.highlightedNodes.size
    };
  }

  /**
   * Destroy and clean up all maps
   */
  destroy(): void {
    this.nodeMap.clear();
    this.linkMap.clear();
    this.linkIdToLinkMap.clear();
    this.nodeStateCache.clear();
    this.linkStateCache.clear();
    this.highlightedNodes.clear();
  }
}