import { GraphNode, NodeStyle } from '../contracts/graph.types';
import { GraphInteractionConfig } from '../contracts/graph-config.interface';
import { PrimaryColor, StandardColor } from '../../shared/constants';

interface ResolveNodeStyleParams {
  readonly node: GraphNode;
  readonly interaction?: GraphInteractionConfig;
  readonly isHovered?: boolean;
  readonly isSelected?: boolean;
}

const DEFAULT_NODE_HOVER_STYLE: Partial<NodeStyle> = {
  stroke: `color-mix(in srgb, ${PrimaryColor.PURPLE}, ${StandardColor.BLACK} 20%)`,
  strokeWidth: 3,
};

export function resolveNodeStyle(params: ResolveNodeStyleParams): Partial<NodeStyle> | undefined {
  if (params.isSelected) {
    return mergeNodeStyleSmart(DEFAULT_NODE_HOVER_STYLE, params.interaction?.selection?.nodeStyle);
  }

  if (params.isHovered) {
    return mergeNodeStyleSmart(DEFAULT_NODE_HOVER_STYLE, params.interaction?.hover?.nodeStyle);
  }

  return undefined;
}


/**
 * Mutable version of NodeStyle for building style objects
 */
type MutableNodeStyle = {
  -readonly [K in keyof NodeStyle]?: NodeStyle[K];
};

/**
 * Smart merge that only applies base defaults when override doesn't provide alternatives
 * Prevents unwanted base styles from being forced on consumers
 */
function mergeNodeStyleSmart(base: Partial<NodeStyle>, override?: Partial<NodeStyle>): Partial<NodeStyle> {
  // If no override provided, return base (but this should rarely happen)
  if (!override) return base;

  // Start with override styles - use mutable type for construction
  const result: MutableNodeStyle = { ...override };

  // Smart defaults: only apply base stroke if override specifies strokeWidth but no stroke
  if (override.strokeWidth !== undefined && override.stroke === undefined && base.stroke !== undefined) {
    // User wants a stroke (specified strokeWidth) but didn't specify color
    // So we can safely apply the base stroke color
    result.stroke = base.stroke;
  }

  // For other properties, only apply base if not specified in override
  const baseKeys = Object.keys(base) as Array<keyof NodeStyle>;
  baseKeys.forEach(key => {
    if (key !== 'stroke' && override[key] === undefined && base[key] !== undefined) {
      // TypeScript-safe assignment
      switch (key) {
        case 'fill':
          result.fill = base.fill;
          break;
        case 'strokeWidth':
          result.strokeWidth = base.strokeWidth;
          break;
        case 'opacity':
          result.opacity = base.opacity;
          break;
        case 'radius':
          result.radius = base.radius;
          break;
        case 'textColor':
          result.textColor = base.textColor;
          break;
      }
    }
  });

  return result;
}