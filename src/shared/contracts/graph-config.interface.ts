/**
 * Shared Graph Configuration Interfaces
 * Core configuration used by both V1 (SVG) and V2 (Canvas) implementations
 */

import { GraphNode, GraphLink, NodeStyle, LinkStyle } from './graph.types';

export type GraphTooltipTheme = 'dark' | 'light';
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

// Generic handlers that work for both SVG and Canvas
export type NodeSelectHandler = (node: GraphNode, element?: HTMLElement) => void;
export type LinkSelectHandler = (link: GraphLink, element?: HTMLElement) => void;

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

// Import controls configuration from shared
import { GraphControlsConfig } from './graph-controls.interface';

// Legend configuration
export type LegendPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface LegendConfig {
  readonly enabled?: boolean;
  readonly position?: LegendPosition;
  readonly collapsible?: boolean;
  readonly defaultExpanded?: boolean;
  readonly offset?: {
    readonly x: number;
    readonly y: number;
  };
}

// Simulation configuration
export interface SimulationConfig {
  readonly alphaDecay?: number;
  readonly velocityDecay?: number;
  readonly forces?: Record<string, unknown>;
}

// Base graph configuration (shared between V1 and V2)
export interface BaseGraphConfig {
  readonly container: HTMLElement;
  readonly nodes: GraphNode[];
  readonly links: GraphLink[];

  readonly autoFit?: boolean;
  readonly responsive?: boolean;

  readonly simulation?: SimulationConfig;
  readonly interaction?: GraphInteractionConfig;
  readonly controls?: GraphControlsConfig;
  readonly legend?: LegendConfig;
}

// V1-specific graph configuration (extends base)
// export interface GraphConfig extends BaseGraphConfig {
//   // V1 can add SVG-specific options here if needed
// }

// Controllers interface
export interface ControlsController {
  mount(): void;
  destroy(): void;
}