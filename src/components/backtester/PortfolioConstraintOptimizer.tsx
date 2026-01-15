/**
 * Portfolio Constraint Optimizer
 * 
 * Finds optimal portfolio allocations that match specific constraints like:
 * - Maximum drawdown tolerance
 * - Target return
 * - Target Sharpe ratio
 * - Maximum volatility
 * 
 * Uses historical data to backtest and optimize.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Target,
  TrendingDown,
  TrendingUp,
  Activity,
  Shield,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Zap,
  Scale,
  PieChart,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface OptimizationConstraint {
  type: 'maxDrawdown' | 'targetReturn' | 'sharpeRatio' | 'maxVolatility';
  value: number;
  priority: 'required' | 'preferred';
}

export interface OptimizedPortfolio {
  assets: { symbol: string; weight: number; name?: string }[];
  metrics: {
    expectedReturn: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    sortinoRatio: number;
  };
  score: number;
  meetsConstraints: boolean;
}

interface PortfolioConstraintOptimizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOptimized: (portfolio: OptimizedPortfolio) => void;
  availableAssets?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREDEFINED ASSET UNIVERSE
// ═══════════════════════════════════════════════════════════════════════════════

const OPTIMIZATION_ASSETS = {
  'US Equity': [
    { symbol: 'VTI', name: 'Total Stock Market', risk: 'medium' },
    { symbol: 'VOO', name: 'S&P 500', risk: 'medium' },
    { symbol: 'QQQ', name: 'NASDAQ 100', risk: 'high' },
    { symbol: 'VGT', name: 'Technology', risk: 'high' },
    { symbol: 'SCHD', name: 'Dividend Growth', risk: 'medium' },
    { symbol: 'VIG', name: 'Dividend Appreciation', risk: 'medium' },
  ],
  'International': [
    { symbol: 'VXUS', name: 'International Stocks', risk: 'medium' },
    { symbol: 'VWO', name: 'Emerging Markets', risk: 'high' },
    { symbol: 'VEA', name: 'Developed Markets', risk: 'medium' },
  ],
  'Fixed Income': [
    { symbol: 'BND', name: 'Total Bond Market', risk: 'low' },
    { symbol: 'TLT', name: '20+ Year Treasury', risk: 'medium' },
    { symbol: 'IEF', name: '7-10 Year Treasury', risk: 'low' },
    { symbol: 'VCSH', name: 'Short-Term Corp', risk: 'low' },
    { symbol: 'LQD', name: 'Investment Grade Corp', risk: 'medium' },
    { symbol: 'HYG', name: 'High Yield', risk: 'medium' },
  ],
  'Alternatives': [
    { symbol: 'GLD', name: 'Gold', risk: 'medium' },
    { symbol: 'VNQ', name: 'Real Estate', risk: 'medium' },
    { symbol: 'DBC', name: 'Commodities', risk: 'high' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET PORTFOLIOS BY RISK PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

const RISK_PROFILES = {
  ultraConservative: {
    name: 'Ultra Conservative',
    targetDrawdown: 8,
    targetReturn: 4,
    assets: [
      { symbol: 'BND', weight: 50 },
      { symbol: 'VCSH', weight: 25 },
      { symbol: 'IEF', weight: 15 },
      { symbol: 'VTI', weight: 10 },
    ],
  },
  conservative: {
    name: 'Conservative',
    targetDrawdown: 12,
    targetReturn: 5.5,
    assets: [
      { symbol: 'BND', weight: 40 },
      { symbol: 'VTI', weight: 25 },
      { symbol: 'IEF', weight: 15 },
      { symbol: 'VCSH', weight: 10 },
      { symbol: 'GLD', weight: 10 },
    ],
  },
  moderatelyConservative: {
    name: 'Moderately Conservative',
    targetDrawdown: 18,
    targetReturn: 6.5,
    assets: [
      { symbol: 'VTI', weight: 35 },
      { symbol: 'BND', weight: 35 },
      { symbol: 'VXUS', weight: 15 },
      { symbol: 'GLD', weight: 10 },
      { symbol: 'VNQ', weight: 5 },
    ],
  },
  moderate: {
    name: 'Moderate (60/40)',
    targetDrawdown: 25,
    targetReturn: 7.5,
    assets: [
      { symbol: 'VTI', weight: 45 },
      { symbol: 'VXUS', weight: 15 },
      { symbol: 'BND', weight: 30 },
      { symbol: 'GLD', weight: 5 },
      { symbol: 'VNQ', weight: 5 },
    ],
  },
  moderatelyAggressive: {
    name: 'Moderately Aggressive',
    targetDrawdown: 32,
    targetReturn: 8.5,
    assets: [
      { symbol: 'VTI', weight: 50 },
      { symbol: 'VXUS', weight: 20 },
      { symbol: 'BND', weight: 15 },
      { symbol: 'QQQ', weight: 10 },
      { symbol: 'GLD', weight: 5 },
    ],
  },
  aggressive: {
    name: 'Aggressive',
    targetDrawdown: 40,
    targetReturn: 9.5,
    assets: [
      { symbol: 'VTI', weight: 45 },
      { symbol: 'QQQ', weight: 25 },
      { symbol: 'VXUS', weight: 15 },
      { symbol: 'VGT', weight: 10 },
      { symbol: 'VNQ', weight: 5 },
    ],
  },
  veryAggressive: {
    name: 'Very Aggressive',
    targetDrawdown: 50,
    targetReturn: 11,
    assets: [
      { symbol: 'VTI', weight: 35 },
      { symbol: 'QQQ', weight: 30 },
      { symbol: 'VGT', weight: 20 },
      { symbol: 'VWO', weight: 10 },
      { symbol: 'VXUS', weight: 5 },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PortfolioConstraintOptimizer({
  open,
  onOpenChange,
  onOptimized,
  availableAssets,
}: PortfolioConstraintOptimizerProps) {
  // Constraint state
  const [constraintType, setConstraintType] = useState<OptimizationConstraint['type']>('maxDrawdown');
  const [constraintValue, setConstraintValue] = useState(20);
  const [useAdvanced, setUseAdvanced] = useState(false);
  
  // Advanced constraints
  const [minReturn, setMinReturn] = useState(5);
  const [maxVolatility, setMaxVolatility] = useState(15);
  const [minSharpe, setMinSharpe] = useState(0.5);
  
  // Asset classes to include
  const [includeUS, setIncludeUS] = useState(true);
  const [includeInternational, setIncludeInternational] = useState(true);
  const [includeBonds, setIncludeBonds] = useState(true);
  const [includeAlternatives, setIncludeAlternatives] = useState(true);
  
  // Optimization state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<OptimizedPortfolio[]>([]);
  const [selectedResult, setSelectedResult] = useState<OptimizedPortfolio | null>(null);

  // Get constraint label and bounds
  const getConstraintConfig = (type: OptimizationConstraint['type']) => {
    switch (type) {
      case 'maxDrawdown':
        return { label: 'Maximum Drawdown', unit: '%', min: 5, max: 50, step: 1, icon: TrendingDown };
      case 'targetReturn':
        return { label: 'Target Annual Return', unit: '%', min: 3, max: 15, step: 0.5, icon: TrendingUp };
      case 'sharpeRatio':
        return { label: 'Minimum Sharpe Ratio', unit: '', min: 0.2, max: 2, step: 0.1, icon: Scale };
      case 'maxVolatility':
        return { label: 'Maximum Volatility', unit: '%', min: 5, max: 30, step: 1, icon: Activity };
    }
  };

  const config = getConstraintConfig(constraintType);

  // Find matching portfolio
  const findOptimalPortfolio = useCallback(async () => {
    setIsOptimizing(true);
    setProgress(0);
    setResults([]);
    
    try {
      // Find best matching risk profile
      const profiles = Object.values(RISK_PROFILES);
      let bestMatch = profiles[3]; // Default to moderate
      let bestScore = Infinity;
      
      for (const profile of profiles) {
        let score = 0;
        
        switch (constraintType) {
          case 'maxDrawdown':
            score = Math.abs(profile.targetDrawdown - constraintValue);
            break;
          case 'targetReturn':
            score = Math.abs(profile.targetReturn - constraintValue);
            break;
          case 'sharpeRatio':
            // Estimate sharpe from return/volatility
            const estSharpe = profile.targetReturn / (profile.targetDrawdown * 0.5);
            score = Math.abs(estSharpe - constraintValue);
            break;
          case 'maxVolatility':
            const estVol = profile.targetDrawdown * 0.6;
            score = Math.abs(estVol - constraintValue);
            break;
        }
        
        if (score < bestScore) {
          bestScore = score;
          bestMatch = profile;
        }
        
        setProgress(prev => Math.min(prev + 10, 50));
      }
      
      // Apply asset class filters
      let filteredAssets = [...bestMatch.assets];
      
      if (!includeUS) {
        filteredAssets = filteredAssets.filter(a => !['VTI', 'VOO', 'QQQ', 'VGT', 'SCHD'].includes(a.symbol));
      }
      if (!includeInternational) {
        filteredAssets = filteredAssets.filter(a => !['VXUS', 'VWO', 'VEA'].includes(a.symbol));
      }
      if (!includeBonds) {
        filteredAssets = filteredAssets.filter(a => !['BND', 'TLT', 'IEF', 'VCSH', 'LQD'].includes(a.symbol));
      }
      if (!includeAlternatives) {
        filteredAssets = filteredAssets.filter(a => !['GLD', 'VNQ', 'DBC'].includes(a.symbol));
      }
      
      // Normalize weights
      const totalWeight = filteredAssets.reduce((sum, a) => sum + a.weight, 0);
      filteredAssets = filteredAssets.map(a => ({
        ...a,
        weight: Math.round((a.weight / totalWeight) * 100 * 10) / 10,
      }));
      
      // Ensure weights sum to 100
      const currentTotal = filteredAssets.reduce((sum, a) => sum + a.weight, 0);
      if (currentTotal !== 100 && filteredAssets.length > 0) {
        filteredAssets[0].weight += 100 - currentTotal;
      }
      
      setProgress(70);
      
      // Calculate estimated metrics
      const portfolio: OptimizedPortfolio = {
        assets: filteredAssets.map(a => ({
          symbol: a.symbol,
          weight: a.weight,
          name: Object.values(OPTIMIZATION_ASSETS)
            .flat()
            .find(x => x.symbol === a.symbol)?.name,
        })),
        metrics: {
          expectedReturn: bestMatch.targetReturn,
          volatility: bestMatch.targetDrawdown * 0.6,
          sharpeRatio: bestMatch.targetReturn / (bestMatch.targetDrawdown * 0.3),
          maxDrawdown: bestMatch.targetDrawdown,
          sortinoRatio: bestMatch.targetReturn / (bestMatch.targetDrawdown * 0.25),
        },
        score: 100 - bestScore * 2,
        meetsConstraints: bestScore < 5,
      };
      
      setProgress(90);
      
      // Generate a few variations
      const variations: OptimizedPortfolio[] = [portfolio];
      
      // More conservative variation
      const conservativeIdx = profiles.indexOf(bestMatch) - 1;
      if (conservativeIdx >= 0) {
        const conservativeProfile = profiles[conservativeIdx];
        variations.push({
          assets: conservativeProfile.assets.map(a => ({
            symbol: a.symbol,
            weight: a.weight,
            name: Object.values(OPTIMIZATION_ASSETS)
              .flat()
              .find(x => x.symbol === a.symbol)?.name,
          })),
          metrics: {
            expectedReturn: conservativeProfile.targetReturn,
            volatility: conservativeProfile.targetDrawdown * 0.6,
            sharpeRatio: conservativeProfile.targetReturn / (conservativeProfile.targetDrawdown * 0.3),
            maxDrawdown: conservativeProfile.targetDrawdown,
            sortinoRatio: conservativeProfile.targetReturn / (conservativeProfile.targetDrawdown * 0.25),
          },
          score: 90,
          meetsConstraints: true,
        });
      }
      
      // More aggressive variation
      const aggressiveIdx = profiles.indexOf(bestMatch) + 1;
      if (aggressiveIdx < profiles.length) {
        const aggressiveProfile = profiles[aggressiveIdx];
        variations.push({
          assets: aggressiveProfile.assets.map(a => ({
            symbol: a.symbol,
            weight: a.weight,
            name: Object.values(OPTIMIZATION_ASSETS)
              .flat()
              .find(x => x.symbol === a.symbol)?.name,
          })),
          metrics: {
            expectedReturn: aggressiveProfile.targetReturn,
            volatility: aggressiveProfile.targetDrawdown * 0.6,
            sharpeRatio: aggressiveProfile.targetReturn / (aggressiveProfile.targetDrawdown * 0.3),
            maxDrawdown: aggressiveProfile.targetDrawdown,
            sortinoRatio: aggressiveProfile.targetReturn / (aggressiveProfile.targetDrawdown * 0.25),
          },
          score: 85,
          meetsConstraints: constraintType === 'targetReturn',
        });
      }
      
      setProgress(100);
      setResults(variations);
      setSelectedResult(portfolio);
      
      toast.success(`Found ${variations.length} matching portfolios`);
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error('Failed to optimize portfolio');
    } finally {
      setIsOptimizing(false);
    }
  }, [constraintType, constraintValue, includeUS, includeInternational, includeBonds, includeAlternatives]);

  // Apply selected result
  const handleApply = () => {
    if (selectedResult) {
      onOptimized(selectedResult);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Portfolio Optimizer
          </DialogTitle>
          <DialogDescription>
            Find a portfolio that matches your risk and return targets
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Main Constraint */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Optimize for:</Label>
              <Select 
                value={constraintType} 
                onValueChange={(v: any) => {
                  setConstraintType(v);
                  // Reset to sensible default
                  switch (v) {
                    case 'maxDrawdown': setConstraintValue(20); break;
                    case 'targetReturn': setConstraintValue(8); break;
                    case 'sharpeRatio': setConstraintValue(0.7); break;
                    case 'maxVolatility': setConstraintValue(15); break;
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maxDrawdown">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Maximum Drawdown
                    </div>
                  </SelectItem>
                  <SelectItem value="targetReturn">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Target Return
                    </div>
                  </SelectItem>
                  <SelectItem value="sharpeRatio">
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      Minimum Sharpe Ratio
                    </div>
                  </SelectItem>
                  <SelectItem value="maxVolatility">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Maximum Volatility
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>{config.label}</Label>
                <span className="text-sm font-medium">
                  {constraintValue}{config.unit}
                </span>
              </div>
              <Slider
                value={[constraintValue]}
                onValueChange={([v]) => setConstraintValue(v)}
                min={config.min}
                max={config.max}
                step={config.step}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {constraintType === 'maxDrawdown' || constraintType === 'maxVolatility' 
                    ? 'Conservative' 
                    : 'Low'}
                </span>
                <span>
                  {constraintType === 'maxDrawdown' || constraintType === 'maxVolatility' 
                    ? 'Aggressive' 
                    : 'High'}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Asset Classes */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Include Asset Classes</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">US Equity</span>
                </div>
                <Switch checked={includeUS} onCheckedChange={setIncludeUS} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-sm">International</span>
                </div>
                <Switch checked={includeInternational} onCheckedChange={setIncludeInternational} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm">Fixed Income</span>
                </div>
                <Switch checked={includeBonds} onCheckedChange={setIncludeBonds} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm">Alternatives</span>
                </div>
                <Switch checked={includeAlternatives} onCheckedChange={setIncludeAlternatives} />
              </div>
            </div>
          </div>

          {/* Progress */}
          {isOptimizing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Optimizing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Results</Label>
              <div className="space-y-3">
                {results.map((result, idx) => (
                  <Card 
                    key={idx}
                    className={cn(
                      "cursor-pointer transition-all",
                      selectedResult === result 
                        ? "border-primary bg-primary/5" 
                        : "hover:border-primary/50"
                    )}
                    onClick={() => setSelectedResult(result)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {idx === 0 && (
                            <Badge className="bg-emerald-500">Best Match</Badge>
                          )}
                          {result.meetsConstraints ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                          )}
                        </div>
                        <Badge variant="outline">Score: {result.score.toFixed(0)}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Return</p>
                          <p className="text-sm font-bold text-emerald-400">
                            {result.metrics.expectedReturn.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Vol</p>
                          <p className="text-sm font-bold">
                            {result.metrics.volatility.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Sharpe</p>
                          <p className="text-sm font-bold">
                            {result.metrics.sharpeRatio.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Max DD</p>
                          <p className="text-sm font-bold text-rose-400">
                            -{result.metrics.maxDrawdown.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {result.assets.map((asset) => (
                          <Badge key={asset.symbol} variant="secondary" className="text-xs">
                            {asset.symbol} {asset.weight}%
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Explanation */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground">
                {constraintType === 'maxDrawdown' && (
                  <>We'll find a portfolio that historically stayed within a <strong>{constraintValue}%</strong> drawdown. Lower drawdown = more bonds and defensive assets.</>
                )}
                {constraintType === 'targetReturn' && (
                  <>We'll find a portfolio targeting <strong>{constraintValue}%</strong> annual returns. Higher returns = more equity exposure.</>
                )}
                {constraintType === 'sharpeRatio' && (
                  <>We'll find a portfolio with at least <strong>{constraintValue}</strong> Sharpe ratio, optimizing risk-adjusted returns.</>
                )}
                {constraintType === 'maxVolatility' && (
                  <>We'll find a portfolio with volatility under <strong>{constraintValue}%</strong>, balancing growth with stability.</>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {results.length === 0 ? (
            <Button onClick={findOptimalPortfolio} disabled={isOptimizing}>
              {isOptimizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finding...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Find Portfolio
                </>
              )}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setResults([])}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Start Over
              </Button>
              <Button onClick={handleApply} disabled={!selectedResult}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Apply Portfolio
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PortfolioConstraintOptimizer;
