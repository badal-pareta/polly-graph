// Import CSS for automatic loading (matches v0.1.16 pattern)
import './v2/styles/main.css';

// Export everything from V1 (SVG-based implementation)
// export * from './v1';

// Export V3 with explicit namespace (Force-Graph wrapper)
// export * as V3 from './v3';

export * from './v2';
export * from './shared';

// Export V3 main functions for direct usage
// export { createGraph as createV3Graph } from './v3';