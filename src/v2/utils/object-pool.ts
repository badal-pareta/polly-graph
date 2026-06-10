/**
 * V2 Canvas Graph - Object Pool Manager
 *
 * Minimizes garbage collection by reusing objects during drag operations.
 * Pre-allocates common objects and provides efficient recycling.
 */

export interface PoolableObject {
  reset?(): void;
}

export interface Vector2D {
  x: number;
  y: number;
  reset?(): void;
}

export interface NodeState {
  id: string;
  x: number;
  y: number;
  isHovered: boolean;
  isSelected: boolean;
  reset?(): void;
}

export interface LinkState {
  sourceId: string;
  targetId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  isHovered: boolean;
  isSelected: boolean;
  reset?(): void;
}

export interface RenderContext {
  nodeStates: Map<string, NodeState>;
  linkStates: Map<string, LinkState>;
  tempVectors: Vector2D[];
  reset?(): void;
}

/**
 * Generic object pool for any type of object
 */
export class ObjectPool<T extends PoolableObject> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, resetFn?: (obj: T) => void, maxSize = 1000) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  /**
   * Get object from pool or create new one
   */
  acquire(): T {
    const obj = this.pool.pop();
    if (obj) {
      if (this.resetFn) {
        this.resetFn(obj);
      } else if (obj.reset) {
        obj.reset();
      }
      return obj;
    }
    return this.createFn();
  }

  /**
   * Return object to pool for reuse
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  /**
   * Pre-warm pool with initial objects
   */
  prewarm(count: number): void {
    for (let i = 0; i < count; i++) {
      this.pool.push(this.createFn());
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    available: number;
    maxSize: number;
    utilization: number;
  } {
    return {
      available: this.pool.length,
      maxSize: this.maxSize,
      utilization: (this.maxSize - this.pool.length) / this.maxSize
    };
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool.length = 0;
  }
}

/**
 * Specialized object pool manager for drag operations
 */
export class DragObjectPoolManager {
  private vector2DPool: ObjectPool<Vector2D>;
  private nodeStatePool: ObjectPool<NodeState>;
  private linkStatePool: ObjectPool<LinkState>;
  private renderContextPool: ObjectPool<RenderContext>;

  // Pre-allocated arrays to avoid GC during drag
  private reusableNodeArray: NodeState[] = [];
  private reusableLinkArray: LinkState[] = [];
  private reusableVector2DArray: Vector2D[] = [];

  constructor() {
    // Initialize pools with factory functions
    this.vector2DPool = new ObjectPool<Vector2D>(
      () => ({ x: 0, y: 0, reset() { this.x = 0; this.y = 0; } }),
      (obj) => { obj.x = 0; obj.y = 0; },
      500
    );

    this.nodeStatePool = new ObjectPool<NodeState>(
      () => ({
        id: '',
        x: 0,
        y: 0,
        isHovered: false,
        isSelected: false,
        reset() {
          this.id = '';
          this.x = 0;
          this.y = 0;
          this.isHovered = false;
          this.isSelected = false;
        }
      }),
      (obj) => {
        obj.id = '';
        obj.x = 0;
        obj.y = 0;
        obj.isHovered = false;
        obj.isSelected = false;
      },
      1000
    );

    this.linkStatePool = new ObjectPool<LinkState>(
      () => ({
        sourceId: '',
        targetId: '',
        sourceX: 0,
        sourceY: 0,
        targetX: 0,
        targetY: 0,
        isHovered: false,
        isSelected: false,
        reset() {
          this.sourceId = '';
          this.targetId = '';
          this.sourceX = 0;
          this.sourceY = 0;
          this.targetX = 0;
          this.targetY = 0;
          this.isHovered = false;
          this.isSelected = false;
        }
      }),
      (obj) => {
        obj.sourceId = '';
        obj.targetId = '';
        obj.sourceX = 0;
        obj.sourceY = 0;
        obj.targetX = 0;
        obj.targetY = 0;
        obj.isHovered = false;
        obj.isSelected = false;
      },
      2000
    );

    this.renderContextPool = new ObjectPool<RenderContext>(
      () => ({
        nodeStates: new Map<string, NodeState>(),
        linkStates: new Map<string, LinkState>(),
        tempVectors: [],
        reset() {
          this.nodeStates.clear();
          this.linkStates.clear();
          this.tempVectors.length = 0;
        }
      }),
      (obj) => {
        obj.nodeStates.clear();
        obj.linkStates.clear();
        obj.tempVectors.length = 0;
      },
      10
    );

    // Pre-warm pools for immediate use
    this.prewarmPools();
  }

  /**
   * Pre-warm pools with initial objects
   */
  private prewarmPools(): void {
    this.vector2DPool.prewarm(50);
    this.nodeStatePool.prewarm(100);
    this.linkStatePool.prewarm(200);
    this.renderContextPool.prewarm(2);
  }

  /**
   * Acquire temporary 2D vector
   */
  acquireVector2D(x = 0, y = 0): Vector2D {
    const vector = this.vector2DPool.acquire();
    vector.x = x;
    vector.y = y;
    return vector;
  }

  /**
   * Release 2D vector back to pool
   */
  releaseVector2D(vector: Vector2D): void {
    this.vector2DPool.release(vector);
  }

  /**
   * Acquire node state object
   */
  acquireNodeState(id: string, x: number, y: number, isHovered = false, isSelected = false): NodeState {
    const state = this.nodeStatePool.acquire();
    state.id = id;
    state.x = x;
    state.y = y;
    state.isHovered = isHovered;
    state.isSelected = isSelected;
    return state;
  }

  /**
   * Release node state back to pool
   */
  releaseNodeState(state: NodeState): void {
    this.nodeStatePool.release(state);
  }

  /**
   * Acquire link state object
   */
  acquireLinkState(
    sourceId: string,
    targetId: string,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    isHovered = false,
    isSelected = false
  ): LinkState {
    const state = this.linkStatePool.acquire();
    state.sourceId = sourceId;
    state.targetId = targetId;
    state.sourceX = sourceX;
    state.sourceY = sourceY;
    state.targetX = targetX;
    state.targetY = targetY;
    state.isHovered = isHovered;
    state.isSelected = isSelected;
    return state;
  }

  /**
   * Release link state back to pool
   */
  releaseLinkState(state: LinkState): void {
    this.linkStatePool.release(state);
  }

  /**
   * Acquire render context
   */
  acquireRenderContext(): RenderContext {
    return this.renderContextPool.acquire();
  }

  /**
   * Release render context back to pool
   */
  releaseRenderContext(context: RenderContext): void {
    this.renderContextPool.release(context);
  }

  /**
   * Get reusable node array (cleared and ready for use)
   */
  getReusableNodeArray(): NodeState[] {
    this.reusableNodeArray.length = 0; // Clear without GC
    return this.reusableNodeArray;
  }

  /**
   * Get reusable link array (cleared and ready for use)
   */
  getReusableLinkArray(): LinkState[] {
    this.reusableLinkArray.length = 0; // Clear without GC
    return this.reusableLinkArray;
  }

  /**
   * Get reusable vector array (cleared and ready for use)
   */
  getReusableVector2DArray(): Vector2D[] {
    this.reusableVector2DArray.length = 0; // Clear without GC
    return this.reusableVector2DArray;
  }

  /**
   * Batch acquire multiple vectors
   */
  batchAcquireVectors(count: number): Vector2D[] {
    const vectors = this.getReusableVector2DArray();
    for (let i = 0; i < count; i++) {
      vectors.push(this.acquireVector2D());
    }
    return vectors;
  }

  /**
   * Batch release multiple vectors
   */
  batchReleaseVectors(vectors: Vector2D[]): void {
    for (const vector of vectors) {
      this.releaseVector2D(vector);
    }
  }

  /**
   * Get comprehensive pool statistics
   */
  getStats(): {
    vector2D: { available: number; maxSize: number; utilization: number };
    nodeState: { available: number; maxSize: number; utilization: number };
    linkState: { available: number; maxSize: number; utilization: number };
    renderContext: { available: number; maxSize: number; utilization: number };
    memoryEstimate: {
      vector2DBytes: number;
      nodeStateBytes: number;
      linkStateBytes: number;
      totalBytes: number;
    };
  } {
    const vector2DStats = this.vector2DPool.getStats();
    const nodeStateStats = this.nodeStatePool.getStats();
    const linkStateStats = this.linkStatePool.getStats();
    const renderContextStats = this.renderContextPool.getStats();

    // Rough memory estimates (in bytes)
    const vector2DBytes = vector2DStats.maxSize * (2 * 8); // 2 numbers
    const nodeStateBytes = nodeStateStats.maxSize * (32 + 2 * 8 + 2 * 1); // string + 2 numbers + 2 booleans
    const linkStateBytes = linkStateStats.maxSize * (64 + 4 * 8 + 2 * 1); // 2 strings + 4 numbers + 2 booleans

    return {
      vector2D: vector2DStats,
      nodeState: nodeStateStats,
      linkState: linkStateStats,
      renderContext: renderContextStats,
      memoryEstimate: {
        vector2DBytes,
        nodeStateBytes,
        linkStateBytes,
        totalBytes: vector2DBytes + nodeStateBytes + linkStateBytes
      }
    };
  }

  /**
   * Force garbage collection optimization by clearing and re-prewarming pools
   */
  optimizeMemory(): void {
    // Clear pools
    this.vector2DPool.clear();
    this.nodeStatePool.clear();
    this.linkStatePool.clear();
    this.renderContextPool.clear();

    // Clear reusable arrays
    this.reusableNodeArray.length = 0;
    this.reusableLinkArray.length = 0;
    this.reusableVector2DArray.length = 0;

    // Re-prewarm with optimal sizes
    this.prewarmPools();
  }

  /**
   * Destroy and clean up all pools
   */
  destroy(): void {
    this.vector2DPool.clear();
    this.nodeStatePool.clear();
    this.linkStatePool.clear();
    this.renderContextPool.clear();

    this.reusableNodeArray.length = 0;
    this.reusableLinkArray.length = 0;
    this.reusableVector2DArray.length = 0;
  }
}

/**
 * Global singleton instance for drag operations
 */
export const dragObjectPool = new DragObjectPoolManager();