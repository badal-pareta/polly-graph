import { Simulation } from 'd3-force';
import { GraphNode, GraphLink } from './graph.types';

export interface SimulationConfig {
  readonly nodes: GraphNode[];
  readonly links: GraphLink[];
  readonly width: number;
  readonly height: number;
}

export interface SimulationResult {
  readonly simulation: Simulation<GraphNode, GraphLink>;
}