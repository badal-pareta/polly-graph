import { GraphInstance } from '../contracts/graph-instance.interface';
import { GraphControlsConfig } from '../contracts/graph-controls.interface';
import { resolveControlsPosition, resolveControlsOrientation, shouldRenderControl } from './graph-controls.utils';
import { getControlIcon } from './graph-controls.icons';
import { GraphControlIcon } from './graph-controls.icons.types';

export interface GraphControlsInstance {
  mount(): void;
  destroy(): void;
}

type GraphControlsActions = Pick<GraphInstance, 'zoomIn' | 'zoomOut' | 'fitView' | 'resetView'>;

/**
 * Refactored to target the HTML Overlay instead of the SVG's parent.
 * Uses Class-based positioning for better maintainability.
 */
export function createGraphControls(
  overlay: HTMLElement,
  graph: GraphControlsActions,
  config: GraphControlsConfig
): GraphControlsInstance {
  let root: HTMLDivElement | null = null;

  function mount(): void {
    if (!config.enabled) { return; }

    root = document.createElement('div');
    
    // 1. Apply Base Classes
    root.className = 'pg-controls';
    
    // 2. Resolve and apply dynamic position classes (pg-pos-top-right, etc.)
    const position = resolveControlsPosition(config.position);
    root.classList.add(`pg-pos-${position}`);

    // 3. Resolve and apply orientation classes (pg-orient-vertical, etc.)
    const orientation = resolveControlsOrientation(config.orientation);
    root.classList.add(`pg-orient-${orientation}`);

    // 4. Handle custom offsets via CSS Variables if provided
    if (config.offset) {
      root.style.setProperty('--pg-controls-offset-x', `${config.offset.x}px`);
      root.style.setProperty('--pg-controls-offset-y', `${config.offset.y}px`);
    }

    appendControls(root, config, graph);

    overlay.appendChild(root);
  }

  function appendControls(root: HTMLElement, config: GraphControlsConfig, graph: GraphControlsActions): void {
    /**
     * Map configuration keys to specific graph actions.
     * Typed as keyof NonNullable<GraphControlsConfig['show']> to fix the 'any' lint error.
     */
    const actions: Array<{ 
      key: keyof NonNullable<GraphControlsConfig['show']>; 
      icon: GraphControlIcon; 
      label: string; 
      fn: () => void 
    }> = [
      { key: 'zoomIn', icon: 'zoom-in', label: 'Zoom in', fn: graph.zoomIn.bind(graph) },
      { key: 'zoomOut', icon: 'zoom-out', label: 'Zoom out', fn: graph.zoomOut.bind(graph) },
      { key: 'fit', icon: 'fit', label: 'Fit view', fn: graph.fitView.bind(graph) },
      { key: 'reset', icon: 'reset', label: 'Reset view', fn: graph.resetView.bind(graph) }
    ];

    actions.forEach(action => {
      if (shouldRenderControl(config, action.key)) {
        root.appendChild(createButton(action.icon, action.label, action.fn));
      }
    });
  }

  function createButton(type: GraphControlIcon, label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'pg-control-btn';
    button.type = 'button';
    button.setAttribute('aria-label', label);

    const wrapper = document.createElement('div');
    wrapper.className = 'pg-icon-wrapper';
    wrapper.innerHTML = getControlIcon(type);

    const svg = wrapper.querySelector('svg');
    if (svg) {
      svg.classList.add('pg-icon');
      button.appendChild(svg);
    }

    button.addEventListener('click', onClick);
    return button;
  }

  function destroy(): void {
    if (!root) { return; }

    if (root.parentNode === overlay) {
      overlay.removeChild(root);
    }
    
    root = null;
  }

  return { mount, destroy };
}