/**
 * V2 Canvas Graph - Legends Component
 * Adapted from V1 legends pattern for V2 canvas implementation
 */

import { LegendConfig } from '../../shared/contracts/graph-config.interface';
import { V2Node } from '../types';
import { icons } from '../../shared';

export interface LegendItem {
  label: string;
  color: string;
  shape?: 'circle' | 'rect';
}

export interface V2LegendConfig extends LegendConfig {
  readonly items?: LegendItem[]; // Optional - auto-generated from nodes if not provided
}

export interface V2GraphLegendsInstance {
  mount(): void;
  destroy(): void;
}

/**
 * Generate legend items from V2 nodes
 */
export function generateLegendItems(nodes: V2Node[]): LegendItem[] {
  const uniqueTypes = Array.from(new Set(nodes.map(node => node.type).filter(Boolean)));

  return uniqueTypes.map((type): LegendItem => {
    const sampleNode = nodes.find(node => node.type === type);

    return {
      label: type,
      color: sampleNode?.style?.fill ?? '#94a3b8',
      shape: 'circle'
    };
  });
}

/**
 * Get legend icon SVG
 */
function getLegendIcon(icon: 'caret'): string {
  const iconMap = {
    caret: icons.caret
  };

  const raw = iconMap[icon];
  if (!raw) {
    throw new Error(`Legend icon not found: ${icon}`);
  }
  return raw.replace('<svg', '<svg class="pg-icon"');
}

/**
 * Create V2 graph legends component
 */
export function createV2GraphLegends(
  container: HTMLElement,
  config: V2LegendConfig,
  nodes?: V2Node[]
): V2GraphLegendsInstance {
  let legendWrapper: HTMLDivElement | null = null;

  function mount(): void {
    if (!config.enabled) {
      return;
    }

    legendWrapper = document.createElement('div');
    legendWrapper.className = 'pg-legend';

    const position = config.position || 'bottom-right';
    legendWrapper.classList.add(`pg-pos-${position}`);

    if (config.defaultExpanded === false) {
      legendWrapper.classList.add('pg-is-collapsed');
    }

    // Handle custom offsets via CSS Variables if provided
    if (config.offset) {
      legendWrapper.style.setProperty('--pg-offset-x', `${config.offset.x}px`);
      legendWrapper.style.setProperty('--pg-offset-y', `${config.offset.y}px`);
    }

    // Add toggle button if collapsible
    if (config.collapsible) {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'pg-legend-toggle';
      toggleBtn.type = 'button';
      toggleBtn.innerHTML = getLegendIcon('caret');

      toggleBtn.onclick = (e) => {
        e.stopPropagation();
        legendWrapper?.classList.toggle('pg-is-collapsed');
      };
      legendWrapper.appendChild(toggleBtn);
    }

    // Create legend body
    const body = document.createElement('div');
    body.className = 'pg-legend-body';

    const list = document.createElement('ul');
    list.className = 'pg-legend-list';

    // Use provided items or auto-generate from nodes
    const legendItems = config.items ?? (nodes ? generateLegendItems(nodes) : []);

    legendItems.forEach((item: LegendItem) => {
      const listItem = document.createElement('li');
      listItem.className = 'pg-legend-item';

      const swatch = document.createElement('span');
      swatch.className = `pg-legend-swatch is-${item.shape || 'circle'}`;
      swatch.style.backgroundColor = item.color;

      const label = document.createElement('span');
      label.className = 'pg-legend-label';
      label.innerText = item.label;

      listItem.appendChild(swatch);
      listItem.appendChild(label);
      list.appendChild(listItem);
    });

    body.appendChild(list);
    legendWrapper.appendChild(body);
    container.appendChild(legendWrapper);
  }

  function destroy(): void {
    if (legendWrapper && legendWrapper.parentNode) {
      legendWrapper.parentNode.removeChild(legendWrapper);
      legendWrapper = null;
    }
  }

  return {
    mount,
    destroy
  };
}