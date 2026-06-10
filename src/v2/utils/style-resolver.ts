/**
 * V2 Canvas Graph - Style Resolver
 *
 * V1-compatible style resolution with hover and selection states
 */

import { V2Node, V2Link, NodeRenderStyle, LinkRenderStyle, LinkLabelRenderStyle, InteractionConfig } from '../types';
import { PrimaryColor, NeutralColor, StandardColor } from '../../shared/constants';

// KG co-scientist graph compatible default styles
export const DEFAULT_NODE_STYLE: NodeRenderStyle = {
  fill: PrimaryColor.PURPLE, // Default purple from KG component
  stroke: `color-mix(in srgb, ${PrimaryColor.PURPLE}, ${StandardColor.BLACK} 20%)`, // Darkened border
  strokeWidth: 1, // KG component exact value
  radius: 20, // KG component exact value
  opacity: 1.0
};

// KG component interaction styles
export const DEFAULT_NODE_INTERACTION_STYLE: Partial<NodeRenderStyle> = {
  strokeWidth: 3, // Hover strokeWidth from KG component
  // Selection uses radius: 24 and strokeWidth: 4 (handled separately in interaction config)
};

// Default highlight style (between hover and selection in precedence)
export const DEFAULT_NODE_HIGHLIGHT_STYLE: Partial<NodeRenderStyle> = {
  fill: '#fbbf24', // Amber highlight color
  stroke: '#f59e0b', // Darker amber border
  strokeWidth: 2, // Highlighted border
  opacity: 1.0
};

export const DEFAULT_LINK_LABEL_STYLE: LinkLabelRenderStyle = {
  enabled: true,
  visibility: 'always',
  text: '',
  font: '10px Arial',
  textColor: `color-mix(in srgb, ${PrimaryColor.PURPLE}, ${StandardColor.BLACK} 40%)`,
  backgroundColor: `color-mix(in srgb, ${PrimaryColor.PURPLE}, ${StandardColor.WHITE} 90%)`,
  borderColor: `color-mix(in srgb, ${PrimaryColor.PURPLE}, ${StandardColor.WHITE} 10%)`,
  borderWidth: 1.5,
  borderRadius: 4,
  paddingX: 8,
  paddingY: 4
};

export const DEFAULT_LINK_STYLE: LinkRenderStyle = {
  stroke: NeutralColor.PURPLE,
  strokeWidth: 2,
  opacity: 0.8,
  arrow: {
    enabled: true,
    size: 8, // Slightly larger for better visibility
    fill: NeutralColor.PURPLE
  },
  label: DEFAULT_LINK_LABEL_STYLE
};

export const DEFAULT_LINK_INTERACTION_STYLE: Partial<LinkRenderStyle> = {
  strokeWidth: 3, // KG component hover strokeWidth
  opacity: 1.0, // KG component hover opacity
  arrow: {
    enabled: true,
    size: 8,
    fill: NeutralColor.PURPLE // Match link color
  }
};

// V1-compatible interaction configuration
// export interface HoverInteractionConfig {
//   readonly enabled?: boolean;
//   readonly nodeStyle?: Partial<NodeRenderStyle>;
//   readonly linkStyle?: Partial<LinkRenderStyle>;
// }

// export interface SelectionInteractionConfig {
//   readonly enabled?: boolean;
//   readonly nodeStyle?: Partial<NodeRenderStyle>;
//   readonly linkStyle?: Partial<LinkRenderStyle>;
// }

// export interface InteractionConfig {
//   readonly hover?: HoverInteractionConfig;
//   readonly selection?: SelectionInteractionConfig;
// }

// Enhanced node/link types with style support
export interface V2NodeWithStyle extends V2Node {
  style?: Partial<NodeRenderStyle>;
}

export interface V2LinkWithStyle extends V2Link {
  style?: Partial<LinkRenderStyle>;
}

// interface LinkStyleCacheKey {
//   linkId: string;
//   hasCustomStyle: boolean;
//   isHovered: boolean;
//   isSelected: boolean;
//   interactionConfigHash: string;
// }

export class StyleResolver {
  private interactionConfig?: InteractionConfig;

  // Style caches (Step 4 optimization)
  private nodeStyleCache = new Map<string, NodeRenderStyle>();
  private linkStyleCache = new Map<string, LinkRenderStyle>();
  private interactionConfigHash = '';

  constructor(interactionConfig?: InteractionConfig) {
    this.interactionConfig = interactionConfig;
    this.updateInteractionConfigHash();
  }

  /**
   * Generate interaction config hash for cache invalidation (Step 4 optimization)
   */
  private updateInteractionConfigHash(): void {
    this.interactionConfigHash = this.interactionConfig
      ? JSON.stringify(this.interactionConfig)
      : 'default';
  }

  /**
   * Generate cache key for node styles (Step 4 optimization)
   */
  private createNodeCacheKey(node: V2NodeWithStyle, isHovered: boolean, isSelected: boolean, isHighlighted: boolean = false): string {
    return `${node.id}_${!!node.style}_${isHovered}_${isSelected}_${isHighlighted}_${this.interactionConfigHash}`;
  }

  /**
   * Generate cache key for link styles (Step 4 optimization)
   */
  private createLinkCacheKey(link: V2LinkWithStyle, isHovered: boolean, isSelected: boolean): string {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    const linkId = `${sourceId}->${targetId}`;
    return `${linkId}_${!!link.style}_${isHovered}_${isSelected}_${this.interactionConfigHash}`;
  }

  /**
   * Resolve node style using V1-compatible approach with caching (Step 4 optimization)
   */
  resolveNodeStyle(params: {
    node: V2NodeWithStyle;
    isHovered?: boolean;
    isSelected?: boolean;
    isHighlighted?: boolean;
  }): NodeRenderStyle {
    const { node, isHovered = false, isSelected = false, isHighlighted = false } = params;

    // Check cache first (Step 4 optimization)
    const cacheKey = this.createNodeCacheKey(node, isHovered, isSelected, isHighlighted);
    const cached = this.nodeStyleCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fast path: no interaction states, avoid object spreading
    if (!isHovered && !isSelected && !isHighlighted) {
      const result = node.style ? { ...DEFAULT_NODE_STYLE, ...node.style } : DEFAULT_NODE_STYLE;
      this.nodeStyleCache.set(cacheKey, result);
      return result;
    }

    // Start with node's individual style or defaults
    let result: NodeRenderStyle = {
      ...DEFAULT_NODE_STYLE,
      ...node.style
    };

    // Apply interaction styles with precedence: Default → Hover → Highlight → Selected
    if (isSelected) {
      const interactionStyle = this.mergeNodeStyleSmart(
        DEFAULT_NODE_INTERACTION_STYLE,
        this.interactionConfig?.selection?.nodeStyle
      );
      result = { ...result, ...interactionStyle };
    } else if (isHighlighted) {
      // Apply highlight style (precedence over hover but under selection)
      const highlightStyle = this.mergeNodeStyleSmart(
        DEFAULT_NODE_HIGHLIGHT_STYLE,
        this.interactionConfig?.highlight?.nodeStyle
      );
      result = { ...result, ...highlightStyle };
    } else if (isHovered) {
      const interactionStyle = this.mergeNodeStyleSmart(
        DEFAULT_NODE_INTERACTION_STYLE,
        this.interactionConfig?.hover?.nodeStyle
      );
      result = { ...result, ...interactionStyle };
    }

    // Cache the result before returning (Step 4 optimization)
    this.nodeStyleCache.set(cacheKey, result);
    return result;
  }

  /**
   * Resolve link style using V1-compatible approach with caching (Step 4 optimization)
   */
  resolveLinkStyle(params: {
    link: V2LinkWithStyle;
    isHovered?: boolean;
    isSelected?: boolean;
  }): LinkRenderStyle {
    const { link, isHovered = false, isSelected = false } = params;

    // Check cache first (Step 4 optimization)
    const cacheKey = this.createLinkCacheKey(link, isHovered, isSelected);
    const cached = this.linkStyleCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fast path: no interaction states, avoid object spreading
    if (!isHovered && !isSelected) {
      const result = link.style ? {
        ...DEFAULT_LINK_STYLE,
        ...link.style,
        // Deep merge label styles to preserve default styling
        label: link.style.label ? {
          ...DEFAULT_LINK_STYLE.label,
          ...link.style.label
        } : DEFAULT_LINK_STYLE.label
      } : DEFAULT_LINK_STYLE;

      // Auto-sync arrow fill with link color (even for normal state)
      if (result.arrow?.enabled && result.stroke) {
        const hasExplicitArrowFill = link.style?.arrow?.fill !== undefined;
        if (!hasExplicitArrowFill) {
          result.arrow = {
            ...result.arrow,
            fill: result.stroke
          };
        }
      }

      this.linkStyleCache.set(cacheKey, result);
      return result;
    }

    // Start with link's individual style or defaults
    let result: LinkRenderStyle = {
      ...DEFAULT_LINK_STYLE,
      ...link.style,
      // Deep merge label styles to preserve default styling
      label: link.style?.label ? {
        ...DEFAULT_LINK_STYLE.label,
        ...link.style.label
      } : DEFAULT_LINK_STYLE.label
    };

    // Apply interaction styles (selection takes precedence over hover)
    if (isSelected) {
      const interactionStyle = this.mergeLinkStyleSmart(
        DEFAULT_LINK_INTERACTION_STYLE,
        this.interactionConfig?.selection?.linkStyle as Partial<LinkRenderStyle>
      );
      result = { ...result, ...interactionStyle };
    } else if (isHovered) {
      const interactionStyle = this.mergeLinkStyleSmart(
        DEFAULT_LINK_INTERACTION_STYLE,
        this.interactionConfig?.hover?.linkStyle as Partial<LinkRenderStyle>
      );
      result = { ...result, ...interactionStyle };
    }

    // Auto-sync arrow fill with link color (only if arrow fill not explicitly overridden)
    if (result.arrow?.enabled && result.stroke) {
      // Check if arrow fill was explicitly provided (not default)
      const hasExplicitArrowFill = (
        (link.style?.arrow?.fill !== undefined) ||
        (isSelected && this.interactionConfig?.selection?.linkStyle?.arrow?.fill !== undefined) ||
        (isHovered && this.interactionConfig?.hover?.linkStyle?.arrow?.fill !== undefined)
      );

      // Only auto-sync if no explicit arrow fill override
      if (!hasExplicitArrowFill) {
        result.arrow = {
          ...result.arrow,
          fill: result.stroke
        };
      }
    }

    // Cache the result before returning (Step 4 optimization)
    this.linkStyleCache.set(cacheKey, result);
    return result;
  }

  /**
   * V1-compatible smart merge for node styles
   */
  private mergeNodeStyleSmart(
    base: Partial<NodeRenderStyle>,
    override?: Partial<NodeRenderStyle>
  ): Partial<NodeRenderStyle> {
    if (!override) return base;

    const result: Partial<NodeRenderStyle> = { ...override };

    // Smart defaults: only apply base stroke if override specifies strokeWidth but no stroke
    if (override.strokeWidth !== undefined && override.stroke === undefined && base.stroke !== undefined) {
      result.stroke = base.stroke;
    }

    // For other properties, only apply base if not specified in override
    const baseKeys = Object.keys(base) as Array<keyof NodeRenderStyle>;
    baseKeys.forEach(key => {
      if (key !== 'stroke' && override[key] === undefined && base[key] !== undefined) {
        (result as Record<string, unknown>)[key] = base[key];
      }
    });

    return result;
  }

  /**
   * V1-compatible smart merge for link styles
   */
  private mergeLinkStyleSmart(
    base: Partial<LinkRenderStyle>,
    override?: Partial<LinkRenderStyle>
  ): Partial<LinkRenderStyle> {
    if (!override) return base;

    const result: Partial<LinkRenderStyle> = { ...override };

    // Apply base properties if not specified in override
    const baseKeys = Object.keys(base) as Array<keyof LinkRenderStyle>;
    baseKeys.forEach(key => {
      if (override[key] === undefined && base[key] !== undefined) {
        if (key === 'arrow' && base.arrow) {
          result.arrow = { ...base.arrow, ...override.arrow };
        } else {
          (result as Record<string, unknown>)[key] = base[key];
        }
      }
    });

    return result;
  }

  /**
   * Update interaction configuration and clear cache (Step 4 optimization)
   */
  updateInteractionConfig(config: InteractionConfig): void {
    this.interactionConfig = config;
    this.updateInteractionConfigHash();
    // Clear caches when interaction config changes
    this.clearStyleCache();
  }

  /**
   * Clear style caches (Step 4 optimization)
   */
  clearStyleCache(): void {
    this.nodeStyleCache.clear();
    this.linkStyleCache.clear();
  }

  /**
   * Get cache statistics for monitoring (Step 4 optimization)
   */
  getCacheStats(): {
    nodeCache: { size: number; hitRatio?: number };
    linkCache: { size: number; hitRatio?: number };
  } {
    return {
      nodeCache: { size: this.nodeStyleCache.size },
      linkCache: { size: this.linkStyleCache.size }
    };
  }

  /**
   * Get current interaction configuration
   */
  getInteractionConfig(): InteractionConfig | undefined {
    return this.interactionConfig;
  }
}

/**
 * Create style resolver with interaction configuration
 */
export function createStyleResolver(config?: InteractionConfig): StyleResolver {
  return new StyleResolver(config);
}