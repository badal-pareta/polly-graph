import { GraphLayers } from '../contracts/graph-layers.interface';

export function createGraphLayers(svg: SVGSVGElement): GraphLayers {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }

  const createGroup = (className: string): SVGGElement => {
    const group: SVGGElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', className);
    group.setAttribute('data-layer', className);

    return group;
  };

  const interactionLayer: SVGGElement = createGroup('interaction-layer');
  const interactionRect: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  const interactionAttributes: Record<string, string> = {
    class: 'interaction-surface',
    width: '100%',
    height: '100%',
    fill: 'transparent',
    'pointer-events': 'all'
  };

  Object.entries(interactionAttributes).forEach(([key, value]): void => {
    interactionRect.setAttribute(key, value);
  });
  interactionLayer.appendChild(interactionRect);
  const root: SVGGElement = createGroup('knowledge-graph-root');
  const layers: GraphLayers = {
    interactionLayer,
    interactionRect,
    root,
    links: createGroup('links'),
    linkLabels: createGroup('link-labels'),
    nodeRings: createGroup('node-rings'),
    nodes: createGroup('nodes'),
    nodeLabels: createGroup('node-labels'),
  };

  root.append(
    layers.links,
    layers.linkLabels,
    layers.nodeRings,
    layers.nodes,
    layers.nodeLabels,
  );

  svg.appendChild(interactionLayer);
  svg.appendChild(root);

  return layers;
}