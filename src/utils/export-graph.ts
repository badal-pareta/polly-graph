/**
 * SVG-based graph export functionality.
 * Uses SVG-to-image conversion to avoid CSS color function compatibility issues.
 */

export interface ExportOptions {
  fileName?: string;
  backgroundColor?: string;
  scale?: number;
  includeLegend?: boolean;
  pixelRatio?: number;
}

interface LegendDimensions {
  width: number;
  height: number;
  x: number;
  y: number;
  padding: number;
  itemHeight: number;
  itemSpacing: number;
}

interface LegendEntry {
  type: string;
  color: string;
}

export async function captureAndDownloadGraph(container: HTMLElement, options: ExportOptions = {}): Promise<void> {
  const {
    fileName = `graph-export-${Date.now()}.png`,
    backgroundColor = '#ffffff',
    scale = 2,
    includeLegend = true
  } = options;

  // Find the SVG element in the container
  const svgElement = container.querySelector('svg.pg-canvas') as SVGSVGElement;
  if (!svgElement) {
    throw new Error('SVG element not found in container');
  }

  const svgRect = svgElement.getBoundingClientRect();
  const graphWidth = svgRect.width || 800;
  const graphHeight = svgRect.height || 600;

  // Clone SVG for export
  const svgClone = svgElement.cloneNode(true) as SVGSVGElement;

  let totalWidth = graphWidth;
  let totalHeight = graphHeight;

  // Extract legend data and add to SVG if requested
  if (includeLegend) {
    const legendEntries = extractLegendData(container);

    if (legendEntries.length > 0) {
      const legendDimensions = calculateLegendDimensions(legendEntries, graphWidth);

      // Extend canvas dimensions to include legend
      totalWidth = graphWidth + 20 + legendDimensions.width + 20; // 20px margins
      totalHeight = Math.max(graphHeight, legendDimensions.height + 40); // Ensure legend fits

      // Update SVG dimensions
      svgClone.setAttribute('width', totalWidth.toString());
      svgClone.setAttribute('height', totalHeight.toString());
      svgClone.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);

      // Create and append legend
      const legendGroup = createLegendSVGElement(legendEntries, legendDimensions);
      svgClone.appendChild(legendGroup);
    }
  }

  // Ensure SVG has proper namespace
  svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  // Fix text styling for export
  fixTextStyling(svgClone);

  // Serialize SVG to string
  const svgString = new XMLSerializer().serializeToString(svgClone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Set canvas dimensions with scale for quality
    canvas.width = totalWidth * scale;
    canvas.height = totalHeight * scale;

    // Scale context for high-DPI rendering
    ctx.scale(scale, scale);

    // Set background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Convert SVG to image
    await new Promise<void>((resolve, reject) => {
      const img = new Image();

      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
        img.src = '';
        URL.revokeObjectURL(svgUrl);
      };

      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, totalWidth, totalHeight);

          canvas.toBlob((blob) => {
            cleanup();

            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = fileName;

              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);

              resolve();
            } else {
              reject(new Error('Failed to generate image blob'));
            }
          }, 'image/png', 0.95);
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      img.onerror = () => {
        cleanup();
        reject(new Error('Failed to load SVG image'));
      };

      img.src = svgUrl;
    });

  } catch (error) {
    URL.revokeObjectURL(svgUrl);
    throw error;
  }
}

function extractLegendData(container: HTMLElement): LegendEntry[] {
  const legendEntries: LegendEntry[] = [];

  // Look for existing legend in the container
  const legendContainer = container.querySelector('.pg-legend');
  if (!legendContainer) {
    return legendEntries;
  }

  const legendItems = legendContainer.querySelectorAll('.pg-legend-item');

  legendItems.forEach(item => {
    const swatch = item.querySelector('.pg-legend-swatch') as HTMLElement;
    const label = item.querySelector('.pg-legend-label');

    if (swatch && label) {
      const backgroundColor = swatch.style.backgroundColor || getComputedStyle(swatch).backgroundColor;
      const type = label.textContent || 'Unknown';

      // Convert any RGB/color values to hex if needed
      const color = normalizeColor(backgroundColor);

      legendEntries.push({
        type: type.trim(),
        color
      });
    }
  });

  return legendEntries;
}

function calculateLegendDimensions(
  legendEntries: LegendEntry[],
  graphWidth: number
): LegendDimensions {
  // Calculate dynamic legend width based on longest type name
  const longestTypeName = legendEntries.reduce((max, entry) => {
    return entry.type.length > max ? entry.type.length : max;
  }, 0);

  const minLegendWidth = 180;
  const calculatedWidth = longestTypeName * 8 + 60; // 60px for padding and circle
  const width = Math.max(minLegendWidth, Math.min(calculatedWidth, 320)); // Cap at 320px

  const itemHeight = 24;
  const itemSpacing = 8;
  const padding = 16;

  const height = padding +
                 legendEntries.length * (itemHeight + itemSpacing) - itemSpacing + padding;

  const legendMargin = 20;
  const x = graphWidth + legendMargin;
  const y = 20;

  return {
    width,
    height,
    x,
    y,
    padding,
    itemHeight,
    itemSpacing
  };
}

function createLegendSVGElement(
  legendEntries: LegendEntry[],
  dimensions: LegendDimensions
): SVGGElement {
  const {
    x: legendX,
    y: legendY,
    width: legendWidth,
    height: legendHeight,
    padding: legendPadding,
    itemHeight: legendItemHeight,
    itemSpacing: legendItemSpacing,
  } = dimensions;

  // Create legend group
  const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  legendGroup.setAttribute('class', 'export-legend');

  // Create legend background
  const legendBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  legendBg.setAttribute('x', legendX.toString());
  legendBg.setAttribute('y', legendY.toString());
  legendBg.setAttribute('width', legendWidth.toString());
  legendBg.setAttribute('height', legendHeight.toString());
  legendBg.setAttribute('fill', '#ffffff');
  legendBg.setAttribute('stroke', '#e2e8f0');
  legendBg.setAttribute('stroke-width', '1');
  legendBg.setAttribute('rx', '8');
  legendGroup.appendChild(legendBg);


  // Create legend items
  legendEntries.forEach((entry, index) => {
    const itemY = legendY + legendPadding +
                  index * (legendItemHeight + legendItemSpacing);

    // Create circle swatch
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', (legendX + legendPadding + 7).toString());
    circle.setAttribute('cy', (itemY + legendItemHeight / 2).toString());
    circle.setAttribute('r', '7');
    circle.setAttribute('fill', entry.color);
    circle.setAttribute('stroke', 'none');
    legendGroup.appendChild(circle);

    // Create text label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', (legendX + legendPadding + 24).toString());
    text.setAttribute('y', (itemY + legendItemHeight / 2).toString());
    text.setAttribute('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif');
    text.setAttribute('font-size', '12');
    text.setAttribute('fill', '#6b7280');
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = entry.type;
    legendGroup.appendChild(text);
  });

  return legendGroup;
}

function fixTextStyling(svgElement: SVGSVGElement): void {
  // Fix node labels - these are text elements in the node-labels layer
  const nodeLabelsLayer = svgElement.querySelector('[data-layer="node-labels"]');
  if (nodeLabelsLayer) {
    const nodeTexts = nodeLabelsLayer.querySelectorAll('text');
    nodeTexts.forEach(text => {
      const textElement = text as SVGTextElement;
      textElement.setAttribute('font-family', 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');

      // Only set font-size if not already set
      if (!textElement.getAttribute('font-size')) {
        textElement.setAttribute('font-size', '9');
      }

      textElement.setAttribute('font-weight', '500');
      textElement.setAttribute('text-anchor', 'middle');
      textElement.setAttribute('dominant-baseline', 'central');

      // Preserve existing fill color if set, otherwise use default
      if (!textElement.getAttribute('fill')) {
        textElement.setAttribute('fill', '#374151');
      }
    });
  }

  // Fix link labels - these are g.link-label groups with text and rect children
  const linkLabels = svgElement.querySelectorAll('g.link-label');
  linkLabels.forEach(labelGroup => {
    const textElement = labelGroup.querySelector('text') as SVGTextElement;
    if (textElement) {
      textElement.setAttribute('font-family', 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');

      // Only set font-size if not already set
      if (!textElement.getAttribute('font-size')) {
        textElement.setAttribute('font-size', '10');
      }

      textElement.setAttribute('font-weight', '400');
      textElement.setAttribute('text-anchor', 'middle');
      textElement.setAttribute('dominant-baseline', 'central');

      // Preserve existing fill color if set, otherwise use default
      if (!textElement.getAttribute('fill')) {
        textElement.setAttribute('fill', '#6b7280');
      }
    }

    // Fix background rectangle if present
    const rectElement = labelGroup.querySelector('rect') as SVGRectElement;
    if (rectElement) {
      if (!rectElement.getAttribute('fill')) {
        rectElement.setAttribute('fill', '#ffffff');
      }
      if (!rectElement.getAttribute('stroke')) {
        rectElement.setAttribute('stroke', '#e5e7eb');
      }
      if (!rectElement.getAttribute('stroke-width')) {
        rectElement.setAttribute('stroke-width', '1');
      }
      rectElement.setAttribute('rx', '4');
    }
  });

  // Fix any other text elements that might not have proper font styling
  const allTexts = svgElement.querySelectorAll('text');
  allTexts.forEach(text => {
    const textElement = text as SVGTextElement;

    // Only apply font-family if not already set
    if (!textElement.getAttribute('font-family')) {
      textElement.setAttribute('font-family', 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
    }

    // Ensure all text elements have a font-size (fallback to 10px)
    if (!textElement.getAttribute('font-size')) {
      textElement.setAttribute('font-size', '10');
    }
  });
}

function normalizeColor(color: string): string {
  // Handle rgb() values by converting to hex
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1] ?? '0');
    const g = parseInt(rgbMatch[2] ?? '0');
    const b = parseInt(rgbMatch[3] ?? '0');
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  // Return as-is if already hex or named color
  return color;
}