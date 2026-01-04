import React, { useState, useMemo } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, DollarSign, PieChart, TrendingUp, TrendingDown,
  AlertTriangle, Shield, Target, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TradeIdea } from './TradeIdeasDashboard';
import {
  calculateKellyCriterion,
  calculateExpectedValue,
  calculatePositionSize,
  priceToDecimalOdds,
} from '@/utils/predictionMath';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  // Allow user to override confidence if they disagree with AI
  const [customConfidence, setCustomConfidence] = useState<number | null>(null);

  if (!idea) return null;

  const expectedReturn = ((idea.target_price - idea.entry_price) / idea.entry_price) * 100;
  const maxLossPercent = ((idea.entry_price - idea.stop_loss_price) / idea.entry_price) * 100;
  const isBullish = idea.direction === 'buy_yes' || idea.direction === 'sell_no';

  // Use AI confidence as win probability, or custom override
  const winProbability = (customConfidence ?? idea.confidence) / 100;

  // Calculate using pure TypeScript utilities - NO AI
  const calculations = useMemo(() => {
    const effectiveBankroll = customBankroll - existingExposure;
    
    // Convert entry price to decimal odds
    const decimalOdds = priceToDecimalOdds(idea.entry_price);
    
    // Calculate Kelly criterion
    const kelly = calculateKellyCriterion(winProbability, decimalOdds);
    
    // Select Kelly fraction based on mode
    const kellyMultiplier = kellyMode === 'full' ? 1 : kellyMode === 'half' ? 0.5 : 0.25;
    const selectedKellyFraction = kelly.fullKelly * kellyMultiplier;
    
    // Calculate position size
    const position = calculatePositionSize(
      customBankroll,
      selectedKellyFraction,
      idea.entry_price,
      idea.target_price,
      idea.stop_loss_price,
      existingExposure
    );
    
    // Calculate expected value
    const ev = calculateExpectedValue(winProbability, decimalOdds);
    
    // Portfolio exposure
    const newExposure = existingExposure + position.positionSize;
    const exposurePercent = (newExposure / customBankroll) * 100;

    return {
      kelly,
      position,
      ev,
      selectedKellyFraction,
      effectiveBankroll,
      newExposure,
      exposurePercent,
    };
  }, [idea, customBankroll, existingExposure, kellyMode, winProbability]);

  const kellyModeLabel: Record<KellyMode, string> = {
    quarter: 'Conservative (Quarter Kelly)',
    half: 'Moderate (Half Kelly)',
    full: 'Aggressive (Full Kelly)',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Position Sizing Calculator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Trade Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">{idea.market?.title || 'Trade'}</h4>
            <div className="flex items-center gap-3 text-sm flex-wrap">
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

          {/* Win Probability (AI Confidence) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="confidence">Win Probability</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>AI provides a confidence score as the estimated win probability. 
                    You can override this if you disagree with the AI's assessment.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Input
                  id="confidence"
                  type="number"
                  min={1}
                  max={99}
                  value={customConfidence ?? idea.confidence}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val >= 1 && val <= 99) {
                      setCustomConfidence(val);
                    }
                  }}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              {customConfidence !== null && customConfidence !== idea.confidence && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCustomConfidence(null)}
                >
                  Reset to AI: {idea.confidence}%
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              AI confidence: {idea.confidence}% • Used as win probability in Kelly formula
            </p>
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
                    ${calculations.position.positionSize.toFixed(0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {calculations.position.positionPercent.toFixed(1)}% of bankroll
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
                <p className="font-semibold">{(calculations.kelly.quarterKelly * 100).toFixed(1)}%</p>
                <p className="text-xs">${(calculations.effectiveBankroll * calculations.kelly.quarterKelly).toFixed(0)}</p>
              </div>
              <div className={cn(
                "p-3 rounded-lg text-center",
                kellyMode === 'half' ? "bg-primary/10 ring-2 ring-primary" : "bg-muted/50"
              )}>
                <p className="text-xs text-muted-foreground">Half Kelly</p>
                <p className="font-semibold">{(calculations.kelly.halfKelly * 100).toFixed(1)}%</p>
                <p className="text-xs">${(calculations.effectiveBankroll * calculations.kelly.halfKelly).toFixed(0)}</p>
              </div>
              <div className={cn(
                "p-3 rounded-lg text-center",
                kellyMode === 'full' ? "bg-primary/10 ring-2 ring-primary" : "bg-muted/50"
              )}>
                <p className="text-xs text-muted-foreground">Full Kelly</p>
                <p className="font-semibold">{(calculations.kelly.fullKelly * 100).toFixed(1)}%</p>
                <p className="text-xs">${(calculations.effectiveBankroll * calculations.kelly.fullKelly).toFixed(0)}</p>
              </div>
            </div>

            {/* Edge indicator */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your Edge</span>
                <span className={cn(
                  "font-medium",
                  calculations.kelly.edge > 0 ? "text-emerald-500" : "text-rose-500"
                )}>
                  {(calculations.kelly.edge * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {calculations.kelly.isPositiveEV 
                  ? "✓ Positive expected value - bet has edge"
                  : "✗ Negative expected value - no edge detected"}
              </p>
            </div>

            {/* Risk/Reward */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <p className="text-xs text-emerald-500 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Max Potential Gain
                </p>
                <p className="text-lg font-bold text-emerald-500">
                  +${calculations.position.maxGain.toFixed(0)}
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
                  -${calculations.position.maxLoss.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  -{maxLossPercent.toFixed(1)}% at stop loss
                </p>
              </div>
            </div>

            {/* Expected Value */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Expected Value (EV)</span>
                <span className={cn(
                  "text-lg font-bold",
                  calculations.ev.isPositiveEV ? "text-emerald-500" : "text-rose-500"
                )}>
                  {calculations.ev.expectedValuePercent >= 0 ? '+' : ''}{calculations.ev.expectedValuePercent.toFixed(2)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Per dollar invested, based on {(winProbability * 100).toFixed(0)}% win probability
              </p>
            </div>

            {/* Risk/Reward Ratio */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Risk/Reward Ratio</span>
                <span className="font-medium">
                  1:{calculations.position.riskRewardRatio.toFixed(2)}
                </span>
              </div>
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

            {/* No edge warning */}
            {!calculations.kelly.isPositiveEV && (
              <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-rose-500">No Edge Detected</p>
                  <p className="text-xs text-muted-foreground">
                    Based on your win probability estimate, this bet has negative expected value.
                    Kelly suggests 0% allocation. Consider passing on this trade.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Formula explanation */}
          <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
            <p className="font-medium mb-1">Kelly Formula: f* = (bp - q) / b</p>
            <p>where b = odds - 1, p = win probability, q = 1 - p</p>
            <p className="mt-1">All calculations done locally in TypeScript - no AI involved in sizing.</p>
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
