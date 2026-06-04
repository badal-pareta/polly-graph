export interface PerformanceConfig {
  readonly nodeRadiusCache?: boolean;
  readonly linkMemoization?: boolean;
  readonly asyncWarmup?: boolean;
  readonly largeDatasetsOptimization?: boolean;
}

export interface WarmupConfig {
  readonly enabled?: boolean;
  readonly async?: boolean;
  readonly ticks?: number;
  readonly batchSize?: number;
  readonly frameDelay?: number;
  readonly onProgress?: (completed: number, total: number) => void;
  readonly onComplete?: () => void;
}