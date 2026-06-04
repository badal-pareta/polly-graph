export interface NodeRadiusCache {
  get(nodeId: string): number | undefined;
  set(nodeId: string, radius: number): void;
  update(nodeId: string, radius: number): void;
  clear(): void;
  invalidate(nodeId: string): void;
  destroy(): void;
}

class NodeRadiusCacheImpl implements NodeRadiusCache {
  private cache = new Map<string, number>();
  private domObserver?: MutationObserver;

  constructor() {
    if (typeof document !== 'undefined') {
      this.setupDOMObserver();
    }
  }

  get(nodeId: string): number | undefined {
    return this.cache.get(nodeId);
  }

  set(nodeId: string, radius: number): void {
    this.cache.set(nodeId, radius);
  }

  update(nodeId: string, radius: number): void {
    this.cache.set(nodeId, radius);
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(nodeId: string): void {
    this.cache.delete(nodeId);
  }

  private setupDOMObserver(): void {
    this.domObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'r') {
          const element = mutation.target as SVGCircleElement;
          const nodeId = this.extractNodeId(element);
          if (nodeId) {
            this.invalidate(nodeId);
          }
        }
      }
    });

    this.domObserver.observe(document.body, {
      attributeFilter: ['r'],
      subtree: true,
      attributes: true
    });
  }

  private extractNodeId(element: SVGCircleElement): string | null {
    const dataNodeId = element.getAttribute('data-node-id');
    if (dataNodeId) return dataNodeId;

    const boundData = (element as SVGCircleElement & { __data__: any }).__data__;
    return boundData?.id || null;
  }

  destroy(): void {
    this.clear();
    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = undefined;
    }
  }
}

export function createNodeRadiusCache(): NodeRadiusCache {
  return new NodeRadiusCacheImpl();
}

export function getNodeRadiusWithCache(
  nodeId: string,
  fallbackRadius: number,
  cache: NodeRadiusCache
): number {
  const cachedRadius = cache.get(nodeId);
  if (cachedRadius !== undefined) {
    return cachedRadius;
  }

  if (typeof document === 'undefined') {
    cache.set(nodeId, fallbackRadius);
    return fallbackRadius;
  }

  let circle = document.querySelector(`[data-layer="selection-nodes"] circle[data-node-id="${nodeId}"]`) as SVGCircleElement | null;

  if (!circle) {
    const circles = Array.from(document.querySelectorAll('circle'));
    for (const c of circles) {
      const boundData = (c as SVGCircleElement & { __data__: any }).__data__;
      if (boundData?.id === nodeId) {
        circle = c;
        break;
      }
    }
  }

  const radius = circle ? parseFloat(circle.getAttribute('r') || String(fallbackRadius)) : fallbackRadius;
  cache.set(nodeId, radius);
  return radius;
}