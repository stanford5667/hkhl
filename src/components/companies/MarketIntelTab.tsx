import { useState } from 'react';
import { 
  Newspaper, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown,
  Target,
  GitMerge,
  BarChart3,
  Shield,
  Calendar,
  Loader2,
  RefreshCw,
  AlertCircle,
  Zap,
  Clock,
  ChevronRight,
  Building2,
  Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useCompanyNews,
  useCompetitorIntel,
  useIndustryTrends,
  useMAActivity,
  useMarketData,
  useRegulatoryUpdates,
  useEarningsEvents,
  type CompanyNewsData,
  type CompetitorIntelData,
  type IndustryTrendsData,
  type MAActivityData,
  type MarketDataResult,
  type RegulatoryData,
  type EarningsEventsData
} from '@/hooks/usePerplexityMarketIntel';

interface MarketIntelTabProps {
  companyId: string;
  companyName: string;
  industry: string | null;
}

const CATEGORIES = [
  { id: 'news', label: 'Company News', icon: Newspaper },
  { id: 'competitors', label: 'Competitors', icon: Target },
  { id: 'trends', label: 'Industry Trends', icon: TrendingUp },
  { id: 'ma', label: 'M&A Activity', icon: GitMerge },
  { id: 'market', label: 'Market Data', icon: BarChart3 },
  { id: 'regulatory', label: 'Regulatory', icon: Shield },
  { id: 'events', label: 'Earnings & Events', icon: Calendar }
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

export function MarketIntelTab({ companyId, companyName, industry }: MarketIntelTabProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('news');
  const industryName = industry || 'General Business';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Market Intelligence
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            AI-powered insights for {companyName} in {industryName}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          <Zap className="h-3 w-3 mr-1" />
          Powered by Perplexity
        </Badge>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveCategory(cat.id)}
              className="shrink-0"
            >
              <Icon className="h-4 w-4 mr-2" />
              {cat.label}
            </Button>
          );
        })}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeCategory === 'news' && (
          <CompanyNewsSection companyId={companyId} companyName={companyName} industry={industryName} />
        )}
        {activeCategory === 'competitors' && (
          <CompetitorSection companyId={companyId} companyName={companyName} industry={industryName} />
        )}
        {activeCategory === 'trends' && (
          <IndustryTrendsSection companyId={companyId} industry={industryName} />
        )}
        {activeCategory === 'ma' && (
          <MAActivitySection companyId={companyId} industry={industryName} />
        )}
        {activeCategory === 'market' && (
          <MarketDataSection companyId={companyId} industry={industryName} />
        )}
        {activeCategory === 'regulatory' && (
          <RegulatorySection companyId={companyId} industry={industryName} />
        )}
        {activeCategory === 'events' && (
          <EarningsEventsSection companyId={companyId} companyName={companyName} industry={industryName} />
        )}
      </div>
    </div>
  );
}

// Section Header Component
function SectionHeader({ 
  title, 
  subtitle, 
  lastFetched, 
  isCached, 
  isLoading, 
  onRefresh 
}: {
  title: string;
  subtitle: string;
  lastFetched: Date | null;
  isCached: boolean;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h4 className="font-medium text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        {lastFetched && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{isCached ? 'Cached' : 'Fresh'} · {formatRelativeTime(lastFetched)}</span>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Error Display
function ErrorDisplay({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Card className="p-6 border-destructive/50 bg-destructive/10">
      <div className="flex items-center gap-3 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <div>
          <p className="font-medium">Failed to load</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        Try Again
      </Button>
    </Card>
  );
}

// Sentiment Badge
function SentimentBadge({ sentiment }: { sentiment: 'positive' | 'negative' | 'neutral' }) {
  const config = {
    positive: { color: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30', icon: TrendingUp },
    negative: { color: 'bg-rose-600/20 text-rose-400 border-rose-600/30', icon: TrendingDown },
    neutral: { color: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30', icon: Minus }
  };
  const { color, icon: Icon } = config[sentiment] || config.neutral;
  return (
    <Badge className={cn('gap-1', color)}>
      <Icon className="h-3 w-3" />
      {sentiment}
    </Badge>
  );
}

// Company News Section
function CompanyNewsSection({ companyId, companyName, industry }: { companyId: string; companyName: string; industry: string }) {
  const { data, isLoading, error, lastFetched, isCached, refresh } = useCompanyNews(companyName, companyId, industry);

  return (
    <div>
      <SectionHeader
        title="Company News"
        subtitle={`Latest news and announcements for ${companyName}`}
        lastFetched={lastFetched}
        isCached={isCached}
        isLoading={isLoading}
        onRefresh={refresh}
      />

      {error && <ErrorDisplay error={error} onRetry={refresh} />}
      {isLoading && !data && <LoadingSkeleton />}

      {data && (
        <div className="space-y-4">
          {data.keyTakeaway && (
            <Card className="bg-primary/10 border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-foreground">Key Takeaway</p>
                    <p className="text-sm text-muted-foreground">{data.keyTakeaway}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {data.articles?.map((article, i) => (
              <Card key={i} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => article.url && window.open(article.url, '_blank')}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span>{article.source}</span>
                        <span>·</span>
                        <span>{article.date}</span>
                        {article.relevance === 'high' && (
                          <Badge variant="secondary" className="text-xs">High Relevance</Badge>
                        )}
                      </div>
                      <h5 className="font-medium text-foreground mb-1">{article.title}</h5>
                      <p className="text-sm text-muted-foreground">{article.summary}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SentimentBadge sentiment={article.sentiment} />
                      {article.url && <ExternalLink className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Competitor Section
function CompetitorSection({ companyId, companyName, industry }: { companyId: string; companyName: string; industry: string }) {
  const { data, isLoading, error, lastFetched, isCached, refresh } = useCompetitorIntel(companyName, companyId, industry, []);

  return (
    <div>
      <SectionHeader
        title="Competitive Intelligence"
        subtitle={`Competitor activity and threats for ${companyName}`}
        lastFetched={lastFetched}
        isCached={isCached}
        isLoading={isLoading}
        onRefresh={refresh}
      />

      {error && <ErrorDisplay error={error} onRetry={refresh} />}
      {isLoading && !data && <LoadingSkeleton />}

      {data && (
        <div className="space-y-4">
          {data.competitiveLandscapeSummary && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{data.competitiveLandscapeSummary}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-rose-900/20 border-rose-600/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                  Key Threats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {data.keyThreats?.map((threat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                      {threat}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-emerald-900/20 border-emerald-600/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {data.keyOpportunities?.map((opp, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      {opp}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            {data.competitors?.map((competitor, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{competitor.name}</span>
                    </div>
                    <Badge variant={competitor.threatLevel === 'high' ? 'destructive' : competitor.threatLevel === 'medium' ? 'secondary' : 'outline'}>
                      {competitor.threatLevel} threat
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{competitor.strategicMoves}</p>
                  {competitor.recentNews?.slice(0, 2).map((news, j) => (
                    <div key={j} className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">
                      <span className="font-medium">{news.title}</span> - {news.impact}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Industry Trends Section
function IndustryTrendsSection({ companyId, industry }: { companyId: string; industry: string }) {
  const { data, isLoading, error, lastFetched, isCached, refresh } = useIndustryTrends(industry, companyId);

  return (
    <div>
      <SectionHeader
        title="Industry Trends"
        subtitle={`Market dynamics and trends in ${industry}`}
        lastFetched={lastFetched}
        isCached={isCached}
        isLoading={isLoading}
        onRefresh={refresh}
      />

      {error && <ErrorDisplay error={error} onRetry={refresh} />}
      {isLoading && !data && <LoadingSkeleton />}

      {data && (
        <div className="space-y-4">
          {data.marketOverview && (
            <Card className={cn(
              data.marketOverview.outlook === 'positive' ? 'bg-emerald-900/20 border-emerald-600/30' :
              data.marketOverview.outlook === 'negative' ? 'bg-rose-900/20 border-rose-600/30' :
              'bg-muted/50'
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Market Overview</span>
                  <Badge variant={data.marketOverview.outlook === 'positive' ? 'default' : data.marketOverview.outlook === 'negative' ? 'destructive' : 'secondary'}>
                    {data.marketOverview.outlook} outlook
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{data.marketOverview.currentState}</p>
                <p className="text-xs text-muted-foreground mt-2">{data.marketOverview.outlookRationale}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Growth Drivers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.growthDrivers?.map((driver, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{driver.driver}</span>
                    <Badge variant="outline" className="text-xs">{driver.strength}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-rose-400" />
                  Headwinds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.headwinds?.map((headwind, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{headwind.challenge}</span>
                    <Badge variant="outline" className="text-xs">{headwind.severity}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {data.trends && data.trends.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {data.trends.map((trend, i) => (
                <Card key={i} className={cn(
                  trend.sentiment === 'tailwind' ? 'border-emerald-600/30' :
                  trend.sentiment === 'headwind' ? 'border-rose-600/30' : ''
                )}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{trend.name}</span>
                      <Badge variant="outline" className="text-xs">{trend.timeframe}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{trend.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// M&A Activity Section
function MAActivitySection({ companyId, industry }: { companyId: string; industry: string }) {
  const { data, isLoading, error, lastFetched, isCached, refresh } = useMAActivity(industry, companyId);

  return (
    <div>
      <SectionHeader
        title="M&A Activity"
        subtitle={`Recent deals and transactions in ${industry}`}
        lastFetched={lastFetched}
        isCached={isCached}
        isLoading={isLoading}
        onRefresh={refresh}
      />

      {error && <ErrorDisplay error={error} onRetry={refresh} />}
      {isLoading && !data && <LoadingSkeleton />}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Deal Activity</p>
                <p className="text-xl font-bold capitalize">{data.dealActivity?.trend}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">EV/EBITDA Range</p>
                <p className="text-xl font-bold">{data.valuationTrends?.evEbitdaRange || 'N/A'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">EV/Revenue Range</p>
                <p className="text-xl font-bold">{data.valuationTrends?.evRevenueRange || 'N/A'}</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            {data.recentDeals?.map((deal, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <GitMerge className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium">{deal.dealName}</h5>
                        <Badge variant={deal.status === 'Completed' ? 'default' : 'secondary'}>{deal.status}</Badge>
                      </div>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        {deal.dealValue && <span>{deal.dealValue}</span>}
                        {deal.multiple && <span>{deal.multiple}</span>}
                        <span>{deal.date}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{deal.rationale}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Active Buyers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {data.activeBuyers?.map((buyer, i) => (
                    <Badge key={i} variant="outline">{buyer}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Hot Subsectors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {data.hotSubsectors?.map((sector, i) => (
                    <Badge key={i} variant="secondary">{sector}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {data.outlook && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <p className="font-medium text-sm mb-1">M&A Outlook</p>
                <p className="text-sm text-muted-foreground">{data.outlook}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Market Data Section
function MarketDataSection({ companyId, industry }: { companyId: string; industry: string }) {
  const { data, isLoading, error, lastFetched, isCached, refresh } = useMarketData(industry, companyId);

  return (
    <div>
      <SectionHeader
        title="Market Data"
        subtitle={`Market size and structure for ${industry}`}
        lastFetched={lastFetched}
        isCached={isCached}
        isLoading={isLoading}
        onRefresh={refresh}
      />

      {error && <ErrorDisplay error={error} onRetry={refresh} />}
      {isLoading && !data && <LoadingSkeleton />}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-primary/10 border-primary/30">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">TAM</p>
                <p className="text-2xl font-bold text-primary">{data.marketSize?.tam?.value || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">{data.marketSize?.tam?.year}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">SAM</p>
                <p className="text-2xl font-bold">{data.marketSize?.sam?.value || 'N/A'}</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-900/20 border-emerald-600/30">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Historical CAGR</p>
                <p className="text-2xl font-bold text-emerald-400">{data.growth?.historicalCagr || 'N/A'}</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-900/20 border-blue-600/30">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Projected CAGR</p>
                <p className="text-2xl font-bold text-blue-400">{data.growth?.projectedCagr || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">{data.growth?.projectionPeriod}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Market Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{data.marketStructure?.description}</p>
              <div className="flex gap-4 mt-2 text-sm">
                <span><strong>Fragmentation:</strong> {data.marketStructure?.fragmentation}</span>
                <span><strong>Top 5 Share:</strong> {data.marketStructure?.topPlayersMarketShare}</span>
              </div>
            </CardContent>
          </Card>

          {data.keySegments && data.keySegments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Key Segments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-3">
                  {data.keySegments.map((segment, i) => (
                    <div key={i} className="p-2 bg-muted/50 rounded-md">
                      <p className="font-medium text-sm">{segment.segment}</p>
                      <p className="text-xs text-muted-foreground">{segment.size} · {segment.growth}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {data.dataSources && data.dataSources.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Sources:</span>
              {data.dataSources.slice(0, 3).map((source, i) => (
                <Badge key={i} variant="outline" className="text-xs">{source}</Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Regulatory Section
function RegulatorySection({ companyId, industry }: { companyId: string; industry: string }) {
  const { data, isLoading, error, lastFetched, isCached, refresh } = useRegulatoryUpdates(industry, companyId);

  return (
    <div>
      <SectionHeader
        title="Regulatory Updates"
        subtitle={`Policy and compliance news for ${industry}`}
        lastFetched={lastFetched}
        isCached={isCached}
        isLoading={isLoading}
        onRefresh={refresh}
      />

      {error && <ErrorDisplay error={error} onRetry={refresh} />}
      {isLoading && !data && <LoadingSkeleton />}

      {data && (
        <div className="space-y-4">
          {data.regulatoryEnvironment && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-medium">Regulatory Environment: {data.regulatoryEnvironment.trend}</span>
                </div>
                <p className="text-sm text-muted-foreground">{data.regulatoryEnvironment.description}</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {data.recentChanges?.map((change, i) => (
              <Card key={i} className={cn(
                change.impactLevel === 'high' ? 'border-rose-600/30' :
                change.impactLevel === 'medium' ? 'border-yellow-600/30' : ''
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{change.title}</span>
                    <Badge variant={change.impactLevel === 'high' ? 'destructive' : 'secondary'}>
                      {change.impactLevel} impact
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{change.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Effective: {change.effectiveDate}</span>
                    <span>Jurisdiction: {change.jurisdiction}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data.complianceAlerts && data.complianceAlerts.length > 0 && (
            <Card className="bg-yellow-900/20 border-yellow-600/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                  Compliance Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {data.complianceAlerts.map((alert, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                      {alert}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Earnings & Events Section
function EarningsEventsSection({ companyId, companyName, industry }: { companyId: string; companyName: string; industry: string }) {
  const { data, isLoading, error, lastFetched, isCached, refresh } = useEarningsEvents(companyName, companyId, industry, []);

  return (
    <div>
      <SectionHeader
        title="Earnings & Events"
        subtitle={`Upcoming calendar for ${industry}`}
        lastFetched={lastFetched}
        isCached={isCached}
        isLoading={isLoading}
        onRefresh={refresh}
      />

      {error && <ErrorDisplay error={error} onRetry={refresh} />}
      {isLoading && !data && <LoadingSkeleton />}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Upcoming Earnings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.upcomingEarnings?.map((earnings, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded-md">
                    <div>
                      <span className="font-medium">{earnings.company}</span>
                      <p className="text-xs text-muted-foreground">{earnings.quarter}</p>
                    </div>
                    <span className="text-muted-foreground">{earnings.date}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Recent Earnings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recentEarnings?.map((earnings, i) => (
                  <div key={i} className="p-2 bg-muted/50 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{earnings.company}</span>
                      <Badge variant={earnings.surprise === 'Beat' ? 'default' : earnings.surprise === 'Miss' ? 'destructive' : 'secondary'} className="text-xs">
                        {earnings.surprise}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{earnings.highlights}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {data.industryEvents && data.industryEvents.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Industry Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.industryEvents.map((event, i) => (
                  <div key={i} className="flex items-start gap-4 p-2 bg-muted/50 rounded-md">
                    <Calendar className="h-4 w-4 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{event.event}</span>
                        <span className="text-xs text-muted-foreground">{event.date}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{event.location} - {event.relevance}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Utility function
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
