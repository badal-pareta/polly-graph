import { V2Link, V2Node } from './graph.types';

export interface PhysicsConfig {
  nodes: V2Node[];
  links: V2Link[];
  width: number;
  height: number;
  onTick: () => void;
  onEnd?: () => void;
  autoFitView?: boolean;
  cooldownTime?: number;
}