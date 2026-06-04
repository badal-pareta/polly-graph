import { LinkStyle } from '../contracts/graph.types';
import { getLinkMarkerId } from '../utils/get-link-marker-id';

interface CreateArrowMarkerParams {
  readonly svg: SVGSVGElement;
  readonly style: LinkStyle;
}

export function createArrowMarker(params: CreateArrowMarkerParams): string {
  const markerId: string = getLinkMarkerId(params.style);
  const existingMarker = params.svg.querySelector(`#${markerId}`);

  if (existingMarker) {
    return markerId;
  }

  const arrowSize: number = params.style.arrow?.size ?? 6;

  const fill: string = params.style.arrow?.fill ?? params.style.stroke ?? '#94a3b8';

  const defs: SVGDefsElement = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

  const marker: SVGMarkerElement = document.createElementNS('http://www.w3.org/2000/svg', 'marker');

  marker.setAttribute('id', markerId);

  /**
   * Marker geometry:
   *
   * Path:
   * M 0 0 L 20 10 L 0 20 z
   *
   * - base of arrow = x: 0
   * - tip of arrow  = x: 20
   *
   * Required behavior:
   *
   * - line end should connect to arrow base
   * - arrow tip should touch target node circumference
   *
   * Therefore:
   *
   * refX must be 0 (arrow base),
   * not 16 / 18 / 20.
   */
  marker.setAttribute('viewBox', '0 0 20 20');
  marker.setAttribute('refX', '0');
  marker.setAttribute('refY', '10');

  /**
   * Keep scaling deterministic:
   * visual arrow length = markerWidth
   */
  marker.setAttribute('markerWidth', String(arrowSize * 2));

  marker.setAttribute('markerHeight', String(arrowSize * 2));

  marker.setAttribute('orient', 'auto');
  marker.setAttribute('markerUnits', 'userSpaceOnUse');

  const path: SVGPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  path.setAttribute('d', 'M 0 0 L 20 10 L 0 20 z');
  path.setAttribute('fill', fill);

  marker.appendChild(path);
  defs.appendChild(marker);

  params.svg.insertBefore(defs, params.svg.firstChild);

  return markerId;
}