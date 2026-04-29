export function observeResize(
  element: SVGSVGElement,
  onResize: (
    width: number,
    height: number,
  ) => void,
): () => void {
  const observer = new ResizeObserver(
    (
      entries: ResizeObserverEntry[],
    ): void => {
      const entry:
        | ResizeObserverEntry
        | undefined =
        entries[0];

      if (!entry) {
        return;
      }

      onResize(
        entry.contentRect.width,
        entry.contentRect.height,
      );
    },
  );

  observer.observe(element);

  return (): void => {
    observer.disconnect();
  };
}