import { GraphNode, NodeStyle } from '../contracts/graph.types';

/**
 * Robust Node Style Manager
 *
 * Handles setting and resetting node styles consistently across hover, selection, and default states.
 * Solves the issue of nodes retaining hover strokes by maintaining proper state management.
 *
 * Key Features:
 * - Captures original styles on initialization
 * - Manages temporary vs permanent style changes
 * - Provides clean reset functionality
 * - Tracks node states (hover, selected, etc.)
 */

export interface NodeStyleState {
  /** Original styles from node data or computed styles */
  original: Partial<NodeStyle>;
  /** Current base styles (not including temporary styles like hover) */
  current: Partial<NodeStyle>;
  /** Backup of original DOM attributes before any modifications */
  domBackup: {
    stroke?: string | null;
    strokeWidth?: string | null;
    opacity?: string | null;
    fill?: string | null;
  };
}

export class NodeStyleManager {
  private styleStates = new Map<SVGCircleElement, NodeStyleState>();

  /**
   * Initialize a node's style state by capturing its original styles
   */
  initializeNode(element: SVGCircleElement, node: GraphNode): void {
    if (this.styleStates.has(element)) {
      return; // Already initialized
    }

    // Capture original DOM attributes
    const domBackup = {
      stroke: element.getAttribute('stroke'),
      strokeWidth: element.getAttribute('stroke-width'),
      opacity: element.getAttribute('opacity'),
      fill: element.getAttribute('fill')
    };

    // Determine original styles from node data or computed styles
    const originalStyle: Partial<NodeStyle> = {
      stroke: node.style?.stroke || undefined,
      strokeWidth: node.style?.strokeWidth || undefined,
      opacity: node.style?.opacity || undefined,
      fill: node.style?.fill || undefined
    };

    this.styleStates.set(element, {
      original: originalStyle,
      current: { ...originalStyle },
      domBackup
    });
  }

  /**
   * Apply temporary styles (e.g., hover effects) that will be reset later
   */
  applyTemporaryStyles(element: SVGCircleElement, styles: Partial<NodeStyle>): void {
    this.applyStylesToDOM(element, styles);
  }

  /**
   * Apply permanent styles that become the new base styles
   */
  applyPermanentStyles(element: SVGCircleElement, styles: Partial<NodeStyle>): void {
    const state = this.styleStates.get(element);
    if (!state) {
      console.warn('[NodeStyleManager] Node not initialized, cannot apply permanent styles');
      return;
    }

    this.applyStylesToDOM(element, styles);

    // Update current base styles
    Object.assign(state.current, styles);
  }

  /**
   * Reset node to its current base styles (removes temporary styles)
   */
  resetToBase(element: SVGCircleElement): void {
    const state = this.styleStates.get(element);
    if (!state) {
      // Fallback: clear all inline styles and attributes
      this.clearAllStyles(element);
      return;
    }

    // Clear all styles first
    this.clearAllStyles(element);

    // Reapply base styles
    this.applyStylesToDOM(element, state.current);
  }

  /**
   * Reset node to its original styles (as captured during initialization)
   */
  resetToOriginal(element: SVGCircleElement): void {
    const state = this.styleStates.get(element);
    if (!state) {
      this.clearAllStyles(element);
      return;
    }

    // Clear everything first
    this.clearAllStyles(element);

    // Restore original DOM attributes
    this.restoreOriginalDOM(element, state.domBackup);

    // Update current state to match original
    state.current = { ...state.original };
  }

  /**
   * Check if node is in a specific state (selected, hovered, etc.)
   */
  hasState(element: SVGCircleElement, stateName: string): boolean {
    return element.dataset[stateName] === 'true';
  }

  /**
   * Set state marker on node
   */
  setState(element: SVGCircleElement, stateName: string, value: boolean): void {
    if (value) {
      element.dataset[stateName] = 'true';
    } else {
      delete element.dataset[stateName];
    }
  }

  /**
   * Get the original styles for a node
   */
  getOriginalStyles(element: SVGCircleElement): Partial<NodeStyle> | null {
    const state = this.styleStates.get(element);
    return state ? { ...state.original } : null;
  }

  /**
   * Get the current base styles for a node
   */
  getCurrentStyles(element: SVGCircleElement): Partial<NodeStyle> | null {
    const state = this.styleStates.get(element);
    return state ? { ...state.current } : null;
  }

  /**
   * Remove a node from management (cleanup)
   */
  removeNode(element: SVGCircleElement): void {
    this.styleStates.delete(element);
  }

  /**
   * Clear all managed nodes (for cleanup)
   */
  clear(): void {
    this.styleStates.clear();
  }

  /**
   * Private: Apply styles to DOM element
   */
  private applyStylesToDOM(element: SVGCircleElement, styles: Partial<NodeStyle>): void {
    if (styles.stroke !== undefined) {
      if (styles.stroke === null || styles.stroke === '') {
        element.removeAttribute('stroke');
        element.style.stroke = '';
      } else {
        element.style.stroke = styles.stroke;
      }
    }

    if (styles.strokeWidth !== undefined) {
      if (styles.strokeWidth === null || styles.strokeWidth === 0) {
        element.removeAttribute('stroke-width');
        element.style.strokeWidth = '';
      } else {
        element.style.strokeWidth = String(styles.strokeWidth);
      }
    }

    if (styles.opacity !== undefined) {
      if (styles.opacity === null || styles.opacity === 1) {
        element.removeAttribute('opacity');
        element.style.opacity = '';
      } else {
        element.style.opacity = String(styles.opacity);
      }
    }

    if (styles.fill !== undefined) {
      if (styles.fill === null || styles.fill === '') {
        element.removeAttribute('fill');
        element.style.fill = '';
      } else {
        element.style.fill = styles.fill;
      }
    }

    if (styles.radius !== undefined) {
      if (styles.radius === null || styles.radius === 0) {
        element.removeAttribute('r');
        element.style.removeProperty('r');
      } else {
        element.setAttribute('r', String(styles.radius));
      }
    }
  }

  /**
   * Private: Clear all inline styles and remove hover-related attributes
   */
  private clearAllStyles(element: SVGCircleElement): void {
    // Clear all inline styles
    element.style.stroke = '';
    element.style.strokeWidth = '';
    element.style.opacity = '';
    element.style.fill = '';
    element.style.removeProperty('r');

    // Remove attributes that might be hover-applied
    // We'll be conservative and only remove attributes that look like they were set by interactions
    this.removeIfHoverAttribute(element, 'stroke');
    this.removeIfHoverAttribute(element, 'stroke-width');
    this.removeIfHoverAttribute(element, 'opacity');
  }

  /**
   * Private: Restore original DOM attributes
   */
  private restoreOriginalDOM(element: SVGCircleElement, domBackup: NodeStyleState['domBackup']): void {
    // Restore stroke
    if (domBackup.stroke !== undefined) {
      if (domBackup.stroke === null) {
        element.removeAttribute('stroke');
      } else {
        element.setAttribute('stroke', domBackup.stroke);
      }
    }

    // Restore stroke-width
    if (domBackup.strokeWidth !== undefined) {
      if (domBackup.strokeWidth === null) {
        element.removeAttribute('stroke-width');
      } else {
        element.setAttribute('stroke-width', domBackup.strokeWidth);
      }
    }

    // Restore opacity
    if (domBackup.opacity !== undefined) {
      if (domBackup.opacity === null) {
        element.removeAttribute('opacity');
      } else {
        element.setAttribute('opacity', domBackup.opacity);
      }
    }

    // Restore fill
    if (domBackup.fill !== undefined) {
      if (domBackup.fill === null) {
        element.removeAttribute('fill');
      } else {
        element.setAttribute('fill', domBackup.fill);
      }
    }
  }

  /**
   * Private: Remove attribute only if it looks like it was set by hover/interaction
   */
  private removeIfHoverAttribute(element: SVGCircleElement, attr: string): void {
    const value = element.getAttribute(attr);
    if (!value) return;

    // Common interaction colors/values that should be removed
    const hoverPatterns: { [key: string]: string[] } = {
      'stroke': ['#6366f1', '#8b5cf6', '#3b82f6', '#ffffff', '#fff', 'white'], // Common hover stroke colors
      'stroke-width': ['2', '2.5', '3', '4'], // Common hover stroke widths
      'opacity': ['0.8', '0.9', '0.7'], // Common hover opacity values
    };

    const patterns = hoverPatterns[attr];
    if (patterns && patterns.includes(value)) {
      element.removeAttribute(attr);
    }
  }
}

/**
 * Global instance for the application
 * Use this singleton to manage node styles consistently across the app
 */
export const nodeStyleManager = new NodeStyleManager();

/**
 * Helper function to safely apply hover styles
 */
export function applyHoverStyles(
  element: SVGCircleElement,
  node: GraphNode,
  hoverStyle: Partial<NodeStyle>
): void {
  // Don't apply hover if node is selected
  if (nodeStyleManager.hasState(element, 'selected')) {
    return;
  }

  // Initialize if needed
  nodeStyleManager.initializeNode(element, node);

  // Apply temporary hover styles
  nodeStyleManager.applyTemporaryStyles(element, hoverStyle);
  nodeStyleManager.setState(element, 'hovered', true);
}

/**
 * Helper function to safely remove hover styles
 */
export function removeHoverStyles(element: SVGCircleElement, node: GraphNode): void {
  // Don't reset if node is selected (selection styles take precedence)
  if (nodeStyleManager.hasState(element, 'selected')) {
    return;
  }

  // Initialize if needed
  nodeStyleManager.initializeNode(element, node);

  // Reset to base styles
  nodeStyleManager.resetToBase(element);
  nodeStyleManager.setState(element, 'hovered', false);
}

/**
 * Helper function to safely apply selection styles
 */
export function applySelectionStyles(
  element: SVGCircleElement,
  node: GraphNode,
  selectionStyle: Partial<NodeStyle>
): void {
  // Initialize if needed
  nodeStyleManager.initializeNode(element, node);

  // Apply permanent selection styles
  nodeStyleManager.applyPermanentStyles(element, selectionStyle);
  nodeStyleManager.setState(element, 'selected', true);
}

/**
 * Helper function to safely remove selection styles
 */
export function removeSelectionStyles(element: SVGCircleElement, node: GraphNode): void {
  // Initialize if needed
  nodeStyleManager.initializeNode(element, node);

  // Reset to original styles
  nodeStyleManager.resetToOriginal(element);
  nodeStyleManager.setState(element, 'selected', false);
}