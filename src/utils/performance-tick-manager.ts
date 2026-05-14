/**
 * Performance-optimized tick manager for framework-independent graph rendering.
 * Implements throttling, batching, and conditional updates to improve performance.
 */

import { Selection } from 'd3-selection';
import { GraphNode, GraphLink } from '../contracts/graph.types';
import { RenderableGraphLink, getShortenedSourcePoint, getShortenedTargetPoint } from '../renderer/links';
import { RenderableLinkLabel } from '../renderer/link-labels';
import { getLinkTargetPoint } from './get-link-target-point';

interface TickManagerConfig {
  readonly frameRate?: number; // Target FPS (default: 30)
  readonly positionThreshold?: number; // Minimum movement to trigger update (default: 0.5px)
  readonly batchSize?: number; // Max DOM operations per frame (default: 50)
  readonly enableThrottling?: boolean; // Enable frame rate throttling (default: true)
}

interface CachedLabelDimensions {
  readonly width: number;
  readonly height: number;
  readonly x: number;
  readonly y: number;
  readonly textContent: string;
}

interface TickState {
  lastUpdateTime: number;
  frameInterval: number;
  labelDimensionsCache: Map<string, CachedLabelDimensions>;
  lastPositions: Map<string, { x: number; y: number }>;
  pendingUpdates: Set<string>;
}

export class PerformanceTickManager {
  private readonly config: Required<TickManagerConfig>;
  private readonly state: TickState;
  private animationFrameId: number | null = null;
  private isDestroyed = false;

  constructor(config: TickManagerConfig = {}) {
    this.config = {
      frameRate: config.frameRate ?? 30,
      positionThreshold: config.positionThreshold ?? 0.5,
      batchSize: config.batchSize ?? 50,
      enableThrottling: config.enableThrottling ?? true
    };

    this.state = {
      lastUpdateTime: 0,
      frameInterval: 1000 / this.config.frameRate,
      labelDimensionsCache: new Map(),
      lastPositions: new Map(),
      pendingUpdates: new Set()
    };
  }

  /**
   * Optimized tick handler with throttling and batching
   */
  createTickHandler(selections: {
    linkSelection: Selection<SVGLineElement, RenderableGraphLink, any, unknown>;
    linkLabelSelection: Selection<SVGGElement, RenderableLinkLabel, any, unknown>;
    nodeSelection: Selection<SVGCircleElement, GraphNode, any, unknown>;
    labelSelection: Selection<SVGTextElement, GraphNode, any, unknown>;
    tooltipBinding?: { reposition(): void } | null;
  }) {
    return (): void => {
      if (this.isDestroyed) return;

      const now = performance.now();

      // Throttle updates based on target frame rate
      if (this.config.enableThrottling && now - this.state.lastUpdateTime < this.state.frameInterval) {
        return;
      }

      this.state.lastUpdateTime = now;

      // Update link positions (these are fast, update every frame)
      this.updateLinkPositions(selections.linkSelection);

      // Update node positions (fast operations)
      this.updateNodePositions(selections.nodeSelection, selections.labelSelection);

      // Batch link label updates (expensive operations)
      this.scheduleFrameUpdate(() => {
        this.updateLinkLabels(selections.linkLabelSelection);
        selections.tooltipBinding?.reposition();
      });
    };
  }

  /**
   * Fast link position updates - now with proper source and target offsets
   */
  private updateLinkPositions(linkSelection: Selection<SVGLineElement, RenderableGraphLink, any, unknown>): void {
    linkSelection
      .attr('x1', (item: RenderableGraphLink): number => getShortenedSourcePoint(item.link, item.style).x)
      .attr('y1', (item: RenderableGraphLink): number => getShortenedSourcePoint(item.link, item.style).y)
      .attr('x2', (item: RenderableGraphLink): number => getShortenedTargetPoint(item.link, item.style).x)
      .attr('y2', (item: RenderableGraphLink): number => getShortenedTargetPoint(item.link, item.style).y);
  }

  /**
   * Fast node position updates
   */
  private updateNodePositions(
    nodeSelection: Selection<SVGCircleElement, GraphNode, any, unknown>,
    labelSelection: Selection<SVGTextElement, GraphNode, any, unknown>
  ): void {
    nodeSelection
      .attr('cx', (d: GraphNode) => d.x ?? 0)
      .attr('cy', (d: GraphNode) => d.y ?? 0);

    labelSelection
      .attr('x', (d: GraphNode) => d.x ?? 0)
      .attr('y', (d: GraphNode) => d.y ?? 0);
  }

  /**
   * Optimized link label updates with caching and conditional updates
   */
  private updateLinkLabels(linkLabelSelection: Selection<SVGGElement, RenderableLinkLabel, any, unknown>): void {
    let updateCount = 0;

    linkLabelSelection
      .attr('transform', (item: RenderableLinkLabel): string => {
        const link: GraphLink = item.link;
        const source: GraphNode = link.source as GraphNode;
        const targetPoint = getLinkTargetPoint(link);
        const x: number = ((source.x ?? 0) + targetPoint.x) / 2;
        const y: number = ((source.y ?? 0) + targetPoint.y) / 2;

        // Check if position changed significantly
        const linkId = this.getLinkId(link);
        const lastPos = this.state.lastPositions.get(linkId);

        if (lastPos &&
            Math.abs(lastPos.x - x) < this.config.positionThreshold &&
            Math.abs(lastPos.y - y) < this.config.positionThreshold) {
          // Position hasn't changed significantly, skip expensive operations
          return `translate(${lastPos.x}, ${lastPos.y})`;
        }

        // Update position cache
        this.state.lastPositions.set(linkId, { x, y });
        this.state.pendingUpdates.add(linkId);

        return `translate(${x}, ${y})`;
      })
      .each((item: RenderableLinkLabel, i: number, nodes: ArrayLike<SVGGElement>): void => {
        // Batch DOM measurements to prevent layout thrashing
        if (updateCount >= this.config.batchSize) {
          return;
        }

        const group: SVGGElement = nodes[i] as SVGGElement;
        const linkId = this.getLinkId(item.link);

        // Only update if position changed or not cached
        if (!this.state.pendingUpdates.has(linkId)) {
          return;
        }

        this.updateLabelDimensions(group, item, linkId);
        this.state.pendingUpdates.delete(linkId);
        updateCount++;
      });
  }

  /**
   * Update label dimensions with caching
   */
  private updateLabelDimensions(group: SVGGElement, item: RenderableLinkLabel, linkId: string): void {
    const text = group.querySelector('text') as SVGTextElement | null;
    const rect = group.querySelector('rect') as SVGRectElement | null;

    if (!text || !rect) return;

    const textContent = text.textContent || '';
    const cached = this.state.labelDimensionsCache.get(linkId);

    // Check if we can use cached dimensions
    if (cached && cached.textContent === textContent) {
      rect.setAttribute('x', String(cached.x));
      rect.setAttribute('y', String(cached.y));
      rect.setAttribute('width', String(cached.width));
      rect.setAttribute('height', String(cached.height));
      return;
    }

    // Measure and cache dimensions
    const bBox: DOMRect = text.getBBox();
    const padding: number = 6;
    const dimensions: CachedLabelDimensions = {
      width: bBox.width + padding * 2,
      height: bBox.height + padding * 2,
      x: bBox.x - padding,
      y: bBox.y - padding,
      textContent
    };

    this.state.labelDimensionsCache.set(linkId, dimensions);

    rect.setAttribute('x', String(dimensions.x));
    rect.setAttribute('y', String(dimensions.y));
    rect.setAttribute('width', String(dimensions.width));
    rect.setAttribute('height', String(dimensions.height));
  }

  /**
   * Schedule updates using requestAnimationFrame for better performance
   */
  private scheduleFrameUpdate(callback: () => void): void {
    if (this.animationFrameId !== null) {
      return; // Already scheduled
    }

    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = null;
      callback();
    });
  }

  /**
   * Generate unique ID for link caching
   */
  private getLinkId(link: GraphLink): string {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    return `${sourceId}::${targetId}::${link.label ?? ''}`;
  }

  /**
   * Clear caches when graph data changes
   */
  clearCaches(): void {
    this.state.labelDimensionsCache.clear();
    this.state.lastPositions.clear();
    this.state.pendingUpdates.clear();
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<TickManagerConfig>): void {
    Object.assign(this.config, newConfig);
    this.state.frameInterval = 1000 / this.config.frameRate;
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      cacheSize: this.state.labelDimensionsCache.size,
      pendingUpdates: this.state.pendingUpdates.size,
      lastFrameTime: this.state.lastUpdateTime,
      frameInterval: this.state.frameInterval
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.isDestroyed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.clearCaches();
  }
}