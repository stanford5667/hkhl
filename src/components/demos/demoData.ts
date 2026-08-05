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

export interface DemoStrategy {
  id: string;
  name: string;
  ticker: string;
  totalReturn: number;
  sharpe: number;
  series: DemoSeries;
}

export const DEMO_STRATEGIES: DemoStrategy[] = [
  {
    id: 'rsi',
    name: 'RSI Oversold Bounce',
    ticker: 'AAPL',
    totalReturn: 0,
    sharpe: 1.42,
    series: buildSeries({ trend: 0.003, noiseA: 0.012, noiseB: 0.008, freqA: 0.4, freqB: 0.15, ddStart: 30, ddEnd: 45, ddSize: -0.006 }),
  },
  {
    id: 'golden-cross',
    name: 'Golden Cross',
    ticker: 'MSFT',
    totalReturn: 0,
    sharpe: 1.08,
    series: buildSeries({ trend: 0.0042, noiseA: 0.006, noiseB: 0.014, freqA: 0.22, freqB: 0.33, ddStart: 62, ddEnd: 78, ddSize: -0.009 }),
  },
  {
    id: 'mean-reversion',
    name: 'Mean Reversion',
    ticker: 'SPY',
    totalReturn: 0,
    sharpe: 1.76,
    series: buildSeries({ trend: 0.0024, noiseA: 0.004, noiseB: 0.004, freqA: 0.55, freqB: 0.08, ddStart: 15, ddEnd: 22, ddSize: -0.004 }),
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

export const DEMO_TICKERS: DemoTicker[] = [
  { symbol: 'SOFI', name: 'SoFi Technologies', price: 18.42, changePercent: 4.12, volume: '61.2M', tags: ['under50', 'volume'] },
  { symbol: 'PLTR', name: 'Palantir', price: 42.87, changePercent: 2.35, volume: '48.7M', tags: ['under50', 'volume', 'earnings'] },
  { symbol: 'NVDA', name: 'NVIDIA', price: 128.31, changePercent: -1.18, volume: '212.4M', tags: ['volume', 'earnings'] },
  { symbol: 'F', name: 'Ford Motor', price: 11.64, changePercent: 0.86, volume: '52.9M', tags: ['under50', 'volume'] },
  { symbol: 'COST', name: 'Costco Wholesale', price: 894.55, changePercent: 1.44, volume: '2.1M', tags: ['earnings'] },
];

// ─── Themes ───

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
