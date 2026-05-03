// utils/export-graph.ts
import html2canvas from 'html2canvas';

export interface ExportOptions {
  fileName?: string;
  backgroundColor?: string;
  pixelRatio?: number;
}

export async function captureAndDownloadGraph(
  container: HTMLElement, 
  options: ExportOptions = {}
): Promise<void> {
  const { 
    fileName = `graph-export-${Date.now()}.png`, 
    backgroundColor = '#ffffff', 
    pixelRatio = 2 
  } = options;

  const root = container.querySelector('.pg-root') as HTMLElement;
  if (!root) return;

  const controls = root.querySelector('.pg-controls') as HTMLElement;
  const legendToggle = root.querySelector('.pg-legend-toggle') as HTMLElement;
  const interactionLayer = root.querySelector('.pg-interaction-layer') as HTMLElement;
  const legend = root.querySelector('.pg-legend') as HTMLElement;
  
  const wasCollapsed = legend?.classList.contains('pg-is-collapsed');

  // Prepare UI for snapshot
  if (controls) controls.style.display = 'none';
  if (legendToggle) legendToggle.style.display = 'none';
  if (interactionLayer) interactionLayer.style.display = 'none'; // Hide the "hitbox" layer
  
  if (legend && wasCollapsed) {
    legend.classList.remove('pg-is-collapsed');
  }

  try {
    const canvas = await html2canvas(root, {
      scale: pixelRatio,
      backgroundColor: backgroundColor,
      useCORS: true,
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  } finally {
    // Restore everything
    if (controls) controls.style.display = 'flex';
    if (legendToggle) legendToggle.style.display = 'flex';
    if (interactionLayer) interactionLayer.style.display = 'block';
    
    if (legend && wasCollapsed) {
      legend.classList.add('pg-is-collapsed');
    }
  }
}