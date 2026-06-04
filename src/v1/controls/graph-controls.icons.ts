import { icons } from '../../shared';
import { GraphControlIcon } from './graph-controls.icons.types';

const ICON_MAP: Record<GraphControlIcon, string> = {
  'zoom-in': icons.plus,
  'zoom-out': icons.minus,
  fit: icons.fit,
  reset: icons.reset,
};

export function getControlIcon(icon: GraphControlIcon): string {
  const raw: string | undefined = ICON_MAP[icon];
  if (!raw) {
    throw new Error(`Icon not found: ${icon}`);
  }
  // Only add class; SVGs are already cleaned
  return raw.replace('<svg', '<svg class="pg-icon"');
}