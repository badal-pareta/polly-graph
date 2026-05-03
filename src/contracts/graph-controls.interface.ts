import { Coordinates, Orientation, Position } from './graph-generics.interface';

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