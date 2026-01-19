import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to persist scroll positions across page navigation.
 * Stores scroll position per route and restores it when returning.
 */
export function useScrollPersistence(scrollContainerRef?: React.RefObject<HTMLElement>) {
  const location = useLocation();
  const scrollPositions = useRef<Record<string, number>>({});
  const previousPath = useRef<string | null>(null);

  // Save scroll position before navigating away
  const saveScrollPosition = useCallback(() => {
    const container = scrollContainerRef?.current || document.querySelector('main.overflow-auto');
    if (container && previousPath.current) {
      scrollPositions.current[previousPath.current] = container.scrollTop;
    }
  }, [scrollContainerRef]);

  // Restore scroll position when returning to a page
  const restoreScrollPosition = useCallback(() => {
    const container = scrollContainerRef?.current || document.querySelector('main.overflow-auto');
    if (container) {
      const savedPosition = scrollPositions.current[location.pathname];
      if (savedPosition !== undefined) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          container.scrollTop = savedPosition;
        });
      }
    }
  }, [location.pathname, scrollContainerRef]);

  useEffect(() => {
    // Save the scroll position of the previous page before switching
    saveScrollPosition();

    // Update the previous path
    previousPath.current = location.pathname;

    // Restore scroll position for the new page
    restoreScrollPosition();
  }, [location.pathname, saveScrollPosition, restoreScrollPosition]);

  // Also save on beforeunload for full page refreshes
  useEffect(() => {
    const handleBeforeUnload = () => {
      const container = scrollContainerRef?.current || document.querySelector('main.overflow-auto');
      if (container && location.pathname) {
        try {
          const positions = { ...scrollPositions.current };
          positions[location.pathname] = container.scrollTop;
          sessionStorage.setItem('scrollPositions', JSON.stringify(positions));
        } catch (e) {
          // Ignore storage errors
        }
      }
    };

    // Load from session storage on mount
    try {
      const saved = sessionStorage.getItem('scrollPositions');
      if (saved) {
        scrollPositions.current = JSON.parse(saved);
      }
    } catch (e) {
      // Ignore parse errors
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location.pathname, scrollContainerRef]);

  return { saveScrollPosition, restoreScrollPosition };
}

/**
 * Global scroll persistence for the main layout
 */
export function useGlobalScrollPersistence() {
  const location = useLocation();
  const scrollPositions = useRef<Record<string, number>>({});

  // Load from session storage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('globalScrollPositions');
      if (saved) {
        scrollPositions.current = JSON.parse(saved);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, []);

  // Save current page's scroll position and restore the new page's
  useEffect(() => {
    const mainContainer = document.querySelector('main.overflow-auto');
    if (!mainContainer) return;

    // Get the previous path from a data attribute we'll set
    const previousPath = mainContainer.getAttribute('data-current-path');

    // Save the previous page's scroll position
    if (previousPath && previousPath !== location.pathname) {
      scrollPositions.current[previousPath] = mainContainer.scrollTop;
      
      // Persist to session storage
      try {
        sessionStorage.setItem('globalScrollPositions', JSON.stringify(scrollPositions.current));
      } catch (e) {
        // Ignore storage errors
      }
    }

    // Set the current path
    mainContainer.setAttribute('data-current-path', location.pathname);

    // Restore scroll position for the new page (after a short delay for content to render)
    const savedPosition = scrollPositions.current[location.pathname];
    if (savedPosition !== undefined && savedPosition > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          mainContainer.scrollTop = savedPosition;
        });
      });
    }
  }, [location.pathname]);

  // Save on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const mainContainer = document.querySelector('main.overflow-auto');
      if (mainContainer) {
        scrollPositions.current[location.pathname] = mainContainer.scrollTop;
        try {
          sessionStorage.setItem('globalScrollPositions', JSON.stringify(scrollPositions.current));
        } catch (e) {
          // Ignore storage errors
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location.pathname]);
}
