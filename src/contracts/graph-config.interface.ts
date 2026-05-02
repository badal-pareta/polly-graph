import { GraphControlsConfig } from './graph-controls.interface';
import { GraphNode, GraphLink, NodeStyle, LinkStyle } from './graph.types';

export type GraphTooltipTheme = 'dark' | 'light';
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export interface TooltipInteractionConfig {
  readonly enabled?: boolean;
  readonly theme?: GraphTooltipTheme;
  readonly placement?: TooltipPlacement; 
  readonly renderContent?: (node: GraphNode) => string;
}

export interface HoverInteractionConfig {
  readonly enabled?: boolean;
  readonly tooltip?: TooltipInteractionConfig;
  readonly nodeStyle?: Partial<NodeStyle>;
  readonly linkStyle?: Partial<LinkStyle>;
}

export interface SelectionInteractionConfig {
  readonly enabled?: boolean;
  readonly multiSelect?: boolean;
  readonly nodeStyle?: Partial<NodeStyle>;
  readonly linkStyle?: Partial<LinkStyle>;
}

export interface DragInteractionConfig {
  readonly enabled?: boolean;
}

export interface GraphInteractionConfig {
  readonly drag?: DragInteractionConfig;
  readonly hover?: HoverInteractionConfig;
  readonly selection?: SelectionInteractionConfig;
}

export interface GraphConfig {
  readonly container: SVGSVGElement;
  readonly nodes: GraphNode[];
  readonly links: GraphLink[];
  readonly interaction?: GraphInteractionConfig;
  readonly controls?: GraphControlsConfig;
}

export interface ControlsController {
  mount(): void;
  destroy(): void;
}