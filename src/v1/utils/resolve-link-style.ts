import { GraphLink, LinkStyle, ResolvedLinkStyle } from '../contracts/graph.types';
import { GraphInteractionConfig } from '../contracts/graph-config.interface';

interface ResolveLinkStyleParams {
  readonly link: GraphLink;
  readonly interaction?: GraphInteractionConfig;
  readonly isHovered?: boolean;
  readonly isSelected?: boolean;
}

const DEFAULT_LINK_STYLE: ResolvedLinkStyle = {
  stroke: '#94a3b8',
  strokeWidth: 2,
  opacity: 0.9,
  dashArray: undefined,
  arrow: {
    enabled: true,
    size: 6,
    fill: '#94a3b8',
  },
  label: {
    enabled: true,
    visibility: 'always',
    backgroundFill: 'color-mix(in srgb, #8E42EE, #FFFFFF 90%)',
    borderColor: 'color-mix(in srgb, #8E42EE, #FFFFFF 10%)',
    borderWidth: 1.5,
    borderRadius: 4,
    textColor: 'color-mix(in srgb, #8E42EE, #000000 40%)',
    fontSize: 10,
    paddingX: 8,
    paddingY: 4,
    height: 24,
  },
};

export function resolveLinkStyle(params: ResolveLinkStyleParams): ResolvedLinkStyle {
  const baseStyle: ResolvedLinkStyle = mergeLinkStyle(DEFAULT_LINK_STYLE, params.link.style);

  if (params.isSelected) {
    return mergeLinkStyle(baseStyle, params.interaction?.selection?.linkStyle);
  }

  if (params.isHovered) {
    return mergeLinkStyle(baseStyle, params.interaction?.hover?.linkStyle);
  }

  return baseStyle;
}

function mergeLinkStyle(base: ResolvedLinkStyle, override?: Partial<LinkStyle>): ResolvedLinkStyle {
  const stroke: string = override?.stroke ?? base.stroke;

  return {
    stroke,
    strokeWidth: override?.strokeWidth ?? base.strokeWidth,
    opacity: override?.opacity ?? base.opacity,
    dashArray: override?.dashArray ?? base.dashArray,
    arrow: {
      enabled: override?.arrow?.enabled ?? base.arrow.enabled,
      size: override?.arrow?.size ?? base.arrow.size,
      fill: override?.arrow?.fill ?? override?.stroke ?? (base.arrow.fill || base.stroke)
    },
    label: {
      enabled: override?.label?.enabled ?? base.label.enabled,
      visibility: override?.label?.visibility ?? base.label.visibility,
      backgroundFill:
        override?.label?.backgroundFill ??
        base.label.backgroundFill,
      borderColor:
        override?.label?.borderColor ??
        base.label.borderColor,
      borderWidth:
        override?.label?.borderWidth ??
        base.label.borderWidth,
      borderRadius:
        override?.label?.borderRadius ??
        base.label.borderRadius,
      textColor:
        override?.label?.textColor ??
        base.label.textColor,
      fontSize:
        override?.label?.fontSize ??
        base.label.fontSize,
      paddingX:
        override?.label?.paddingX ??
        base.label.paddingX,
      paddingY:
        override?.label?.paddingY ??
        base.label.paddingY,
      height:
        override?.label?.height ??
        base.label.height,
    },
  };
}