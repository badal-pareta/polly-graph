/**
 * Framework-independent event emitter for graph events.
 * Provides better TypeScript support and event namespacing than manual Set management.
 */

import { GraphNode, GraphLink } from '../contracts/graph.types';

export type EventListener<T> = (data: T, element?: Element) => void;

export interface EventUnsubscribe {
  (): void;
}

interface EventHandler<T> {
  readonly listener: EventListener<T>;
  readonly namespace?: string;
  readonly once?: boolean;
  readonly id: string;
}

export interface EventEmitterOptions {
  readonly maxListeners?: number; // Default: 50
  readonly enableWarnings?: boolean; // Default: true
}

export class GraphEventEmitter<TEventMap extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof TEventMap, EventHandler<TEventMap[keyof TEventMap]>[]>();
  private readonly options: Required<EventEmitterOptions>;
  private isDestroyed = false;
  private listenerIdCounter = 0;

  constructor(options: EventEmitterOptions = {}) {
    this.options = {
      maxListeners: options.maxListeners ?? 50,
      enableWarnings: options.enableWarnings ?? true
    };
  }

  /**
   * Add an event listener
   */
  on<TEvent extends keyof TEventMap>(
    event: TEvent,
    listener: EventListener<TEventMap[TEvent]>,
    namespace?: string
  ): EventUnsubscribe {
    if (this.isDestroyed) {
      if (this.options.enableWarnings) {
        console.warn('[GraphEventEmitter] Cannot add listener to destroyed emitter');
      }
      return () => {};
    }

    const id = `listener_${++this.listenerIdCounter}`;
    const handler: EventHandler<TEventMap[TEvent]> = {
      listener,
      namespace,
      id
    };

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const eventListeners = this.listeners.get(event)!;
    eventListeners.push(handler as EventHandler<TEventMap[keyof TEventMap]>);

    // Warn about potential memory leaks
    if (eventListeners.length > this.options.maxListeners && this.options.enableWarnings) {
      console.warn(
        `[GraphEventEmitter] Event '${String(event)}' has ${eventListeners.length} listeners. ` +
        'Possible memory leak detected.'
      );
    }

    // Return unsubscribe function
    return () => {
      this.removeListener(event, handler.id);
    };
  }

  /**
   * Add a one-time event listener
   */
  once<TEvent extends keyof TEventMap>(
    event: TEvent,
    listener: EventListener<TEventMap[TEvent]>,
    namespace?: string
  ): EventUnsubscribe {
    const id = `listener_${++this.listenerIdCounter}`;
    const handler: EventHandler<TEventMap[TEvent]> = {
      listener: (data: TEventMap[TEvent], element?: Element) => {
        // Remove listener before calling to prevent re-entrance
        this.removeListener(event, id);
        listener(data, element);
      },
      namespace,
      once: true,
      id
    };

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event)!.push(handler as EventHandler<TEventMap[keyof TEventMap]>);

    return () => {
      this.removeListener(event, handler.id);
    };
  }

  /**
   * Remove a specific listener
   */
  off<TEvent extends keyof TEventMap>(event: TEvent, listener: EventListener<TEventMap[TEvent]>): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;

    const index = eventListeners.findIndex(handler => handler.listener === listener);
    if (index !== -1) {
      eventListeners.splice(index, 1);
      if (eventListeners.length === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Remove listener by ID
   */
  private removeListener<TEvent extends keyof TEventMap>(event: TEvent, id: string): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;

    const index = eventListeners.findIndex(handler => handler.id === id);
    if (index !== -1) {
      eventListeners.splice(index, 1);
      if (eventListeners.length === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Remove all listeners for an event or namespace
   */
  removeAllListeners<TEvent extends keyof TEventMap>(event?: TEvent, namespace?: string): void {
    if (event && !namespace) {
      // Remove all listeners for specific event
      this.listeners.delete(event);
    } else if (namespace && !event) {
      // Remove all listeners in namespace
      for (const [eventName, handlers] of Array.from(this.listeners.entries())) {
        const filtered = handlers.filter(handler => handler.namespace !== namespace);
        if (filtered.length === 0) {
          this.listeners.delete(eventName);
        } else {
          this.listeners.set(eventName, filtered);
        }
      }
    } else if (event && namespace) {
      // Remove listeners for specific event in namespace
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        const filtered = eventListeners.filter(handler => handler.namespace !== namespace);
        if (filtered.length === 0) {
          this.listeners.delete(event);
        } else {
          this.listeners.set(event, filtered);
        }
      }
    } else {
      // Remove all listeners
      this.listeners.clear();
    }
  }

  /**
   * Emit an event to all listeners
   */
  emit<TEvent extends keyof TEventMap>(event: TEvent, data: TEventMap[TEvent], element?: Element): boolean {
    if (this.isDestroyed) {
      return false;
    }

    const eventListeners = this.listeners.get(event);
    if (!eventListeners || eventListeners.length === 0) {
      return false;
    }

    // Create a copy to prevent issues if listeners are modified during emission
    const listenersToCall = [...eventListeners];

    for (const handler of listenersToCall) {
      try {
        handler.listener(data, element);
      } catch (error) {
        if (this.options.enableWarnings) {
          console.error(`[GraphEventEmitter] Error in listener for '${String(event)}':`, error);
        }
      }
    }

    return true;
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount<TEvent extends keyof TEventMap>(event: TEvent): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): Array<keyof TEventMap> {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get listeners for an event
   */
  getListeners<TEvent extends keyof TEventMap>(event: TEvent): Array<EventListener<TEventMap[TEvent]>> {
    return this.listeners.get(event)?.map(handler => handler.listener as EventListener<TEventMap[TEvent]>) ?? [];
  }

  /**
   * Check if an event has listeners
   */
  hasListeners<TEvent extends keyof TEventMap>(event: TEvent): boolean {
    return this.listenerCount(event) > 0;
  }

  /**
   * Get debug information about the emitter
   */
  getDebugInfo() {
    const events = new Map<keyof TEventMap, number>();
    const namespaces = new Map<string, number>();

    for (const [event, handlers] of Array.from(this.listeners.entries())) {
      events.set(event, handlers.length);

      for (const handler of handlers) {
        if (handler.namespace) {
          namespaces.set(handler.namespace, (namespaces.get(handler.namespace) ?? 0) + 1);
        }
      }
    }

    return {
      totalEvents: this.listeners.size,
      totalListeners: Array.from(this.listeners.values()).reduce((sum, handlers) => sum + handlers.length, 0),
      events: Object.fromEntries(events.entries()),
      namespaces: Object.fromEntries(namespaces),
      isDestroyed: this.isDestroyed
    };
  }

  /**
   * Clean up all listeners and mark as destroyed
   */
  destroy(): void {
    this.isDestroyed = true;
    this.listeners.clear();
  }

  /**
   * Reset the emitter (clear listeners but allow new ones)
   */
  reset(): void {
    this.isDestroyed = false;
    this.listeners.clear();
  }
}

/**
 * Graph-specific event types
 */
export interface GraphEventMap {
  'nodeSelect': { node: GraphNode; element: SVGCircleElement };
  'nodeDeselect': { node: GraphNode; element: SVGCircleElement };
  'linkSelect': { link: GraphLink; element: SVGLineElement };
  'linkDeselect': { link: GraphLink; element: SVGLineElement };
  'graphRender': { nodeCount: number; linkCount: number };
  'simulationStart': { alpha: number };
  'simulationEnd': { iterations: number };
  'zoomStart': { scale: number; x: number; y: number };
  'zoomEnd': { scale: number; x: number; y: number };
  [key: string]: unknown; // Index signature for extensibility
}

export type GraphEventName = keyof GraphEventMap;

/**
 * Type-safe graph event emitter
 */
export class TypedGraphEventEmitter extends GraphEventEmitter<GraphEventMap> {
  constructor(options?: EventEmitterOptions) {
    super(options);
  }
}