import { ZoomBehavior } from 'd3-zoom';

export interface ZoomConfig {
  /**
   * SVG host element.
   *
   * Required because d3-zoom internally reads:
   * width.baseVal
   * height.baseVal
   *
   * which exists only on SVGSVGElement,
   * not on <g>.
   */
  svg: SVGSVGElement;

  /**
   * Interaction layer used for
   * pointer semantics / event filtering.
   */
  interactionLayer: SVGGElement;

  /**
   * Root graph group that receives
   * transform updates during zoom/pan.
   */
  root: SVGGElement;

  /**
   * Min/max zoom scale.
   */
  scaleExtent?: [
    number,
    number,
  ];
}

export interface ZoomResult {
  /**
   * Zoom is attached to SVGSVGElement,
   * not SVGGElement.
   */
  readonly behavior: ZoomBehavior<
    SVGSVGElement,
    unknown
  >;

  readonly cleanup: VoidFunction;
}