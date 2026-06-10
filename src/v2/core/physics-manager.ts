/**
 * V2 Canvas Graph - Physics Manager
 *
 * Manages D3 force simulation lifecycle and behavior
 */

import {
  forceSimulation as d3ForceSimulation,
  forceLink as d3ForceLink,
  forceManyBody as d3ForceManyBody,
  forceCenter as d3ForceCenter,
  Simulation,
  ForceLink,
  ForceManyBody,
  ForceCenter,
  forceCollide
} from 'd3-force';

import { V2Node, V2Link, PhysicsConfig } from '../types';
import { ErrorHandler, ValidationError, TimerManager } from '../utils';

export class PhysicsManager {
  private simulation?: Simulation<V2Node, V2Link>;
  private config?: PhysicsConfig;
  private simulationStartTime?: number;
  private simulationEndTime?: number;
  private hasInitialAutoFitCompleted = false;
  private timerManager: TimerManager;
  private isVisibilityListenerAttached = false;
  private nodeMap = new Map<string, V2Node>();

  constructor(timerManager: TimerManager) {
    this.timerManager = timerManager;
  }

  /**
   * Initialize physics simulation
   */
  initialize(config: PhysicsConfig): void {
    try {
      ErrorHandler.validateNodes(config.nodes);
      ErrorHandler.validateLinks(config.links);

      if (typeof config.onTick !== 'function') {
        throw new ValidationError('onTick callback is required and must be a function');
      }
      if (!this.isVisibilityListenerAttached) {
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        this.isVisibilityListenerAttached = true;
      }
      this.config = config;
      this.simulationStartTime = performance.now();

      // Calculate adaptive force strengths based on node count and graph density
      const nodeCount = config.nodes.length;
      // const linkCount = config.links.length;
      const graphArea = Math.max(config.width * config.height, 1);

      // Calculate true density: nodes per unit area (normalized to 100k pixel units)
      const nodeDensity = nodeCount / (graphArea / 100000); // Nodes per 100k pixels
      const densityFactor = Math.min(nodeDensity, 2); // Cap at 2x adjustment

      // Adaptive velocity decay: faster settling for dense graphs
      const baseVelocityDecay = 0.4;
      const adaptiveVelocityDecay = Math.min(baseVelocityDecay + (densityFactor * 0.2), 0.8);

      // Adaptive alpha decay: faster cooling for dense graphs
      const baseAlphaDecay = 0.02;
      const adaptiveAlphaDecay = Math.min(baseAlphaDecay + (densityFactor * 0.01), 0.05);

      if (this.simulation) { this.simulation.stop(); }
      this.buildNodeIndex();

      // Create D3 force simulation with adaptive parameters
const linkDistance =
  nodeCount > 10000 ? 220 :
  nodeCount > 5000 ? 190 :
  nodeCount > 2000 ? 170 :
  150;

const chargeStrength =
  nodeCount > 10000 ? -350 :
  nodeCount > 5000 ? -400 :
  nodeCount > 2000 ? -450 :
  -500;

const collisionRadius =
  nodeCount > 10000 ? 1 :
  nodeCount > 5000 ? 2 :
  2;

const collisionIterations =
  nodeCount > 10000 ? 1 :
  nodeCount > 5000 ? 1 :
  2;

const centerStrength =
  nodeCount > 5000 ? 0.15 : 0.5;

const linkStrength =
  nodeCount > 10000 ? 0.15 :
  nodeCount > 5000 ? 0.25 :
  0.4;

this.simulation = d3ForceSimulation<V2Node>(config.nodes)
  .force(
    'link',
    d3ForceLink<V2Node, V2Link>(config.links)
      .id((d: V2Node) => d.id)
      .distance(linkDistance)
      .strength(linkStrength)
      .iterations(1)
  )
  .force(
    'charge',
    d3ForceManyBody<V2Node>()
      .strength(chargeStrength)
      .theta(nodeCount > 5000 ? 1.2 : 0.9)
      .distanceMax(nodeCount > 5000 ? 500 : 1000)
  )
  .force(
    'collision',
    forceCollide<V2Node>()
      .radius(node => (node.style?.radius ?? 20) + collisionRadius)
      .strength(1)
      .iterations(collisionIterations)
  )
  .force(
    'center',
    d3ForceCenter(0, 0)
      .strength(centerStrength)
  )
  .velocityDecay(
    nodeCount > 5000
      ? 0.65
      : adaptiveVelocityDecay
  )
  .alphaDecay(
    nodeCount > 5000
      ? 0.05
      : adaptiveAlphaDecay
  )
  .alphaMin(
    nodeCount > 5000
      ? 0.05
      : 0.001
  )
  .on('tick', config.onTick)
  .on('end', () => this.handleSimulationEnd());
      // Setup cooldown timer if specified
      if (config.cooldownTime) {
        this.setupCooldownTimer(config.cooldownTime);
      }

    } catch (error) {
      ErrorHandler.logError(error as Error, {
        nodeCount: config.nodes.length,
        linkCount: config.links.length,
        dimensions: { width: config.width, height: config.height }
      });
      throw error;
    }
  }

  /**
   * Handle simulation end
   */
  private handleSimulationEnd(): void {
    try {
      this.simulationEndTime = performance.now();

      if (this.config?.onEnd) {
        this.config.onEnd();
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Check if initial auto-fitview should happen and mark it as completed
   */
  shouldDoInitialAutoFitView(): boolean {
    if (this.hasInitialAutoFitCompleted) {
      return false;
    }
    this.hasInitialAutoFitCompleted = true;
    return true;
  }

  /**
   * Setup cooldown timer (force-graph pattern)
   */
  private setupCooldownTimer(cooldownTime: number): void {
    if (!this.simulation) return;

    try {
      // Clear any existing timer
      this.timerManager.clearTimer('simulationCooldown');

      this.timerManager.setTimeout('simulationCooldown', () => {
        if (this.simulation && this.simulation.alpha() > 0) {
          this.simulation.stop();
          this.handleSimulationEnd();
        }
      }, cooldownTime);

    } catch (error) {
      ErrorHandler.logError(error as Error, { cooldownTime });
    }
  }

  /**
   * Build node index for O(1) lookups (Step 3 optimization)
   */
  private buildNodeIndex(): void {
    if (!this.config) return;

    try {
      // Clear existing index
      this.nodeMap.clear();

      // Build node index for fast lookups
      for (const node of this.config.nodes) {
        this.nodeMap.set(node.id, node);
      }

      // Pre-resolve link references for O(1) access
      for (const link of this.config.links) {
        // Convert string source/target to node objects if needed
        if (typeof link.source === 'string') {
          const sourceNode = this.nodeMap.get(link.source);
          if (sourceNode) {
            link.source = sourceNode;
          }
        }
        if (typeof link.target === 'string') {
          const targetNode = this.nodeMap.get(link.target);
          if (targetNode) {
            link.target = targetNode;
          }
        }
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Get simulation instance
   */
  getSimulation(): Simulation<V2Node, V2Link> {
    if (!this.simulation) {
      throw new ValidationError('Physics manager not initialized');
    }
    return this.simulation;
  }

  /**
   * Reheat simulation for drag interactions
   */
  reheat(alphaTarget?: number): void {
    if (!this.simulation || !this.config) { return; }

    const nodeCount = this.config.nodes.length;

    const effectiveAlpha =
      alphaTarget ??
      (
        nodeCount > 10000 ? 0.005 :
        nodeCount > 5000  ? 0.01 :
        nodeCount > 2000  ? 0.02 :
        0.1
      );

    try {
      this.simulation.alphaTarget(effectiveAlpha).restart();

      if (this.config.cooldownTime) {
        this.setupCooldownTimer(this.config.cooldownTime);
      }
    } catch (error) {
      ErrorHandler.logError(error as Error, { alphaTarget });
    }
  }

  /**
   * Cool down simulation
   */
  cooldown(): void {
    if (!this.simulation) return;

    try {
      this.simulation.alphaTarget(0);
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Update force parameters
   */
  updateForces(options: {
    linkStrength?: number;
    chargeStrength?: number;
    centerStrength?: number;
    linkDistance?: number | ((link: V2Link) => number);
  }): void {
    if (!this.simulation) return;

    try {
      if (options.linkStrength !== undefined) {
        const linkForce = this.simulation.force('link') as ForceLink<V2Node, V2Link> | undefined;
        if (linkForce) {
          linkForce.strength(options.linkStrength);
        }
      }

      if (options.linkDistance !== undefined) {
        const linkForce = this.simulation.force('link') as ForceLink<V2Node, V2Link> | undefined;
        if (linkForce) {
          linkForce.distance(options.linkDistance);
        }
      }

      if (options.chargeStrength !== undefined) {
        const chargeForce = this.simulation.force('charge') as ForceManyBody<V2Node> | undefined;
        if (chargeForce) {
          chargeForce.strength(options.chargeStrength);
        }
      }

      if (options.centerStrength !== undefined) {
        const centerForce = this.simulation.force('center') as ForceCenter<V2Node> | undefined;
        if (centerForce) {
          centerForce.strength(options.centerStrength);
        }
      }
    } catch (error) {
      ErrorHandler.logError(error as Error, options);
    }
  }

  /**
   * Update center force position for new canvas dimensions
   * Following force-graph pattern for container resizing
   */
  updateCenterForce(x: number, y: number): void {
    if (!this.simulation) return;

    try {
      // Update center force to new canvas center following V1 pattern
      this.simulation.force('center', d3ForceCenter(x, y).strength(0.1));
    } catch (error) {
      ErrorHandler.logError(error as Error, { x, y });
    }
  }

  /**
   * Adjust link distances to account for visual shortening
   */
  adjustLinkDistancesForVisualShortening(): void {
    if (!this.simulation || !this.config) return;

    try {
      // Dynamic base distance calculation
      const baseDistance = this.calculateBaseDistance();
      // Calculate distance function that accounts for node radii + arrow lengths
      const linkForce = this.simulation.force('link') as ForceLink<V2Node, V2Link> | undefined;
      if (linkForce) {
        linkForce.distance((link: V2Link) => {

          // Get actual node radii dynamically
          const sourceNode = typeof link.source === 'string' ? this.nodeMap.get(link.source) : link.source;
          const targetNode = typeof link.target === 'string' ? this.nodeMap.get(link.target) : link.target;
          const sourceRadius = sourceNode?.style?.radius ?? 20;
          const targetRadius = targetNode?.style?.radius ?? 20;
          const arrowLength = this.getLinkArrowLength(link);

          // Calculate visual compensation based on actual values
          const visualCompensation = sourceRadius + targetRadius + arrowLength;
          const spacingBuffer = Math.max(20, (sourceRadius + targetRadius) * 0.5);
          const totalDistance = baseDistance + visualCompensation + spacingBuffer;

          return totalDistance;
        });
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Calculate base distance based on graph size and node count
   */
  private calculateBaseDistance(): number {
    if (!this.config) return 120;

    const nodeCount = this.config.nodes.length;
    const graphArea = Math.max(this.config.width * this.config.height, 1);
    const nodeAreaRatio = nodeCount / (graphArea / 10000); // Normalize per 10k pixels

    // Adaptive base distance: more nodes = need more space
    return Math.max(80, Math.min(200, 120 + nodeAreaRatio * 20));
  }
  /**
   * Get arrow length from link style or default
   */
  private getLinkArrowLength(link: V2Link): number {
    const linkStyle = link.style;
    const arrowEnabled = linkStyle?.arrow?.enabled !== false; // Default enabled

    if (!arrowEnabled) return 0;

    return linkStyle?.arrow?.size ?? 8; // Default to 8 (updated default)
  }

  /**
   * Initialize node positions if not set
   */
  initializePositions(): void {
    if (!this.config) return;

    try {
      for (const node of this.config.nodes) {
        if (node.x == null || node.y == null) {
          node.x = Math.random() * this.config.width;
          node.y = Math.random() * this.config.height;
        }
      }
    } catch (error) {
      ErrorHandler.logError(error as Error, {
        nodeCount: this.config.nodes.length
      });
    }
  }

  /**
   * Stop simulation
   */
  stop(): void {
    if (!this.simulation) return;

    try {
      this.simulation.stop();
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Get simulation timing information
   */
  getSimulationTiming(): {
    startTime?: number;
    endTime?: number;
    duration?: number;
    isRunning: boolean;
    elapsed: number;
  } {
    const now = performance.now();
    const isRunning = !!(this.simulation && this.simulation.alpha() > 0);
    const elapsed = this.simulationStartTime ? now - this.simulationStartTime : 0;
    const duration = this.simulationStartTime && this.simulationEndTime
      ? this.simulationEndTime - this.simulationStartTime
      : undefined;

    return {
      startTime: this.simulationStartTime,
      endTime: this.simulationEndTime,
      duration,
      isRunning,
      elapsed
    };
  }

  /**
   * Check if simulation is currently running
   */
  isSimulationRunning(): boolean {
    return !!(this.simulation && this.simulation.alpha() > 0);
  }

  /**
   * Pause the simulation
   */
  public pause(): void {
    if (!this.simulation) { return; }

    this.timerManager.clearTimer('simulationCooldown');
    this.simulation.stop();
  }

  /**
   * Resume the simulation
   */
  resume(): void {
    if (!this.simulation) { return; }
    const nodeCount = this.config?.nodes.length ?? 0;

    const alpha =
      nodeCount > 10000 ? 0.01 :
      nodeCount > 5000 ? 0.02 :
      nodeCount > 2000 ? 0.05 :
      0.3;

    this.simulation
      .alpha(alpha)
      .alphaTarget(0)
      .restart();
    if (this.config?.cooldownTime) {
      this.setupCooldownTimer(this.config.cooldownTime);
    }
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') {
      this.pause();
    } else {
      this.resume();
    }
  };

  /**
   * Destroy physics simulation
   */
  destroy(): void {
    try {
      // Clear cooldown timer using TimerManager
      if (this.isVisibilityListenerAttached) {
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        this.isVisibilityListenerAttached = false;
      }
      this.timerManager.clearTimer('simulationCooldown');

      if (this.simulation) {
        this.simulation.stop();
        this.simulation = undefined;
      }

      this.config = undefined;
      this.nodeMap.clear();
      this.simulationStartTime = undefined;
      this.simulationEndTime = undefined;
      this.hasInitialAutoFitCompleted = false;
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }
}