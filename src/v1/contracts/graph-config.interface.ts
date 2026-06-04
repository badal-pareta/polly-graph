import { GraphControlsConfig } from './graph-controls.interface';
import { LegendConfig } from './graph-legends.interface';
import { GraphNode, GraphLink, NodeStyle, LinkStyle } from './graph.types';
import { EnhancedSimulationConfig } from './simulation.interface';

export type GraphTooltipTheme = 'dark' | 'light';
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export type NodeSelectHandler = (node: GraphNode, element: SVGCircleElement) => void;
export type LinkSelectHandler = (link: GraphLink, element: SVGLineElement) => void;

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
  readonly container: HTMLElement;
  readonly nodes: GraphNode[];
  readonly links: GraphLink[];

  readonly autoFit?: boolean;
  readonly responsive?: boolean;

  readonly simulation?: EnhancedSimulationConfig;

  readonly interaction?: GraphInteractionConfig;
  readonly controls?: GraphControlsConfig;
  readonly legend?: LegendConfig;
}

export interface ControlsController {
  mount(): void;
  destroy(): void;
}