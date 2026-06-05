/**
 * V2 Canvas Graph - Type Definitions
 */

import { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';
import { NodeRenderStyle, LinkRenderStyle } from './render-styles';

export interface V2Node extends SimulationNodeDatum {
  id: string;
  label?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  style?: Partial<NodeRenderStyle>;
  __indexColor?: string; // canvas-color-tracker returns hex strings
  __indexColorRGB?: [number, number, number]; // RGB values for shadow rendering
}

export interface V2Link extends SimulationLinkDatum<V2Node> {
  source: string | V2Node;
  target: string | V2Node;
  label?: string;
  style?: Partial<LinkRenderStyle>;
  __indexColor?: string; // canvas-color-tracker returns hex strings
  __indexColorRGB?: [number, number, number]; // RGB values for shadow rendering
}

// V2-compatible interaction configuration interfaces
export interface HoverInteractionConfig {
  readonly enabled?: boolean;
  readonly nodeStyle?: Partial<NodeRenderStyle>;
  readonly linkStyle?: Partial<LinkRenderStyle>;
}

export interface SelectionInteractionConfig {
  readonly enabled?: boolean;
  readonly nodeStyle?: Partial<NodeRenderStyle>;
  readonly linkStyle?: Partial<LinkRenderStyle>;
}

export interface InteractionConfig {
  readonly hover?: HoverInteractionConfig;
  readonly selection?: SelectionInteractionConfig;
}

export interface V2Config {
  container: HTMLElement;
  nodes: V2Node[];
  links: V2Link[];
  width?: number;
  height?: number;
  backgroundColor?: string;
  interaction?: InteractionConfig;
  autoFitView?: boolean; // Default true - auto fit view when simulation ends
  cooldownTime?: number; // Default 2000ms - time before force simulation stops
}

export interface V2Instance {
  render(): void;
  destroy(): void;
  testHitDetection(x: number, y: number): V2Node | null;
  testZoom(): { scale: number; x: number; y: number };
  getZoomBehavior(): any;
  getCanvas(): HTMLCanvasElement;
  fitView(): void;
  resetView(): void;
  zoomIn(factor?: number, center?: [number, number]): void;
  zoomOut(factor?: number, center?: [number, number]): void;
  getStats(): any;
  clearSelection(): void;
  on(event: string, handler: (...args: any[]) => void): () => void;
  off(event: string, handler: (...args: any[]) => void): void;
}

// V1 API compatibility interfaces
export interface GraphNode {
  id: string;
  type: string;
  label?: string;
  tooltip?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  label?: string;
  tooltip?: string;
}

export interface GraphConfig {
  container: HTMLElement;
  nodes: GraphNode[];
  links: GraphLink[];
  width?: number;
  height?: number;
  backgroundColor?: string;
}

export interface GraphInstance {
  render(): void;
  zoomIn(): void;
  zoomOut(): void;
  resetView(): void;
  fitView(): void;
  destroy(): void;
  exportGraph(fileName?: string): void;
  clearSelection(): void;
  on(event: string, handler: (...args: any[]) => void): () => void;
  off(event: string, handler: (...args: any[]) => void): void;
  testHitDetection?(x: number, y: number): GraphNode | null;
  testZoom?(): { scale: number; x: number; y: number };
}