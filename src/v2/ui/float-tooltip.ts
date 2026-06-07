/**
 * V2 Canvas Graph - Float Tooltip Integration
 *
 * Following force-graph pattern with float-tooltip library
 */

import Tooltip from 'float-tooltip';
import { V2Node, V2Link } from '../types';
import { ErrorHandler } from '../utils';

export interface TooltipConfig {
  nodeLabel?: (node: V2Node) => string | null;
  linkLabel?: (link: V2Link) => string | null;
  enabled?: boolean;
}

export class FloatTooltipManager {
  private tooltip: Tooltip | null = null;
  private container: HTMLElement;
  private config: TooltipConfig;
  private isDestroyed = false;

  constructor(container: HTMLElement, config: TooltipConfig = {}) {
    this.container = container;
    this.config = {
      enabled: true,
      nodeLabel: (node: V2Node) => `Node : ${node.label || node.id || 'Unlabeled'}`,
      linkLabel: (link: V2Link) => {
        const sourceLabel = typeof link.source === 'string'
          ? link.source
          : (link.source.label || link.source.id);
        const targetLabel = typeof link.target === 'string'
          ? link.target
          : (link.target.label || link.target.id);
        return `${sourceLabel} → ${targetLabel}`;
      },
      ...config
    };
  }

  /**
   * Initialize tooltip system following force-graph pattern
   */
  initialize(): void {
    try {
      if (this.isDestroyed || !this.config.enabled) return;

      // Create tooltip instance (force-graph line 520 pattern)
      this.tooltip = new Tooltip(this.container);

      // float-tooltip doesn't have a style method, styling is done via CSS
      // The library creates its own styled element

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Show tooltip for node (force-graph pattern)
   */
  showNodeTooltip(node: V2Node): void {
    try {
      if (this.isDestroyed || !this.tooltip || !this.config.enabled) {
        return;
      }

      // Use node.tooltip property directly, fallback to config function if available
      const content = node.tooltip || (this.config.nodeLabel ? this.config.nodeLabel(node) : node.label || '');
      if (content) {
        this.tooltip.content(content);
      }

    } catch (error) {
      ErrorHandler.logError(error as Error, { nodeId: node.id });
    }
  }

  /**
   * Show tooltip for link (force-graph pattern)
   */
  showLinkTooltip(link: V2Link): void {
    try {
      if (this.isDestroyed || !this.tooltip || !this.config.enabled) {
        return;
      }

      // Use link.tooltip property directly, fallback to config function if available
      const content = link.tooltip || (this.config.linkLabel ? this.config.linkLabel(link) : link.label || '');
      if (content) {
        this.tooltip.content(content);
      }

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Hide tooltip (force-graph pattern)
   */
  hideTooltip(): void {
    try {
      if (this.isDestroyed || !this.tooltip) return;

      // Set content to null to hide (force-graph line 636 pattern)
      this.tooltip.content(null);

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Update tooltip configuration
   */
  updateConfig(newConfig: Partial<TooltipConfig>): void {
    if (this.isDestroyed) return;

    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Destroy tooltip system
   */
  destroy(): void {
    try {
      if (this.tooltip) {
        this.tooltip.content(null);
        // float-tooltip doesn't have explicit destroy, just remove content
        this.tooltip = null;
      }

      this.isDestroyed = true;

    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Check if tooltip is available
   */
  isAvailable(): boolean {
    return !this.isDestroyed && !!this.tooltip && this.config.enabled !== false;
  }
}