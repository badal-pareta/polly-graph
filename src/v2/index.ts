/**
 * V2 Canvas Graph - Modular Implementation Entry Point
 *
 * This is the production-ready modular version of the V2 Canvas Graph.
 * Features comprehensive error handling, clean architecture, and full V1 API compatibility.
 */

// Export types
export * from './types';

// Export utilities
export * from './utils';

// Export core modules
export * from './core';

// Export interaction modules
export * from './interactions';

// Export rendering modules
export * from './rendering';

// Export main graph implementation
export { V2Graph, createV2Graph } from './v2-graph';

// Export V1-compatible API
export { createGraph } from './v1-wrapper';