import { lazy, Suspense, useState, useCallback } from 'react';
import { motion, type Easing } from 'framer-motion';
import { ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
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


const statItems = [
  { number: '10,000+', label: 'Equities & ETFs' },
  { number: '30+', label: 'Years of Data' },
  { number: 'Real-Time', label: 'SEC Filings' },
];

export function ResearchMarketingSection() {
  const { user } = useAuth();
  const { requireAuth, showAuthDialog, closeAuthDialog } = useRequireAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ticker = 'SPY';

  const handleBacktest = useCallback(async (serialized: { 
    strategy: string; 
    ticker: string; 
    params: Record<string, number | string | undefined> 
  }) => {
    setIsRunning(true);
    setError(null);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 3);

      const data = await retryWithBackoff(
        async () => {
          const response = await supabase.functions.invoke('strategy-backtest', {
            body: {
              ticker,
              strategy: serialized.strategy,
              startDate: format(startDate, 'yyyy-MM-dd'),
              endDate: format(endDate, 'yyyy-MM-dd'),
              initialCapital: 10000,
              params: serialized.params,
              advancedParams: DEFAULT_ADVANCED_PARAMS,
            }
          });

          if (response.error) throw response.error;
          if (!response.data.success) throw new Error(response.data.error || 'Backtest failed');
          return response.data;
        },
        { maxAttempts: 3, initialDelayMs: 200 }
      );

      toast.success(`Backtest complete: ${data.totalTrades} trades, ${data.totalReturn.toFixed(2)}% return`);

      return {
        totalReturn: data.totalReturn || 0,
        winRate: data.winRate || 0,
        totalTrades: data.totalTrades || 0,
        sharpeRatio: data.sharpeRatio || 0,
        maxDrawdown: data.maxDrawdown || 0,
        avgWin: data.avgWin || 0,
        avgLoss: data.avgLoss || 0,
        profitFactor: data.profitFactor || 0,
        avgHoldingDays: data.avgHoldingDays || 0,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Backtest failed';
      setError(message);
      toast.error(message);
      return undefined;
    } finally {
      setIsRunning(false);
    }
  }, []);

  if (user) return null;

  return (
    <>
      <section className="relative overflow-hidden bg-[#050911]">
        {/* Top fade from hero */}
        <div className="absolute top-0 left-0 right-0 h-16 sm:h-24 bg-gradient-to-b from-[#050911] to-transparent pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-24 pb-12 sm:pb-24">

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
                <VisualStrategyBuilder
                  embedded
                  initialTicker={ticker}
                  onRunBacktest={(s) => {
                    // Store strategy params so we can resume after auth
                    sessionStorage.setItem('pending-backtest-params', JSON.stringify(s));
                    return requireAuth(() => handleBacktest(s), 'run-backtest') as any;
                  }}
                />
              </Suspense>
              {error && (
                <div className="px-4 pb-4">
                  <Card className="border-destructive/30 bg-destructive/5">
                    <CardContent className="py-3">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">{error}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              {isRunning && (
                <div className="px-4 pb-4">
                  <Card>
                    <CardContent className="py-6 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      <p className="text-sm text-muted-foreground">Running backtest on {ticker}...</p>
                    </CardContent>
                  </Card>
                </div>
              )}
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
