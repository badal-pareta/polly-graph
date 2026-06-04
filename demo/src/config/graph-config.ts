/**
 * Demo Graph Configuration
 * Rich interaction configuration for V1 demo
 */

import type { GraphInteractionConfig, GraphControlsConfig, LegendConfig, GraphNode } from '../../../src';
import { SecondaryColor, StandardColor } from '../../../src/shared';

export const INTERACTION_CONFIG: GraphInteractionConfig = {
  hover: {
    enabled: true,
    tooltip: {
      enabled: true,
      theme: 'dark',
      renderContent: (node: GraphNode) => `<strong>${node.type}:</strong> ${node.label}`
    },
    nodeStyle: {
      strokeWidth: 3,
    },
    linkStyle: {
      strokeWidth: 3,
      opacity: 1,
    }
  },
  selection: {
    enabled: true,
    multiSelect: false,
    nodeStyle: {
      radius: 24,
      strokeWidth: 4,
      stroke: `color-mix(in srgb, ${SecondaryColor.ORANGE}, ${StandardColor.BLACK} 10%)`,
    },
    linkStyle: {
      strokeWidth: 4,
      opacity: 1,
      stroke: `color-mix(in srgb, ${SecondaryColor.ORANGE}, ${StandardColor.BLACK} 10%)`,
    }
  },
  drag: {
    enabled: true,
  },
};

export const CONTROLS_CONFIG: GraphControlsConfig = {
  enabled: true,
  position: 'bottom-left'
};

export const LEGEND_CONFIG: LegendConfig = {
  enabled: true,
  position: 'top-right',
  collapsible: true,
  defaultExpanded: true,
};