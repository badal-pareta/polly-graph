import { Selection, BaseType, select } from 'd3-selection';
import { LinkStyle } from '../contracts/graph.types';
import { RenderableGraphLink } from '../renderer/links';
import { RenderableLinkLabel } from '../renderer/link-labels';
import { createArrowMarker } from '../core/create-arrow-marker';

/**
 * Enhanced Link Hover Interaction
 * Handles link style changes and ensures link labels are visible on hover.
 */
export function createLinkHover(
  linkSelection: Selection<SVGLineElement, RenderableGraphLink, BaseType, unknown>,
  hoverStyle?: Partial<LinkStyle>
): void {
  // Guard clause for empty selections
  const firstLink = linkSelection.node();
  if (!firstLink) return;

  // Get root for finding visible links if we're dealing with hit areas
  const svgElement = firstLink.ownerSVGElement;
  if (!svgElement) return;
  const root = select<SVGSVGElement, unknown>(svgElement);

  // Store original marker states for proper reset
  const originalMarkers = new Map<SVGLineElement, string | null>();

  // Helper function to clear all hover states
  function clearAllHoverStates(): void {
    // Clear all link hover states
    root.selectAll<SVGLineElement, RenderableGraphLink>('line[data-hovered]')
      .each(function(_d) {
        const linkElement = this as SVGLineElement;
        delete linkElement.dataset.hovered;

        // Only reset styles if not selected
        const isSelected = linkElement.dataset.selected === 'true';
        if (!isSelected) {
          linkElement.style.stroke = '';
          linkElement.style.strokeWidth = '';
          linkElement.style.opacity = '';

          // Reset arrow marker
          const originalMarker = originalMarkers.get(linkElement);
          if (originalMarker !== undefined) {
            if (originalMarker) {
              linkElement.setAttribute('marker-end', originalMarker);
            } else {
              linkElement.removeAttribute('marker-end');
            }
          }
        }
      });

    // Clear all label hover states
    root.select('[data-layer="link-labels"]').selectAll<SVGGElement, RenderableLinkLabel>('.link-label')
      .filter(function(item: RenderableLinkLabel): boolean {
        return item.style.label.visibility === 'hover' &&
               !(this as SVGGElement).classList.contains('label-selection-pinned');
      })
      .style('opacity', 0)
      .style('pointer-events', 'none');
  }

  /**
   * Simple link hover - applies styling when hovering links or their labels
   * Uses data attributes for CSS-based label visibility
   */
  linkSelection
    .on('mouseenter.hover', function (_event: MouseEvent, renderableLink: RenderableGraphLink): void {
      const hoveredElement = this as SVGLineElement;

      // Clear any previous hover states before applying new one
      clearAllHoverStates();

      // If this is a hit area, find the corresponding visible link element
      let targetLinkElement: SVGLineElement;
      if (hoveredElement.classList.contains('link-hit-area')) {
        const visibleLinkNode = root.select('[data-layer="links"]').selectAll<SVGLineElement, RenderableGraphLink>('line:not(.link-hit-area)')
          .filter(d => d.link === renderableLink.link).node();
        if (!visibleLinkNode) return;
        targetLinkElement = visibleLinkNode;
      } else {
        targetLinkElement = hoveredElement;
      }

      // Apply hover styles (no need to mark with data attributes)

      // Store original marker for reset
      if (!originalMarkers.has(targetLinkElement)) {
        originalMarkers.set(targetLinkElement, targetLinkElement.getAttribute('marker-end'));
      }

      if (hoverStyle) {
        // Apply hover styles to the visible link element
        if (hoverStyle.stroke !== undefined) {
          targetLinkElement.style.stroke = hoverStyle.stroke;

          // Update arrow marker color if arrows are enabled
          if (renderableLink.style.arrow.enabled) {
            const hoverMarkerStyle = {
              stroke: hoverStyle.stroke,
              arrow: { fill: hoverStyle.stroke, size: renderableLink.style.arrow.size }
            };
            const hoverMarkerId = createArrowMarker({ svg: svgElement, style: hoverMarkerStyle });
            targetLinkElement.setAttribute('marker-end', `url(#${hoverMarkerId})`);
          }
        }
        if (hoverStyle.strokeWidth !== undefined) {
          targetLinkElement.style.strokeWidth = String(hoverStyle.strokeWidth);
        }
        if (hoverStyle.opacity !== undefined) {
          targetLinkElement.style.opacity = String(hoverStyle.opacity);
        }
      }

      // Show corresponding link labels
      const labelSelection = root.select('[data-layer="link-labels"]').selectAll<SVGGElement, RenderableLinkLabel>('.link-label');
      labelSelection
        .filter(item => item.link === renderableLink.link && item.style.label.visibility === 'hover')
        .style('opacity', 1)
        .style('pointer-events', 'auto');
    })
    .on('mouseleave.hover', function (_event: MouseEvent, renderableLink: RenderableGraphLink): void {
      const hoveredElement = this as SVGLineElement;

      // If this is a hit area, find the corresponding visible link element
      let targetLinkElement: SVGLineElement;
      if (hoveredElement.classList.contains('link-hit-area')) {
        const visibleLinkNode = root.select('[data-layer="links"]').selectAll<SVGLineElement, RenderableGraphLink>('line:not(.link-hit-area)')
          .filter(d => d.link === renderableLink.link).node();
        if (!visibleLinkNode) return;
        targetLinkElement = visibleLinkNode;
      } else {
        targetLinkElement = hoveredElement;
      }

      // Reset hover styles (no data attributes to clean up)

      // Only reset styles if they were set by hover (avoid interfering with selection)
      const isSelected = targetLinkElement.dataset.selected === 'true';
      if (!isSelected) {
        // Reset styles
        targetLinkElement.style.stroke = '';
        targetLinkElement.style.strokeWidth = '';
        targetLinkElement.style.opacity = '';

        // Reset arrow marker
        const originalMarker = originalMarkers.get(targetLinkElement);
        if (originalMarker !== undefined) {
          if (originalMarker) {
            targetLinkElement.setAttribute('marker-end', originalMarker);
          } else {
            targetLinkElement.removeAttribute('marker-end');
          }
        }
      }

      // GLOBAL RESET: Hide ALL hover-only labels that aren't selected
      // This prevents stuck labels when moving between links quickly
      const labelSelection = root.select('[data-layer="link-labels"]').selectAll<SVGGElement, RenderableLinkLabel>('.link-label');
      labelSelection
        .filter(function(item: RenderableLinkLabel): boolean {
          return item.style.label.visibility === 'hover' &&
                 !(this as SVGGElement).classList.contains('label-selection-pinned');
        })
        .style('opacity', 0)
        .style('pointer-events', 'none');
    });

  /**
   * Link label hover - maintains link hover when over labels
   */
  const labelSelection = root.select('[data-layer="link-labels"]').selectAll<SVGGElement, RenderableLinkLabel>('.link-label');

  labelSelection
    .on('mouseenter.link-hover', function(_event, renderableLinkLabel: RenderableLinkLabel) {
      // Find the corresponding link elements and apply hover
      const correspondingHitArea = root.select('[data-layer="links"]').selectAll<SVGLineElement, RenderableGraphLink>('line.link-hit-area')
        .filter(d => d.link === renderableLinkLabel.link);
      const correspondingLink = root.select('[data-layer="links"]').selectAll<SVGLineElement, RenderableGraphLink>('line:not(.link-hit-area)')
        .filter(d => d.link === renderableLinkLabel.link);

      if (correspondingLink.node() && correspondingHitArea.node()) {
        const linkElement = correspondingLink.node()!;
        // const hitAreaElement = correspondingHitArea.node()!; // TODO: Use for future enhancements
        const renderableLink = correspondingLink.datum();

        // Apply hover styles (no data attributes needed)

        // Store original marker if not already stored
        if (!originalMarkers.has(linkElement)) {
          originalMarkers.set(linkElement, linkElement.getAttribute('marker-end'));
        }

        if (hoverStyle) {
          // Apply hover styles to the link element
          if (hoverStyle.stroke !== undefined) {
            linkElement.style.stroke = hoverStyle.stroke;

            // Update arrow marker color if arrows are enabled
            if (renderableLink.style.arrow.enabled) {
              const hoverMarkerStyle = {
                stroke: hoverStyle.stroke,
                arrow: { fill: hoverStyle.stroke, size: renderableLink.style.arrow.size }
              };
              const hoverMarkerId = createArrowMarker({ svg: svgElement, style: hoverMarkerStyle });
              linkElement.setAttribute('marker-end', `url(#${hoverMarkerId})`);
            }
          }
          if (hoverStyle.strokeWidth !== undefined) {
            linkElement.style.strokeWidth = String(hoverStyle.strokeWidth);
          }
          if (hoverStyle.opacity !== undefined) {
            linkElement.style.opacity = String(hoverStyle.opacity);
          }
        }
      }
    })
    .on('mouseleave.link-hover', function(_event, renderableLinkLabel: RenderableLinkLabel) {
      // Find the corresponding link elements and reset hover
      const correspondingHitArea = root.select('[data-layer="links"]').selectAll<SVGLineElement, RenderableGraphLink>('line.link-hit-area')
        .filter(d => d.link === renderableLinkLabel.link);
      const correspondingLink = root.select('[data-layer="links"]').selectAll<SVGLineElement, RenderableGraphLink>('line:not(.link-hit-area)')
        .filter(d => d.link === renderableLinkLabel.link);

      if (correspondingLink.node() && correspondingHitArea.node()) {
        const linkElement = correspondingLink.node()!;
        // const hitAreaElement = correspondingHitArea.node()!; // TODO: Use for future enhancements

        // Reset hover styles (no data attributes to clean up)

        // Only reset styles if not selected
        const isSelected = linkElement.dataset.selected === 'true';
        if (!isSelected) {
          // Reset styles
          linkElement.style.stroke = '';
          linkElement.style.strokeWidth = '';
          linkElement.style.opacity = '';

          // Reset arrow marker
          const originalMarker = originalMarkers.get(linkElement);
          if (originalMarker !== undefined) {
            if (originalMarker) {
              linkElement.setAttribute('marker-end', originalMarker);
            } else {
              linkElement.removeAttribute('marker-end');
            }
          }
        }

        // GLOBAL RESET: Hide ALL hover-only labels that aren't selected
        // This prevents stuck labels when moving between links quickly
        const labelSelection = root.select('[data-layer="link-labels"]').selectAll<SVGGElement, RenderableLinkLabel>('.link-label');
        labelSelection
          .filter(function(item: RenderableLinkLabel): boolean {
            return item.style.label.visibility === 'hover' &&
                   !(this as SVGGElement).classList.contains('label-selection-pinned');
          })
          .style('opacity', 0)
          .style('pointer-events', 'none');
      }
    });
}