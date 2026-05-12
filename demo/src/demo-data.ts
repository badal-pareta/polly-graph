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
          <strong>${node.type}:</strong> ${node.label}<br/>
          <small style="opacity: 0.8;">${node.tooltip || 'Knowledge Graph Entity'}</small>
        </div>
      `,
    },

    nodeStyle: {
      stroke: '#16a34a',
      strokeWidth: 3,
      opacity: 1,
    },

    linkStyle: {
      stroke: '#f59e0b',
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

// Knowledge Graph Demo Data - Biomedical Research Focus
export const demoNodes: GraphNode[] = [
  // Central Hub: COVID-19 Disease
  {
    id: 'disease-covid19',
    type: 'Disease',
    label: 'COVID-19',
    tooltip: 'SARS-CoV-2 respiratory disease',
    style: {
      radius: 35,
      fill: '#dc2626',
      stroke: '#b91c1c',
      strokeWidth: 3,
      opacity: 1,
      textColor: '#ffffff',
    },
  },

  // Related Diseases
  {
    id: 'disease-pneumonia',
    type: 'Disease',
    label: 'Pneumonia',
    tooltip: 'Lung inflammation complication',
    style: {
      radius: 22,
      fill: '#ef4444',
      stroke: '#dc2626',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },

  {
    id: 'disease-ards',
    type: 'Disease',
    label: 'ARDS',
    tooltip: 'Acute Respiratory Distress Syndrome',
    style: {
      radius: 20,
      fill: '#f87171',
      stroke: '#ef4444',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },

  // Genes/Proteins
  {
    id: 'gene-ace2',
    type: 'Gene',
    label: 'ACE2',
    tooltip: 'Angiotensin Converting Enzyme 2',
    style: {
      radius: 24,
      fill: '#3b82f6',
      stroke: '#2563eb',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },

  {
    id: 'protein-spike',
    type: 'Protein',
    label: 'Spike Protein',
    tooltip: 'SARS-CoV-2 viral entry protein',
    style: {
      radius: 22,
      fill: '#6366f1',
      stroke: '#4f46e5',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },

  {
    id: 'gene-il6',
    type: 'Gene',
    label: 'IL-6',
    tooltip: 'Interleukin 6 inflammatory cytokine',
    style: {
      radius: 20,
      fill: '#8b5cf6',
      stroke: '#7c3aed',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },

  // Treatments/Drugs
  {
    id: 'drug-remdesivir',
    type: 'Drug',
    label: 'Remdesivir',
    tooltip: 'Antiviral medication',
    style: {
      radius: 24,
      fill: '#059669',
      stroke: '#047857',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },

  {
    id: 'drug-dexamethasone',
    type: 'Drug',
    label: 'Dexamethasone',
    tooltip: 'Corticosteroid anti-inflammatory',
    style: {
      radius: 22,
      fill: '#0d9488',
      stroke: '#0f766e',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },

  {
    id: 'therapy-oxygen',
    type: 'Therapy',
    label: 'Oxygen Therapy',
    tooltip: 'Respiratory support treatment',
    style: {
      radius: 20,
      fill: '#06b6d4',
      stroke: '#0891b2',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },

  // Symptoms
  {
    id: 'symptom-fever',
    type: 'Symptom',
    label: 'Fever',
    tooltip: 'Elevated body temperature',
    style: {
      radius: 18,
      fill: '#f59e0b',
      stroke: '#d97706',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },

  {
    id: 'symptom-cough',
    type: 'Symptom',
    label: 'Cough',
    tooltip: 'Respiratory symptom',
    style: {
      radius: 18,
      fill: '#f59e0b',
      stroke: '#d97706',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },

  {
    id: 'symptom-dyspnea',
    type: 'Symptom',
    label: 'Dyspnea',
    tooltip: 'Shortness of breath',
    style: {
      radius: 18,
      fill: '#f59e0b',
      stroke: '#d97706',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },

  // Risk Factors
  {
    id: 'risk-age',
    type: 'Risk Factor',
    label: 'Advanced Age',
    tooltip: 'Age > 65 years',
    style: {
      radius: 16,
      fill: '#84cc16',
      stroke: '#65a30d',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },

  {
    id: 'risk-diabetes',
    type: 'Risk Factor',
    label: 'Diabetes',
    tooltip: 'Diabetes mellitus comorbidity',
    style: {
      radius: 16,
      fill: '#84cc16',
      stroke: '#65a30d',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },

  // Biomarkers
  {
    id: 'biomarker-crp',
    type: 'Biomarker',
    label: 'C-Reactive Protein',
    tooltip: 'Inflammation marker',
    style: {
      radius: 16,
      fill: '#a855f7',
      stroke: '#9333ea',
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    },
  },
];

export const demoLinks: GraphLink[] = [
  // COVID-19 hub connections
  {
    source: 'disease-covid19',
    target: 'disease-pneumonia',
    label: 'causes',
    style: {
      stroke: '#ef4444',
      strokeWidth: 3,
      opacity: 0.8,
      label: { enabled: true, visibility: 'hover' }
    },
  },

  {
    source: 'disease-covid19',
    target: 'disease-ards',
    label: 'can lead to',
    style: {
      stroke: '#ef4444',
      strokeWidth: 2,
      opacity: 0.8,
      label: { enabled: true, visibility: 'hover' }
    },
  },

  {
    source: 'disease-covid19',
    target: 'gene-ace2',
    label: 'targets receptor',
    style: {
      stroke: '#3b82f6',
      strokeWidth: 3,
      opacity: 0.8,
      label: { enabled: true, visibility: 'hover' }
    },
  },

  {
    source: 'disease-covid19',
    target: 'protein-spike',
    label: 'viral protein',
    style: {
      stroke: '#6366f1',
      strokeWidth: 3,
      opacity: 0.8,
      label: { enabled: true, visibility: 'hover' }
    },
  },

  {
    source: 'disease-covid19',
    target: 'symptom-fever',
    label: 'presents with',
    style: {
      stroke: '#f59e0b',
      strokeWidth: 2,
      opacity: 0.8,
      label: { enabled: true, visibility: 'hover' }
    },
  },

  {
    source: 'disease-covid19',
    target: 'symptom-cough',
    label: 'presents with',
    style: {
      stroke: '#f59e0b',
      strokeWidth: 2,
      opacity: 0.8,
      label: { enabled: true, visibility: 'hover' }
    },
  },

  {
    source: 'disease-covid19',
    target: 'symptom-dyspnea',
    label: 'presents with',
    style: {
      stroke: '#f59e0b',
      strokeWidth: 2,
      opacity: 0.8,
      label: { enabled: true, visibility: 'hover' }
    },
  },

  // Treatment connections
  {
    source: 'drug-remdesivir',
    target: 'disease-covid19',
    label: 'treats',
    style: {
      stroke: '#059669',
      strokeWidth: 3,
      opacity: 0.8,
      label: { enabled: true, visibility: 'hover' }
    },
  },

  {
    source: 'drug-dexamethasone',
    target: 'disease-covid19',
    label: 'reduces inflammation',
    style: {
      stroke: '#0d9488',
      strokeWidth: 2,
      opacity: 0.8,
      label: { enabled: true, visibility: 'hover' }
    },
  },

  {
    source: 'therapy-oxygen',
    target: 'disease-covid19',
    label: 'supportive care',
    style: {
      stroke: '#06b6d4',
      strokeWidth: 2,
      opacity: 0.8,
      label: { enabled: true, visibility: 'hover' }
    },
  },

  // Risk factor connections
  {
    source: 'risk-age',
    target: 'disease-covid19',
    label: 'increases risk',
    style: {
      stroke: '#84cc16',
      strokeWidth: 2,
      opacity: 0.7,
      dashArray: '4 4',
      label: { enabled: true, visibility: 'hover' }
    },
  },

  {
    source: 'risk-diabetes',
    target: 'disease-covid19',
    label: 'increases risk',
    style: {
      stroke: '#84cc16',
      strokeWidth: 2,
      opacity: 0.7,
      dashArray: '4 4',
      label: { enabled: true, visibility: 'hover' }
    },
  },

  // Inflammatory pathway
  {
    source: 'disease-covid19',
    target: 'gene-il6',
    label: 'upregulates',
    style: {
      stroke: '#8b5cf6',
      strokeWidth: 2,
      opacity: 0.8,
      label: { enabled: true, visibility: 'hover' }
    },
  },

  {
    source: 'gene-il6',
    target: 'biomarker-crp',
    label: 'increases',
    style: {
      stroke: '#a855f7',
      strokeWidth: 2,
      opacity: 0.7,
      label: { enabled: true, visibility: 'hover' }
    },
  },

  // Protein interactions
  {
    source: 'protein-spike',
    target: 'gene-ace2',
    label: 'binds to',
    style: {
      stroke: '#4338ca',
      strokeWidth: 3,
      opacity: 0.8,
      label: { enabled: true, visibility: 'hover' }
    },
  },

  // Cross-connections for network complexity
  {
    source: 'disease-pneumonia',
    target: 'therapy-oxygen',
    label: 'treated with',
    style: {
      stroke: '#0891b2',
      strokeWidth: 2,
      opacity: 0.6,
      label: { enabled: true, visibility: 'hover' }
    },
  },

  {
    source: 'drug-dexamethasone',
    target: 'gene-il6',
    label: 'suppresses',
    style: {
      stroke: '#0f766e',
      strokeWidth: 2,
      opacity: 0.7,
      label: { enabled: true, visibility: 'hover' }
    },
  },
];