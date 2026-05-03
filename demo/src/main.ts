import './styles.css';
import { createGraph, GraphNode } from '../../src';
import { demoNodes, demoLinks, demoInteractionConfig } from './demo-data';
import { LegendItem } from '../../src/contracts/graph-legends.interface';

const hostContainer = document.getElementById('graph-container') as HTMLElement | null;

if (!hostContainer) {
  throw new Error('Graph host container not found');
}

/**
 * The library now manages:
 * 1. Creating the SVG canvas
 * 2. Creating the HTML overlay
 * 3. Handling resize automatically via ResizeObserver
 */
const graph = createGraph({
  container: hostContainer, // Passing the HTMLElement
  nodes: demoNodes,
  links: demoLinks,
  interaction: demoInteractionConfig,
  controls: {
    enabled: true,
    position: 'bottom-left',
    orientation: 'vertical',
    offset: { x: 10, y: 10 },
  },
  legend: {
    enabled: true,
    items: deriveLegendItems(demoNodes),
    collapsible: true,
    position: 'top-right'
  }
});

document.getElementById('capture-btn')?.addEventListener('click', () => {
  const htmlSnapshot = graph.exportGraph('hello');
  console.log('Exported HTML (Controls removed):', htmlSnapshot);
  
});

graph.render();

// Note: You don't need manual event listeners for zoomIn/zoomOut 
// if you enabled the built-in controls above, but if you have 
// custom external buttons, they will still work:
document.getElementById('zoom-in')?.addEventListener('click', () => graph.zoomIn());
document.getElementById('zoom-out')?.addEventListener('click', () => graph.zoomOut());
document.getElementById('reset-view')?.addEventListener('click', () => graph.resetView());
document.getElementById('fit-view')?.addEventListener('click', () => graph.fitView());



/**
 * Derives unique legend items based on node types and their styles.
 */
export function deriveLegendItems(nodes: GraphNode[]): LegendItem[] {
  // 1. Get unique types from the node list
  const uniqueTypes = [...new Set(nodes.map(node => node.type))];

  // 2. Map each type to a LegendItem structure
  return uniqueTypes.map((type): LegendItem => {
    // Find the first node of this type to steal its visual style
    const sampleNode = nodes.find(node => node.type === type);

    return {
      label: type,
      color: sampleNode?.style?.fill ?? '#cccccc',
      // You can logically determine shape based on type if needed
      shape: type === 'Drug' ? 'rect' : 'circle' 
    };
  });
}
