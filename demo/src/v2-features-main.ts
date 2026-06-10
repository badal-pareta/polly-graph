/**
 * V2 Canvas Features Test - TypeScript Main
 *
 * Moved from HTML script to TypeScript for better type safety and debugging
 */

import { createV2Graph } from '../../src/v2';
import type { V2Instance, V2Node, V2Link, V2Config } from '../../src/v2/types';

interface TestData {
  nodes: V2Node[];
  links: V2Link[];
  physics?: boolean;
}

// interface TestGraph {
//   // V2Instance methods
//   render(): void;
//   destroy(): void;
//   exportGraph(fileName?: string): void;
//   on(event: string, handler: (...args: unknown[]) => void): () => void;
//   off(event: string, handler?: (...args: unknown[]) => void): void;

//   // Add any debug methods that might exist
//   debugShadowCanvas?: () => void;
//   getCanvas?: () => HTMLCanvasElement;
//   pause?: () => void;
// }

let currentGraph: V2Instance | null = null;
let hitVisualizationVisible = false;

// Test basic graph functionality
export function testBasicGraph(): void {
  clearGraph();

  const data: TestData = {
    nodes: [
      { id: '1', entityType: 'Node', type: 'Basic', label: 'Node 1', tooltip: 'First test node', x: 200, y: 200 },
      { id: '2', entityType: 'Node', type: 'Basic', label: 'Node 2', tooltip: 'Second test node', x: 400, y: 150 },
      { id: '3', entityType: 'Node', type: 'Basic', label: 'Node 3', tooltip: 'Third test node', x: 600, y: 200 },
      { id: '4', entityType: 'Node', type: 'Basic', label: 'Node 4', tooltip: 'Fourth test node', x: 400, y: 350 }
    ],
    links: [
      { source: '1', target: '2', entityType: 'Link' },
      { source: '2', target: '3', entityType: 'Link' },
      { source: '3', target: '4', entityType: 'Link' },
      { source: '4', target: '1', entityType: 'Link' }
    ]
  };

  // Create graph with basic highlighting configuration
  const config: V2Config = {
    container: document.getElementById('graph-container')!,
    nodes: data.nodes,
    links: data.links,
    width: 800,
    height: 600,
    backgroundColor: '#ffffff',
    interaction: {
      highlight: {
        nodeStyle: {
          fill: '#fbbf24',        // Amber highlight
          stroke: '#f59e0b',      // Darker amber border
          strokeWidth: 2,
          opacity: 1.0
        }
      }
    },
    controls: {
      enabled: true,
      position: 'bottom-right',
      orientation: 'vertical'
    }
  };

  currentGraph = createV2Graph(config);
  currentGraph.render();

  // Demonstrate highlighting by highlighting Node 2
  setTimeout(() => {
    if (currentGraph) {
      currentGraph.highlightNode('2');
      showStatus('✅ Basic graph with 4 nodes (Node 2 highlighted)', 'success');
      updateStats(`4 nodes, 4 links, 0 labels`);
    }
  }, 500);
}

// Test link labels with different configurations
export function testLinkLabels(): void {
  clearGraph();

  const data: TestData = {
    nodes: [
      { id: 'A', entityType: 'Node', type: 'Source', label: 'Source', tooltip: 'Starting point for data flow', x: 150, y: 300 },
      { id: 'B', entityType: 'Node', type: 'Processing', label: 'Middle', tooltip: 'Intermediate processing node', x: 400, y: 200 },
      { id: 'C', entityType: 'Node', type: 'Target', label: 'Target', tooltip: 'Final destination node', x: 650, y: 300 }
    ],
    links: [
      {
        source: 'A',
        target: 'B',
        entityType: 'Link',
        label: 'connects to'
      },
      {
        source: 'B',
        target: 'C',
        entityType: 'Link',
        label: 'flows to'
      },
      {
        source: 'A',
        target: 'C',
        entityType: 'Link',
        label: 'direct link'
      }
    ]
  };

  renderGraph(data, 'Link labels test - all labels visible');
}

// Test different visibility modes (THIS IS WHERE THE ISSUE MIGHT BE)
export function testLabelVisibility(): void {
  clearGraph();

  const data: TestData = {
    nodes: [
      { id: '1', entityType: 'Node', type: 'Demo', label: 'Always', tooltip: 'This node shows always-visible labels', x: 200, y: 200 },
      { id: '2', entityType: 'Node', type: 'Demo', label: 'Hover Me', tooltip: 'This node shows hover-only labels', x: 400, y: 200 },
      { id: '3', entityType: 'Node', type: 'Demo', label: 'Select Me', tooltip: 'This node shows selection-only labels', x: 600, y: 200 }
    ],
    links: [
      {
        source: '1',
        target: '2',
        entityType: 'Link',
        label: 'Always visible',
        style: {
          label: {
            enabled: true,
            visibility: 'always' as const,
            text: '',
            font: '12px Arial',
            backgroundColor: '#e8f5e8',
            textColor: '#2d5a2d',
            borderColor: '#2d5a2d',
            borderWidth: 1,
            borderRadius: 4,
            paddingX: 8,
            paddingY: 4
          }
        }
      },
      {
        source: '2',
        target: '3',
        entityType: 'Link',
        label: 'Hover only',
        style: {
          label: {
            enabled: true,
            visibility: 'hover' as const,
            text: '',
            font: '12px Arial',
            backgroundColor: '#fff3cd',
            textColor: '#856404',
            borderColor: '#856404',
            borderWidth: 1,
            borderRadius: 4,
            paddingX: 8,
            paddingY: 4
          }
        }
      }
    ]
  };

  renderGraph(data, 'Visibility modes: always, hover, selection');

  // Debug: Log hover/selection events
  if (currentGraph) {
    console.log('[Debug] Setting up hover/selection event listeners');

    currentGraph.on('nodeHover', (...args: unknown[]) => {
      const node = args[0] as V2Node;
      console.log('[Debug] Node hover:', { nodeId: node.id, nodeLabel: node.label });
    });

    currentGraph.on('nodeUnhover', (...args: unknown[]) => {
      const node = args[0] as V2Node;
      console.log('[Debug] Node unhover:', { nodeId: node.id, nodeLabel: node.label });
    });

    currentGraph.on('linkHover', (...args: unknown[]) => {
      const link = args[0] as V2Link;
      console.log('[Debug] Link hover:', {
        source: typeof link.source === 'string' ? link.source : link.source.id,
        target: typeof link.target === 'string' ? link.target : link.target.id,
        label: link.label
      });
    });

    currentGraph.on('linkUnhover', (...args: unknown[]) => {
      const link = args[0] as V2Link;
      console.log('[Debug] Link unhover:', {
        source: typeof link.source === 'string' ? link.source : link.source.id,
        target: typeof link.target === 'string' ? link.target : link.target.id,
        label: link.label
      });
    });

    currentGraph.on('linkSelect', (...args: unknown[]) => {
      const link = args[0] as V2Link;
      console.log('[Debug] Link select:', {
        source: typeof link.source === 'string' ? link.source : link.source.id,
        target: typeof link.target === 'string' ? link.target : link.target.id,
        label: link.label
      });
    });
  }
}

// Test custom label styles
export function testCustomLabelStyles(): void {
  clearGraph();

  const data: TestData = {
    nodes: [
      { id: 'A', entityType: 'Node', type: 'Phase', label: 'Design', tooltip: 'Design phase of development', x: 200, y: 150 },
      { id: 'B', entityType: 'Node', type: 'Phase', label: 'Code', tooltip: 'Coding phase of development', x: 400, y: 150 },
      { id: 'C', entityType: 'Node', type: 'Phase', label: 'Test', tooltip: 'Testing phase of development', x: 600, y: 150 },
      { id: 'D', entityType: 'Node', type: 'Phase', label: 'Deploy', tooltip: 'Deployment phase', x: 400, y: 350 }
    ],
    links: [
      {
        source: 'A',
        target: 'B',
        entityType: 'Link',
        label: 'wireframes',
        style: {
          stroke: '#3b82f6',
          label: {
            enabled: true,
            visibility: 'always' as const,
            text: '',
            font: '12px Arial',
            backgroundColor: '#dbeafe',
            borderColor: '#3b82f6',
            textColor: '#1e40af',
            borderWidth: 1,
            borderRadius: 8,
            paddingX: 12,
            paddingY: 6
          }
        }
      },
      {
        source: 'B',
        target: 'C',
        entityType: 'Link',
        label: 'unit tests',
        style: {
          stroke: '#10b981',
          label: {
            enabled: true,
            visibility: 'always' as const,
            text: '',
            font: '12px Arial',
            backgroundColor: '#d1fae5',
            borderColor: '#10b981',
            textColor: '#047857',
            borderRadius: 4,
            borderWidth: 2,
            paddingX: 8,
            paddingY: 4
          }
        }
      },
      {
        source: 'C',
        target: 'D',
        entityType: 'Link',
        label: 'production',
        style: {
          stroke: '#f59e0b',
          label: {
            enabled: true,
            visibility: 'always' as const,
            text: '',
            font: '12px bold Arial',
            backgroundColor: '#fef3c7',
            borderColor: '#f59e0b',
            textColor: '#92400e',
            borderWidth: 1,
            borderRadius: 4,
            paddingX: 8,
            paddingY: 4
          }
        }
      },
      {
        source: 'A',
        target: 'D',
        entityType: 'Link',
        label: 'feedback',
        style: {
          stroke: '#ef4444',
          strokeWidth: 2,
          label: {
            enabled: true,
            visibility: 'always' as const,
            text: '',
            font: '12px Arial',
            backgroundColor: '#fee2e2',
            borderColor: '#ef4444',
            textColor: '#991b1b',
            borderWidth: 1,
            borderRadius: 12,
            paddingX: 10,
            paddingY: 4
          }
        }
      }
    ]
  };

  renderGraph(data, 'Custom label styles - colors, borders, shapes');
}

// Test node highlighting functionality
export function testHighlighting(): void {
  clearGraph();

  const data: TestData = {
    nodes: [
      {
        id: 'search-node-1',
        entityType: 'Node',
        type: 'SearchResult',
        label: 'Found Node 1',
        tooltip: 'This node will be highlighted in amber',
        x: 200,
        y: 200,
        style: { fill: '#3b82f6', radius: 20 }
      },
      {
        id: 'normal-node-1',
        entityType: 'Node',
        type: 'Normal',
        label: 'Normal Node',
        tooltip: 'This node stays normal (hover to see precedence)',
        x: 400,
        y: 150,
        style: { fill: '#6b7280', radius: 18 }
      },
      {
        id: 'search-node-2',
        entityType: 'Node',
        type: 'SearchResult',
        label: 'Found Node 2',
        tooltip: 'This node will also be highlighted',
        x: 600,
        y: 200,
        style: { fill: '#10b981', radius: 20 }
      },
      {
        id: 'normal-node-2',
        entityType: 'Node',
        type: 'Normal',
        label: 'Another Normal',
        tooltip: 'Click to select (selection beats highlighting)',
        x: 400,
        y: 350,
        style: { fill: '#8b5cf6', radius: 18 }
      },
      {
        id: 'search-node-3',
        entityType: 'Node',
        type: 'SearchResult',
        label: 'Found Node 3',
        tooltip: 'Third highlighted node',
        x: 300,
        y: 300,
        style: { fill: '#ef4444', radius: 20 }
      }
    ],
    links: [
      {
        source: 'search-node-1',
        target: 'normal-node-1',
        entityType: 'Link',
        label: 'connects'
      },
      {
        source: 'normal-node-1',
        target: 'search-node-2',
        entityType: 'Link',
        label: 'flows to'
      },
      {
        source: 'search-node-2',
        target: 'normal-node-2',
        entityType: 'Link',
        label: 'relates to'
      },
      {
        source: 'normal-node-2',
        target: 'search-node-3',
        entityType: 'Link',
        label: 'links to'
      },
      {
        source: 'search-node-3',
        target: 'search-node-1',
        entityType: 'Link',
        label: 'cycles back'
      }
    ]
  };

  // Create graph with custom highlight configuration
  const config: V2Config = {
    container: document.getElementById('graph-container')!,
    nodes: data.nodes,
    links: data.links,
    width: 800,
    height: 600,
    backgroundColor: '#ffffff',
    interaction: {
      hover: {
        enabled: true,
        nodeStyle: {
          stroke: '#1f2937',
          strokeWidth: 3,
          opacity: 1.0
        }
      },
      selection: {
        enabled: true,
        nodeStyle: {
          stroke: '#dc2626',
          strokeWidth: 4,
          radius: 24
        }
      },
      highlight: {
        nodeStyle: {
          fill: '#fbbf24',        // Amber highlight
          stroke: '#f59e0b',      // Darker amber border
          strokeWidth: 3,         // Highlighted border
          opacity: 1.0
        }
      }
    },
    controls: {
      enabled: true,
      position: 'bottom-right',
      orientation: 'vertical'
    }
  };

  currentGraph = createV2Graph(config);
  currentGraph.render();

  // Simulate search results by highlighting specific nodes
  setTimeout(() => {
    if (currentGraph) {
      // Highlight the "search result" nodes
      currentGraph.highlightNodes(['search-node-1', 'search-node-2', 'search-node-3']);

      showStatus('🔍 Search Results: 3 nodes highlighted in amber (try hover/select to see precedence)', 'success');

      // Show demonstration of API calls after a delay
      setTimeout(() => {
        if (currentGraph) {
          showStatus('✨ Removing highlight from Node 2...', 'info');
          currentGraph.unhighlightNode('search-node-2');

          setTimeout(() => {
            if (currentGraph) {
              showStatus('🔄 Re-highlighting all found nodes...', 'info');
              currentGraph.highlightNode('search-node-2');

              setTimeout(() => {
                if (currentGraph) {
                  const highlighted = currentGraph.getHighlightedNodes();
                  showStatus(`📊 Currently highlighted: ${highlighted.size} nodes (${Array.from(highlighted).join(', ')})`, 'info');
                }
              }, 1500);
            }
          }, 1500);
        }
      }, 3000);
    }
  }, 500);

  // Log interaction events to show precedence
  if (currentGraph) {
    currentGraph.on('nodeHover', (node: V2Node) => {
      console.log(`[Highlight Demo] Node hover: ${node.id} (hover styling applied over highlight)`);
    });

    currentGraph.on('nodeSelect', (node: V2Node) => {
      console.log(`[Highlight Demo] Node select: ${node.id} (selection styling takes precedence)`);
    });

    currentGraph.on('nodeDeselect', (node: V2Node) => {
      console.log(`[Highlight Demo] Node deselect: ${node.id} (back to highlight styling if highlighted)`);
    });
  }
}

// Test hover effects
export function testHoverEffects(): void {
  clearGraph();

  const data: TestData = {
    nodes: [
      {
        id: '1',
        entityType: 'Node',
        type: 'Disease',
        label: 'Hover Me',
        tooltip: 'Hover to see green arrow',
        x: 200,
        y: 200,
        style: { fill: '#dc2626', radius: 20 }
      },
      {
        id: '2',
        entityType: 'Node',
        type: 'Gene',
        label: 'Select Me',
        tooltip: 'Click to see orange arrow',
        x: 500,
        y: 200,
        style: { fill: '#2563eb', radius: 18 }
      },
      {
        id: '3',
        entityType: 'Node',
        type: 'Species',
        label: 'Custom Arrow',
        tooltip: 'This has a red arrow override',
        x: 350,
        y: 350,
        style: { fill: '#059669', radius: 16 }
      }
    ],
    links: [
      {
        source: '1',
        target: '2',
        entityType: 'Link',
        label: 'Hover Link',
        tooltip: 'This link changes color on hover - arrow turns green',
        style: {
          stroke: '#6366f1', // Default blue
          strokeWidth: 3,
          arrow: {
            enabled: true,
            size: 10
            // No fill specified - should auto-sync with link color
          }
        }
      },
      {
        source: '2',
        target: '3',
        entityType: 'Link',
        label: 'Custom Arrow',
        tooltip: 'This link has a red arrow that never changes color',
        style: {
          stroke: '#8b5cf6', // Purple link
          strokeWidth: 3,
          arrow: {
            enabled: true,
            size: 10,
            fill: '#dc2626' // Explicit red arrow - should NOT change color
          }
        }
      },
      {
        source: '3',
        target: '1',
        entityType: 'Link',
        label: 'Auto Arrow',
        tooltip: 'Click to select - arrow and link turn orange',
        style: {
          stroke: '#059669', // Green link
          strokeWidth: 3,
          arrow: {
            enabled: true,
            size: 10
            // No fill specified - should auto-sync with link color
          }
        }
      }
    ]
  };

  // Create graph with hover and selection interaction configs
  const config: V2Config = {
    container: document.getElementById('graph-container')!,
    nodes: data.nodes,
    links: data.links,
    width: 800,
    height: 600,
    backgroundColor: '#ffffff',
    interaction: {
      hover: {
        enabled: true,
        linkStyle: {
          stroke: '#10b981', // Hover: Green
          strokeWidth: 4,
          opacity: 1.0
          // Arrow fill should auto-sync to green (unless explicitly overridden)
        }
      },
      selection: {
        enabled: true,
        linkStyle: {
          stroke: '#f59e0b', // Selection: Orange
          strokeWidth: 5,
          opacity: 1.0
          // Arrow fill should auto-sync to orange (unless explicitly overridden)
        }
      }
    },
    controls: {
      enabled: true,
      position: 'bottom-right',
      orientation: 'vertical'
    },
    legend: {
      enabled: true,
      position: 'top-right',
      collapsible: true,
      defaultExpanded: true
    }
  };

  currentGraph = createV2Graph(config);
  currentGraph.render();

  showStatus('Arrow, Legend & Tooltip Test: Hover links/nodes for tooltips | Hover links (green arrows) | Select links (orange arrows) | Red arrow stays red', 'info');

  // Log interaction events to demonstrate arrow color changes
  if (currentGraph) {
    currentGraph.on('linkHover', (...args: unknown[]) => {
      const link = args[0] as V2Link;
      console.log('[Arrow Test] Link hover - arrows should turn GREEN (except explicit red override):', {
        source: typeof link.source === 'string' ? link.source : link.source.id,
        target: typeof link.target === 'string' ? link.target : link.target.id,
        label: link.label
      });
    });

    currentGraph.on('linkSelect', (...args: unknown[]) => {
      const link = args[0] as V2Link;
      console.log('[Arrow Test] Link select - arrows should turn ORANGE (except explicit red override):', {
        source: typeof link.source === 'string' ? link.source : link.source.id,
        target: typeof link.target === 'string' ? link.target : link.target.id,
        label: link.label
      });
    });
  }
}

// Test physics demo with more nodes
export function testPhysicsDemo(): void {
  clearGraph();

  const data = generateRandomData(20, 35, false); // Enable physics
  renderGraph(data, 'Physics simulation with 20 nodes');
}

// Test performance with many nodes
export function testPerformanceGraph(): void {
  clearGraph();
  showStatus('Generating 1000 nodes...', 'info');

  setTimeout(() => {
    const data = generateRandomData(1000, 2000, false);
    renderGraph(data, 'Performance test: 1000 nodes, 2000 links');
  }, 100);
}

// Large scale performance test - 10K nodes
export function testLargeGraph10K(): void {
  clearGraph();
  showStatus('⚠️ Generating 10,000 nodes... This may take a moment!', 'info');

  // Show warning and start performance timer
  const startTime = performance.now();

  setTimeout(() => {
    try {
      const data = generateRandomData(10000, 20000, false);
      const generateTime = performance.now() - startTime;

      showStatus(`Generated 10K nodes in ${generateTime.toFixed(0)}ms. Rendering...`, 'info');
      const renderStart = performance.now();

      renderGraph(data, `🚀 Large Scale Test: 10,000 nodes, 20,000 links`);

      // Show total time after render
      setTimeout(() => {
        const totalTime = performance.now() - startTime;
        const renderTime = performance.now() - renderStart;
        showStatus(`✅ 10K nodes loaded! Generate: ${generateTime.toFixed(0)}ms, Render: ${renderTime.toFixed(0)}ms, Total: ${totalTime.toFixed(0)}ms`, 'success');
      }, 100);

    } catch (error) {
      showStatus(`❌ 10K nodes failed: ${(error as Error).message}`, 'error');
    }
  }, 100);
}

// Extreme scale performance test - 25K nodes
export function testLargeGraph25K(): void {
  if (!confirm('⚠️ WARNING: 25K nodes is an extreme test that may freeze your browser for 10-30 seconds. Continue?')) {
    return;
  }

  clearGraph();
  showStatus('🔥 Generating 25,000 nodes... Browser may freeze temporarily!', 'info');

  const startTime = performance.now();

  setTimeout(() => {
    try {
      const data = generateRandomData(25000, 50000, false);
      const generateTime = performance.now() - startTime;

      showStatus(`Generated 25K nodes in ${generateTime.toFixed(0)}ms. Rendering... (may take 10-30s)`, 'info');
      const renderStart = performance.now();

      renderGraph(data, `⚡ Extreme Scale Test: 25,000 nodes, 50,000 links`);

      // Show total time after render
      setTimeout(() => {
        const totalTime = performance.now() - startTime;
        const renderTime = performance.now() - renderStart;
        showStatus(`🎯 25K nodes loaded! Generate: ${generateTime.toFixed(0)}ms, Render: ${renderTime.toFixed(0)}ms, Total: ${(totalTime/1000).toFixed(1)}s`, 'success');
      }, 500);

    } catch (error) {
      showStatus(`💥 25K nodes failed: ${(error as Error).message}`, 'error');
    }
  }, 100);
}

// Test hit detection specifically (IMPORTANT FOR DEBUGGING LINK LABELS)
export function testHitDetection(): void {
  clearGraph();

  const data: TestData = {
    nodes: [
      { id: 'click', entityType: 'Node', type: 'Interactive', label: 'Click labels!', tooltip: 'Try clicking the colored link labels', x: 400, y: 200 },
      { id: 'test1', entityType: 'Node', type: 'Target', label: 'Target 1', tooltip: 'First target node', x: 200, y: 300 },
      { id: 'test2', entityType: 'Node', type: 'Target', label: 'Target 2', tooltip: 'Second target node', x: 600, y: 300 }
    ],
    links: [
      {
        source: 'click',
        target: 'test1',
        entityType: 'Link',
        label: 'CLICK ME',
        style: {
          label: {
            enabled: true,
            visibility: 'always' as const,
            text: '',
            font: '14px bold Arial',
            backgroundColor: '#fbbf24',
            textColor: '#000000',
            borderColor: '#f59e0b',
            borderWidth: 1,
            borderRadius: 4,
            paddingX: 15,
            paddingY: 8
          }
        }
      },
      {
        source: 'click',
        target: 'test2',
        entityType: 'Link',
        label: 'OR ME',
        style: {
          label: {
            enabled: true,
            visibility: 'always' as const,
            text: '',
            font: '14px bold Arial',
            backgroundColor: '#34d399',
            textColor: '#000000',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 4,
            paddingX: 15,
            paddingY: 8
          }
        }
      }
    ]
  };

  renderGraph(data, 'Hit detection test - click on the yellow or green labels');

  if (currentGraph) {
    console.log('[Debug] Setting up link select handler for hit detection test');

    currentGraph.on('linkSelect', (...args: unknown[]) => {
      const link = args[0] as V2Link;
      const linkDesc = `"${link.label}" (${typeof link.source === 'string' ? link.source : link.source.id} -> ${typeof link.target === 'string' ? link.target : link.target.id})`;
      console.log('[Debug] Link label clicked:', linkDesc);
      showStatus(`✅ Link label clicked: ${linkDesc}`, 'success');
    });
  }
}

// Generate random test data
function generateRandomData(nodeCount: number, linkCount: number, staticPositions = true): TestData {
  const nodes: V2Node[] = [];
  const links: V2Link[] = [];

  // Generate nodes
  for (let i = 0; i < nodeCount; i++) {
    const nodeTypes = ['Server', 'Database', 'Client', 'Service', 'Gateway'];
    const nodeType = nodeTypes[i % nodeTypes.length];

    const node: V2Node = {
      id: `node-${i}`,
      entityType: 'Node',
      type: nodeType,
      label: `Node ${i + 1}`,
      tooltip: `${nodeType} node #${i + 1} (ID: node-${i})`
    };

    if (staticPositions) {
      node.x = Math.random() * 700 + 50;
      node.y = Math.random() * 500 + 50;
    }

    nodes.push(node);
  }

  // Generate links
  const maxLinks = Math.min(linkCount, nodeCount * (nodeCount - 1) / 2);
  const usedPairs = new Set<string>();

  for (let i = 0; i < maxLinks; i++) {
    let source: number, target: number, pairKey: string;
    do {
      source = Math.floor(Math.random() * nodeCount);
      target = Math.floor(Math.random() * nodeCount);
      pairKey = `${Math.min(source, target)}-${Math.max(source, target)}`;
    } while (source === target || usedPairs.has(pairKey));

    usedPairs.add(pairKey);

    const shouldHaveLabel = Math.random() < 0.3; // 30% chance
    const link: V2Link = {
      source: `node-${source}`,
      target: `node-${target}`,
      entityType: 'Link'
    };

    if (shouldHaveLabel) {
      link.label = `Link ${i + 1}`;
    }

    links.push(link);
  }

  return { nodes, links };
}

// Utility functions
function renderGraph(data: TestData, description: string): void {
  try {
    const startTime = performance.now();


    currentGraph = createV2Graph({
      container: document.getElementById('graph-container')!,
      nodes: data.nodes,
      links: data.links,
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
      controls: {
        enabled: true,
        position: 'bottom-right',
        orientation: 'vertical'
      }
    });

    const endTime = performance.now();
    const renderTime = Math.round(endTime - startTime);

    showStatus(`✅ ${description}`, 'success');
    updateStats(`${data.nodes.length} nodes, ${data.links.length} links, ${data.links.filter(l => l.label).length} labels (${renderTime}ms)`);

  } catch (error) {
    console.error('[Debug] Graph render error:', error);
    showStatus(`❌ Error: ${(error as Error).message}`, 'error');
  }
}

export function clearHighlights(): void {
  if (currentGraph) {
    currentGraph.clearHighlights();
    showStatus('All highlights cleared', 'info');
  } else {
    showStatus('No graph loaded', 'error');
  }
}

export function clearGraph(): void {
  try {
    if (currentGraph) {
      // Remove any event listeners to prevent memory leaks
      try {
        if (currentGraph.off) {
          currentGraph.off('linkSelect');
          currentGraph.off('nodeSelect');
          currentGraph.off('linkHover');
          currentGraph.off('linkUnhover');
          currentGraph.off('nodeHover');
          currentGraph.off('nodeUnhover');
        }
      } catch (e) {
        // Ignore if off method doesn't exist
      }

      currentGraph.destroy();
      currentGraph = null;
    }
    document.getElementById('graph-container')!.innerHTML = '';
    showStatus('Graph cleared', 'info');
    updateStats('Ready for next test');
  } catch (error) {
    showStatus(`❌ Clear failed: ${(error as Error).message}`, 'error');
  }
}

export async function exportGraph(): Promise<void> {
  if (currentGraph) {
    try {
      await currentGraph.exportGraph('v2-canvas-test.png');
      showStatus('Graph exported as PNG', 'success');
    } catch (error) {
      console.error('[Export Error]:', error);
      showStatus('Export failed: ' + (error as Error).message, 'error');
    }
  } else {
    showStatus('No graph loaded', 'error');
    console.warn('[Export] No currentGraph available');
  }
}

export function toggleHitDetectionVisualization(): void {
  if (!currentGraph) {
    showStatus('No graph loaded', 'error');
    return;
  }

  const btn = document.getElementById('hit-viz-btn');

  if (!hitVisualizationVisible) {
    // Show shadow canvas visualization
    try {
      currentGraph.debugShadowCanvas?.();
      if (btn) btn.textContent = '🙈 Hide Hit Areas';
      showStatus('Hit detection areas visualized', 'info');
      hitVisualizationVisible = true;
    } catch (error) {
      showStatus('Visualization not available', 'error');
    }
  } else {
    // Hide visualization by re-rendering normal graph
    try {
      const canvas = currentGraph.getCanvas?.();
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      currentGraph.render();
      if (btn) btn.textContent = '👁️ Show Hit Areas';
      showStatus('Normal view restored', 'info');
      hitVisualizationVisible = false;
    } catch (error) {
      showStatus('Failed to restore view', 'error');
    }
  }
}

function showStatus(message: string, type: 'success' | 'error' | 'info'): void {
  const status = document.getElementById('status');
  if (!status) return;

  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';

  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }
}

function updateStats(message: string): void {
  const stats = document.getElementById('stats');
  if (stats) {
    stats.textContent = message;
  }
}

// Initialize with basic test
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Debug] DOM loaded, starting basic graph test');
  testBasicGraph();
});

// Cleanup on page unload to prevent memory leaks
window.addEventListener('beforeunload', () => {
  clearGraph();
});

// Pause animations when tab is hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden && currentGraph) {
    try {
      currentGraph.pause?.();
    } catch (e) {
      // Ignore if pause method doesn't exist
    }
  }
});

// Expose functions globally for HTML buttons
declare global {
  interface Window {
    testBasicGraph: () => void;
    testLinkLabels: () => void;
    testLabelVisibility: () => void;
    testCustomLabelStyles: () => void;
    testHoverEffects: () => void;
    testHighlighting: () => void;
    testPhysicsDemo: () => void;
    testPerformanceGraph: () => void;
    testLargeGraph10K: () => void;
    testLargeGraph25K: () => void;
    testHitDetection: () => void;
    clearGraph: () => void;
    clearHighlights: () => void;
    exportGraph: () => void;
    toggleHitDetectionVisualization: () => void;
  }
}

window.testBasicGraph = testBasicGraph;
window.testLinkLabels = testLinkLabels;
window.testLabelVisibility = testLabelVisibility;
window.testCustomLabelStyles = testCustomLabelStyles;
window.testHoverEffects = testHoverEffects;
window.testHighlighting = testHighlighting;
window.testPhysicsDemo = testPhysicsDemo;
window.testPerformanceGraph = testPerformanceGraph;
window.testLargeGraph10K = testLargeGraph10K;
window.testLargeGraph25K = testLargeGraph25K;
window.testHitDetection = testHitDetection;
window.clearGraph = clearGraph;
window.clearHighlights = clearHighlights;
window.exportGraph = exportGraph;
window.toggleHitDetectionVisualization = toggleHitDetectionVisualization;