/**
 * Shared Graph Controls Interface
 * Used by both V1 and V2 implementations
 */

export interface Coordinates {
  readonly x: number;
  readonly y: number;
}

export type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type Orientation = 'vertical' | 'horizontal';

export type GraphControlsPosition = Position;

export type GraphControlsOrientation = Orientation;

export interface GraphControlsConfig {
  readonly enabled: boolean;
  readonly position?: GraphControlsPosition;
  readonly orientation?: GraphControlsOrientation;
  readonly offset?: Coordinates;
  readonly show?: {
    readonly zoomIn?: boolean;
    readonly zoomOut?: boolean;
    readonly reset?: boolean;
    readonly fit?: boolean;
  };
}