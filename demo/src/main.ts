/**
 * Polly Graph Demo - V1 vs V2 Performance Comparison
 * Main application entry point
 */

// Import V1 implementation
// import { createGraph } from '../../src/v1';
// import type { GraphInstance as V1GraphInstance } from '../../src/v1/contracts/graph-instance.interface';

// Import V2 implementation (direct V2 implementation, not wrapper)
import { createV2Graph } from '../../src/v2';
import type { GraphInstance as V2GraphInstance } from '../../src/v2';

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
  private currentGraph: V2GraphInstance | null = null;
  private currentVersion: 'v1' | 'v2' = 'v1';
  private currentData: TestGraphData | null = null;
  private metrics: PerformanceMetrics = { renderTime: 0, initTime: 0, dataLoadTime: 0, lastUpdate: 0 };

  private elements = {
    datasetSelect: document.getElementById('dataset-select') as HTMLSelectElement,
    topologySelect: document.getElementById('topology-select') as HTMLSelectElement,
    generateBtn: document.getElementById('generate-btn') as HTMLButtonElement,
    resetViewBtn: document.getElementById('reset-view-btn') as HTMLButtonElement,
    exportPngBtn: document.getElementById('export-png-btn') as HTMLButtonElement,
    exportShadowBtn: document.getElementById('export-shadow-btn') as HTMLButtonElement,
    stats: document.getElementById('stats') as HTMLDivElement,
    container: document.getElementById('graph-container') as HTMLDivElement,
    currentVersion: document.getElementById('current-version') as HTMLSpanElement,
    performance: document.getElementById('performance') as HTMLSpanElement,
    toggleVersion: document.getElementById('toggle-version') as HTMLButtonElement
  };

  constructor() {
    this.setupEventListeners();
    this.setupCleanupHandlers();
    this.generateInitialData();
  }

  private setupEventListeners() {
    this.elements.generateBtn.addEventListener('click', () => {
      this.generateNewData();
    });

    this.elements.resetViewBtn.addEventListener('click', () => {
      this.resetView();
    });

    this.elements.datasetSelect.addEventListener('change', () => {
      this.loadPresetData();
    });

    this.elements.topologySelect.addEventListener('change', () => {
      this.generateNewData();
    });

    this.elements.toggleVersion.addEventListener('click', () => {
      this.toggleVersion();
    });

    this.elements.exportPngBtn.addEventListener('click', () => {
      this.exportPNG();
    });

    this.elements.exportShadowBtn.addEventListener('click', () => {
      this.exportShadowCanvas();
    });
  }

  private setupCleanupHandlers() {
    // Cleanup on page unload to prevent memory leaks
    window.addEventListener('beforeunload', () => {
      this.destroy();
    });

    // Cleanup on visibility change (when user switches tabs)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Pause any ongoing animations or processes when tab is hidden
        if (this.currentGraph) {
          // Most graph libraries have a pause/stop method
          try {
            (this.currentGraph as any).pause?.();
          } catch (e) {
            // Ignore if pause method doesn't exist
          }
        }
      }
    });
  }

  /**
   * Clean up all resources to prevent memory leaks
   */
  private destroy() {
    try {
      // Destroy current graph and remove event listeners
      if (this.currentGraph) {
        this.removeGraphEventListeners();
        this.currentGraph.destroy();
        this.currentGraph = null;
      }

      // Clear container
      if (this.elements.container) {
        this.elements.container.innerHTML = '';
      }

      // Clear data references
      this.currentData = null;

      // Reset metrics
      this.metrics = { renderTime: 0, initTime: 0, dataLoadTime: 0, lastUpdate: 0 };

    } catch (error) {
      console.error('Error during cleanup:', error);
    }
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
      this.renderCurrentGraph();
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
        this.renderCurrentGraph();
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

  private async renderCurrentGraph() {
    if (!this.currentData) {
      this.showError('No data available to render');
      return;
    }

    if (this.currentVersion === 'v1') {
      await this.renderV1Graph();
    } else {
      await this.renderV2Graph();
    }
  }

  private async renderV1Graph(): Promise<void> {
    if (!this.currentData) return;

    try {
      this.elements.performance.textContent = 'Rendering V1...';
      this.elements.performance.className = 'performance-indicator';

      const startTime = performance.now();

      // Cleanup existing graph and its event listeners
      if (this.currentGraph) {
        this.removeGraphEventListeners();
        this.currentGraph.destroy();
        this.currentGraph = null;
      }

      // Clear container
      this.elements.container.innerHTML = '';

      const initStart = performance.now();

      // Create V1 graph
      // this.currentGraph = createGraph({
      //   container: this.elements.container,
      //   nodes: this.currentData.nodes,
      //   links: this.currentData.links,
      //   controls: CONTROLS_CONFIG,
      //   legend: LEGEND_CONFIG,
      //   interaction: INTERACTION_CONFIG
      // });

      const initTime = performance.now() - initStart;

      // Configure graph styling
      this.configureV1Graph();

      // Render the graph
      const renderStart = performance.now();
      await this.currentGraph.render();
      const renderTime = performance.now() - renderStart;

      const totalTime = performance.now() - startTime;

      // Update metrics
      this.metrics = {
        renderTime,
        initTime,
        dataLoadTime: 0, // Already tracked elsewhere
        lastUpdate: Date.now()
      };

      // Update performance indicator and version info
      this.updatePerformance(totalTime);
      this.elements.currentVersion.textContent = 'V1 - SVG Implementation';

    } catch (error) {
      this.showError(`V1 render failed: ${error}`);
      this.elements.performance.textContent = 'Error';
      this.elements.performance.className = 'performance-indicator slow';
    }
  }

  private configureV1Graph() {
    if (!this.currentGraph) return;

    // Add event listeners for demonstration (stored for cleanup)
    const nodeSelectHandler = (node: any) => {
      console.log('V1 - Node selected:', node);
    };

    const linkSelectHandler = (link: any) => {
      console.log('V1 - Link selected:', link);
    };

    this.currentGraph.on('nodeSelect', nodeSelectHandler);
    this.currentGraph.on('linkSelect', linkSelectHandler);

    // Store handlers for cleanup
    (this.currentGraph as any).__eventHandlers = {
      nodeSelect: nodeSelectHandler,
      linkSelect: linkSelectHandler
    };
  }

  private configureV2Graph() {
    if (!this.currentGraph) return;

    // Add event listeners for demonstration (stored for cleanup)
    const nodeSelectHandler = (node: any) => {
      console.log('V2 - Node selected:', node);
    };

    const linkSelectHandler = (link: any) => {
      console.log('V2 - Link selected:', link);
    };

    this.currentGraph.on('nodeSelect', nodeSelectHandler);
    this.currentGraph.on('linkSelect', linkSelectHandler);

    // Store handlers for cleanup
    (this.currentGraph as any).__eventHandlers = {
      nodeSelect: nodeSelectHandler,
      linkSelect: linkSelectHandler
    };
  }

  /**
   * Remove all graph event listeners to prevent memory leaks
   */
  private removeGraphEventListeners() {
    if (!this.currentGraph) return;

    try {
      const handlers = (this.currentGraph as any).__eventHandlers;
      if (handlers) {
        // Remove specific handlers if available
        if (this.currentGraph.off) {
          this.currentGraph.off('nodeSelect', handlers.nodeSelect);
          this.currentGraph.off('linkSelect', handlers.linkSelect);
        }
        // Clear stored handlers
        delete (this.currentGraph as any).__eventHandlers;
      }

      // Fallback: try to remove all listeners if the library supports it
      if ((this.currentGraph as any).removeAllListeners) {
        (this.currentGraph as any).removeAllListeners();
      }
    } catch (error) {
      console.warn('Could not remove graph event listeners:', error);
    }
  }

  private async renderV2Graph(): Promise<void> {
    if (!this.currentData) return;

    try {
      this.elements.performance.textContent = 'Rendering V2...';
      this.elements.performance.className = 'performance-indicator';

      const startTime = performance.now();

      // Cleanup existing graph and its event listeners
      if (this.currentGraph) {
        this.removeGraphEventListeners();
        this.currentGraph.destroy();
        this.currentGraph = null;
      }

      // Clear container
      this.elements.container.innerHTML = '';

      const initStart = performance.now();

      // Create V2 graph using V1-compatible API
      this.currentGraph = createV2Graph({
        container: this.elements.container,
        nodes: this.currentData.nodes,
        links: this.currentData.links,
        controls: CONTROLS_CONFIG,
        legend: LEGEND_CONFIG,
        interaction: INTERACTION_CONFIG
      });

      const initTime = performance.now() - initStart;

      // Configure graph styling
      this.configureV2Graph();

      // Render the graph
      const renderStart = performance.now();
      await this.currentGraph.render();
      const renderTime = performance.now() - renderStart;

      const totalTime = performance.now() - startTime;

      // Update metrics
      this.metrics = {
        renderTime,
        initTime,
        dataLoadTime: 0, // Already tracked elsewhere
        lastUpdate: Date.now()
      };

      // Update performance indicator and version info
      this.updatePerformance(totalTime);
      this.elements.currentVersion.textContent = 'V2 - Canvas Implementation';

      // Show info about V2 features (link labels) for a few seconds
      this.showV2FeatureInfo();

      // Log link label statistics for demo
      this.logLinkLabelStats();

    } catch (error) {
      this.showError(`V2 render failed: ${error}`);
      this.elements.performance.textContent = 'Error';
      this.elements.performance.className = 'performance-indicator slow';
    }
  }

  private updatePerformance(totalTime: number) {
    const timeText = totalTime < 1000 ?
      `${Math.round(totalTime)}ms` :
      `${(totalTime / 1000).toFixed(1)}s`;

    this.elements.performance.textContent = timeText;
    this.elements.performance.className = totalTime < 500 ?
      'performance-indicator fast' :
      totalTime < 2000 ?
        'performance-indicator' :
        'performance-indicator slow';
  }

  private toggleVersion() {
    this.elements.toggleVersion.disabled = true;

    // Toggle version
    this.currentVersion = this.currentVersion === 'v1' ? 'v2' : 'v1';

    // Update button text
    this.elements.toggleVersion.textContent =
      this.currentVersion === 'v1' ? 'Switch to V2 Canvas' : 'Switch to V1 SVG';

    // Re-render with current data
    this.renderCurrentGraph().finally(() => {
      this.elements.toggleVersion.disabled = false;
    });
  }

  private resetView() {
    if (this.currentGraph) {
      this.currentGraph.fitView();
    }
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

  private showV2FeatureInfo() {
    // Removed auto-hiding message that causes resize operations
    console.log('🎯 V2 Canvas Features Active! Hover over links to see labels appear');
  }

  private logLinkLabelStats() {
    if (!this.currentData) return;

    const linksWithLabels = this.currentData.links.filter(link => link.label);
    const alwaysVisible = linksWithLabels.filter(link =>
      link.style?.label?.visibility === 'always' || !link.style?.label?.visibility
    );
    const hoverOnly = linksWithLabels.filter(link =>
      link.style?.label?.visibility === 'hover'
    );

    console.group('🏷️ V2 Link Labels Demo Statistics');
    console.log(`📊 Total links: ${this.currentData.links.length}`);
    console.log(`🏷️ Links with labels: ${linksWithLabels.length} (${Math.round(linksWithLabels.length / this.currentData.links.length * 100)}%)`);
    console.log(`🔵 Always visible: ${alwaysVisible.length}`);
    console.log(`🟢 Hover-enabled: ${hoverOnly.length}`);
    console.log(`💡 Tip: Hover over links to see green labels appear!`);
    console.groupEnd();
  }

  /**
   * Export current graph as PNG
   */
  private exportPNG(): void {
    try {
      if (this.currentGraph) {
        // Use exportGraph for V2 or generate PNG for V1
        if ('exportGraph' in this.currentGraph) {
          this.currentGraph.exportGraph(`polly-graph-${this.isV2Mode ? 'v2' : 'v1'}.png`);
        } else if ('exportToPNG' in this.currentGraph) {
          (this.currentGraph as any).exportToPNG(`polly-graph-${this.isV2Mode ? 'v2' : 'v1'}.png`);
        } else {
          console.warn('Export not supported for current graph version');
        }
      } else {
        console.warn('No graph loaded to export');
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }

  /**
   * Export shadow canvas for hit detection debugging
   */
  private exportShadowCanvas(): void {
    try {
      if (this.currentGraph && 'debugShadowCanvas' in this.currentGraph) {
        (this.currentGraph as any).debugShadowCanvas();
        console.log('Shadow canvas visualization enabled - check the canvas for hit detection areas');
      } else {
        console.warn('Shadow canvas debugging not supported for current graph version');
      }
    } catch (error) {
      console.error('Shadow canvas export failed:', error);
    }
  }
}

// Initialize the demo when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    const demo = new PollyGraphDemo();
    // Store demo instance for performance debugging
    (window as any).pollyDemo._instance = demo;
  } catch (error) {
    console.error('Failed to initialize Polly Graph Demo:', error);
    document.getElementById('stats')!.innerHTML =
      `<div class="error">Failed to initialize demo: ${error}</div>`;
  }
});

// Add some global debugging helpers with memory management
(window as any).pollyDemo = {
  generateCustomData: (nodes: number, connections: number = 3, clustered: boolean = true) => {
    return generateGraphData(nodes, connections, clustered);
  },

  // Debug memory usage
  getMemoryInfo: () => {
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: (memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        totalJSHeapSize: (memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        jsHeapSizeLimit: (memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
      };
    }
    return 'Memory info not available';
  },

  // Force garbage collection if available (Chrome DevTools)
  forceGC: () => {
    if ((window as any).gc) {
      (window as any).gc();
      console.log('Garbage collection forced');
    } else {
      console.log('Garbage collection not available. Use Chrome DevTools with --enable-precise-memory-info');
    }
  },

  // Performance debugging methods
  logPerformanceMetrics: () => {
    const demo = (window as any).pollyDemo._instance;
    if (demo && demo.currentGraph && demo.currentGraph.logPerformanceMetrics) {
      demo.currentGraph.logPerformanceMetrics();
    } else {
      console.warn('Performance metrics not available. Make sure V2 graph is loaded.');
    }
  },

  getPerformanceMetrics: () => {
    const demo = (window as any).pollyDemo._instance;
    if (demo && demo.currentGraph && demo.currentGraph.getPerformanceMetrics) {
      return demo.currentGraph.getPerformanceMetrics();
    } else {
      console.warn('Performance metrics not available. Make sure V2 graph is loaded.');
      return null;
    }
  },

  resetPerformanceMetrics: () => {
    const demo = (window as any).pollyDemo._instance;
    if (demo && demo.currentGraph && demo.currentGraph.resetPerformanceMetrics) {
      demo.currentGraph.resetPerformanceMetrics();
      console.log('✅ Performance metrics reset');
    } else {
      console.warn('Performance metrics not available. Make sure V2 graph is loaded.');
    }
  }
};
