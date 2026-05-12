import html2canvas from 'html2canvas';

export interface ExportOptions {
  fileName?: string;
  backgroundColor?: string;
  pixelRatio?: number;
}

interface StyleBackup {
  readonly element: HTMLElement;
  readonly styleAttribute: string | null;
}

export async function captureAndDownloadGraph(container: HTMLElement, options: ExportOptions = {}): Promise<void> {

  const {
    fileName = `graph-export-${Date.now()}.png`,
    backgroundColor = '#ffffff',
    pixelRatio = 2
  } = options;

  const root = container.querySelector('.pg-root') as HTMLElement | null;
  if (!root) { return; }

  const controls = root.querySelector('.pg-controls') as HTMLElement | null;
  const legendToggle = root.querySelector('.pg-legend-toggle') as HTMLElement | null;
  const interactionLayer = root.querySelector('.pg-interaction-layer') as HTMLElement | null;
  const legend = root.querySelector('.pg-legend') as HTMLElement | null;

  const wasCollapsed: boolean = Boolean(legend?.classList.contains('pg-is-collapsed'));

  const styleBackups: StyleBackup[] = [];

  if (controls) { controls.style.display = 'none'; }

  if (legendToggle) { legendToggle.style.display = 'none'; }

  if (interactionLayer) { interactionLayer.style.display = 'none'; }

  if (legend && wasCollapsed) {
    legend.classList.remove('pg-is-collapsed');
  }

  try {
    normalizeFirefoxColors(root, styleBackups);

    const canvas: HTMLCanvasElement = await html2canvas(root,
      {
        scale: pixelRatio,
        backgroundColor,
        useCORS: true,
        logging: false
      }
    );

    const dataUrl: string = canvas.toDataURL('image/png');

    const link: HTMLAnchorElement = document.createElement('a');

    link.download = fileName;
    link.href = dataUrl;

    link.click();
  } catch (error: unknown) {
    console.error(error);
  } finally {
    restoreStyles(styleBackups);

    if (controls) { controls.style.display = 'flex'; }
    if (legendToggle) { legendToggle.style.display = 'flex'; }
    if (interactionLayer) { interactionLayer.style.display = 'block'; }
    if (legend && wasCollapsed) { legend.classList.add('pg-is-collapsed'); }
  }

}

function normalizeFirefoxColors(root: HTMLElement, backups: StyleBackup[]): void {

  const elements: HTMLElement[] = [
    root,
    ...Array.from(root.querySelectorAll<HTMLElement>('*'))
  ];

  const colorProperties: readonly string[] = [
    'color',
    'background-color',
    'border-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'text-decoration-color',
    '-webkit-text-fill-color',
    '-webkit-text-stroke-color',
    'fill',
    'stroke'
  ];

  for (const element of elements) {
    const computedStyle: CSSStyleDeclaration =
      window.getComputedStyle(element);

    let hasChanges = false;

    for (const propertyName of colorProperties) {
      const value: string =
        computedStyle.getPropertyValue(propertyName);

      if (!value.includes('color(') && !value.includes('oklab(')) {
        continue;
      }

      const normalizedValue: string =
        convertColorToRgb(value);

      if (!normalizedValue) {
        continue;
      }

      if (!hasChanges) {
        backups.push({
          element,
          styleAttribute: element.getAttribute('style')
        });

        hasChanges = true;
      }

      element.style.setProperty(
        propertyName,
        normalizedValue
      );
    }
  }

}

function convertColorToRgb(
  value: string
): string {

  // Handle srgb color function
  const srgbMatch: RegExpMatchArray | null =
    value.match(
      /color\(srgb\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)/i
    );

  if (srgbMatch) {
    const red: number =
      Math.round(Number(srgbMatch[1]) * 255);

    const green: number =
      Math.round(Number(srgbMatch[2]) * 255);

    const blue: number =
      Math.round(Number(srgbMatch[3]) * 255);

    return `rgb(${red}, ${green}, ${blue})`;
  }

  // Handle oklab color function
  const oklabMatch: RegExpMatchArray | null =
    value.match(
      /oklab\(\s*([0-9.%]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s*\)/i
    );

  if (oklabMatch) {
    let l = Number(oklabMatch[1]);
    const a = Number(oklabMatch[2]);
    const b = Number(oklabMatch[3]);

    // Handle percentage values for lightness
    if (oklabMatch[1] && oklabMatch[1].includes('%')) {
      l = l / 100;
    }

    // Convert OKLAB to RGB (simplified conversion)
    const rgb = oklabToRgb(l, a, b);
    return `rgb(${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)})`;
  }

  return '';
}

function oklabToRgb(l: number, a: number, b: number): { r: number; g: number; b: number } {
  // Simplified OKLAB to RGB conversion
  // This is an approximation for html2canvas compatibility

  // Convert OKLAB to linear RGB (simplified)
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  // Convert to linear RGB
  let r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let b_rgb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  // Apply gamma correction (sRGB)
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1.0 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1.0 / 2.4) - 0.055 : 12.92 * g;
  b_rgb = b_rgb > 0.0031308 ? 1.055 * Math.pow(b_rgb, 1.0 / 2.4) - 0.055 : 12.92 * b_rgb;

  // Clamp to [0, 1]
  return {
    r: Math.max(0, Math.min(1, r)),
    g: Math.max(0, Math.min(1, g)),
    b: Math.max(0, Math.min(1, b_rgb))
  };
}

function restoreStyles(
  backups: readonly StyleBackup[]
): void {

  for (const backup of backups) {
    if (backup.styleAttribute === null) {
      backup.element.removeAttribute('style');
      continue;
    }

    backup.element.setAttribute(
      'style',
      backup.styleAttribute
    );
  }

}