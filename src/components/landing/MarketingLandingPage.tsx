import { useState, useCallback } from 'react';
import { motion, type Easing } from 'framer-motion';
import { Zap, Database, Brain, ChevronRight, Loader2, TrendingUp, GraduationCap, Play, Clock, Users, Globe, BookOpen, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { AuthGateDialog } from '@/components/auth/AuthGateDialog';
import { useTrendingTickers } from '@/hooks/useTrendingTickers';
import { supabase } from '@/integrations/supabase/client';
import { retryWithBackoff } from '@/utils/retryWithBackoff';
import { DEFAULT_ADVANCED_PARAMS } from '@/lib/backtesting/types';
import { AssetLabsLogo } from '@/components/brand/AssetLabsLogo';
import { TickerCarousel } from '@/components/research/TickerCarousel';
import { MARKET_THEMES } from '@/data/marketThemes';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

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

const features = [
  {
    icon: Zap,
    color: 'text-cyan-400',
    glow: 'shadow-[0_0_20px_hsl(185_80%_50%/0.3)]',
    title: 'Powerful AI Backtesting',
    text: 'Validate your edge across decades of market history with no coding.',
  },
  {
    icon: Database,
    color: 'text-purple-400',
    glow: 'shadow-[0_0_20px_hsl(270_70%_55%/0.3)]',
    title: 'Curated Datasets',
    text: 'Instant access to institutional-grade financial and alternative data.',
  },
  {
    icon: Brain,
    color: 'text-amber-400',
    glow: 'shadow-[0_0_20px_hsl(38_90%_55%/0.3)]',
    title: 'AI Insights',
    text: 'Get instant, actionable market context with AI predictions.',
  },
];

interface BacktestResult {
  totalReturn: number;
  maxDrawdown: number;
  winRate: number;
  sharpeRatio: number;
  portfolioHistory?: { date: string; value: number }[];
}

// Pick top 6 themes for the landing page preview
const PREVIEW_THEMES = MARKET_THEMES.slice(0, 6);

export function MarketingLandingPage() {
  const { requireAuth, showAuthDialog, closeAuthDialog } = useRequireAuth();
  const { tickers, isLoading: tickersLoading } = useTrendingTickers(20);
  const navigate = useNavigate();

  const [selectedTicker, setSelectedTicker] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BacktestResult | null>(null);

  // Fetch course modules (sections) for Academy preview
  const { data: modules } = useQuery({
    queryKey: ['landing-modules'],
    queryFn: async () => {
      const { data } = await supabase
        .from('course_modules')
        .select(`
          id, title, description, order_index,
          course:courses!inner(id, title, is_published),
          lessons:course_lessons(id)
        `)
        .eq('courses.is_published', true)
        .order('order_index', { ascending: true })
        .limit(8);
      return (data || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        orderIndex: m.order_index,
        courseTitle: m.course?.title,
        courseId: m.course?.id,
        lessonCount: m.lessons?.length ?? 0,
      }));
    },
    staleTime: 10 * 60 * 1000,
  });

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
          <motion.h1 variants={fadeUp} custom={0} className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
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

      {/* ─── Trending Tickers (Live) ─── */}
      <section className="border-t border-white/[0.04] bg-slate-950 py-16 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mb-8"
          >
            <motion.div variants={fadeUp} custom={0} className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              <h2 className="text-2xl font-bold sm:text-3xl">Trending Now</h2>
              <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400 bg-cyan-500/5">
                LIVE
              </Badge>
            </motion.div>
            <motion.p variants={fadeUp} custom={1} className="text-gray-400">
              Real-time market movers tracked across 10,000+ equities and ETFs.
            </motion.p>
          </motion.div>

          {tickersLoading ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-60 shrink-0 rounded-xl bg-slate-800" />
              ))}
            </div>
          ) : (
            <TickerCarousel
              tickers={tickers.map((t) => ({
                symbol: t.symbol,
                name: t.name,
                price: t.price,
                changePercent: t.changePercent,
                marketCap: t.marketCap ?? undefined,
              }))}
              onTickerClick={(symbol) => navigate(`/stock/${symbol}`)}
            />
          )}
        </div>
      </section>

      {/* ─── Investment Themes ─── */}
      <section className="border-t border-white/[0.04] bg-slate-950 py-16 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mb-8"
          >
            <motion.div variants={fadeUp} custom={0} className="flex items-center gap-3 mb-2">
              <Globe className="h-5 w-5 text-purple-400" />
              <h2 className="text-2xl font-bold sm:text-3xl">Investment Themes</h2>
            </motion.div>
            <motion.p variants={fadeUp} custom={1} className="text-gray-400">
              Macro and micro themes shaping global markets — with AI-driven sentiment and related tickers.
            </motion.p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PREVIEW_THEMES.map((theme, i) => {
              const isBullish = theme.sentimentScore > 0.6;
              const isBearish = theme.sentimentScore < 0.4;
              const sentimentColor = isBullish ? 'text-emerald-500' : isBearish ? 'text-rose-500' : 'text-amber-500';
              const sentimentBg = isBullish ? 'bg-emerald-500/10' : isBearish ? 'bg-rose-500/10' : 'bg-amber-500/10';
              const Icon = theme.icon;

              return (
                <motion.div
                  key={theme.id}
                  variants={fadeUp}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-40px' }}
                  onClick={() => navigate('/investment-heatmap')}
                  className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition-all hover:-translate-y-1 hover:border-slate-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-slate-800 text-gray-400 border-0">
                        {theme.category}
                      </Badge>
                    </div>
                    <span className={cn('text-xs font-semibold', sentimentColor)}>
                      {theme.impactPercent > 0 ? '+' : ''}{theme.impactPercent.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn('p-2 rounded-lg shrink-0', sentimentBg, sentimentColor)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold leading-snug line-clamp-2">{theme.title}</h3>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
                    {theme.summary}
                  </p>

                  {/* Ticker pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {theme.tickers.slice(0, 4).map((t) => (
                      <span
                        key={t.symbol}
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-gray-300"
                      >
                        {t.symbol}
                      </span>
                    ))}
                    {theme.tickers.length > 4 && (
                      <span className="text-[10px] text-gray-600 px-1.5 py-0.5">
                        +{theme.tickers.length - 4}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <Button
              variant="outline"
              onClick={() => navigate('/investment-heatmap')}
              className="border-purple-500/30 text-gray-300 hover:bg-purple-500/10 hover:text-white"
            >
              Explore All Themes
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Academy Preview — Course Sections ─── */}
      <section className="border-t border-white/[0.04] bg-slate-950 py-16 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mb-8"
          >
            <motion.div variants={fadeUp} custom={0} className="flex items-center gap-3 mb-2">
              <GraduationCap className="h-5 w-5 text-amber-400" />
              <h2 className="text-2xl font-bold sm:text-3xl">Learn from the Pros</h2>
            </motion.div>
            <motion.p variants={fadeUp} custom={1} className="text-gray-400">
              90+ lessons across structured modules — from fundamentals to advanced portfolio strategy.
            </motion.p>
          </motion.div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(modules && modules.length > 0 ? modules : [
              { id: '1', title: 'Introduction to Investing', description: 'Core concepts and mindset', orderIndex: 1, courseTitle: 'Masterclass', courseId: null, lessonCount: 8 },
              { id: '2', title: 'Fundamental Analysis', description: 'Reading financial statements', orderIndex: 2, courseTitle: 'Masterclass', courseId: null, lessonCount: 12 },
              { id: '3', title: 'Technical Analysis', description: 'Charts, indicators, and patterns', orderIndex: 3, courseTitle: 'Masterclass', courseId: null, lessonCount: 15 },
              { id: '4', title: 'Portfolio Construction', description: 'Building a diversified portfolio', orderIndex: 4, courseTitle: 'Masterclass', courseId: null, lessonCount: 10 },
              { id: '5', title: 'Risk Management', description: 'Protecting your downside', orderIndex: 5, courseTitle: 'Masterclass', courseId: null, lessonCount: 9 },
              { id: '6', title: 'Options & Derivatives', description: 'Hedging and income strategies', orderIndex: 6, courseTitle: 'Masterclass', courseId: null, lessonCount: 11 },
              { id: '7', title: 'Macro Economics', description: 'Understanding the big picture', orderIndex: 7, courseTitle: 'Masterclass', courseId: null, lessonCount: 7 },
              { id: '8', title: 'Advanced Strategies', description: 'Quant methods and factor investing', orderIndex: 8, courseTitle: 'Masterclass', courseId: null, lessonCount: 14 },
            ]).map((mod, i) => (
              <motion.div
                key={mod.id}
                variants={fadeUp}
                custom={i % 4}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                onClick={() => mod.courseId ? navigate(`/academy/course/${mod.courseId}`) : navigate('/academy')}
                className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:-translate-y-1 hover:border-amber-500/30 hover:bg-slate-900"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 text-xs font-bold shrink-0">
                    {mod.orderIndex}
                  </div>
                  <h3 className="text-sm font-semibold leading-snug line-clamp-2">{mod.title}</h3>
                </div>
                {mod.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{mod.description}</p>
                )}
                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    {mod.lessonCount} lessons
                  </span>
                  <span className="flex items-center gap-1 text-amber-400/60">
                    <Play className="h-2.5 w-2.5" />
                    Preview
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Button
              variant="outline"
              onClick={() => navigate('/academy')}
              className="border-amber-500/30 text-gray-300 hover:bg-amber-500/10 hover:text-white"
            >
              Browse Full Curriculum
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section id="features" className="border-t border-white/[0.04] bg-slate-950 py-20 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="mb-14 text-center text-3xl font-bold sm:text-4xl"
          >
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
              invest smarter.
            </span>
          </motion.h2>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900"
              >
                <div className={`mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05] ${f.glow}`}>
                  <f.icon className={`h-6 w-6 ${f.color}`} />
                </div>
                <h3 className="mb-3 text-xl font-semibold">{f.title}</h3>
                <p className="leading-relaxed text-gray-400">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA ─── */}
      <section className="border-t border-white/[0.04] bg-slate-950 py-24 px-4 sm:px-8">
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
