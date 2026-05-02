import zoomIn from '../assets/plus.svg?raw';
import zoomOut from '../assets/minus.svg?raw';
import fit from '../assets/fit.svg?raw';
import reset from '../assets/reset.svg?raw';

import { GraphControlIcon } from './graph-controls.icons.types';

const ICON_MAP: Record<GraphControlIcon, string> = {
  'zoom-in': zoomIn,
  'zoom-out': zoomOut,
  fit,
  reset,
};

export function getControlIcon(icon: GraphControlIcon): string {
  const raw: string | undefined = ICON_MAP[icon];
  if (!raw) {
    throw new Error(`Icon not found: ${icon}`);
  }
  // Only add class; SVGs are already cleaned
  return raw.replace('<svg', '<svg class="pg-icon"');
}