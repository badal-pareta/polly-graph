/**
 * V2 Canvas Graph - Modular Implementation
 *
 * High-performance canvas-based graph with comprehensive error handling
 * and modular architecture.
 */

import { V2Config, V2Instance, V2Node, V2Link } from './types';
import { ErrorHandler, ValidationError } from './utils';
import { CanvasManager, PhysicsManager } from './core';
import { DragManager, ZoomManager, HoverManager, SelectionManager, HoverEvent } from './interactions';
import { Renderer } from './rendering';
import { FloatTooltipManager } from './ui/float-tooltip';
import { createV2GraphControls, V2GraphControlsInstance } from './ui/graph-controls';
import { createV2GraphLegends, V2GraphLegendsInstance } from './ui/graph-legends';
import { TimerManager } from './utils/timer-manager';
import ColorTracker from 'canvas-color-tracker';
import { ZoomBehavior } from 'd3-zoom';
import { StatsMetrics } from './types/generic.types';

export class V2Graph implements V2Instance {
  private config?: V2Config;
  private canvasManager = new CanvasManager();
  private timerManager = new TimerManager();
  private physicsManager = new PhysicsManager(this.timerManager);
  // private pointerManager = new PointerManager();
  private dragManager = new DragManager();
  private zoomManager = new ZoomManager();
  private hoverManager = new HoverManager();
  private selectionManager = new SelectionManager();
  private renderer = new Renderer();
  private tooltipManager?: FloatTooltipManager;
  private controlsManager?: V2GraphControlsInstance;
  private legendsManager?: V2GraphLegendsInstance;
  private lastRenderTime = 0;
  private isInitialLoad = true;

  /**
   * Initialize the graph
   */
  initialize(config: V2Config): void {
    try {
      // Validate configuration
      this.validateConfig(config);
      this.config = config;

      // Initialize canvas system
      const canvasState = this.canvasManager.initialize(config);

      // Assign __indexColor to objects (force-graph pattern lines 135-150)
      this.assignIndexColors(config, canvasState.colorTracker);

      // Initialize renderer
      this.renderer.initialize({
        nodes: config.nodes,
        links: config.links,
        interaction: config.interaction
      }, canvasState, this.hoverManager, this.selectionManager);

      // Initialize pointer tracking
      // this.pointerManager.initialize(config.container, canvasState);

      // Initialize physics simulation
      this.physicsManager.initialize({
        nodes: config.nodes,
        links: config.links,
        width: canvasState.width,
        height: canvasState.height,
        onTick: () => {
          // Throttle renders to max 60 FPS for better performance
          const now = Date.now();
          if (now - this.lastRenderTime >= 16) { // ~60 FPS
            this.lastRenderTime = now;
            this.renderer.renderWithTransform();
          }
        },
        onEnd: () => {
          // Auto fit view when simulation ends (similar to react-force-graph)
          // Only auto-fit on the initial simulation end, not after user interactions
          if (config.autoFitView !== false && this.physicsManager.shouldDoInitialAutoFitView()) {
            this.timerManager.setTimeout('initialFitView', async () => {
              await this.fitView();
              this.isInitialLoad = false; // Enable ResizeObserver fitView for future resizes
            }, 100); // Small delay to ensure final positions are stable
          }
        },
        cooldownTime: config.cooldownTime || 2000, // Default 2 seconds like react-force-graph
        autoFitView: config.autoFitView
      });

      // Adjust link distances to account for visual shortening
      this.physicsManager.adjustLinkDistancesForVisualShortening();

      // Initialize hover system
      this.hoverManager.initialize(canvasState);

      // Initialize selection system
      this.selectionManager.initialize(canvasState);

      // Initialize tooltip system (force-graph pattern)
      this.tooltipManager = new FloatTooltipManager(config.container);
      this.tooltipManager.initialize();

      // Initialize controls system (V1 pattern)
      if (config.controls && config.controls.enabled) {
        this.controlsManager = createV2GraphControls(
          config.container,
          {
            zoomIn: this.zoomIn.bind(this),
            zoomOut: this.zoomOut.bind(this),
            fitView: this.fitView.bind(this),
            resetView: this.resetView.bind(this)
          },
          config.controls
        );
        this.controlsManager.mount();
      }

      // Setup legend if enabled (matches V1 pattern)
      if (config.legend?.enabled) {
        this.legendsManager = createV2GraphLegends(
          config.container,
          config.legend,
          config.nodes
        );
        this.legendsManager.mount();
      }

      // Setup tooltip event handlers
      this.setupTooltipHandlers();

      // Connect hover events to trigger re-renders for visual effects
      this.setupHoverRerender();

      // Connect selection events to trigger re-renders for visual effects
      this.setupSelectionRerender();

      // Setup shadow canvas update handler
      this.setupShadowCanvasHandler();

      // Initialize interactions
      this.dragManager.initialize({
        canvas: canvasState.canvas,
        // pointerManager: this.pointerManager,
        physicsManager: this.physicsManager,
        hoverManager: this.hoverManager,
        onRender: () => this.renderer.renderWithTransform()
      });

      // Coordinate drag and hover states (force-graph pattern)
      this.coordinateDragHover();

      this.zoomManager.initialize({
        canvas: canvasState.canvas,
        canvasManager: this.canvasManager,
        onRender: () => this.renderer.renderWithTransform(),
        isOverEntity: () => {
          // Check if hover manager has an entity under pointer
          const hoverState = this.hoverManager.getHoverState();
          return hoverState.currentHovered !== null;
        }
      });

      // Set initial centered transform after a small delay to let physics settle
      this.timerManager.setTimeout('initialTransform', () => {
        this.zoomManager.setInitialTransform();
      }, 10); // Small delay to let physics start pulling nodes toward center

      // Setup resize observer for responsive canvas (force-graph pattern)
      this.setupResizeObserver(config);

    } catch (error) {
      ErrorHandler.logError(error as Error, {
        nodeCount: config.nodes.length,
        linkCount: config.links.length,
        containerTag: config.container?.tagName
      });
      throw error;
    }
  }

  /**
   * Assign __indexColor to objects (force-graph pattern)
   */
  private assignIndexColors(config: V2Config, colorTracker: ColorTracker): void {
    try {
      // Process nodes and links like force-graph (lines 135-150)
      [{ type: 'Node', objs: config.nodes }, { type: 'Link', objs: config.links }].forEach(hexIndex);

      function hexIndex({ type, objs }: { type: string; objs: (V2Node | V2Link)[] }) {
        objs
          .filter(d => {
            if (!Object.prototype.hasOwnProperty.call(d, '__indexColor')) return true;
            if (!d.__indexColor) return true;
            const cur = colorTracker.lookup(d.__indexColor);
            return (!cur || !Object.prototype.hasOwnProperty.call(cur, 'd') || cur.d !== d);
          })
          .forEach(d => {
            // store object lookup color (force-graph line 148)
            const hexColor = colorTracker.register({ type, d }) as string;
            d.__indexColor = hexColor;

            // Convert hex to exact RGB values for shadow canvas rendering
            const hex = hexColor.replace('#', '');
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);

            // Store RGB values for shadow rendering
            d.__indexColorRGB = [r, g, b];

          });
      }
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }

  /**
   * Setup shadow canvas update handler
   */
  private setupShadowCanvasHandler(): void {
    this.hoverManager.on('shadowCanvasUpdate', () => {
      // Render to shadow canvas when requested by hover manager
      this.renderer.renderShadowCanvas();
    });
  }

  /**
   * Setup tooltip event handlers (force-graph pattern)
   */
  private setupTooltipHandlers(): void {
    if (!this.tooltipManager) return;

    // Node hover events for tooltips
    this.hoverManager.on('nodeHover', (event: HoverEvent) => {
      if (event.current && event.type === 'nodeHover') {
        this.tooltipManager?.showNodeTooltip(event.current as V2Node);
      }
    });

    this.hoverManager.on('nodeUnhover', () => {
      this.tooltipManager?.hideTooltip();
    });

    // Link hover events for tooltips
    this.hoverManager.on('linkHover', (event: HoverEvent) => {
      if (event.current && event.type === 'linkHover') {
        this.tooltipManager?.showLinkTooltip(event.current as V2Link);
      }
    });

    this.hoverManager.on('linkUnhover', () => {
      this.tooltipManager?.hideTooltip();
    });

    // Hide tooltip on selection (force-graph pattern)
    this.selectionManager.on('nodeSelect', () => {
      this.tooltipManager?.hideTooltip();
    });

    this.selectionManager.on('linkSelect', () => {
      this.tooltipManager?.hideTooltip();
    });
  }

  /**
   * Setup hover event listeners to trigger re-renders for visual effects
   */
  private setupHoverRerender(): void {
    const debouncedRender = () => {
      this.timerManager.setTimeout('hoverRerender', () => {
        this.renderer.renderWithTransform();
      }, 16); // Throttle to ~60fps for better performance with large graphs
    };

    // Listen to hover events and trigger re-renders for visual feedback
    this.hoverManager.on('nodeHover', () => {
      debouncedRender();
    });

    this.hoverManager.on('nodeUnhover', () => {
      debouncedRender();
    });

    this.hoverManager.on('linkHover', () => {
      debouncedRender();
    });

    this.hoverManager.on('linkUnhover', () => {
      debouncedRender();
    });
  }

  /**
   * Setup selection event listeners to trigger re-renders for visual effects
   */
  private setupSelectionRerender(): void {
    const debouncedRender = () => {
      this.timerManager.setTimeout('selectionRerender', () => {
        this.renderer.renderWithTransform();
      }, 16); // Throttle to ~60fps for better performance with large graphs
    };

    // Listen to selection events and trigger re-renders for visual feedback
    this.selectionManager.on('nodeSelect', () => {
      debouncedRender();
    });

    this.selectionManager.on('nodeDeselect', () => {
      debouncedRender();
    });

    this.selectionManager.on('linkSelect', () => {
      debouncedRender();
    });

    this.selectionManager.on('linkDeselect', () => {
      debouncedRender();
    });
  }

  /**
   * Coordinate drag and hover interactions (force-graph pattern)
   */
  private coordinateDragHover(): void {
    // Coordinate drag, hover, and tooltip states
    const originalRender = this.renderer.renderWithTransform.bind(this.renderer);
    let wasDragging = false;

    this.renderer.renderWithTransform = () => {
      // Update drag state for hover manager (don't hover during drag)
      const dragState = this.dragManager.getState();
      const isDragging = dragState.isPointerDragging;

      this.hoverManager.setDragging(isDragging);

      // Hide tooltip when drag starts, restore on drag end
      if (isDragging && !wasDragging) {
        // Drag started - hide tooltip
        this.tooltipManager?.hideTooltip();
      } else if (!isDragging && wasDragging) {
        // Drag ended - tooltip will be restored by hover events if needed
      }

      wasDragging = isDragging;

      // Call original render method
      originalRender();
    };
  }

  /**
   * Setup resize observer for responsive canvas behavior
   * Following force-graph and V1 patterns with debounced fit view
   */
  private setupResizeObserver(config: V2Config): void {
    try {
      this.canvasManager.setupResize(config.container, (_width: number, _height: number) => {
        // Re-render with new dimensions
        this.renderer.renderWithTransform();

        // Simple fitView on resize - no physics manipulation
        // Skip fitView during initial load to prevent double centering
        if (config.autoFitView !== false && !this.isInitialLoad) {
          this.timerManager.setTimeout('resizeFitView', async () => {
            await this.fitView();
          }, 100); // Simple 100ms delay
        }
      });
    } catch (error) {
      ErrorHandler.logError(error as Error, {
        containerTag: config.container?.tagName
      });
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: V2Config): void {
    ErrorHandler.validateContainer(config.container);
    ErrorHandler.validateNodes(config.nodes);
    ErrorHandler.validateLinks(config.links);

    if (config.width !== undefined && (config.width <= 0 || !Number.isFinite(config.width))) {
      throw new ValidationError('Width must be a positive finite number', {
        width: config.width
      });
    }

    if (config.height !== undefined && (config.height <= 0 || !Number.isFinite(config.height))) {
      throw new ValidationError('Height must be a positive finite number', {
        height: config.height
      });
    }
  }

  /**
   * Render the graph
   */
  render(): void {
    try {
      if (!this.config) {
        throw new ValidationError('Graph not initialized');
      }

      // Initialize node positions
      this.renderer.initializeNodePositions();
      this.physicsManager.initializePositions();

      // Initial render
      this.renderer.render();

      // Initial hover update to establish baseline state
      this.hoverManager.updateHover();

    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw error;
    }
  }

  // /**
  //  * Test hit detection at coordinates
  //  */
  // testHitDetection(x: number, y: number): V2Node | null {
  //   try {
  //     const obj = this.pointerManager.testHitDetection(x, y);
  //     return (obj && obj.type === 'Node') ? obj.d as V2Node : null;
  //   } catch (error) {
  //     ErrorHandler.logError(error as Error, { x, y });
  //     return null;
  //   }
  // }

  /**
   * Get current zoom transform
   */
  testZoom(): { scale: number; x: number; y: number } {
    try {
      return this.zoomManager.getTransform();
    } catch (error) {
      ErrorHandler.logError(error as Error);
      return { scale: 1, x: 0, y: 0 };
    }
  }

  /**
   * Get zoom behavior (for V1 API compatibility)
   */
  getZoomBehavior(): ZoomBehavior<HTMLCanvasElement, unknown> | undefined {
    return this.zoomManager.getZoomBehavior();
  }

  /**
   * Get canvas element (for V1 API compatibility)
   */
  getCanvas(): HTMLCanvasElement {
    try {
      const canvasState = this.canvasManager.getState();
      return canvasState.canvas;
    } catch {
      throw new ValidationError('Canvas not available - graph not initialized');
    }
  }

  /**
   * Zoom in programmatically
   */
  zoomIn(factor?: number, center?: [number, number]): void {
    this.zoomManager.zoomIn(factor, center);
  }

  /**
   * Zoom out programmatically
   */
  zoomOut(factor?: number, center?: [number, number]): void {
    this.zoomManager.zoomOut(factor, center);
  }

  /**
   * Reset zoom to identity
   */
  resetView(): void {
    this.zoomManager.resetZoom();
  }


  /**
   * Fit view to content (force-graph zoomToFit implementation)
   */
  async fitView(): Promise<void> {
    if (!this.config) return;

    try {
      // Calculate content bounds using force-graph pattern
      const { nodes } = this.config;
      if (nodes.length === 0) return;

      // Initialize positions if not set
      this.renderer.initializeNodePositions();

      // Calculate bounding box including node radii (force-graph pattern)
      const nodeRadius = 4; // Default node radius
      const nodesPos = nodes.map(node => ({
        x: node.x || 0,
        y: node.y || 0,
        r: nodeRadius
      }));

      if (!nodesPos.length) {
        this.resetView();
        return;
      }

      // Check if nodes have positions
      const hasPositions = nodesPos.some(node => node.x !== 0 || node.y !== 0);
      if (!hasPositions) {
        this.resetView();
        return;
      }

      const bounds = {
        x: [
          Math.min(...nodesPos.map(node => node.x - node.r)),
          Math.max(...nodesPos.map(node => node.x + node.r))
        ] as [number, number],
        y: [
          Math.min(...nodesPos.map(node => node.y - node.r)),
          Math.max(...nodesPos.map(node => node.y + node.r))
        ] as [number, number]
      };
      await this.zoomManager.fitView(bounds);
    } catch (error) {
      ErrorHandler.logError(error as Error);
      // Fallback to reset view
      this.resetView();
    }
  }

  /**
   * Debug hover state (for development)
   */
  debugHover(): void {
    this.hoverManager.debugHoverState();
  }

  /**
   * Debug shadow canvas (for development)
   */
  debugShadowCanvas(): void {
    this.renderer.debugShadowCanvas();
  }

  /**
   * Clear current selection
   */
  clearSelection(): void {
    this.selectionManager.clearSelection();
  }

  /**
   * Get performance metrics from renderer
   */
  getPerformanceMetrics(): StatsMetrics {
    return this.renderer.getPerformanceMetrics();
  }

  /**
   * Force log performance metrics immediately
   */
  logPerformanceMetrics(): void {
    this.renderer.forceLogMetrics();
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.renderer.resetPerformanceMetrics();
  }

  /**
   * V1-style event handlers - type-safe and reliable
   */
  on(event: 'nodeSelect', handler: (node: V2Node, element: HTMLCanvasElement) => void): () => void;
  on(event: 'nodeDeselect', handler: (node: V2Node, element: HTMLCanvasElement) => void): () => void;
  on(event: 'linkSelect', handler: (link: V2Link, element: HTMLCanvasElement) => void): () => void;
  on(event: 'linkDeselect', handler: (link: V2Link, element: HTMLCanvasElement) => void): () => void;
  on(event: 'nodeHover', handler: (node: V2Node, element: HTMLCanvasElement) => void): () => void;
  on(event: 'nodeUnhover', handler: (node: V2Node, element: HTMLCanvasElement) => void): () => void;
  on(event: 'linkHover', handler: (link: V2Link, element: HTMLCanvasElement) => void): () => void;
  on(event: 'linkUnhover', handler: (link: V2Link, element: HTMLCanvasElement) => void): () => void;
  on(
    event: 'nodeSelect' | 'nodeDeselect' | 'linkSelect' | 'linkDeselect' | 'nodeHover' | 'nodeUnhover' | 'linkHover' | 'linkUnhover',
    handler: ((node: V2Node, element: HTMLCanvasElement) => void) | ((link: V2Link, element: HTMLCanvasElement) => void)
  ): () => void {
    const canvas = this.getCanvas();

    switch (event) {
      case 'nodeSelect':
      case 'nodeDeselect': {
        const nodeSelectionHandler = (selectionEvent: { current: V2Node | V2Link | null }) => {
          if (selectionEvent.current) {
            (handler as (node: V2Node, element: HTMLCanvasElement) => void)(selectionEvent.current as V2Node, canvas);
          }
        };
        this.selectionManager.on(event, nodeSelectionHandler);
        return () => this.selectionManager.off(event, nodeSelectionHandler);
      }

      case 'linkSelect':
      case 'linkDeselect': {
        const linkSelectionHandler = (selectionEvent: { current: V2Node | V2Link | null }) => {
          if (selectionEvent.current) {
            (handler as (link: V2Link, element: HTMLCanvasElement) => void)(selectionEvent.current as V2Link, canvas);
          }
        };
        this.selectionManager.on(event, linkSelectionHandler);
        return () => this.selectionManager.off(event, linkSelectionHandler);
      }

      case 'nodeHover':
      case 'nodeUnhover': {
        const nodeHoverHandler = (hoverEvent: { current: V2Node | V2Link | null }) => {
          if (hoverEvent.current) {
            (handler as (node: V2Node, element: HTMLCanvasElement) => void)(hoverEvent.current as V2Node, canvas);
          }
        };
        this.hoverManager.on(event, nodeHoverHandler);
        return () => this.hoverManager.off(event, nodeHoverHandler);
      }

      case 'linkHover':
      case 'linkUnhover': {
        const linkHoverHandler = (hoverEvent: { current: V2Node | V2Link | null }) => {
          if (hoverEvent.current) {
            (handler as (link: V2Link, element: HTMLCanvasElement) => void)(hoverEvent.current as V2Link, canvas);
          }
        };
        this.hoverManager.on(event, linkHoverHandler);
        return () => this.hoverManager.off(event, linkHoverHandler);
      }

      default:
        console.warn('[Polly Graph V2] Unknown event:', event);
        return () => {};
    }
  }

  /**
   * V1-style event handler removal - type-safe
   */
  off(event: 'nodeSelect', handler: (node: V2Node, element: HTMLCanvasElement) => void): void;
  off(event: 'nodeDeselect', handler: (node: V2Node, element: HTMLCanvasElement) => void): void;
  off(event: 'linkSelect', handler: (link: V2Link, element: HTMLCanvasElement) => void): void;
  off(event: 'linkDeselect', handler: (link: V2Link, element: HTMLCanvasElement) => void): void;
  off(event: 'nodeHover', handler: (node: V2Node, element: HTMLCanvasElement) => void): void;
  off(event: 'nodeUnhover', handler: (node: V2Node, element: HTMLCanvasElement) => void): void;
  off(event: 'linkHover', handler: (link: V2Link, element: HTMLCanvasElement) => void): void;
  off(event: 'linkUnhover', handler: (link: V2Link, element: HTMLCanvasElement) => void): void;
  off(event: string, _handler?: unknown): void {
    // V1 pattern: Remove all listeners for the event type
    if (event.includes('select') || event.includes('Select')) {
      // Note: In V2 we don't have removeAllListeners, so this is a simplified approach
      // In a full implementation, we'd need to track handlers to remove them individually
      console.warn('[Polly Graph V2] off() method removes all listeners for event:', event);
    } else if (event.includes('hover') || event.includes('Hover')) {
      console.warn('[Polly Graph V2] off() method removes all listeners for event:', event);
    }
  }

  /**
   * Export graph as PNG image
   */
  async exportGraph(fileName?: string): Promise<void> {
    try {
      if (!this.config) {
        throw new ValidationError('Graph not initialized');
      }

      // Default naming pattern like V1
      const defaultFileName = `graph-export-${Date.now()}.png`;
      const finalFileName = fileName || defaultFileName;

      const canvas = this.getCanvas();
      const container = this.config.container;

      // Hide UI elements during export (like V1)
      const elementsToHide: { element: HTMLElement; originalDisplay: string }[] = [];

      // Hide graph controls
      const controls = container.querySelectorAll('.pg-controls');
      controls.forEach(control => {
        const element = control as HTMLElement;
        elementsToHide.push({ element, originalDisplay: element.style.display });
        element.style.display = 'none';
      });

      // Hide tooltips
      const tooltips = document.querySelectorAll('[data-float-tooltip]');
      tooltips.forEach(tooltip => {
        const element = tooltip as HTMLElement;
        elementsToHide.push({ element, originalDisplay: element.style.display });
        element.style.display = 'none';
      });

      // Fit view and wait for animation to complete before export
      await this.fitView();

      // Perform export capture immediately after fitView completes
      this.performExportCapture(container, canvas, finalFileName, elementsToHide);

    } catch (error) {
      ErrorHandler.logError(error as Error, { fileName });
      throw error;
    }
  }

  /**
   * Perform the actual export capture after fit view
   */
  private performExportCapture(
    container: HTMLElement,
    canvas: HTMLCanvasElement,
    fileName: string,
    elementsToHide: { element: HTMLElement; originalDisplay: string }[]
  ): void {
    try {
      const canvasRect = canvas.getBoundingClientRect();
      const graphWidth = canvasRect.width || 800;
      const graphHeight = canvasRect.height || 600;

      let totalWidth = graphWidth;
      let totalHeight = graphHeight;

      // Check if legend is visible and should be included
      const legendElement = container.querySelector('.pg-legend') as HTMLElement;
      const shouldIncludeLegend = legendElement &&
        legendElement.style.display !== 'none' &&
        !legendElement.classList.contains('pg-is-collapsed');

      let legendRect: DOMRect | null = null;
      if (shouldIncludeLegend) {
        legendRect = legendElement.getBoundingClientRect();
        // Extend canvas to include legend (positioned to the right)
        totalWidth = graphWidth + 20 + legendRect.width + 20; // 20px margins
        totalHeight = Math.max(graphHeight, legendRect.height + 40);
      }

      // Create export canvas
      const exportCanvas = document.createElement('canvas');
      const exportCtx = exportCanvas.getContext('2d');

      if (!exportCtx) {
        throw new Error('Could not get canvas context for export');
      }

      // Set export canvas size with 2x scale for quality (like V1)
      const scale = 2;
      exportCanvas.width = totalWidth * scale;
      exportCanvas.height = totalHeight * scale;
      exportCtx.scale(scale, scale);

      // Set white background (like V1)
      exportCtx.fillStyle = '#ffffff';
      exportCtx.fillRect(0, 0, totalWidth, totalHeight);

      // Draw the main graph canvas
      exportCtx.drawImage(canvas, 0, 0, graphWidth, graphHeight);

      // Draw legend if it was visible
      if (shouldIncludeLegend && legendElement) {
        this.drawLegendOnExportCanvas(exportCtx, legendElement, graphWidth + 20, 20);
      }

      // Convert to blob and download
      exportCanvas.toBlob((blob) => {
        // Restore hidden elements
        elementsToHide.forEach(({ element, originalDisplay }) => {
          element.style.display = originalDisplay;
        });

        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = fileName;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');

    } catch (error) {
      // Ensure elements are restored even on error
      elementsToHide.forEach(({ element, originalDisplay }) => {
        element.style.display = originalDisplay;
      });
      throw error;
    }
  }

  /**
   * Draw legend on export canvas
   */
  private drawLegendOnExportCanvas(
    ctx: CanvasRenderingContext2D,
    legendElement: HTMLElement,
    x: number,
    y: number
  ): void {
    const legendItems = legendElement.querySelectorAll('.pg-legend-item');
    const padding = 16;
    const itemHeight = 24;
    const itemSpacing = 8;

    // Calculate legend dimensions
    const legendWidth = Math.min(legendElement.offsetWidth, 280);
    const legendHeight = padding + (legendItems.length * itemHeight) + ((legendItems.length - 1) * itemSpacing) + padding;

    // Draw legend background
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, legendWidth, legendHeight);
    ctx.strokeRect(x, y, legendWidth, legendHeight);

    // Draw legend items
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    legendItems.forEach((item, index) => {
      const swatch = item.querySelector('.pg-legend-swatch') as HTMLElement;
      const label = item.querySelector('.pg-legend-label') as HTMLElement;

      if (swatch && label) {
        const itemY = y + padding + (index * (itemHeight + itemSpacing)) + (itemHeight / 2);
        const swatchX = x + padding;
        const textX = swatchX + 14 + 8; // swatch width + gap

        // Draw color swatch (circle)
        const swatchColor = swatch.style.backgroundColor || '#94a3b8';
        ctx.fillStyle = swatchColor;
        ctx.beginPath();
        ctx.arc(swatchX + 7, itemY, 7, 0, 2 * Math.PI);
        ctx.fill();

        // Draw text label
        ctx.fillStyle = '#475569';
        const labelText = label.textContent || '';
        ctx.fillText(labelText, textX, itemY);
      }
    });
  }

  /**
   * Destroy the graph and clean up resources
   */
  destroy(): void {
    try {
      // Destroy in reverse order of initialization
      this.zoomManager.destroy();
      this.dragManager.destroy();
      this.selectionManager.destroy();
      this.hoverManager.destroy();
      this.tooltipManager?.destroy();
      this.controlsManager?.destroy();
      this.legendsManager?.destroy();
      // this.pointerManager.destroy();
      this.physicsManager.destroy();
      this.renderer.destroy();
      this.canvasManager.destroy();

      // Clean up all timers (including export timer)
      this.timerManager.destroy();

      this.config = undefined;
      this.tooltipManager = undefined;
      this.controlsManager = undefined;
      this.legendsManager = undefined;
    } catch (error) {
      ErrorHandler.logError(error as Error);
    }
  }
}

/**
 * Factory function for creating V2 graphs
 */
export function createV2Graph(config: V2Config): V2Instance {
  const graph = new V2Graph();
  graph.initialize(config);
  return graph;
}