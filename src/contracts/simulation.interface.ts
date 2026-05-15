import { Simulation } from 'd3-force';
import { GraphNode, GraphLink } from './graph.types';
import { TimerManager } from '../utils/timer-manager';

export interface LinkForceConfig {
  readonly enabled?: boolean;
  readonly distance?: number | ((link: GraphLink) => number);
  readonly strength?: number | ((link: GraphLink) => number);
  readonly iterations?: number;
}

export interface ChargeForceConfig {
  readonly enabled?: boolean;
  readonly strength?: number | ((node: GraphNode) => number);
  readonly theta?: number;
  readonly distanceMin?: number;
  readonly distanceMax?: number;
}

export interface CollideForceConfig {
  readonly enabled?: boolean;
  readonly radius?: number | ((node: GraphNode) => number);
  readonly strength?: number;
  readonly iterations?: number;
}

export interface CenterForceConfig {
  readonly enabled?: boolean;
  readonly strength?: number;
  readonly x?: number;
  readonly y?: number;
}

export interface XForceConfig {
  readonly enabled?: boolean;
  readonly strength?: number;
  readonly x?: number | ((node: GraphNode) => number);
}

export interface YForceConfig {
  readonly enabled?: boolean;
  readonly strength?: number;
  readonly y?: number | ((node: GraphNode) => number);
}

export interface SimulationForces {
  readonly link?: LinkForceConfig;
  readonly charge?: ChargeForceConfig;
  readonly collide?: CollideForceConfig;
  readonly center?: CenterForceConfig;
  readonly x?: XForceConfig;
  readonly y?: YForceConfig;
}

export interface AdaptiveConfig {
  readonly enabled?: boolean;
  readonly nodeCountThresholds?: {
    readonly small?: number;
    readonly medium?: number;
    readonly large?: number;
  };
}

export interface WarmupConfig {
  readonly enabled?: boolean;
  readonly ticks?: number;
}

export interface CooldownConfig {
  readonly enabled?: boolean;
  readonly delay?: number;
}

export interface EnhancedSimulationConfig {
  readonly alpha?: number;
  readonly alphaMin?: number;
  readonly alphaDecay?: number;
  readonly velocityDecay?: number;
  readonly forces?: SimulationForces;
  readonly adaptive?: AdaptiveConfig;
  readonly warmup?: WarmupConfig;
  readonly cooldown?: CooldownConfig;
}

export interface SimulationConfig {
  readonly nodes: GraphNode[];
  readonly links: GraphLink[];
  readonly width: number;
  readonly height: number;
  readonly config?: EnhancedSimulationConfig;
  readonly onReady?: VoidFunction;
  readonly timerManager?: TimerManager;
}

export interface SimulationResult {
  readonly simulation: Simulation<GraphNode, GraphLink>;
}