/**
 * Shared Graph Controls Icons
 * Used by both V1 and V2 implementations
 */

import { icons } from '../icons';

export type GraphControlIcon =
  | 'zoom-in'
  | 'zoom-out'
  | 'fit'
  | 'reset';

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