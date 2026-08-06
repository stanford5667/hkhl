/**
 * Hardcoded sample data for the "see it in action" product demos.
 * No network calls — everything here is deterministic and renders instantly.
 */

export interface DemoSeries {
  values: number[];
  buyHold: number[];
}

const POINTS = 120;
const INITIAL = 100000;

function buildSeries(seed: {
  trend: number;
  noiseA: number;
  noiseB: number;
  freqA: number;
  freqB: number;
  ddStart: number;
  ddEnd: number;
  ddSize: number;
}): DemoSeries {
  const values: number[] = [];
  const buyHold: number[] = [];
  let v = INITIAL;
  let bh = INITIAL;
  for (let i = 0; i < POINTS; i++) {
    const noise = Math.sin(i * seed.freqA) * seed.noiseA + Math.cos(i * seed.freqB) * seed.noiseB;
    const drawdown = i > seed.ddStart && i < seed.ddEnd ? seed.ddSize : 0;
    v *= 1 + seed.trend + noise + drawdown;
    bh *= 1 + 0.002 + Math.sin(i * 0.3) * 0.006;
    values.push(Math.round(v));
    buyHold.push(Math.round(bh));
  }
  return { values, buyHold };
}

export interface DemoAnnotation {
  /** Index into the series values array. */
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
  totalReturn: number;
  historicalReturn: number;
  expectedReturn: number;
  sharpe: number;
  maxDrawdown: number;
  winningWeeks: number;
  volatility: number;
  series: DemoSeries;
  /** Streaming analyst read-out for this state. */
  insight: string;
  conviction: number;
  convictionLabel: string;
  annotations: DemoAnnotation[];
}

export const DEMO_STRATEGIES: DemoStrategy[] = [
  {
    id: 'rsi',
    name: 'Buy the Dip',
    techName: 'RSI Oversold Bounce',
    ticker: 'AAPL',
    totalReturn: 0,
    sharpe: 1.42,
    series: buildSeries({ trend: 0.003, noiseA: 0.012, noiseB: 0.008, freqA: 0.4, freqB: 0.15, ddStart: 30, ddEnd: 45, ddSize: -0.006 }),
    insight:
      'Analyzed 1,043 sessions across 61 signals. Most of the edge came from sidestepping the Q2 drawdown, not from better entries \u2014 average hold was 9 sessions.',
    conviction: 4,
    convictionLabel: 'High',
    annotations: [
      { index: 44, label: 'Avoided -18% drawdown', dir: 1 },
      { index: 112, label: 'Momentum re-entry', dir: -1 },
    ],
  },
  {
    id: 'golden-cross',
    name: 'Ride the Trend',
    techName: 'Golden Cross',
    ticker: 'MSFT',
    totalReturn: 0,
    sharpe: 1.08,
    series: buildSeries({ trend: 0.0042, noiseA: 0.006, noiseB: 0.014, freqA: 0.22, freqB: 0.33, ddStart: 62, ddEnd: 78, ddSize: -0.009 }),
    insight:
      'Fewer trades, smoother ride: 14 round trips over five years. Trailed buy & hold on raw return but cut max drawdown close to half \u2014 a risk trade, not a return trade.',
    conviction: 3,
    convictionLabel: 'Moderate',
    annotations: [
      { index: 70, label: 'Exited before the -11% leg', dir: 1 },
      { index: 100, label: 'Trend re-confirmed', dir: -1 },
    ],
  },
  {
    id: 'mean-reversion',
    name: 'Buy After Weakness',
    techName: 'Mean Reversion',
    ticker: 'SPY',
    totalReturn: 0,
    sharpe: 1.76,
    series: buildSeries({ trend: 0.0024, noiseA: 0.004, noiseB: 0.004, freqA: 0.55, freqB: 0.08, ddStart: 15, ddEnd: 22, ddSize: -0.004 }),
    insight:
      'Highest Sharpe of the three, and the tightest equity curve \u2014 the payoff is consistency. Edge decays sharply once index volatility drops under 12.',
    conviction: 4,
    convictionLabel: 'High',
    annotations: [
      { index: 21, label: 'Bought the -4% dislocation', dir: 1 },
      { index: 96, label: '11 straight winning weeks', dir: -1 },
    ],
  },
].map((s) => ({
  ...s,
  totalReturn: Math.round(((s.series.values[s.series.values.length - 1] - INITIAL) / INITIAL) * 10000) / 100,
}));

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
  module: 'Module 3 · Portfolio Construction',
  title: 'Building a Top-Down Portfolio',
  duration: '14 min',
  lessonIndex: 12,
  totalLessons: 92,
  progress: 0.34,
};

export const DEMO_LESSON_INSIGHT =
  'You are 34% through the curriculum. Portfolio construction is the module most students stall on \u2014 the ones who finish it revisit position sizing twice on average.';
