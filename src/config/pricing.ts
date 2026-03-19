// Single source of truth for all pricing across the app
export const PRICING = {
  monthly: 160,
  annualPerMonth: 83,
  annualTotal: 1000,
  get annualSavings() {
    return (this.monthly * 12) - this.annualTotal;
  },
} as const;

export interface ComparisonFeature {
  name: string;
  free: boolean;
  pro: boolean;
  highlight?: boolean;
}

export const COMPARISON_FEATURES: ComparisonFeature[] = [
  { name: "Full Video Course Library", free: false, pro: true, highlight: true },
  { name: "Live Trade Ideas Chatroom", free: false, pro: true, highlight: true },
  { name: "AI Stock Backtesting", free: false, pro: true, highlight: true },
  { name: "Strategy Builder (20+ indicators)", free: false, pro: true, highlight: true },
  { name: "AI Trading Bot", free: false, pro: true },
  { name: "AI Stock Analysis", free: false, pro: true },
  { name: "Market Screener", free: false, pro: true },
  { name: "Stock Overview & Charts", free: true, pro: true },
  { name: "Trending Tickers", free: true, pro: true },
  { name: "Earnings Calendar", free: true, pro: true },
];

export const COMING_SOON = [
  'Options Flow Screening',
  'Agentic News Bots',
  'Hundreds of New Studies',
] as const;
