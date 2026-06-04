/**
 * Data Generator for Polly Graph Demo
 * Creates test datasets of various sizes for performance testing
 * Uses V1 GraphNode & GraphLink types for compatibility
 */

// Import V1 types from the main library
import type { GraphNode, GraphLink } from '../../../src';
// Import shared colors
import { DEFAULT_COLORS } from '../../../src/shared';

export interface TestGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  metadata: {
    nodeCount: number;
    linkCount: number;
    avgConnections: number;
    generatedAt: string;
  };
}

// Use shared color palette
const NODE_COLORS = DEFAULT_COLORS.nodes;

// Node type names for variety
const NODE_TYPES = [
  'server', 'database', 'service', 'user', 'device',
  'process', 'container', 'function', 'endpoint', 'queue'
];

/**
 * Generates a random graph dataset
 * @param nodeCount Number of nodes to generate
 * @param avgConnections Average number of connections per node
 * @param clustered Whether to create clustered topology (more realistic)
 */
export function generateGraphData(
  nodeCount: number,
  avgConnections: number = 2.5,
  clustered: boolean = true
): TestGraphData {
  // Create temporary node data for link generation
  const tempNodes = [];
  for (let i = 0; i < nodeCount; i++) {
    const nodeType = NODE_TYPES[Math.floor(Math.random() * NODE_TYPES.length)];
    const colorIndex = Math.floor(Math.random() * NODE_COLORS.length);

    tempNodes.push({
      id: `node-${i}`,
      type: nodeType,
      label: `${nodeType}-${i}`,
      style: {
        radius: Math.random() * 10 + 5, // Random radius 5-15
        fill: NODE_COLORS[colorIndex]
      }
    });
  }

  const links: GraphLink[] = [];

  // Generate links based on topology strategy
  if (clustered) {
    generateClusteredLinks(tempNodes as GraphNode[], links, avgConnections);
  } else {
    generateRandomLinks(tempNodes as GraphNode[], links, avgConnections);
  }

  // Calculate connection counts
  const connectionCounts = new Map<string, number>();
  links.forEach(link => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    connectionCounts.set(sourceId, (connectionCounts.get(sourceId) || 0) + 1);
    connectionCounts.set(targetId, (connectionCounts.get(targetId) || 0) + 1);
  });

  // Create final nodes with simple label tooltips
  const nodes: GraphNode[] = tempNodes.map(tempNode => ({
    ...tempNode,
    tooltip: tempNode.label
  }));

  return {
    nodes,
    links,
    metadata: {
      nodeCount: nodes.length,
      linkCount: links.length,
      avgConnections: links.length / nodes.length,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Generates clustered topology (more realistic for real-world networks)
 */
function generateClusteredLinks(nodes: GraphNode[], links: GraphLink[], avgConnections: number) {
  const totalLinks = Math.floor(nodes.length * avgConnections / 2);
  const clusters = Math.max(3, Math.floor(nodes.length / 10)); // ~10 nodes per cluster

  // Assign nodes to clusters
  const nodesByCluster: GraphNode[][] = Array.from({ length: clusters }, () => []);
  nodes.forEach((node, i) => {
    const clusterIndex = Math.floor(i * clusters / nodes.length);
    nodesByCluster[clusterIndex].push(node);
  });

  let linkCount = 0;
  const linkSet = new Set<string>();

  // Create intra-cluster connections (80% of links)
  const intraClusterLinks = Math.floor(totalLinks * 0.8);
  while (linkCount < intraClusterLinks && linkCount < totalLinks) {
    const clusterIndex = Math.floor(Math.random() * clusters);
    const cluster = nodesByCluster[clusterIndex];

    if (cluster.length < 2) continue;

    const sourceIndex = Math.floor(Math.random() * cluster.length);
    const targetIndex = Math.floor(Math.random() * cluster.length);

    if (sourceIndex === targetIndex) continue;

    const source = cluster[sourceIndex];
    const target = cluster[targetIndex];
    const linkId = `${source.id}-${target.id}`;
    const reverseLinkId = `${target.id}-${source.id}`;

    if (!linkSet.has(linkId) && !linkSet.has(reverseLinkId)) {
      links.push(createLink(source, target));
      linkSet.add(linkId);
      linkCount++;
    }
  }

  // Create inter-cluster connections (20% of links)
  while (linkCount < totalLinks) {
    const cluster1 = Math.floor(Math.random() * clusters);
    const cluster2 = Math.floor(Math.random() * clusters);

    if (cluster1 === cluster2 || nodesByCluster[cluster1].length === 0 || nodesByCluster[cluster2].length === 0) {
      continue;
    }

    const source = nodesByCluster[cluster1][Math.floor(Math.random() * nodesByCluster[cluster1].length)];
    const target = nodesByCluster[cluster2][Math.floor(Math.random() * nodesByCluster[cluster2].length)];
    const linkId = `${source.id}-${target.id}`;
    const reverseLinkId = `${target.id}-${source.id}`;

    if (!linkSet.has(linkId) && !linkSet.has(reverseLinkId)) {
      links.push(createLink(source, target));
      linkSet.add(linkId);
      linkCount++;
    }
  }
}

/**
 * Generates random topology
 */
function generateRandomLinks(nodes: GraphNode[], links: GraphLink[], avgConnections: number) {
  const totalLinks = Math.floor(nodes.length * avgConnections / 2);
  const linkSet = new Set<string>();

  for (let i = 0; i < totalLinks; i++) {
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const sourceIndex = Math.floor(Math.random() * nodes.length);
      const targetIndex = Math.floor(Math.random() * nodes.length);

      if (sourceIndex === targetIndex) {
        attempts++;
        continue;
      }

      const source = nodes[sourceIndex];
      const target = nodes[targetIndex];
      const linkId = `${source.id}-${target.id}`;
      const reverseLinkId = `${target.id}-${source.id}`;

      if (!linkSet.has(linkId) && !linkSet.has(reverseLinkId)) {
        links.push(createLink(source, target));
        linkSet.add(linkId);
        break;
      }
      attempts++;
    }
  }
}

/**
 * Creates a link with random properties using V1 GraphLink structure
 */
function createLink(source: GraphNode, target: GraphNode): GraphLink {
  const strokeWidth = Math.random() * 3 + 0.5; // Random width 0.5-3.5
  const hasLabel = Math.random() < 0.3; // 30% chance of having a label

  return {
    source: source.id,
    target: target.id,
    label: hasLabel ? `Link ${source.id.split('-')[1]}-${target.id.split('-')[1]}` : undefined,
    tooltip: hasLabel ? `Connection: ${source.type} → ${target.type}` : undefined,
    style: {
      strokeWidth,
      stroke: strokeWidth > 2 ? DEFAULT_COLORS.interaction.linkSelected : DEFAULT_COLORS.links.default
    }
  };
}

// Predefined dataset sizes for testing
export const DATASET_SIZES = {
  TINY: { nodes: 10, avgConnections: 2 },
  SMALL: { nodes: 50, avgConnections: 2.5 },
  MEDIUM: { nodes: 100, avgConnections: 3 },
  LARGE: { nodes: 500, avgConnections: 3.5 },
  XL: { nodes: 1000, avgConnections: 4 },
  XXL: { nodes: 5000, avgConnections: 3 },
  HUGE: { nodes: 25000, avgConnections: 2.5 },
  MASSIVE: { nodes: 50000, avgConnections: 2 }
} as const;

// Generate all predefined datasets
export const GENERATED_DATASETS = {
  tiny: () => generateGraphData(DATASET_SIZES.TINY.nodes, DATASET_SIZES.TINY.avgConnections),
  small: () => generateGraphData(DATASET_SIZES.SMALL.nodes, DATASET_SIZES.SMALL.avgConnections),
  medium: () => generateGraphData(DATASET_SIZES.MEDIUM.nodes, DATASET_SIZES.MEDIUM.avgConnections),
  large: () => generateGraphData(DATASET_SIZES.LARGE.nodes, DATASET_SIZES.LARGE.avgConnections),
  xl: () => generateGraphData(DATASET_SIZES.XL.nodes, DATASET_SIZES.XL.avgConnections),
  xxl: () => generateGraphData(DATASET_SIZES.XXL.nodes, DATASET_SIZES.XXL.avgConnections),
  huge: () => generateGraphData(DATASET_SIZES.HUGE.nodes, DATASET_SIZES.HUGE.avgConnections),
  massive: () => generateGraphData(DATASET_SIZES.MASSIVE.nodes, DATASET_SIZES.MASSIVE.avgConnections)
} as const;

export type DatasetName = keyof typeof GENERATED_DATASETS;