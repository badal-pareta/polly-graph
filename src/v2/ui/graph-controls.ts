/**
 * V2 Canvas Graph - Controls Component
 * Based on V1 controls pattern, adapted for V2 instance
 */

import { GraphControlsConfig } from '../../shared/contracts/graph-controls.interface';
import { resolveControlsPosition, resolveControlsOrientation, shouldRenderControl } from '../../shared/utils/graph-controls.utils';
import { getControlIcon, GraphControlIcon } from '../../shared/utils/graph-controls.icons';

export interface V2GraphControlsInstance {
  mount(): void;
  destroy(): void;
}

export interface V2GraphControlsActions {
  zoomIn(factor?: number, center?: [number, number]): void;
  zoomOut(factor?: number, center?: [number, number]): void;
  fitView(): Promise<void>;
  resetView(): void;
}

/**
 * Create V2 graph controls component
 * Uses same pattern as V1 but targets canvas container instead of SVG overlay
 */
export function createV2GraphControls(
  container: HTMLElement,
  graph: V2GraphControlsActions,
  config: GraphControlsConfig
): V2GraphControlsInstance {
  let root: HTMLDivElement | null = null;

  function mount(): void {
    if (!config.enabled) { return; }

    root = document.createElement('div');

    // 1. Apply Base Classes (same as V1)
    root.className = 'pg-controls';

    // 2. Resolve and apply dynamic position classes
    const position = resolveControlsPosition(config.position);
    root.classList.add(`pg-pos-${position}`);

    // 3. Resolve and apply orientation classes
    const orientation = resolveControlsOrientation(config.orientation);
    root.classList.add(`pg-orient-${orientation}`);

    // 4. Handle custom offsets via CSS Variables if provided
    if (config.offset) {
      root.style.setProperty('--pg-controls-offset-x', `${config.offset.x}px`);
      root.style.setProperty('--pg-controls-offset-y', `${config.offset.y}px`);
    }

    appendControls(root, config, graph);

    container.appendChild(root);
  }

  function destroy(): void {
    if (root && root.parentNode) {
      root.parentNode.removeChild(root);
      root = null;
    }
  }

  return {
    mount,
    destroy
  };
}

/**
 * Append control buttons to the root element
 */
function appendControls(
  root: HTMLDivElement,
  config: GraphControlsConfig,
  graph: V2GraphControlsActions
): void {
  const controls: Array<{ icon: GraphControlIcon; key: keyof NonNullable<GraphControlsConfig['show']>; action: () => void }> = [
    {
      icon: 'zoom-in',
      key: 'zoomIn',
      action: () => graph.zoomIn()
    },
    {
      icon: 'zoom-out',
      key: 'zoomOut',
      action: () => graph.zoomOut()
    },
    {
      icon: 'fit',
      key: 'fit',
      action: async () => await graph.fitView()
    },
    {
      icon: 'reset',
      key: 'reset',
      action: () => graph.resetView()
    }
  ];

  controls.forEach(control => {
    if (shouldRenderControl(config, control.key)) {
      const button = createControlButton(control.icon, control.action);
      root.appendChild(button);
    }
  });
}

/**
 * Create individual control button
 */
function createControlButton(icon: GraphControlIcon, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');

  button.className = 'pg-control-btn';
  button.type = 'button';
  button.innerHTML = getControlIcon(icon);

  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });

  // Add accessibility attributes
  const actionMap: Record<GraphControlIcon, string> = {
    'zoom-in': 'Zoom In',
    'zoom-out': 'Zoom Out',
    'fit': 'Fit View',
    'reset': 'Reset View'
  };

  button.setAttribute('aria-label', actionMap[icon]);
  button.setAttribute('title', actionMap[icon]);

  return button;
}