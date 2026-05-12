/**
 * Centralized timer management for framework-independent graph operations.
 * Provides better cleanup and prevents memory leaks across all frameworks.
 */

interface TimerConfig {
  readonly name: string;
  readonly callback: () => void;
  readonly delay: number;
  readonly type?: 'timeout' | 'interval';
}

interface ActiveTimer {
  readonly id: number;
  readonly name: string;
  readonly type: 'timeout' | 'interval';
  readonly startTime: number;
}

export class TimerManager {
  private readonly activeTimers = new Map<string, ActiveTimer>();
  private isDestroyed = false;

  /**
   * Schedule a timeout with automatic cleanup tracking
   */
  setTimeout(name: string, callback: () => void, delay: number): void {
    this.clearTimer(name); // Clear any existing timer with same name

    if (this.isDestroyed) return;

    const id = window.setTimeout(() => {
      this.activeTimers.delete(name);
      if (!this.isDestroyed) {
        callback();
      }
    }, delay);

    this.activeTimers.set(name, {
      id,
      name,
      type: 'timeout',
      startTime: performance.now()
    });
  }

  /**
   * Schedule an interval with automatic cleanup tracking
   */
  setInterval(name: string, callback: () => void, delay: number): void {
    this.clearTimer(name);

    if (this.isDestroyed) return;

    const id = window.setInterval(() => {
      if (!this.isDestroyed) {
        callback();
      } else {
        this.clearTimer(name);
      }
    }, delay);

    this.activeTimers.set(name, {
      id,
      name,
      type: 'interval',
      startTime: performance.now()
    });
  }

  /**
   * Clear a specific timer by name
   */
  clearTimer(name: string): boolean {
    const timer = this.activeTimers.get(name);
    if (!timer) return false;

    if (timer.type === 'timeout') {
      clearTimeout(timer.id);
    } else {
      clearInterval(timer.id);
    }

    this.activeTimers.delete(name);
    return true;
  }

  /**
   * Check if a timer is currently active
   */
  hasActiveTimer(name: string): boolean {
    return this.activeTimers.has(name);
  }

  /**
   * Get information about active timers
   */
  getActiveTimers(): Array<{ name: string; type: string; age: number }> {
    const now = performance.now();
    return Array.from(this.activeTimers.values()).map(timer => ({
      name: timer.name,
      type: timer.type,
      age: now - timer.startTime
    }));
  }

  /**
   * Debounced execution - only runs the latest call after delay
   */
  debounce(name: string, callback: () => void, delay: number): void {
    this.setTimeout(name, callback, delay);
  }

  /**
   * Throttled execution - limits frequency of execution
   */
  throttle(name: string, callback: () => void, delay: number): void {
    if (this.hasActiveTimer(name)) {
      return; // Skip if still in cooldown
    }

    callback();
    this.setTimeout(name, () => {
      // Timer expires, allowing next execution
    }, delay);
  }

  /**
   * Schedule multiple related timers that can be cleared as a group
   */
  scheduleGroup(groupName: string, timers: TimerConfig[]): void {
    timers.forEach((timer, index) => {
      const timerName = `${groupName}_${timer.name}_${index}`;

      if (timer.type === 'interval') {
        this.setInterval(timerName, timer.callback, timer.delay);
      } else {
        this.setTimeout(timerName, timer.callback, timer.delay);
      }
    });
  }

  /**
   * Clear all timers in a group
   */
  clearGroup(groupName: string): number {
    let clearedCount = 0;
    for (const [name] of Array.from(this.activeTimers)) {
      if (name.startsWith(`${groupName}_`)) {
        this.clearTimer(name);
        clearedCount++;
      }
    }
    return clearedCount;
  }

  /**
   * Get count of active timers
   */
  getActiveTimerCount(): number {
    return this.activeTimers.size;
  }

  /**
   * Clear all timers and prevent new ones from being created
   */
  destroy(): void {
    this.isDestroyed = true;

    for (const [name] of Array.from(this.activeTimers)) {
      this.clearTimer(name);
    }

    this.activeTimers.clear();
  }

  /**
   * Reset manager (clear all timers but allow new ones)
   */
  reset(): void {
    for (const [name] of Array.from(this.activeTimers)) {
      this.clearTimer(name);
    }
    this.isDestroyed = false;
  }
}