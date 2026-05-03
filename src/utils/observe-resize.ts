/**
 * Observes an HTMLElement for size changes.
 * Updated to handle HTMLElements to support the managed root architecture.
 */
export function observeResize(element: HTMLElement, onResize: (width: number, height: number) => void): () => void {
  const observer = new ResizeObserver(
    (entries: ResizeObserverEntry[]): void => {
      const entry: ResizeObserverEntry | undefined = entries[0];

      if (!entry) { return; }

      /**
       * Use borderBoxSize for more accurate container dimensions,
       * falling back to contentRect for older browser compatibility.
       */
      const width = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;

      // Only trigger if dimensions are valid to prevent simulation crashes
      if (width > 0 && height > 0) {
        onResize(width, height);
      }
    },
  );

  observer.observe(element);

  return (): void => {
    observer.disconnect();
  };
}