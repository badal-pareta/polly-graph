# polly-graph

Reusable D3-based graph visualization SDK with configurable nodes, links, labels, interactions, and layout behaviors.

## Features

* **Managed Root Architecture**: Provide one host element; the SDK internally manages the SVG canvas and the HTML UI overlay.
* **Smart Positioning**: Controls and legends use a class-based system (`pg-pos-top-right`) with CSS variable overrides for precision offsets.
* **Declarative Styling**: Fully customizable node and link aesthetics via style objects.
* **Animated UI**: Legends feature directional "retraction" animations that sync with their anchor position.

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
      label: 'Core Service', 
      style: { 
        radius: 30, 
        fill: '#7c3aed', 
        stroke: '#5b21b6', 
        strokeWidth: 2,
        textColor: '#ffffff',
        fontSize: 12
      } 
    }
  ],
  links: [
    { 
      source: 'n1', 
      target: 'n2', 
      style: { stroke: '#94a3b8', strokeWidth: 2, opacity: 0.6 } 
    }
  ],
  controls: { enabled: true, position: 'top-right' },
  legend: { enabled: true, position: 'bottom-left' }
});

graph.render();
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
Links support custom coloring, thickness, and arrow markers.
```ts
style: {
  stroke: '#cbd5e1',
  strokeWidth: 1.5,
  opacity: 0.8,
  dashed: false // Coming soon
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

### Angular
```ts
@ViewChild('viewport') viewport!: ElementRef;

ngAfterViewInit() {
  this.graph = createGraph({
    container: this.viewport.nativeElement,
    // ... config
  });
  this.graph.render();
}
```

---

## License
MIT