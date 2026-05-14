import {
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceLink,
  forceCollide,
  forceX,
  forceY,
  Simulation
} from 'd3-force';

import {
  GraphLink,
  GraphNode,
  GraphNodeWithInitial
} from '../contracts/graph.types';

import {
  SimulationConfig,
  SimulationResult
} from '../contracts/simulation.interface';

interface AdaptiveDefaults {
  readonly alpha: number;
  readonly alphaDecay: number;
  readonly alphaMin: number;
  readonly velocityDecay: number;
  readonly forces: {
    readonly link: { strength: number; distance: number };
    readonly charge: { strength: number };
    readonly center: { strength: number };
    readonly collide: { strength: number; iterations: number };
  };
}

function getAdaptiveDefaults(nodeCount: number): AdaptiveDefaults {
  // Updated to match reference simulation values
  if (nodeCount < 50) {
    return {
      alpha: 1,
      alphaDecay: 0.05,
      alphaMin: 0.001,
      velocityDecay: 0.6,
      forces: {
        link: { strength: 0.5, distance: 200 },
        charge: { strength: -500 },
        center: { strength: 0.05 },
        collide: { strength: 0.8, iterations: 1 }
      }
    };
  } else if (nodeCount < 200) {
    return {
      alpha: 1,
      alphaDecay: 0.05,
      alphaMin: 0.001,
      velocityDecay: 0.6,
      forces: {
        link: { strength: 0.5, distance: 200 },
        charge: { strength: -500 },
        center: { strength: 0.05 },
        collide: { strength: 0.7, iterations: 1 }
      }
    };
  } else {
    return {
      alpha: 1,
      alphaDecay: 0.05,
      alphaMin: 0.001,
      velocityDecay: 0.6,
      forces: {
        link: { strength: 0.5, distance: 200 },
        charge: { strength: -500 },
        center: { strength: 0.05 },
        collide: { strength: 0.6, iterations: 1 }
      }
    };
  }
}

function warmupSimulation(simulation: Simulation<GraphNode, GraphLink>, ticks: number): void {
  for (let i = 0; i < ticks; i++) {
    simulation.tick();
  }
}

export function createGraphSimulation(
  config: SimulationConfig
): SimulationResult {
  //   nodeCount: config.nodes.length,
  //   linkCount: config.links.length,
  //   dimensions: { width: config.width, height: config.height },
  //   nodes: config.nodes.map(n => ({ id: n.id, x: n.x, y: n.y }))
  // });

  const centerX: number = config.width / 2;
  const centerY: number = config.height / 2;

  const nodeCount = config.nodes.length;

  const adaptiveDefaults = getAdaptiveDefaults(nodeCount);
  const enhancedConfig = config.config || {};
  const forces = enhancedConfig.forces || {};

  const useAdaptive = enhancedConfig.adaptive?.enabled !== false;

  seedNodePositions(config.nodes, config.width, config.height);

  const alpha = enhancedConfig.alpha ?? (useAdaptive ? adaptiveDefaults.alpha : 1);
  const alphaDecay = enhancedConfig.alphaDecay ?? (useAdaptive ? adaptiveDefaults.alphaDecay : 0.05);
  const alphaMin = enhancedConfig.alphaMin ?? (useAdaptive ? adaptiveDefaults.alphaMin : 0.001);
  const velocityDecay = enhancedConfig.velocityDecay ?? (useAdaptive ? adaptiveDefaults.velocityDecay : 0.6);

  const simulation: Simulation<GraphNode, GraphLink> = forceSimulation<GraphNode>(config.nodes)
    .alpha(alpha)
    .alphaDecay(alphaDecay)
    .alphaMin(alphaMin)
    .velocityDecay(velocityDecay);

  if (forces.link?.enabled !== false) {
    const linkDistance = forces.link?.distance ??
      (useAdaptive ? adaptiveDefaults.forces.link.distance : 200);
    const linkStrength = forces.link?.strength ??
      (useAdaptive ? adaptiveDefaults.forces.link.strength : 0.5);

    simulation.force('link',
      forceLink<GraphNode, GraphLink>(config.links)
        .id((node: GraphNode) => node.id)
        .distance(typeof linkDistance === 'function' ? linkDistance : () => linkDistance)
        .strength(typeof linkStrength === 'function' ? linkStrength : () => linkStrength)
        .iterations(forces.link?.iterations ?? 1)
    );
  }

  if (forces.charge?.enabled !== false) {
    const chargeStrength = forces.charge?.strength ??
      (useAdaptive ? adaptiveDefaults.forces.charge.strength : -500);

    const chargeForce = forceManyBody()
      .theta(forces.charge?.theta ?? 0.9)
      .distanceMin(forces.charge?.distanceMin ?? 1)
      .distanceMax(forces.charge?.distanceMax ?? Infinity);

    if (typeof chargeStrength === 'function') {
      chargeForce.strength((d, _i) => chargeStrength(d as GraphNode));
    } else {
      chargeForce.strength(chargeStrength);
    }

    simulation.force('charge', chargeForce);
  }

  if (forces.collide?.enabled !== false) {
    const collideRadius = forces.collide?.radius ?? ((node: GraphNode) => (node.style?.radius ?? 12) + 8);
    const collideStrength = forces.collide?.strength ??
      (useAdaptive ? adaptiveDefaults.forces.collide.strength : 0.7);

    const collideForce = forceCollide<GraphNode>()
      .strength(collideStrength)
      .iterations(forces.collide?.iterations ?? adaptiveDefaults.forces.collide.iterations);

    if (typeof collideRadius === 'function') {
      collideForce.radius((d, _i) => collideRadius(d as GraphNode));
    } else {
      collideForce.radius(collideRadius);
    }

    simulation.force('collide', collideForce);
  }

  if (forces.center?.enabled !== false) {
    const centerStrength = forces.center?.strength ??
      (useAdaptive ? adaptiveDefaults.forces.center.strength : 0.05);

    simulation.force('center',
      forceCenter(
        forces.center?.x ?? centerX,
        forces.center?.y ?? centerY
      ).strength(centerStrength)
    );
  }

  // Enable X and Y forces by default to match reference simulation
  if (forces.x?.enabled !== false) {
    const xForce = forceX().strength(forces.x?.strength ?? 0.05);
    const xPosition = forces.x?.x;
    if (typeof xPosition === 'function') {
      xForce.x((d, _i) => xPosition(d as GraphNode));
    } else {
      xForce.x(xPosition ?? centerX);
    }
    simulation.force('x', xForce);
  }

  if (forces.y?.enabled !== false) {
    const yForce = forceY().strength(forces.y?.strength ?? 0.05);
    const yPosition = forces.y?.y;
    if (typeof yPosition === 'function') {
      yForce.y((d, _i) => yPosition(d as GraphNode));
    } else {
      yForce.y(yPosition ?? centerY);
    }
    simulation.force('y', yForce);
  }

  if (enhancedConfig.warmup?.enabled !== false) {
    const warmupTicks = enhancedConfig.warmup?.ticks ??
      (useAdaptive ? Math.min(100, nodeCount * 2) : 50);
    warmupSimulation(simulation, warmupTicks);
  }

  return { simulation };
}

export function reheatSimulation(
  simulation: Simulation<
    GraphNode,
    GraphLink
  >,
  alpha: number = 0.3
): void {

  simulation
    .alpha(alpha)
    .restart();

}

function seedNodePositions(
  nodes: readonly GraphNode[],
  containerWidth: number,
  containerHeight: number
): void {

  //   nodeCount: nodes.length,
  //   containerWidth,
  //   containerHeight,
  //   nodesBefore: nodes.map(n => ({ id: n.id, x: n.x, y: n.y }))
  // });


  // Validate container dimensions - if invalid, defer positioning
  if (containerWidth <= 0 || containerHeight <= 0) {
    console.warn('🚫 [seedNodePositions] Invalid container dimensions, skipping positioning');
    return;
  }

  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  // Calculate radius that keeps nodes within container bounds with padding
  const padding = 50;
  const maxRadius = Math.min(
    (containerWidth - padding * 2) / 2,
    (containerHeight - padding * 2) / 2
  );
  const nodeBasedRadius = Math.max(50, Math.min(200, nodes.length * 3));
  const seedRadius = Math.min(maxRadius, nodeBasedRadius);


  //   containerWidth,
  //   containerHeight,
  //   centerX,
  //   centerY,
  //   maxRadius,
  //   nodeBasedRadius,
  //   seedRadius,
  //   padding
  // });

  nodes.forEach(
    (
      node: GraphNode,
      index: number
    ): void => {

      // Only position nodes that don't have valid positions
      if (
        node.x != null
        && node.y != null
        && !isNaN(node.x)
        && !isNaN(node.y)
        && isFinite(node.x)
        && isFinite(node.y)
      ) {
        return;
      }

      // Add some randomness to break perfect symmetry
      const angle: number = (
        (index / Math.max(nodes.length, 1)) * Math.PI * 2
      ) + (Math.random() - 0.5) * 0.5;

      const radius: number = seedRadius * (0.3 + Math.random() * 0.7);

      // Calculate position
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // Ensure nodes stay within container bounds
      const nodeRadius = 12; // Default node radius
      const clampedX = Math.max(nodeRadius, Math.min(containerWidth - nodeRadius, x));
      const clampedY = Math.max(nodeRadius, Math.min(containerHeight - nodeRadius, y));

      node.x = clampedX;
      node.y = clampedY;


    }
  );


  // Store initial positions before simulation can move them
  nodes.forEach((node: GraphNodeWithInitial) => {
    node.initialX = node.x;
    node.initialY = node.y;
  });
}

function calculateLinkDistance(
  link: GraphLink
): number {

  const source: GraphNode =
    link.source as GraphNode;

  const target: GraphNode =
    link.target as GraphNode;

  const sourceRadius: number =
    source.style?.radius ?? 20;

  const targetRadius: number =
    target.style?.radius ?? 20;

  // Base distance: node radii + clearance
  let distance = sourceRadius + targetRadius + 60;

  // Add space for labels if present
  if (link.label) {
    // Estimate label width: roughly 8px per character + padding
    const labelWidth = (link.label.length * 8) + 16; // 8px per char + 16px padding
    const labelHeight = 24; // Default label height

    // Add label space requirement to distance
    // Use the larger dimension (width or height) plus extra clearance
    const labelSpace = Math.max(labelWidth, labelHeight) + 40; // 40px clearance
    distance += labelSpace;
  }

  // Minimum distance to prevent overlapping
  return Math.max(distance, 100);

}