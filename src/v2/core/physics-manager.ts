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

import { V2Node, V2Link } from '../types';
import { ErrorHandler, ValidationError, TimerManager } from '../utils';

export interface PhysicsConfig {
  nodes: V2Node[];
  links: V2Link[];
  width: number;
  height: number;
  onTick: () => void;
  onEnd?: () => void;
  autoFitView?: boolean;
  cooldownTime?: number;
}

export class PhysicsManager {
  private simulation?: Simulation<V2Node, V2Link>;
  private config?: PhysicsConfig;
  private simulationStartTime?: number;
  private simulationEndTime?: number;
  private cooldownTimer?: number;
  private hasInitialAutoFitCompleted = false;
  private timerManager: TimerManager;

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

      this.config = config;
      this.simulationStartTime = performance.now();

      // Calculate adaptive force strengths based on node count and graph density
      const nodeCount = config.nodes.length;
      // const linkCount = config.links.length;
      const graphArea = config.width * config.height;

      // Adaptive charge strength: reduce repulsion for dense graphs
      // const baseChargeStrength = -600; // Reduced base from -800

      // Calculate true density: nodes per unit area (normalized to 100k pixel units)
      const nodeDensity = nodeCount / (graphArea / 100000); // Nodes per 100k pixels
      const densityFactor = Math.min(nodeDensity, 2); // Cap at 2x adjustment
      // const adaptiveChargeStrength = baseChargeStrength / (1 + densityFactor * 0.4);

      // Adaptive velocity decay: faster settling for dense graphs
      const baseVelocityDecay = 0.4;
      const adaptiveVelocityDecay = Math.min(baseVelocityDecay + (densityFactor * 0.2), 0.8);

      // Adaptive alpha decay: faster cooling for dense graphs
      const baseAlphaDecay = 0.02;
      const adaptiveAlphaDecay = Math.min(baseAlphaDecay + (densityFactor * 0.01), 0.05);

      // Debug logging for adaptive physics (can be removed in production)
      // console.log('🔬 Adaptive Physics:', {
      //   nodeCount,
      //   linkCount,
      //   graphArea: Math.round(graphArea),
      //   nodeDensity: nodeDensity.toFixed(3),
      //   densityFactor: densityFactor.toFixed(2),
      //   chargeStrength: adaptiveChargeStrength.toFixed(0),
      //   velocityDecay: adaptiveVelocityDecay.toFixed(2),
      //   alphaDecay: adaptiveAlphaDecay.toFixed(3),
      //   maxDistance: Math.max(300, 600 - densityFactor * 100)
      // });

      // Create D3 force simulation with adaptive parameters
      this.simulation = d3ForceSimulation<V2Node>(config.nodes)
        .force('link', d3ForceLink<V2Node, V2Link>(config.links)
          .id((d: V2Node) => d.id)
          .distance(150) // Increase default link distance for better spacing
          .strength(0.4) // Much weaker link strength to allow repulsion to work
        )
        .force('charge', d3ForceManyBody()
          .strength(-500) // Adaptive repulsion strength
          // .distanceMin(1) // Minimum distance for repulsion
          // .distanceMax(Math.max(300, 600 - densityFactor * 100)) // Reduce max distance for dense graphs
        )
        .force('collision', forceCollide<V2Node>()
          .radius(node => this.getNodeRadius(node) + 2)
          .strength(1)
        )
        .force('center', d3ForceCenter(0, 0)
          .strength(.5) // Center around origin like force-graph
        )
        // .force('x', forceX(0).strength(0.05))
        // .force('y', forceY(0).strength(0.05))
        .velocityDecay(adaptiveVelocityDecay) // Adaptive velocity decay for faster settling
        .alphaDecay(adaptiveAlphaDecay) // Adaptive alpha decay for better convergence
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
  reheat(alphaTarget: number = 0.3): void {
    if (!this.simulation) return;

    try {
      this.simulation.alphaTarget(alphaTarget).restart();

      // Restart cooldown timer
      if (this.config?.cooldownTime) {
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
      // Calculate distance function that accounts for node radii + arrow lengths
      const linkForce = this.simulation.force('link') as ForceLink<V2Node, V2Link> | undefined;
      if (linkForce) {
        linkForce.distance((link: V2Link) => {
          // Dynamic base distance calculation
          const baseDistance = this.calculateBaseDistance();

          // Get actual node radii dynamically
          const sourceNode = this.findNodeById(typeof link.source === 'string' ? link.source : link.source.id);
          const targetNode = this.findNodeById(typeof link.target === 'string' ? link.target : link.target.id);

          const sourceRadius = this.getNodeRadius(sourceNode);
          const targetRadius = this.getNodeRadius(targetNode);
          const arrowLength = this.getLinkArrowLength(link);

          // Calculate visual compensation based on actual values
          const visualCompensation = sourceRadius + targetRadius + arrowLength;
          const spacingBuffer = Math.max(20, (sourceRadius + targetRadius) * 0.5);
          const totalDistance = baseDistance + visualCompensation + spacingBuffer;

          // Debug logging can be enabled here if needed for troubleshooting
          // console.log('🔗 Link Distance Debug:', { totalDistance });

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
    const graphArea = this.config.width * this.config.height;
    const nodeAreaRatio = nodeCount / (graphArea / 10000); // Normalize per 10k pixels

    // Adaptive base distance: more nodes = need more space
    return Math.max(80, Math.min(200, 120 + nodeAreaRatio * 20));
  }

  /**
   * Find node by ID
   */
  private findNodeById(id: string): V2Node | undefined {
    return this.config?.nodes.find(node => node.id === id);
  }

  /**
   * Get node radius from style or default
   */
  private getNodeRadius(node: V2Node | undefined): number {
    if (!node) return 20; // Default radius
    return node.style?.radius ?? 20; // Default to 20 (KG component default)
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
        if (!node.x || !node.y) {
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
  pause(): void {
    if (this.simulation) {
      this.simulation.stop();
    }
  }

  /**
   * Resume the simulation
   */
  resume(): void {
    if (this.simulation) {
      this.simulation.restart();
    }
  }

  /**
   * Destroy physics simulation
   */
  destroy(): void {
    try {
      // Clear cooldown timer using TimerManager
      this.timerManager.clearTimer('simulationCooldown');
      this.cooldownTimer = undefined;

      if (this.simulation) {
        this.simulation.stop();
        this.simulation = undefined;
      }

      this.config = undefined;
      this.simulationStartTime = undefined;
      this.simulationEndTime = undefined;
      this.hasInitialAutoFitCompleted = false;
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }
}