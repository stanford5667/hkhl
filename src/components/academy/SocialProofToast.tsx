import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Users } from 'lucide-react';

const NAMES = [
  'Sarah M.', 'Alex T.', 'Jordan L.', 'Taylor R.', 'Morgan K.',
  'Casey P.', 'Riley N.', 'Drew S.', 'Jamie H.', 'Quinn B.',
  'Avery D.', 'Parker W.', 'Cameron F.', 'Blake G.', 'Peyton J.'
];

const LOCATIONS = [
  'New York', 'London', 'Singapore', 'Sydney', 'Toronto',
  'Dubai', 'Hong Kong', 'San Francisco', 'Chicago', 'Boston'
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDelay(): number {
  // Random delay between 15-45 seconds
  return 15000 + Math.random() * 30000;
}

export function useSocialProofToasts(enabled = true) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    mountedRef.current = true;

    const showToast = () => {
      if (!mountedRef.current) return;

      const name = getRandomItem(NAMES);
      const location = getRandomItem(LOCATIONS);
      const minutesAgo = Math.floor(Math.random() * 10) + 1;

      toast.custom(
        (t) => (
          <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 shadow-lg max-w-sm">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {name} from {location}
              </p>
              <p className="text-xs text-muted-foreground">
                just enrolled • {minutesAgo}m ago
              </p>
            </div>
          </div>
        ),
        {
          duration: 4000,
          position: 'bottom-left',
        }
      );

      // Schedule next toast
      timeoutRef.current = setTimeout(showToast, getRandomDelay());
    };

    // Initial delay before first toast (10-20 seconds)
    timeoutRef.current = setTimeout(showToast, 10000 + Math.random() * 10000);

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled]);
}
