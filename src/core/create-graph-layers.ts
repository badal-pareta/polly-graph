import { GraphLayers } from '../contracts/graph-layers.interface';

export function createGraphLayers(host: HTMLElement): GraphLayers {
  host.innerHTML = '';

  const rootContainer = document.createElement('div');
  rootContainer.className = 'pg-root';
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'pg-canvas');

  const overlay = document.createElement('div');
  overlay.className = 'pg-overlay';

  rootContainer.appendChild(svg);
  rootContainer.appendChild(overlay);
  host.appendChild(rootContainer);

  const createGroup = (layerName: string): SVGGElement => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    // We use pg-layer-[name] for CSS, but [data-layer] exactly as your renderers expect
    group.setAttribute('class', `pg-layer-${layerName}`);
    group.setAttribute('data-layer', layerName);
    return group;
  };

  const interactionLayer = createGroup('interaction-layer');
  const interactionRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  interactionRect.setAttribute('class', 'pg-interaction-surface');
  interactionRect.setAttribute('fill', 'transparent');
  interactionRect.setAttribute('pointer-events', 'all');
  interactionLayer.appendChild(interactionRect);

  const graphRoot = createGroup('viewport');
  
  // Create hover layer with sub-layers
  const hoverLayerContainer = createGroup('hover-layer');
  const hoverLinks = createGroup('hover-links');
  const hoverNodes = createGroup('hover-nodes');
  const hoverNodeLabels = createGroup('hover-node-labels');
  const hoverLinkLabels = createGroup('hover-link-labels');
  hoverLayerContainer.append(hoverLinks, hoverNodes, hoverNodeLabels, hoverLinkLabels);

  // Create selection layer with sub-layers
  const selectionLayerContainer = createGroup('selection-layer');
  const selectionLinks = createGroup('selection-links');
  const selectionNodes = createGroup('selection-nodes');
  const selectionNodeLabels = createGroup('selection-node-labels');
  const selectionLinkLabels = createGroup('selection-link-labels');
  selectionLayerContainer.append(selectionNodes, selectionLinks, selectionNodeLabels, selectionLinkLabels);

  const layers: GraphLayers = {
    svg,
    overlay,
    interactionLayer,
    interactionRect,
    root: graphRoot,
    // Base graph layers
    links: createGroup('links'),
    nodeRings: createGroup('node-rings'),
    nodes: createGroup('nodes'),
    nodeLabels: createGroup('node-labels'),
    linkLabels: createGroup('link-labels'),
    // Dedicated interaction state layers with proper sub-layering
    hoverLayer: {
      container: hoverLayerContainer,
      links: hoverLinks,
      nodes: hoverNodes,
      nodeLabels: hoverNodeLabels,
      linkLabels: hoverLinkLabels
    },
    selectionLayer: {
      container: selectionLayerContainer,
      links: selectionLinks,
      nodes: selectionNodes,
      nodeLabels: selectionNodeLabels,
      linkLabels: selectionLinkLabels
    }
  };

  graphRoot.append(
    layers.links,
    layers.nodeRings,
    layers.nodes,
    layers.nodeLabels,
    layers.linkLabels,
    layers.hoverLayer.container,     // Hover elements on top
    layers.selectionLayer.container, // Selected elements at very top
  );

  svg.appendChild(interactionLayer);
  svg.appendChild(graphRoot);

  return layers;
}