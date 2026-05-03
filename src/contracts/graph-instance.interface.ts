export interface GraphInstance {
  render(): void;
  zoomIn(): void;
  zoomOut(): void;
  resetView(): void;
  fitView(): void;
  destroy(): void;
  exportGraph(fileName?: string): void;
}