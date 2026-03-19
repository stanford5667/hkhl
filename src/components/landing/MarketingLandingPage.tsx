import { useState, useCallback } from 'react';

import { motion, type Easing } from 'framer-motion';
import { Zap, ChevronRight, Loader2, TrendingUp, GraduationCap, Globe, Play, Clock, Video, Activity, Target, Shield, DollarSign, Award, BarChart3 } from 'lucide-react';
import { LandingHeatmapPreview } from './LandingHeatmapPreview';
import modIntroImg from '@/assets/modules/mod-intro-investing.jpg';
import modFundImg from '@/assets/modules/mod-fundamental-analysis.jpg';
import modTechImg from '@/assets/modules/mod-technical-analysis.jpg';
import modPortImg from '@/assets/modules/mod-portfolio-construction-v2.jpg';
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
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ComposedChart, Line, CartesianGrid, ReferenceLine, Tooltip as RechartsTooltip } from 'recharts';
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

interface BacktestResult {
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  winRate: number;
  sharpeRatio: number;
  sortinoRatio: number;
  totalTrades: number;
  profitFactor: number;
  buyHoldReturn: number;
  outperformance: number;
  initialCapital: number;
  finalValue: number;
  avgHoldingDays: number;
  portfolioHistory?: { date: string; value: number; buyHold: number }[];
}

// Sample demo data so the preview card isn't empty on load
const DEMO_RESULT: BacktestResult = (() => {
  const initialCapital = 100000;
  const pts: { date: string; value: number; buyHold: number }[] = [];
  let v = initialCapital;
  let bh = initialCapital;
  const start = new Date('2020-01-02');
  for (let i = 0; i < 120; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    const trend = 0.003;
    const noise = (Math.sin(i * 0.4) * 0.012) + (Math.cos(i * 0.15) * 0.008);
    const drawdown = i > 30 && i < 45 ? -0.006 : 0;
    v *= (1 + trend + noise + drawdown);
    bh *= (1 + 0.002 + Math.sin(i * 0.3) * 0.006);
    pts.push({ date: d.toISOString().slice(0, 10), value: Math.round(v), buyHold: Math.round(bh) });
  }
  const finalValue = pts[pts.length - 1].value;
  const buyHoldFinal = pts[pts.length - 1].buyHold;
  const totalReturn = ((finalValue - initialCapital) / initialCapital) * 100;
  const buyHoldReturn = ((buyHoldFinal - initialCapital) / initialCapital) * 100;
  return {
    totalReturn: Math.round(totalReturn * 100) / 100,
    annualizedReturn: 18.74,
    maxDrawdown: -12.65,
    winRate: 58.3,
    sharpeRatio: 1.42,
    sortinoRatio: 1.98,
    totalTrades: 47,
    profitFactor: 1.87,
    buyHoldReturn: Math.round(buyHoldReturn * 100) / 100,
    outperformance: Math.round((totalReturn - buyHoldReturn) * 100) / 100,
    initialCapital,
    finalValue,
    avgHoldingDays: 8.3,
    portfolioHistory: pts,
  };
})();

// Health score calculator matching the real dashboard
function getHealthScore(r: BacktestResult): number {
  let score = 50;
  if (r.totalReturn > 0) score += 10;
  if (r.winRate >= 50) score += 5;
  if (r.sharpeRatio >= 1) score += 10;
  if (r.sortinoRatio >= 1.5) score += 5;
  if (r.profitFactor >= 1.5) score += 5;
  if (r.outperformance > 0) score += 5;
  if (Math.abs(r.maxDrawdown) > 20) score -= 10;
  if (Math.abs(r.maxDrawdown) > 40) score -= 10;
  if (r.winRate < 40) score -= 10;
  if (r.totalTrades < 10) score -= 5;
  return Math.max(0, Math.min(100, score));
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
  const openTeaser = requireAuth;

  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [selectedStrategy, setSelectedStrategy] = useState('rsi_oversold_bounce');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BacktestResult | null>(DEMO_RESULT);

  const MODULE_THUMBNAIL_MAP: Record<string, string> = {
    'portfolio': modPortImg, 'option': modOptsImg, 'stock': modTechImg, 'financial': modFundImg,
    'accounting': modFundImg, 'risk': modRiskImg, 'macro': modMacroImg, 'economic': modMacroImg,
    'advanced': modAdvImg, 'quant': modAdvImg, 'algorithm': modAdvImg, 'intro': modIntroImg,
    'fundamental': modFundImg, 'technical': modTechImg,
  };

  const MODULE_DESC_MAP: Record<string, string> = {
    'portfolio': 'Learn to build, diversify, and rebalance a portfolio aligned with your risk tolerance.',
    'option': 'Master options pricing, the Greeks, and practical strategies like covered calls and spreads.',
    'stock': 'Understand how stock markets function — from order flow to reading charts and timing entries.',
    'financial': 'Decode financial statements like an analyst to evaluate company health and uncover value.',
    'accounting': 'Build a solid foundation in financial accounting and the key ratios that drive decisions.',
    'risk': 'Master position sizing, stop-loss strategies, hedging, and drawdown management.',
    'macro': 'Connect Fed policy, yield curves, CPI prints, and global trade flows to market cycles.',
    'economic': 'Understand how GDP, inflation, and central bank actions drive asset prices.',
    'advanced': 'Go beyond buy-and-hold with factor investing, pairs trading, and systematic methods.',
    'quant': 'Explore data-driven approaches — signal generation, backtesting, and systematic strategy development.',
    'intro': 'Start your journey: how markets work, asset classes, brokerage accounts, and order types.',
    'fundamental': 'Dissect real 10-K filings to evaluate growth, margins, and free cash flow.',
    'technical': 'Read candlestick charts like a pro. Identify breakouts and combine RSI, MACD, and Bollinger Bands.',
  };

  function enrichModule(title: string, field: 'thumbnail' | 'description'): string | null {
    const t = title.toLowerCase();
    const map = field === 'thumbnail' ? MODULE_THUMBNAIL_MAP : MODULE_DESC_MAP;
    for (const [key, value] of Object.entries(map)) {
      if (t.includes(key)) return value;
    }
    return null;
  }

  const MODULE_GRADIENTS = [
    'from-cyan-600 to-blue-700', 'from-violet-600 to-purple-800', 'from-amber-500 to-orange-700',
    'from-emerald-600 to-teal-800', 'from-rose-600 to-pink-800', 'from-sky-500 to-indigo-700',
    'from-fuchsia-600 to-purple-800', 'from-teal-500 to-cyan-800',
  ];

  const { data: modules } = useQuery({
    queryKey: ['landing-modules'],
    queryFn: async () => {
      const { data } = await supabase
        .from('course_modules')
        .select(`id, title, description, order_index,
          course:courses!inner(id, title, is_published, thumbnail_url),
          lessons:course_lessons(id, title, description, video_duration)`)
        .eq('courses.is_published', true)
        .order('order_index', { ascending: true })
        .limit(8);
      return (data || []).map((m: any, idx: number) => ({
        id: m.id, title: m.title,
        description: (m.description && m.description.length > 10 ? m.description : null) || enrichModule(m.title, 'description') || 'Explore key concepts and practical techniques.',
        orderIndex: m.order_index, courseTitle: m.course?.title, courseId: m.course?.id,
        thumbnailUrl: enrichModule(m.title, 'thumbnail') || m.course?.thumbnail_url,
        lessonCount: m.lessons?.length ?? 0,
        totalDuration: (m.lessons || []).reduce((sum: number, l: any) => sum + (l.video_duration || 0), 0),
        lessonTitles: (m.lessons || []).slice(0, 3).map((l: any) => l.title),
        gradient: MODULE_GRADIENTS[idx % MODULE_GRADIENTS.length],
      }));
    },
    staleTime: 10 * 60 * 1000,
  });

  const FALLBACK_MODULES = [
    { id: '1', title: 'Introduction to Investing', description: 'Start your journey with the building blocks: how markets work, asset classes, and order types.', orderIndex: 1, courseTitle: 'Masterclass', courseId: null, thumbnailUrl: modIntroImg, lessonCount: 8, totalDuration: 2400, lessonTitles: ['How Markets Actually Work', 'Stocks vs. Bonds vs. ETFs', 'Placing Your First Trade'], gradient: 'from-cyan-600 to-blue-700' },
    { id: '2', title: 'Fundamental Analysis', description: 'Dissect real 10-K filings to evaluate revenue growth, profit margins, and free cash flow.', orderIndex: 2, courseTitle: 'Masterclass', courseId: null, thumbnailUrl: modFundImg, lessonCount: 12, totalDuration: 4200, lessonTitles: ['Reading a 10-K Filing', 'Building a DCF Model', 'Earnings Red Flags'], gradient: 'from-violet-600 to-purple-800' },
    { id: '3', title: 'Technical Analysis', description: 'Read candlestick charts like a pro. Identify breakouts and combine RSI, MACD, and Bollinger Bands.', orderIndex: 3, courseTitle: 'Masterclass', courseId: null, thumbnailUrl: modTechImg, lessonCount: 15, totalDuration: 5400, lessonTitles: ['Candlestick Reversal Patterns', 'Support & Resistance Levels', 'RSI + MACD Combo Signals'], gradient: 'from-amber-500 to-orange-700' },
    { id: '4', title: 'Portfolio Construction', description: 'Apply Modern Portfolio Theory to build an efficient frontier and diversify.', orderIndex: 4, courseTitle: 'Masterclass', courseId: null, thumbnailUrl: modPortImg, lessonCount: 10, totalDuration: 3600, lessonTitles: ['The Efficient Frontier', 'Correlation & Diversification', 'Rebalancing Strategies'], gradient: 'from-emerald-600 to-teal-800' },
    { id: '5', title: 'Risk Management', description: 'Master position sizing, stop-loss strategies, hedging, and drawdown management.', orderIndex: 5, courseTitle: 'Masterclass', courseId: null, thumbnailUrl: modRiskImg, lessonCount: 9, totalDuration: 3000, lessonTitles: ['Kelly Criterion Sizing', 'Trailing Stop Techniques', '2008 vs 2020 Case Studies'], gradient: 'from-rose-600 to-pink-800' },
    { id: '6', title: 'Options & Derivatives', description: 'Master the Greeks, covered calls, protective puts, and vertical spreads.', orderIndex: 6, courseTitle: 'Masterclass', courseId: null, thumbnailUrl: modOptsImg, lessonCount: 11, totalDuration: 4800, lessonTitles: ['The Greeks Explained', 'Covered Calls for Income', 'Vertical Spread Setups'], gradient: 'from-sky-500 to-indigo-700' },
    { id: '7', title: 'Macro Economics', description: 'Connect Fed policy, yield curves, CPI prints, and global trade flows to market cycles.', orderIndex: 7, courseTitle: 'Masterclass', courseId: null, thumbnailUrl: modMacroImg, lessonCount: 7, totalDuration: 2100, lessonTitles: ['Reading FOMC Statements', 'Yield Curve Inversions', 'Trading the CPI Print'], gradient: 'from-fuchsia-600 to-purple-800' },
    { id: '8', title: 'Advanced Strategies', description: 'Factor investing, pairs trading, and systematic mean-reversion models.', orderIndex: 8, courseTitle: 'Masterclass', courseId: null, thumbnailUrl: modAdvImg, lessonCount: 14, totalDuration: 6000, lessonTitles: ['Factor Investing Framework', 'Pairs Trading Setup', 'Backtesting Your Strategy'], gradient: 'from-teal-500 to-cyan-800' },
  ];
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

      const totalReturn = data.totalReturn ?? 0;
      const buyHoldReturn = data.buyHoldReturn ?? 0;
      const initCap = data.initialCapital ?? 10000;
      const finalVal = data.finalValue ?? initCap * (1 + totalReturn / 100);
      setResults({
        totalReturn,
        annualizedReturn: data.annualizedReturn ?? 0,
        maxDrawdown: data.maxDrawdown ?? 0,
        winRate: data.winRate ?? 0,
        sharpeRatio: data.sharpeRatio ?? 0,
        sortinoRatio: data.sortinoRatio ?? 0,
        totalTrades: data.totalTrades ?? 0,
        profitFactor: data.profitFactor ?? 0,
        buyHoldReturn,
        outperformance: totalReturn - buyHoldReturn,
        initialCapital: initCap,
        finalValue: finalVal,
        avgHoldingDays: data.avgHoldingDays ?? 0,
        portfolioHistory: (data.portfolioHistory ?? []).map((s: any, idx: number, arr: any[]) => ({
          date: s.date,
          value: s.value,
          buyHold: initCap * (1 + (buyHoldReturn / 100) * (idx / Math.max(arr.length - 1, 1))),
        })),
      });

      toast.success(`Backtest complete: ${data.totalReturn?.toFixed(2)}% return`);
    } catch (err: any) {
      toast.error(err.message || 'Backtest failed');
    } finally {
      setIsRunning(false);
    }
  }, [selectedTicker, selectedStrategy]);

  const navLinks: { label: string; href: string }[] = [];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ─── Top Navigation ─── */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-slate-950/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <AssetLabsLogo size="md" showText showTagline />
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href} className="text-sm text-gray-400 transition hover:text-white">
                {l.label}
              </a>
            ))}
            <button
              onClick={() => navigate('/auth', { state: { mode: 'signin' } })}
              className="text-sm text-gray-400 transition hover:text-white"
            >
              Log In
            </button>
            <Button
              onClick={() => navigate('/auth', { state: { mode: 'signup' } })}
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
            Build AI Investment Strategies in Mins.
          </motion.h1>
          <motion.p variants={fadeUp} custom={1} className="mt-6 max-w-lg text-lg text-gray-400">
            AI-powered analysis, backtesting across 30+ years of data, and real trade ideas — no coding required.
          </motion.p>

          <motion.div variants={fadeUp} custom={2} className="mt-10">
            <Button
              onClick={() => requireAuth(runBacktest, 'backtest')}
              disabled={isRunning}
              size="lg"
              className="bg-cyan-500 px-10 font-bold text-black shadow-[0_0_30px_hsl(185_80%_50%/0.4)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_40px_hsl(185_80%_50%/0.5)] disabled:opacity-40"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running…
                </>
              ) : (
                '🚀 GET STARTED FREE'
              )}
            </Button>
          </motion.div>
        </motion.div>

        {/* Right column — Results card (mirrors real BacktestResultsDashboard) */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease }}
        >
          <Card className="overflow-hidden border-cyan-500/30 bg-slate-900/80 shadow-[0_0_40px_hsl(185_80%_50%/0.1)]">
            <CardContent className="p-5">
              {/* Strategy Header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-gray-300">
                    {results === DEMO_RESULT ? 'AAPL — RSI Oversold Bounce' : `${selectedTicker || 'AAPL'} — ${STRATEGY_OPTIONS.find(s => s.id === selectedStrategy)?.name || 'Strategy'}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {results === DEMO_RESULT && (
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 bg-slate-800/80 px-2 py-0.5 rounded">
                      Sample
                    </span>
                  )}
                  {/* Health Score Badge */}
                  {results && (
                    <div className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
                      getHealthScore(results) >= 75 ? "bg-emerald-500/15 text-emerald-400" :
                      getHealthScore(results) >= 50 ? "bg-amber-500/15 text-amber-400" :
                      "bg-red-500/15 text-red-400"
                    )}>
                      <Shield className="h-3 w-3" />
                      {getHealthScore(results)}
                    </div>
                  )}
                </div>
              </div>

              {/* Key metrics row — 4 cards like real dashboard */}
              <div className="grid grid-cols-2 gap-2 mb-3 sm:grid-cols-4">
                {[
                  {
                    label: 'Net Profit',
                    value: results ? `$${(results.finalValue - results.initialCapital).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—',
                    sub: results ? `${results.totalReturn >= 0 ? '+' : ''}${results.totalReturn.toFixed(2)}% return` : undefined,
                    trend: results ? (results.totalReturn >= 0 ? 'good' : 'bad') : 'neutral',
                    icon: DollarSign,
                  },
                  {
                    label: 'Annualized',
                    value: results ? `${results.annualizedReturn >= 0 ? '+' : ''}${results.annualizedReturn.toFixed(2)}%` : '—',
                    sub: 'CAGR',
                    trend: results ? (results.annualizedReturn >= 0 ? 'good' : 'bad') : 'neutral',
                    icon: TrendingUp,
                  },
                  {
                    label: 'Win Rate',
                    value: results ? `${results.winRate.toFixed(1)}%` : '—',
                    sub: results ? `${results.totalTrades} trades` : undefined,
                    trend: results ? (results.winRate >= 50 ? 'good' : 'bad') : 'neutral',
                    icon: Target,
                  },
                  {
                    label: 'Sharpe',
                    value: results ? results.sharpeRatio.toFixed(2) : '—',
                    sub: results ? `Sortino: ${results.sortinoRatio.toFixed(2)}` : undefined,
                    trend: results ? (results.sharpeRatio >= 1 ? 'good' : results.sharpeRatio >= 0 ? 'neutral' : 'bad') : 'neutral',
                    icon: BarChart3,
                  },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg bg-slate-800/50 border border-white/[0.04] p-2.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] uppercase tracking-wider text-gray-500">{m.label}</span>
                      {m.icon && <m.icon className="h-3 w-3 text-gray-600" />}
                    </div>
                    <div className={cn(
                      "text-base font-bold font-mono",
                      m.trend === 'good' && 'text-emerald-400',
                      m.trend === 'bad' && 'text-rose-400',
                      m.trend === 'neutral' && 'text-gray-300',
                    )}>
                      {isRunning ? <Skeleton className="h-5 w-14 bg-slate-700" /> : m.value}
                    </div>
                    {m.sub && !isRunning && (
                      <div className="text-[9px] text-gray-500 mt-0.5">{m.sub}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Equity Curve with Buy & Hold comparison */}
              <div className="mb-3 rounded-lg bg-slate-800/40 border border-white/[0.04] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500">Equity Curve vs Buy & Hold</span>
                  {results && (
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 rounded bg-cyan-400 inline-block" /> Strategy</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 rounded bg-gray-500 inline-block opacity-50" /> Buy & Hold</span>
                    </div>
                  )}
                </div>
                <div className="h-40 w-full">
                  {isRunning ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                      <span className="text-xs text-gray-500">Simulating trades…</span>
                    </div>
                  ) : results?.portfolioHistory?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={results.portfolioHistory}>
                        <defs>
                          <linearGradient id="lp-equity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(185 80% 50%)" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="hsl(185 80% 50%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 9, fill: '#64748b' }}
                          tickFormatter={(v) => {
                            try { return format(new Date(v), 'MMM yy'); } catch { return v; }
                          }}
                          axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 9, fill: '#64748b' }}
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                          axisLine={false}
                          tickLine={false}
                          width={42}
                        />
                        <Tooltip
                          contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                          labelStyle={{ color: '#94a3b8' }}
                          formatter={(v: number, name: string) => [
                            `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                            name === 'value' ? 'Strategy' : 'Buy & Hold'
                          ]}
                        />
                        <ReferenceLine y={results.initialCapital} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(185 80% 50%)"
                          strokeWidth={2}
                          fill="url(#lp-equity)"
                        />
                        <Line
                          type="monotone"
                          dataKey="buyHold"
                          stroke="rgba(148,163,184,0.35)"
                          strokeWidth={1.5}
                          strokeDasharray="4 3"
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-600">
                      Run a backtest to see results
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom stats row — mirrors real dashboard quick stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-slate-800/40 border border-white/[0.04]">
                  <div className="text-[9px] uppercase tracking-wider text-gray-500">Max Drawdown</div>
                  <div className="text-sm font-mono font-bold text-rose-400 mt-0.5">
                    {isRunning ? <Skeleton className="h-4 w-10 mx-auto bg-slate-700" /> : results ? `${results.maxDrawdown.toFixed(1)}%` : '—'}
                  </div>
                </div>
                <div className="text-center p-2 rounded-lg bg-slate-800/40 border border-white/[0.04]">
                  <div className="text-[9px] uppercase tracking-wider text-gray-500">Profit Factor</div>
                  <div className="text-sm font-mono font-bold text-gray-300 mt-0.5">
                    {isRunning ? <Skeleton className="h-4 w-10 mx-auto bg-slate-700" /> : results ? results.profitFactor.toFixed(2) : '—'}
                  </div>
                </div>
                <div className="text-center p-2 rounded-lg bg-slate-800/40 border border-white/[0.04]">
                  <div className="text-[9px] uppercase tracking-wider text-gray-500">vs Buy & Hold</div>
                  <div className={cn(
                    "text-sm font-mono font-bold mt-0.5",
                    results ? (results.outperformance >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-gray-600'
                  )}>
                    {isRunning ? <Skeleton className="h-4 w-10 mx-auto bg-slate-700" /> : results ? `${results.outperformance >= 0 ? '+' : ''}${results.outperformance.toFixed(1)}%` : '—'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* ─── Investment Heatmap Preview ─── */}
      <LandingHeatmapPreview onSignUp={openTeaser} />

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

      {/* ─── Academy Preview ─── */}
      <section id="academy" className="border-b border-white/[0.04] bg-slate-950 py-16 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-8">
            <motion.div variants={fadeUp} custom={0} className="flex items-center gap-3 mb-2">
              <GraduationCap className="h-5 w-5 text-amber-400" />
              <h2 className="text-2xl font-bold sm:text-3xl">Learn from the Pros</h2>
            </motion.div>
            <motion.p variants={fadeUp} custom={1} className="text-gray-400">
              90+ lessons across structured modules — from fundamentals to advanced portfolio strategy.
            </motion.p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(modules && modules.length > 0 ? modules : FALLBACK_MODULES).map((mod, i) => (
              <motion.div
                key={mod.id}
                variants={fadeUp}
                custom={i % 4}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                onClick={() => mod.courseId ? navigate(`/academy/course/${mod.courseId}`) : navigate('/academy')}
                className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5"
              >
                <div className={cn("relative h-32 w-full bg-gradient-to-br flex items-center justify-center overflow-hidden", mod.gradient)}>
                  {mod.thumbnailUrl ? (
                    <img src={mod.thumbnailUrl} alt={mod.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="relative flex flex-col items-center gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-lg">{mod.orderIndex}</div>
                        <span className="text-[10px] uppercase tracking-widest text-white/70 font-medium">Module {mod.orderIndex}</span>
                      </div>
                    </>
                  )}
                  <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5 text-[10px] text-white/80">
                    <Clock className="h-2.5 w-2.5" />
                    {mod.totalDuration >= 3600
                      ? `${Math.floor(mod.totalDuration / 3600)}h ${Math.round((mod.totalDuration % 3600) / 60)}m`
                      : `${Math.round(mod.totalDuration / 60)}m`}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors">{mod.title}</h3>
                  <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">{mod.description}</p>

                  {mod.lessonTitles && mod.lessonTitles.length > 0 && (
                    <ul className="space-y-1 pt-1">
                      {mod.lessonTitles.map((title: string, li: number) => (
                        <li key={li} className="flex items-center gap-2 text-[11px] text-gray-500">
                          <Play className="h-2.5 w-2.5 text-amber-400/50 shrink-0" />
                          <span className="line-clamp-1">{title}</span>
                        </li>
                      ))}
                      {mod.lessonCount > 3 && (
                        <li className="text-[11px] text-gray-600 pl-4">+{mod.lessonCount - 3} more lessons</li>
                      )}
                    </ul>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="flex items-center gap-1 text-[11px] text-gray-500">
                      <Video className="h-3 w-3" />
                      {mod.lessonCount} lessons
                    </span>
                    <span className="text-[11px] text-amber-400 font-medium group-hover:text-amber-300 transition-colors">
                      Explore →
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Button
              variant="outline"
              onClick={openTeaser}
              className="border-amber-500/30 text-gray-300 hover:bg-amber-500/10 hover:text-white"
            >
              Browse Full Curriculum
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Community Chat Mockup ─── */}
      <section className="border-b border-white/[0.04] bg-slate-950 py-16 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-8">
            <motion.div variants={fadeUp} custom={0} className="flex items-center gap-3 mb-2">
              <Activity className="h-5 w-5 text-cyan-400" />
              <h2 className="text-2xl font-bold sm:text-3xl">Real-Time Community Chat</h2>
            </motion.div>
            <motion.p variants={fadeUp} custom={1} className="text-gray-400">
              Discuss trades, share ideas, and learn from other investors — all in real time.
            </motion.p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            custom={2}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl shadow-cyan-500/5">
              {/* Chat header */}
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 text-sm">💬</div>
                  <div>
                    <div className="text-sm font-semibold text-white"># general</div>
                    <div className="text-[10px] text-gray-500">1,247 members · 32 online</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={cn("h-6 w-6 rounded-full border-2 border-slate-900 -ml-2 first:ml-0", [
                      "bg-gradient-to-br from-cyan-400 to-blue-500",
                      "bg-gradient-to-br from-violet-400 to-purple-500",
                      "bg-gradient-to-br from-amber-400 to-orange-500",
                      "bg-gradient-to-br from-emerald-400 to-teal-500",
                      "bg-gradient-to-br from-rose-400 to-pink-500",
                    ][i])} />
                  ))}
                  <span className="ml-2 text-[10px] text-gray-500">+27</span>
                </div>
              </div>

              {/* Chat messages */}
              <div className="p-4 space-y-4 min-h-[280px]">
                {[
                  { name: 'Alex M.', avatar: 'bg-gradient-to-br from-cyan-400 to-blue-500', time: '2:34 PM', msg: 'Just loaded up on NVDA calls ahead of earnings. The AI sentiment score on here is showing 87% bullish 🚀', status: 'online' },
                  { name: 'Sarah K.', avatar: 'bg-gradient-to-br from-violet-400 to-purple-500', time: '2:35 PM', msg: 'Be careful with IV crush post-earnings. I ran a backtest on the volatility breakout strategy — historically it drops 8% in the first week after.', status: 'online' },
                  { name: 'Mike R.', avatar: 'bg-gradient-to-br from-emerald-400 to-teal-500', time: '2:36 PM', msg: 'The macro module on yield curves was 🔥. Finally understanding why the 2s10s spread matters for tech valuations.', status: 'idle' },
                  { name: 'Jessica L.', avatar: 'bg-gradient-to-br from-amber-400 to-orange-500', time: '2:37 PM', msg: 'Anyone else seeing the divergence on AAPL RSI? Looks like a textbook oversold bounce setup from Module 3.', reactions: [{ emoji: '👀', count: 4 }, { emoji: '📈', count: 2 }], status: 'online' },
                ].map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 * i, duration: 0.4 }}
                    className="flex gap-3 group"
                  >
                    <div className="relative shrink-0">
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white", m.avatar)}>
                        {m.name.charAt(0)}
                      </div>
                      <div className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900", m.status === 'online' ? 'bg-emerald-400' : 'bg-amber-400')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-white">{m.name}</span>
                        <span className="text-[10px] text-gray-600">{m.time}</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed mt-0.5">{m.msg}</p>
                      {m.reactions && (
                        <div className="flex gap-1.5 mt-1.5">
                          {m.reactions.map((r, ri) => (
                            <span key={ri} className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] text-gray-400">
                              {r.emoji} {r.count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Typing indicator */}
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map(d => (
                      <motion.div
                        key={d}
                        className="h-1.5 w-1.5 rounded-full bg-gray-500"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.2 }}
                      />
                    ))}
                  </div>
                  <span>3 people are typing…</span>
                </div>
              </div>

              {/* Chat input mock */}
              <div className="border-t border-slate-800 px-4 py-3">
                <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2.5">
                  <span className="text-sm text-gray-500 flex-1">Message #general...</span>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-base">😀</span>
                    <span className="text-base">📎</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Button
                onClick={openTeaser}
                className="rounded-full bg-cyan-400 px-8 font-semibold text-black hover:bg-cyan-300"
              >
                Join the Conversation
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
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
                onClick={() => item.href && openTeaser()}
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
                  onClick={openTeaser}
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
