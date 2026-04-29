import { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';

export interface GraphNode extends SimulationNodeDatum {
  readonly id: string;
  readonly type: string;
  readonly label?: string;
  readonly tooltip?: string;
  readonly style?: NodeStyle;
}

export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  readonly source: string | GraphNode;
  readonly target: string | GraphNode;
  readonly label?: string;
  readonly tooltip?: string;
  readonly style?: LinkStyle;
}

export interface NodeStyle {
  readonly radius?: number;
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly opacity?: number;
  readonly textColor?: string;
}

export interface LinkArrowStyle {
  readonly enabled?: boolean;
  readonly size?: number;
  readonly fill?: string;
}

export interface LinkLabelStyle {
  readonly enabled?: boolean; 
  readonly backgroundFill?: string;
  readonly borderColor?: string;
  readonly borderWidth?: number;
  readonly borderRadius?: number;
  readonly textColor?: string;
  readonly fontSize?: number;
  readonly paddingX?: number;
  readonly paddingY?: number;
  readonly height?: number;
}

export interface LinkStyle {
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly opacity?: number;
  readonly dashArray?: string;
  readonly arrow?: LinkArrowStyle;
  readonly label?: LinkLabelStyle;
}

export interface ResolvedLinkLabelStyle {
  readonly enabled: boolean;
  readonly backgroundFill: string;
  readonly borderColor: string;
  readonly borderWidth: number;
  readonly borderRadius: number;
  readonly textColor: string;
  readonly fontSize: number;
  readonly paddingX: number;
  readonly paddingY: number;
  readonly height: number;
}

export interface ResolvedLinkStyle {
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly opacity: number;
  readonly dashArray: string | undefined;
  readonly arrow: {
    readonly enabled: boolean;
    readonly size: number;
    readonly fill: string;
  };
  readonly label: ResolvedLinkLabelStyle;
}
