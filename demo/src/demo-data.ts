import {
  GraphNode,
  GraphLink,
} from '../../src/contracts/graph.types';
import { GraphInteractionConfig } from '../../src/contracts/graph-config.interface';

export const demoInteractionConfig: GraphInteractionConfig = {
  drag: {
    enabled: true,
  },

  hover: {
    enabled: true,

    tooltip: {
      enabled: true,
      theme: 'dark',

      renderContent: (
        node: GraphNode,
      ): string => `
        <div style="padding: 8px;">
          <strong>${node.type ?? 'Node'}:</strong>
          ${node.label ?? node.id}
        </div>
      `,
    },

    nodeStyle: {
      stroke: '#16a34a',
      strokeWidth: 3,
      opacity: 1,
    },

    linkStyle: {
      stroke:
        'color-mix(in srgb, #F78E12, #000000 10%)',
      strokeWidth: 3,
      opacity: 1,
    },
  },

  selection: {
    enabled: true,
    multiSelect: false,

    nodeStyle: {
      stroke: '#f59e0b',
      strokeWidth: 4,
      opacity: 1,
    },

    linkStyle: {
      stroke: '#f59e0b',
      strokeWidth: 3,
      opacity: 1,
    },
  },
};

export const demoNodes: GraphNode[] = [
  {
    id: 'disease-asthma',
    type: 'Disease',
    label: 'Asthma',
    style: {
      radius: 24,
      fill: '#7c3aed',
      stroke: '#6d28d9',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },

  {
    id: 'disease-common-cold',
    type: 'Disease',
    label: 'Common Cold',
    style: {
      radius: 24,
      fill: '#2563eb',
      stroke: '#1d4ed8',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },

  {
    id: 'drug-aspirin',
    type: 'Drug',
    label: 'Aspirin',
    style: {
      radius: 20,
      fill: '#059669',
      stroke: '#047857',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },

  {
    id: 'gene-il6',
    type: 'Gene',
    label: 'IL6',
    style: {
      radius: 20,
      fill: '#dc2626',
      stroke: '#b91c1c',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },
];

export const demoLinks: GraphLink[] = [
  {
    source: 'drug-aspirin',
    target: 'disease-asthma',
    label: 'used for',

    style: {
      stroke:
        'color-mix(in srgb, #F78E12, #000000 10%)',
      strokeWidth: 5,
      opacity: 0.9,

      label: {
        enabled: true,
        visibility: 'hover'
      },
    },
  },

  {
    source: 'drug-aspirin',
    target: 'disease-common-cold',
    label: 'used for',

    style: {
      stroke: '#94a3b8',
      strokeWidth: 2,
      opacity: 0.9,
    },
  },

  {
    source: 'gene-il6',
    target: 'disease-asthma',
    label: 'associated with',

    style: {
      stroke: '#dc2626',
      strokeWidth: 2,
      opacity: 0.9,
      dashArray: '6 4',
    },
  },
];