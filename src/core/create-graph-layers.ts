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
  
  const layers: GraphLayers = {
    svg,
    overlay,
    interactionLayer,
    interactionRect,
    root: graphRoot,
    // These keys now match your ctx.root.select('[data-layer="..."]') calls
    links: createGroup('links'),
    linkLabels: createGroup('link-labels'),
    nodeRings: createGroup('node-rings'),
    nodes: createGroup('nodes'),
    nodeLabels: createGroup('node-labels'),
  };

  graphRoot.append(
    layers.links,
    layers.linkLabels,
    layers.nodeRings,
    layers.nodes,
    layers.nodeLabels,
  );

  svg.appendChild(interactionLayer);
  svg.appendChild(graphRoot);

  return layers;
}