// Finviz-Style Stock Screener Type Definitions

export type MarketCapSize = 'mega' | 'large' | 'mid' | 'small' | 'micro' | 'nano';
export type Exchange = 'NYSE' | 'NASDAQ' | 'AMEX';
export type Index = 'sp500' | 'djia' | 'nasdaq100' | 'russell2000';

export type Sector = 
  | 'Technology' | 'Healthcare' | 'Financial Services' | 'Consumer Cyclical'
  | 'Communication Services' | 'Industrials' | 'Consumer Defensive' 
  | 'Energy' | 'Basic Materials' | 'Real Estate' | 'Utilities';

export type RSIFilter = 
  | 'oversold_30' | 'oversold_40' | 'overbought_60' | 'overbought_70' 
  | 'not_oversold' | 'not_overbought';

export type SMAFilter = 'price_above' | 'price_below' | 'cross_above' | 'cross_below';
export type SMA50vs200 = 'above' | 'below' | 'cross_above' | 'cross_below';
export type HighLow52W = 'new_high' | 'new_low' | 'near_high' | 'near_low';

export type ChartPattern = 
  | 'double_bottom' | 'double_top' | 'head_shoulders' | 'inv_head_shoulders'
  | 'ascending_triangle' | 'descending_triangle' | 'wedge_up' | 'wedge_down'
  | 'channel_up' | 'channel_down' | 'cup_handle' | 'flag' | 'pennant'
  | 'triple_bottom' | 'triple_top' | 'rectangle';

export type CandlestickPattern = 
  | 'doji' | 'hammer' | 'inverted_hammer' | 'shooting_star' | 'spinning_top'
  | 'engulfing_bullish' | 'engulfing_bearish' | 'harami_bullish' | 'harami_bearish'
  | 'morning_star' | 'evening_star' | 'three_white_soldiers' | 'three_black_crows'
  | 'piercing' | 'dark_cloud' | 'marubozu_bullish' | 'marubozu_bearish';

export type EarningsDate = 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'this_month';
export type AnalystRec = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';

export interface ScreenerCriteria {
  // Descriptive Filters
  exchange?: Exchange[];
  index?: Index[];
  sector?: Sector[];
  industry?: string[];
  country?: string[];
  marketCap?: MarketCapSize;
  minMarketCap?: number;
  maxMarketCap?: number;
  minPrice?: number;
  maxPrice?: number;
  minVolume?: number;
  maxVolume?: number;
  minAvgVolume?: number;
  maxAvgVolume?: number;
  minRelativeVolume?: number;
  maxRelativeVolume?: number;
  minSharesOutstanding?: number;
  maxSharesOutstanding?: number;
  minFloat?: number;
  maxFloat?: number;
  minFloatShort?: number;
  maxFloatShort?: number;
  optionable?: boolean;
  shortable?: boolean;
  earningsDate?: EarningsDate;
  ipoDateAfter?: string;
  ipoDateBefore?: string;

  // Fundamental Filters - Valuation
  minPE?: number;
  maxPE?: number;
  minForwardPE?: number;
  maxForwardPE?: number;
  minPEG?: number;
  maxPEG?: number;
  minPS?: number;
  maxPS?: number;
  minPB?: number;
  maxPB?: number;
  minPCash?: number;
  maxPCash?: number;
  minPFCF?: number;
  maxPFCF?: number;
  minEVEBITDA?: number;
  maxEVEBITDA?: number;
  minEVSales?: number;
  maxEVSales?: number;

  // Fundamental Filters - Financial
  minDividendYield?: number;
  maxDividendYield?: number;
  minPayoutRatio?: number;
  maxPayoutRatio?: number;
  minEPSGrowthThisYear?: number;
  maxEPSGrowthThisYear?: number;
  minEPSGrowthNextYear?: number;
  maxEPSGrowthNextYear?: number;
  minEPSGrowthPast5Y?: number;
  maxEPSGrowthPast5Y?: number;
  minEPSGrowthNext5Y?: number;
  maxEPSGrowthNext5Y?: number;
  minSalesGrowthPast5Y?: number;
  maxSalesGrowthPast5Y?: number;
  minSalesGrowthQoQ?: number;
  maxSalesGrowthQoQ?: number;
  minROA?: number;
  maxROA?: number;
  minROE?: number;
  maxROE?: number;
  minROI?: number;
  maxROI?: number;
  minGrossMargin?: number;
  maxGrossMargin?: number;
  minOperatingMargin?: number;
  maxOperatingMargin?: number;
  minNetMargin?: number;
  maxNetMargin?: number;
  minCurrentRatio?: number;
  maxCurrentRatio?: number;
  minQuickRatio?: number;
  maxQuickRatio?: number;
  minLTDebtEquity?: number;
  maxLTDebtEquity?: number;
  minDebtEquity?: number;
  maxDebtEquity?: number;
  minInsiderOwnership?: number;
  maxInsiderOwnership?: number;
  insiderTransactions?: 'buying' | 'selling';
  minInstitutionalOwnership?: number;
  maxInstitutionalOwnership?: number;
  institutionalTransactions?: 'buying' | 'selling';
  analystRec?: AnalystRec;
  analystRecentAction?: 'upgrade' | 'downgrade';

  // Technical Filters - Performance
  minPerfToday?: number;
  maxPerfToday?: number;
  minPerfWeek?: number;
  maxPerfWeek?: number;
  minPerfMonth?: number;
  maxPerfMonth?: number;
  minPerfQuarter?: number;
  maxPerfQuarter?: number;
  minPerfHalf?: number;
  maxPerfHalf?: number;
  minPerfYear?: number;
  maxPerfYear?: number;
  minPerfYTD?: number;
  maxPerfYTD?: number;

  // Technical Filters - Volatility & Risk
  minBeta?: number;
  maxBeta?: number;
  minATR?: number;
  maxATR?: number;
  minVolatility?: number;
  maxVolatility?: number;

  // Technical Filters - Moving Averages
  sma20?: SMAFilter;
  sma50?: SMAFilter;
  sma200?: SMAFilter;
  sma50vs200?: SMA50vs200;

  // Technical Filters - RSI
  rsiFilter?: RSIFilter;
  minRSI?: number;
  maxRSI?: number;

  // Technical Filters - 52-Week
  highLow52W?: HighLow52W;
  min52WeekHighPercent?: number;
  max52WeekHighPercent?: number;
  min52WeekLowPercent?: number;
  max52WeekLowPercent?: number;

  // Technical Filters - Gaps
  minGapUp?: number;
  maxGapUp?: number;
  minGapDown?: number;
  maxGapDown?: number;

  // Technical Filters - Patterns
  chartPattern?: ChartPattern[];
  candlestickPattern?: CandlestickPattern[];

  // Backtest / Risk-Adjusted Metrics
  minSharpe?: number;
  maxSharpe?: number;
  minSortino?: number;
  maxSortino?: number;
  minAlpha?: number;
  maxAlpha?: number;
  minMaxDrawdown?: number;  // e.g., 10 = max 10% drawdown
  maxMaxDrawdown?: number;
  minCalmar?: number;
  maxCalmar?: number;

  // Pagination & Sorting
  limit?: number;
  offset?: number;
  sortBy?: 'ticker' | 'marketCap' | 'price' | 'change' | 'volume' | 'pe' | 'dividendYield' | 'sharpe' | 'sortino' | 'alpha';
  sortOrder?: 'asc' | 'desc';
}

export interface ScreenerResult {
  ticker: string;
  company: string;
  sector: string;
  industry: string;
  country: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  relativeVolume: number;
  marketCap: number;
  sharesOutstanding: number;
  float: number;
  floatShort: number;
  
  // Valuation
  pe: number | null;
  forwardPE: number | null;
  peg: number | null;
  ps: number | null;
  pb: number | null;
  evEbitda: number | null;

  // Financial
  dividendYield: number | null;
  roe: number | null;
  roa: number | null;
  netMargin: number | null;
  debtEquity: number | null;

  // Technical
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi: number | null;
  beta: number | null;
  atr: number | null;

  // 52-Week
  high52W: number;
  low52W: number;
  pctFrom52WkHigh: number;
  pctFrom52WkLow: number;

  // Performance
  perfToday: number;
  perfWeek: number | null;
  perfMonth: number | null;
  perfQuarter: number | null;
  perfYear: number | null;
  perfYTD: number | null;

  // Backtest / Risk-Adjusted Metrics
  sharpe: number | null;
  sortino: number | null;
  alpha: number | null;
  maxDrawdown: number | null;
  calmar: number | null;

  // Metadata
  matchScore: number;
}

export interface ScreenerResponse {
  criteria: ScreenerCriteria;
  results: ScreenerResult[];
  totalCount: number;
  explanation: string;
  source: 'polygon';
  timestamp: string;
  executionTimeMs: number;
}

export interface QuickScreen {
  name: string;
  description: string;
  criteria: ScreenerCriteria;
  category: 'movers' | 'technical' | 'fundamental' | 'signals' | 'patterns';
}
