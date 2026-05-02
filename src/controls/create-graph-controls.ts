import { GraphInstance } from '../contracts/graph-instance.interface';
import { GraphControlsConfig, GraphControlsOrientation, GraphControlsPosition } from '../contracts/graph-controls.interface';
import { Coordinates } from '../contracts/graph-generics.interface';
import { resolveControlsPosition, resolveControlsOrientation, shouldRenderControl } from './graph-controls.utils';
import { getControlIcon } from './graph-controls.icons';
import { GraphControlIcon } from './graph-controls.icons.types';

export interface GraphControlsInstance {
  mount(): void;
  destroy(): void;
}

export function createGraphControls(container: SVGSVGElement, graph: GraphInstance, config: GraphControlsConfig): GraphControlsInstance {
  let root: HTMLDivElement | null = null;

  function mount(): void {
    if (!config.enabled) { return; }

    const parent: HTMLElement | null = container.parentElement;

    if (!parent) { return; }

    root = document.createElement('div');
    root.className = 'pg-controls';

    applyPosition(root, config);
    applyOrientation(root, config);

    appendControls(root, config, graph);

    parent.appendChild(root);
  }

  function appendControls(root: HTMLElement, config: GraphControlsConfig, graph: GraphInstance): void {

    if (shouldRenderControl(config, 'zoomIn')) {
      root.appendChild(createButton('zoom-in', 'Zoom in', graph.zoomIn.bind(graph)));
    }

    if (shouldRenderControl(config, 'zoomOut')) {
      root.appendChild(createButton('zoom-out', 'Zoom out', graph.zoomOut.bind(graph)));
    }

    if (shouldRenderControl(config, 'fit')) {
      root.appendChild(createButton('fit', 'Fit view', graph.fitView.bind(graph)));
    }

    if (shouldRenderControl(config, 'reset')) {
      root.appendChild(createButton('reset', 'Reset view', graph.resetView.bind(graph)));
    }
  }

  function createButton(type: GraphControlIcon, label: string, onClick: VoidFunction): HTMLButtonElement {

    const button: HTMLButtonElement = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', label);

    // safer SVG injection
    const wrapper: HTMLDivElement = document.createElement('div');
    wrapper.innerHTML = getControlIcon(type);

    const svg: SVGElement | null = wrapper.querySelector('svg');

    if (!svg) {
      throw new Error(`Invalid SVG for icon: ${type}`);
    }

    svg.classList.add('pg-icon');

    button.appendChild(svg);

    button.addEventListener('click', onClick);

    return button;
  }

  function destroy(): void {
    if (!root) { return; }

    // remove all listeners by cloning (safe cleanup)
    const clone: HTMLElement = root.cloneNode(true) as HTMLElement;
    root.replaceWith(clone);

    root = null;
  }

  return { mount, destroy };
}

function applyPosition(el: HTMLElement, config: GraphControlsConfig): void {
  const position: GraphControlsPosition = resolveControlsPosition(config.position);

  const offset: Coordinates = config.offset ?? { x: 16, y: 16 };

  el.style.position = 'absolute';

  switch (position) {
    case 'bottom-left':
      el.style.left = `${offset.x}px`;
      el.style.bottom = `${offset.y}px`;
      break;

    case 'bottom-right':
      el.style.right = `${offset.x}px`;
      el.style.bottom = `${offset.y}px`;
      break;

    case 'top-left':
      el.style.left = `${offset.x}px`;
      el.style.top = `${offset.y}px`;
      break;

    case 'top-right':
      el.style.right = `${offset.x}px`;
      el.style.top = `${offset.y}px`;
      break;
  }
}

function applyOrientation(el: HTMLElement, config: GraphControlsConfig): void {
  const orientation: GraphControlsOrientation = resolveControlsOrientation(config.orientation);

  el.style.display = 'flex';
  el.style.flexDirection = orientation === 'vertical' ? 'column' : 'row';
}

