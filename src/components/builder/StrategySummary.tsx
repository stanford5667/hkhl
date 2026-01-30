/**
 * Strategy Summary Component
 * 
 * Right panel showing auto-generated strategy summary and export options.
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { CanvasBlock } from '@/lib/strategyBuilder/types';
import { serializeStrategy, encodeStrategyToURL } from '@/lib/strategyBuilder/serializer';
import { STRATEGY_TEMPLATES, type StrategyTemplate } from '@/lib/strategyBuilder/templates';

export interface StrategySummaryProps {
  blocks: CanvasBlock[];
  strategyName: string;
  ticker: string;
  onNameChange: (name: string) => void;
  onTickerChange: (ticker: string) => void;
  onLoadTemplate: (template: StrategyTemplate) => void;
  className?: string;
  compact?: boolean;
}

export const StrategySummary = memo(function StrategySummary({
  blocks,
  strategyName,
  ticker,
  onNameChange,
  onTickerChange,
  onLoadTemplate,
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

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const hasIndicator = blocks.some(b => b.type === 'indicator');
    const hasAction = blocks.some(b => b.type === 'action');
    const hasExit = blocks.some(b => b.type === 'exit');

    if (!hasIndicator) errors.push('Add at least one indicator');
    if (!hasAction) errors.push('Add a BUY action');
    if (!hasExit) warnings.push('Consider adding exit conditions');
    if (!ticker) errors.push('Enter a ticker symbol');

    return { errors, warnings, isValid: errors.length === 0 };
  }, [blocks, ticker]);

  // Handle test in backtest
  const handleTestInBacktest = () => {
    if (!serialized || !validation.isValid) {
      toast.error('Please fix errors before testing');
      return;
    }

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
      serialized,
    };
    saved.push(strategy);
    localStorage.setItem('visual_strategies', JSON.stringify(saved));
    toast.success('Strategy saved locally');
  };

  // Compact mode for embedded use
  if (compact) {
    return (
      <div className={cn("flex flex-col bg-[rgb(13,17,23)]", className)}>
        <ScrollArea className="max-h-48">
          <div className="p-2 space-y-2">
            {/* Ticker + Template row */}
            <div className="flex gap-2">
              <Input
                value={ticker}
                onChange={(e) => onTickerChange(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="h-7 text-xs uppercase flex-1 bg-[rgb(17,21,28)] border-[rgb(33,38,45)]"
              />
              <Select onValueChange={(id) => {
                const template = STRATEGY_TEMPLATES.find(t => t.id === id);
                if (template) onLoadTemplate(template);
              }}>
                <SelectTrigger className="h-7 text-xs w-32 bg-[rgb(17,21,28)] border-[rgb(33,38,45)]">
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

            {/* Conditions Summary (compact) */}
            {serialized && (
              <div className="text-[10px] space-y-1 p-2 rounded bg-[rgb(17,21,28)] border border-[rgb(33,38,45)]">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-[rgb(139,148,158)]">BUY:</span>
                  <span className="font-mono truncate">{serialized.summary.entryCondition}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-rose-500" />
                  <span className="text-[rgb(139,148,158)]">EXIT:</span>
                  <span className="font-mono truncate">{serialized.summary.exitCondition}</span>
                </div>
              </div>
            )}

            {/* Validation errors (compact) */}
            {validation.errors.length > 0 && (
              <div className="text-[10px] text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validation.errors[0]}
              </div>
            )}

            {/* Actions */}
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              onClick={handleTestInBacktest}
              disabled={!validation.isValid}
            >
              <FlaskConical className="h-3 w-3 mr-1" />
              Test Strategy
            </Button>
          </div>
        </ScrollArea>
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

          {/* Conditions Summary */}
          <Card className="bg-muted/30">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                🔍 Conditions Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              {serialized ? (
                <>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 mt-0.5 text-emerald-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">BUY when:</p>
                      <p className="text-sm font-mono">{serialized.summary.entryCondition}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <TrendingDown className="h-4 w-4 mt-0.5 text-rose-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">EXIT when:</p>
                      <p className="text-sm font-mono">{serialized.summary.exitCondition}</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add blocks to see summary
                </p>
              )}
            </CardContent>
          </Card>

          {/* Detected Strategy */}
          {serialized && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Detected:</span>
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

          {/* Validation */}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="space-y-2">
              {validation.errors.map((error, i) => (
                <div key={i} className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              ))}
              {validation.warnings.map((warning, i) => (
                <div key={i} className="flex items-center gap-2 text-amber-500 text-sm">
                  <AlertCircle className="h-4 w-4" />
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
