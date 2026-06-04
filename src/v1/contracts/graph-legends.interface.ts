import { Position } from './graph-generics.interface';

export interface LegendItem {
  label: string;
  color: string;
  shape?: 'circle' | 'rect';
}

export type LegendPosition = Position;

export interface LegendConfig {
  readonly enabled?: boolean;
  readonly title?: string;
  readonly position?: LegendPosition;
  readonly items?: LegendItem[]; // Optional - auto-generated from nodes if not provided
  readonly collapsible?: boolean;
  readonly defaultExpanded?: boolean;
}