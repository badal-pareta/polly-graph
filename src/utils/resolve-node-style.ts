import { GraphNode, NodeStyle } from '../contracts/graph.types';
import { GraphInteractionConfig } from '../contracts/graph-config.interface';
import { PrimaryColor, StandardColor } from '../constants/colors';

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
    return mergeNodeStyle(DEFAULT_NODE_HOVER_STYLE, params.interaction?.selection?.nodeStyle);
  }

  if (params.isHovered) {
    return mergeNodeStyle(DEFAULT_NODE_HOVER_STYLE, params.interaction?.hover?.nodeStyle);
  }

  return undefined;
}

function mergeNodeStyle(base: Partial<NodeStyle>, override?: Partial<NodeStyle>): Partial<NodeStyle> {
  return {
    ...base,
    ...override,
  };
}