import { lazy, Suspense, useState, useCallback } from 'react';
import { motion, type Easing } from 'framer-motion';
import { Zap, Database, GraduationCap, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { AuthGateDialog } from '@/components/auth/AuthGateDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { retryWithBackoff } from '@/utils/retryWithBackoff';
import { DEFAULT_ADVANCED_PARAMS } from '@/lib/backtesting/types';

const VisualStrategyBuilder = lazy(() => import('@/components/builder/VisualStrategyBuilder').then(m => ({ default: m.VisualStrategyBuilder })));

const ease: Easing = [0.16, 1, 0.3, 1];

const features = [
  {
    icon: Zap,
    iconColor: 'text-[hsl(185_80%_55%)]',
    glowBg: 'bg-[hsl(185_80%_50%/0.1)]',
    borderColor: 'border-[hsl(185_80%_50%/0.2)]',
    title: 'Lightning-Fast Backtesting',
    text: 'Validate your edge across decades of market history in seconds.',
  },
  {
    icon: Database,
    iconColor: 'text-[hsl(270_70%_65%)]',
    glowBg: 'bg-[hsl(270_70%_55%/0.1)]',
    borderColor: 'border-[hsl(270_70%_55%/0.2)]',
    title: 'Institutional-Grade Data',
    text: 'Real-time SEC filings, fundamentals, and earnings — no Bloomberg required.',
  },
  {
    icon: GraduationCap,
    iconColor: 'text-[hsl(40_90%_60%)]',
    glowBg: 'bg-[hsl(40_90%_55%/0.1)]',
    borderColor: 'border-[hsl(40_90%_55%/0.2)]',
    title: 'Learn from the Pros',
    text: '90+ lesson masterclass from a Private Equity investor.',
  },
];

const statItems = [
  { number: '10,000+', label: 'Equities & ETFs' },
  { number: '30+', label: 'Years of Data' },
  { number: 'Real-Time', label: 'SEC Filings' },
];

export function ResearchMarketingSection() {
  const { user } = useAuth();
  const { requireAuth, showAuthDialog, closeAuthDialog } = useRequireAuth();

  if (user) return null;

  return (
    <>
      <section className="relative overflow-hidden bg-[#050911]">
        {/* Top fade from hero */}
        <div className="absolute top-0 left-0 right-0 h-16 sm:h-24 bg-gradient-to-b from-[#050911] to-transparent pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-24 pb-12 sm:pb-24">
          {/* Section label */}
          <motion.div
            className="text-left sm:text-center mb-8 sm:mb-14"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
          >
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.2em] sm:tracking-[0.25em] text-white/20">
              Why investors choose us
            </span>
          </motion.div>

          {/* Feature Cards — horizontal scroll on mobile, grid on desktop */}
          <div className="mb-12 sm:mb-20">
            {/* Mobile: horizontal scroll */}
            <div className="sm:hidden -mx-4 px-4">
              <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">
                {features.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-20px' }}
                    transition={{ duration: 0.4, delay: i * 0.08, ease }}
                    className="snap-start shrink-0 w-[75vw] max-w-[280px] group relative rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 transition-all duration-300 active:bg-white/[0.04]"
                  >
                    <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${f.glowBg} border ${f.borderColor} mb-3`}>
                      <f.icon className={`w-4 h-4 ${f.iconColor}`} />
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1 tracking-tight">{f.title}</h3>
                    <p className="text-white/35 text-xs leading-relaxed">{f.text}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Desktop: 3-col grid */}
            <div className="hidden sm:grid sm:grid-cols-3 gap-5">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease }}
                  className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-7 transition-all duration-500 hover:-translate-y-1 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
                >
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${f.glowBg} border ${f.borderColor} mb-4 transition-transform duration-300 group-hover:scale-110`}>
                    <f.icon className={`w-4.5 h-4.5 ${f.iconColor}`} />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1.5 tracking-tight">{f.title}</h3>
                  <p className="text-white/35 text-sm leading-relaxed">{f.text}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Live Backtester */}
          <motion.div
            className="mb-12 sm:mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease }}
          >
            <p className="text-left sm:text-center text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.2em] sm:tracking-[0.25em] text-white/20 mb-4 sm:mb-6">
              Try it yourself
            </p>
            <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-white/[0.08] bg-card">
              <Suspense fallback={
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-white/30" />
                </div>
              }>
                <StrategyBacktester ticker="SPY" companyName="SPDR S&P 500 ETF Trust" />
              </Suspense>
            </div>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            className="flex flex-row items-center justify-between sm:justify-center gap-4 sm:gap-14 py-8 sm:py-12 border-y border-white/[0.06]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease }}
          >
            {statItems.map((s) => (
              <div key={s.label} className="text-center flex-1 sm:flex-none">
                <div className="text-xl sm:text-4xl font-bold text-white tracking-tight font-mono">{s.number}</div>
                <div className="text-[9px] sm:text-xs text-white/25 mt-1 sm:mt-1.5 font-mono uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Final CTA */}
          <motion.div
            className="text-center pt-10 sm:pt-18 pb-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
          >
            <p className="text-lg sm:text-2xl md:text-3xl font-bold text-white mb-1.5 sm:mb-2 tracking-tight">
              Start free. Scale when you're ready.
            </p>
            <p className="text-[11px] sm:text-sm text-white/25 mb-6 sm:mb-8 max-w-sm mx-auto font-mono">
              No credit card required. Full access to backtesting, screening, and AI analysis.
            </p>
            <Button
              onClick={() => requireAuth(() => {}, 'signup')}
              size="xl"
              className="w-full sm:w-auto bg-[hsl(185_80%_50%)] hover:bg-[hsl(185_80%_55%)] active:bg-[hsl(185_80%_60%)] text-black font-semibold shadow-[0_0_30px_hsl(185_80%_50%/0.25)] sm:shadow-[0_0_40px_hsl(185_80%_50%/0.3)] hover:shadow-[0_0_60px_hsl(185_80%_50%/0.45)] transition-all duration-300 text-sm sm:text-base px-8 sm:px-14 py-3 sm:py-3 group"
            >
              Start Building for Free
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </motion.div>
        </div>

        {/* Bottom fade to page bg */}
        <div className="absolute bottom-0 left-0 right-0 h-16 sm:h-20 bg-gradient-to-b from-transparent to-background pointer-events-none" />
      </section>

      <AuthGateDialog open={showAuthDialog} onOpenChange={closeAuthDialog} />
    </>
  );
}
