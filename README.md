# polly-graph

A framework-independent TypeScript-based D3 graph visualization SDK that provides a comprehensive, reusable solution for creating interactive network graphs. Designed to work seamlessly across React, Angular, Vue, Svelte, or vanilla JavaScript applications.

## Features

### Core Architecture
* **Framework Independent**: Works with React, Vue, Angular, Svelte, or vanilla JavaScript
* **Managed Root Architecture**: Provide one host element; the SDK internally manages the SVG canvas and HTML UI overlay
* **TypeScript First**: Complete type safety with zero `any` or `unknown` usage in core modules
* **Modular Design**: Clean separation with GraphManager, RenderPipeline, and InteractionManager

### Interactions & Behavior
* **Advanced Selection System**: Proper layer hierarchy ensures selected links appear above unselected nodes
* **Smart Hover States**: Conflict resolution between hover and selection with visual feedback
* **Enhanced Zoom Range**: 0.01x to 10x zoom support for large graphs
* **Intelligent Drag**: Boundary-aware dragging with force continuation outside canvas
* **Touch-Friendly**: Responsive interactions across desktop and mobile

### Styling & Customization
* **Declarative Styling**: Fully customizable node and link aesthetics via style objects
* **Smart Positioning**: Controls and legends use corner anchoring with CSS variable overrides
* **Animated UI**: Legends feature directional retraction animations
* **Adaptive Forces**: Simulation parameters automatically adjust based on graph size

---

## Installation

```bash
npm install polly-graph
```

---

## Basic Usage

### HTML
```html
<div id="graph-viewport" style="position: relative; width: 100%; height: 600px;"></div>
```

### TypeScript
```ts
import { createGraph } from 'polly-graph';

const viewport = document.getElementById('graph-viewport') as HTMLElement;

const graph = createGraph({
  container: viewport,
  nodes: [
    {
      id: 'n1',
      type: 'service',
      label: 'Core Service',
      tooltip: 'Primary application service',
      style: {
        radius: 30,
        fill: '#7c3aed',
        stroke: '#5b21b6',
        strokeWidth: 2,
        textColor: '#ffffff'
      }
    },
    {
      id: 'n2',
      type: 'database',
      label: 'Database',
      style: { radius: 25, fill: '#dc2626' }
    }
  ],
  links: [
    {
      source: 'n1',
      target: 'n2',
      label: 'connects to',
      style: {
        stroke: '#94a3b8',
        strokeWidth: 2,
        opacity: 0.8,
        arrow: { enabled: true, size: 8 }
      }
    }
  ],
  interaction: {
    drag: { enabled: true },
    hover: {
      enabled: true,
      tooltip: { enabled: true, theme: 'dark' }
    },
    selection: { enabled: true }
  },
  controls: { enabled: true, position: 'top-right' },
  legend: { enabled: true, position: 'bottom-left', collapsible: true }
});

// Render the graph
graph.render();

// Event handling
graph.on('nodeSelect', (node, element) => {
  console.log('Selected node:', node.label);
});

// Cleanup when done
// graph.destroy();
```

---

## Styling & Customization

### Node Styles
Every node can have a unique appearance defined in its `style` object.
| Property | Type | Description |
| :--- | :--- | :--- |
| `radius` | `number` | The size of the node. |
| `fill` | `string` | Background color (hex/rgb). |
| `stroke` | `string` | Border color. |
| `strokeWidth`| `number` | Thickness of the border. |
| `textColor` | `string` | Label color. |

### Link Styles
Links support custom coloring, thickness, labels, and arrow markers.
```ts
style: {
  stroke: '#cbd5e1',
  strokeWidth: 1.5,
  opacity: 0.8,
  dashArray: '5,5', // Dashed lines
  arrow: {
    enabled: true,
    size: 8,
    fill: '#64748b'
  },
  label: {
    enabled: true,
    visibility: 'hover', // 'always' | 'hover' | 'selection'
    backgroundFill: '#ffffff',
    textColor: '#374151'
  }
}
```

---

## Positioning Logic

The UI components (Controls & Legend) use a hybrid positioning system.

### 1. Corner Anchoring
Use the `position` property to anchor elements to viewport corners. The SDK applies classes like `.pg-pos-top-right` which handles the layout logic.

Available positions:
* `top-left`
* `top-right`
* `bottom-left`
* `bottom-right`

### 2. Custom Offsets
While the corners provide the anchor, you can use the `offset` object for fine-tuning. This values are passed into CSS variables `--pg-offset-x` and `--pg-offset-y` internally.

```ts
controls: {
  position: 'top-right',
  offset: { x: 24, y: 24 } // 24px away from the top and right edges
}
```

### 3. Directional Legend Retraction
The Legend component is aware of its position.
* If anchored **Left**: It collapses to the left; the toggle icon points **Right** to expand.
* If anchored **Right**: It collapses to the right; the toggle icon points **Left** to expand.

---

## Framework Integration

### React

#### Basic Component
```tsx
import { useEffect, useRef } from 'react';
import { createGraph, GraphInstance } from 'polly-graph';

function GraphComponent({ nodes, links }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<GraphInstance | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      graphRef.current = createGraph({
        container: containerRef.current,
        nodes,
        links,
        controls: { enabled: true, position: 'top-right' },
        legend: { enabled: true, position: 'bottom-left' }
      });
      graphRef.current.render();
    }

    return () => {
      graphRef.current?.destroy();
    };
  }, [nodes, links]);

  return <div ref={containerRef} style={{ width: '100%', height: '600px' }} />;
}
```

#### Custom Hook
```tsx
import { useEffect, useRef, useCallback } from 'react';
import { createGraph, GraphInstance, GraphConfig } from 'polly-graph';

function usePollyGraph(config: Omit<GraphConfig, 'container'>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<GraphInstance | null>(null);

  const initialize = useCallback(() => {
    if (containerRef.current && !graphRef.current) {
      graphRef.current = createGraph({
        ...config,
        container: containerRef.current
      });
      graphRef.current.render();
    }
  }, [config]);

  const destroy = useCallback(() => {
    graphRef.current?.destroy();
    graphRef.current = null;
  }, []);

  useEffect(() => {
    initialize();
    return destroy;
  }, [initialize, destroy]);

  return {
    containerRef,
    graph: graphRef.current,
    reinitialize: () => {
      destroy();
      initialize();
    }
  };
}

// Usage
function App() {
  const { containerRef } = usePollyGraph({
    nodes: [...],
    links: [...],
    controls: { enabled: true }
  });

  return <div ref={containerRef} style={{ width: '100%', height: '600px' }} />;
}
```

#### With Event Handling
```tsx
import { useEffect, useRef, useState } from 'react';
import { createGraph, GraphInstance, GraphNode, GraphLink } from 'polly-graph';

function InteractiveGraph({ nodes, links }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<GraphInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<GraphLink | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      graphRef.current = createGraph({
        container: containerRef.current,
        nodes,
        links,
        interaction: {
          selection: { enabled: true },
          hover: { enabled: true, tooltip: { enabled: true } }
        },
        controls: { enabled: true }
      });

      // Event listeners
      const unsubscribeNode = graphRef.current.on('nodeSelect', (node) => {
        setSelectedNode(node);
        setSelectedLink(null);
      });

      const unsubscribeNodeDeselect = graphRef.current.on('nodeDeselect', () => {
        setSelectedNode(null);
      });

      const unsubscribeLink = graphRef.current.on('linkSelect', (link) => {
        setSelectedLink(link);
        setSelectedNode(null);
      });

      const unsubscribeLinkDeselect = graphRef.current.on('linkDeselect', () => {
        setSelectedLink(null);
      });

      graphRef.current.render();

      return () => {
        unsubscribeNode();
        unsubscribeNodeDeselect();
        unsubscribeLink();
        unsubscribeLinkDeselect();
        graphRef.current?.destroy();
      };
    }
  }, [nodes, links]);

  const handleClearSelection = () => {
    graphRef.current?.clearSelection();
  };

  const handleFitView = () => {
    graphRef.current?.fitView();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={handleClearSelection}>Clear Selection</button>
        <button onClick={handleFitView} style={{ marginLeft: '8px' }}>Fit View</button>
        {selectedNode && (
          <span style={{ marginLeft: '16px' }}>
            Selected: {selectedNode.label || selectedNode.id}
          </span>
        )}
        {selectedLink && (
          <span style={{ marginLeft: '16px' }}>
            Selected Link: {typeof selectedLink.source === 'string'
              ? selectedLink.source
              : selectedLink.source.id} → {typeof selectedLink.target === 'string'
              ? selectedLink.target
              : selectedLink.target.id}
          </span>
        )}
      </div>
      <div ref={containerRef} style={{ flex: 1, position: 'relative' }} />
    </div>
  );
}
```

### Vue 3
```vue
<template>
  <div ref="container" class="graph-container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { createGraph } from 'polly-graph';

const container = ref(null);
let graph = null;

onMounted(() => {
  graph = createGraph({
    container: container.value,
    nodes: [...],
    links: [...]
  });
  graph.render();
});

onUnmounted(() => {
  graph?.destroy();
});
</script>
```

### Angular 18+ (Signal-based)
```ts
import { Component, ElementRef, viewChild, DestroyRef, effect } from '@angular/core';
import { inject } from '@angular/core';
import { createGraph, GraphInstance } from 'polly-graph';

@Component({
  selector: 'app-graph',
  template: '<div #viewport class="graph-container"></div>'
})
export class GraphComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly viewport = viewChild.required<ElementRef>('viewport');

  private graph: GraphInstance | null = null;

  constructor() {
    effect(() => {
      const container = this.viewport()?.nativeElement;
      if (container) {
        this.graph = createGraph({
          container,
          nodes: [...],
          links: [...]
        });
        this.graph.render();
      }
    });

    this.destroyRef.onDestroy(() => {
      this.graph?.destroy();
    });
  }
}
```

---

## License
MIT