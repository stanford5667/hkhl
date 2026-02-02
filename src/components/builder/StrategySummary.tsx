/**
 * Strategy Summary Component
 * 
 * Right panel showing auto-generated strategy summary with plain English descriptions,
 * complexity scoring, validation status, and export options.
 */

import { memo, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FlaskConical,
  Save,
  Copy,
  Check,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Shield,
  Zap,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { CanvasBlock, Connection } from '@/lib/strategyBuilder/types';
import { serializeStrategy, encodeStrategyToURL } from '@/lib/strategyBuilder/serializer';
import { STRATEGY_TEMPLATES, type StrategyTemplate } from '@/lib/strategyBuilder/templates';

export interface SerializedStrategy {
  strategy: string;
  ticker: string;
  params: Record<string, number | string | undefined>;
  summary: {
    entryCondition: string;
    exitCondition: string;
  };
}

export interface StrategySummaryProps {
  blocks: CanvasBlock[];
  connections?: Connection[];
  strategyName: string;
  ticker: string;
  onNameChange: (name: string) => void;
  onTickerChange: (ticker: string) => void;
  onLoadTemplate: (template: StrategyTemplate) => void;
  /** Optional callback for inline backtest execution (instead of navigating) */
  onRunBacktest?: (serialized: SerializedStrategy) => void;
  className?: string;
  compact?: boolean;
}

// Generate plain English description of strategy
function generatePlainEnglishSummary(blocks: CanvasBlock[], connections: Connection[]): { entry: string; exit: string } {
  const indicators = blocks.filter(b => b.type === 'indicator');
  const conditions = blocks.filter(b => b.type === 'condition');
  const exits = blocks.filter(b => b.type === 'exit');
  const actions = blocks.filter(b => b.type === 'action');

  let entryParts: string[] = [];
  let exitParts: string[] = [];

  // Build entry description
  indicators.forEach(ind => {
    const connectedCondition = conditions.find(c => 
      connections.some(conn => conn.fromBlockId === ind.id && conn.toBlockId === c.id)
    );

    let indDesc = '';
    switch (ind.subtype) {
      case 'RSI':
        indDesc = `RSI(${ind.parameters.period || 14})`;
        break;
      case 'SMA':
        indDesc = `SMA(${ind.parameters.period || 20})`;
        break;
      case 'EMA':
        indDesc = `EMA(${ind.parameters.period || 12})`;
        break;
      case 'GAP_DOWN':
        indDesc = `Gap Down`;
        break;
      case 'CONSECUTIVE_DOWN':
        indDesc = `${ind.parameters.days || 3} down days`;
        break;
      case 'VOLUME':
        indDesc = `Volume`;
        break;
      default:
        indDesc = ind.subtype;
    }

    if (connectedCondition) {
      const op = connectedCondition.subtype === 'LESS_THAN' ? '<' : 
                 connectedCondition.subtype === 'GREATER_THAN' ? '>' :
                 connectedCondition.subtype === 'CROSSES_ABOVE' ? 'crosses above' :
                 connectedCondition.subtype === 'CROSSES_BELOW' ? 'crosses below' : '=';
      const val = connectedCondition.parameters.value ?? connectedCondition.parameters.threshold ?? '?';
      
      if (ind.subtype === 'GAP_DOWN') {
        entryParts.push(`stock gaps down ${op} ${val}%`);
      } else if (ind.subtype === 'CONSECUTIVE_DOWN') {
        entryParts.push(`after ${ind.parameters.days || 3} consecutive down days`);
      } else {
        entryParts.push(`${indDesc} ${op} ${val}`);
      }
    } else {
      entryParts.push(indDesc);
    }
  });

  // Build exit description
  exits.forEach(exit => {
    switch (exit.subtype) {
      case 'TAKE_PROFIT':
        exitParts.push(`take profit at +${exit.parameters.percent || 5}%`);
        break;
      case 'STOP_LOSS':
        exitParts.push(`stop loss at -${exit.parameters.percent || 3}%`);
        break;
      case 'TIME_EXIT':
        exitParts.push(`hold for ${exit.parameters.days || 5} days`);
        break;
    }
  });

  const hasAction = actions.some(a => a.subtype === 'BUY');
  const actionVerb = hasAction ? 'BUY' : 'Enter';

  return {
    entry: entryParts.length > 0 
      ? `${actionVerb} when ${entryParts.join(' AND ')}`
      : 'Add indicators and conditions to define entry',
    exit: exitParts.length > 0 
      ? exitParts.join(', ')
      : 'Add exit rules (take profit, stop loss)',
  };
}

// Calculate strategy complexity score
function calculateComplexity(blocks: CanvasBlock[], connections: Connection[]): { score: number; label: string; color: string } {
  const blockScore = blocks.length * 10;
  const connectionScore = connections.length * 5;
  const typeBonus = new Set(blocks.map(b => b.type)).size * 5;
  
  const total = Math.min(100, blockScore + connectionScore + typeBonus);
  
  if (total < 30) return { score: total, label: 'Simple', color: 'text-emerald-500' };
  if (total < 60) return { score: total, label: 'Moderate', color: 'text-amber-500' };
  return { score: total, label: 'Complex', color: 'text-rose-500' };
}

export const StrategySummary = memo(function StrategySummary({
  blocks,
  connections = [],
  strategyName,
  ticker,
  onNameChange,
  onTickerChange,
  onLoadTemplate,
  onRunBacktest,
  className,
  compact = false,
}: StrategySummaryProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Serialize the current strategy
  const serialized = useMemo(() => {
    if (blocks.length === 0) return null;
    return serializeStrategy(blocks, ticker);
  }, [blocks, ticker]);

  // Plain English summary
  const plainEnglish = useMemo(() => 
    generatePlainEnglishSummary(blocks, connections),
    [blocks, connections]
  );

  // Complexity score
  const complexity = useMemo(() => 
    calculateComplexity(blocks, connections),
    [blocks, connections]
  );

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const hasIndicator = blocks.some(b => b.type === 'indicator');
    const hasAction = blocks.some(b => b.type === 'action');
    const hasExit = blocks.some(b => b.type === 'exit');
    const hasCondition = blocks.some(b => b.type === 'condition');

    if (!hasIndicator) errors.push('Add at least one indicator');
    if (!hasAction) errors.push('Add a BUY action');
    if (!hasCondition && hasIndicator) warnings.push('Add conditions to define entry rules');
    if (!hasExit) warnings.push('Consider adding exit conditions');
    if (!ticker) errors.push('Enter a ticker symbol');
    
    // Check connections
    if (blocks.length > 1 && connections.length === 0) {
      warnings.push('Connect your blocks to create a strategy flow');
    }

    return { 
      errors, 
      warnings, 
      isValid: errors.length === 0,
      isComplete: errors.length === 0 && warnings.length === 0,
    };
  }, [blocks, connections, ticker]);

  // Handle test in backtest
  const handleTestInBacktest = () => {
    if (!serialized || !validation.isValid) {
      toast.error('Please fix errors before testing');
      return;
    }

    // If parent provides a callback, run inline instead of navigating
    if (onRunBacktest) {
      onRunBacktest(serialized);
      toast.success('Running backtest...');
      return;
    }

    // Fallback to navigation for standalone use
    const queryString = encodeStrategyToURL(serialized);
    navigate(`/backtester?${queryString}`);
    toast.success('Opening backtester with your strategy');
  };

  // Handle copy JSON
  const handleCopyJSON = async () => {
    if (!serialized) return;
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(serialized, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Strategy JSON copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Handle save (localStorage for now)
  const handleSave = () => {
    if (!serialized) return;
    
    const saved = JSON.parse(localStorage.getItem('visual_strategies') || '[]');
    const strategy = {
      id: crypto.randomUUID(),
      name: strategyName,
      createdAt: new Date().toISOString(),
      blocks,
      connections,
      serialized,
    };
    saved.push(strategy);
    localStorage.setItem('visual_strategies', JSON.stringify(saved));
    toast.success('Strategy saved locally');
  };

  // Compact mode for embedded use
  if (compact) {
    return (
      <div className={cn("flex flex-col bg-card", className)}>
        {/* Parent handles scrolling; keep safe-area-aware bottom padding so CTA clears mobile nav */}
        <div className="p-3 space-y-3 pb-[calc(6rem+env(safe-area-inset-bottom))]">
          {/* Ticker + Template row */}
          <div className="flex gap-2">
            <Input
              value={ticker}
              onChange={(e) => onTickerChange(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="h-8 text-xs uppercase flex-1"
            />
            <Select onValueChange={(id) => {
              const template = STRATEGY_TEMPLATES.find(t => t.id === id);
              if (template) onLoadTemplate(template);
            }}>
              <SelectTrigger className="h-8 text-xs w-28">
                <SelectValue placeholder="Template" />
              </SelectTrigger>
              <SelectContent>
                {STRATEGY_TEMPLATES.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Plain English Summary (compact) */}
          {blocks.length > 0 && (
            <div className="text-[11px] space-y-1.5 p-2.5 rounded bg-muted/30 border border-border">
              <div className="flex items-start gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-foreground/80">{plainEnglish.entry}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <TrendingDown className="h-3.5 w-3.5 text-rose-500 mt-0.5 shrink-0" />
                <span className="text-foreground/80">{plainEnglish.exit}</span>
              </div>
            </div>
          )}

          {/* Validation status (compact) */}
          {blocks.length > 0 && (
            <div className="flex items-center gap-2">
              {validation.isComplete ? (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                  Ready to test
                </Badge>
              ) : validation.isValid ? (
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                  <AlertCircle className="h-2.5 w-2.5 mr-1" />
                  {validation.warnings.length} suggestion{validation.warnings.length !== 1 ? 's' : ''}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-400 border-rose-500/30">
                  <AlertCircle className="h-2.5 w-2.5 mr-1" />
                  {validation.errors[0]}
                </Badge>
              )}
            </div>
          )}

          {/* Test Strategy Button - larger touch target */}
          <Button
            size="sm"
            className="w-full h-10 text-sm font-medium"
            onClick={handleTestInBacktest}
            disabled={!validation.isValid}
          >
            <FlaskConical className="h-4 w-4 mr-2" />
            Test Strategy
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full border-l border-border bg-card/50", className)}>
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Strategy Configuration</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Strategy Name */}
          <div className="space-y-2">
            <Label htmlFor="strategy-name">Strategy Name</Label>
            <Input
              id="strategy-name"
              value={strategyName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="My Visual Strategy"
            />
          </div>

          {/* Ticker */}
          <div className="space-y-2">
            <Label htmlFor="ticker">Ticker Symbol</Label>
            <Input
              id="ticker"
              value={ticker}
              onChange={(e) => onTickerChange(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="uppercase"
            />
          </div>

          <Separator />

          {/* Load Template */}
          <div className="space-y-2">
            <Label>Load Template</Label>
            <Select onValueChange={(id) => {
              const template = STRATEGY_TEMPLATES.find(t => t.id === id);
              if (template) onLoadTemplate(template);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {STRATEGY_TEMPLATES.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Plain English Strategy Description */}
          <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Your Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Entry Signal</p>
                    <p className="text-sm font-medium">{plainEnglish.entry}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingDown className="h-4 w-4 mt-0.5 text-rose-500 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Exit Rules</p>
                    <p className="text-sm font-medium">{plainEnglish.exit}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Complexity & Status */}
          {blocks.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {/* Complexity Score */}
              <Card className="bg-muted/30">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Complexity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-lg font-bold", complexity.color)}>
                      {complexity.label}
                    </span>
                  </div>
                  <Progress value={complexity.score} className="h-1 mt-2" />
                </CardContent>
              </Card>

              {/* Validation Status */}
              <Card className="bg-muted/30">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Status</span>
                  </div>
                  {validation.isComplete ? (
                    <div className="flex items-center gap-1 text-emerald-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Ready</span>
                    </div>
                  ) : validation.isValid ? (
                    <div className="flex items-center gap-1 text-amber-500">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">{validation.warnings.length} tip{validation.warnings.length !== 1 ? 's' : ''}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-rose-500">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">{validation.errors.length} issue{validation.errors.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Detected Strategy */}
          {serialized && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Detected type:</span>
              <Badge variant="outline">{serialized.strategy}</Badge>
            </div>
          )}

          {/* Parameters */}
          {serialized && Object.keys(serialized.params).length > 0 && (
            <Card className="bg-muted/30">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  ⚙️ Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="space-y-1 text-sm font-mono">
                  {Object.entries(serialized.params).map(([key, value]) => (
                    value !== undefined && (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span>{typeof value === 'number' ? value : String(value)}</span>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Errors/Warnings */}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="space-y-2">
              {validation.errors.map((error, i) => (
                <div key={i} className="flex items-center gap-2 text-rose-500 text-sm p-2 rounded bg-rose-500/10">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              ))}
              {validation.warnings.map((warning, i) => (
                <div key={i} className="flex items-center gap-2 text-amber-500 text-sm p-2 rounded bg-amber-500/10">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {warning}
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Export Actions */}
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={handleTestInBacktest}
              disabled={!validation.isValid}
            >
              <FlaskConical className="h-4 w-4 mr-2" />
              Test in Backtest Tab
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleSave} disabled={blocks.length === 0}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={handleCopyJSON} disabled={!serialized}>
                {copied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copied ? 'Copied!' : 'Copy JSON'}
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
});
