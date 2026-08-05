import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './useCountUp';

/**
 * Streams `text` in character by character, the way a model emits tokens.
 * Switching `text` cancels the in-flight stream and restarts from empty, so two
 * streams can never overlap. Renders the full string instantly under
 * prefers-reduced-motion (or when `active` is false).
 */
export function useStreamingText(text: string, active = true, charsPerSecond = 70) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(reduced || !active ? text : '');
  const rafRef = useRef<number>();

  useEffect(() => {
    if (reduced || !active) {
      setShown(text);
      return;
    }
    setShown('');
    const start = performance.now();
    const tick = (now: number) => {
      const chars = Math.floor(((now - start) / 1000) * charsPerSecond);
      if (chars >= text.length) {
        setShown(text);
        return;
      }
      setShown(text.slice(0, chars));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text, active, reduced, charsPerSecond]);

  return { shown, done: shown.length >= text.length };
}
