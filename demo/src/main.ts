/**
 * Polly Graph Demo - V1 vs V2 Performance Comparison
 * Main application entry point
 */

// Import V1 implementation
import { createGraph } from '../../src/v1';
import type { GraphInstance } from '../../src/v1/contracts/graph-instance.interface';

// Import data generator with V1 types
import { generateGraphData, GENERATED_DATASETS, type DatasetName, type TestGraphData } from './data/generate-data';

// Import demo configuration
import { INTERACTION_CONFIG, CONTROLS_CONFIG, LEGEND_CONFIG } from './config/graph-config';

// Performance tracking
interface PerformanceMetrics {
  renderTime: number;
  initTime: number;
  dataLoadTime: number;
  lastUpdate: number;
}

class PollyGraphDemo {
  private v1Graph: GraphInstance | null = null;
  // private v2Graph: any | null = null; // Placeholder for V2
  private currentData: TestGraphData | null = null;
  private v1Metrics: PerformanceMetrics = { renderTime: 0, initTime: 0, dataLoadTime: 0, lastUpdate: 0 };
  // private v2Metrics: PerformanceMetrics = { renderTime: 0, initTime: 0, dataLoadTime: 0, lastUpdate: 0 };

  private elements = {
    datasetSelect: document.getElementById('dataset-select') as HTMLSelectElement,
    topologySelect: document.getElementById('topology-select') as HTMLSelectElement,
    generateBtn: document.getElementById('generate-btn') as HTMLButtonElement,
    resetViewBtn: document.getElementById('reset-view-btn') as HTMLButtonElement,
    stats: document.getElementById('stats') as HTMLDivElement,
    v1Container: document.getElementById('v1-container') as HTMLDivElement,
    v2Container: document.getElementById('v2-container') as HTMLDivElement,
    v1Perf: document.getElementById('v1-perf') as HTMLSpanElement,
    v2Perf: document.getElementById('v2-perf') as HTMLSpanElement
  };

  constructor() {
    this.setupEventListeners();
    this.generateInitialData();
  }

  private setupEventListeners() {
    this.elements.generateBtn.addEventListener('click', () => {
      this.generateNewData();
    });

    this.elements.resetViewBtn.addEventListener('click', () => {
      this.resetViews();
    });

    this.elements.datasetSelect.addEventListener('change', () => {
      this.loadPresetData();
    });

    this.elements.topologySelect.addEventListener('change', () => {
      this.generateNewData();
    });
  }

  private generateInitialData() {
    this.loadPresetData();
  }

  private loadPresetData() {
    const selectedDataset = this.elements.datasetSelect.value as DatasetName;
    this.showLoading('Loading preset dataset...');

    try {
      const startTime = performance.now();
      this.currentData = GENERATED_DATASETS[selectedDataset]();
      const loadTime = performance.now() - startTime;

      this.updateStats(`Loaded ${selectedDataset} dataset`, loadTime);
      this.renderGraphs();
    } catch (error) {
      this.showError(`Failed to load preset data: ${error}`);
    }
  }

  private generateNewData() {
    const selectedDataset = this.elements.datasetSelect.value as DatasetName;
    const topology = this.elements.topologySelect.value;
    const isClustered = topology === 'clustered';

    this.showLoading('Generating new graph data...');
    this.elements.generateBtn.disabled = true;

    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      try {
        const startTime = performance.now();

        // Get node count from dataset selection
        const nodeCount = this.getNodeCountForDataset(selectedDataset);
        const avgConnections = this.getAvgConnectionsForDataset(selectedDataset);

        this.currentData = generateGraphData(nodeCount, avgConnections, isClustered);
        const loadTime = performance.now() - startTime;

        this.updateStats(`Generated ${selectedDataset} dataset (${topology})`, loadTime);
        this.renderGraphs();
      } catch (error) {
        this.showError(`Failed to generate data: ${error}`);
      } finally {
        this.elements.generateBtn.disabled = false;
      }
    }, 100);
  }

  private getNodeCountForDataset(dataset: DatasetName): number {
    const counts = {
      tiny: 10,
      small: 50,
      medium: 100,
      large: 500,
      xl: 1000,
      xxl: 5000,
      huge: 25000,
      massive: 50000
    };
    return counts[dataset];
  }

  private getAvgConnectionsForDataset(dataset: DatasetName): number {
    const connections = {
      tiny: 2,
      small: 2.5,
      medium: 3,
      large: 3.5,
      xl: 4,
      xxl: 3,
      huge: 2.5,
      massive: 2
    };
    return connections[dataset];
  }

  private async renderGraphs() {
    if (!this.currentData) {
      this.showError('No data available to render');
      return;
    }

    // Render V1 graph
    await this.renderV1Graph();

    // V2 would be rendered here when implemented
    this.showV2Placeholder();
  }

  private async renderV1Graph(): Promise<void> {
    if (!this.currentData) return;

    try {
      this.elements.v1Perf.textContent = 'Rendering...';
      this.elements.v1Perf.className = 'performance-indicator';

      const startTime = performance.now();

      // Cleanup existing graph
      if (this.v1Graph) {
        this.v1Graph.destroy();
        this.v1Graph = null;
      }

      // Clear container
      this.elements.v1Container.innerHTML = '';

      const initStart = performance.now();

      // Create V1 graph
      this.v1Graph = createGraph({
        container: this.elements.v1Container,
        nodes: this.currentData.nodes,
        links: this.currentData.links,
        controls: CONTROLS_CONFIG,
        legend: LEGEND_CONFIG,
        interaction: INTERACTION_CONFIG
      });

      const initTime = performance.now() - initStart;

      // Configure graph styling
      this.configureV1Graph();

      // Render the graph
      const renderStart = performance.now();
      await this.v1Graph.render();
      const renderTime = performance.now() - renderStart;

      const totalTime = performance.now() - startTime;

      // Update metrics
      this.v1Metrics = {
        renderTime,
        initTime,
        dataLoadTime: 0, // Already tracked elsewhere
        lastUpdate: Date.now()
      };

      // Update performance indicator
      this.updateV1Performance(totalTime);

    } catch (error) {
      this.showError(`V1 render failed: ${error}`);
      this.elements.v1Perf.textContent = 'Error';
      this.elements.v1Perf.className = 'performance-indicator slow';
    }
  }

  private configureV1Graph() {
    if (!this.v1Graph) return;

    // Add event listeners for demonstration
    this.v1Graph.on('nodeSelect', (node) => {
      console.log('V1 - Node selected:', node);
    });

    this.v1Graph.on('linkSelect', (link) => {
      console.log('V1 - Link selected:', link);
    });
  }

  private showV2Placeholder() {
    // V2 placeholder is already in HTML
    this.elements.v2Perf.textContent = 'Coming Soon';
    this.elements.v2Perf.className = 'performance-indicator';
  }

  private updateV1Performance(totalTime: number) {
    const timeText = totalTime < 1000 ?
      `${Math.round(totalTime)}ms` :
      `${(totalTime / 1000).toFixed(1)}s`;

    this.elements.v1Perf.textContent = timeText;
    this.elements.v1Perf.className = totalTime < 500 ?
      'performance-indicator fast' :
      totalTime < 2000 ?
        'performance-indicator' :
        'performance-indicator slow';
  }

  private resetViews() {
    if (this.v1Graph) {
      this.v1Graph.fitView();
    }
    // V2 reset would go here when implemented
  }

  private updateStats(message: string, loadTime?: number) {
    if (!this.currentData) return;

    const { nodes, links, metadata } = this.currentData;
    const loadTimeText = loadTime ? ` (${Math.round(loadTime)}ms)` : '';

    this.elements.stats.innerHTML = `
      ${message}${loadTimeText} •
      <strong>${nodes.length.toLocaleString()}</strong> nodes •
      <strong>${links.length.toLocaleString()}</strong> links •
      <strong>${metadata.avgConnections.toFixed(1)}</strong> avg connections
    `;
  }

  private showLoading(message: string) {
    this.elements.stats.innerHTML = `<div class="loading">${message}</div>`;
  }

  private showError(message: string) {
    this.elements.stats.innerHTML = `<div class="error">${message}</div>`;
    console.error(message);
  }
}

// Initialize the demo when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    new PollyGraphDemo();
  } catch (error) {
    console.error('Failed to initialize Polly Graph Demo:', error);
    document.getElementById('stats')!.innerHTML =
      `<div class="error">Failed to initialize demo: ${error}</div>`;
  }
});

// Add some global debugging helpers
(window as any).pollyDemo = {
  generateCustomData: (nodes: number, connections: number = 3, clustered: boolean = true) => {
    return generateGraphData(nodes, connections, clustered);
  }
};
