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
  readonly items: LegendItem[];
  readonly collapsible?: boolean;
  readonly defaultExpanded?: boolean;
}