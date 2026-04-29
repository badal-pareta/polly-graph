# polly-graph

Reusable D3-based graph visualization SDK with configurable nodes, links, labels, interactions, and layout behaviors.

## Features

* Interactive force-directed graph rendering
* Configurable nodes, links, and labels
* Hover states with tooltip support
* Node selection support
* Drag and zoom interactions
* Arrow markers and relationship visualization
* Framework-agnostic API
* Angular and React compatible

---

## Installation

```bash
npm install polly-graph
```

No separate D3 installation is required.

---

## Basic Usage

### HTML

```html
<div class="graph-wrapper">
  <svg id="graph-container"></svg>
</div>
```

### TypeScript

```ts
import {
  createGraph,
  GraphNode,
  GraphLink,
} from 'polly-graph';

const container = document.getElementById(
  'graph-container',
) as SVGSVGElement;

const nodes: GraphNode[] = [
  {
    id: 'users',
    label: 'Users',
    style: {
      radius: 24,
      fill: '#7c3aed',
      stroke: '#6d28d9',
      strokeWidth: 2,
      textColor: '#ffffff',
    },
  },
  {
    id: 'orders',
    label: 'Orders',
    style: {
      radius: 24,
      fill: '#2563eb',
      stroke: '#1d4ed8',
      strokeWidth: 2,
      textColor: '#ffffff',
    },
  },
];

const links: GraphLink[] = [
  {
    source: 'users',
    target: 'orders',
    label: 'has_many',
    style: {
      stroke: '#94a3b8',
      strokeWidth: 2,
      opacity: 1,
    },
  },
];

const graph = createGraph({
  container,
  nodes,
  links,
  interaction: {
    drag: {
      enabled: true,
    },
    hover: {
      enabled: true,
      tooltip: {
        enabled: true,
      },
    },
    selection: {
      enabled: true,
    },
  },
});

graph.render();
```

---

## Hover + Tooltip Example

```ts
interaction: {
  hover: {
    enabled: true,
    tooltip: {
      enabled: true,
      theme: 'dark',
    },
    nodeStyle: {
      stroke: '#16a34a',
      strokeWidth: 3,
      opacity: 1,
    },
  },
}
```

---

## Selection Example

```ts
selection: {
  enabled: true,
  multiSelect: false,
  nodeStyle: {
    stroke: '#f59e0b',
    strokeWidth: 4,
    opacity: 1,
  },
}
```

---

## Angular Example

### Template

```html
<div class="graph-wrapper">
  <svg #svgRef></svg>
</div>
```

### Component

```ts
this.graph = createGraph({
  container: this.svgRef.nativeElement,
  nodes,
  links,
  interaction,
});

this.graph.render();
```

---

## Public API

### Main Exports

* `createGraph`
* `GraphInstance`
* `GraphNode`
* `GraphLink`
* `GraphConfig`
* `GraphInteractionConfig`

---

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test
```

---

## Publish Checklist

* Package name available on npm
* README completed
* LICENSE added
* Build succeeds
* Tests pass
* npm token configured
* GitHub workflow passes
* Repository is public

---

## License

MIT
