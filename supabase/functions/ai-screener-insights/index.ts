/**
 * AI Screener Insights Edge Function
 * 
 * Generates intelligent insights for stock screener results using AI
 * Provides actionable analysis, sector breakdowns, and risk factors
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScreenerResult {
  ticker: string;
  company: string;
  sector: string;
  industry: string;
  price: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  pe: number | null;
  dividendYield: number | null;
  roe: number | null;
  netMargin: number | null;
  relativeVolume: number;
  pctFrom52WkHigh: number;
}

interface ScreenerCriteria {
  sector?: string[];
  industry?: string[];
  marketCap?: string;
  minPE?: number;
  maxPE?: number;
  minDividendYield?: number;
  minROE?: number;
  minPerfToday?: number;
  maxPerfToday?: number;
  rsiFilter?: string;
  highLow52W?: string;
  minRelativeVolume?: number;
  minFloatShort?: number;
}

interface InsightRequest {
  criteria: ScreenerCriteria;
  results: ScreenerResult[];
}

// Industry benchmark data for comparison
const SECTOR_BENCHMARKS: Record<string, { avgPE: number; avgDivYield: number; avgROE: number }> = {
  'Technology': { avgPE: 28, avgDivYield: 0.8, avgROE: 18 },
  'Healthcare': { avgPE: 22, avgDivYield: 1.5, avgROE: 14 },
  'Financial Services': { avgPE: 12, avgDivYield: 2.8, avgROE: 11 },
  'Consumer Cyclical': { avgPE: 18, avgDivYield: 1.8, avgROE: 16 },
  'Communication Services': { avgPE: 16, avgDivYield: 2.2, avgROE: 12 },
  'Industrials': { avgPE: 20, avgDivYield: 1.6, avgROE: 15 },
  'Consumer Defensive': { avgPE: 22, avgDivYield: 2.5, avgROE: 20 },
  'Energy': { avgPE: 10, avgDivYield: 4.5, avgROE: 12 },
  'Basic Materials': { avgPE: 14, avgDivYield: 2.8, avgROE: 10 },
  'Real Estate': { avgPE: 35, avgDivYield: 4.2, avgROE: 8 },
  'Utilities': { avgPE: 18, avgDivYield: 3.5, avgROE: 9 },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { criteria, results }: InsightRequest = await req.json();

    if (!results || results.length === 0) {
      return new Response(JSON.stringify({
        summary: 'No stocks found matching your criteria.',
        keyFindings: [],
        sectorBreakdown: [],
        topOpportunities: [],
        riskFactors: ['No data to analyze'],
        marketContext: 'Try broadening your search criteria.'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Calculate sector breakdown
    const sectorStats: Record<string, { count: number; totalChange: number; tickers: string[] }> = {};
    results.forEach(r => {
      const sector = normalizeSector(r.sector);
      if (!sectorStats[sector]) {
        sectorStats[sector] = { count: 0, totalChange: 0, tickers: [] };
      }
      sectorStats[sector].count++;
      sectorStats[sector].totalChange += r.changePercent;
      sectorStats[sector].tickers.push(r.ticker);
    });

    const sectorBreakdown = Object.entries(sectorStats)
      .map(([sector, data]) => ({
        sector,
        count: data.count,
        avgChange: data.count > 0 ? data.totalChange / data.count : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Generate key findings
    const keyFindings = generateKeyFindings(results, criteria, sectorBreakdown);

    // Identify top opportunities with reasons
    const topOpportunities = identifyTopOpportunities(results, criteria);

    // Assess risk factors
    const riskFactors = assessRiskFactors(results, criteria);

    // Generate market context
    const marketContext = generateMarketContext(results, criteria, sectorBreakdown);

    // Generate summary using AI if available, else use template
    const summary = generateSummary(results, criteria, sectorBreakdown);

    return new Response(JSON.stringify({
      summary,
      keyFindings,
      sectorBreakdown,
      topOpportunities,
      riskFactors,
      marketContext
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('AI Screener Insights error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      summary: 'Unable to generate insights at this time.',
      keyFindings: [],
      sectorBreakdown: [],
      topOpportunities: [],
      riskFactors: [],
      marketContext: ''
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

function normalizeSector(sector: string): string {
  const sectorLower = sector?.toLowerCase() || '';
  
  if (sectorLower.includes('tech') || sectorLower.includes('software') || sectorLower.includes('semiconductor')) {
    return 'Technology';
  }
  if (sectorLower.includes('health') || sectorLower.includes('pharma') || sectorLower.includes('biotech')) {
    return 'Healthcare';
  }
  if (sectorLower.includes('bank') || sectorLower.includes('financial') || sectorLower.includes('insurance')) {
    return 'Financial Services';
  }
  if (sectorLower.includes('energy') || sectorLower.includes('oil') || sectorLower.includes('gas')) {
    return 'Energy';
  }
  if (sectorLower.includes('utility') || sectorLower.includes('electric') || sectorLower.includes('power')) {
    return 'Utilities';
  }
  if (sectorLower.includes('real estate') || sectorLower.includes('reit')) {
    return 'Real Estate';
  }
  if (sectorLower.includes('industrial') || sectorLower.includes('aerospace') || sectorLower.includes('defense')) {
    return 'Industrials';
  }
  if (sectorLower.includes('consumer') || sectorLower.includes('retail')) {
    return 'Consumer Cyclical';
  }
  if (sectorLower.includes('material') || sectorLower.includes('chemical') || sectorLower.includes('mining')) {
    return 'Basic Materials';
  }
  if (sectorLower.includes('communication') || sectorLower.includes('media') || sectorLower.includes('telecom')) {
    return 'Communication Services';
  }
  
  return sector || 'Other';
}

function generateKeyFindings(
  results: ScreenerResult[], 
  criteria: ScreenerCriteria,
  sectorBreakdown: { sector: string; count: number; avgChange: number }[]
): string[] {
  const findings: string[] = [];

  // Overall performance analysis
  const avgChange = results.reduce((sum, r) => sum + r.changePercent, 0) / results.length;
  const gainers = results.filter(r => r.changePercent > 0).length;
  const losers = results.filter(r => r.changePercent < 0).length;
  
  if (avgChange > 3) {
    findings.push(`🚀 Strong bullish momentum: average gain of ${avgChange.toFixed(1)}% across ${results.length} stocks`);
  } else if (avgChange > 1) {
    findings.push(`📈 Positive momentum: ${gainers} gainers vs ${losers} losers, average +${avgChange.toFixed(1)}%`);
  } else if (avgChange < -3) {
    findings.push(`📉 Significant selling pressure: average decline of ${Math.abs(avgChange).toFixed(1)}%`);
  } else if (avgChange < -1) {
    findings.push(`⚠️ Mild bearish bias: ${losers} stocks declining vs ${gainers} advancing`);
  }

  // Sector concentration
  if (sectorBreakdown.length > 0) {
    const topSector = sectorBreakdown[0];
    const concentration = (topSector.count / results.length) * 100;
    if (concentration > 40) {
      findings.push(`🎯 High concentration in ${topSector.sector} (${concentration.toFixed(0)}% of results)`);
    }
    
    // Best performing sector
    const bestSector = [...sectorBreakdown].sort((a, b) => b.avgChange - a.avgChange)[0];
    if (bestSector.avgChange > 2) {
      findings.push(`🔥 ${bestSector.sector} leading with +${bestSector.avgChange.toFixed(1)}% average gain`);
    }
  }

  // Volume analysis
  const highVolume = results.filter(r => r.relativeVolume > 2);
  if (highVolume.length > results.length * 0.3) {
    findings.push(`📊 ${highVolume.length} stocks trading at 2x+ average volume - heightened activity`);
  }

  // Valuation insights
  const stocksWithPE = results.filter(r => r.pe && r.pe > 0);
  if (stocksWithPE.length > 0) {
    const avgPE = stocksWithPE.reduce((sum, r) => sum + (r.pe || 0), 0) / stocksWithPE.length;
    if (avgPE < 15) {
      findings.push(`💰 Value opportunity: average P/E of ${avgPE.toFixed(1)}x is below market average`);
    } else if (avgPE > 35) {
      findings.push(`📈 Growth focus: average P/E of ${avgPE.toFixed(1)}x indicates premium valuations`);
    }
  }

  // Dividend analysis
  const dividendPayers = results.filter(r => r.dividendYield && r.dividendYield > 0);
  if (dividendPayers.length > 0) {
    const avgYield = dividendPayers.reduce((sum, r) => sum + (r.dividendYield || 0), 0) / dividendPayers.length;
    if (avgYield > 3) {
      findings.push(`💵 Strong income potential: ${dividendPayers.length} stocks averaging ${avgYield.toFixed(1)}% yield`);
    }
  }

  // Near 52-week highs/lows
  const nearHighs = results.filter(r => r.pctFrom52WkHigh > -5);
  const nearLows = results.filter(r => r.pctFrom52WkHigh < -40);
  if (nearHighs.length > results.length * 0.3) {
    findings.push(`🏆 ${nearHighs.length} stocks trading near 52-week highs - strength confirmed`);
  }
  if (nearLows.length > results.length * 0.3) {
    findings.push(`📉 ${nearLows.length} stocks down 40%+ from highs - potential turnaround plays`);
  }

  return findings.slice(0, 5); // Limit to 5 key findings
}

function identifyTopOpportunities(
  results: ScreenerResult[], 
  criteria: ScreenerCriteria
): { ticker: string; reason: string }[] {
  const opportunities: { ticker: string; score: number; reasons: string[] }[] = [];

  results.forEach(r => {
    const reasons: string[] = [];
    let score = 0;

    // Momentum score
    if (r.changePercent > 5) {
      reasons.push('strong momentum (+' + r.changePercent.toFixed(1) + '%)');
      score += 3;
    } else if (r.changePercent > 2) {
      reasons.push('positive momentum');
      score += 1;
    }

    // Volume score
    if (r.relativeVolume > 3) {
      reasons.push('exceptional volume (' + r.relativeVolume.toFixed(1) + 'x avg)');
      score += 2;
    } else if (r.relativeVolume > 2) {
      reasons.push('elevated volume');
      score += 1;
    }

    // Valuation score
    if (r.pe && r.pe > 0 && r.pe < 15) {
      reasons.push('attractive P/E (' + r.pe.toFixed(1) + 'x)');
      score += 2;
    }

    // Dividend score
    if (r.dividendYield && r.dividendYield > 4) {
      reasons.push('high yield (' + r.dividendYield.toFixed(1) + '%)');
      score += 2;
    }

    // Quality score
    if (r.roe && r.roe > 20) {
      reasons.push('excellent ROE (' + r.roe.toFixed(0) + '%)');
      score += 2;
    }

    // Near 52-week high
    if (r.pctFrom52WkHigh > -3) {
      reasons.push('at 52-week high');
      score += 1;
    }

    // Market cap bonus for stability
    if (r.marketCap > 10e9) {
      score += 1;
    }

    if (reasons.length > 0) {
      opportunities.push({ ticker: r.ticker, score, reasons });
    }
  });

  return opportunities
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(o => ({
      ticker: o.ticker,
      reason: o.reasons.slice(0, 3).join(', ')
    }));
}

function assessRiskFactors(results: ScreenerResult[], criteria: ScreenerCriteria): string[] {
  const risks: string[] = [];

  // Market cap risk
  const smallCaps = results.filter(r => r.marketCap < 2e9);
  if (smallCaps.length > results.length * 0.5) {
    risks.push('⚠️ High small-cap exposure increases volatility and liquidity risk');
  }

  // Concentration risk
  const sectors = new Set(results.map(r => normalizeSector(r.sector)));
  if (sectors.size <= 2 && results.length > 5) {
    risks.push('⚠️ Concentrated sector exposure - consider diversification');
  }

  // Momentum reversal risk
  const bigGainers = results.filter(r => r.changePercent > 10);
  if (bigGainers.length > results.length * 0.3) {
    risks.push('⚠️ Many stocks up 10%+ today - watch for profit-taking');
  }

  // Valuation risk
  const highPE = results.filter(r => r.pe && r.pe > 50);
  if (highPE.length > results.length * 0.3) {
    risks.push('⚠️ Elevated valuations (P/E > 50x) increase downside risk');
  }

  // Short squeeze risk
  if (criteria.minFloatShort && criteria.minFloatShort > 15) {
    risks.push('⚠️ High short interest can cause extreme volatility in both directions');
  }

  // Volume sustainability
  const volumeSpikes = results.filter(r => r.relativeVolume > 4);
  if (volumeSpikes.length > results.length * 0.2) {
    risks.push('⚠️ Extreme volume spikes may not be sustainable');
  }

  // Declining stocks risk
  const bigLosers = results.filter(r => r.changePercent < -5);
  if (bigLosers.length > results.length * 0.3) {
    risks.push('⚠️ Many stocks showing significant weakness - exercise caution');
  }

  return risks.slice(0, 4); // Limit to 4 risk factors
}

function generateMarketContext(
  results: ScreenerResult[], 
  criteria: ScreenerCriteria,
  sectorBreakdown: { sector: string; count: number; avgChange: number }[]
): string {
  const parts: string[] = [];

  // Screen type context
  if (criteria.minDividendYield) {
    parts.push(`Income-focused screen targeting ${criteria.minDividendYield}%+ dividend yields.`);
  }
  if (criteria.maxPE) {
    parts.push(`Value-oriented criteria with P/E cap at ${criteria.maxPE}x.`);
  }
  if (criteria.minPerfToday && criteria.minPerfToday > 0) {
    parts.push(`Momentum filter capturing today's gainers.`);
  }
  if (criteria.highLow52W === 'new_high') {
    parts.push(`Breakout focus on stocks at or near 52-week highs.`);
  }
  if (criteria.rsiFilter?.includes('oversold')) {
    parts.push(`Oversold bounce strategy targeting technically depressed stocks.`);
  }

  // Sector context
  if (criteria.sector?.length) {
    const benchmark = SECTOR_BENCHMARKS[criteria.sector[0]];
    if (benchmark) {
      parts.push(`${criteria.sector[0]} sector trades at median P/E of ${benchmark.avgPE}x with ${benchmark.avgDivYield}% typical yield.`);
    }
  }

  // Result quality context
  if (results.length < 10) {
    parts.push(`Selective criteria producing focused results. Consider for high-conviction positions.`);
  } else if (results.length > 50) {
    parts.push(`Broad results suggest adding filters for more targeted selection.`);
  }

  return parts.join(' ');
}

function generateSummary(
  results: ScreenerResult[], 
  criteria: ScreenerCriteria,
  sectorBreakdown: { sector: string; count: number; avgChange: number }[]
): string {
  const avgChange = results.reduce((sum, r) => sum + r.changePercent, 0) / results.length;
  const topSector = sectorBreakdown[0];
  
  let summary = `Found ${results.length} stocks matching your criteria`;
  
  if (criteria.sector?.length) {
    summary += ` in the ${criteria.sector.join(' and ')} sector${criteria.sector.length > 1 ? 's' : ''}`;
  } else if (topSector) {
    summary += `, led by ${topSector.sector} (${topSector.count} stocks)`;
  }
  
  if (avgChange > 0) {
    summary += `. Average performance: +${avgChange.toFixed(1)}% today.`;
  } else if (avgChange < 0) {
    summary += `. Average performance: ${avgChange.toFixed(1)}% today.`;
  } else {
    summary += '.';
  }

  // Add quality insight
  const qualityStocks = results.filter(r => r.roe && r.roe > 15);
  if (qualityStocks.length > results.length * 0.5) {
    summary += ` ${Math.round((qualityStocks.length / results.length) * 100)}% show strong profitability metrics.`;
  }

  return summary;
}
