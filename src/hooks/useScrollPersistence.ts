import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY_ROUTE = 'lovable:scroll:route';

type PositionsMap = Record<string, number>;

function safeReadPositions(storageKey: string): PositionsMap {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as PositionsMap) : {};
  } catch {
    return {};
  }
}

function safeWritePositions(storageKey: string, map: PositionsMap) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function getMainScrollContainer(): HTMLElement | null {
  // Layout uses this selector as the primary scroll area for most routes
  return document.querySelector('main.custom-scrollbar') as HTMLElement | null;
}

/**
 * Persist scroll positions for a specific scroll container.
 *
 * NOTE: Pass a unique `storageKey` per container (e.g. "quantlab:left" / "quantlab:right")
 * if you want multiple independent scroll areas on the same route.
 */
export function useScrollPersistence(
  scrollContainerRef?: React.RefObject<HTMLElement>,
  storageKey: string = STORAGE_KEY_ROUTE
) {
  const location = useLocation();
  const previousPath = useRef<string | null>(null);
  const scrollPositions = useRef<PositionsMap>({});

  // Load once
  useEffect(() => {
    scrollPositions.current = safeReadPositions(storageKey);
  }, [storageKey]);

  const getContainer = useCallback(() => {
    return scrollContainerRef?.current || getMainScrollContainer();
  }, [scrollContainerRef]);

  const saveScrollPosition = useCallback(() => {
    const container = getContainer();
    if (!container) return;

    const key = previousPath.current;
    if (!key) return;

    scrollPositions.current[key] = container.scrollTop;
    safeWritePositions(storageKey, scrollPositions.current);
  }, [getContainer, storageKey]);

  const restoreScrollPosition = useCallback(() => {
    const container = getContainer();
    if (!container) return;

    const saved = scrollPositions.current[location.pathname];
    if (saved === undefined) return;

    requestAnimationFrame(() => {
      container.scrollTop = saved;
    });
  }, [getContainer, location.pathname]);

  useEffect(() => {
    saveScrollPosition();
    previousPath.current = location.pathname;
    restoreScrollPosition();
  }, [location.pathname, restoreScrollPosition, saveScrollPosition]);

  // Save on pagehide (works better than beforeunload on mobile)
  useEffect(() => {
    const handlePageHide = () => {
      const container = getContainer();
      if (!container) return;
      scrollPositions.current[location.pathname] = container.scrollTop;
      safeWritePositions(storageKey, scrollPositions.current);
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [getContainer, location.pathname, storageKey]);

  return { saveScrollPosition, restoreScrollPosition };
}

/**
 * Global scroll persistence for the main layout scroll area.
 * Skips routes where the layout is intentionally non-scrollable (e.g. QuantLab split scroll).
 */
export function useGlobalScrollPersistence() {
  const location = useLocation();
  const previousPath = useRef<string | null>(null);
  const scrollPositions = useRef<PositionsMap>({});

  useEffect(() => {
    scrollPositions.current = safeReadPositions(STORAGE_KEY_ROUTE);
  }, []);

  useEffect(() => {
    const main = getMainScrollContainer();
    if (!main) return;

    const isMainScrollable =
      getComputedStyle(main).overflowY !== 'hidden' && main.scrollHeight > main.clientHeight;

    // If this route uses split scrolling, don't fight the page's internal scroll containers.
    if (!isMainScrollable) {
      previousPath.current = location.pathname;
      return;
    }

    // save previous
    if (previousPath.current && previousPath.current !== location.pathname) {
      scrollPositions.current[previousPath.current] = main.scrollTop;
      safeWritePositions(STORAGE_KEY_ROUTE, scrollPositions.current);
    }

    previousPath.current = location.pathname;

    // restore current
    const saved = scrollPositions.current[location.pathname];
    if (saved !== undefined && saved > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          main.scrollTop = saved;
        });
      });
    }
  }, [location.pathname]);

  useEffect(() => {
    const handlePageHide = () => {
      const main = getMainScrollContainer();
      if (!main) return;
      const isMainScrollable =
        getComputedStyle(main).overflowY !== 'hidden' && main.scrollHeight > main.clientHeight;
      if (!isMainScrollable) return;

      scrollPositions.current[location.pathname] = main.scrollTop;
      safeWritePositions(STORAGE_KEY_ROUTE, scrollPositions.current);
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [location.pathname]);
}
