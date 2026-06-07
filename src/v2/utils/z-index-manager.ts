/**
 * V2 Canvas Graph - Z-Index Management
 *
 * Manages rendering order to bring interacted entities (hovered/selected) to front
 * In canvas rendering, z-index is achieved by controlling render order
 */

import { V2Node, V2Link } from '../types';
import { ErrorHandler } from './errors';

export interface RenderLayers<T> {
  background: T[];   // Normal entities (rendered first, appear behind)
  foreground: T[];   // Interactive entities (rendered last, appear on top)
}

export class ZIndexManager {

  /**
   * Separate entities into background and foreground layers based on interaction state
   */
  static separateIntoLayers<T extends V2Node | V2Link>(
    entities: T[],
    isHighlighted: (entity: T) => boolean
  ): RenderLayers<T> {
    try {
      const background: T[] = [];
      const foreground: T[] = [];

      for (const entity of entities) {
        if (isHighlighted(entity)) {
          foreground.push(entity);
        } else {
          background.push(entity);
        }
      }

      return { background, foreground };
    } catch (error) {
      ErrorHandler.logError(error as Error, {
        entityCount: entities.length
      });
      // Fallback: treat all as background
      return { background: entities, foreground: [] };
    }
  }

  /**
   * Get connected entities for a node (for bringing associated elements to front)
   */
  static getConnectedEntities(
    node: V2Node,
    allLinks: V2Link[]
  ): {
    connectedLinks: V2Link[];
    linkIds: Set<string>;
  } {
    try {
      const connectedLinks: V2Link[] = [];
      const linkIds = new Set<string>();

      for (const link of allLinks) {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;

        if (sourceId === node.id || targetId === node.id) {
          connectedLinks.push(link);
          linkIds.add(`${sourceId}->${targetId}`);
        }
      }

      return { connectedLinks, linkIds };
    } catch (error) {
      ErrorHandler.logError(error as Error, {
        nodeId: node.id
      });
      return { connectedLinks: [], linkIds: new Set() };
    }
  }

  /**
   * Create highlight checker for nodes (node is highlighted if hovered or selected)
   */
  static createNodeHighlightChecker(
    hoveredNodeId: string | null,
    selectedNodeId: string | null
  ): (node: V2Node) => boolean {
    return (node: V2Node) => {
      return node.id === hoveredNodeId || node.id === selectedNodeId;
    };
  }

  /**
   * Create highlight checker for links (link is highlighted if hovered, selected, or connected to highlighted node)
   */
  static createLinkHighlightChecker(
    hoveredNodeId: string | null,
    selectedNodeId: string | null,
    hoveredLinkId: string | null,
    selectedLinkId: string | null
  ): (link: V2Link) => boolean {
    return (link: V2Link) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      const linkId = `${sourceId}->${targetId}`;

      // Link is highlighted if:
      // 1. Direct hover/selection
      if (linkId === hoveredLinkId || linkId === selectedLinkId) {
        return true;
      }

      // 2. Connected to hovered/selected node
      if (hoveredNodeId && (sourceId === hoveredNodeId || targetId === hoveredNodeId)) {
        return true;
      }
      if (selectedNodeId && (sourceId === selectedNodeId || targetId === selectedNodeId)) {
        return true;
      }

      return false;
    };
  }

  /**
   * Create highlight checker for labels (same logic as their parent entities)
   */
  static createLabelHighlightChecker<T extends V2Node | V2Link>(
    entityHighlightChecker: (entity: T) => boolean
  ): (entity: T) => boolean {
    // Labels follow the same highlighting rules as their parent entities
    return entityHighlightChecker;
  }
}