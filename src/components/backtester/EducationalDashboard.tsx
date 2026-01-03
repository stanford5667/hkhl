// Educational Dashboard - Human-readable metrics and interactive stress tests
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Moon, 
  Sun, 
  CloudRain, 
  Zap,
  TrendingDown,
  Clock,
  AlertTriangle,
  Info,
  HelpCircle,
  Gauge,
  Shield,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdvancedRiskMetrics } from '@/services/advancedMetricsService';
import { StressTestResult, STRESS_TEST_PERIODS } from '@/services/stressTestService';
import { TickerDetails } from '@/services/tickerDetailsService';

interface EducationalDashboardProps {
  metrics: AdvancedRiskMetrics;
  investableCapital: number;
  portfolioVolatility: number; // Passed separately since not in AdvancedRiskMetrics
  stressTestResults?: StressTestResult[];
  tickerDetails?: Map<string, TickerDetails>;
  allocations: Array<{
    symbol: string;
    name: string;
    weight: number;
    assetClass: string;
    whyThisFitsProfile?: string;
  }>;
  portfolioMode: 'manual' | 'ai';
}

// Convert volatility to "Sleep Score" (inverse relationship)
function volatilityToSleepScore(volatility: number): { score: number; label: string; emoji: string } {
  const score = Math.max(0, Math.min(100, 100 - volatility * 4));
  
  if (score >= 80) return { score, label: 'Excellent - Sleep soundly', emoji: '😴' };
  if (score >= 60) return { score, label: 'Good - Minor tossing', emoji: '😌' };
  if (score >= 40) return { score, label: 'Moderate - Some restless nights', emoji: '😐' };
  if (score >= 20) return { score, label: 'Poor - Expect anxiety', emoji: '😰' };
  return { score, label: 'Severe - Buckle up', emoji: '😱' };
}

// Format drawdown as dollar loss
function formatWorstCase(drawdown: number, capital: number): string {
  const dollarLoss = Math.abs(capital * (drawdown / 100));
  return `-$${dollarLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function EducationalDashboard({
  metrics,
  investableCapital,
  portfolioVolatility,
  stressTestResults,
  tickerDetails,
  allocations,
  portfolioMode,
}: EducationalDashboardProps) {
  const [selectedStressTest, setSelectedStressTest] = useState('normal');
  
  const sleepScore = volatilityToSleepScore(portfolioVolatility);
  const worstCase = formatWorstCase(metrics.maxDrawdown, investableCapital);
  
  // Find the selected stress test result
  const currentStressTest = stressTestResults?.find(r => r.period.id === selectedStressTest);
  
  return (
    <div className="space-y-6">
      {/* Human-Readable Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sleep Score Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
            <Moon className="w-full h-full" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Moon className="h-4 w-4 text-indigo-500" />
              Sleep Score
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium mb-1">How well you'll sleep</p>
                    <p className="text-xs text-muted-foreground">
                      Based on portfolio volatility. Lower volatility = better sleep.
                      Calculated as: 100 - (Volatility × 4)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl">{sleepScore.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl font-bold">{sleepScore.score.toFixed(0)}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <Progress value={sleepScore.score} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{sleepScore.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Worst Case Scenario Card */}
        <Card className="relative overflow-hidden border-rose-500/20">
          <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
            <TrendingDown className="w-full h-full text-rose-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              Worst Case Scenario
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium mb-1">Maximum Drawdown in Dollars</p>
                    <p className="text-xs text-muted-foreground">
                      The largest peak-to-trough decline your portfolio might experience,
                      based on historical volatility patterns.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-500">{worstCase}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Maximum potential loss from peak
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {metrics.maxDrawdown.toFixed(1)}% drawdown
              </Badge>
              <Badge variant="outline" className="text-xs">
                Recovery: ~{Math.round(Math.abs(metrics.maxDrawdown) * 0.8)} months
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Turbulence Rating Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
            <Gauge className="w-full h-full" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Turbulence Rating
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium mb-1">Portfolio Volatility</p>
                    <p className="text-xs text-muted-foreground">
                      How much your portfolio value will bounce around.
                      Lower is smoother, higher means bigger swings.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{portfolioVolatility.toFixed(1)}%</span>
              <Badge variant={
                portfolioVolatility < 10 ? 'default' :
                portfolioVolatility < 20 ? 'secondary' :
                'destructive'
              }>
                {portfolioVolatility < 10 ? 'Calm Skies' :
                 portfolioVolatility < 20 ? 'Light Chop' :
                 'Stormy'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {portfolioVolatility < 15 
                ? 'Your returns will be relatively stable day-to-day'
                : 'Expect significant daily swings - normal for growth portfolios'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stress Test Toggle Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="h-5 w-5 text-blue-500" />
            Can You Handle This?
          </CardTitle>
          <CardDescription>
            See how your portfolio would perform during historical market stress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedStressTest} onValueChange={setSelectedStressTest}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="normal" className="gap-2">
                <Sun className="h-4 w-4" />
                Normal Market
              </TabsTrigger>
              <TabsTrigger value="covid-2020" className="gap-2">
                <Zap className="h-4 w-4" />
                COVID Crash
              </TabsTrigger>
              <TabsTrigger value="bear-2022" className="gap-2">
                <TrendingDown className="h-4 w-4" />
                2022 Bear
              </TabsTrigger>
            </TabsList>

            {STRESS_TEST_PERIODS.map(period => (
              <TabsContent key={period.id} value={period.id}>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Scenario Description */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">{period.name}</h4>
                      <p className="text-sm text-muted-foreground">{period.description}</p>
                      {period.id !== 'normal' && (
                        <Badge variant="destructive" className="mt-2">
                          Market dropped {period.marketDrawdown}%
                        </Badge>
                      )}
                    </div>

                    {currentStressTest && (
                      <div className="p-4 rounded-lg border border-dashed">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Your Portfolio Impact
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Portfolio Drawdown:</span>
                            <span className={cn(
                              "font-bold",
                              currentStressTest.portfolioDrawdown < -10 ? "text-rose-500" : "text-foreground"
                            )}>
                              {currentStressTest.portfolioDrawdown.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dollar Loss:</span>
                            <span className="font-bold text-rose-500">
                              -${currentStressTest.dollarLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Period Return:</span>
                            <span className={cn(
                              "font-bold",
                              currentStressTest.portfolioReturn > 0 ? "text-emerald-500" : "text-rose-500"
                            )}>
                              {currentStressTest.portfolioReturn > 0 ? '+' : ''}{currentStressTest.portfolioReturn.toFixed(1)}%
                            </span>
                          </div>
                          {currentStressTest.recoveryDays && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Recovery Time:</span>
                              <span className="font-bold">
                                ~{currentStressTest.recoveryDays} days
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Visual Drawdown Chart */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Value Over Time</h4>
                    <div className="h-40 bg-muted/30 rounded-lg flex items-end justify-center p-4 relative">
                      {/* Simplified visual representation */}
                      <div className="absolute inset-4 flex items-end">
                        <div className="flex-1 flex items-end justify-around gap-1">
                          {[100, 95, 85, 70, 65, 72, 80, 88, 95, 100].map((value, idx) => {
                            const adjustedValue = period.id === 'normal' ? value :
                              period.id === 'covid-2020' ? 
                                [100, 90, 75, 67, 70, 78, 85, 92, 98, 100][idx] :
                                [100, 95, 88, 82, 78, 75, 78, 82, 88, 92][idx];
                            
                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "w-full rounded-t transition-all",
                                  adjustedValue >= 90 ? "bg-emerald-500/60" :
                                  adjustedValue >= 80 ? "bg-amber-500/60" :
                                  "bg-rose-500/60"
                                )}
                                style={{ height: `${adjustedValue}%` }}
                              />
                            );
                          })}
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-4 text-xs text-muted-foreground">Start</div>
                      <div className="absolute bottom-2 right-4 text-xs text-muted-foreground">End</div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Asset List with "Why This?" Tooltips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            Your Assets Explained
          </CardTitle>
          <CardDescription>
            {portfolioMode === 'ai' 
              ? 'AI-generated explanations for why each asset fits your profile'
              : 'Sector and description from market data'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allocations.map((asset) => {
              const details = tickerDetails?.get(asset.symbol);
              
              return (
                <div 
                  key={asset.symbol}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-center min-w-16">
                      <Badge variant="outline" className="font-mono text-lg">
                        {asset.symbol}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{asset.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {details?.sector || asset.assetClass}
                        {details?.industry && ` • ${details.industry}`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold">{asset.weight.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">
                        ${((investableCapital * asset.weight) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    
                    {/* Why This? Tooltip */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Info className="h-4 w-4 text-primary" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-sm p-4">
                          <p className="font-medium mb-2">Why {asset.symbol}?</p>
                          <p className="text-sm text-muted-foreground">
                            {portfolioMode === 'ai' && asset.whyThisFitsProfile
                              ? asset.whyThisFitsProfile
                              : details?.description 
                                ? details.description.slice(0, 200) + (details.description.length > 200 ? '...' : '')
                                : `${asset.name} provides ${asset.assetClass} exposure to diversify your portfolio.`
                            }
                          </p>
                          {details?.sector && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              {details.sector}
                            </Badge>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
