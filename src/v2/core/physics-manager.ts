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
  Simulation
} from 'd3-force';

import { V2Node, V2Link } from '../types';
import { ErrorHandler, ValidationError } from '../utils';

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

      // Create D3 force simulation with better spacing parameters
      this.simulation = d3ForceSimulation<V2Node>(config.nodes)
        .force('link', d3ForceLink<V2Node, V2Link>(config.links)
          .id((d: V2Node) => d.id)
          .distance(100) // Increase default link distance for better spacing
          .strength(0.2) // Much weaker link strength to allow repulsion to work
        )
        .force('charge', d3ForceManyBody()
          .strength(-800) // Much stronger repulsion to overcome multiple link forces
          .distanceMin(1) // Minimum distance for repulsion
          .distanceMax(600) // Increase max distance for wider repulsion effect
        )
        .force('center', d3ForceCenter(config.width / 2, config.height / 2)
          .strength(0.1) // Reduce center force to allow more spread
        )
        .velocityDecay(0.4) // Increase velocity decay for faster settling
        .alphaDecay(0.02) // Slightly slower alpha decay for better convergence
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
      if (this.cooldownTimer) {
        clearTimeout(this.cooldownTimer);
      }

      const startAlpha = this.simulation.alpha();

      this.cooldownTimer = window.setTimeout(() => {
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
        const linkForce = this.simulation.force('link') as any;
        if (linkForce) {
          linkForce.strength(options.linkStrength);
        }
      }

      if (options.linkDistance !== undefined) {
        const linkForce = this.simulation.force('link') as any;
        if (linkForce) {
          linkForce.distance(options.linkDistance);
        }
      }

      if (options.chargeStrength !== undefined) {
        const chargeForce = this.simulation.force('charge') as any;
        if (chargeForce) {
          chargeForce.strength(options.chargeStrength);
        }
      }

      if (options.centerStrength !== undefined) {
        const centerForce = this.simulation.force('center') as any;
        if (centerForce) {
          centerForce.strength(options.centerStrength);
        }
      }
    } catch (error) {
      ErrorHandler.logError(error as Error, options);
    }
  }

  /**
   * Adjust link distances to account for visual shortening
   */
  adjustLinkDistancesForVisualShortening(): void {
    if (!this.simulation || !this.config) return;

    try {
      // Calculate distance function that accounts for node radii + arrow lengths
      const linkForce = this.simulation.force('link') as any;
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

    // Check if node has style.radius
    const nodeStyle = (node as any).style;
    return nodeStyle?.radius ?? 20; // Default to 20 (KG component default)
  }

  /**
   * Get arrow length from link style or default
   */
  private getLinkArrowLength(link: V2Link): number {
    const linkStyle = (link as any).style;
    const arrowEnabled = linkStyle?.arrow?.enabled !== false; // Default enabled

    if (!arrowEnabled) return 0;

    return linkStyle?.arrow?.length ?? 8; // Default to 8 (updated default)
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
   * Get simulation statistics
   */
  getStats(): {
    alpha: number;
    alphaTarget: number;
    alphaDecay: number;
    velocityDecay: number;
    nodeCount: number;
    linkCount: number;
    timing: ReturnType<typeof this.getSimulationTiming>;
  } {
    if (!this.simulation || !this.config) {
      throw new ValidationError('Physics manager not initialized');
    }

    return {
      alpha: this.simulation.alpha(),
      alphaTarget: this.simulation.alphaTarget(),
      alphaDecay: this.simulation.alphaDecay(),
      velocityDecay: this.simulation.velocityDecay(),
      nodeCount: this.config.nodes.length,
      linkCount: this.config.links.length,
      timing: this.getSimulationTiming()
    };
  }

  /**
   * Destroy physics simulation
   */
  destroy(): void {
    try {
      // Clear cooldown timer
      if (this.cooldownTimer) {
        clearTimeout(this.cooldownTimer);
        this.cooldownTimer = undefined;
      }

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