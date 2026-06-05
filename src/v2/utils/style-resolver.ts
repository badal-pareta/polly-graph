/**
 * V2 Canvas Graph - Style Resolver
 *
 * V1-compatible style resolution with hover and selection states
 */

import { V2Node, V2Link, NodeRenderStyle, LinkRenderStyle, LinkLabelRenderStyle } from '../types';
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
    length: 8, // Slightly larger for better visibility
    width: 6,
    fill: NeutralColor.PURPLE
  },
  label: DEFAULT_LINK_LABEL_STYLE
};

export const DEFAULT_LINK_INTERACTION_STYLE: Partial<LinkRenderStyle> = {
  strokeWidth: 3, // KG component hover strokeWidth
  opacity: 1.0, // KG component hover opacity
  arrow: {
    enabled: true,
    length: 8,
    width: 6,
    fill: NeutralColor.PURPLE // Match link color
  }
};

// V1-compatible interaction configuration
export interface HoverInteractionConfig {
  readonly enabled?: boolean;
  readonly nodeStyle?: Partial<NodeRenderStyle>;
  readonly linkStyle?: Partial<LinkRenderStyle>;
}

export interface SelectionInteractionConfig {
  readonly enabled?: boolean;
  readonly nodeStyle?: Partial<NodeRenderStyle>;
  readonly linkStyle?: Partial<LinkRenderStyle>;
}

export interface InteractionConfig {
  readonly hover?: HoverInteractionConfig;
  readonly selection?: SelectionInteractionConfig;
}

// Enhanced node/link types with style support
export interface V2NodeWithStyle extends V2Node {
  style?: Partial<NodeRenderStyle>;
}

export interface V2LinkWithStyle extends V2Link {
  style?: Partial<LinkRenderStyle>;
}

export class StyleResolver {
  private interactionConfig?: InteractionConfig;

  constructor(interactionConfig?: InteractionConfig) {
    this.interactionConfig = interactionConfig;
  }

  /**
   * Resolve node style using V1-compatible approach
   */
  resolveNodeStyle(params: {
    node: V2NodeWithStyle;
    isHovered?: boolean;
    isSelected?: boolean;
  }): NodeRenderStyle {
    const { node, isHovered, isSelected } = params;

    // Start with node's individual style or defaults
    let result: NodeRenderStyle = {
      ...DEFAULT_NODE_STYLE,
      ...node.style
    };

    // Apply interaction styles (V1 pattern: selection takes precedence over hover)
    if (isSelected) {
      const interactionStyle = this.mergeNodeStyleSmart(
        DEFAULT_NODE_INTERACTION_STYLE,
        this.interactionConfig?.selection?.nodeStyle
      );
      result = { ...result, ...interactionStyle };
    } else if (isHovered) {
      const interactionStyle = this.mergeNodeStyleSmart(
        DEFAULT_NODE_INTERACTION_STYLE,
        this.interactionConfig?.hover?.nodeStyle
      );
      result = { ...result, ...interactionStyle };
    }

    return result;
  }

  /**
   * Resolve link style using V1-compatible approach
   */
  resolveLinkStyle(params: {
    link: V2LinkWithStyle;
    isHovered?: boolean;
    isSelected?: boolean;
  }): LinkRenderStyle {
    const { link, isHovered, isSelected } = params;

    // Start with link's individual style or defaults
    let result: LinkRenderStyle = {
      ...DEFAULT_LINK_STYLE,
      ...link.style
    };

    // Apply interaction styles (selection takes precedence over hover)
    if (isSelected) {
      const interactionStyle = this.mergeLinkStyleSmart(
        DEFAULT_LINK_INTERACTION_STYLE,
        this.interactionConfig?.selection?.linkStyle
      );
      result = { ...result, ...interactionStyle };
    } else if (isHovered) {
      const interactionStyle = this.mergeLinkStyleSmart(
        DEFAULT_LINK_INTERACTION_STYLE,
        this.interactionConfig?.hover?.linkStyle
      );
      result = { ...result, ...interactionStyle };
    }

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

    const result: any = { ...override };

    // Smart defaults: only apply base stroke if override specifies strokeWidth but no stroke
    if (override.strokeWidth !== undefined && override.stroke === undefined && base.stroke !== undefined) {
      result.stroke = base.stroke;
    }

    // For other properties, only apply base if not specified in override
    const baseKeys = Object.keys(base) as Array<keyof NodeRenderStyle>;
    baseKeys.forEach(key => {
      if (key !== 'stroke' && override[key] === undefined && base[key] !== undefined) {
        result[key] = base[key];
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

    const result: any = { ...override };

    // Apply base properties if not specified in override
    const baseKeys = Object.keys(base) as Array<keyof LinkRenderStyle>;
    baseKeys.forEach(key => {
      if (override[key] === undefined && base[key] !== undefined) {
        if (key === 'arrow' && base.arrow) {
          result.arrow = { ...base.arrow, ...override.arrow };
        } else {
          result[key] = base[key];
        }
      }
    });

    return result;
  }

  /**
   * Update interaction configuration
   */
  updateInteractionConfig(config: InteractionConfig): void {
    this.interactionConfig = config;
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