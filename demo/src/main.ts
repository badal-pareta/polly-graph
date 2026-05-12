import './styles.css';
import { createGraph, GraphInstance, GraphNode, GraphLink } from '../../src';
import { GraphTestData, generateSmallGraph, generateMediumGraph, generateLargeGraph, generateExtraLargeGraph } from './test-data-generator';
import { demoNodes, demoLinks, demoInteractionConfig } from './demo-data';
import { EnhancedSimulationConfig } from '../../src/contracts/simulation.interface';

type GraphSize = 'knowledge-graph' | 'small' | 'medium' | 'large' | 'extra-large';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  nodeCount: number;
  linkCount: number;
  density: number;
}

let currentGraph: GraphInstance | null = null;
let currentData: GraphTestData | null = null;
let performanceMetrics: PerformanceMetrics | null = null;

const hostContainer = document.getElementById('graph-viewport') as HTMLElement;
const graphSizeSelect = document.getElementById('graph-size') as HTMLSelectElement;
const loadGraphBtn = document.getElementById('load-graph') as HTMLButtonElement;
const captureBtn = document.getElementById('capture-btn') as HTMLButtonElement;
const resetViewBtn = document.getElementById('reset-view') as HTMLButtonElement;
const clearSelectionBtn = document.getElementById('clear-selection') as HTMLButtonElement;
const loadingIndicator = document.getElementById('loading') as HTMLElement;

if (!hostContainer) {
  throw new Error('Graph viewport container not found');
}

// Knowledge Graph realistic data
function generateKnowledgeGraph(): GraphTestData {
  return {
    nodes: demoNodes,
    links: demoLinks,
    name: 'Knowledge Graph',
    description: 'COVID-19 biomedical research knowledge graph with hub-spoke pattern'
  };
}

// Test data generators
const dataGenerators = {
  'knowledge-graph': generateKnowledgeGraph,
  small: generateSmallGraph,
  medium: generateMediumGraph,
  large: generateLargeGraph,
  'extra-large': generateExtraLargeGraph
};

// Simulation configurations for each graph size
const simulationConfigs: Record<GraphSize, EnhancedSimulationConfig> = {
  'knowledge-graph': {
    adaptive: { enabled: true },
    forces: {
      link: { strength: 0.9, distance: 160 }, // Optimized for label space and hub-spoke clarity
      charge: { strength: -280 }, // Strong repulsion to prevent label overlap
      center: { strength: 0.015 }, // Gentle centering to allow natural clustering
      collide: { strength: 0.8 } // Prevent node overlap
    }
  },
  small: {
    adaptive: { enabled: true }
  },
  medium: {
    adaptive: { enabled: true }
  },
  large: {
    adaptive: { enabled: true },
    warmup: { enabled: true, ticks: 150 }
  },
  'extra-large': {
    adaptive: { enabled: true },
    warmup: { enabled: true, ticks: 100 },
    forces: {
      charge: { strength: -30 },
      collide: { strength: 0.5 },
      center: { strength: 0.01 }
    }
  }
};

async function loadGraph(graphSize: GraphSize): Promise<void> {
  showLoading(true);

  // SIMULATE REAL-WORLD SCENARIO: Container starts with no dimensions
  console.log('📐 Simulating dynamic sizing scenario...');

  // Step 1: Collapse container to zero size (simulating modal/tab before shown)
  console.log('🔻 Collapsing container to zero size...');
  hostContainer.style.width = '0px';
  hostContainer.style.height = '0px';
  hostContainer.style.overflow = 'hidden';

  const startTime = performance.now();

  // Generate test data
  const generator = dataGenerators[graphSize];
  currentData = generator();

  const dataGenTime = performance.now();

  // Destroy existing graph
  if (currentGraph) {
    currentGraph.destroy();
    currentGraph = null;
  }

  // Step 2: Create graph with zero-sized container (this should not cause positioning issues)
  console.log('📊 Creating graph with zero-sized container...');
  console.log('Container dimensions during creation:', {
    width: hostContainer.clientWidth,
    height: hostContainer.clientHeight
  });

  // Create new graph with adaptive simulation
  const renderStartTime = performance.now();

  currentGraph = createGraph({
    container: hostContainer,
    nodes: currentData.nodes,
    links: currentData.links,
    simulation: simulationConfigs[graphSize],
    interaction: {
      drag: { enabled: true },
      hover: {
        enabled: true,
        tooltip: {
          enabled: true,
          theme: 'dark',
          renderContent: (node: GraphNode) => `
            <div style="padding: 8px;">
              <strong>${node.type}:</strong> ${node.label}
            </div>
          `
        },
        nodeStyle: {
          stroke: '#16a34a',
          strokeWidth: 3,
          opacity: 1
        },
        linkStyle: {
          stroke: '#f59e0b',
          strokeWidth: 3,
          opacity: 1
        }
      },
      selection: {
        enabled: true,
        nodeStyle: {
          stroke: '#f59e0b',
          strokeWidth: 4
        },
        linkStyle: {
          stroke: '#f59e0b',
          strokeWidth: 3
        }
      }
    },
    controls: {
      enabled: true,
      position: 'bottom-left'
    },
    legend: {
      enabled: true,
      collapsible: true,
      position: 'top-right'
    }
  });

  // Step 3: Render the graph first (with zero-sized container)
  console.log('🎨 Rendering graph with zero dimensions...');
  currentGraph.render();

  // Set up selection event handlers after render (when event emitter is initialized)
  console.log('About to call setupEventListeners after render...');
  setupEventListeners();
  console.log('setupEventListeners completed');

  // Step 4: Simulate async data loading delay (like API call)
  console.log('⏳ Simulating data loading delay...');
  await new Promise(resolve => setTimeout(resolve, 500));

  // Step 5: Dynamically restore container size (simulating modal shown/tab activated)
  console.log('🔺 Dynamically restoring container size...');
  hostContainer.style.width = '';
  hostContainer.style.height = '';
  hostContainer.style.overflow = '';

  console.log('Container dimensions after restoration:', {
    width: hostContainer.clientWidth,
    height: hostContainer.clientHeight
  });

  // Step 6: Auto-fit view after container resize
  console.log('🎯 Fitting view to restored container...');
  setTimeout(() => {
    if (currentGraph) {
      currentGraph.fitView();
      console.log('✅ FitView completed - nodes should be properly centered!');
    }
  }, 300); // Give resize observer time to detect changes

  const renderTime = performance.now();

  // Calculate performance metrics
  performanceMetrics = {
    loadTime: dataGenTime - startTime,
    renderTime: renderTime - renderStartTime,
    nodeCount: currentData.nodes.length,
    linkCount: currentData.links.length,
    density: currentData.links.length / Math.max(currentData.nodes.length, 1)
  };

  // Update UI
  updateSimulationConfigDisplay(graphSize);
  updatePerformanceDisplay();

  showLoading(false);

  console.log(`Loaded ${graphSize} graph:`, {
    nodes: currentData.nodes.length,
    links: currentData.links.length,
    metrics: performanceMetrics
  });
}

function setupEventListeners(): void {
  if (!currentGraph) {
    console.log('No currentGraph in setupEventListeners');
    return;
  }

  console.log('Adding event listeners to graph:', currentGraph);
  console.log('Graph.on method available:', typeof currentGraph.on);

  // Enhanced event listeners to showcase the new selection system
  console.log('Registering nodeSelect listener...');
  const unsubscribeNode = currentGraph.on('nodeSelect', (node, element) => {
    console.log('✅ Node selected EVENT FIRED:', {
      id: node.id,
      type: node.type,
      label: node.label,
      element: element.tagName
    });
    updateSelectionStatus(`Node: ${node.label || node.id} (${node.type})`);
  });

  currentGraph.on('linkSelect', (link, element) => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    console.log('🔗 Link selected:', {
      source: sourceId,
      target: targetId,
      label: link.label,
      element: element.tagName
    });
    updateSelectionStatus(`Link: ${sourceId} → ${targetId}${link.label ? ` (${link.label})` : ''}`);
  });

  currentGraph.on('nodeDeselect', (node) => {
    console.log('❌ Node deselected:', node.id);
    updateSelectionStatus();
  });

  currentGraph.on('linkDeselect', (link) => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    console.log('❌ Link deselected:', `${sourceId} → ${targetId}`);
    updateSelectionStatus();
  });
}

function updateSelectionStatus(status?: string): void {
  const selectionDisplay = document.getElementById('selection-status');
  if (selectionDisplay) {
    selectionDisplay.textContent = status || 'None';
  }
}

function updateSimulationConfigDisplay(graphSize: GraphSize): void {
  if (!currentData || !performanceMetrics) return;

  // Update graph info
  updateElement('node-count', performanceMetrics.nodeCount.toString());
  updateElement('link-count', performanceMetrics.linkCount.toString());
  updateElement('graph-density', performanceMetrics.density.toFixed(2));

  // Get adaptive defaults for this graph size
  const config = simulationConfigs[graphSize];
  const nodeCount = performanceMetrics.nodeCount;

  // Simulate the adaptive defaults calculation (updated values)
  let adaptiveDefaults;
  if (graphSize === 'knowledge-graph') {
    adaptiveDefaults = {
      alpha: 1,
      alphaDecay: 1 - Math.pow(0.001, 1 / 300),
      velocityDecay: 0.3,
      chargeStrength: config.forces?.charge?.strength ?? -280,
      linkStrength: config.forces?.link?.strength ?? 0.9,
      linkDistance: config.forces?.link?.distance ?? 160,
      centerStrength: config.forces?.center?.strength ?? 0.015
    };
  } else if (nodeCount < 50) {
    adaptiveDefaults = {
      alpha: 1,
      alphaDecay: 1 - Math.pow(0.001, 1 / 300),
      velocityDecay: 0.3,
      chargeStrength: -200,
      linkStrength: 0.8,
      linkDistance: 140,
      centerStrength: 0.03
    };
  } else if (nodeCount < 200) {
    adaptiveDefaults = {
      alpha: 1,
      alphaDecay: 1 - Math.pow(0.001, 1 / 250),
      velocityDecay: 0.3,
      chargeStrength: -180,
      linkStrength: 0.5,
      linkDistance: 160,
      centerStrength: 0.02
    };
  } else {
    adaptiveDefaults = {
      alpha: 1,
      alphaDecay: 1 - Math.pow(0.001, 1 / 300),
      velocityDecay: 0.4,
      chargeStrength: config.forces?.charge?.strength ?? -120,
      linkStrength: 0.3,
      linkDistance: 180,
      centerStrength: config.forces?.center?.strength ?? 0.01
    };
  }

  // Update simulation parameters
  updateElement('sim-alpha', adaptiveDefaults.alpha.toString());
  updateElement('sim-alpha-decay', adaptiveDefaults.alphaDecay.toFixed(6));
  updateElement('sim-velocity-decay', adaptiveDefaults.velocityDecay.toString());

  // Update force configuration
  updateElement('force-charge', adaptiveDefaults.chargeStrength.toString());
  updateElement('force-link-strength', adaptiveDefaults.linkStrength.toString());
  updateElement('force-link-distance', adaptiveDefaults.linkDistance.toString());
  updateElement('force-center', adaptiveDefaults.centerStrength.toString());
}

function updatePerformanceDisplay(): void {
  if (!performanceMetrics || !currentData) return;

  updateElement('load-time', `${performanceMetrics.loadTime.toFixed(1)}ms`);
  updateElement('render-time', `${performanceMetrics.renderTime.toFixed(1)}ms`);

  // Calculate warmup ticks based on graph size
  const nodeCount = performanceMetrics.nodeCount;
  const warmupTicks = nodeCount < 50 ? 50 : Math.min(150, nodeCount * 2);
  updateElement('warmup-ticks', warmupTicks.toString());
}

function updateElement(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function showLoading(show: boolean): void {
  loadingIndicator.style.display = show ? 'block' : 'none';
  loadGraphBtn.disabled = show;
}


// Event listeners
loadGraphBtn.addEventListener('click', () => {
  const selectedSize = graphSizeSelect.value as GraphSize;
  loadGraph(selectedSize);
});

captureBtn.addEventListener('click', () => {
  if (currentGraph && currentData) {
    currentGraph.exportGraph(`polly-graph-${currentData.name.toLowerCase().replace(/\s+/g, '-')}`);
  }
});

resetViewBtn.addEventListener('click', () => {
  if (currentGraph) {
    currentGraph.resetView();
  }
});

clearSelectionBtn.addEventListener('click', () => {
  if (currentGraph) {
    currentGraph.clearSelection();
    updateSelectionStatus();
  }
});

// Load initial graph with realistic knowledge graph
console.log('🚀 Demo starting at:', new Date().toLocaleTimeString());
loadGraph('knowledge-graph');
