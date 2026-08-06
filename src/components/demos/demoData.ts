/**
 * Hardcoded sample data for the "see it in action" product demos.
 * No network calls — everything here is deterministic and renders instantly.
 *
 * The backtest equity curves are generated from a realistic stochastic process
 * (volatility clustering, fat-tailed shocks, regime changes) so the preview looks
 * like a genuine backtest rather than a smooth sine wave.
 */

export interface DemoDataPoint {
  date: string;
  timestamp: number;
  equity: number;
  benchmark: number;
  drawdown: number;
}

export interface DemoSeries {
  points: DemoDataPoint[];
}

const INITIAL = 100000;
const START_DATE = new Date('2020-01-02');
const POINTS = 261; // ~5 years of weekly data

// Box-Muller normal random variable (deterministic seedable version below).
function randNormal(seed: number): { value: number; nextSeed: number } {
  const a = fract(Math.sin(seed) * 43758.5453);
  const b = fract(Math.cos(seed) * 12345.6789);
  const nextSeed = fract(seed * 1.31415 + a + b);
  return {
    value: Math.sqrt(-2 * Math.log(a || 0.0001)) * Math.cos(2 * Math.PI * b),
    nextSeed,
  };
}

function fract(n: number) {
  return n - Math.floor(n);
}

function addWeeks(date: Date, weeks: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

/**
 * Generate a realistic equity curve + benchmark.
 *
 * The model mixes:
 *  - A persistent random walk for the market
 *  - GARCH-like volatility clustering
 *  - Occasional fat-tailed shocks
 *  - A strategy alpha component that lags/leads the market at different regimes
 */
function buildRealisticSeries(seed: number, params: {
  marketTrend: number;
  vol: number;
  alpha: number;
  lag: number;
  crisisStart: number;
  crisisEnd: number;
  crisisDrop: number;
}): DemoSeries {
  let points: DemoDataPoint[] = [];
  let equity = INITIAL;
  let benchmark = INITIAL;
  let marketVol = params.vol;
  let strategyVol = params.vol * 0.85;
  let peak = equity;

  let s = seed;

  for (let i = 0; i < POINTS; i++) {
    const date = addWeeks(START_DATE, i);

    // Regime shock during crisis window
    const inCrisis = i >= params.crisisStart && i <= params.crisisEnd;
    const regimeMultiplier = inCrisis ? 1.8 : 1.0;

    // GARCH-like volatility update
    const volShock = randNormal(s);
    s = volShock.nextSeed;
    marketVol = Math.max(0.005, 0.94 * marketVol + 0.06 * Math.abs(volShock.value) * 0.02 * regimeMultiplier);
    strategyVol = Math.max(0.004, 0.92 * strategyVol + 0.08 * Math.abs(volShock.value) * 0.02 * regimeMultiplier);

    // Market return with fat tail
    const marketNoise = randNormal(s);
    s = marketNoise.nextSeed;
    const marketJump = randNormal(s);
    s = marketJump.nextSeed;
    const fatTail = Math.abs(marketJump.value) > 2.5 ? marketJump.value * 0.008 : 0;
    const marketReturn = params.marketTrend + marketVol * marketNoise.value + fatTail;

    // Strategy return = market beta + alpha + own noise, partially lagging market
    const alphaNoise = randNormal(s);
    s = alphaNoise.nextSeed;
    const alpha = params.alpha * (inCrisis ? 0.5 : 1.0);
    const strategyReturn = alpha + 0.75 * marketReturn + 0.5 * strategyVol * alphaNoise.value;

    // Crisis drawdown: benchmark takes the full hit, strategy hedges a portion of it
    const weeklyCrisis = inCrisis ? -params.crisisDrop / (params.crisisEnd - params.crisisStart) : 0;
    const hedgeFactor = Math.min(0.95, 0.5 + params.alpha * 200); // base 50% drawdown avoidance + alpha edge

    benchmark *= 1 + marketReturn + weeklyCrisis;
    equity *= 1 + strategyReturn + weeklyCrisis * (1 - hedgeFactor);

    // Avoid negative values
    equity = Math.max(1000, equity);
    benchmark = Math.max(1000, benchmark);

    peak = Math.max(peak, equity);
    const drawdown = (peak - equity) / peak;

    points.push({
      date: date.toISOString().split('T')[0],
      timestamp: date.getTime(),
      equity: Math.round(equity),
      benchmark: Math.round(benchmark),
      drawdown: Math.round(drawdown * 10000) / 10000,
    });
  }

  return { points };
}

export interface DemoAnnotation {
  /** Index into the series points array. */
  index: number;
  label: string;
  /** Push the callout above (-1) or below (1) the point. */
  dir?: number;
}

export interface DemoStrategy {
  id: string;
  /** Plain-language outcome name, shown first. */
  name: string;
  /** Technical strategy name, shown as secondary text for professionals. */
  techName: string;
  ticker: string;
  historicalReturn: number;
  expectedReturn: number;
  sharpe: number;
  maxDrawdown: number;
  winningDays: number;
  volatility: number;
  series: DemoSeries;
  /** Streaming analyst read-out for this state. */
  insight: string;
  annotations: DemoAnnotation[];
}

const RAW_DEMO_STRATEGIES: Omit<DemoStrategy, 'historicalReturn' | 'expectedReturn' | 'maxDrawdown' | 'winningDays' | 'volatility'>[] = [
  {
    id: 'rsi',
    name: 'Buy the Dip',
    techName: 'RSI Oversold Bounce',
    ticker: 'AAPL',
    sharpe: 1.42,
    series: buildRealisticSeries(42.0, {
      marketTrend: 0.0018,
      vol: 0.020,
      alpha: 0.0015,
      lag: 4,
      crisisStart: 48,
      crisisEnd: 62,
      crisisDrop: 0.06,
    }),
    insight:
      'Analyzed 1,043 sessions across 61 signals. Most of the edge came from sidestepping the Q2 drawdown, not from better entries — average hold was 9 sessions.',
    annotations: [
      { index: 62, label: 'Avoided -23% drawdown', dir: 1 },
      { index: 215, label: 'Momentum re-entry', dir: -1 },
    ],
  },
  {
    id: 'golden-cross',
    name: 'Ride the Trend',
    techName: 'Golden Cross',
    ticker: 'MSFT',
    sharpe: 1.08,
    series: buildRealisticSeries(7.11, {
      marketTrend: 0.0020,
      vol: 0.020,
      alpha: 0.0010,
      lag: 6,
      crisisStart: 75,
      crisisEnd: 92,
      crisisDrop: 0.10,
    }),
    insight:
      'Fewer trades, smoother ride: 14 round trips over five years. Trailed the benchmark on raw return but cut max drawdown close to half — a risk trade, not a return trade.',
    annotations: [
      { index: 85, label: 'Exited before the -16% leg', dir: 1 },
      { index: 190, label: 'Trend re-confirmed', dir: -1 },
    ],
  },
  {
    id: 'mean-reversion',
    name: 'Buy After Weakness',
    techName: 'Mean Reversion',
    ticker: 'SPY',
    sharpe: 1.76,
    series: buildRealisticSeries(19.77, {
      marketTrend: 0.0015,
      vol: 0.015,
      alpha: 0.0013,
      lag: 2,
      crisisStart: 28,
      crisisEnd: 40,
      crisisDrop: 0.05,
    }),
    insight:
      'Highest Sharpe of the three, and the tightest equity curve — the payoff is consistency. Edge decays sharply once index volatility drops under 12.',
    annotations: [
      { index: 40, label: 'Bought the -8% dislocation', dir: 1 },
      { index: 180, label: '11 straight winning weeks', dir: -1 },
    ],
  },
];

function computeMetrics(series: DemoSeries) {
  const points = series.points;
  const final = points[points.length - 1].equity;
  const finalBench = points[points.length - 1].benchmark;
  const totalReturn = (final - INITIAL) / INITIAL;
  const totalBenchReturn = (finalBench - INITIAL) / INITIAL;

  // Weekly returns from equity curve
  const weeklyReturns = points.slice(1).map((p, i) => (p.equity - points[i].equity) / points[i].equity);
  const avgWeekly = weeklyReturns.reduce((a, b) => a + b, 0) / weeklyReturns.length;
  const stdDev = Math.sqrt(weeklyReturns.reduce((sq, r) => sq + Math.pow(r - avgWeekly, 2), 0) / weeklyReturns.length);

  const weeks = points.length - 1;
  const annualizedReturn = Math.pow(final / INITIAL, 52 / weeks) - 1;
  const volatility = stdDev * Math.sqrt(52);

  // Max drawdown from series
  const maxDrawdown = Math.max(...points.map((p) => p.drawdown));

  // Winning weeks percentage
  const winningDays = Math.round((weeklyReturns.filter((r) => r > 0).length / weeklyReturns.length) * 100);

  // Sharpe = excess return / annualized vol (using 2% risk-free rate)
  const excessReturn = annualizedReturn - 0.02;
  const sharpe = volatility > 0 ? excessReturn / volatility : 0;

  return {
    historicalReturn: Math.round(totalReturn * 10000) / 100,
    expectedReturn: Math.round(annualizedReturn * 10000) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
    winningDays,
    volatility: Math.round(volatility * 10000) / 100,
    sharpe: Math.round(sharpe * 100) / 100,
    totalBenchReturn: Math.round(totalBenchReturn * 10000) / 100,
  };
}

export const DEMO_STRATEGIES: DemoStrategy[] = RAW_DEMO_STRATEGIES.map((s) => {
  const metrics = computeMetrics(s.series);
  return {
    ...s,
    ...metrics,
  };
});

export const DEMO_INITIAL_CAPITAL = INITIAL;

// ─── Screener ───

export interface DemoTicker {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: string;
  tags: string[];
}

export const DEMO_SCREENER_FILTERS = [
  { id: 'under50', label: 'Under $50' },
  { id: 'volume', label: 'High volume' },
  { id: 'earnings', label: 'Beat earnings' },
] as const;

/** Streaming analyst read-out per filter state (null key = no filter). */
export const DEMO_SCREENER_INSIGHTS: Record<string, string> = {
  all: 'Scanned 10,482 listed names. 5 clear the liquidity and price-quality floor \u2014 breadth is narrow, which usually means the move is being led, not shared.',
  under50:
    '3 matches under $50, all high-turnover retail favorites. Their moves correlate at 0.71, so treat them as one position, not three.',
  volume:
    '4 of 5 matches are mid-cap tech. Volume clustering this tight points to a sector-level rotation rather than single-name news.',
  earnings:
    'Post-beat names are still holding gains 3 sessions in \u2014 drift, not a fade. NVDA is the outlier: it beat and sold off, which is a crowding tell.',
};

export const DEMO_TICKERS: DemoTicker[] = [
  { symbol: 'SOFI', name: 'SoFi Technologies', price: 18.42, changePercent: 4.12, volume: '61.2M', tags: ['under50', 'volume'] },
  { symbol: 'PLTR', name: 'Palantir', price: 42.87, changePercent: 2.35, volume: '48.7M', tags: ['under50', 'volume', 'earnings'] },
  { symbol: 'NVDA', name: 'NVIDIA', price: 128.31, changePercent: -1.18, volume: '212.4M', tags: ['volume', 'earnings'] },
  { symbol: 'F', name: 'Ford Motor', price: 11.64, changePercent: 0.86, volume: '52.9M', tags: ['under50', 'volume'] },
  { symbol: 'COST', name: 'Costco Wholesale', price: 894.55, changePercent: 1.44, volume: '2.1M', tags: ['earnings'] },
];

// ─── Themes ───

export const DEMO_THEME_INSIGHT =
  'Five macro narratives scored across 1,900 news items overnight. AI infrastructure and power demand are converging \u2014 the same utility names now appear in both, which is where the crowding risk sits.';

export interface DemoTheme {
  id: string;
  title: string;
  category: string;
  sentiment: number;
  impact: number;
  tickers: string[];
}

export const DEMO_THEMES: DemoTheme[] = [
  { id: 'ai-infra', title: 'AI Infrastructure Buildout', category: 'Technology', sentiment: 0.78, impact: 3.4, tickers: ['NVDA', 'AVGO', 'VRT'] },
  { id: 'rates', title: 'Rate Cut Repricing', category: 'Macro', sentiment: 0.52, impact: 0.9, tickers: ['TLT', 'XLF', 'IWM'] },
  { id: 'energy', title: 'Power Demand Squeeze', category: 'Energy', sentiment: 0.66, impact: 2.1, tickers: ['CEG', 'VST', 'NEE'] },
  { id: 'consumer', title: 'Consumer Trade-Down', category: 'Consumer', sentiment: 0.34, impact: -1.6, tickers: ['WMT', 'DG', 'MCD'] },
  { id: 'defense', title: 'Defense Rearmament', category: 'Industrials', sentiment: 0.71, impact: 1.8, tickers: ['LMT', 'RTX', 'PLTR'] },
];

// ─── Academy ───

export const DEMO_LESSON = {
  module: 'Module 3 \u00b7 Portfolio Construction',
  title: 'Building a Top-Down Portfolio',
  duration: '14 min',
  lessonIndex: 12,
  totalLessons: 92,
  progress: 0.34,
};

export const DEMO_LESSON_INSIGHT =
  'You are 34% through the curriculum. Portfolio construction is the module most students stall on \u2014 the ones who finish it revisit position sizing twice on average.';
