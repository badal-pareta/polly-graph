import { Selection } from 'd3-selection';
import { GraphInteractionConfig } from './graph-config.interface';

export interface GraphRenderContext {
  readonly svg: SVGSVGElement;
  readonly root: Selection<SVGGElement, unknown, null, undefined>;
  readonly interaction?: GraphInteractionConfig;
}