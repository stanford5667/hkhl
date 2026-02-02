import { Link, LinkProps } from 'react-router-dom';
import { forwardRef, useCallback, useRef } from 'react';
import { preloadRoute } from '@/lib/routePreloader';

interface PrefetchLinkProps extends LinkProps {
  prefetch?: boolean;
}

/**
 * Link component that prefetches route on hover
 * Improves perceived navigation speed
 */
export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ prefetch = true, to, onMouseEnter, onFocus, ...props }, ref) => {
    const prefetched = useRef(false);

    const handlePrefetch = useCallback(() => {
      if (!prefetch || prefetched.current) return;
      
      const path = typeof to === 'string' ? to : to.pathname;
      if (path) {
        prefetched.current = true;
        preloadRoute(path);
      }
    }, [to, prefetch]);

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        handlePrefetch();
        onMouseEnter?.(e);
      },
      [handlePrefetch, onMouseEnter]
    );

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLAnchorElement>) => {
        handlePrefetch();
        onFocus?.(e);
      },
      [handlePrefetch, onFocus]
    );

    return (
      <Link
        ref={ref}
        to={to}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);

PrefetchLink.displayName = 'PrefetchLink';
