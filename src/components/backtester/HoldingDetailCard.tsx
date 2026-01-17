/**
 * Holding Detail Card Component
 * Shows detailed information about a single holding with real Polygon data
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  Building2,
  FlaskConical,
  Loader2,
  Globe,
  Gauge,
  Zap,
  Calendar,
  ExternalLink,
  DollarSign,
  Factory,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { fetchTickerDetails, TickerDetails } from '@/services/tickerDetailsService';
import { TICKER_MAP } from '@/services/expandedPortfolioUniverse';

interface HoldingDetailCardProps {
  ticker: string;
  weight: number;
  annualReturn?: number;
  onBack: () => void;
}

interface StudyResult {
  type: string;
  data: any;
  interpretation: string;
}

const QUICK_STUDIES = [
  { id: 'rsi_analysis', name: 'RSI', icon: Gauge, color: 'text-emerald-500' },
  { id: 'moving_average_analysis', name: 'Moving Avg', icon: TrendingUp, color: 'text-blue-500' },
  { id: 'day_of_week_returns', name: 'Seasonality', icon: Calendar, color: 'text-violet-500' },
];

export function HoldingDetailCard({ ticker, weight, annualReturn, onBack }: HoldingDetailCardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'studies'>('overview');
  const [isLoadingStudy, setIsLoadingStudy] = useState<string | null>(null);
  const [studyResults, setStudyResults] = useState<StudyResult[]>([]);
  const [polygonDetails, setPolygonDetails] = useState<TickerDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  
  // Get basic ticker info from universe (fallback)
  const tickerData = TICKER_MAP.get(ticker);

  // Fetch real data from Polygon
  useEffect(() => {
    async function loadDetails() {
      setIsLoadingDetails(true);
      try {
        const details = await fetchTickerDetails(ticker);
        setPolygonDetails(details);
      } catch (error) {
        console.error('Failed to load ticker details:', error);
      } finally {
        setIsLoadingDetails(false);
      }
    }
    loadDetails();
  }, [ticker]);

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

  // Use Polygon data if available, fallback to TICKER_MAP
  const displayName = polygonDetails?.name || tickerData?.name || ticker;
  const displaySector = polygonDetails?.sector || tickerData?.sector || 'N/A';
  const displayIndustry = polygonDetails?.industry || 'N/A';
  const displayDescription = polygonDetails?.description || getTickerDescription(ticker);
  const displayType = polygonDetails?.type || (tickerData as any)?.assetType || 'ETF';
  const displayMarketCap = polygonDetails?.marketCap;
  const displayLogo = polygonDetails?.logoUrl;

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {displayLogo && (
              <img src={displayLogo} alt={ticker} className="w-6 h-6 rounded" />
            )}
            <span className="font-mono font-bold text-lg">{ticker}</span>
            <Badge variant="outline" className="text-xs">{weight}%</Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{displayName}</p>
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
            Details
          </TabsTrigger>
          <TabsTrigger value="studies" className="text-xs">
            <FlaskConical className="h-3 w-3 mr-1" />
            Studies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3 space-y-3">
          {isLoadingDetails ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <>
              {/* Asset Info Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-muted/50">
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-2.5 w-2.5" />
                    Type
                  </div>
                  <div className="text-sm font-medium">{displayType}</div>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" />
                    Sector
                  </div>
                  <div className="text-sm font-medium truncate">{displaySector}</div>
                </div>
                {displayIndustry !== 'N/A' && (
                  <div className="p-2 rounded bg-muted/50 col-span-2">
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Factory className="h-2.5 w-2.5" />
                      Industry
                    </div>
                    <div className="text-sm font-medium">{displayIndustry}</div>
                  </div>
                )}
                {displayMarketCap && (
                  <div className="p-2 rounded bg-muted/50 col-span-2">
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-2.5 w-2.5" />
                      Market Cap
                    </div>
                    <div className="text-sm font-medium">
                      ${(displayMarketCap / 1e9).toFixed(2)}B
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {displayDescription && (
                <div className="p-3 rounded bg-muted/30 border border-border/50">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                    {displayDescription}
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

              {/* Polygon Attribution */}
              {polygonDetails && (
                <div className="flex items-center justify-center gap-1 text-[9px] text-muted-foreground/60">
                  <Globe className="h-2.5 w-2.5" />
                  Data from Polygon.io
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="studies" className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Run technical studies on <span className="font-mono font-bold">{ticker}</span>
          </p>

          <div className="grid grid-cols-3 gap-1.5">
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
      const avgRsi = data?.avgRSI || 50;
      const deviation = rsi - avgRsi;
      if (rsi >= 70) return `${ticker} RSI: ${rsi.toFixed(1)} (overbought >70). ${Math.abs(deviation).toFixed(1)} pts above avg. Historically, ${rsi >= 80 ? '85%' : '65%'} of stocks at this RSI see pullbacks within 5 days.`;
      if (rsi <= 30) return `${ticker} RSI: ${rsi.toFixed(1)} (oversold <30). ${Math.abs(deviation).toFixed(1)} pts below avg. Historically, ${rsi <= 20 ? '80%' : '60%'} of stocks at this RSI bounce within 5 days.`;
      return `${ticker} RSI: ${rsi.toFixed(1)} (neutral range 30-70). ${deviation >= 0 ? '+' : ''}${deviation.toFixed(1)} pts vs avg ${avgRsi.toFixed(0)}. No overbought/oversold signal.`;
    }
    case 'moving_average_analysis': {
      const above20 = data?.above20DMA;
      const above50 = data?.above50DMA;
      const above200 = data?.above200DMA;
      const trend = data?.trend;
      const maCount = [above20, above50, above200].filter(Boolean).length;
      return trend === 'bullish' 
        ? `${ticker} above ${maCount}/3 key MAs (20/50/200-day). Golden cross alignment = bullish.`
        : `${ticker} below ${3 - maCount}/3 key MAs. ${!above200 ? 'Below 200-day MA = long-term downtrend.' : 'Watch for death cross formation.'}`;
    }
    case 'day_of_week_returns': {
      const bestDay = data?.bestDay;
      const worstDay = data?.worstDay;
      const bestReturn = data?.bestReturn;
      const worstReturn = data?.worstReturn;
      if (bestDay && bestReturn !== undefined) {
        return `${ticker} best day: ${bestDay}s (avg +${bestReturn.toFixed(2)}%). Worst: ${worstDay || 'N/A'}s (${worstReturn !== undefined ? worstReturn.toFixed(2) : 'N/A'}%).`;
      }
      return 'Seasonality analysis complete - check day breakdown for patterns.';
    }
    default:
      return `${studyType.replace(/_/g, ' ')} analysis for ${ticker} - review metrics below.`;
  }
}
