/**
 * Data Inspector Components for Backtester
 * 
 * Provides transparency into data provenance, calculation logic,
 * and raw API data for audit and verification purposes.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Shield,
  Eye,
  Database,
  ExternalLink,
  Calendar,
  Calculator,
  FileJson,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  dailyReturn?: number;
}

interface Trade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  shares: number;
  pnl: number;
  pnlPercent: number;
  type: 'LONG' | 'SHORT';
  entryReason: string;
  exitReason: string;
  holdingDays: number;
  entryBarRaw?: Bar;
  exitBarRaw?: Bar;
  indicatorValueAtEntry?: number;
  indicatorValueAtExit?: number;
  indicatorName?: string;
}

interface BacktestResult {
  strategy: string;
  ticker: string;
  startDate: string;
  endDate: string;
  dataSource: 'database' | 'polygon';
  dataSourceUrl: string;
  barsCount: number;
  rawBarsPreview: Bar[];
  totalReturn: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  initialCapital: number;
  finalValue: number;
  trades: Trade[];
}

interface InspectModeToggleProps {
  inspectMode: boolean;
  onToggle: (enabled: boolean) => void;
}

interface AuditableStatProps {
  label: string;
  value: string;
  inspectMode: boolean;
  provenance: {
    dataSource: string;
    dateRange: string;
    logic: string;
    formula?: string;
  };
  trend?: 'good' | 'bad' | 'neutral';
}

interface TradeSourceModalProps {
  trade: Trade | null;
  ticker: string;
  dataSource: string;
  onClose: () => void;
}

interface ExecutionLogProps {
  trades: Trade[];
  ticker: string;
  dataSource: string;
  inspectMode: boolean;
  onViewSource: (trade: Trade) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSPECT MODE TOGGLE
// ═══════════════════════════════════════════════════════════════════════════════

export function InspectModeToggle({ inspectMode, onToggle }: InspectModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border">
              <Shield className={cn(
                "h-4 w-4 transition-colors",
                inspectMode ? "text-amber-400" : "text-muted-foreground"
              )} />
              <Label htmlFor="inspect-mode" className="text-xs font-medium cursor-pointer">
                Inspect
              </Label>
              <Switch
                id="inspect-mode"
                checked={inspectMode}
                onCheckedChange={onToggle}
                className="scale-75"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs max-w-xs">
              Enable Inspect Mode to see the data source, calculation logic, and raw API data behind every statistic.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDITABLE STAT CARD
// ═══════════════════════════════════════════════════════════════════════════════

export function AuditableStat({ 
  label, 
  value, 
  inspectMode, 
  provenance,
  trend 
}: AuditableStatProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "p-3 rounded-lg bg-secondary/50 border transition-all cursor-help",
            inspectMode 
              ? "border-dashed border-amber-500/50 hover:border-amber-500" 
              : "border-border"
          )}>
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              {label}
              {inspectMode && <Eye className="h-3 w-3 text-amber-400" />}
            </p>
            <p className={cn(
              "text-xl font-bold tabular-nums font-mono",
              trend === 'good' && 'text-emerald-400',
              trend === 'bad' && 'text-rose-400'
            )}>
              {value}
            </p>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className={cn(
            "max-w-sm",
            inspectMode && "bg-amber-950/90 border-amber-500/50"
          )}
        >
          {inspectMode ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Shield className="h-3.5 w-3.5" />
                Data Provenance
              </div>
              <Separator className="bg-amber-500/20" />
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <Database className="h-3 w-3 mt-0.5 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Source: </span>
                    <span className="text-foreground">{provenance.dataSource}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-3 w-3 mt-0.5 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Date Range: </span>
                    <span className="text-foreground">{provenance.dateRange}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calculator className="h-3 w-3 mt-0.5 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Logic: </span>
                    <span className="text-foreground">{provenance.logic}</span>
                  </div>
                </div>
                {provenance.formula && (
                  <div className="mt-2 p-2 bg-black/30 rounded font-mono text-[10px] text-amber-300">
                    {provenance.formula}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs">{provenance.logic}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE SOURCE MODAL
// ═══════════════════════════════════════════════════════════════════════════════

export function TradeSourceModal({ trade, ticker, dataSource, onClose }: TradeSourceModalProps) {
  if (!trade) return null;

  const formatBarJson = (bar: Bar | undefined, label: string) => {
    if (!bar) return null;
    return {
      [`${label}_date`]: bar.date,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
      daily_return: bar.dailyReturn
    };
  };

  const entryData = formatBarJson(trade.entryBarRaw, 'entry');
  const exitData = formatBarJson(trade.exitBarRaw, 'exit');

  return (
    <Dialog open={!!trade} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            Raw Data Source
          </DialogTitle>
          <DialogDescription>
            Verify the OHLCV data used for this trade signal
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Data Source Info */}
          <div className="p-3 rounded-lg bg-secondary/50 border">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Data Source</span>
            </div>
            <p className="text-xs text-muted-foreground font-mono break-all">
              {dataSource === 'polygon' 
                ? `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/...`
                : `Lovable Cloud DB: market_daily_bars (ticker=${ticker})`
              }
            </p>
          </div>

          {/* Trade Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-400 mb-1">Entry Signal</p>
              <p className="text-sm font-semibold">{trade.entryReason}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(trade.entryDate), 'MMM dd, yyyy')} @ ${trade.entryPrice.toFixed(2)}
              </p>
              {trade.indicatorValueAtEntry !== undefined && (
                <Badge variant="outline" className="mt-2 text-[10px]">
                  {trade.indicatorName}: {trade.indicatorValueAtEntry.toFixed(2)}
                </Badge>
              )}
            </div>
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <p className="text-xs text-rose-400 mb-1">Exit Signal</p>
              <p className="text-sm font-semibold">{trade.exitReason}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(trade.exitDate), 'MMM dd, yyyy')} @ ${trade.exitPrice.toFixed(2)}
              </p>
              {trade.indicatorValueAtExit !== undefined && (
                <Badge variant="outline" className="mt-2 text-[10px]">
                  {trade.indicatorName}: {trade.indicatorValueAtExit.toFixed(2)}
                </Badge>
              )}
            </div>
          </div>

          {/* Raw JSON Data */}
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              Raw Bar Data (from API)
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {entryData && (
                <div>
                  <p className="text-xs text-emerald-400 mb-1">Entry Day Bar</p>
                  <ScrollArea className="h-48 rounded-lg border bg-black/50 p-3">
                    <pre className="text-[10px] font-mono text-emerald-300">
                      {JSON.stringify(entryData, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
              {exitData && (
                <div>
                  <p className="text-xs text-rose-400 mb-1">Exit Day Bar</p>
                  <ScrollArea className="h-48 rounded-lg border bg-black/50 p-3">
                    <pre className="text-[10px] font-mono text-rose-300">
                      {JSON.stringify(exitData, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>

            {(!entryData && !exitData) && (
              <div className="p-4 text-center text-muted-foreground text-sm border rounded-lg">
                <Info className="h-5 w-5 mx-auto mb-2" />
                Raw bar data not available for this trade
              </div>
            )}
          </div>

          {/* Verification Note */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
            <p className="text-amber-400 font-medium mb-1">💡 Verification Tip</p>
            <p className="text-muted-foreground">
              Compare the <code className="text-amber-300">close</code> price above with the Entry/Exit prices. 
              They should match exactly, confirming the backtest used real market data.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETAILED EXECUTION LOG
// ═══════════════════════════════════════════════════════════════════════════════

export function ExecutionLog({ 
  trades, 
  ticker, 
  dataSource, 
  inspectMode,
  onViewSource 
}: ExecutionLogProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (trades.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "w-full justify-between",
            inspectMode && "border-dashed border-amber-500/50"
          )}
        >
          <span className="flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            Detailed Execution Log ({trades.length} trades)
            {inspectMode && <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/50">Auditable</Badge>}
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className={cn(
          "rounded-lg border overflow-hidden",
          inspectMode && "border-dashed border-amber-500/30"
        )}>
          <ScrollArea className="h-[400px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card border-b">
                <tr>
                  <th className="text-left p-3 font-medium">#</th>
                  <th className="text-left p-3 font-medium">Signal Type</th>
                  <th className="text-left p-3 font-medium">Entry Date</th>
                  <th className="text-right p-3 font-medium">Entry $</th>
                  <th className="text-left p-3 font-medium">Exit Date</th>
                  <th className="text-right p-3 font-medium">Exit $</th>
                  <th className="text-right p-3 font-medium">Result</th>
                  {inspectMode && <th className="text-center p-3 font-medium">Source</th>}
                </tr>
              </thead>
              <tbody>
                {trades.map((trade, i) => (
                  <tr 
                    key={i} 
                    className={cn(
                      "border-b transition-colors",
                      inspectMode ? "hover:bg-amber-500/10" : "hover:bg-secondary/50"
                    )}
                  >
                    <td className="p-3 font-mono">{i + 1}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{trade.entryReason.split(' ')[0]}</span>
                        {trade.indicatorValueAtEntry !== undefined && (
                          <span className="text-[10px] text-muted-foreground">
                            {trade.indicatorName}: {trade.indicatorValueAtEntry.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">{format(new Date(trade.entryDate), 'MMM dd, yy')}</td>
                    <td className="p-3 text-right font-mono">${trade.entryPrice.toFixed(2)}</td>
                    <td className="p-3">{format(new Date(trade.exitDate), 'MMM dd, yy')}</td>
                    <td className="p-3 text-right font-mono">${trade.exitPrice.toFixed(2)}</td>
                    <td className={cn(
                      "p-3 text-right font-mono font-semibold",
                      trade.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    )}>
                      {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                    </td>
                    {inspectMode && (
                      <td className="p-3 text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-[10px] text-amber-400 hover:text-amber-300"
                          onClick={() => onViewSource(trade)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Source
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHART TRADE MARKERS DATA
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChartMarker {
  date: string;
  type: 'BUY' | 'SELL';
  price: number;
  indicatorValue?: number;
  indicatorName?: string;
  reason: string;
}

export function getChartMarkers(trades: Trade[]): ChartMarker[] {
  const markers: ChartMarker[] = [];
  
  for (const trade of trades) {
    markers.push({
      date: trade.entryDate,
      type: 'BUY',
      price: trade.entryPrice,
      indicatorValue: trade.indicatorValueAtEntry,
      indicatorName: trade.indicatorName,
      reason: trade.entryReason
    });
    markers.push({
      date: trade.exitDate,
      type: 'SELL',
      price: trade.exitPrice,
      indicatorValue: trade.indicatorValueAtExit,
      indicatorName: trade.indicatorName,
      reason: trade.exitReason
    });
  }
  
  return markers;
}
