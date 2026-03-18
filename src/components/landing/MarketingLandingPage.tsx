import { useState, useCallback } from 'react';
import { motion, type Easing } from 'framer-motion';
import { Zap, ChevronRight, Loader2, TrendingUp, GraduationCap, Globe, Play, Clock, Video } from 'lucide-react';
import modIntroImg from '@/assets/modules/mod-intro-investing.jpg';
import modFundImg from '@/assets/modules/mod-fundamental-analysis.jpg';
import modTechImg from '@/assets/modules/mod-technical-analysis.jpg';
import modPortImg from '@/assets/modules/mod-portfolio-construction.jpg';
import modRiskImg from '@/assets/modules/mod-risk-management.jpg';
import modOptsImg from '@/assets/modules/mod-options-derivatives.jpg';
import modMacroImg from '@/assets/modules/mod-macro-economics.jpg';
import modAdvImg from '@/assets/modules/mod-advanced-strategies.jpg';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { AuthGateDialog } from '@/components/auth/AuthGateDialog';
import { useTrendingTickers } from '@/hooks/useTrendingTickers';
import { supabase } from '@/integrations/supabase/client';
import { retryWithBackoff } from '@/utils/retryWithBackoff';
import { DEFAULT_ADVANCED_PARAMS } from '@/lib/backtesting/types';
import { AssetLabsLogo } from '@/components/brand/AssetLabsLogo';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ease: Easing = [0.25, 0.1, 0.25, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease },
  }),
};

const STRATEGY_OPTIONS = [
  { id: 'rsi_oversold_bounce', name: 'RSI Oversold Bounce' },
  { id: 'ma_crossover', name: 'Moving Average Crossover' },
  { id: 'macd_divergence', name: 'MACD Divergence' },
  { id: 'bollinger_reversal', name: 'Bollinger Reversal' },
  { id: 'consecutive_days_reversal', name: 'Consecutive Days Reversal' },
  { id: 'gap_fill', name: 'Gap Fill' },
  { id: 'volume_spike', name: 'Volume Spike' },
  { id: 'volatility_breakout', name: 'Volatility Breakout' },
] as const;

interface BacktestResult {
  totalReturn: number;
  maxDrawdown: number;
  winRate: number;
  sharpeRatio: number;
  portfolioHistory?: { date: string; value: number }[];
}

const SOCIAL_PROOF = [
  { value: '10,000+', label: 'Stocks & ETFs' },
  { value: '30+', label: 'Years of Data' },
  { value: '90+', label: 'Video Lessons' },
  { value: '8', label: 'Strategies' },
];

const WHAT_YOU_GET = [
  {
    icon: Zap,
    title: 'No-Code Backtesting',
    description: 'Validate strategies across decades of market data — no programming required.',
    cta: 'Try it above ↑',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/20 hover:border-cyan-500/40',
    glow: 'hover:shadow-[0_0_24px_hsl(185_80%_50%/0.08)]',
    href: null,
  },
  {
    icon: Globe,
    title: 'Investment Themes',
    description: 'AI-driven macro and sector themes with sentiment scores and related tickers.',
    cta: 'Explore themes',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/20 hover:border-purple-500/40',
    glow: 'hover:shadow-[0_0_24px_hsl(270_70%_55%/0.08)]',
    href: '/investment-heatmap',
  },
  {
    icon: GraduationCap,
    title: 'Academy',
    description: '90+ structured video lessons from fundamentals to advanced portfolio strategy.',
    cta: 'Browse curriculum',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/20 hover:border-amber-500/40',
    glow: 'hover:shadow-[0_0_24px_hsl(38_90%_55%/0.08)]',
    href: '/academy',
  },
];

export function MarketingLandingPage() {
  const { requireAuth, showAuthDialog, closeAuthDialog } = useRequireAuth();
  const { tickers, isLoading: tickersLoading } = useTrendingTickers(20);
  const navigate = useNavigate();

  const [selectedTicker, setSelectedTicker] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BacktestResult | null>(null);

  const runBacktest = useCallback(async () => {
    if (!selectedTicker || !selectedStrategy) {
      toast.error('Select a ticker and strategy first');
      return;
    }
    setIsRunning(true);
    setResults(null);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 3);

      const data = await retryWithBackoff(
        async () => {
          const response = await supabase.functions.invoke('strategy-backtest', {
            body: {
              ticker: selectedTicker,
              strategy: selectedStrategy,
              startDate: format(startDate, 'yyyy-MM-dd'),
              endDate: format(endDate, 'yyyy-MM-dd'),
              initialCapital: 10000,
              params: {},
              advancedParams: DEFAULT_ADVANCED_PARAMS,
            },
          });
          if (response.error) throw response.error;
          if (!response.data?.success) throw new Error(response.data?.error || 'Backtest failed');
          return response.data;
        },
        { maxAttempts: 3, initialDelayMs: 200 }
      );

      setResults({
        totalReturn: data.totalReturn ?? 0,
        maxDrawdown: data.maxDrawdown ?? 0,
        winRate: data.winRate ?? 0,
        sharpeRatio: data.sharpeRatio ?? 0,
        portfolioHistory: data.portfolioHistory ?? [],
      });

      toast.success(`Backtest complete: ${data.totalReturn?.toFixed(2)}% return`);
    } catch (err: any) {
      toast.error(err.message || 'Backtest failed');
    } finally {
      setIsRunning(false);
    }
  }, [selectedTicker, selectedStrategy]);

  const navLinks = ['Features', 'Pricing', 'Learn'];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ─── Top Navigation ─── */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-slate-950/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <AssetLabsLogo size="md" showText showTagline />
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`} className="text-sm text-gray-400 transition hover:text-white">
                {l}
              </a>
            ))}
            <button
              onClick={() => requireAuth(() => {}, 'login')}
              className="text-sm text-gray-400 transition hover:text-white"
            >
              Log In
            </button>
            <Button
              onClick={() => requireAuth(() => {}, 'signup')}
              className="rounded-full bg-cyan-400 px-6 font-semibold text-black hover:bg-cyan-300"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section (Backtest Sandbox) ─── */}
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-8 lg:grid-cols-2 lg:py-24">
        {/* Left column */}
        <motion.div
          className="flex flex-col justify-center"
          initial="hidden"
          animate="visible"
        >
          <motion.h1 variants={fadeUp} custom={0} className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Build AI Investment Strategies in Mins.{' '}
            <span className="text-gray-500">No Coding Required.</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={1} className="mt-6 max-w-lg text-lg text-gray-400">
            Pick a ticker, choose a strategy, and see real backtest results — powered by 30+ years of market data.
          </motion.p>

          {/* Sandbox dropdowns */}
          <motion.div variants={fadeUp} custom={2} className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Select value={selectedTicker} onValueChange={setSelectedTicker}>
              <SelectTrigger className="w-full border-white/10 bg-white/[0.04] text-white sm:w-56">
                <SelectValue placeholder={tickersLoading ? 'Loading tickers…' : 'Step 1: Select Ticker'} />
              </SelectTrigger>
              <SelectContent className="max-h-60 border-white/10 bg-slate-900">
                {tickers.map((t) => (
                  <SelectItem key={t.symbol} value={t.symbol}>
                    {t.symbol} — {t.name?.slice(0, 20)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
              <SelectTrigger className="w-full border-white/10 bg-white/[0.04] text-white sm:w-56">
                <SelectValue placeholder="Step 2: Select Strategy" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-slate-900">
                {STRATEGY_OPTIONS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          <motion.div variants={fadeUp} custom={3} className="mt-6">
            <Button
              onClick={() => requireAuth(runBacktest, 'backtest')}
              disabled={isRunning || !selectedTicker || !selectedStrategy}
              size="lg"
              className="bg-cyan-500 px-10 font-bold text-black shadow-[0_0_30px_hsl(185_80%_50%/0.4)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_40px_hsl(185_80%_50%/0.5)] disabled:opacity-40"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running…
                </>
              ) : (
                '⚡ RUN FREE BACKTEST'
              )}
            </Button>
          </motion.div>
        </motion.div>

        {/* Right column — Results card */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease }}
        >
          <Card className="overflow-hidden border-cyan-500/30 bg-slate-900/80 shadow-[0_0_40px_hsl(185_80%_50%/0.1)]">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-cyan-400" />
                <span className="text-sm font-semibold text-gray-300">Backtest Results Dashboard</span>
              </div>

              {/* Chart area */}
              <div className="mb-6 h-48 w-full rounded-lg bg-slate-800/50">
                {isRunning ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                    <span className="text-sm text-gray-500">Crunching 30+ years of data…</span>
                  </div>
                ) : results?.portfolioHistory?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results.portfolioHistory}>
                      <defs>
                        <linearGradient id="lp-green" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={['dataMin', 'dataMax']} />
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: '#94a3b8' }}
                        formatter={(v: number) => [`$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Value']}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(142 71% 45%)"
                        strokeWidth={2}
                        fill="url(#lp-green)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-600">
                    Run a backtest to see results
                  </div>
                )}
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  {
                    label: 'Total Return',
                    value: results ? `${results.totalReturn >= 0 ? '+' : ''}${results.totalReturn.toFixed(2)}%` : '—',
                    color: results ? (results.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-gray-500',
                  },
                  { label: 'Max Drawdown', value: results ? `${results.maxDrawdown.toFixed(2)}%` : '—', color: 'text-gray-300' },
                  { label: 'Win Rate', value: results ? `${results.winRate.toFixed(1)}%` : '—', color: 'text-gray-300' },
                  { label: 'Sharpe Ratio', value: results ? results.sharpeRatio.toFixed(2) : '—', color: 'text-gray-300' },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg bg-slate-800/60 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">{m.label}</div>
                    <div className={`mt-1 text-lg font-bold ${results ? m.color : 'text-gray-600'}`}>
                      {isRunning ? <Skeleton className="h-6 w-16 bg-slate-700" /> : m.value}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* ─── Social Proof Strip ─── */}
      <section className="border-y border-white/[0.06] bg-slate-900/40">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {SOCIAL_PROOF.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="text-center"
              >
                <div className="text-2xl font-bold text-white sm:text-3xl">{stat.value}</div>
                <div className="mt-1 text-xs text-gray-500 uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── What You Get ─── */}
      <section id="features" className="border-b border-white/[0.04] bg-slate-950 py-16 px-4 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="mb-10 text-center text-2xl font-bold sm:text-3xl"
          >
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
              invest smarter.
            </span>
          </motion.h2>

          <div className="grid gap-5 sm:grid-cols-3">
            {WHAT_YOU_GET.map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                onClick={() => item.href && navigate(item.href)}
                className={`group rounded-xl border bg-slate-900/60 p-6 transition-all ${item.borderColor} ${item.glow} ${item.href ? 'cursor-pointer hover:-translate-y-1' : ''}`}
              >
                <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.05] ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-base font-semibold">{item.title}</h3>
                <p className="mb-4 text-sm leading-relaxed text-gray-400">{item.description}</p>
                <span className={`text-xs font-semibold ${item.color} flex items-center gap-1`}>
                  {item.cta}
                  {item.href && <ChevronRight className="h-3 w-3" />}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA ─── */}
      <section className="bg-slate-950 py-24 px-4 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mx-auto max-w-3xl"
        >
          <Card className="relative overflow-hidden border-slate-800 bg-slate-900/50">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.05] via-transparent to-purple-500/[0.05]" />
            <div className="absolute inset-0 backdrop-blur-[2px]" />
            <CardContent className="relative z-10 flex flex-col items-center px-8 py-14 text-center">
              <motion.p variants={fadeUp} custom={0} className="text-2xl font-bold sm:text-3xl">
                Deep Dive &amp; Customize Signals
              </motion.p>
              <motion.p variants={fadeUp} custom={1} className="mt-2 text-gray-400">
                Create Your Complete Workspace
              </motion.p>
              <motion.div variants={fadeUp} custom={2} className="mt-8">
                <Button
                  onClick={() => requireAuth(() => {}, 'signup')}
                  variant="outline"
                  size="lg"
                  className="border-cyan-500/50 text-white hover:bg-cyan-500/10"
                >
                  Unlock the Full Platform
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      <AuthGateDialog open={showAuthDialog} onOpenChange={closeAuthDialog} />
    </div>
  );
}
