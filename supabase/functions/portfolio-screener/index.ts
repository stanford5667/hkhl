import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScreeningCriteria {
  maxDrawdown?: number;      // Maximum drawdown tolerance (e.g., 20 = -20%)
  maxVolatility?: number;    // Max annualized volatility (e.g., 15 = 15%)
  minSharpe?: number;        // Minimum Sharpe ratio
  minReturn?: number;        // Minimum annualized return
  maxGain?: number;          // Maximum gain target
  lookbackYears?: number;    // How far back to analyze (default 5)
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

// Pre-defined portfolio templates to screen
const PORTFOLIO_TEMPLATES = [
  {
    id: 'ultra-conservative',
    name: 'Ultra Conservative',
    description: 'Treasury-heavy allocation for capital preservation',
    allocations: [
      { symbol: 'BND', weight: 60, name: 'Total Bond Market' },
      { symbol: 'VCSH', weight: 25, name: 'Short-Term Corp Bond' },
      { symbol: 'VTI', weight: 10, name: 'Total Stock Market' },
      { symbol: 'GLD', weight: 5, name: 'Gold' },
    ],
  },
  {
    id: 'conservative',
    name: 'Capital Preservation',
    description: 'Minimal volatility, focused on wealth protection',
    allocations: [
      { symbol: 'BND', weight: 50, name: 'Total Bond Market' },
      { symbol: 'VCSH', weight: 20, name: 'Short-Term Corp Bond' },
      { symbol: 'VTI', weight: 20, name: 'Total Stock Market' },
      { symbol: 'GLD', weight: 10, name: 'Gold' },
    ],
  },
  {
    id: 'income-focus',
    name: 'Income Focus',
    description: 'Dividend-focused with bond stability',
    allocations: [
      { symbol: 'VYM', weight: 30, name: 'High Dividend Yield' },
      { symbol: 'BND', weight: 40, name: 'Total Bond Market' },
      { symbol: 'VNQ', weight: 15, name: 'Real Estate' },
      { symbol: 'VIG', weight: 15, name: 'Dividend Appreciation' },
    ],
  },
  {
    id: 'balanced',
    name: 'Balanced Growth',
    description: 'Classic 60/40 allocation with global diversification',
    allocations: [
      { symbol: 'VTI', weight: 40, name: 'Total Stock Market' },
      { symbol: 'VXUS', weight: 20, name: 'International Stocks' },
      { symbol: 'BND', weight: 30, name: 'Total Bond Market' },
      { symbol: 'GLD', weight: 10, name: 'Gold' },
    ],
  },
  {
    id: 'balanced-growth',
    name: 'Growth Tilt',
    description: '70/30 allocation favoring equities',
    allocations: [
      { symbol: 'VTI', weight: 50, name: 'Total Stock Market' },
      { symbol: 'VXUS', weight: 20, name: 'International Stocks' },
      { symbol: 'BND', weight: 20, name: 'Total Bond Market' },
      { symbol: 'GLD', weight: 10, name: 'Gold' },
    ],
  },
  {
    id: 'growth',
    name: 'Growth Focus',
    description: 'Higher equity exposure for long-term wealth building',
    allocations: [
      { symbol: 'VTI', weight: 50, name: 'Total Stock Market' },
      { symbol: 'VGT', weight: 20, name: 'Tech Sector' },
      { symbol: 'VXUS', weight: 15, name: 'International Stocks' },
      { symbol: 'BND', weight: 15, name: 'Total Bond Market' },
    ],
  },
  {
    id: 'tech-growth',
    name: 'Tech Growth',
    description: 'Technology-heavy growth allocation',
    allocations: [
      { symbol: 'QQQ', weight: 40, name: 'NASDAQ 100' },
      { symbol: 'VGT', weight: 25, name: 'Tech Sector' },
      { symbol: 'VTI', weight: 25, name: 'Total Stock Market' },
      { symbol: 'BND', weight: 10, name: 'Total Bond Market' },
    ],
  },
  {
    id: 'all-weather',
    name: 'All Weather',
    description: 'Ray Dalio-inspired balanced risk allocation',
    allocations: [
      { symbol: 'VTI', weight: 30, name: 'Total Stock Market' },
      { symbol: 'TLT', weight: 40, name: 'Long-Term Treasuries' },
      { symbol: 'GLD', weight: 15, name: 'Gold' },
      { symbol: 'DBC', weight: 15, name: 'Commodities' },
    ],
  },
  {
    id: 'aggressive',
    name: 'Aggressive Growth',
    description: 'High equity exposure for maximum growth',
    allocations: [
      { symbol: 'VTI', weight: 40, name: 'Total Stock Market' },
      { symbol: 'QQQ', weight: 25, name: 'NASDAQ 100' },
      { symbol: 'VGT', weight: 20, name: 'Tech Sector' },
      { symbol: 'VXUS', weight: 15, name: 'International Stocks' },
    ],
  },
  {
    id: 'max-growth',
    name: 'Maximum Growth',
    description: 'All-equity portfolio for maximum long-term returns',
    allocations: [
      { symbol: 'VTI', weight: 35, name: 'Total Stock Market' },
      { symbol: 'QQQ', weight: 30, name: 'NASDAQ 100' },
      { symbol: 'VGT', weight: 20, name: 'Tech Sector' },
      { symbol: 'VXUS', weight: 15, name: 'International Stocks' },
    ],
  },
  {
    id: 'global-diversified',
    name: 'Global Diversified',
    description: 'Worldwide equity exposure with bond ballast',
    allocations: [
      { symbol: 'VTI', weight: 35, name: 'US Stocks' },
      { symbol: 'VXUS', weight: 35, name: 'International Stocks' },
      { symbol: 'BND', weight: 20, name: 'US Bonds' },
      { symbol: 'BNDX', weight: 10, name: 'International Bonds' },
    ],
  },
  {
    id: 'small-value',
    name: 'Small Cap Value',
    description: 'Factor-tilted toward small cap value premium',
    allocations: [
      { symbol: 'VBR', weight: 40, name: 'Small Cap Value' },
      { symbol: 'VTV', weight: 30, name: 'Large Cap Value' },
      { symbol: 'BND', weight: 20, name: 'Total Bond Market' },
      { symbol: 'GLD', weight: 10, name: 'Gold' },
    ],
  },
];

// Calculate portfolio metrics from historical data
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

  // Annualized return
  const meanDailyReturn = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length;
  const annualizedReturn = meanDailyReturn * 252 * 100; // as percentage

  // Volatility (annualized standard deviation)
  const variance = portfolioReturns.reduce((sum, r) => sum + Math.pow(r - meanDailyReturn, 2), 0) / (portfolioReturns.length - 1);
  const dailyStd = Math.sqrt(variance);
  const volatility = dailyStd * Math.sqrt(252) * 100; // as percentage

  // Max drawdown
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

  // Max gain (best rolling period gain)
  const windowSize = 252; // 1 year
  for (let i = 0; i <= portfolioReturns.length - windowSize; i++) {
    const windowReturns = portfolioReturns.slice(i, i + windowSize);
    const periodReturn = windowReturns.reduce((acc, r) => acc * (1 + r), 1) - 1;
    if (periodReturn > maxGain) {
      maxGain = periodReturn;
    }
  }

  // Sharpe ratio
  const dailyRf = riskFreeRate / 252;
  const excessReturns = portfolioReturns.map(r => r - dailyRf);
  const meanExcess = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  const excessStd = Math.sqrt(excessReturns.reduce((sum, r) => sum + Math.pow(r - meanExcess, 2), 0) / (excessReturns.length - 1));
  const sharpe = excessStd > 0 ? (meanExcess / excessStd) * Math.sqrt(252) : 0;

  // Sortino ratio (downside deviation)
  const negativeReturns = excessReturns.filter(r => r < 0);
  const downsideDeviation = negativeReturns.length > 0
    ? Math.sqrt(negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length) * Math.sqrt(252)
    : 0.01;
  const sortino = downsideDeviation > 0 ? (meanExcess * 252) / downsideDeviation : 0;

  // Calmar ratio
  const calmar = maxDrawdown > 0 ? annualizedReturn / (maxDrawdown * 100) : 0;

  return {
    annualizedReturn: Math.round(annualizedReturn * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 100, // as percentage
    volatility: Math.round(volatility * 100) / 100,
    sharpe: Math.round(sharpe * 100) / 100,
    maxGain: Math.round(maxGain * 10000) / 100, // as percentage
    calmar: Math.round(calmar * 100) / 100,
    sortino: Math.round(sortino * 100) / 100,
  };
}

// Calculate match score based on criteria
function calculateMatchScore(metrics: PortfolioResult['metrics'], criteria: ScreeningCriteria): number {
  let score = 100;
  
  // Drawdown penalty
  if (criteria.maxDrawdown !== undefined) {
    if (metrics.maxDrawdown > criteria.maxDrawdown) {
      score -= Math.min(50, (metrics.maxDrawdown - criteria.maxDrawdown) * 2);
    } else {
      score += 10; // Bonus for being under limit
    }
  }

  // Volatility penalty
  if (criteria.maxVolatility !== undefined) {
    if (metrics.volatility > criteria.maxVolatility) {
      score -= Math.min(40, (metrics.volatility - criteria.maxVolatility) * 2);
    } else {
      score += 10;
    }
  }

  // Sharpe bonus
  if (criteria.minSharpe !== undefined) {
    if (metrics.sharpe >= criteria.minSharpe) {
      score += 15;
    } else {
      score -= Math.min(30, (criteria.minSharpe - metrics.sharpe) * 20);
    }
  }

  // Return bonus
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
    const lookbackYears = criteria.lookbackYears || 5;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - lookbackYears);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get all unique tickers from templates
    const allTickers = [...new Set(PORTFOLIO_TEMPLATES.flatMap(p => p.allocations.map(a => a.symbol)))];

    // Fetch historical data for all tickers
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

    // Group data by ticker
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

    console.log(`Fetched data for ${Object.keys(tickerData).length} tickers`);

    // Calculate metrics for each portfolio
    const results: PortfolioResult[] = [];

    for (const template of PORTFOLIO_TEMPLATES) {
      // Check if we have data for all tickers in this portfolio
      const hasAllData = template.allocations.every(a => 
        tickerData[a.symbol] && tickerData[a.symbol].length > 100
      );

      if (!hasAllData) {
        console.log(`Skipping ${template.id} - missing data for some tickers`);
        continue;
      }

      // Get common dates across all portfolio tickers
      const datesByTicker = template.allocations.map(a => 
        new Set(tickerData[a.symbol].map(d => d.date))
      );
      const commonDates = [...datesByTicker[0]].filter(date =>
        datesByTicker.every(dates => dates.has(date))
      ).sort();

      if (commonDates.length < 252) {
        console.log(`Skipping ${template.id} - insufficient common dates (${commonDates.length})`);
        continue;
      }

      // Calculate portfolio returns
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

      // Calculate metrics
      const metrics = calculateMetrics(portfolioReturns);
      
      // Calculate match score
      const matchScore = calculateMatchScore(metrics, criteria);

      // Filter based on criteria
      let passesFilter = true;
      
      if (criteria.maxDrawdown !== undefined && metrics.maxDrawdown > criteria.maxDrawdown + 10) {
        passesFilter = false;
      }
      if (criteria.maxVolatility !== undefined && metrics.volatility > criteria.maxVolatility + 5) {
        passesFilter = false;
      }
      if (criteria.minSharpe !== undefined && metrics.sharpe < criteria.minSharpe - 0.3) {
        passesFilter = false;
      }

      if (passesFilter) {
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
    }

    // Sort by match score
    results.sort((a, b) => b.matchScore - a.matchScore);

    console.log(`Returning ${results.length} portfolios matching criteria`);

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
