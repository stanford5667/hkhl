/**
 * AI Screener Insights Panel
 * 
 * Displays AI-generated insights for screener results including:
 * - Summary analysis
 * - Key findings
 * - Sector breakdown
 * - Top opportunities
 * - Risk factors
 * - Industry benchmarks comparison
 */

import { useState, useEffect } from 'react';
import { 
  Brain, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, 
  PieChart, Target, ChevronDown, ChevronUp, Sparkles, RefreshCw,
  BarChart3, Shield, Zap, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ScreenerResult, ScreenerCriteria } from '@/types/screener';

export interface AIScreenerInsight {
  summary: string;
  keyFindings: string[];
  sectorBreakdown: { sector: string; count: number; avgChange: number }[];
  topOpportunities: { ticker: string; reason: string }[];
  riskFactors: string[];
  marketContext: string;
}

interface AIInsightsPanelProps {
  insights: AIScreenerInsight | null;
  isLoading: boolean;
  results: ScreenerResult[];
  criteria: ScreenerCriteria;
  onRefresh?: () => void;
}

// Industry benchmark data for comparison
const INDUSTRY_BENCHMARKS: Record<string, {
  medianPE: number;
  medianDivYield: number;
  medianROE: number;
  description: string;
}> = {
  'Technology': { medianPE: 28, medianDivYield: 0.8, medianROE: 18, description: 'Growth-oriented, high valuations' },
  'Healthcare': { medianPE: 22, medianDivYield: 1.5, medianROE: 14, description: 'Defensive with growth potential' },
  'Financial Services': { medianPE: 12, medianDivYield: 2.8, medianROE: 11, description: 'Value-oriented, yield focus' },
  'Consumer Cyclical': { medianPE: 18, medianDivYield: 1.8, medianROE: 16, description: 'Economy-sensitive' },
  'Communication Services': { medianPE: 16, medianDivYield: 2.2, medianROE: 12, description: 'Mixed growth/value' },
  'Industrials': { medianPE: 20, medianDivYield: 1.6, medianROE: 15, description: 'Cyclical, capex-heavy' },
  'Consumer Defensive': { medianPE: 22, medianDivYield: 2.5, medianROE: 20, description: 'Stable, defensive' },
  'Energy': { medianPE: 10, medianDivYield: 4.5, medianROE: 12, description: 'Commodity-driven, high yield' },
  'Basic Materials': { medianPE: 14, medianDivYield: 2.8, medianROE: 10, description: 'Cyclical, commodity exposure' },
  'Real Estate': { medianPE: 35, medianDivYield: 4.2, medianROE: 8, description: 'Income-focused, rate sensitive' },
  'Utilities': { medianPE: 18, medianDivYield: 3.5, medianROE: 9, description: 'Stable income, regulated' },
};

export function AIInsightsPanel({ 
  insights, 
  isLoading, 
  results, 
  criteria,
  onRefresh 
}: AIInsightsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showBenchmarks, setShowBenchmarks] = useState(false);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 border-violet-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-500 animate-pulse" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!insights || results.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 border-violet-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-500" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Run a screen to see AI-powered insights
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 border-violet-500/20">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-500" />
                AI Analysis
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-violet-500/10 text-violet-600">
                  Beta
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                {onRefresh && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefresh();
                    }}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-5 pt-0">
            {/* Summary */}
            <div className="p-3 rounded-lg bg-background/50 border border-border/50">
              <p className="text-sm leading-relaxed">{insights.summary}</p>
            </div>

            {/* Key Findings */}
            {insights.keyFindings.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  Key Findings
                </h4>
                <ul className="space-y-1.5">
                  {insights.keyFindings.map((finding, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-muted-foreground">{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sector Breakdown */}
            {insights.sectorBreakdown.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <PieChart className="h-3.5 w-3.5 text-blue-500" />
                  Sector Distribution
                </h4>
                <div className="space-y-2">
                  {insights.sectorBreakdown.slice(0, 5).map((sector) => (
                    <div key={sector.sector} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium truncate">{sector.sector}</span>
                          <span className="text-muted-foreground">{sector.count} stocks</span>
                        </div>
                        <Progress 
                          value={(sector.count / results.length) * 100} 
                          className="h-1.5"
                        />
                      </div>
                      <span className={cn(
                        "text-xs font-medium tabular-nums w-14 text-right",
                        sector.avgChange >= 0 ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {sector.avgChange >= 0 ? '+' : ''}{sector.avgChange.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Opportunities */}
            {insights.topOpportunities.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-emerald-500" />
                  Top Opportunities
                </h4>
                <div className="space-y-2">
                  {insights.topOpportunities.map((opp) => (
                    <div 
                      key={opp.ticker} 
                      className="flex items-center justify-between p-2 rounded-md bg-background/50 border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {opp.ticker}
                        </Badge>
                        <Zap className="h-3 w-3 text-amber-500" />
                      </div>
                      <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {opp.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Factors */}
            {insights.riskFactors.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  Risk Factors
                </h4>
                <ul className="space-y-1.5">
                  {insights.riskFactors.map((risk, i) => (
                    <li key={i} className="text-sm text-amber-600/80 dark:text-amber-400/80 flex items-start gap-2">
                      <Shield className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Market Context */}
            {insights.marketContext && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {insights.marketContext}
                  </p>
                </div>
              </div>
            )}

            {/* Industry Benchmarks Toggle */}
            {criteria.sector?.length === 1 && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-xs h-8"
                  onClick={() => setShowBenchmarks(!showBenchmarks)}
                >
                  <span className="flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Industry Benchmarks
                  </span>
                  {showBenchmarks ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>
                
                {showBenchmarks && criteria.sector?.[0] && INDUSTRY_BENCHMARKS[criteria.sector[0]] && (
                  <div className="mt-2 p-3 rounded-lg bg-background/50 border border-border/50 space-y-2">
                    <p className="text-xs text-muted-foreground mb-2">
                      {INDUSTRY_BENCHMARKS[criteria.sector[0]].description}
                    </p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-lg font-semibold">{INDUSTRY_BENCHMARKS[criteria.sector[0]].medianPE}x</p>
                        <p className="text-[10px] text-muted-foreground">Median P/E</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{INDUSTRY_BENCHMARKS[criteria.sector[0]].medianDivYield}%</p>
                        <p className="text-[10px] text-muted-foreground">Median Yield</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{INDUSTRY_BENCHMARKS[criteria.sector[0]].medianROE}%</p>
                        <p className="text-[10px] text-muted-foreground">Median ROE</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Quick stats component for inline display
export function QuickInsightsBadges({ results }: { results: ScreenerResult[] }) {
  if (results.length === 0) return null;

  const avgChange = results.reduce((sum, r) => sum + r.changePercent, 0) / results.length;
  const gainers = results.filter(r => r.changePercent > 0).length;
  const highVolume = results.filter(r => r.relativeVolume > 2).length;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2">
        <Tooltip>
          <TooltipTrigger>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                avgChange >= 0 ? "border-emerald-500/30 text-emerald-600" : "border-rose-500/30 text-rose-600"
              )}
            >
              {avgChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(1)}% avg
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Average performance of screened stocks</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="text-xs">
              {gainers}/{results.length} gaining
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Number of stocks up today</TooltipContent>
        </Tooltip>

        {highVolume > 0 && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600">
                {highVolume} high volume
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Stocks with 2x+ average volume</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

// Compact inline insight for result rows
export function StockInsightBadge({ result, sectorBenchmark }: { 
  result: ScreenerResult; 
  sectorBenchmark?: typeof INDUSTRY_BENCHMARKS[string];
}) {
  const insights: string[] = [];

  // Valuation insight
  if (result.pe && sectorBenchmark) {
    if (result.pe < sectorBenchmark.medianPE * 0.7) {
      insights.push('Undervalued vs sector');
    } else if (result.pe > sectorBenchmark.medianPE * 1.3) {
      insights.push('Premium valuation');
    }
  }

  // Momentum insight
  if (result.changePercent > 5) {
    insights.push('Strong momentum');
  }

  // Volume insight
  if (result.relativeVolume > 3) {
    insights.push('Unusual activity');
  }

  // Yield insight
  if (result.dividendYield && result.dividendYield > 4) {
    insights.push('High yield');
  }

  if (insights.length === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-violet-500/10 text-violet-600">
            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
            AI
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-[200px]">
          <p className="text-xs">{insights.join(' • ')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default AIInsightsPanel;
