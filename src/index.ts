import './styles/main.css';

export { createGraph } from './create-graph';
export type { GraphConfig, GraphInteractionConfig } from './contracts/graph-config.interface';
export type { GraphControlsConfig } from './contracts/graph-controls.interface';
export type { GraphInstance } from './contracts/graph-instance.interface';
export type { GraphNode, GraphLink } from './contracts/graph.types';

// Validation and error handling utilities for framework integrations
export { GraphValidator, GraphValidationError } from './utils/validation';
export { ErrorHandler, GraphError } from './utils/error-handler';
export type { ValidationResult, ValidationError } from './utils/validation';
export type { ErrorContext } from './utils/error-handler';

// Event system utilities for framework integrations
export { TypedGraphEventEmitter } from './utils/event-emitter';
export type { GraphEventMap, GraphEventName, EventUnsubscribe } from './utils/event-emitter';

// Selection management utilities
export { SelectionManager } from './utils/selection-manager';
export type { SelectionState } from './utils/selection-manager';