import { BaseType, Selection } from 'd3-selection';
import { GraphNode } from '../contracts/graph.types';
import { TooltipInteractionConfig } from '../contracts/graph-config.interface';
import { createTooltipOverlay, TooltipOverlayInstance } from '../core/create-tooltip-overlay';

interface BindNodeTooltipParams {
  readonly container: HTMLElement;
  readonly selection: Selection<SVGCircleElement, GraphNode, BaseType, unknown>;
  readonly tooltipConfig?: TooltipInteractionConfig;
}

export interface NodeTooltipBinding {
  destroy(): void;
  reposition(): void;
}

export function bindNodeTooltip(params: BindNodeTooltipParams): NodeTooltipBinding {
  if (!params.tooltipConfig?.enabled) {
    return {
      destroy: (): void => {},
      reposition: (): void => {}
    };
  }

  const tooltip: TooltipOverlayInstance = createTooltipOverlay({ container: params.container, tooltipConfig: params.tooltipConfig });

  let activeTarget: SVGCircleElement | null = null;

  params.selection
    .on( 'mouseenter.tooltip',
      function (event: MouseEvent, node: GraphNode): void {
        const target: SVGCircleElement = this as SVGCircleElement;
        activeTarget = target;
        const customContent: string | undefined = params.tooltipConfig?.renderContent?.(node);
        const content: string = customContent ?? getDefaultContent(node);
        tooltip.show(content, target, event);
      }
    )
    .on('mousemove.tooltip',
      function (): void {
        const target: SVGCircleElement = this as SVGCircleElement;
        activeTarget = target;
        tooltip.move(target);
      }
    )
    .on('mouseleave.tooltip',
      function (): void {
        activeTarget = null;
        tooltip.hide();
      }
    );

  function reposition(): void {
    if (!activeTarget) { return; }
    tooltip.move(activeTarget);
  }

  function destroy(): void {
    activeTarget = null;
    params.selection.on('.tooltip', null);
    tooltip.destroy();
  }

  return { destroy, reposition };
}

function getDefaultContent(node: GraphNode): string {
  return `
    <div class="graph-tooltip__type">
      ${node.type ?? 'Node'}
    </div>

    <div class="graph-tooltip__label">
      ${node.label ?? node.id}
    </div>
  `;
}