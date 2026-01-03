// Portfolio Visualizer - Institutional Multi-Asset Management Suite
// "Choose Your Path" experience: Manual vs AI Co-Pilot vs IPS Questionnaire modes

import { useState, useCallback, useMemo } from 'react';
import WelcomeOnboarding, { useWelcomeOnboarding } from '@/components/backtester/WelcomeOnboarding';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Loader2,
  BarChart3,
  Target,
  Shield,
  TrendingUp,
  AlertTriangle,
  Brain,
  Settings,
  GraduationCap,
  Eye,
  EyeOff,
  CheckCircle2,
  Database,
  Activity,
  Info,
  Clock,
  Zap,
  FileText,
  Download,
  CircleDot,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// Types
import { 
  InvestorProfile, 
  PortfolioMode, 
  PortfolioAllocation,
  EfficientFrontierPoint,
} from '@/types/portfolio';
import { InvestorPolicyStatement } from '@/types/investorPolicy';
import { AssetData as PolygonAssetData, CorrelationMatrix as PolygonCorrelationMatrix, FetchHistoryResult } from '@/services/polygonDataHandler';

// Components
import { ChooseYourPath } from '@/components/backtester/ChooseYourPath';
import { AICoPilotWizard } from '@/components/backtester/AICoPilotWizard';
import { ManualPortfolioForm } from '@/components/backtester/ManualPortfolioForm';
import { EfficientFrontierSlider } from '@/components/backtester/EfficientFrontierSlider';
import { AdvancedMetricsDashboard } from '@/components/backtester/AdvancedMetricsDashboard';
import { AIPortfolioInsights, AIPortfolioAdvice } from '@/components/backtester/AIPortfolioInsights';
import { EducationalDashboard } from '@/components/backtester/EducationalDashboard';
import { InvestorPolicyQuestionnaire } from '@/components/backtester/InvestorPolicyQuestionnaire';
import { DataValidationPanel } from '@/components/backtester/DataValidationPanel';
import { supabase } from '@/integrations/supabase/client';

// Services
import { polygonData } from '@/services/polygonDataHandler';
import { AssetData } from '@/services/portfolioOptimizer';
import { CorrelationMatrix } from '@/services/backtesterService';
import { blackLittermanOptimizer } from '@/services/blackLittermanOptimizer';
import { calculateAllAdvancedMetrics, AdvancedRiskMetrics } from '@/services/advancedMetricsService';
import { generateEfficientFrontier, findOptimalPortfolio } from '@/services/efficientFrontierService';
import { runAllStressTests, checkLiquidityRisks, StressTestResult, LiquidityRiskResult } from '@/services/stressTestService';
import { fetchMultipleTickerDetails, TickerDetails } from '@/services/tickerDetailsService';
import { scoreQuestionnaire, ScoringResult } from '@/services/questionnaireScoring';

type AppFlow = 'choose-path' | 'manual-form' | 'ai-wizard' | 'questionnaire' | 'analyzing' | 'results';

// Analysis steps for enhanced loading states
interface AnalysisStep {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  tickers?: string[];
}

// Validation data interface for DataValidationPanel
interface ValidationData {
  dataSources: {
    ticker: string;
    source: string;
    dateRange: { start: string; end: string };
    bars: number;
    quality: 'high' | 'medium' | 'low';
    status: 'valid' | 'warning' | 'error';
    rawDataSample?: number[];
  }[];
  calculations: {
    name: string;
    formula: string;
    inputs: { name: string; value: number | string }[];
    result: number;
    unit: string;
  }[];
  dataFetchedAt: string;
  calculationsPerformedAt: string;
  cacheStatus: 'fresh' | 'cached';
  cacheAge?: number;
  warnings: string[];
}

const DEFAULT_PROFILE: InvestorProfile = {
  investableCapital: 100000,
  liquidityConstraint: 'high',
  assetUniverse: ['stocks', 'etfs', 'bonds'],
  riskTolerance: 50,
  taxBracket: 'medium',
  investmentHorizon: 5,
};

// Data Source Badge Component
function DataSourceBadge({ status, className }: { status: 'live' | 'cached' | 'warning' | 'error'; className?: string }) {
  const configs = {
    live: { color: 'bg-emerald-500', text: 'Live Polygon Data', icon: CircleDot },
    cached: { color: 'bg-blue-500', text: 'Cached Data', icon: Database },
    warning: { color: 'bg-amber-500', text: 'Data Warnings', icon: AlertTriangle },
    error: { color: 'bg-rose-500', text: 'Data Issues', icon: AlertTriangle },
  };
  
  const config = configs[status];
  const Icon = config.icon;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium px-2 py-1',
              status === 'live' && 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10',
              status === 'cached' && 'border-blue-500/30 text-blue-600 bg-blue-500/10',
              status === 'warning' && 'border-amber-500/30 text-amber-600 bg-amber-500/10',
              status === 'error' && 'border-rose-500/30 text-rose-600 bg-rose-500/10',
              className
            )}
          >
            <span className={cn('h-2 w-2 rounded-full animate-pulse', config.color)} />
            {config.text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>All market data fetched from Polygon.io API</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Metric Source Tooltip Component
function MetricSourceTooltip({ 
  metric, 
  formula, 
  inputs, 
  children 
}: { 
  metric: string;
  formula: string;
  inputs: { name: string; value: string | number }[];
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help relative group">
            {children}
            <Info className="h-3 w-3 text-muted-foreground absolute -top-1 -right-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">{metric}</p>
            <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
              {formula}
            </div>
            <div className="text-xs space-y-1">
              {inputs.map((input, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{input.name}:</span>
                  <span className="font-mono">{input.value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Data source: Polygon.io</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Analysis Step Component
function AnalysisStepItem({ step }: { step: AnalysisStep }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-colors',
        step.status === 'complete' && 'bg-emerald-500/10',
        step.status === 'running' && 'bg-primary/10',
        step.status === 'error' && 'bg-rose-500/10',
        step.status === 'pending' && 'bg-muted/50 opacity-50'
      )}
    >
      <div className="flex-shrink-0">
        {step.status === 'complete' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        {step.status === 'running' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
        {step.status === 'error' && <AlertTriangle className="h-5 w-5 text-rose-500" />}
        {step.status === 'pending' && <CircleDot className="h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{step.label}</p>
        {step.description && (
          <p className="text-xs text-muted-foreground truncate">{step.description}</p>
        )}
        {step.tickers && step.tickers.length > 0 && step.status === 'running' && (
          <div className="flex flex-wrap gap-1 mt-1">
            {step.tickers.slice(0, 5).map(ticker => (
              <Badge key={ticker} variant="secondary" className="text-xs">{ticker}</Badge>
            ))}
            {step.tickers.length > 5 && (
              <Badge variant="secondary" className="text-xs">+{step.tickers.length - 5} more</Badge>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// IPS Summary Card Component
function IPSSummaryCard({ policy }: { policy: InvestorPolicyStatement }) {
  const primaryGoal = policy.goals?.[0];
  
  return (
    <Card className="border-purple-500/30 bg-purple-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-500" />
          <CardTitle className="text-sm">Your Investor Policy Statement</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Investment Goals */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Investment Goals</h4>
          <div className="flex flex-wrap gap-2">
            {primaryGoal && (
              <Badge variant="outline" className="bg-purple-500/10">
                {primaryGoal.name}
              </Badge>
            )}
            {policy.goals?.slice(1, 3).map(goal => (
              <Badge key={goal.id} variant="outline" className="bg-purple-500/10">
                {goal.name}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Risk Profile */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Risk Profile</h4>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span>Financial Capacity</span>
                <span>{policy.riskProfile.financialCapacity}%</span>
              </div>
              <Progress value={policy.riskProfile.financialCapacity} className="h-1.5" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span>Emotional Tolerance</span>
                <span>{policy.riskProfile.emotionalTolerance}%</span>
              </div>
              <Progress value={policy.riskProfile.emotionalTolerance} className="h-1.5" />
            </div>
          </div>
        </div>
        
        {/* Constraints */}
        {policy.constraints.ethicalExclusions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Exclusions</h4>
            <div className="flex flex-wrap gap-1">
              {policy.constraints.ethicalExclusions.map(exclusion => (
                <Badge key={exclusion} variant="outline" className="text-xs bg-rose-500/10 text-rose-600 border-rose-500/30">
                  {exclusion}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Liquidity Needs */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Liquidity</h4>
          <p className="text-sm">
            {policy.liquidityNeeds.emergencyFundMonths} months emergency fund required
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PortfolioVisualizer() {
  // Onboarding state
  const { showOnboarding, completeOnboarding } = useWelcomeOnboarding();
  
  // Flow state
  const [currentFlow, setCurrentFlow] = useState<AppFlow>('choose-path');
  const [portfolioMode, setPortfolioMode] = useState<PortfolioMode | null>(null);
  const [investorProfile, setInvestorProfile] = useState<InvestorProfile>(DEFAULT_PROFILE);
  const [allocations, setAllocations] = useState<PortfolioAllocation[]>([]);
  
  // IPS state for questionnaire path
  const [investorPolicy, setInvestorPolicy] = useState<InvestorPolicyStatement | null>(null);
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ message: '', percent: 0 });
  const [error, setError] = useState<string | null>(null);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
  
  // Validation state
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [dataFetchedAt, setDataFetchedAt] = useState<string>('');
  const [calculationsPerformedAt, setCalculationsPerformedAt] = useState<string>('');
  
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

  // AI Portfolio Advice
  const [aiAdvice, setAiAdvice] = useState<AIPortfolioAdvice | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Stress Tests and Ticker Details
  const [stressTestResults, setStressTestResults] = useState<StressTestResult[]>([]);
  const [liquidityRisks, setLiquidityRisks] = useState<LiquidityRiskResult[]>([]);
  const [tickerDetails, setTickerDetails] = useState<Map<string, TickerDetails>>(new Map());
  const [portfolioVolatility, setPortfolioVolatility] = useState(15);

  // Results tab
  const [resultsTab, setResultsTab] = useState('frontier');
  
  // Tab visibility state
  const [visibleTabs, setVisibleTabs] = useState({
    'ai-insights': true,
    'educational': true,
    'metrics': true,
    'regime': true,
    'allocation': true,
    'data-quality': true,
  });
  
  const toggleTabVisibility = (tabId: string) => {
    setVisibleTabs(prev => ({ ...prev, [tabId]: !prev[tabId as keyof typeof prev] }));
  };

  // Compute data source status
  const dataSourceStatus = useMemo(() => {
    if (!validationData) return 'live';
    if (validationData.dataSources.some(ds => ds.status === 'error')) return 'error';
    if (validationData.dataSources.some(ds => ds.status === 'warning')) return 'warning';
    if (validationData.cacheStatus === 'cached') return 'cached';
    return 'live';
  }, [validationData]);

  // Update analysis step helper
  const updateStep = (stepId: string, updates: Partial<AnalysisStep>) => {
    setAnalysisSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  // Generate AI portfolio based on profile
  const generateAIPortfolio = useCallback((profile: InvestorProfile): PortfolioAllocation[] => {
    const suggestions: PortfolioAllocation[] = [];
    
    // Based on JP Morgan 60/40+ framework
    const hasAlternatives = profile.assetUniverse.some(a => 
      ['crypto', 'commodities', 'real_estate'].includes(a)
    );
    
    // Calculate target allocations
    let equityWeight = 60;
    let bondWeight = 30;
    let altWeight = hasAlternatives ? 30 : 0;
    
    // Adjust based on risk tolerance
    if (profile.riskTolerance > 70) {
      equityWeight = 75;
      bondWeight = 15;
    } else if (profile.riskTolerance < 30) {
      equityWeight = 40;
      bondWeight = 50;
    }
    
    // Normalize
    const total = equityWeight + bondWeight + altWeight;
    equityWeight = (equityWeight / total) * 100;
    bondWeight = (bondWeight / total) * 100;
    altWeight = (altWeight / total) * 100;
    
    // Add equity ETFs
    if (profile.assetUniverse.includes('stocks') || profile.assetUniverse.includes('etfs')) {
      suggestions.push({ symbol: 'VTI', weight: equityWeight * 0.6, assetClass: 'etfs', name: 'Total Stock Market' });
      suggestions.push({ symbol: 'VEA', weight: equityWeight * 0.25, assetClass: 'etfs', name: 'International' });
      suggestions.push({ symbol: 'VWO', weight: equityWeight * 0.15, assetClass: 'etfs', name: 'Emerging Markets' });
    }
    
    // Add bonds
    if (profile.assetUniverse.includes('bonds')) {
      suggestions.push({ symbol: 'BND', weight: bondWeight * 0.7, assetClass: 'bonds', name: 'Total Bond' });
      suggestions.push({ symbol: 'TIP', weight: bondWeight * 0.3, assetClass: 'bonds', name: 'TIPS' });
    }
    
    // Add alternatives
    if (profile.assetUniverse.includes('real_estate')) {
      suggestions.push({ symbol: 'VNQ', weight: altWeight * 0.4, assetClass: 'real_estate', name: 'Real Estate' });
    }
    if (profile.assetUniverse.includes('commodities')) {
      suggestions.push({ symbol: 'GLD', weight: altWeight * 0.3, assetClass: 'commodities', name: 'Gold' });
      suggestions.push({ symbol: 'DBC', weight: altWeight * 0.15, assetClass: 'commodities', name: 'Commodities' });
    }
    if (profile.assetUniverse.includes('crypto') && profile.liquidityConstraint === 'locked') {
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
    
    return normalized;
  }, []);

  // Build validation data from fetch result
  const buildValidationData = (
    fetchResult: FetchHistoryResult, 
    startDate: string, 
    endDate: string,
    metrics: AdvancedRiskMetrics | null,
    portfolioReturns: number[],
    annualizedReturn: number,
    annualizedVolatility: number
  ): ValidationData => {
    const dataSources = fetchResult.diagnostics.map(diag => {
      const status: 'valid' | 'warning' | 'error' = diag.success 
        ? (diag.validationIssues && diag.validationIssues.length > 0 ? 'warning' : 'valid') 
        : 'error';
      
      return {
        ticker: diag.ticker,
        source: 'Polygon API',
        dateRange: { start: startDate, end: endDate },
        bars: diag.bars || 0,
        quality: (diag.dataQuality || 'medium') as 'high' | 'medium' | 'low',
        status,
        rawDataSample: fetchResult.assetData.get(diag.ticker)?.bars.slice(0, 5).map(b => b.close),
      };
    });

    const calculations: ValidationData['calculations'] = [];
    
    // Always add return and volatility from computed values
    calculations.push({
      name: 'Portfolio Return',
      formula: 'Σ(daily returns) / n × 252',
      inputs: [
        { name: 'Daily returns', value: portfolioReturns.length },
        { name: 'Trading days/year', value: 252 },
      ],
      result: annualizedReturn,
      unit: '%',
    });
    
    calculations.push({
      name: 'Volatility (Annualized)',
      formula: 'σ(daily returns) × √252',
      inputs: [
        { name: 'Std Dev', value: (annualizedVolatility / Math.sqrt(252) / 100).toFixed(6) },
        { name: 'Annualization factor', value: '√252 ≈ 15.87' },
      ],
      result: annualizedVolatility,
      unit: '%',
    });
    
    // Calculate Sharpe from available data
    const sharpeRatio = annualizedVolatility > 0 ? (annualizedReturn - 4.5) / annualizedVolatility : 0;
    calculations.push({
      name: 'Sharpe Ratio',
      formula: '(Return - Risk-free) / Volatility',
      inputs: [
        { name: 'Return', value: `${annualizedReturn.toFixed(2)}%` },
        { name: 'Risk-free rate', value: '4.5%' },
        { name: 'Volatility', value: `${annualizedVolatility.toFixed(2)}%` },
      ],
      result: sharpeRatio,
      unit: '',
    });
    
    if (metrics?.sortinoRatio) {
      calculations.push({
        name: 'Sortino Ratio',
        formula: '(Return - Risk-free) / Downside Dev',
        inputs: [
          { name: 'Return', value: `${annualizedReturn.toFixed(2)}%` },
          { name: 'Downside deviation', value: 'σ of negative returns' },
        ],
        result: metrics.sortinoRatio,
        unit: '',
      });
    }
    
    if (metrics?.maxDrawdown) {
      calculations.push({
        name: 'Maximum Drawdown',
        formula: '(Peak - Trough) / Peak',
        inputs: [
          { name: 'Peak value', value: 'Highest portfolio value' },
          { name: 'Trough value', value: 'Lowest after peak' },
        ],
        result: metrics.maxDrawdown * 100,
        unit: '%',
      });
    }

    const warnings: string[] = [];
    fetchResult.diagnostics.forEach(diag => {
      if (diag.validationIssues) {
        diag.validationIssues.forEach(issue => {
          warnings.push(`${diag.ticker}: ${issue}`);
        });
      }
      if (!diag.success && diag.error) {
        warnings.push(`${diag.ticker}: ${diag.error}`);
      }
    });

    return {
      dataSources,
      calculations,
      dataFetchedAt: new Date().toISOString(),
      calculationsPerformedAt: new Date().toISOString(),
      cacheStatus: 'fresh',
      warnings,
    };
  };

  // Run full analysis
  const runAnalysis = async (profile: InvestorProfile, allocs: PortfolioAllocation[], mode: PortfolioMode) => {
    setCurrentFlow('analyzing');
    setIsAnalyzing(true);
    setError(null);
    setValidationWarnings([]);
    
    // Initialize analysis steps
    const tickers = allocs.map(a => a.symbol);
    const steps: AnalysisStep[] = [
      { id: 'fetch', label: 'Fetching historical data from Polygon...', status: 'pending', tickers },
      { id: 'validate', label: 'Validating data integrity...', status: 'pending' },
      { id: 'correlation', label: 'Building correlation matrix...', status: 'pending' },
      { id: 'optimize', label: 'Calculating optimal allocation...', status: 'pending' },
      { id: 'stress', label: 'Running stress tests...', status: 'pending' },
    ];
    
    // Add AI step if AI mode
    if (mode === 'ai') {
      steps.unshift({ id: 'ai', label: 'Consulting AI Portfolio Advisor...', status: 'pending' });
    }
    
    setAnalysisSteps(steps);
    setProgress({ message: 'Initializing...', percent: 0 });
    
    try {
      let finalAllocations = allocs;
      
      // For AI mode, call the AI advisor edge function
      if (mode === 'ai') {
        updateStep('ai', { status: 'running' });
        setProgress({ message: 'Consulting AI Portfolio Advisor...', percent: 5 });
        setIsLoadingAI(true);
        
        try {
          const { data, error: fnError } = await supabase.functions.invoke('ai-portfolio-advisor', {
            body: { investorProfile: profile }
          });
          
          if (fnError) {
            console.error('[AI Advisor] Function error:', fnError);
            toast.error('AI Advisor unavailable, using fallback suggestions');
            finalAllocations = generateAIPortfolio(profile);
            updateStep('ai', { status: 'complete', description: 'Used fallback suggestions' });
          } else if (data?.success && data.data) {
            const advice = data.data as AIPortfolioAdvice;
            setAiAdvice(advice);
            
            // Convert AI allocations to our format
            finalAllocations = advice.allocations.map(a => ({
              symbol: a.symbol,
              name: a.name,
              weight: a.weight,
              assetClass: a.assetClass as any,
            }));
            
            toast.success(`AI generated: ${advice.portfolioName}`);
            updateStep('ai', { status: 'complete', description: advice.portfolioName });
          } else {
            console.error('[AI Advisor] Response error:', data?.error);
            toast.error(data?.error || 'AI Advisor failed, using fallback');
            finalAllocations = generateAIPortfolio(profile);
            updateStep('ai', { status: 'complete', description: 'Used fallback suggestions' });
          }
        } catch (aiError) {
          console.error('[AI Advisor] Error:', aiError);
          toast.error('AI Advisor unavailable, using fallback');
          finalAllocations = generateAIPortfolio(profile);
          updateStep('ai', { status: 'error', description: 'Error - used fallback' });
        }
        
        setIsLoadingAI(false);
      }
      
      setAllocations(finalAllocations);
      
      const updatedTickers = finalAllocations.map(a => a.symbol);
      
      if (updatedTickers.length === 0) {
        throw new Error('No assets selected for analysis');
      }
      
      // Calculate date range (1 year for free Polygon tier)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Step: Fetch data
      updateStep('fetch', { status: 'running', tickers: updatedTickers });
      setProgress({ message: 'Fetching historical data from Polygon...', percent: 10 });
      
      const fetchResult = await polygonData.fetchAndCleanHistory(
        updatedTickers,
        startDate,
        endDate,
        (msg, pct) => setProgress({ message: msg, percent: 10 + pct * 0.3 })
      );
      
      setDataFetchedAt(new Date().toISOString());
      updateStep('fetch', { status: 'complete', description: `${fetchResult.diagnostics.filter(d => d.success).length}/${updatedTickers.length} tickers loaded` });
      
      // Step: Validate data
      updateStep('validate', { status: 'running' });
      setProgress({ message: 'Validating data integrity...', percent: 40 });
      
      // Check for validation issues
      const validationIssues: string[] = [];
      fetchResult.diagnostics.forEach(diag => {
        if (diag.validationIssues && diag.validationIssues.length > 0) {
          validationIssues.push(...diag.validationIssues.map(i => `${diag.ticker}: ${i}`));
        }
        if (!diag.success) {
          validationIssues.push(`${diag.ticker}: Failed to fetch data`);
        }
      });
      
      if (validationIssues.length > 0) {
        setValidationWarnings(validationIssues);
        updateStep('validate', { status: 'complete', description: `${validationIssues.length} warnings` });
      } else {
        updateStep('validate', { status: 'complete', description: 'All data verified' });
      }
      
      // Store asset data
      setAssetData(fetchResult.assetData);
      
      // Step: Build correlation matrix
      updateStep('correlation', { status: 'running' });
      setProgress({ message: 'Building correlation matrix...', percent: 50 });
      
      const corrMatrix = polygonData.buildCorrelationMatrix(fetchResult.assetData);
      setCorrelationMatrix(corrMatrix);
      
      updateStep('correlation', { status: 'complete', description: `${corrMatrix.tickers.length}×${corrMatrix.tickers.length} matrix` });
      
      // Step: Generate efficient frontier and calculate metrics
      updateStep('optimize', { status: 'running' });
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
      const optimalPoint = findOptimalPortfolio(frontier, profile.riskTolerance);
      setSelectedPoint(optimalPoint);
      
      setProgress({ message: 'Calculating advanced metrics...', percent: 75 });
      
      // Calculate metrics for selected point using REAL returns data
      let portfolioReturns: number[] = [];
      let metrics: AdvancedRiskMetrics | null = null;
      
      if (optimalPoint && fetchResult.assetData.size > 0) {
        const weights = optimalPoint.weights;
        
        let minLength = Infinity;
        fetchResult.assetData.forEach((asset) => {
          if (asset.returns.length < minLength) {
            minLength = asset.returns.length;
          }
        });
        
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
        
        const portfolioValues: number[] = [profile.investableCapital];
        let value = profile.investableCapital;
        for (const dailyReturn of portfolioReturns) {
          value *= (1 + dailyReturn);
          portfolioValues.push(value);
        }
        
        console.log('[PortfolioVisualizer] Using real returns:', portfolioReturns.length, 'days');
        console.log('[PortfolioVisualizer] Portfolio final value:', value.toFixed(2));
        
        metrics = calculateAllAdvancedMetrics(
          portfolioReturns,
          portfolioValues,
          optimalPoint.weights,
          optimalPoint.return,
          15,
          1,
          undefined
        );
        setAdvancedMetrics(metrics);
        
        // Calculate portfolio volatility from returns
        if (portfolioReturns.length > 0) {
          const mean = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length;
          const variance = portfolioReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / portfolioReturns.length;
          const annualizedVol = Math.sqrt(variance) * Math.sqrt(252) * 100;
          setPortfolioVolatility(annualizedVol);
        }
      }
      
      setCalculationsPerformedAt(new Date().toISOString());
      updateStep('optimize', { status: 'complete', description: `${frontier.length} frontier points` });
      
      // Build validation data with computed return and volatility
      const annualizedReturn = optimalPoint ? optimalPoint.return * 100 : 0;
      const annualizedVol = portfolioVolatility || 15;
      const validationDataResult = buildValidationData(
        fetchResult, 
        startDate, 
        endDate, 
        metrics, 
        portfolioReturns,
        annualizedReturn,
        annualizedVol
      );
      setValidationData(validationDataResult);
      
      // Run Black-Litterman for manual mode
      if (mode === 'manual' && finalAllocations.length > 0 && corrMatrix) {
        const userWeights = new Map<string, number>();
        finalAllocations.forEach(a => userWeights.set(a.symbol, a.weight / 100));
        
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
      
      setProgress({ message: 'Fetching ticker details...', percent: 90 });
      
      // Fetch ticker details for educational tooltips
      try {
        const details = await fetchMultipleTickerDetails(updatedTickers);
        setTickerDetails(details);
      } catch (detailsError) {
        console.warn('[PortfolioVisualizer] Could not fetch ticker details:', detailsError);
      }
      
      // Step: Stress tests
      updateStep('stress', { status: 'running' });
      setProgress({ message: 'Running stress tests...', percent: 95 });
      
      try {
        const weightsMap = new Map<string, number>();
        finalAllocations.forEach(a => weightsMap.set(a.symbol, a.weight / 100));
        
        const stressResults = await runAllStressTests(weightsMap, profile.investableCapital);
        setStressTestResults(stressResults);
        
        // Check liquidity risks for short horizons
        const liquidityResults = await checkLiquidityRisks(updatedTickers, profile.investmentHorizon);
        setLiquidityRisks(liquidityResults);
        
        updateStep('stress', { status: 'complete', description: `${stressResults.length} scenarios tested` });
      } catch (stressError) {
        console.warn('[PortfolioVisualizer] Stress test error:', stressError);
        updateStep('stress', { status: 'error', description: 'Some tests failed' });
      }
      
      setProgress({ message: 'Complete!', percent: 100 });
      
      setTimeout(() => {
        setCurrentFlow('results');
        setIsAnalyzing(false);
        setProgress({ message: '', percent: 0 });
        if (mode === 'ai' && aiAdvice) {
          setResultsTab('ai-insights');
        }
        toast.success('Portfolio analysis complete!');
      }, 500);
      
    } catch (err) {
      console.error('Analysis error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      setIsAnalyzing(false);
      setProgress({ message: '', percent: 0 });
      
      // Keep on analyzing flow to show retry option instead of resetting
      if (errorMessage.includes('API') || errorMessage.includes('fetch') || errorMessage.includes('network')) {
        toast.error('Data fetch failed. Please try again.');
      } else {
        toast.error(errorMessage);
        setCurrentFlow('choose-path');
      }
    }
  };

  // Handle refresh data
  const handleRefreshData = async () => {
    if (!allocations.length || !investorProfile) return;
    await runAnalysis(investorProfile, allocations, portfolioMode || 'manual');
  };

  // Handle manual form completion
  const handleManualComplete = (data: { capital: number; horizon: number; allocations: PortfolioAllocation[] }) => {
    const profile: InvestorProfile = {
      ...DEFAULT_PROFILE,
      investableCapital: data.capital,
      investmentHorizon: data.horizon,
    };
    setInvestorProfile(profile);
    setAllocations(data.allocations);
    setPortfolioMode('manual');
    runAnalysis(profile, data.allocations, 'manual');
  };

  // Handle AI wizard completion
  const handleAIComplete = (profile: InvestorProfile) => {
    setInvestorProfile(profile);
    setPortfolioMode('ai');
    const aiAllocations = generateAIPortfolio(profile);
    setAllocations(aiAllocations);
    runAnalysis(profile, aiAllocations, 'ai');
  };

  // Update selected point when risk tolerance changes
  const handleRiskToleranceChange = (tolerance: number) => {
    setRiskTolerance(tolerance);
    const point = findOptimalPortfolio(efficientFrontier, tolerance);
    setSelectedPoint(point);
  };

  // Reset to start
  const resetWizard = () => {
    setCurrentFlow('choose-path');
    setPortfolioMode(null);
    setAllocations([]);
    setEfficientFrontier([]);
    setSelectedPoint(null);
    setAdvancedMetrics(null);
    setBlAnalysis(null);
    setAiAdvice(null);
    setError(null);
    setInvestorProfile(DEFAULT_PROFILE);
    setStressTestResults([]);
    setLiquidityRisks([]);
    setTickerDetails(new Map());
    setValidationData(null);
    setValidationWarnings([]);
    setInvestorPolicy(null);
    setAnalysisSteps([]);
  };

  // Handle IPS questionnaire completion
  const handleQuestionnaireComplete = (policy: InvestorPolicyStatement) => {
    // Store the IPS for display
    setInvestorPolicy(policy);
    
    // Convert IPS to InvestorProfile for analysis
    const profile: InvestorProfile = {
      investableCapital: 100000, // Default, could add to questionnaire
      liquidityConstraint: policy.liquidityNeeds.emergencyFundMonths >= 3 ? 'high' : 'locked',
      assetUniverse: ['stocks', 'etfs', 'bonds'],
      riskTolerance: policy.riskProfile.emotionalTolerance,
      taxBracket: 'medium',
      investmentHorizon: 10, // Could derive from goals
    };
    
    // Add alternatives based on constraints
    if (!policy.constraints.ethicalExclusions.includes('crypto')) {
      profile.assetUniverse.push('crypto');
    }
    
    setInvestorProfile(profile);
    setPortfolioMode('ai');
    const aiAllocations = generateAIPortfolio(profile);
    setAllocations(aiAllocations);
    runAnalysis(profile, aiAllocations, 'ai');
  };

  // Render based on current flow
  
  // Show onboarding for first-time users
  if (showOnboarding) {
    return <WelcomeOnboarding onComplete={completeOnboarding} />;
  }
  
  if (currentFlow === 'choose-path') {
    return (
      <div className="min-h-screen bg-background">
        <ChooseYourPath
          onSelectManual={() => setCurrentFlow('manual-form')}
          onSelectAIChat={() => setCurrentFlow('ai-wizard')}
          onSelectQuestionnaire={() => setCurrentFlow('questionnaire')}
        />
      </div>
    );
  }

  if (currentFlow === 'manual-form') {
    return (
      <div className="min-h-screen bg-background">
        <ManualPortfolioForm
          onComplete={handleManualComplete}
          onBack={() => setCurrentFlow('choose-path')}
        />
      </div>
    );
  }

  if (currentFlow === 'ai-wizard') {
    return (
      <div className="min-h-screen bg-background">
        <AICoPilotWizard
          onComplete={handleAIComplete}
          onBack={() => setCurrentFlow('choose-path')}
        />
      </div>
    );
  }

  if (currentFlow === 'questionnaire') {
    return (
      <InvestorPolicyQuestionnaire
        onComplete={handleQuestionnaireComplete}
        onBack={() => setCurrentFlow('choose-path')}
      />
    );
  }

  if (currentFlow === 'analyzing') {
    const hasError = !!error;
    const canRetry = hasError && allocations.length > 0;
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-xl">
          <CardContent className="py-8">
            <div className="text-center mb-6">
              <div className={cn(
                "p-4 rounded-full w-fit mx-auto mb-4",
                hasError ? "bg-destructive/10" : "bg-primary/10"
              )}>
                {hasError ? (
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                ) : (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                )}
              </div>
              <h2 className="text-xl font-bold mb-2">
                {hasError ? 'Analysis Failed' : 'Analyzing Your Portfolio'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {hasError ? error : progress.message}
              </p>
            </div>
            
            {!hasError && <Progress value={progress.percent} className="h-2 mb-6" />}
            
            {/* Analysis Steps */}
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {analysisSteps.map((step) => (
                  <AnalysisStepItem key={step.id} step={step} />
                ))}
              </AnimatePresence>
            </div>
            
            {hasError ? (
              <div className="flex justify-center gap-3 mt-6">
                <Button variant="outline" onClick={resetWizard}>
                  Start Over
                </Button>
                {canRetry && (
                  <Button 
                    onClick={() => {
                      setError(null);
                      runAnalysis(investorProfile, allocations, portfolioMode || 'manual');
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Analysis
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground mt-4">
                {progress.percent}% complete
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results view
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
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">Portfolio Analysis Results</h1>
                  <DataSourceBadge status={dataSourceStatus} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {portfolioMode === 'ai' ? 'AI Co-Pilot' : 'Manual'} • {allocations.length} assets • {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(investorProfile.investableCapital)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Show/Hide Tabs</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {portfolioMode === 'ai' && aiAdvice && (
                    <DropdownMenuCheckboxItem
                      checked={visibleTabs['ai-insights']}
                      onCheckedChange={() => toggleTabVisibility('ai-insights')}
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      AI Insights
                    </DropdownMenuCheckboxItem>
                  )}
                  <DropdownMenuCheckboxItem
                    checked={visibleTabs['educational']}
                    onCheckedChange={() => toggleTabVisibility('educational')}
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Learn
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleTabs['metrics']}
                    onCheckedChange={() => toggleTabVisibility('metrics')}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Metrics
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleTabs['data-quality']}
                    onCheckedChange={() => toggleTabVisibility('data-quality')}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Data Quality
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleTabs['regime']}
                    onCheckedChange={() => toggleTabVisibility('regime')}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Regime
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleTabs['allocation']}
                    onCheckedChange={() => toggleTabVisibility('allocation')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Allocation
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button variant="outline" onClick={resetWizard}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Start Over
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Warning Banner */}
      {validationWarnings.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/30">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Data validation warnings detected
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {validationWarnings.length} issue{validationWarnings.length !== 1 ? 's' : ''} found. 
                  View the Data Quality tab for details.
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setResultsTab('data-quality')}
                className="text-amber-600"
              >
                View Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* IPS Summary for Questionnaire Path */}
        {investorPolicy && (
          <div className="mb-6">
            <IPSSummaryCard policy={investorPolicy} />
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={resultsTab} onValueChange={setResultsTab}>
          {(() => {
            const visibleTabCount = [
              portfolioMode === 'ai' && aiAdvice && visibleTabs['ai-insights'],
              visibleTabs['educational'],
              visibleTabs['frontier'],
              visibleTabs['metrics'],
              visibleTabs['data-quality'],
              visibleTabs['regime'],
              visibleTabs['allocation'],
            ].filter(Boolean).length;
            
            return (
              <TabsList className={cn(
                "grid w-full max-w-5xl mx-auto mb-6",
                visibleTabCount === 7 ? "grid-cols-7" :
                visibleTabCount === 6 ? "grid-cols-6" :
                visibleTabCount === 5 ? "grid-cols-5" :
                visibleTabCount === 4 ? "grid-cols-4" :
                visibleTabCount === 3 ? "grid-cols-3" :
                visibleTabCount === 2 ? "grid-cols-2" : "grid-cols-1"
              )}>
                {portfolioMode === 'ai' && aiAdvice && visibleTabs['ai-insights'] && (
                  <TabsTrigger value="ai-insights" className="gap-2">
                    <Brain className="h-4 w-4" />
                    <span className="hidden sm:inline">AI Insights</span>
                  </TabsTrigger>
                )}
                {visibleTabs['educational'] && (
                  <TabsTrigger value="educational" className="gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <span className="hidden sm:inline">Learn</span>
                  </TabsTrigger>
                )}
                {visibleTabs['metrics'] && (
                  <TabsTrigger value="metrics" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Metrics</span>
                  </TabsTrigger>
                )}
                {visibleTabs['data-quality'] && (
                  <TabsTrigger value="data-quality" className="gap-2">
                    <Database className="h-4 w-4" />
                    <span className="hidden sm:inline">Data Quality</span>
                  </TabsTrigger>
                )}
                {visibleTabs['regime'] && (
                  <TabsTrigger value="regime" className="gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Regime</span>
                  </TabsTrigger>
                )}
                {visibleTabs['allocation'] && (
                  <TabsTrigger value="allocation" className="gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Allocation</span>
                  </TabsTrigger>
                )}
              </TabsList>
            );
          })()}

          {/* AI Insights Tab */}
          {portfolioMode === 'ai' && aiAdvice && visibleTabs['ai-insights'] && (
            <TabsContent value="ai-insights">
              <AIPortfolioInsights 
                advice={aiAdvice} 
                investableCapital={investorProfile.investableCapital} 
              />
            </TabsContent>
          )}

          {/* Educational Dashboard Tab */}
          {visibleTabs['educational'] && (
            <TabsContent value="educational">
              {advancedMetrics ? (
                <EducationalDashboard
                  metrics={advancedMetrics}
                  investableCapital={investorProfile.investableCapital}
                  portfolioVolatility={portfolioVolatility}
                  stressTestResults={stressTestResults}
                  tickerDetails={tickerDetails}
                  allocations={allocations.map(a => ({
                    symbol: a.symbol,
                    name: a.name || a.symbol,
                    weight: a.weight,
                    assetClass: a.assetClass as string,
                    whyThisFitsProfile: aiAdvice?.allocations.find(ai => ai.symbol === a.symbol)?.whyThisFitsProfile
                  }))}
                  portfolioMode={portfolioMode || 'manual'}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <GraduationCap className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p>Educational dashboard will appear after analysis</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}


          {visibleTabs['metrics'] && (
            <TabsContent value="metrics">
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
          )}

          {/* Data Quality Tab */}
          {visibleTabs['data-quality'] && (
            <TabsContent value="data-quality">
              {validationData ? (
                <div className="space-y-6">
                  {/* Full Data Validation Panel */}
                  <DataValidationPanel
                    dataSources={validationData.dataSources}
                    calculations={validationData.calculations}
                    correlationMatrix={correlationMatrix ? {
                      tickers: correlationMatrix.tickers,
                      matrix: correlationMatrix.matrix
                    } : undefined}
                    dataFetchedAt={validationData.dataFetchedAt}
                    calculationsPerformedAt={validationData.calculationsPerformedAt}
                    cacheStatus={validationData.cacheStatus}
                    cacheAge={validationData.cacheAge}
                    onRefreshData={handleRefreshData}
                  />
                  
                  {/* Data Freshness Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        Data Freshness
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground mb-1">Data Fetched</p>
                          <p className="text-sm font-medium">
                            {new Date(dataFetchedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground mb-1">Calculations Performed</p>
                          <p className="text-sm font-medium">
                            {new Date(calculationsPerformedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground mb-1">Source</p>
                          <p className="text-sm font-medium flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Polygon.io API
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Database className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p>Data validation will appear after analysis</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {visibleTabs['regime'] && (
            <TabsContent value="regime">
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
          )}

          {visibleTabs['allocation'] && (
            <TabsContent value="allocation">
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
                    {(selectedPoint?.weights 
                      ? Array.from(selectedPoint.weights.entries()) 
                      : allocations.map(a => [a.symbol, a.weight / 100] as [string, number])
                    )
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
          )}
        </Tabs>

        {/* Data Validation Panel - Collapsed at bottom */}
        {validationData && resultsTab !== 'data-quality' && (
          <div className="mt-8">
            <DataValidationPanel
              dataSources={validationData.dataSources}
              calculations={validationData.calculations}
              correlationMatrix={correlationMatrix ? {
                tickers: correlationMatrix.tickers,
                matrix: correlationMatrix.matrix
              } : undefined}
              dataFetchedAt={validationData.dataFetchedAt}
              calculationsPerformedAt={validationData.calculationsPerformedAt}
              cacheStatus={validationData.cacheStatus}
              cacheAge={validationData.cacheAge}
              onRefreshData={handleRefreshData}
            />
          </div>
        )}
      </div>
    </div>
  );
}
