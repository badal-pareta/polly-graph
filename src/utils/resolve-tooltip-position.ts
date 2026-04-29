import { TooltipPlacement } from '../contracts/graph-config.interface';

interface ResolveTooltipPositionParams {
  readonly targetRect: DOMRect;
  readonly tooltipRect: DOMRect;
  readonly placement?: TooltipPlacement;
  readonly gap: number;
  readonly cursorX: number;
  readonly cursorY: number;
}

interface ResolvedTooltipPosition {
  readonly left: number;
  readonly top: number;
  readonly placement: Exclude<TooltipPlacement, 'auto'>;
}

export function resolveTooltipPosition(params: ResolveTooltipPositionParams): ResolvedTooltipPosition {
  const preferredPlacement: TooltipPlacement = params.placement ?? 'auto';
  const resolvedPlacement: Exclude<TooltipPlacement, 'auto'> =
    preferredPlacement === 'auto'
      ? resolveAutoPlacement(params)
      : preferredPlacement;

  const position: ResolvedTooltipPosition = getPositionByPlacement({ ...params, placement: resolvedPlacement });

  return position;
}

function resolveAutoPlacement(params: ResolveTooltipPositionParams): Exclude<TooltipPlacement, 'auto'> {
  const viewportWidth: number = window.innerWidth;
  const viewportHeight: number = window.innerHeight;

  const tooltipWidth: number = params.tooltipRect.width;
  const tooltipHeight: number = params.tooltipRect.height;

  const centerX: number = params.targetRect.left + params.targetRect.width / 2;
  const centerY: number = params.targetRect.top + params.targetRect.height / 2;

  const deltaX: number = params.cursorX - centerX;
  const deltaY: number = params.cursorY - centerY;

  const prefersVertical: boolean =
    Math.abs(deltaY) > Math.abs(deltaX);

  if (prefersVertical) {
    if (
      deltaY < 0 &&
      params.targetRect.top >= tooltipHeight + params.gap
    ) {
      return 'top';
    }

    if (
      deltaY >= 0 &&
      viewportHeight - params.targetRect.bottom >= tooltipHeight + params.gap
    ) {
      return 'bottom';
    }
  }

  if (!prefersVertical) {
    if (
      deltaX >= 0 &&
      viewportWidth - params.targetRect.right >= tooltipWidth + params.gap
    ) {
      return 'right';
    }

    if (
      deltaX < 0 &&
      params.targetRect.left >= tooltipWidth + params.gap
    ) {
      return 'left';
    }
  }

  if (params.targetRect.top >= tooltipHeight + params.gap) {
    return 'top';
  }

  if (viewportWidth - params.targetRect.right >= tooltipWidth + params.gap) {
    return 'right';
  }

  if (params.targetRect.left >= tooltipWidth + params.gap) {
    return 'left';
  }

  if (viewportHeight - params.targetRect.bottom >= tooltipHeight + params.gap) {
    return 'bottom';
  }

  return 'top';
}

function getPositionByPlacement(params: ResolveTooltipPositionParams & { readonly placement: Exclude<TooltipPlacement, 'auto'>; }): ResolvedTooltipPosition {
  const { targetRect, tooltipRect, gap, placement } = params;

  let left: number = 0;
  let top: number = 0;

  if (placement === 'top') {
    left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
    top = targetRect.top - tooltipRect.height - gap;
  }

  if (placement === 'bottom') {
    left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
    top = targetRect.bottom + gap;
  }

  if (placement === 'left') {
    left = targetRect.left - tooltipRect.width - gap;
    top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
  }

  if (placement === 'right') {
    left = targetRect.right + gap;
    top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
  }

  return { left, top, placement };
}