import { ScreenerResult, ScreenerFilters } from './polygonScreenerService';

// =====================
// Types
// =====================

export interface StockInsight {
  headline: string;
  matchReasons: string[];
  confidence: 'high' | 'medium' | 'low';
}

// =====================
// Template-based Headline Generator
// =====================

// Generate a headline explaining WHY a stock matches the criteria
export function generateStockInsight(
  stock: ScreenerResult,
  activeFilters: Record<string, string>
): StockInsight {
  const matchReasons: string[] = [];
  const headlines: string[] = [];

  // Analyze valuation metrics
  if (stock.pe !== null) {
    if (stock.pe < 15) {
      matchReasons.push('Value play with low P/E');
      headlines.push(`Trading at ${stock.pe.toFixed(1)}x earnings — below market average`);
    } else if (stock.pe > 30) {
      matchReasons.push('Growth premium valuation');
      headlines.push(`Premium P/E of ${stock.pe.toFixed(1)}x reflects growth expectations`);
    }
  }

  if (stock.peg !== null && stock.peg < 1) {
    matchReasons.push('PEG under 1 signals undervaluation');
    headlines.push(`PEG ratio of ${stock.peg.toFixed(2)} suggests growth isn't priced in`);
  }

  if (stock.pb !== null && stock.pb < 1) {
    matchReasons.push('Trading below book value');
    headlines.push(`At ${stock.pb.toFixed(2)}x book, trading below asset value`);
  }

  // Analyze momentum & performance
  if (stock.changePercent > 5) {
    matchReasons.push('Strong daily momentum');
    headlines.push(`Up ${stock.changePercent.toFixed(1)}% on elevated volume`);
  } else if (stock.changePercent > 2) {
    matchReasons.push('Positive price action');
    headlines.push(`Gaining ${stock.changePercent.toFixed(1)}% with market attention`);
  } else if (stock.changePercent < -5) {
    matchReasons.push('Sharp decline — potential reversal');
    headlines.push(`Down ${Math.abs(stock.changePercent).toFixed(1)}% — oversold bounce potential`);
  }

  // Analyze volume
  if (stock.relativeVolume !== null && stock.relativeVolume > 3) {
    matchReasons.push('Unusual volume spike');
    headlines.push(`${stock.relativeVolume.toFixed(1)}x normal volume — institutional interest likely`);
  } else if (stock.relativeVolume !== null && stock.relativeVolume > 1.5) {
    matchReasons.push('Above-average trading activity');
    headlines.push(`${stock.relativeVolume.toFixed(1)}x average volume signals accumulation`);
  }

  // Analyze profitability
  if (stock.opMargin !== null && stock.opMargin > 25) {
    matchReasons.push('High operating margins');
    headlines.push(`${stock.opMargin.toFixed(0)}% operating margin — strong pricing power`);
  }

  // Analyze growth
  if (stock.epsGrowth !== null && stock.epsGrowth > 20) {
    matchReasons.push('Strong earnings growth');
    headlines.push(`EPS growing ${stock.epsGrowth.toFixed(0)}% — outpacing peers`);
  }

  if (stock.revenueGrowth !== null && stock.revenueGrowth > 15) {
    matchReasons.push('Revenue expansion');
    headlines.push(`Revenue up ${stock.revenueGrowth.toFixed(0)}% — market share gains`);
  }

  // Analyze stability & risk
  if (stock.debtEquity !== null && stock.debtEquity < 0.5) {
    matchReasons.push('Low leverage');
    headlines.push(`D/E of ${stock.debtEquity.toFixed(2)} — conservative balance sheet`);
  }

  if (stock.beta !== null) {
    if (stock.beta < 0.7) {
      matchReasons.push('Defensive stock');
      headlines.push(`Beta of ${stock.beta.toFixed(2)} — less volatile than market`);
    } else if (stock.beta > 1.5) {
      matchReasons.push('High beta momentum play');
      headlines.push(`Beta of ${stock.beta.toFixed(2)} — amplified market moves`);
    }
  }

  if (stock.quickRatio !== null && stock.quickRatio > 2) {
    matchReasons.push('Strong liquidity');
    headlines.push(`Quick ratio of ${stock.quickRatio.toFixed(2)} — no near-term funding risk`);
  }

  // Market cap context
  if (stock.marketCap !== null) {
    if (stock.marketCap > 200_000_000_000) {
      matchReasons.push('Mega-cap stability');
    } else if (stock.marketCap < 2_000_000_000 && stock.changePercent > 3) {
      matchReasons.push('Small-cap momentum');
      headlines.push(`Small-cap breakout — ${stock.changePercent.toFixed(1)}% move on volume`);
    }
  }

  // Generate combined headline based on active filter context
  let headline = '';
  
  if (headlines.length > 0) {
    // Pick the most relevant headline based on active filters
    if (activeFilters.peRatio !== 'all' || activeFilters.peg !== 'all') {
      headline = headlines.find(h => h.includes('P/E') || h.includes('PEG') || h.includes('valuation')) || headlines[0];
    } else if (activeFilters.opMargin !== 'all' || activeFilters.epsGrowth !== 'all') {
      headline = headlines.find(h => h.includes('margin') || h.includes('EPS') || h.includes('growth')) || headlines[0];
    } else {
      headline = headlines[0];
    }
  } else {
    // Fallback headline
    const changeDir = stock.changePercent >= 0 ? 'up' : 'down';
    headline = `${stock.name} ${changeDir} ${Math.abs(stock.changePercent).toFixed(1)}% today`;
  }

  // Determine confidence based on number of matching signals
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (matchReasons.length >= 4) {
    confidence = 'high';
  } else if (matchReasons.length >= 2) {
    confidence = 'medium';
  }

  return {
    headline,
    matchReasons: matchReasons.slice(0, 4), // Limit to top 4 reasons
    confidence,
  };
}

// Batch generate insights for multiple stocks
export async function generateBatchInsights(
  stocks: ScreenerResult[],
  activeFilters: Record<string, string>
): Promise<Map<string, StockInsight>> {
  const insights = new Map<string, StockInsight>();
  
  // Process in chunks to avoid blocking UI
  const chunkSize = 10;
  for (let i = 0; i < stocks.length; i += chunkSize) {
    const chunk = stocks.slice(i, i + chunkSize);
    
    // Small delay to allow UI updates
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    chunk.forEach(stock => {
      insights.set(stock.symbol, generateStockInsight(stock, activeFilters));
    });
  }
  
  return insights;
}

// Get a short summary for the insight column
export function getInsightSummary(insight: StockInsight): string {
  if (insight.matchReasons.length === 0) {
    return '—';
  }
  return insight.matchReasons[0];
}
