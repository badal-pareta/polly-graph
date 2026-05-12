import { GraphNode, GraphLink } from '../../src/contracts/graph.types';

export interface GraphTestData {
  nodes: GraphNode[];
  links: GraphLink[];
  name: string;
  description: string;
}

const nodeTypes = ['User', 'Group', 'Resource', 'Service', 'Database', 'API'] as const;
const linkTypes = ['connected_to', 'member_of', 'accesses', 'depends_on', 'owns'] as const;

const typeColors: Record<string, { fill: string; stroke: string }> = {
  'User': { fill: '#3b82f6', stroke: '#2563eb' },
  'Group': { fill: '#8b5cf6', stroke: '#7c3aed' },
  'Resource': { fill: '#10b981', stroke: '#059669' },
  'Service': { fill: '#f59e0b', stroke: '#d97706' },
  'Database': { fill: '#dc2626', stroke: '#b91c1c' },
  'API': { fill: '#06b6d4', stroke: '#0891b2' },
};

function generateNode(id: string, index: number): GraphNode {
  const type = nodeTypes[index % nodeTypes.length];
  const colors = typeColors[type];

  return {
    id,
    type,
    label: `${type} ${id}`,
    style: {
      radius: 15 + Math.random() * 15, // 15-30px radius
      fill: colors.fill,
      stroke: colors.stroke,
      strokeWidth: 2,
      opacity: 1,
      textColor: '#ffffff',
    }
  };
}

function generateLink(sourceId: string, targetId: string, index: number): GraphLink {
  const linkType = linkTypes[index % linkTypes.length];
  const strokeColors = ['#94a3b8', '#64748b', '#475569', '#334155'];

  return {
    source: sourceId,
    target: targetId,
    label: linkType,
    style: {
      stroke: strokeColors[index % strokeColors.length],
      strokeWidth: 1 + Math.random() * 3, // 1-4px width
      opacity: 0.7 + Math.random() * 0.3, // 0.7-1.0 opacity
      label: {
        enabled: Math.random() > 0.7, // 30% chance of showing label
        visibility: 'hover'
      }
    }
  };
}

export function generateSmallGraph(): GraphTestData {
  const nodeCount = 15;
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Generate nodes
  for (let i = 0; i < nodeCount; i++) {
    nodes.push(generateNode(`node-${i}`, i));
  }

  // Generate links - more connected for small graphs
  const linkCount = Math.floor(nodeCount * 1.5); // ~22 links
  for (let i = 0; i < linkCount; i++) {
    const sourceIndex = Math.floor(Math.random() * nodeCount);
    let targetIndex = Math.floor(Math.random() * nodeCount);

    // Avoid self-loops
    while (targetIndex === sourceIndex) {
      targetIndex = Math.floor(Math.random() * nodeCount);
    }

    links.push(generateLink(`node-${sourceIndex}`, `node-${targetIndex}`, i));
  }

  return {
    nodes,
    links,
    name: 'Small Graph',
    description: `${nodeCount} nodes, ${links.length} links - Tight, connected layout`
  };
}

export function generateMediumGraph(): GraphTestData {
  const nodeCount = 75;
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Generate nodes
  for (let i = 0; i < nodeCount; i++) {
    nodes.push(generateNode(`node-${i}`, i));
  }

  // Generate links - balanced connectivity
  const linkCount = Math.floor(nodeCount * 1.2); // ~90 links
  for (let i = 0; i < linkCount; i++) {
    const sourceIndex = Math.floor(Math.random() * nodeCount);
    let targetIndex = Math.floor(Math.random() * nodeCount);

    while (targetIndex === sourceIndex) {
      targetIndex = Math.floor(Math.random() * nodeCount);
    }

    links.push(generateLink(`node-${sourceIndex}`, `node-${targetIndex}`, i));
  }

  // Add some hub nodes with more connections
  const hubCount = 5;
  for (let i = 0; i < hubCount; i++) {
    const hubIndex = Math.floor(Math.random() * nodeCount);
    const connectionCount = 5 + Math.floor(Math.random() * 5); // 5-10 connections

    for (let j = 0; j < connectionCount; j++) {
      let targetIndex = Math.floor(Math.random() * nodeCount);
      while (targetIndex === hubIndex) {
        targetIndex = Math.floor(Math.random() * nodeCount);
      }

      links.push(generateLink(`node-${hubIndex}`, `node-${targetIndex}`, links.length));
    }
  }

  return {
    nodes,
    links,
    name: 'Medium Graph',
    description: `${nodeCount} nodes, ${links.length} links - Balanced layout with hubs`
  };
}

export function generateLargeGraph(): GraphTestData {
  const nodeCount = 250;
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Generate nodes
  for (let i = 0; i < nodeCount; i++) {
    nodes.push(generateNode(`node-${i}`, i));
  }

  // Generate links - sparser for performance
  const linkCount = Math.floor(nodeCount * 0.8); // ~200 links (sparse)
  for (let i = 0; i < linkCount; i++) {
    const sourceIndex = Math.floor(Math.random() * nodeCount);
    let targetIndex = Math.floor(Math.random() * nodeCount);

    while (targetIndex === sourceIndex) {
      targetIndex = Math.floor(Math.random() * nodeCount);
    }

    links.push(generateLink(`node-${sourceIndex}`, `node-${targetIndex}`, i));
  }

  // Create clusters for better layout
  const clusterCount = 8;
  const nodesPerCluster = Math.floor(nodeCount / clusterCount);

  for (let cluster = 0; cluster < clusterCount; cluster++) {
    const startIndex = cluster * nodesPerCluster;
    const endIndex = Math.min(startIndex + nodesPerCluster, nodeCount);

    // Connect nodes within cluster
    for (let i = startIndex; i < endIndex - 1; i++) {
      if (Math.random() > 0.3) { // 70% chance of cluster connection
        links.push(generateLink(`node-${i}`, `node-${i + 1}`, links.length));
      }
    }

    // Connect to next cluster
    if (cluster < clusterCount - 1) {
      const nextClusterStart = (cluster + 1) * nodesPerCluster;
      if (nextClusterStart < nodeCount) {
        links.push(generateLink(`node-${endIndex - 1}`, `node-${nextClusterStart}`, links.length));
      }
    }
  }

  return {
    nodes,
    links,
    name: 'Large Graph',
    description: `${nodeCount} nodes, ${links.length} links - Sparse clustered layout for performance`
  };
}

export function generateExtraLargeGraph(): GraphTestData {
  const nodeCount = 500;
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Generate nodes with smaller radii for large graphs
  for (let i = 0; i < nodeCount; i++) {
    const node = generateNode(`node-${i}`, i);
    node.style!.radius = 8 + Math.random() * 8; // 8-16px for performance
    nodes.push(node);
  }

  // Very sparse connectivity for performance
  const linkCount = Math.floor(nodeCount * 0.6); // ~300 links

  // Create a power-law distribution (few highly connected nodes)
  const hubCount = 10;
  const regularNodeCount = nodeCount - hubCount;

  // Connect hubs to many regular nodes
  for (let hubIndex = 0; hubIndex < hubCount; hubIndex++) {
    const connectionCount = 15 + Math.floor(Math.random() * 10); // 15-25 connections per hub

    for (let j = 0; j < connectionCount; j++) {
      let targetIndex = hubCount + Math.floor(Math.random() * regularNodeCount);
      links.push(generateLink(`node-${hubIndex}`, `node-${targetIndex}`, links.length));
    }
  }

  // Add some random connections between regular nodes
  const remainingLinks = linkCount - links.length;
  for (let i = 0; i < remainingLinks; i++) {
    const sourceIndex = hubCount + Math.floor(Math.random() * regularNodeCount);
    let targetIndex = hubCount + Math.floor(Math.random() * regularNodeCount);

    while (targetIndex === sourceIndex) {
      targetIndex = hubCount + Math.floor(Math.random() * regularNodeCount);
    }

    links.push(generateLink(`node-${sourceIndex}`, `node-${targetIndex}`, links.length));
  }

  return {
    nodes,
    links,
    name: 'Extra Large Graph',
    description: `${nodeCount} nodes, ${links.length} links - Hub-spoke layout optimized for performance`
  };
}