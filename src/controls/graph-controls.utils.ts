import { GraphControlsConfig, GraphControlsOrientation, GraphControlsPosition } from '../contracts/graph-controls.interface';

export function resolveControlsPosition( position: GraphControlsPosition | undefined): GraphControlsPosition {
  return position ?? 'bottom-left';
}

export function resolveControlsOrientation(orientation: GraphControlsOrientation | undefined): GraphControlsOrientation {
  return orientation ?? 'vertical';
}

export function shouldRenderControl(config: GraphControlsConfig, key: 'zoomIn' | 'zoomOut' | 'reset' | 'fit'): boolean {

  const show = config.show;

  if (!show) {
    return true;
  }

  const value = show[key];

  if (value === undefined) {
    return true;
  }

  return value;
}