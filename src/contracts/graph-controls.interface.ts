import { Coordinates } from './graph-generics.interface';

export type GraphControlsPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type GraphControlsOrientation = 'vertical' | 'horizontal';

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