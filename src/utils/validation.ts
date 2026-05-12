/**
 * Comprehensive validation system for framework-independent graph configuration.
 * Provides runtime validation to catch integration errors early.
 */

import { GraphConfig, GraphInteractionConfig } from '../contracts/graph-config.interface';
import { GraphNode, GraphLink } from '../contracts/graph.types';

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly value: unknown;
  readonly code: string;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ValidationError[];
  readonly warnings: string[];
}

export class GraphValidator {

  /**
   * Validate complete graph configuration
   */
  static validateConfig(config: GraphConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Validate container
    const containerValidation = this.validateContainer(config.container);
    errors.push(...containerValidation.errors);
    warnings.push(...containerValidation.warnings);

    // Validate nodes
    const nodeValidation = this.validateNodes(config.nodes);
    errors.push(...nodeValidation.errors);
    warnings.push(...nodeValidation.warnings);

    // Validate links
    const linkValidation = this.validateLinks(config.links, config.nodes);
    errors.push(...linkValidation.errors);
    warnings.push(...linkValidation.warnings);

    // Validate interactions
    if (config.interaction) {
      const interactionValidation = this.validateInteraction(config.interaction);
      errors.push(...interactionValidation.errors);
      warnings.push(...interactionValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate container element
   */
  private static validateContainer(container: HTMLElement): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check if container exists
    if (!container) {
      errors.push({
        field: 'container',
        message: 'Container element is required',
        value: container,
        code: 'CONTAINER_REQUIRED'
      });
      return { isValid: false, errors, warnings };
    }

    // Check if it's an HTMLElement
    if (!(container instanceof HTMLElement)) {
      errors.push({
        field: 'container',
        message: 'Container must be a valid HTMLElement',
        value: container,
        code: 'CONTAINER_INVALID_TYPE'
      });
    }

    // Check if container is in the DOM
    if (!document.contains(container)) {
      warnings.push('Container element is not attached to the DOM');
    }

    // Check container dimensions
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      warnings.push('Container has zero width or height, graph may not render properly');
    }

    // Check CSS position for overlay elements
    const styles = window.getComputedStyle(container);
    if (styles.position === 'static') {
      warnings.push('Container should have position: relative for proper overlay positioning');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate graph nodes
   */
  private static validateNodes(nodes: GraphNode[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(nodes)) {
      errors.push({
        field: 'nodes',
        message: 'Nodes must be an array',
        value: nodes,
        code: 'NODES_INVALID_TYPE'
      });
      return { isValid: false, errors, warnings };
    }

    if (nodes.length === 0) {
      warnings.push('No nodes provided, graph will be empty');
      return { isValid: true, errors, warnings };
    }

    const nodeIds = new Set<string>();
    const duplicateIds = new Set<string>();

    nodes.forEach((node, index) => {
      const nodePrefix = `nodes[${index}]`;

      // Check node structure
      if (!node || typeof node !== 'object') {
        errors.push({
          field: `${nodePrefix}`,
          message: 'Node must be an object',
          value: node,
          code: 'NODE_INVALID_TYPE'
        });
        return;
      }

      // Validate ID
      if (!node.id || typeof node.id !== 'string') {
        errors.push({
          field: `${nodePrefix}.id`,
          message: 'Node ID is required and must be a string',
          value: node.id,
          code: 'NODE_ID_REQUIRED'
        });
      } else {
        if (nodeIds.has(node.id)) {
          duplicateIds.add(node.id);
          errors.push({
            field: `${nodePrefix}.id`,
            message: `Duplicate node ID: ${node.id}`,
            value: node.id,
            code: 'NODE_ID_DUPLICATE'
          });
        }
        nodeIds.add(node.id);
      }

      // Validate type
      if (!node.type || typeof node.type !== 'string') {
        errors.push({
          field: `${nodePrefix}.type`,
          message: 'Node type is required and must be a string',
          value: node.type,
          code: 'NODE_TYPE_REQUIRED'
        });
      }

      // Validate style if provided
      if (node.style) {
        const styleValidation = this.validateNodeStyle(node.style, `${nodePrefix}.style`);
        errors.push(...styleValidation.errors);
        warnings.push(...styleValidation.warnings);
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate graph links
   */
  private static validateLinks(links: GraphLink[], nodes: GraphNode[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(links)) {
      errors.push({
        field: 'links',
        message: 'Links must be an array',
        value: links,
        code: 'LINKS_INVALID_TYPE'
      });
      return { isValid: false, errors, warnings };
    }

    const nodeIds = new Set(nodes.map(n => n.id).filter(Boolean));

    links.forEach((link, index) => {
      const linkPrefix = `links[${index}]`;

      if (!link || typeof link !== 'object') {
        errors.push({
          field: `${linkPrefix}`,
          message: 'Link must be an object',
          value: link,
          code: 'LINK_INVALID_TYPE'
        });
        return;
      }

      // Validate source
      const sourceId = typeof link.source === 'string' ? link.source : link.source?.id;
      if (!sourceId) {
        errors.push({
          field: `${linkPrefix}.source`,
          message: 'Link source is required',
          value: link.source,
          code: 'LINK_SOURCE_REQUIRED'
        });
      } else if (!nodeIds.has(sourceId)) {
        errors.push({
          field: `${linkPrefix}.source`,
          message: `Link source node not found: ${sourceId}`,
          value: sourceId,
          code: 'LINK_SOURCE_NOT_FOUND'
        });
      }

      // Validate target
      const targetId = typeof link.target === 'string' ? link.target : link.target?.id;
      if (!targetId) {
        errors.push({
          field: `${linkPrefix}.target`,
          message: 'Link target is required',
          value: link.target,
          code: 'LINK_TARGET_REQUIRED'
        });
      } else if (!nodeIds.has(targetId)) {
        errors.push({
          field: `${linkPrefix}.target`,
          message: `Link target node not found: ${targetId}`,
          value: targetId,
          code: 'LINK_TARGET_NOT_FOUND'
        });
      }

      // Check for self-loops
      if (sourceId === targetId) {
        warnings.push(`Self-loop detected in link ${index}: ${sourceId} -> ${targetId}`);
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate interaction configuration
   */
  private static validateInteraction(interaction: GraphInteractionConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Validate tooltip configuration
    if (interaction.hover?.tooltip?.enabled) {
      if (interaction.hover.tooltip.renderContent && typeof interaction.hover.tooltip.renderContent !== 'function') {
        errors.push({
          field: 'interaction.hover.tooltip.renderContent',
          message: 'renderContent must be a function',
          value: interaction.hover.tooltip.renderContent,
          code: 'TOOLTIP_RENDER_FUNCTION_INVALID'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate node style
   */
  private static validateNodeStyle(style: any, fieldPrefix: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (typeof style !== 'object' || style === null) {
      errors.push({
        field: fieldPrefix,
        message: 'Style must be an object',
        value: style,
        code: 'STYLE_INVALID_TYPE'
      });
      return { isValid: false, errors, warnings };
    }

    // Validate radius
    if (style.radius !== undefined) {
      if (typeof style.radius !== 'number' || style.radius < 0) {
        errors.push({
          field: `${fieldPrefix}.radius`,
          message: 'Radius must be a non-negative number',
          value: style.radius,
          code: 'RADIUS_INVALID'
        });
      }
    }

    // Validate colors
    const colorFields = ['fill', 'stroke', 'textColor'];
    colorFields.forEach(field => {
      if (style[field] !== undefined) {
        if (typeof style[field] !== 'string') {
          errors.push({
            field: `${fieldPrefix}.${field}`,
            message: `${field} must be a string`,
            value: style[field],
            code: 'COLOR_INVALID_TYPE'
          });
        }
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate runtime environment
   */
  static validateEnvironment(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check if running in browser
    if (typeof window === 'undefined') {
      errors.push({
        field: 'environment',
        message: 'Graph library requires a browser environment',
        value: 'server',
        code: 'ENVIRONMENT_NOT_BROWSER'
      });
    }

    // Check for required APIs
    if (typeof document === 'undefined') {
      errors.push({
        field: 'environment.document',
        message: 'Document API not available',
        value: undefined,
        code: 'DOCUMENT_API_MISSING'
      });
    }

    if (typeof ResizeObserver === 'undefined') {
      warnings.push('ResizeObserver not available, responsive features may not work');
    }

    if (typeof requestAnimationFrame === 'undefined') {
      warnings.push('requestAnimationFrame not available, performance optimizations disabled');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}

/**
 * Validation error for framework integrations
 */
export class GraphValidationError extends Error {
  readonly errors: ValidationError[];
  readonly warnings: string[];

  constructor(result: ValidationResult) {
    const errorMessages = result.errors.map(e => `${e.field}: ${e.message}`).join(', ');
    super(`Graph validation failed: ${errorMessages}`);

    this.name = 'GraphValidationError';
    this.errors = result.errors;
    this.warnings = result.warnings;
  }
}