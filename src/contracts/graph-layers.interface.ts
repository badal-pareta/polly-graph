export interface GraphLayers {
  readonly svg: SVGSVGElement;         // The internal canvas
  readonly overlay: HTMLDivElement;    // The UI host
  readonly interactionLayer: SVGGElement;
  readonly interactionRect: SVGRectElement;
  readonly root: SVGGElement;
  readonly links: SVGGElement;
  readonly linkLabels: SVGGElement;
  readonly nodeRings: SVGGElement;
  readonly nodes: SVGGElement;
  readonly nodeLabels: SVGGElement;
}