import caret from '../assets/caret.svg?raw';

/**
 * Specifically for legend UI elements. 
 * Decoupled from graph-controls to allow independent scaling.
 */
export type GraphLegendIcon = 'caret';

const LEGEND_ICON_MAP: Record<GraphLegendIcon, string> = { caret };

export function getLegendIcon(icon: GraphLegendIcon): string {
  const raw: string | undefined = LEGEND_ICON_MAP[icon];
  if (!raw) {
    throw new Error(`Legend icon not found: ${icon}`);
  }
  // We still use the 'pg-icon' class for global SVG styling consistency
  return raw.replace('<svg', '<svg class="pg-icon"');
}