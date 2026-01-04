import React, { useState, useMemo } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, DollarSign, PieChart, TrendingUp, TrendingDown,
  AlertTriangle, Shield, Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TradeIdea } from './TradeIdeasDashboard';

interface CalculateSizeModalProps {
  idea: TradeIdea | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userBankroll: number;
  onBankrollChange: (value: number) => void;
}

type KellyMode = 'quarter' | 'half' | 'full';

export function CalculateSizeModal({
  idea,
  open,
  onOpenChange,
  userBankroll,
  onBankrollChange,
}: CalculateSizeModalProps) {
  const [customBankroll, setCustomBankroll] = useState(userBankroll);
  const [kellyMode, setKellyMode] = useState<KellyMode>('quarter');
  const [existingExposure, setExistingExposure] = useState(0);

  if (!idea) return null;

  const expectedReturn = ((idea.target_price - idea.entry_price) / idea.entry_price) * 100;
  const maxLoss = ((idea.entry_price - idea.stop_loss_price) / idea.entry_price) * 100;
  const isBullish = idea.direction === 'buy_yes' || idea.direction === 'sell_no';

  // Calculate position sizes
  const calculations = useMemo(() => {
    const effectiveBankroll = customBankroll - existingExposure;
    
    // Kelly criterion: f* = (bp - q) / b
    // where b = odds received (target/entry - 1), p = win probability, q = 1-p
    const b = idea.target_price / idea.entry_price - 1;
    const p = idea.confidence / 100;
    const q = 1 - p;
    
    const fullKelly = Math.max(0, (b * p - q) / b);
    const halfKelly = fullKelly / 2;
    const quarterKelly = fullKelly / 4;

    const kellyMultiplier = kellyMode === 'full' ? 1 : kellyMode === 'half' ? 0.5 : 0.25;
    const suggestedFraction = fullKelly * kellyMultiplier;
    
    const suggestedAmount = effectiveBankroll * suggestedFraction;
    const suggestedPercentage = suggestedFraction * 100;

    // Expected value calculation
    const expectedValue = p * (idea.target_price - idea.entry_price) - q * (idea.entry_price - idea.stop_loss_price);
    const expectedValuePercent = (expectedValue / idea.entry_price) * 100;

    // Risk metrics
    const maxLossAmount = suggestedAmount * (maxLoss / 100);
    const maxGainAmount = suggestedAmount * (expectedReturn / 100);

    // Portfolio impact
    const newExposure = existingExposure + suggestedAmount;
    const exposurePercent = (newExposure / customBankroll) * 100;

    return {
      fullKelly: fullKelly * 100,
      halfKelly: halfKelly * 100,
      quarterKelly: quarterKelly * 100,
      suggestedAmount,
      suggestedPercentage,
      expectedValue: expectedValuePercent,
      maxLossAmount,
      maxGainAmount,
      newExposure,
      exposurePercent,
      effectiveBankroll,
    };
  }, [idea, customBankroll, existingExposure, kellyMode]);

  const kellyModeLabel: Record<KellyMode, string> = {
    quarter: 'Conservative (Quarter Kelly)',
    half: 'Moderate (Half Kelly)',
    full: 'Aggressive (Full Kelly)',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Calculate Position Size
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Trade Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">{idea.market?.title || 'Trade'}</h4>
            <div className="flex items-center gap-3 text-sm">
              <Badge 
                variant="outline"
                className={cn(
                  isBullish 
                    ? "bg-emerald-500/10 text-emerald-500" 
                    : "bg-rose-500/10 text-rose-500"
                )}
              >
                {isBullish ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {idea.direction.replace('_', ' ').toUpperCase()}
              </Badge>
              <span>@ {idea.entry_price.toFixed(2)}</span>
              <span>→ Target: {idea.target_price.toFixed(2)}</span>
              <Badge variant="secondary">{idea.confidence}% confidence</Badge>
            </div>
          </div>

          {/* Input Parameters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankroll">Your Bankroll ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="bankroll"
                  type="number"
                  value={customBankroll}
                  onChange={(e) => setCustomBankroll(parseInt(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exposure">Existing Exposure ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="exposure"
                  type="number"
                  value={existingExposure}
                  onChange={(e) => setExistingExposure(parseInt(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Amount already committed to other trades
              </p>
            </div>
          </div>

          {/* Kelly Mode Selection */}
          <div className="space-y-3">
            <Label>Risk Profile</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['quarter', 'half', 'full'] as KellyMode[]).map((mode) => (
                <Button
                  key={mode}
                  variant={kellyMode === mode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setKellyMode(mode)}
                  className="text-xs"
                >
                  {mode === 'quarter' && <Shield className="h-3 w-3 mr-1" />}
                  {mode === 'half' && <Target className="h-3 w-3 mr-1" />}
                  {mode === 'full' && <TrendingUp className="h-3 w-3 mr-1" />}
                  {mode.charAt(0).toUpperCase() + mode.slice(1)} Kelly
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {kellyModeLabel[kellyMode]}
            </p>
          </div>

          <Separator />

          {/* Results */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              Recommended Position
            </h4>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Suggested Position Size</p>
                  <p className="text-4xl font-bold text-primary">
                    ${calculations.suggestedAmount.toFixed(0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {calculations.suggestedPercentage.toFixed(1)}% of bankroll
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Kelly Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className={cn(
                "p-3 rounded-lg text-center",
                kellyMode === 'quarter' ? "bg-primary/10 ring-2 ring-primary" : "bg-muted/50"
              )}>
                <p className="text-xs text-muted-foreground">Quarter Kelly</p>
                <p className="font-semibold">{calculations.quarterKelly.toFixed(1)}%</p>
                <p className="text-xs">${(calculations.effectiveBankroll * calculations.quarterKelly / 100).toFixed(0)}</p>
              </div>
              <div className={cn(
                "p-3 rounded-lg text-center",
                kellyMode === 'half' ? "bg-primary/10 ring-2 ring-primary" : "bg-muted/50"
              )}>
                <p className="text-xs text-muted-foreground">Half Kelly</p>
                <p className="font-semibold">{calculations.halfKelly.toFixed(1)}%</p>
                <p className="text-xs">${(calculations.effectiveBankroll * calculations.halfKelly / 100).toFixed(0)}</p>
              </div>
              <div className={cn(
                "p-3 rounded-lg text-center",
                kellyMode === 'full' ? "bg-primary/10 ring-2 ring-primary" : "bg-muted/50"
              )}>
                <p className="text-xs text-muted-foreground">Full Kelly</p>
                <p className="font-semibold">{calculations.fullKelly.toFixed(1)}%</p>
                <p className="text-xs">${(calculations.effectiveBankroll * calculations.fullKelly / 100).toFixed(0)}</p>
              </div>
            </div>

            {/* Risk/Reward */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <p className="text-xs text-emerald-500 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Max Potential Gain
                </p>
                <p className="text-lg font-bold text-emerald-500">
                  +${calculations.maxGainAmount.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  +{expectedReturn.toFixed(1)}% return
                </p>
              </div>
              <div className="p-3 bg-rose-500/10 rounded-lg">
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Max Potential Loss
                </p>
                <p className="text-lg font-bold text-rose-500">
                  -${calculations.maxLossAmount.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  -{maxLoss.toFixed(1)}% at stop loss
                </p>
              </div>
            </div>

            {/* Expected Value */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Expected Value (EV)</span>
                <span className={cn(
                  "text-lg font-bold",
                  calculations.expectedValue >= 0 ? "text-emerald-500" : "text-rose-500"
                )}>
                  {calculations.expectedValue >= 0 ? '+' : ''}{calculations.expectedValue.toFixed(2)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Per dollar invested, based on {idea.confidence}% win probability
              </p>
            </div>

            {/* Portfolio Impact Warning */}
            {calculations.exposurePercent > 50 && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-500">High Portfolio Exposure</p>
                  <p className="text-xs text-muted-foreground">
                    After this trade, your total exposure would be {calculations.exposurePercent.toFixed(0)}% 
                    of your bankroll. Consider reducing position size.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button 
              className="flex-1"
              onClick={() => {
                onBankrollChange(customBankroll);
                onOpenChange(false);
              }}
            >
              Save Settings
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
