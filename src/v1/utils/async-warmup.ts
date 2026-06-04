import { Simulation } from 'd3-force';
import { GraphNode, GraphLink } from '../contracts/graph.types';

interface AsyncWarmupConfig {
  readonly ticks: number;
  readonly batchSize?: number;
  readonly frameDelay?: number;
  readonly onProgress?: (completed: number, total: number) => void;
  readonly onComplete?: () => void;
}

export function asyncWarmupSimulation(
  simulation: Simulation<GraphNode, GraphLink>,
  config: AsyncWarmupConfig
): Promise<void> {
  return new Promise((resolve) => {
    const batchSize = config.batchSize ?? 5;
    const frameDelay = config.frameDelay ?? 0;
    let completed = 0;
    const total = config.ticks;

    function processBatch(): void {
      const batchEnd = Math.min(completed + batchSize, total);

      for (let i = completed; i < batchEnd; i++) {
        simulation.tick();
        completed++;
      }

      config.onProgress?.(completed, total);

      if (completed >= total) {
        config.onComplete?.();
        resolve();
        return;
      }

      if (frameDelay > 0) {
        setTimeout(() => requestAnimationFrame(processBatch), frameDelay);
      } else {
        requestAnimationFrame(processBatch);
      }
    }

    requestAnimationFrame(processBatch);
  });
}

export function getOptimalWarmupTicks(nodeCount: number): number {
  if (nodeCount < 50) return 50;
  if (nodeCount < 200) return 75;
  if (nodeCount < 500) return 100;
  if (nodeCount < 1000) return 80;
  return 60;
}

export function getOptimalBatchSize(nodeCount: number): number {
  if (nodeCount < 100) return 10;
  if (nodeCount < 500) return 5;
  if (nodeCount < 1000) return 3;
  return 2;
}