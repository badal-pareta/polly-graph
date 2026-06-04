/**
 * Shared Constants - Polly Graph
 * Colors, themes, and other constants used across V1, V2, and demo
 */

// Re-export colors
export * from './colors';
import { PrimaryColor, SecondaryColor, NeutralColor, StandardColor } from './colors';

// Build default theme colors from our color constants
export const DEFAULT_COLORS = {
  // Node colors palette built from our color constants
  nodes: [
    PrimaryColor.BLUE,
    PrimaryColor.ORANGE,
    PrimaryColor.GREEN,
    PrimaryColor.RED,
    PrimaryColor.PURPLE,
    SecondaryColor.ORANGE,
    PrimaryColor.PINK,
    NeutralColor.BLUE,
    PrimaryColor.YELLOW,
    PrimaryColor.CYAN
  ],

  // Link colors using neutral tones
  links: {
    default: NeutralColor.BLUE,
    hover: SecondaryColor.BLUE,
    selected: PrimaryColor.BLUE
  },

  // Interaction states using primary colors
  interaction: {
    nodeHover: PrimaryColor.PINK,
    nodeSelected: PrimaryColor.CYAN,
    linkHover: PrimaryColor.PINK,
    linkSelected: PrimaryColor.CYAN
  },

  // UI colors using standard and neutral colors
  ui: {
    background: StandardColor.WHITE,
    text: StandardColor.BLACK,
    border: NeutralColor.BLUE,
    shadow: NeutralColor.PURPLE
  }
} as const;

// Export types
export type NodeColorPalette = typeof DEFAULT_COLORS.nodes;
export type LinkColors = typeof DEFAULT_COLORS.links;
export type InteractionColors = typeof DEFAULT_COLORS.interaction;
export type UIColors = typeof DEFAULT_COLORS.ui;