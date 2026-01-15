import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScreeningCriteria {
  maxDrawdown?: number;
  maxVolatility?: number;
  minSharpe?: number;
  minReturn?: number;
  maxGain?: number;
  lookbackYears?: number;
}

interface PortfolioResult {
  id: string;
  name: string;
  description: string;
  allocations: { symbol: string; weight: number; name: string }[];
  metrics: {
    annualizedReturn: number;
    maxDrawdown: number;
    volatility: number;
    sharpe: number;
    maxGain: number;
    calmar: number;
    sortino: number;
  };
  matchScore: number;
  isBacktested: boolean;
}

// Portfolio templates using ONLY tickers available in database:
// AGG, BND, DBC, GLD, QQQ, SPY, TLT, VNQ, VTI, VWO
const PORTFOLIO_TEMPLATES = [
  {
    id: 'ultra-conservative',
    name: 'Ultra Conservative',
    description: 'Treasury-heavy allocation for capital preservation',
    allocations: [
      { symbol: 'TLT', weight: 50, name: 'Long-Term Treasuries' },
      { symbol: 'AGG', weight: 30, name: 'US Aggregate Bonds' },
      { symbol: 'GLD', weight: 10, name: 'Gold' },
      { symbol: 'SPY', weight: 10, name: 'S&P 500' },
    ],
  },
  {
    id: 'conservative',
    name: 'Capital Preservation',
    description: 'Minimal volatility, focused on wealth protection',
    allocations: [
      { symbol: 'AGG', weight: 40, name: 'US Aggregate Bonds' },
      { symbol: 'TLT', weight: 25, name: 'Long-Term Treasuries' },
      { symbol: 'SPY', weight: 20, name: 'S&P 500' },
      { symbol: 'GLD', weight: 15, name: 'Gold' },
    ],
  },
  {
    id: 'income-focus',
    name: 'Income Focus',
    description: 'Bond-heavy with real estate exposure',
    allocations: [
      { symbol: 'AGG', weight: 35, name: 'US Aggregate Bonds' },
      { symbol: 'TLT', weight: 25, name: 'Long-Term Treasuries' },
      { symbol: 'VNQ', weight: 25, name: 'Real Estate' },
      { symbol: 'SPY', weight: 15, name: 'S&P 500' },
    ],
  },
  {
    id: 'balanced',
    name: 'Balanced Growth',
    description: 'Classic 60/40 allocation with diversification',
    allocations: [
      { symbol: 'SPY', weight: 35, name: 'S&P 500' },
      { symbol: 'VTI', weight: 25, name: 'Total Stock Market' },
      { symbol: 'AGG', weight: 25, name: 'US Aggregate Bonds' },
      { symbol: 'GLD', weight: 15, name: 'Gold' },
    ],
  },
  {
    id: 'balanced-growth',
    name: 'Growth Tilt',
    description: '70/30 allocation favoring equities',
    allocations: [
      { symbol: 'VTI', weight: 40, name: 'Total Stock Market' },
      { symbol: 'SPY', weight: 25, name: 'S&P 500' },
      { symbol: 'AGG', weight: 20, name: 'US Aggregate Bonds' },
      { symbol: 'GLD', weight: 15, name: 'Gold' },
    ],
  },
  {
    id: 'all-weather',
    name: 'All Weather',
    description: 'Ray Dalio-inspired balanced risk allocation',
    allocations: [
      { symbol: 'SPY', weight: 30, name: 'S&P 500' },
      { symbol: 'TLT', weight: 40, name: 'Long-Term Treasuries' },
      { symbol: 'GLD', weight: 15, name: 'Gold' },
      { symbol: 'DBC', weight: 15, name: 'Commodities' },
    ],
  },
  {
    id: 'growth',
    name: 'Growth Focus',
    description: 'Higher equity exposure for long-term wealth building',
    allocations: [
      { symbol: 'VTI', weight: 40, name: 'Total Stock Market' },
      { symbol: 'QQQ', weight: 25, name: 'NASDAQ 100' },
      { symbol: 'SPY', weight: 20, name: 'S&P 500' },
      { symbol: 'AGG', weight: 15, name: 'US Aggregate Bonds' },
    ],
  },
  {
    id: 'tech-growth',
    name: 'Tech Growth',
    description: 'Technology-heavy growth allocation',
    allocations: [
      { symbol: 'QQQ', weight: 45, name: 'NASDAQ 100' },
      { symbol: 'SPY', weight: 30, name: 'S&P 500' },
      { symbol: 'VTI', weight: 15, name: 'Total Stock Market' },
      { symbol: 'AGG', weight: 10, name: 'US Aggregate Bonds' },
    ],
  },
  {
    id: 'global-diversified',
    name: 'Global Diversified',
    description: 'Worldwide exposure including emerging markets',
    allocations: [
      { symbol: 'VTI', weight: 35, name: 'US Stocks' },
      { symbol: 'VWO', weight: 25, name: 'Emerging Markets' },
      { symbol: 'AGG', weight: 25, name: 'US Bonds' },
      { symbol: 'GLD', weight: 15, name: 'Gold' },
    ],
  },
  {
    id: 'aggressive',
    name: 'Aggressive Growth',
    description: 'High equity exposure for maximum growth',
    allocations: [
      { symbol: 'SPY', weight: 35, name: 'S&P 500' },
      { symbol: 'QQQ', weight: 30, name: 'NASDAQ 100' },
      { symbol: 'VTI', weight: 25, name: 'Total Stock Market' },
      { symbol: 'VNQ', weight: 10, name: 'Real Estate' },
    ],
  },
  {
    id: 'max-growth',
    name: 'Maximum Growth',
    description: 'All-equity portfolio for maximum long-term returns',
    allocations: [
      { symbol: 'QQQ', weight: 40, name: 'NASDAQ 100' },
      { symbol: 'SPY', weight: 30, name: 'S&P 500' },
      { symbol: 'VTI', weight: 20, name: 'Total Stock Market' },
      { symbol: 'VWO', weight: 10, name: 'Emerging Markets' },
    ],
  },
  {
    id: 'real-assets',
    name: 'Real Assets',
    description: 'Inflation protection with real estate and commodities',
    allocations: [
      { symbol: 'VNQ', weight: 30, name: 'Real Estate' },
      { symbol: 'GLD', weight: 25, name: 'Gold' },
      { symbol: 'DBC', weight: 20, name: 'Commodities' },
      { symbol: 'SPY', weight: 25, name: 'S&P 500' },
    ],
  },
];

function calculateMetrics(portfolioReturns: number[], riskFreeRate: number = 0.05): {
  annualizedReturn: number;
  maxDrawdown: number;
  volatility: number;
  sharpe: number;
  maxGain: number;
  calmar: number;
  sortino: number;
} {
  if (portfolioReturns.length < 20) {
    return { annualizedReturn: 0, maxDrawdown: 0, volatility: 0, sharpe: 0, maxGain: 0, calmar: 0, sortino: 0 };
  }

  const meanDailyReturn = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length;
  const annualizedReturn = meanDailyReturn * 252 * 100;

  const variance = portfolioReturns.reduce((sum, r) => sum + Math.pow(r - meanDailyReturn, 2), 0) / (portfolioReturns.length - 1);
  const dailyStd = Math.sqrt(variance);
  const volatility = dailyStd * Math.sqrt(252) * 100;

  let peak = 1;
  let maxDrawdown = 0;
  let cumulative = 1;
  let maxGain = 0;

  for (const r of portfolioReturns) {
    cumulative *= (1 + r);
    if (cumulative > peak) {
      peak = cumulative;
    }
    const drawdown = (peak - cumulative) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // Max gain - use shorter window if data is limited
  const windowSize = Math.min(252, Math.floor(portfolioReturns.length / 2));
  if (windowSize >= 20) {
    for (let i = 0; i <= portfolioReturns.length - windowSize; i++) {
      const windowReturns = portfolioReturns.slice(i, i + windowSize);
      const periodReturn = windowReturns.reduce((acc, r) => acc * (1 + r), 1) - 1;
      if (periodReturn > maxGain) {
        maxGain = periodReturn;
      }
    }
  }

  const dailyRf = riskFreeRate / 252;
  const excessReturns = portfolioReturns.map(r => r - dailyRf);
  const meanExcess = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  const excessStd = Math.sqrt(excessReturns.reduce((sum, r) => sum + Math.pow(r - meanExcess, 2), 0) / (excessReturns.length - 1));
  const sharpe = excessStd > 0 ? (meanExcess / excessStd) * Math.sqrt(252) : 0;

  const negativeReturns = excessReturns.filter(r => r < 0);
  const downsideDeviation = negativeReturns.length > 0
    ? Math.sqrt(negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length) * Math.sqrt(252)
    : 0.01;
  const sortino = downsideDeviation > 0 ? (meanExcess * 252) / downsideDeviation : 0;

  const calmar = maxDrawdown > 0 ? annualizedReturn / (maxDrawdown * 100) : 0;

  return {
    annualizedReturn: Math.round(annualizedReturn * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
    volatility: Math.round(volatility * 100) / 100,
    sharpe: Math.round(sharpe * 100) / 100,
    maxGain: Math.round(maxGain * 10000) / 100,
    calmar: Math.round(calmar * 100) / 100,
    sortino: Math.round(sortino * 100) / 100,
  };
}

function calculateMatchScore(metrics: PortfolioResult['metrics'], criteria: ScreeningCriteria): number {
  let score = 100;
  
  if (criteria.maxDrawdown !== undefined) {
    if (metrics.maxDrawdown > criteria.maxDrawdown) {
      score -= Math.min(50, (metrics.maxDrawdown - criteria.maxDrawdown) * 2);
    } else {
      score += 10;
    }
  }

  if (criteria.maxVolatility !== undefined) {
    if (metrics.volatility > criteria.maxVolatility) {
      score -= Math.min(40, (metrics.volatility - criteria.maxVolatility) * 2);
    } else {
      score += 10;
    }
  }

  if (criteria.minSharpe !== undefined) {
    if (metrics.sharpe >= criteria.minSharpe) {
      score += 15;
    } else {
      score -= Math.min(30, (criteria.minSharpe - metrics.sharpe) * 20);
    }
  }

  if (criteria.minReturn !== undefined) {
    if (metrics.annualizedReturn >= criteria.minReturn) {
      score += 10;
    } else {
      score -= 20;
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { criteria }: { criteria: ScreeningCriteria } = await req.json();
    // Use 1 year lookback by default since we have limited data
    const lookbackYears = Math.min(criteria.lookbackYears || 1, 1);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - lookbackYears);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const allTickers = [...new Set(PORTFOLIO_TEMPLATES.flatMap(p => p.allocations.map(a => a.symbol)))];
    console.log(`Requesting tickers: ${allTickers.join(', ')}`);

    const { data: priceData, error: priceError } = await supabase
      .from('market_daily_bars')
      .select('ticker, bar_date, close, daily_return')
      .in('ticker', allTickers)
      .gte('bar_date', startDateStr)
      .lte('bar_date', endDateStr)
      .order('bar_date', { ascending: true });

    if (priceError) {
      console.error('Price fetch error:', priceError);
      throw new Error(`Failed to fetch price data: ${priceError.message}`);
    }

    const tickerData: Record<string, { date: string; close: number; return: number }[]> = {};
    for (const row of (priceData || [])) {
      if (!tickerData[row.ticker]) {
        tickerData[row.ticker] = [];
      }
      tickerData[row.ticker].push({
        date: row.bar_date,
        close: row.close,
        return: row.daily_return || 0,
      });
    }

    const availableTickers = Object.keys(tickerData);
    console.log(`Available tickers with data: ${availableTickers.join(', ')}`);
    for (const ticker of availableTickers) {
      console.log(`  ${ticker}: ${tickerData[ticker].length} bars`);
    }

    const results: PortfolioResult[] = [];
    const minBars = 50; // Lower threshold for matching

    for (const template of PORTFOLIO_TEMPLATES) {
      const hasAllData = template.allocations.every(a => 
        tickerData[a.symbol] && tickerData[a.symbol].length >= minBars
      );

      if (!hasAllData) {
        const missing = template.allocations.filter(a => 
          !tickerData[a.symbol] || tickerData[a.symbol].length < minBars
        ).map(a => a.symbol);
        console.log(`Skipping ${template.id} - missing: ${missing.join(', ')}`);
        continue;
      }

      const datesByTicker = template.allocations.map(a => 
        new Set(tickerData[a.symbol].map(d => d.date))
      );
      const commonDates = [...datesByTicker[0]].filter(date =>
        datesByTicker.every(dates => dates.has(date))
      ).sort();

      if (commonDates.length < minBars) {
        console.log(`Skipping ${template.id} - only ${commonDates.length} common dates`);
        continue;
      }

      console.log(`Processing ${template.id} with ${commonDates.length} common dates`);

      const portfolioReturns: number[] = [];
      
      for (const date of commonDates) {
        let portfolioReturn = 0;
        for (const allocation of template.allocations) {
          const tickerReturns = tickerData[allocation.symbol];
          const dayData = tickerReturns.find(d => d.date === date);
          if (dayData) {
            portfolioReturn += (allocation.weight / 100) * dayData.return;
          }
        }
        portfolioReturns.push(portfolioReturn);
      }

      const metrics = calculateMetrics(portfolioReturns);
      const matchScore = calculateMatchScore(metrics, criteria);

      console.log(`${template.id} metrics: DD=${metrics.maxDrawdown}%, Vol=${metrics.volatility}%, Sharpe=${metrics.sharpe}`);

      results.push({
        id: template.id,
        name: template.name,
        description: template.description,
        allocations: template.allocations,
        metrics,
        matchScore,
        isBacktested: true,
      });
    }

    results.sort((a, b) => b.matchScore - a.matchScore);

    console.log(`Returning ${results.length} portfolios`);

    return new Response(JSON.stringify({
      criteria,
      results,
      totalCount: results.length,
      lookbackYears,
      dateRange: { start: startDateStr, end: endDateStr },
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Portfolio screener error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      results: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
