/**
 * V2 Canvas Graph - Performance Metrics Manager
 *
 * Centralized performance tracking for rendering operations.
 * Extracted from Renderer to follow single responsibility principle.
 */

import { StatsMetrics } from '../types/generic.types';

export class PerformanceMetricsManager {
  private metrics: StatsMetrics = {
    renderTotal: 0,
    renderNodes: 0,
    renderLinks: 0,
    renderLinkLabels: 0,
    renderNodeLabels: 0,
    styleResolution: 0,
    hoverChecks: 0,
    canvasCalls: 0,
    frameCount: 0
  };

  /**
   * Increment frame count
   */
  incrementFrame(): void {
    this.metrics.frameCount++;
  }

  /**
   * Add timing for a specific metric
   */
  addTiming(metric: keyof StatsMetrics, time: number): void {
    this.metrics[metric] += time;
  }

  /**
   * Get current metrics (copy to prevent mutation)
   */
  getMetrics(): StatsMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = {
      renderTotal: 0,
      renderNodes: 0,
      renderLinks: 0,
      renderLinkLabels: 0,
      renderNodeLabels: 0,
      styleResolution: 0,
      hoverChecks: 0,
      canvasCalls: 0,
      frameCount: 0
    };
  }

  /**
   * Log performance metrics for analysis
   */
  logMetrics(nodeCount: number, linkCount: number): void {
    const frames = this.metrics.frameCount;

    console.log('🔍 PERFORMANCE METRICS (avg per frame over', frames, 'frames):');
    console.log('📊 Graph size:', nodeCount, 'nodes,', linkCount, 'links');
    console.log('⏱️  Total render:', (this.metrics.renderTotal / frames).toFixed(2), 'ms');
    console.log('🔗 Links render:', (this.metrics.renderLinks / frames).toFixed(2), 'ms');
    console.log('🏷️  Link labels:', (this.metrics.renderLinkLabels / frames).toFixed(2), 'ms');
    console.log('⭕ Nodes render:', (this.metrics.renderNodes / frames).toFixed(2), 'ms');
    console.log('📝 Node labels:', (this.metrics.renderNodeLabels / frames).toFixed(2), 'ms');
    console.log('🎨 Style resolution:', (this.metrics.styleResolution / frames).toFixed(2), 'ms');
    console.log('👆 Hover checks:', (this.metrics.hoverChecks / frames).toFixed(2), 'ms');
    console.log('🖼️  Canvas calls:', (this.metrics.canvasCalls / frames).toFixed(2), 'ms');
    console.log('---');
  }

  /**
   * Check if it's time to log metrics (every N frames)
   */
  shouldLogMetrics(intervalFrames: number = 100): boolean {
    return this.metrics.frameCount % intervalFrames === 0 && this.metrics.frameCount > 0;
  }
}