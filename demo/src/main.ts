import './styles.css';
import { createGraph } from '../../src';
import {
  demoNodes,
  demoLinks,
  demoInteractionConfig,
} from './demo-data';

const graphWrapper =
  document.getElementById(
    'graph-wrapper',
  ) as HTMLDivElement | null;

if (!graphWrapper) {
  throw new Error(
    'Graph wrapper not found',
  );
}

const svgContainer =
  document.getElementById(
    'graph-container',
  ) as SVGSVGElement | null;

if (!svgContainer) {
  throw new Error(
    'Graph container not found',
  );
}

/**
 * Ensure SVG has explicit size.
 * D3 zoom + SVG extent calculations
 * require width/height to exist.
 */
svgContainer.setAttribute(
  'width',
  String(graphWrapper.clientWidth),
);

svgContainer.setAttribute(
  'height',
  String(graphWrapper.clientHeight),
);

const graph = createGraph({
  container: svgContainer,
  nodes: demoNodes,
  links: demoLinks,
  interaction: demoInteractionConfig,
  controls: {
    enabled: true,
    position: 'bottom-left',
    orientation: 'vertical',
    offset: { x: 10, y: 10 },
  },
});

graph.render();

const zoomInButton =
  document.getElementById('zoom-in');

const zoomOutButton =
  document.getElementById('zoom-out');

const resetViewButton =
  document.getElementById(
    'reset-view',
  );

const fitViewButton =
  document.getElementById(
    'fit-view',
  );

zoomInButton?.addEventListener(
  'click',
  (): void => {
    graph.zoomIn();
  },
);

zoomOutButton?.addEventListener(
  'click',
  (): void => {
    graph.zoomOut();
  },
);

resetViewButton?.addEventListener(
  'click',
  (): void => {
    graph.resetView();
  },
);

fitViewButton?.addEventListener(
  'click',
  (): void => {
    graph.fitView();
  },
);

window.addEventListener(
  'resize',
  (): void => {
    svgContainer.setAttribute(
      'width',
      String(graphWrapper.clientWidth),
    );

    svgContainer.setAttribute(
      'height',
      String(graphWrapper.clientHeight),
    );

    graph.fitView();
  },
);