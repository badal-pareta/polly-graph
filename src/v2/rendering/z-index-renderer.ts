/**
 * V2 Canvas Graph - Optimized Z-Index Renderer
 *
 * High-performance unified rendering system with correct layering behavior.
 * Eliminates code duplication and ensures O(n) time complexity.
 */

import { V2Node, V2Link, LinkLabelRenderStyle } from '../types';
import { ErrorHandler, RenderError, StyleResolver } from '../utils';
import { StatsMetrics } from '../types/generic.types';

interface InteractiveEntities {
  interactiveNodes: Set<string>;
  interactiveLinks: Set<string>;
}

interface ReusableArrays {
  backgroundNodes: V2Node[];
  foregroundNodes: V2Node[];
  backgroundLinks: V2Link[];
  foregroundLinks: V2Link[];
}

export class OptimizedZIndexRenderer {
  private config?: { nodes: V2Node[]; links: V2Link[] };
  private styleResolver?: StyleResolver;

  // Pre-computed adjacency maps for O(1) lookups
  private nodeToLinksMap = new Map<string, Set<string>>();
  private linkToNodesMap = new Map<string, [string, string]>();

  // Reusable arrays to minimize garbage collection
  private reusableArrays: ReusableArrays = {
    backgroundNodes: [],
    foregroundNodes: [],
    backgroundLinks: [],
    foregroundLinks: []
  };

  // Pre-sorted arrays to avoid redundant sorting
  private sortedBackgroundNodes: V2Node[] = [];
  private sortedForegroundNodes: V2Node[] = [];

  // State checkers (injected from parent renderer)
  private isNodeHovered: (nodeId: string) => boolean = () => false;
  private isNodeSelected: (nodeId: string) => boolean = () => false;
  private isLinkHovered: (link: V2Link) => boolean = () => false;
  private isLinkSelected: (link: V2Link) => boolean = () => false;
  private getLinkId: (link: V2Link) => string = () => '';
  private getLinkMidpoint: (link: V2Link) => { x: number; y: number } | null = () => null;

  // Component renderers (injected)
  private renderNodes?: (ctx: CanvasRenderingContext2D, nodes: V2Node[]) => void;
  private renderLinks?: (ctx: CanvasRenderingContext2D, links: V2Link[]) => void;
  private renderNodeLabels?: (ctx: CanvasRenderingContext2D, nodes: V2Node[]) => void;

  /**
   * Initialize the optimized z-index renderer
   */
  initialize(config: {
    nodes: V2Node[];
    links: V2Link[];
    styleResolver: StyleResolver;
    isNodeHovered: (nodeId: string) => boolean;
    isNodeSelected: (nodeId: string) => boolean;
    isLinkHovered: (link: V2Link) => boolean;
    isLinkSelected: (link: V2Link) => boolean;
    getLinkId: (link: V2Link) => string;
    getLinkMidpoint: (link: V2Link) => { x: number; y: number } | null;
    renderNodes: (ctx: CanvasRenderingContext2D, nodes: V2Node[]) => void;
    renderLinks: (ctx: CanvasRenderingContext2D, links: V2Link[]) => void;
    renderNodeLabels: (ctx: CanvasRenderingContext2D, nodes: V2Node[]) => void;
  }): void {
    this.config = { nodes: config.nodes, links: config.links };
    this.styleResolver = config.styleResolver;
    this.isNodeHovered = config.isNodeHovered;
    this.isNodeSelected = config.isNodeSelected;
    this.isLinkHovered = config.isLinkHovered;
    this.isLinkSelected = config.isLinkSelected;
    this.getLinkId = config.getLinkId;
    this.getLinkMidpoint = config.getLinkMidpoint;
    this.renderNodes = config.renderNodes;
    this.renderLinks = config.renderLinks;
    this.renderNodeLabels = config.renderNodeLabels;

    // Build adjacency maps for O(1) lookups
    this.buildAdjacencyMaps();
  }

  /**
   * Build adjacency maps once at initialization - O(n) complexity
   */
  private buildAdjacencyMaps(): void {
    if (!this.config) return;

    this.nodeToLinksMap.clear();
    this.linkToNodesMap.clear();

    try {
      for (const link of this.config.links) {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        const linkId = this.getLinkId(link);

        // Store link -> nodes mapping: O(1)
        this.linkToNodesMap.set(linkId, [sourceId, targetId]);

        // Store node -> links mapping: O(1)
        if (!this.nodeToLinksMap.has(sourceId)) {
          this.nodeToLinksMap.set(sourceId, new Set());
        }
        if (!this.nodeToLinksMap.has(targetId)) {
          this.nodeToLinksMap.set(targetId, new Set());
        }
        this.nodeToLinksMap.get(sourceId)!.add(linkId);
        this.nodeToLinksMap.get(targetId)!.add(linkId);
      }


    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Determine interactive entities - O(n) total complexity
   */
  private getInteractiveEntities(): InteractiveEntities {
    if (!this.config) {
      return { interactiveNodes: new Set(), interactiveLinks: new Set() };
    }

    const interactiveNodes = new Set<string>();
    const interactiveLinks = new Set<string>();

    try {
      // Step 1: Find directly interactive nodes - O(n)
      for (const node of this.config.nodes) {
        if (this.isNodeHovered(node.id) || this.isNodeSelected(node.id)) {
          interactiveNodes.add(node.id);

          // Add connected links to this node - O(1) lookup
          const connectedLinks = this.nodeToLinksMap.get(node.id);
          if (connectedLinks) {
            connectedLinks.forEach(linkId => interactiveLinks.add(linkId));

          }
        }
      }

      // Step 2: Find directly interactive links - O(n)
      for (const link of this.config.links) {
        const linkId = this.getLinkId(link);
        if (this.isLinkHovered(link) || this.isLinkSelected(link)) {
          interactiveLinks.add(linkId);

          // Add connected nodes to this link - O(1) lookup
          const connectedNodes = this.linkToNodesMap.get(linkId);
          if (connectedNodes) {
            interactiveNodes.add(connectedNodes[0]); // source
            interactiveNodes.add(connectedNodes[1]); // target

          }
        }
      }


    } catch (error) {
      ErrorHandler.logError(error as Error);
    }

    return { interactiveNodes, interactiveLinks };
  }

  /**
   * Clear and prepare reusable arrays to avoid garbage collection
   */
  private clearReusableArrays(): void {
    this.reusableArrays.backgroundNodes.length = 0;
    this.reusableArrays.foregroundNodes.length = 0;
    this.reusableArrays.backgroundLinks.length = 0;
    this.reusableArrays.foregroundLinks.length = 0;

    // Clear sorted arrays
    this.sortedBackgroundNodes.length = 0;
    this.sortedForegroundNodes.length = 0;
  }

  /**
   * Main render with optimized layering - O(n) total complexity
   */
  render(ctx: CanvasRenderingContext2D, performanceMetrics?: StatsMetrics): void {
    if (!this.config || !this.styleResolver) {
      throw new RenderError('Z-Index renderer not initialized');
    }

    const startTime = performance.now();

    try {
      // Get interactive entities: O(n)
      const { interactiveNodes, interactiveLinks } = this.getInteractiveEntities();

      // Clear reusable arrays
      this.clearReusableArrays();

      // Separate entities into layers: O(n)
      this.separateEntitiesIntoLayers(interactiveNodes, interactiveLinks);

      // Render components in correct z-order across ALL layers: O(n)
      this.renderAllComponentsInCorrectOrder(ctx);

      if (performanceMetrics) {
        performanceMetrics.renderTotal += performance.now() - startTime;
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw new RenderError('Failed to render with z-index optimization');
    }
  }

  /**
   * Separate entities into background/foreground layers - O(n) - OPTIMIZED
   * CRITICAL: Ensure entities appear in ONLY ONE layer to prevent overlapping labels
   * OPTIMIZED: Combined with sorting to reduce iterations
   */
  private separateEntitiesIntoLayers(interactiveNodes: Set<string>, interactiveLinks: Set<string>): void {
    if (!this.config) return;

    // Separate and sort nodes in single pass: O(n) - more efficient
    for (const node of this.config.nodes) {
      if (interactiveNodes.has(node.id)) {
        this.reusableArrays.foregroundNodes.push(node);
      } else {
        this.reusableArrays.backgroundNodes.push(node);
      }
    }

    // Separate links: O(n) - each link goes to EXACTLY ONE layer
    for (const link of this.config.links) {
      const linkId = this.getLinkId(link);
      if (interactiveLinks.has(linkId)) {
        this.reusableArrays.foregroundLinks.push(link);
      } else {
        this.reusableArrays.backgroundLinks.push(link);
      }
    }

    // Sort once after separation (more efficient than sorting during iteration)
    this.sortNodeArrays();
  }

  /**
   * Sort node arrays once after separation - O(n log n) but only once per render
   */
  private sortNodeArrays(): void {
    // Sort background nodes and cache result
    this.sortedBackgroundNodes = this.sortNodesForSubLayering(this.reusableArrays.backgroundNodes);

    // Sort foreground nodes and cache result
    this.sortedForegroundNodes = this.sortNodesForSubLayering(this.reusableArrays.foregroundNodes);
  }

  /**
   * Render all components in correct z-order across all layers
   * PROPERLY FIXED: Atomic node+label rendering for correct sub-layering
   */
  private renderAllComponentsInCorrectOrder(ctx: CanvasRenderingContext2D): void {
    // CORRECT Z-Index Order with atomic node+label rendering:
    // BACKGROUND LAYER:
    //   1. Background link lines
    //   2. Background link labels
    //   3. Background nodes (atomic: each node circle + label as unit)
    // FOREGROUND LAYER:
    //   4. Foreground link lines
    //   5. Foreground link labels
    //   6. Foreground nodes (atomic: each node circle + label as unit)

    // BACKGROUND LAYER
    // 1. Render all background link lines first
    if (this.renderLinks) {
      this.renderLinks(ctx, this.reusableArrays.backgroundLinks);
    }

    // 2. Render all background link labels
    this.renderLinkLabels(ctx, this.reusableArrays.backgroundLinks);

    // 3. Render background nodes atomically (circle + label per node) - using pre-sorted array
    this.renderNodesWithLabelsAtomically(ctx, this.sortedBackgroundNodes);

    // FOREGROUND LAYER - appears on top of ALL background elements
    // 4. Render all foreground link lines
    if (this.renderLinks) {
      this.renderLinks(ctx, this.reusableArrays.foregroundLinks);
    }

    // 5. Render all foreground link labels
    this.renderLinkLabels(ctx, this.reusableArrays.foregroundLinks);

    // 6. Render foreground nodes atomically (circle + label per node) - always topmost
    this.renderNodesWithLabelsAtomically(ctx, this.sortedForegroundNodes);
  }

  /**
   * Render nodes with atomic circle+label rendering for proper sub-layering
   * OPTIMIZED: Uses pre-sorted nodes and batch rendering when possible
   */
  private renderNodesWithLabelsAtomically(ctx: CanvasRenderingContext2D, sortedNodes: V2Node[]): void {
    if (sortedNodes.length === 0) return;

    try {
      // Use atomic per-node rendering for correct label layering
      // Each node's label must be rendered immediately after the node for proper z-ordering
      for (const node of sortedNodes) {
        // Render node circle first
        if (this.renderNodes) {
          this.renderNodes(ctx, [node]);
        }
        // Render node label immediately after (atomic unit for correct layering)
        if (this.renderNodeLabels) {
          this.renderNodeLabels(ctx, [node]);
        }
      }
    } catch (error) {
      ErrorHandler.logError(error as Error, { nodeCount: sortedNodes.length });
    }
  }

  // Static type order for performance (avoid object creation in hot path)
  private static readonly TYPE_ORDER: Record<string, number> = {
    'Server': 1, 'Database': 2, 'Service': 3, 'Client': 4, 'Gateway': 5
  };

  /**
   * Sort nodes for consistent sub-layer ordering within the same layer
   * OPTIMIZED: Reduced object allocations and string operations
   */
  private sortNodesForSubLayering(nodes: V2Node[]): V2Node[] {
    if (nodes.length <= 1) return [...nodes]; // Skip sorting for 0-1 items

    return [...nodes].sort((a, b) => {
      // 1. Sort by node type importance (using static lookup)
      const aPriority = OptimizedZIndexRenderer.TYPE_ORDER[a.type] ?? 999;
      const bPriority = OptimizedZIndexRenderer.TYPE_ORDER[b.type] ?? 999;
      if (aPriority !== bPriority) return aPriority - bPriority;

      // 2. Sort by node size (larger nodes behind smaller ones for better visibility)
      const aRadius = a.style?.radius ?? 20;
      const bRadius = b.style?.radius ?? 20;
      if (aRadius !== bRadius) return bRadius - aRadius; // larger first (behind)

      // 3. Sort by spatial position (top-left to bottom-right)
      const aY = a.y ?? 0;
      const bY = b.y ?? 0;
      if (aY !== bY) return aY - bY;

      const aX = a.x ?? 0;
      const bX = b.x ?? 0;
      if (aX !== bX) return aX - bX;

      // 4. Fallback: consistent ID ordering (only when needed)
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }

  /**
   * Optimized link label rendering with visibility rules
   */
  private renderLinkLabels(ctx: CanvasRenderingContext2D, links: V2Link[]): void {
    if (!this.styleResolver) return;

    for (const link of links) {
      if (!link.label) continue;

      try {
        const style = this.styleResolver.resolveLinkStyle({
          link,
          isHovered: this.isLinkHovered(link),
          isSelected: this.isLinkSelected(link)
        });

        // Apply visibility rules
        if (!this.shouldShowLinkLabel(style.label || null, link)) continue;

        const midpoint = this.getLinkMidpoint(link);
        if (midpoint) {
          this.renderSingleLinkLabel(ctx, link.label, midpoint.x, midpoint.y, style.label!);
        }
      } catch (error) {
        ErrorHandler.logError(error as Error, { linkId: this.getLinkId(link) });
      }
    }
  }

  /**
   * Visibility logic for link labels (matches requirements)
   */
  private shouldShowLinkLabel(labelStyle: LinkLabelRenderStyle | null, link: V2Link): boolean {
    if (!labelStyle?.enabled) return false;

    const isHovered = this.isLinkHovered(link);
    const isSelected = this.isLinkSelected(link);

    // Always show if selected (highest priority)
    if (isSelected) return true;

    switch (labelStyle.visibility) {
      case 'always': return true;
      case 'hover': return isHovered;
      case 'selection': return isSelected; // Already handled above
      default: return true;
    }
  }

  /**
   * Render a single link label at given coordinates
   */
  private renderSingleLinkLabel(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    style: LinkLabelRenderStyle
  ): void {
    try {
      // Set font first for text measurement
      ctx.font = style.font ?? '10px Arial';

      // Measure text
      const metrics = ctx.measureText(text);
      const textWidth = metrics.width;
      const textHeight = (metrics.actualBoundingBoxAscent || 10) + (metrics.actualBoundingBoxDescent || 4);

      // Calculate background rectangle dimensions
      const rectWidth = textWidth + ((style.paddingX ?? 8) * 2);
      const rectHeight = textHeight + ((style.paddingY ?? 4) * 2);
      const rectX = x - rectWidth / 2;
      const rectY = y - rectHeight / 2;

      // Draw background rectangle
      if (style.backgroundColor && style.backgroundColor !== 'transparent') {
        ctx.fillStyle = style.backgroundColor;
        this.roundRect(ctx, rectX, rectY, rectWidth, rectHeight, style.borderRadius ?? 4);
        ctx.fill();
      }

      // Draw border
      if ((style.borderWidth ?? 0) > 0 && style.borderColor && style.borderColor !== 'transparent') {
        ctx.strokeStyle = style.borderColor;
        ctx.lineWidth = style.borderWidth ?? 1;
        this.roundRect(ctx, rectX, rectY, rectWidth, rectHeight, style.borderRadius ?? 4);
        ctx.stroke();
      }

      // Draw text
      ctx.fillStyle = style.textColor ?? '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y);
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Helper to draw rounded rectangle
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    if (radius === 0) {
      ctx.rect(x, y, width, height);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Update configuration and rebuild adjacency maps
   */
  updateConfig(config: { nodes: V2Node[]; links: V2Link[] }): void {
    this.config = config;
    this.buildAdjacencyMaps();
    // Clear cached sorted arrays since data changed
    this.sortedBackgroundNodes.length = 0;
    this.sortedForegroundNodes.length = 0;
  }


  /**
   * Destroy and clean up resources
   */
  destroy(): void {
    this.config = undefined;
    this.styleResolver = undefined;
    this.nodeToLinksMap.clear();
    this.linkToNodesMap.clear();
    this.clearReusableArrays();
  }
}