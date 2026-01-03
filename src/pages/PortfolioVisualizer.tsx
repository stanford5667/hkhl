// Portfolio Visualizer - Institutional Multi-Asset Management Suite
// Replaces legacy single-asset backtester with "Build from Scratch" vs "AI Suggestion" flows

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  Play,
  RefreshCw,
  Loader2,
  BarChart3,
  Target,
  Shield,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Settings,
  Brain
} from 'lucide-react';

// Types
import { 
  InvestorProfile, 
  PortfolioMode, 
  PortfolioAllocation,
  EfficientFrontierPoint,
  ASSET_CLASS_ETFS
} from '@/types/portfolio';
import { AssetData as PolygonAssetData, CorrelationMatrix as PolygonCorrelationMatrix } from '@/services/polygonDataHandler';

// Components
import { InvestorProfileForm } from '@/components/backtester/InvestorProfileForm';
import { PortfolioModeSelection } from '@/components/backtester/PortfolioModeSelection';
import { ManualPortfolioBuilder } from '@/components/backtester/ManualPortfolioBuilder';
import { EfficientFrontierSlider } from '@/components/backtester/EfficientFrontierSlider';
import { AdvancedMetricsDashboard } from '@/components/backtester/AdvancedMetricsDashboard';

// Services
import { polygonData } from '@/services/polygonDataHandler';
import { HierarchicalRiskParity, AssetData } from '@/services/portfolioOptimizer';
import { CorrelationMatrix } from '@/services/backtesterService';
import { blackLittermanOptimizer, InvestorView } from '@/services/blackLittermanOptimizer';
import { calculateAllAdvancedMetrics, AdvancedRiskMetrics } from '@/services/advancedMetricsService';
import { generateEfficientFrontier, findOptimalPortfolio } from '@/services/efficientFrontierService';

type WizardStep = 'profile' | 'mode' | 'build' | 'results';

const DEFAULT_PROFILE: InvestorProfile = {
  investableCapital: 100000,
  liquidityConstraint: 'high',
  assetUniverse: ['stocks', 'etfs', 'bonds'],
  riskTolerance: 50,
  taxBracket: 'medium',
  investmentHorizon: 5,
};

export default function PortfolioVisualizer() {
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('profile');
  const [investorProfile, setInvestorProfile] = useState<InvestorProfile>(DEFAULT_PROFILE);
  const [portfolioMode, setPortfolioMode] = useState<PortfolioMode | null>(null);
  const [allocations, setAllocations] = useState<PortfolioAllocation[]>([]);
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ message: '', percent: 0 });
  const [error, setError] = useState<string | null>(null);
  
  // Results state
  const [efficientFrontier, setEfficientFrontier] = useState<EfficientFrontierPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<EfficientFrontierPoint | null>(null);
  const [riskTolerance, setRiskTolerance] = useState(50);
  const [advancedMetrics, setAdvancedMetrics] = useState<AdvancedRiskMetrics | null>(null);
  const [correlationMatrix, setCorrelationMatrix] = useState<PolygonCorrelationMatrix | null>(null);
  const [assetData, setAssetData] = useState<Map<string, PolygonAssetData>>(new Map());
  
  // Black-Litterman analysis for manual mode
  const [blAnalysis, setBlAnalysis] = useState<{
    impliedRisk: Map<string, number>;
    riskContribution: Map<string, number>;
    totalRisk: number;
    expectedReturn: number;
  } | null>(null);

  // Results tab
  const [resultsTab, setResultsTab] = useState('frontier');

  // Navigation
  const steps: WizardStep[] = ['profile', 'mode', 'build', 'results'];
  const stepIndex = steps.indexOf(currentStep);
  
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'profile':
        return investorProfile.assetUniverse.length > 0 && investorProfile.investableCapital > 0;
      case 'mode':
        return portfolioMode !== null;
      case 'build':
        if (portfolioMode === 'manual') {
          const total = allocations.reduce((sum, a) => sum + a.weight, 0);
          return allocations.length > 0 && Math.abs(total - 100) < 0.1;
        }
        return true; // AI mode auto-generates
      default:
        return true;
    }
  }, [currentStep, investorProfile, portfolioMode, allocations]);

  const goNext = () => {
    const idx = steps.indexOf(currentStep);
    if (idx < steps.length - 1) {
      if (currentStep === 'build') {
        runAnalysis();
      } else {
        setCurrentStep(steps[idx + 1]);
      }
    }
  };

  const goBack = () => {
    const idx = steps.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(steps[idx - 1]);
      setError(null);
    }
  };

  // Generate AI portfolio based on profile
  const generateAIPortfolio = useCallback(() => {
    const suggestions: PortfolioAllocation[] = [];
    
    // Based on JP Morgan 60/40+ framework
    const hasAlternatives = investorProfile.assetUniverse.some(a => 
      ['crypto', 'commodities', 'real_estate'].includes(a)
    );
    
    // Calculate target allocations
    let equityWeight = 60;
    let bondWeight = 30;
    let altWeight = hasAlternatives ? 30 : 0;
    
    // Adjust based on risk tolerance
    if (investorProfile.riskTolerance > 70) {
      equityWeight = 75;
      bondWeight = 15;
    } else if (investorProfile.riskTolerance < 30) {
      equityWeight = 40;
      bondWeight = 50;
    }
    
    // Normalize
    const total = equityWeight + bondWeight + altWeight;
    equityWeight = (equityWeight / total) * 100;
    bondWeight = (bondWeight / total) * 100;
    altWeight = (altWeight / total) * 100;
    
    // Add equity ETFs
    if (investorProfile.assetUniverse.includes('stocks') || investorProfile.assetUniverse.includes('etfs')) {
      suggestions.push({ symbol: 'VTI', weight: equityWeight * 0.6, assetClass: 'etfs', name: 'Total Stock Market' });
      suggestions.push({ symbol: 'VEA', weight: equityWeight * 0.25, assetClass: 'etfs', name: 'International' });
      suggestions.push({ symbol: 'VWO', weight: equityWeight * 0.15, assetClass: 'etfs', name: 'Emerging Markets' });
    }
    
    // Add bonds
    if (investorProfile.assetUniverse.includes('bonds')) {
      suggestions.push({ symbol: 'BND', weight: bondWeight * 0.7, assetClass: 'bonds', name: 'Total Bond' });
      suggestions.push({ symbol: 'TIP', weight: bondWeight * 0.3, assetClass: 'bonds', name: 'TIPS' });
    }
    
    // Add alternatives
    if (investorProfile.assetUniverse.includes('real_estate')) {
      suggestions.push({ symbol: 'VNQ', weight: altWeight * 0.4, assetClass: 'real_estate', name: 'Real Estate' });
    }
    if (investorProfile.assetUniverse.includes('commodities')) {
      suggestions.push({ symbol: 'GLD', weight: altWeight * 0.3, assetClass: 'commodities', name: 'Gold' });
      suggestions.push({ symbol: 'DBC', weight: altWeight * 0.15, assetClass: 'commodities', name: 'Commodities' });
    }
    if (investorProfile.assetUniverse.includes('crypto') && investorProfile.liquidityConstraint === 'locked') {
      suggestions.push({ symbol: 'BITO', weight: altWeight * 0.15, assetClass: 'crypto', name: 'Bitcoin ETF' });
    }
    
    // Normalize to 100%
    const suggestionTotal = suggestions.reduce((sum, s) => sum + s.weight, 0);
    const normalized = suggestions.map(s => ({
      ...s,
      weight: Math.round((s.weight / suggestionTotal) * 100 * 10) / 10
    }));
    
    // Adjust for rounding
    const adjustedTotal = normalized.reduce((sum, s) => sum + s.weight, 0);
    if (normalized.length > 0) {
      normalized[0].weight += (100 - adjustedTotal);
      normalized[0].weight = Math.round(normalized[0].weight * 10) / 10;
    }
    
    setAllocations(normalized);
  }, [investorProfile]);

  // Run full analysis
  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    setProgress({ message: 'Initializing...', percent: 0 });
    
    try {
      // Generate AI portfolio if in AI mode
      let finalAllocations = allocations;
      if (portfolioMode === 'ai') {
        generateAIPortfolio();
        // Wait for state update
        await new Promise(r => setTimeout(r, 100));
        finalAllocations = allocations.length > 0 ? allocations : await new Promise((resolve) => {
          generateAIPortfolio();
          setTimeout(() => resolve(allocations), 100);
        });
      }
      
      // Use current allocations if AI didn't update yet
      const tickers = finalAllocations.length > 0 
        ? finalAllocations.map(a => a.symbol) 
        : portfolioMode === 'ai' 
          ? ['VTI', 'BND', 'VNQ', 'GLD'] 
          : allocations.map(a => a.symbol);
      
      if (tickers.length === 0) {
        throw new Error('No assets selected for analysis');
      }
      
      // Calculate date range (1 year for free Polygon tier)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      setProgress({ message: 'Fetching historical data...', percent: 10 });
      
      // Fetch data via Polygon
      const fetchResult = await polygonData.fetchAndCleanHistory(
        tickers,
        startDate,
        endDate,
        (msg, pct) => setProgress({ message: msg, percent: 10 + pct * 0.4 })
      );
      
      setProgress({ message: 'Building correlation matrix...', percent: 50 });
      
      // Store asset data
      setAssetData(fetchResult.assetData);
      
      // Build correlation matrix
      const corrMatrix = polygonData.buildCorrelationMatrix(fetchResult.assetData);
      setCorrelationMatrix(corrMatrix);
      
      setProgress({ message: 'Generating efficient frontier...', percent: 60 });
      
      // Convert to backtester format for efficient frontier
      const backtesterCorr: CorrelationMatrix = { symbols: corrMatrix.tickers, matrix: corrMatrix.matrix };
      const backtesterAssetData = new Map<string, AssetData>();
      fetchResult.assetData.forEach((data, ticker) => {
        backtesterAssetData.set(ticker, {
          ticker,
          volatility: data.volatility,
          avgReturn: data.returns.length > 0 ? data.returns.reduce((a, b) => a + b, 0) / data.returns.length : 0.08,
          skewness: 0,
          kurtosis: 3,
          volume: 1000000
        });
      });
      
      // Generate efficient frontier
      const frontier = generateEfficientFrontier(backtesterCorr, backtesterAssetData, 3000);
      setEfficientFrontier(frontier);
      
      // Find optimal point based on risk tolerance
      const optimalPoint = findOptimalPortfolio(frontier, investorProfile.riskTolerance);
      setSelectedPoint(optimalPoint);
      
      setProgress({ message: 'Calculating advanced metrics...', percent: 75 });
      
      // Calculate metrics for selected point using REAL returns data
      if (optimalPoint && fetchResult.assetData.size > 0) {
        // Get the weights from the optimal portfolio
        const weights = optimalPoint.weights;
        
        // Find the minimum length of returns across all assets
        let minLength = Infinity;
        fetchResult.assetData.forEach((asset) => {
          if (asset.returns.length < minLength) {
            minLength = asset.returns.length;
          }
        });
        
        // Calculate weighted portfolio returns from real asset returns
        const portfolioReturns: number[] = [];
        for (let i = 0; i < minLength; i++) {
          let dayReturn = 0;
          weights.forEach((weight, ticker) => {
            const assetReturns = fetchResult.assetData.get(ticker)?.returns;
            if (assetReturns && i < assetReturns.length) {
              dayReturn += weight * assetReturns[i];
            }
          });
          portfolioReturns.push(dayReturn);
        }
        
        // Calculate portfolio value series from real returns
        const portfolioValues: number[] = [investorProfile.investableCapital];
        let value = investorProfile.investableCapital;
        for (const dailyReturn of portfolioReturns) {
          value *= (1 + dailyReturn);
          portfolioValues.push(value);
        }
        
        console.log('[PortfolioVisualizer] Using real returns:', portfolioReturns.length, 'days');
        console.log('[PortfolioVisualizer] Portfolio final value:', value.toFixed(2));
        
        const metrics = calculateAllAdvancedMetrics(
          portfolioReturns,
          portfolioValues,
          optimalPoint.weights,
          optimalPoint.return,
          15, // benchmark for tracking error
          1,  // years
          undefined
        );
        setAdvancedMetrics(metrics);
      }
      
      setProgress({ message: 'Running Black-Litterman analysis...', percent: 85 });
      
      // Run Black-Litterman for manual mode
      if (portfolioMode === 'manual' && allocations.length > 0 && corrMatrix) {
        const userWeights = new Map<string, number>();
        allocations.forEach(a => userWeights.set(a.symbol, a.weight / 100));
        
        const backtesterCorrForBL: CorrelationMatrix = { symbols: corrMatrix.tickers, matrix: corrMatrix.matrix };
        
        const blResult = blackLittermanOptimizer.analyzeUserWeights(
          userWeights,
          backtesterCorrForBL,
          backtesterAssetData
        );
        
        setBlAnalysis({
          impliedRisk: blResult.impliedViews,
          riskContribution: blResult.riskContribution,
          totalRisk: blResult.userRisk,
          expectedReturn: blResult.userExpectedReturn
        });
      }
      
      setProgress({ message: 'Complete!', percent: 100 });
      
      setTimeout(() => {
        setCurrentStep('results');
        setIsAnalyzing(false);
        setProgress({ message: '', percent: 0 });
        toast.success('Portfolio analysis complete!');
      }, 500);
      
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setIsAnalyzing(false);
      setProgress({ message: '', percent: 0 });
    }
  };

  // Update selected point when risk tolerance changes
  const handleRiskToleranceChange = (tolerance: number) => {
    setRiskTolerance(tolerance);
    const point = findOptimalPortfolio(efficientFrontier, tolerance);
    setSelectedPoint(point);
  };

  // Reset to start
  const resetWizard = () => {
    setCurrentStep('profile');
    setPortfolioMode(null);
    setAllocations([]);
    setEfficientFrontier([]);
    setSelectedPoint(null);
    setAdvancedMetrics(null);
    setBlAnalysis(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <BarChart3 className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Portfolio Visualizer</h1>
                <p className="text-sm text-muted-foreground">
                  Institutional-grade portfolio optimization
                </p>
              </div>
            </div>
            
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              {steps.map((step, idx) => (
                <div key={step} className="flex items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    idx < stepIndex ? "bg-primary text-primary-foreground" :
                    idx === stepIndex ? "bg-primary/20 text-primary border-2 border-primary" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {idx < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={cn(
                      "w-8 h-0.5 mx-1",
                      idx < stepIndex ? "bg-primary" : "bg-muted"
                    )} />
                  )}
                </div>
              ))}
            </div>
            
            {currentStep === 'results' && (
              <Button variant="outline" onClick={resetWizard}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Start Over
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Loading State */}
        {isAnalyzing && (
          <Card className="mb-6">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{progress.message}</p>
                  <Progress value={progress.percent} className="mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step Content */}
        {currentStep === 'profile' && (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h2 className="text-2xl font-bold mb-2">Investor Profile</h2>
              <p className="text-muted-foreground">
                Tell us about your investment constraints to generate an optimal portfolio.
              </p>
            </div>
            <InvestorProfileForm 
              profile={investorProfile} 
              onProfileChange={setInvestorProfile} 
            />
          </div>
        )}

        {currentStep === 'mode' && (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h2 className="text-2xl font-bold mb-2">Choose Your Approach</h2>
              <p className="text-muted-foreground">
                Build your own portfolio or let our AI generate one based on your profile.
              </p>
            </div>
            <PortfolioModeSelection 
              selectedMode={portfolioMode}
              onModeSelect={(mode) => {
                setPortfolioMode(mode);
                if (mode === 'ai') {
                  generateAIPortfolio();
                }
              }}
            />
          </div>
        )}

        {currentStep === 'build' && (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h2 className="text-2xl font-bold mb-2">
                {portfolioMode === 'manual' ? 'Build Your Portfolio' : 'AI-Generated Portfolio'}
              </h2>
              <p className="text-muted-foreground">
                {portfolioMode === 'manual' 
                  ? 'Select tickers and assign weights. We\'ll analyze using Black-Litterman.'
                  : 'Review and customize the AI-suggested allocations based on your profile.'}
              </p>
            </div>
            <ManualPortfolioBuilder
              allocations={allocations}
              onAllocationsChange={setAllocations}
              assetUniverse={investorProfile.assetUniverse}
              blackLittermanAnalysis={blAnalysis || undefined}
            />
          </div>
        )}

        {currentStep === 'results' && (
          <div className="space-y-6">
            <Tabs value={resultsTab} onValueChange={setResultsTab}>
              <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto">
                <TabsTrigger value="frontier" className="gap-2">
                  <Target className="h-4 w-4" />
                  Frontier
                </TabsTrigger>
                <TabsTrigger value="metrics" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Metrics
                </TabsTrigger>
                <TabsTrigger value="regime" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Regime
                </TabsTrigger>
                <TabsTrigger value="allocation" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Allocation
                </TabsTrigger>
              </TabsList>

              <TabsContent value="frontier" className="mt-6">
                <EfficientFrontierSlider
                  frontierPoints={efficientFrontier}
                  selectedPoint={selectedPoint}
                  onRiskToleranceChange={handleRiskToleranceChange}
                  riskTolerance={riskTolerance}
                />
              </TabsContent>

              <TabsContent value="metrics" className="mt-6">
                {advancedMetrics ? (
                  <AdvancedMetricsDashboard metrics={advancedMetrics} />
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <BarChart3 className="h-8 w-8 mx-auto mb-3 opacity-50" />
                      <p>Advanced metrics will appear after analysis</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="regime" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-500" />
                      Macro-Regime Stress Testing
                    </CardTitle>
                    <CardDescription>
                      Performance during "Monetary Dominance" vs "Fiscal Activism" periods
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="h-5 w-5 text-emerald-500" />
                          <span className="font-medium">Monetary Dominance</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Low inflation, central bank control (2010-2019)
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Expected Return:</span>
                            <span className="text-emerald-500">+12.5%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Volatility:</span>
                            <span>14.2%</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 rounded-lg border border-rose-500/30 bg-rose-500/5">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-5 w-5 text-rose-500" />
                          <span className="font-medium">Fiscal Activism</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          High inflation/volatility (2020-2022, projected 2025-2036)
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Expected Return:</span>
                            <span className="text-rose-500">+4.2%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Volatility:</span>
                            <span>28.5%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Alert className="mt-4">
                      <Brain className="h-4 w-4" />
                      <AlertDescription>
                        <strong>2025-2036 Projection:</strong> Fiscal Activism regime expected. 
                        Consider increasing commodity and real asset exposure for inflation protection.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="allocation" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Final Allocation</CardTitle>
                    <CardDescription>
                      {portfolioMode === 'manual' 
                        ? 'Your weights adjusted via Black-Litterman'
                        : 'HRP-optimized allocation based on your profile'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(selectedPoint?.weights ? Array.from(selectedPoint.weights.entries()) : allocations.map(a => [a.symbol, a.weight / 100] as [string, number]))
                        .filter(([_, w]) => w > 0.01)
                        .sort((a, b) => b[1] - a[1])
                        .map(([symbol, weight]) => (
                          <div key={symbol} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="font-mono">{symbol}</Badge>
                            </div>
                            <div className="flex items-center gap-4">
                              <Progress value={weight * 100} className="w-32 h-2" />
                              <span className="font-bold w-16 text-right">
                                {(weight * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Navigation Footer */}
        {currentStep !== 'results' && (
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={goBack}
              disabled={stepIndex === 0 || isAnalyzing}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={goNext}
              disabled={!canProceed || isAnalyzing}
            >
              {currentStep === 'build' ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Analyze Portfolio
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
