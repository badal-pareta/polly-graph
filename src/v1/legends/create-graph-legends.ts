import { LegendConfig, LegendItem } from '../contracts/graph-legends.interface';
import { GraphNode } from '../contracts/graph.types';
import { getLegendIcon } from './graph-legend-icon';

export function generateLegendItems(nodes: GraphNode[]): LegendItem[] {
  const uniqueTypes = Array.from(new Set(nodes.map(node => node.type)));

  return uniqueTypes.map((type): LegendItem => {
    const sampleNode = nodes.find(node => node.type === type);

    return {
      label: type,
      color: sampleNode?.style?.fill ?? '#94a3b8',
      shape: 'circle'
    };
  });
}

export function createGraphLegend(
  overlay: HTMLElement,
  config: LegendConfig,
  nodes?: GraphNode[]
): () => void {
  const legendWrapper = document.createElement('div');
  legendWrapper.className = 'pg-legend';
  
  const position = config.position || 'bottom-right';
  legendWrapper.classList.add(`pg-pos-${position}`);

  if (config.defaultExpanded === false) {
    legendWrapper.classList.add('pg-is-collapsed');
  }

  // Directly append toggle to wrapper (No more separate header)
  if (config.collapsible) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'pg-legend-toggle';
    toggleBtn.type = 'button';
    toggleBtn.innerHTML = getLegendIcon('caret');
    
    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      legendWrapper.classList.toggle('pg-is-collapsed');
    };
    legendWrapper.appendChild(toggleBtn);
  }

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
  overlay.appendChild(legendWrapper);

  return () => {
    if (legendWrapper.parentNode === overlay) overlay.removeChild(legendWrapper);
  };
}