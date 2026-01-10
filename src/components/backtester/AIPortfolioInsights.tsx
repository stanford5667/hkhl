// Enhanced AI Portfolio Insights with educational features
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  Shield, 
  Target,
  BarChart3,
  RefreshCw,
  Lightbulb,
  PieChart,
  Info,
  Droplets,
  CheckCircle2,
  XCircle,
  Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PremiumBadge } from '@/components/ui/PremiumBadge';

export interface AIPortfolioAdvice {
  portfolioName: string;
  strategy?: string;
  strategyRationale?: string;
  expectedAnnualReturn: number;
  expectedVolatility: number;
  sharpeRatio: number;
  maxDrawdownEstimate: number;
  drawdownRecoveryMonths: number;
  allocations: {
    symbol: string;
    name: string;
    weight: number;
    assetClass: string;
    rationale: string;
    expectedReturn: number;
    volatility: number;
    idealHoldPeriod: string;
    whyThisFitsProfile?: string;
  }[];
  riskAnalysis: {
    tailRisk: string;
    correlationBenefit: string;
    regimeConsiderations: string;
  };
  drawdownScenarios: {
    scenario: string;
    historicalDates?: string;
    estimatedDrawdown: number;
    recoveryTime: string;
    explanation: string;
  }[];
  liquidityAnalysis?: {
    averageDailyVolume: string;
    liquidityScore: number;
    liquidityRisks: string[];
    timeToLiquidate: string;
  };
  rebalancingStrategy: {
    frequency: string;
    thresholdBands: string;
    taxConsiderations: string;
  };
  keyInsights: string[];
}

interface AIPortfolioInsightsProps {
  advice: AIPortfolioAdvice;
  investableCapital: number;
}

export function AIPortfolioInsights({ advice, investableCapital }: AIPortfolioInsightsProps) {
  const assetClassColors: Record<string, string> = {
    stocks: 'bg-blue-500',
    etfs: 'bg-emerald-500',
    bonds: 'bg-amber-500',
    crypto: 'bg-purple-500',
    commodities: 'bg-orange-500',
    real_estate: 'bg-pink-500',
  };

  return (
    <div className="space-y-6">
      {/* Strategy Overview */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{advice.portfolioName}</CardTitle>
              <CardDescription className="mt-1">
                {advice.strategyRationale || advice.strategy}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-primary border-primary">
              AI Generated
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-card">
              <TrendingUp className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
              <div className="text-lg font-bold text-emerald-500">
                {advice.expectedAnnualReturn.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Expected Return</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-card">
              <BarChart3 className="h-5 w-5 mx-auto text-amber-500 mb-1" />
              <div className="text-lg font-bold text-amber-500">
                {advice.expectedVolatility.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Volatility</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-card">
              <Target className="h-5 w-5 mx-auto text-blue-500 mb-1" />
              <div className="text-lg font-bold text-blue-500">
                {advice.sharpeRatio.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-card">
              <TrendingDown className="h-5 w-5 mx-auto text-rose-500 mb-1" />
              <div className="text-lg font-bold text-rose-500">
                {advice.maxDrawdownEstimate}%
              </div>
              <div className="text-xs text-muted-foreground">Max Drawdown</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="allocations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
          <TabsTrigger value="drawdown">Stress Tests</TabsTrigger>
          <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Allocations Tab with Why This? explanations */}
        <TabsContent value="allocations" className="space-y-4">
          <div className="grid gap-4">
            {advice.allocations.map((asset, idx) => (
              <Card key={idx} className="overflow-hidden">
                <div className={cn(
                  "h-1",
                  assetClassColors[asset.assetClass] || 'bg-muted'
                )} />
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold">{asset.symbol}</div>
                      <div>
                        <div className="font-medium">{asset.name}</div>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {asset.assetClass}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">{asset.weight}%</div>
                      <div className="text-sm text-muted-foreground">
                        ${((investableCapital * asset.weight) / 100).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Progress value={asset.weight} className="h-2" />
                    
                    <p className="text-sm text-muted-foreground">{asset.rationale}</p>
                    
                    {/* Why This Fits Your Profile */}
                    {asset.whyThisFitsProfile && (
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-primary mb-1">Why this fits your profile:</p>
                            <p className="text-sm text-muted-foreground">{asset.whyThisFitsProfile}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        <span>Return: {asset.expectedReturn}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3 text-amber-500" />
                        <span>Vol: {asset.volatility}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-500" />
                        <span>Hold: {asset.idealHoldPeriod}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Allocation Pie Visual */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Allocation by Asset Class
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(
                  advice.allocations.reduce((acc, a) => {
                    acc[a.assetClass] = (acc[a.assetClass] || 0) + a.weight;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([assetClass, weight]) => (
                  <div key={assetClass} className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full">
                    <div className={cn("w-3 h-3 rounded-full", assetClassColors[assetClass] || 'bg-muted')} />
                    <span className="text-sm capitalize">{assetClass.replace('_', ' ')}</span>
                    <span className="text-sm font-bold">{weight}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stress Tests Tab */}
        <TabsContent value="drawdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Historical Stress Test Scenarios
              </CardTitle>
              <CardDescription>
                How your portfolio would have performed during real market crises
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {advice.drawdownScenarios.map((scenario, idx) => (
                <div key={idx} className="p-4 rounded-lg border bg-card/50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium">{scenario.scenario}</div>
                      {scenario.historicalDates && (
                        <div className="text-xs text-muted-foreground">{scenario.historicalDates}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive">
                        {scenario.estimatedDrawdown}%
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {scenario.recoveryTime}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{scenario.explanation}</p>
                  
                  {/* Visual drawdown bar */}
                  <div className="mt-3 relative h-6 bg-muted rounded overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-rose-500/50 flex items-center justify-end pr-2"
                      style={{ width: `${Math.min(Math.abs(scenario.estimatedDrawdown), 100)}%` }}
                    >
                      <span className="text-xs font-medium text-rose-900">
                        -${((investableCapital * Math.abs(scenario.estimatedDrawdown)) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Rebalancing Strategy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Frequency</div>
                  <div className="font-medium">{advice.rebalancingStrategy.frequency}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Threshold</div>
                  <div className="font-medium">{advice.rebalancingStrategy.thresholdBands}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Tax Strategy</div>
                  <div className="font-medium text-sm">{advice.rebalancingStrategy.taxConsiderations}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Liquidity Tab */}
        <TabsContent value="liquidity" className="space-y-4">
          {advice.liquidityAnalysis ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  Liquidity Analysis
                </CardTitle>
                <CardDescription>
                  How easily you can convert your portfolio to cash
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Liquidity Score</span>
                      <Badge variant={
                        advice.liquidityAnalysis.liquidityScore >= 80 ? 'default' :
                        advice.liquidityAnalysis.liquidityScore >= 50 ? 'secondary' :
                        'destructive'
                      }>
                        {advice.liquidityAnalysis.liquidityScore}/100
                      </Badge>
                    </div>
                    <Progress value={advice.liquidityAnalysis.liquidityScore} className="h-2" />
                  </div>
                  
                  <div className="p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-1">Time to Liquidate</div>
                    <div className="font-medium">{advice.liquidityAnalysis.timeToLiquidate}</div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-2">Average Daily Volume</div>
                  <div className="font-medium">{advice.liquidityAnalysis.averageDailyVolume}</div>
                </div>

                {advice.liquidityAnalysis.liquidityRisks.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Liquidity Risks</div>
                    {advice.liquidityAnalysis.liquidityRisks.map((risk, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded bg-amber-500/10">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                        <span className="text-sm">{risk}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 flex flex-col items-center justify-center gap-2">
                <Crown className="h-8 w-8 text-amber-500/50" />
                <p className="font-medium">Premium Feature</p>
                <p className="text-sm text-muted-foreground">Liquidity analysis requires premium</p>
                <PremiumBadge variant="inline" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Risk Analysis Tab */}
        <TabsContent value="risk" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  Tail Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{advice.riskAnalysis.tailRisk}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  Diversification Benefit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{advice.riskAnalysis.correlationBenefit}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  Regime Considerations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{advice.riskAnalysis.regimeConsiderations}</p>
              </CardContent>
            </Card>
          </div>

          {/* Expected Recovery */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recovery Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-2">
                    Expected time to recover from max drawdown
                  </div>
                  <div className="text-2xl font-bold">{advice.drawdownRecoveryMonths} months</div>
                </div>
                <div className="h-16 w-px bg-border" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-2">
                    Maximum expected loss
                  </div>
                  <div className="text-2xl font-bold text-rose-500">
                    ${((investableCapital * Math.abs(advice.maxDrawdownEstimate)) / 100).toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Key Insights
              </CardTitle>
              <CardDescription>
                Important considerations for your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {advice.keyInsights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      {idx + 1}
                    </div>
                    <p className="text-sm">{insight}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
