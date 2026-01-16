/**
 * Holding Detail Card Component
 * Shows detailed information about a single holding with inline studies
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  Building2,
  BarChart3,
  FlaskConical,
  Loader2,
  Globe,
  DollarSign,
  Gauge,
  Zap,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { TICKER_MAP } from '@/services/expandedPortfolioUniverse';

interface HoldingDetailCardProps {
  ticker: string;
  weight: number;
  annualReturn?: number;
  onBack: () => void;
}

interface TickerInfo {
  name: string;
  category: string;
  sector?: string;
  description?: string;
  assetType?: string;
}

interface StudyResult {
  type: string;
  data: any;
  interpretation: string;
}

const QUICK_STUDIES = [
  { id: 'rsi_analysis', name: 'RSI', icon: Gauge, color: 'text-emerald-500' },
  { id: 'moving_average_analysis', name: 'Moving Avg', icon: TrendingUp, color: 'text-blue-500' },
  { id: 'volatility_analysis', name: 'Volatility', icon: Zap, color: 'text-amber-500' },
  { id: 'day_of_week_returns', name: 'Seasonality', icon: Calendar, color: 'text-violet-500' },
];

export function HoldingDetailCard({ ticker, weight, annualReturn, onBack }: HoldingDetailCardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'studies'>('overview');
  const [isLoadingStudy, setIsLoadingStudy] = useState<string | null>(null);
  const [studyResults, setStudyResults] = useState<StudyResult[]>([]);
  
  // Get ticker info from universe
  const tickerData = TICKER_MAP.get(ticker);
  const tickerInfo: TickerInfo = {
    name: tickerData?.name || ticker,
    category: tickerData?.category || 'Unknown',
    sector: tickerData?.sector,
    description: getTickerDescription(ticker),
    assetType: (tickerData as any)?.assetType || 'ETF',
  };

  const runStudy = async (studyType: string) => {
    setIsLoadingStudy(studyType);
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase.functions.invoke('run-asset-study', {
        body: { ticker, studyType, startDate, endDate, params: {} }
      });

      if (error) throw error;

      const result: StudyResult = {
        type: studyType,
        data,
        interpretation: generateInterpretation(data, studyType, ticker),
      };

      setStudyResults(prev => [result, ...prev.filter(r => r.type !== studyType)]);
    } catch (err) {
      console.error('Study error:', err);
    } finally {
      setIsLoadingStudy(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-lg">{ticker}</span>
            <Badge variant="outline" className="text-xs">{weight}%</Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{tickerInfo.name}</p>
        </div>
        {annualReturn !== undefined && (
          <div className={cn(
            "text-right",
            annualReturn >= 0 ? 'text-emerald-500' : 'text-red-500'
          )}>
            <div className="text-sm font-bold">
              {annualReturn >= 0 ? '+' : ''}{annualReturn.toFixed(1)}%
            </div>
            <div className="text-[10px] text-muted-foreground">1Y Return</div>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'studies')}>
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="overview" className="text-xs">
            <Building2 className="h-3 w-3 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="studies" className="text-xs">
            <FlaskConical className="h-3 w-3 mr-1" />
            Studies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3 space-y-3">
          {/* Asset Info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-muted/50">
              <div className="text-[10px] text-muted-foreground">Asset Type</div>
              <div className="text-sm font-medium">{tickerInfo.assetType}</div>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <div className="text-[10px] text-muted-foreground">Category</div>
              <div className="text-sm font-medium">{tickerInfo.category}</div>
            </div>
            {tickerInfo.sector && (
              <div className="p-2 rounded bg-muted/50 col-span-2">
                <div className="text-[10px] text-muted-foreground">Sector</div>
                <div className="text-sm font-medium">{tickerInfo.sector}</div>
              </div>
            )}
          </div>

          {/* Description */}
          {tickerInfo.description && (
            <div className="p-3 rounded bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {tickerInfo.description}
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={() => setActiveTab('studies')}
            >
              <FlaskConical className="h-3 w-3 mr-1" />
              Run Studies
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={() => window.open(`https://finance.yahoo.com/quote/${ticker}`, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Yahoo Finance
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="studies" className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Run technical studies on {ticker}
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_STUDIES.map(study => (
              <Button
                key={study.id}
                variant="outline"
                size="sm"
                className="h-8 text-xs justify-start gap-1.5"
                onClick={() => runStudy(study.id)}
                disabled={!!isLoadingStudy}
              >
                {isLoadingStudy === study.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <study.icon className={cn("h-3 w-3", study.color)} />
                )}
                {study.name}
              </Button>
            ))}
          </div>

          {/* Study Results */}
          {studyResults.length > 0 && (
            <ScrollArea className="max-h-40">
              <div className="space-y-2">
                {studyResults.map((result, idx) => {
                  const study = QUICK_STUDIES.find(s => s.id === result.type);
                  return (
                    <div key={idx} className="p-2 rounded bg-muted/50 border border-border/50">
                      <div className="flex items-center gap-2 mb-1">
                        {study && <study.icon className={cn("h-3.5 w-3.5", study.color)} />}
                        <span className="text-xs font-medium">{study?.name || result.type}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{result.interpretation}</p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getTickerDescription(ticker: string): string {
  const descriptions: Record<string, string> = {
    'SPY': 'Tracks the S&P 500 index, providing exposure to 500 large-cap US companies.',
    'QQQ': 'Tracks the Nasdaq-100 index, focusing on tech and growth companies.',
    'VTI': 'Total US stock market exposure including small, mid, and large-cap companies.',
    'BND': 'Total US bond market exposure across government and corporate bonds.',
    'TLT': 'Long-term US Treasury bonds (20+ years), sensitive to interest rate changes.',
    'GLD': 'Physical gold exposure, often used as an inflation hedge.',
    'IWM': 'Russell 2000 small-cap US stocks index.',
    'EFA': 'Developed international markets excluding US and Canada.',
    'VNQ': 'US real estate investment trusts (REITs).',
    'AGG': 'Total US investment-grade bond market.',
  };
  return descriptions[ticker] || `${ticker} is an exchange-traded fund providing market exposure.`;
}

function generateInterpretation(data: any, studyType: string, ticker: string): string {
  switch (studyType) {
    case 'rsi_analysis': {
      const rsi = data?.currentRSI || data?.rsi || 50;
      if (rsi >= 70) return `${ticker} is overbought (RSI: ${rsi.toFixed(0)}). May be due for a pullback.`;
      if (rsi <= 30) return `${ticker} is oversold (RSI: ${rsi.toFixed(0)}). Could be a buying opportunity.`;
      return `${ticker} RSI at ${rsi.toFixed(0)} - neutral momentum.`;
    }
    case 'moving_average_analysis':
      return data?.trend === 'bullish' 
        ? `${ticker} trading above key moving averages - bullish trend.`
        : `${ticker} trading below key moving averages - caution advised.`;
    case 'volatility_analysis':
      const vol = data?.volatility30d || data?.volatility || 15;
      return `${ticker} 30-day volatility: ${vol.toFixed(1)}%. ${vol > 25 ? 'Higher than average risk.' : 'Moderate volatility.'}`;
    case 'day_of_week_returns':
      return data?.bestDay ? `${ticker} historically performs best on ${data.bestDay}s.` : 'Seasonality analysis complete.';
    default:
      return `Study complete for ${ticker}.`;
  }
}
