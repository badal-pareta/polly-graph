export interface GraphDimensions {
  readonly width: number;
  readonly height: number;
}

export type ResizeCallback = (
  width: number,
  height: number
) => void;