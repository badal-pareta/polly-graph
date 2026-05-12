import { Selection } from 'd3-selection';
import { ZoomBehavior } from 'd3-zoom';
import { Simulation } from 'd3-force';

import { GraphConfig } from '../contracts/graph-config.interface';
import { GraphInstance } from '../contracts/graph-instance.interface';
import { GraphDimensions } from '../contracts/resize.interface';
import { GraphLayers } from '../contracts/graph-layers.interface';
import { GraphNode, GraphLink } from '../contracts/graph.types';

import { GraphControlsInstance } from '../controls/create-graph-controls';
import { NodeTooltipBinding } from '../interactions/bind-node-tooltip';
import { PerformanceTickManager } from '../utils/performance-tick-manager';
import { TimerManager } from '../utils/timer-manager';
import { TypedGraphEventEmitter } from '../utils/event-emitter';
import { SelectionManager } from '../utils/selection-manager';

/**
 * Core Graph Manager - Orchestrates all graph components
 *
 * Responsibilities:
 * - State management
 * - Component lifecycle
 * - Cleanup coordination
 */
export class GraphManager {
  // Core Managers
  public timerManager: TimerManager | null = null;
  public tickManager: PerformanceTickManager | null = null;
  public eventEmitter: TypedGraphEventEmitter | null = null;
  public selectionManager: SelectionManager | null = null;

  // DOM Elements
  public svgElement: SVGSVGElement | null = null;
  public rootGroup: SVGGElement | null = null;
  public layers: GraphLayers | null = null;
  public dimensions: GraphDimensions = { width: 0, height: 0 };

  // D3 Behaviors
  public zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null;
  public simulation: Simulation<GraphNode, GraphLink> | null = null;

  // Component Instances
  public controls: GraphControlsInstance | null = null;
  public tooltipBinding: NodeTooltipBinding | null = null;

  // Cleanup Functions
  private cleanupFunctions: VoidFunction[] = [];

  // Callbacks
  public fitViewCallback: (() => void) | null = null;

  // State Tracking
  public linkMarkerSnapshots: Map<SVGLineElement, string | null> | null = null;
  public rootSelection: Selection<SVGGElement, unknown, null, undefined> | null = null;

  constructor(public readonly config: GraphConfig) {
    console.log('[GraphManager] Initializing with config:', {
      nodeCount: config.nodes.length,
      linkCount: config.links.length,
      containerDimensions: {
        width: config.container.clientWidth,
        height: config.container.clientHeight
      }
    });
  }

  /**
   * Initialize core managers
   */
  initializeManagers(): void {
    console.log('[GraphManager] Initializing managers');

    if (!this.timerManager) {
      this.timerManager = new TimerManager();
      console.log('[GraphManager] Created TimerManager');
    } else {
      this.timerManager.reset();
      console.log('[GraphManager] Reset TimerManager');
    }

    if (!this.eventEmitter) {
      this.eventEmitter = new TypedGraphEventEmitter();
      console.log('[GraphManager] Created EventEmitter');
    } else {
      this.eventEmitter.reset();
      console.log('[GraphManager] Reset EventEmitter');
    }

    if (this.tickManager) {
      this.tickManager.clearCaches();
      console.log('[GraphManager] Cleared TickManager caches');
    }
  }

  /**
   * Add cleanup function to be called on destroy
   */
  addCleanup(cleanup: VoidFunction): void {
    this.cleanupFunctions.push(cleanup);
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    console.log('[GraphManager] Destroying graph manager');

    // Execute all cleanup functions
    this.cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('[GraphManager] Cleanup function failed:', error);
      }
    });

    // Clean up managers
    this.timerManager?.destroy();
    this.tickManager?.clearCaches();
    this.eventEmitter?.reset();

    // Clean up components
    if (this.tooltipBinding && 'destroy' in this.tooltipBinding) {
      this.tooltipBinding.destroy();
    }
    this.controls?.destroy?.();

    // Reset state
    this.timerManager = null;
    this.tickManager = null;
    this.eventEmitter = null;
    this.selectionManager = null;
    this.svgElement = null;
    this.rootGroup = null;
    this.zoomBehavior = null;
    this.simulation = null;
    this.controls = null;
    this.tooltipBinding = null;
    this.linkMarkerSnapshots = null;
    this.rootSelection = null;
    this.cleanupFunctions = [];

    console.log('[GraphManager] Graph manager destroyed');
  }

  /**
   * Reheat simulation with specified alpha
   */
  reheatSimulation(alpha: number = 0.3): void {
    if (!this.simulation) {
      console.warn('[GraphManager] Cannot reheat: no simulation');
      return;
    }

    this.simulation.alpha(alpha).restart();

    // Schedule cooldown
    if (this.timerManager) {
      this.timerManager.debounce('simulation-cooldown', (): void => {
        this.simulation?.stop();
      }, 2000);
    }

    console.log('[GraphManager] Simulation reheated with alpha:', alpha);
  }
}