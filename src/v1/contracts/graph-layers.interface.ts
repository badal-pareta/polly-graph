export interface GraphLayers {
  readonly svg: SVGSVGElement;         // The internal canvas
  readonly overlay: HTMLDivElement;    // The UI host
  readonly interactionLayer: SVGGElement;
  readonly interactionRect: SVGRectElement;
  readonly root: SVGGElement;
  readonly links: SVGGElement;
  readonly nodeRings: SVGGElement;
  readonly nodes: SVGGElement;
  readonly nodeLabels: SVGGElement;
  readonly linkLabels: SVGGElement;
  // Dedicated interaction state layers with proper sub-layering
  readonly hoverLayer: {
    readonly container: SVGGElement;
    readonly links: SVGGElement;
    readonly nodes: SVGGElement;
    readonly nodeLabels: SVGGElement;
    readonly linkLabels: SVGGElement;
  };
  readonly selectionLayer: {
    readonly container: SVGGElement;
    readonly links: SVGGElement;
    readonly nodes: SVGGElement;
    readonly nodeLabels: SVGGElement;
    readonly linkLabels: SVGGElement;
  };
}