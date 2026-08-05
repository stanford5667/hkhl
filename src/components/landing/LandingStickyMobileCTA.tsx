import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * Mobile-only sticky conversion bar. Appears once the visitor scrolls past the
 * hero and hides again when the bottom CTA section is on screen.
 */
export function LandingStickyMobileCTA({ hideWhenVisibleId = 'landing-bottom-cta' }: { hideWhenVisibleId?: string }) {
  const navigate = useNavigate();
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [bottomCtaVisible, setBottomCtaVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolledPastHero(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = document.getElementById(hideWhenVisibleId);
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setBottomCtaVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hideWhenVisibleId]);

  const show = scrolledPastHero && !bottomCtaVisible;
  if (!show) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/95 px-4 pt-3 backdrop-blur-md sm:hidden"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <Button
        onClick={() => navigate('/auth', { state: { mode: 'signup' } })}
        className="h-12 w-full bg-cyan-400 text-base font-semibold text-black hover:bg-cyan-300"
      >
        Get started free
      </Button>
    </div>
  );
}
