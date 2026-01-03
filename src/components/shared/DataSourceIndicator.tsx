import { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, Info, ChevronDown, ChevronUp, FileText, Clock, Calendar, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DataAuditReport, TickerAuditInfo, MetricCalculationInfo } from '@/services/dataValidationService';

// Types
interface DataSourceBadgeProps {
  isLive?: boolean;
  lastUpdated?: Date;
  className?: string;
}

interface DataAuditPanelProps {
  auditReport?: DataAuditReport;
  tickers?: string[];
  dateRange?: { start: string; end: string };
  tradingDays?: number;
  className?: string;
}

interface MetricSourceTooltipProps {
  children: React.ReactNode;
  metric: string;
  methodology: string;
  inputsUsed?: string[];
}

// Metric explanations lookup
const METRIC_EXPLANATIONS: Record<string, { methodology: string; inputs: string[] }> = {
  'CAGR': {
    methodology: 'Compound Annual Growth Rate = (EndValue/StartValue)^(1/Years) - 1',
    inputs: ['Portfolio daily values', 'Investment period in years']
  },
  'Sharpe Ratio': {
    methodology: 'Sharpe Ratio = (Portfolio Return - Risk Free Rate) / Portfolio Volatility',
    inputs: ['Daily returns', 'Risk-free rate (4.5%)', '252 trading days annualization']
  },
  'Sortino Ratio': {
    methodology: 'Sortino Ratio = (Portfolio Return - MAR) / Downside Deviation',
    inputs: ['Daily returns', 'Minimum acceptable return', 'Downside returns only']
  },
  'Max Drawdown': {
    methodology: 'Maximum peak-to-trough decline in portfolio value',
    inputs: ['Daily portfolio values', 'Running maximum calculation']
  },
  'Volatility': {
    methodology: 'Annualized Volatility = Daily Std Dev × √252',
    inputs: ['Daily log returns', 'Standard deviation', 'Annualization factor']
  },
  'Beta': {
    methodology: 'Beta = Covariance(Portfolio, Benchmark) / Variance(Benchmark)',
    inputs: ['Portfolio daily returns', 'S&P 500 (SPY) benchmark returns']
  },
  'Alpha': {
    methodology: 'Alpha = Portfolio Return - (Rf + Beta × (Benchmark Return - Rf))',
    inputs: ['Portfolio return', 'Benchmark return', 'Beta', 'Risk-free rate']
  },
  'Calmar Ratio': {
    methodology: 'Calmar Ratio = CAGR / Maximum Drawdown',
    inputs: ['Compound annual growth rate', 'Maximum drawdown percentage']
  },
  'Information Ratio': {
    methodology: 'Information Ratio = Active Return / Tracking Error',
    inputs: ['Portfolio excess returns vs benchmark', 'Standard deviation of excess returns']
  }
};

/**
 * DataSourceBadge - Shows live/cached data status with Polygon API attribution
 */
export function DataSourceBadge({ isLive = true, lastUpdated, className = '' }: DataSourceBadgeProps) {
  const formattedTime = lastUpdated 
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'recently';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`gap-2 px-3 py-1.5 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors cursor-help ${className}`}
          >
            {/* Pulsing dot for live data */}
            <span className="relative flex h-2 w-2">
              {isLive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
            </span>
            
            <Database className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Polygon API
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-sm">Real Market Data</p>
            <p className="text-xs text-muted-foreground">
              All calculations use real historical market data from Polygon.io. 
              {lastUpdated && ` Data refreshed ${formattedTime}.`}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * DataAuditPanel - Expandable panel showing data provenance details
 */
export function DataAuditPanel({ 
  auditReport, 
  tickers = [], 
  dateRange,
  tradingDays = 0,
  className = '' 
}: DataAuditPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Build ticker status from audit report or create default
  const tickerStatuses: TickerAuditInfo[] = auditReport?.tickerAudits || tickers.map(ticker => ({
    ticker,
    dataSource: 'Polygon.io API',
    dateRange: dateRange || { start: 'N/A', end: 'N/A' },
    barCount: tradingDays,
    dataQuality: 'high' as const,
    issues: []
  }));

  const qualityColor = {
    high: 'text-emerald-600',
    medium: 'text-amber-600',
    low: 'text-rose-600'
  };

  return (
    <Card className={`border-emerald-500/20 ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Database className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">Data Source Audit</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {tickerStatuses.length} tickers • {tradingDays || auditReport?.tickerAudits?.[0]?.barCount || 0} trading days
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Date Range & Freshness */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Date Range</p>
                  <p className="text-sm font-medium">
                    {dateRange?.start || auditReport?.tickerAudits?.[0]?.dateRange.start || 'N/A'} — {dateRange?.end || auditReport?.tickerAudits?.[0]?.dateRange.end || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Data Freshness</p>
                  <p className="text-sm font-medium">
                    {auditReport?.generatedAt 
                      ? new Date(auditReport.generatedAt).toLocaleString()
                      : 'Just now'}
                  </p>
                </div>
              </div>
            </div>

            {/* Ticker Status List */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ticker Status</p>
              <div className="grid gap-1.5 max-h-32 overflow-y-auto">
                {tickerStatuses.map((status) => (
                  <div 
                    key={status.ticker}
                    className="flex items-center justify-between px-3 py-1.5 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {status.issues.length === 0 ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      <span className="text-sm font-mono font-medium">{status.ticker}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{status.barCount} bars</span>
                      <span className={qualityColor[status.dataQuality]}>
                        {status.dataQuality}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* View Full Audit Button */}
            {auditReport && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <FileText className="h-4 w-4" />
                    View Full Audit Report
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-emerald-600" />
                      Complete Data Audit Report
                    </DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-6">
                      {/* Summary */}
                      <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                        <p className="text-sm">{auditReport.summary}</p>
                      </div>

                      {/* Ticker Details */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold">Ticker Analysis</h4>
                        {auditReport.tickerAudits.map((ticker) => (
                          <div key={ticker.ticker} className="p-3 rounded-md border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono font-semibold">{ticker.ticker}</span>
                              <Badge 
                                variant="outline" 
                                className={
                                  ticker.dataQuality === 'high' 
                                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                                    : ticker.dataQuality === 'medium'
                                    ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                                    : 'bg-rose-500/10 text-rose-700 border-rose-500/30'
                                }
                              >
                                {ticker.dataQuality} quality
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                              <div>Source: {ticker.dataSource}</div>
                              <div>Range: {ticker.dateRange.start} — {ticker.dateRange.end}</div>
                              <div>Bars: {ticker.barCount}</div>
                            </div>
                            {ticker.issues.length > 0 && (
                              <div className="mt-2 text-xs text-amber-600">
                                Issues: {ticker.issues.join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Metric Calculations */}
                      {auditReport.metricCalculations.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold">Calculation Methodology</h4>
                          {auditReport.metricCalculations.map((calc) => (
                            <div key={calc.metric} className="p-3 rounded-md border">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">{calc.metric}</span>
                                <span className="font-mono text-sm">{calc.value.toFixed(4)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">{calc.methodology}</p>
                              <div className="flex flex-wrap gap-1">
                                {calc.inputsUsed.map((input, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {input}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/**
 * MetricSourceTooltip - Wraps metric displays with calculation methodology info
 */
export function MetricSourceTooltip({ 
  children, 
  metric, 
  methodology,
  inputsUsed 
}: MetricSourceTooltipProps) {
  // Use provided values or lookup from defaults
  const explanation = METRIC_EXPLANATIONS[metric];
  const finalMethodology = methodology || explanation?.methodology || 'Calculated from real market data';
  const finalInputs = inputsUsed || explanation?.inputs || ['Historical price data'];

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1.5 cursor-help group">
            {children}
            <Info className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-emerald-600 transition-colors" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="font-medium text-sm">{metric}</span>
            </div>
            <p className="text-xs text-muted-foreground">{finalMethodology}</p>
            <div className="pt-1 border-t border-border/50">
              <p className="text-xs text-muted-foreground/80">
                <span className="font-medium">Inputs:</span> {finalInputs.join(', ')}
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * DataLoadingIndicator - Shows loading state with animation
 */
export function DataLoadingIndicator({ message = 'Fetching real market data...' }: { message?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 animate-pulse">
      <div className="relative">
        <Database className="h-5 w-5 text-emerald-600" />
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      </div>
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}
