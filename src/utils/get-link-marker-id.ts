import { LinkStyle } from '../contracts/graph.types';

export function getLinkMarkerId(style: LinkStyle): string {
  const markerStyle = {
    stroke: style.stroke ?? '#94a3b8',
    strokeWidth: style.strokeWidth ?? 2,
    arrowFill: style.arrow?.fill ?? style.stroke ?? '#94a3b8',
    arrowSize: style.arrow?.size ?? 6
  };

  const serializedStyle: string = JSON.stringify(markerStyle);
  const hash: string = createHash(serializedStyle);

  return `graph-arrow-${hash}`;
}

function createHash(value: string): string {
  let hash: number = 0;

  for (let index: number = 0; index < value.length; index += 1) {
    const charCode: number = value.charCodeAt(index);
    hash = ((hash << 5) - hash) + charCode;
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}