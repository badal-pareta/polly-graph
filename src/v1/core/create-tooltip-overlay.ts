import { TooltipInteractionConfig } from '../contracts/graph-config.interface';
import { resolveTooltipPosition } from '../utils/resolve-tooltip-position';

export interface TooltipOverlayInstance {
  show(content: string, target: SVGCircleElement, event: MouseEvent): void;
  move(target: SVGCircleElement): void;
  hide(): void;
  destroy(): void;
}

interface CreateTooltipOverlayParams {
  readonly container: HTMLElement;
  readonly tooltipConfig?: TooltipInteractionConfig;
}

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export function createTooltipOverlay(params: CreateTooltipOverlayParams): TooltipOverlayInstance {
  const tooltip: HTMLDivElement = document.createElement('div');
  const arrow: HTMLDivElement = document.createElement('div');
  const contentWrapper: HTMLDivElement = document.createElement('div');
  const appendTarget: HTMLElement = document.body;

  let activePlacement: TooltipPlacement | null = null;

  const theme: string = params.tooltipConfig?.theme ?? 'dark';

  tooltip.className = `graph-tooltip graph-tooltip--${theme}`;
  arrow.className = 'graph-tooltip__arrow';
  contentWrapper.className = 'graph-tooltip__content';

  tooltip.appendChild(arrow);
  tooltip.appendChild(contentWrapper);
  appendTarget.appendChild(tooltip);

  function show(content: string, target: SVGCircleElement, event: MouseEvent): void {
    contentWrapper.innerHTML = content;

    tooltip.classList.add('graph-tooltip--visible');

    const targetRect: DOMRect = target.getBoundingClientRect();

    const tooltipRect: DOMRect = tooltip.getBoundingClientRect();
    const gap: number = 12;

    const resolvedPosition = resolveTooltipPosition({
      targetRect,
      tooltipRect,
      gap,
      cursorX: event.clientX,
      cursorY: event.clientY,
      placement: params.tooltipConfig?.placement ?? 'auto'
      });

    activePlacement = resolvedPosition.placement;

    tooltip.style.left = `${resolvedPosition.left}px`;
    tooltip.style.top = `${resolvedPosition.top}px`;

    updateArrowPlacement(resolvedPosition.placement);
  }

  function move(target: SVGCircleElement): void {
    if (!activePlacement) { return; }

    const targetRect: DOMRect = target.getBoundingClientRect();
    const tooltipRect: DOMRect = tooltip.getBoundingClientRect();
    const gap: number = 12;

    const resolvedPosition = resolveTooltipPosition({
      targetRect,
      tooltipRect,
      gap,
      cursorX: targetRect.left + targetRect.width / 2,
      cursorY: targetRect.top + targetRect.height / 2,
      placement: activePlacement
      });

    tooltip.style.left = `${resolvedPosition.left}px`;
    tooltip.style.top = `${resolvedPosition.top}px`;
  }

  function updateArrowPlacement(placement: TooltipPlacement): void {
    arrow.className = `graph-tooltip__arrow graph-tooltip__arrow--${placement}`;
  }

  function hide(): void {
    activePlacement = null;
    tooltip.classList.remove('graph-tooltip--visible');
  }

  function destroy(): void {
    tooltip.remove();
  }

  return { show, move, hide, destroy };
}