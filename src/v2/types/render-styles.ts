/**
 * V2 Canvas Graph - Render Style Types
 *
 * Canvas-optimized style interfaces for high-performance rendering
 */

import { PrimaryColor, StandardColor } from '../../shared/constants/colors';

export interface NodeRenderStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  opacity: number;
}

export interface LinkLabelRenderStyle {
  enabled: boolean;
  visibility: 'always' | 'hover' | 'selection';
  text: string;
  font: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
}

export interface LinkRenderStyle {
  stroke: string;
  strokeWidth: number;
  opacity: number;
  arrow?: ArrowRenderStyle;
  label?: LinkLabelRenderStyle;
}

// export interface NodeRenderStyle {
//   readonly radius: number;
//   readonly fill: string;
//   readonly stroke: string;
//   readonly strokeWidth: number;
//   readonly opacity: number;
// }

export interface ArrowRenderStyle {
  readonly enabled: boolean;
  readonly length: number;
  readonly width: number;
  readonly fill: string;
}

// export interface LinkRenderStyle {
//   readonly stroke: string;
//   readonly strokeWidth: number;
//   readonly opacity: number;
//   readonly dashPattern?: number[]; // Canvas dash array
//   readonly arrow: ArrowRenderStyle;
// }

export interface HoverStyles {
  readonly node: Partial<NodeRenderStyle>;
  readonly link: Partial<LinkRenderStyle>;
}

export interface RenderStyles {
  readonly node: Partial<NodeRenderStyle>;
  readonly link: Partial<LinkRenderStyle>;
  readonly hover: HoverStyles;
}

export interface CanvasRenderConfig {
  readonly devicePixelRatio?: number;
  readonly antialias?: boolean;
  readonly alpha?: boolean;
}

// Default style constants (inspired by V1 but optimized for canvas)
export const DEFAULT_NODE_STYLE: NodeRenderStyle = {
  radius: 5,
  fill: '#6c5ce7',
  stroke: '#000000',
  strokeWidth: 1.5,
  opacity: 1.0
};

export const DEFAULT_LINK_LABEL_STYLE: LinkLabelRenderStyle = {
  enabled: true,
  visibility: 'always',
  text: '',
  font: '10px Arial',
  textColor: `color-mix(in srgb, ${PrimaryColor.PURPLE}, ${StandardColor.BLACK} 40%)`,
  backgroundColor: `color-mix(in srgb, ${PrimaryColor.PURPLE}, ${StandardColor.WHITE} 90%)`,
  borderColor: `color-mix(in srgb, ${PrimaryColor.PURPLE}, ${StandardColor.WHITE} 10%)`,
  borderWidth: 1.5,
  borderRadius: 4,
  paddingX: 8,
  paddingY: 4
};

export const DEFAULT_LINK_STYLE: LinkRenderStyle = {
  stroke: '#94a3b8',
  strokeWidth: 2,
  opacity: 0.9,
  arrow: {
    enabled: true,
    length: 4,
    width: 3,
    fill: '#94a3b8'
  },
  label: DEFAULT_LINK_LABEL_STYLE
};

export const DEFAULT_HOVER_STYLES: HoverStyles = {
  node: {
    fill: '#ff6b6b',
    stroke: '#ffffff',
    strokeWidth: 3,
    radius: 6 // 20% larger than default
  },
  link: {
    stroke: '#ff6b6b',
    strokeWidth: 3,
    opacity: 1.0,
    arrow: {
      enabled: true,
      length: 4,
      width: 3,
      fill: '#ff6b6b'
    }
  }
};

// Type guards for style validation
export function isValidNodeStyle(style: any): style is Partial<NodeRenderStyle> {
  if (!style || typeof style !== 'object') return false;

  const validKeys = ['radius', 'fill', 'stroke', 'strokeWidth', 'opacity'];
  return Object.keys(style).every(key => validKeys.includes(key));
}

export function isValidLinkStyle(style: any): style is Partial<LinkRenderStyle> {
  if (!style || typeof style !== 'object') return false;

  const validKeys = ['stroke', 'strokeWidth', 'opacity', 'arrow', 'label'];
  return Object.keys(style).every(key => validKeys.includes(key));
}

// Utility for deep merging styles (performance optimized)
export function mergeNodeStyle(base: NodeRenderStyle, override?: Partial<NodeRenderStyle>): NodeRenderStyle {
  if (!override) return base;

  return {
    radius: override.radius ?? base.radius,
    fill: override.fill ?? base.fill,
    stroke: override.stroke ?? base.stroke,
    strokeWidth: override.strokeWidth ?? base.strokeWidth,
    opacity: override.opacity ?? base.opacity
  };
}

export function mergeLinkStyle(base: LinkRenderStyle, override?: Partial<LinkRenderStyle>): LinkRenderStyle {
  if (!override) return base;

  return {
    stroke: override.stroke ?? base.stroke,
    strokeWidth: override.strokeWidth ?? base.strokeWidth,
    opacity: override.opacity ?? base.opacity,
    arrow: base.arrow ? {
      enabled: override.arrow?.enabled ?? base.arrow.enabled,
      length: override.arrow?.length ?? base.arrow.length,
      width: override.arrow?.width ?? base.arrow.width,
      fill: override.arrow?.fill ?? override.stroke ?? base.arrow.fill
    } : override.arrow,
    label: base.label ? {
      enabled: override.label?.enabled ?? base.label.enabled,
      visibility: override.label?.visibility ?? base.label.visibility,
      text: override.label?.text ?? base.label.text,
      font: override.label?.font ?? base.label.font,
      textColor: override.label?.textColor ?? base.label.textColor,
      backgroundColor: override.label?.backgroundColor ?? base.label.backgroundColor,
      borderColor: override.label?.borderColor ?? base.label.borderColor,
      borderWidth: override.label?.borderWidth ?? base.label.borderWidth,
      borderRadius: override.label?.borderRadius ?? base.label.borderRadius,
      paddingX: override.label?.paddingX ?? base.label.paddingX,
      paddingY: override.label?.paddingY ?? base.label.paddingY
    } : override.label
  };
}