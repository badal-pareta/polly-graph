import { select } from 'd3-selection';
import {
  zoom,
  ZoomBehavior,
} from 'd3-zoom';
import {
  ZoomConfig,
  ZoomResult,
} from '../contracts/zoom.interface';

export function createZoom({
  svg,
  root,
  scaleExtent = [0.01, 10],
}: ZoomConfig): ZoomResult {
  const svgSelection =
    select<SVGSVGElement, unknown>(svg);

  const rootSelection =
    select<SVGGElement, unknown>(root);

  const behavior: ZoomBehavior<
    SVGSVGElement,
    unknown
  > = zoom<SVGSVGElement, unknown>()
    .scaleExtent(scaleExtent)

    /**
     * Important:
     * allow wheel zoom always
     */
    .filter(
      (event: Event): boolean => {
        if (event instanceof WheelEvent) {
          event.preventDefault();
          return true;
        }

        /**
         * Left click drag for pan
         */
        if (
          event instanceof MouseEvent &&
          event.type === 'mousedown' &&
          event.button === 0
        ) {
          const target =
            event.target as Element;

          /**
           * Do not hijack node drag
           */
          return !target.closest(
            '.nodes',
          );
        }

        return false;
      },
    )

    .on(
      'zoom',
      (event): void => {
        rootSelection.attr(
          'transform',
          event.transform.toString(),
        );
      },
    );

  /**
   * Required for trackpads
   */
  svg.style.touchAction = 'none';

  svgSelection.call(behavior);

  return {
    behavior,

    cleanup: (): void => {
      svgSelection.on(
        '.zoom',
        null,
      );
    },
  };
}