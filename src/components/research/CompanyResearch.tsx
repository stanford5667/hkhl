import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Newspaper,
  TrendingUp,
  FileText,
  Users,
  MessageCircle,
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import {
  useCompanyNews,
  useCompanyFinancials,
  useSecFilings,
  useAnalystReports,
  useSocialSentiment,
  useRefreshResearch,
  getSentimentColor,
  getSentimentBgColor,
  getRatingColor,
  formatRelativeTime,
} from '@/hooks/useCompanyResearch';
import { toast } from 'sonner';

interface CompanyResearchProps {
  ticker: string;
  companyName?: string;
}

export function CompanyResearch({ ticker, companyName }: CompanyResearchProps) {
  const [activeTab, setActiveTab] = useState('news');
  
  const { data: newsData, isLoading: newsLoading, error: newsError } = useCompanyNews(ticker, companyName, 10, activeTab === 'news');
  const { data: financialsData, isLoading: financialsLoading } = useCompanyFinancials(ticker, activeTab === 'financials');
  const { data: secData, isLoading: secLoading } = useSecFilings(ticker, 5, activeTab === 'sec');
  const { data: analystData, isLoading: analystLoading } = useAnalystReports(ticker, 5, activeTab === 'analyst');
  const { data: socialData, isLoading: socialLoading } = useSocialSentiment(ticker, 10, activeTab === 'social');
  
  const refreshMutation = useRefreshResearch();
  
  const handleRefresh = () => {
    refreshMutation.mutate({ ticker, scrapeType: activeTab === 'sec' ? 'sec_filings' : activeTab });
    toast.success('Refreshing data...');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Research & Intelligence</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshMutation.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="news" className="gap-2">
            <Newspaper className="h-4 w-4" />
            News
          </TabsTrigger>
          <TabsTrigger value="financials" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Financials
          </TabsTrigger>
          <TabsTrigger value="sec" className="gap-2">
            <FileText className="h-4 w-4" />
            SEC
          </TabsTrigger>
          <TabsTrigger value="analyst" className="gap-2">
            <Users className="h-4 w-4" />
            Analyst
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Social
          </TabsTrigger>
        </TabsList>

        {/* News Tab */}
        <TabsContent value="news" className="space-y-4">
          {newsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="glass-card">
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : newsError ? (
            <Card className="glass-card border-destructive/50">
              <CardContent className="p-6 flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Failed to load news. Please try again.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {newsData?.data?.articles?.map((article, idx) => (
                <Card key={idx} className="glass-card hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:text-primary transition-colors flex items-center gap-2"
                        >
                          {article.title}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span>{article.source}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(article.date)}</span>
                        </div>
                        {article.summary && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{article.summary}</p>
                        )}
                      </div>
                      <Badge className={`${getSentimentBgColor(article.sentiment)} ${getSentimentColor(article.sentiment)} capitalize`}>
                        {article.sentiment}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!newsData?.data?.articles || newsData.data.articles.length === 0) && (
                <Card className="glass-card">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No news articles found for {ticker}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Financials Tab */}
        <TabsContent value="financials" className="space-y-4">
          {financialsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="glass-card">
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-6 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : financialsData?.data ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Market Cap</p>
                    <p className="text-xl font-bold mt-1">{financialsData.data.company.marketCap}</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">P/E Ratio</p>
                    <p className="text-xl font-bold mt-1">{financialsData.data.company.peRatio}</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">EPS</p>
                    <p className="text-xl font-bold mt-1">${financialsData.data.company.eps}</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Dividend Yield</p>
                    <p className="text-xl font-bold mt-1">{financialsData.data.company.dividendYield}</p>
                  </CardContent>
                </Card>
              </div>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-base">Key Statistics</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Beta</p>
                    <p className="font-medium">{financialsData.data.keyStats.beta}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">52-Week High</p>
                    <p className="font-medium">{financialsData.data.keyStats.fiftyTwoWeekHigh}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">52-Week Low</p>
                    <p className="font-medium">{financialsData.data.keyStats.fiftyTwoWeekLow}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sector</p>
                    <p className="font-medium">{financialsData.data.company.sector}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* SEC Filings Tab */}
        <TabsContent value="sec" className="space-y-4">
          {secLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="glass-card">
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-1/3 mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {secData?.data?.filings?.map((filing, idx) => (
                <Card key={idx} className="glass-card hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono">{filing.type}</Badge>
                          <span className="font-medium">{filing.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Filed: {new Date(filing.filedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <a
                        href={filing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!secData?.data?.filings || secData.data.filings.length === 0) && (
                <Card className="glass-card">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No SEC filings found for {ticker}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Analyst Tab */}
        <TabsContent value="analyst" className="space-y-4">
          {analystLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : analystData?.data ? (
            <>
              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Consensus Rating</p>
                      <p className={`text-3xl font-bold ${getRatingColor(analystData.data.consensus)}`}>
                        {analystData.data.consensus}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Average Price Target</p>
                      <p className="text-3xl font-bold">${analystData.data.averageTarget}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-base">Recent Analyst Reports</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analystData.data.reports.map((report, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium">{report.analyst}</p>
                        <p className="text-sm text-muted-foreground">{formatRelativeTime(report.date)}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={`${getRatingColor(report.rating)}`}>{report.rating}</Badge>
                        {report.priceTarget > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">Target: ${report.priceTarget}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* Social Tab */}
        <TabsContent value="social" className="space-y-4">
          {socialLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : socialData?.data ? (
            <>
              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">Overall Sentiment Score</p>
                    <p className={`text-2xl font-bold ${parseFloat(socialData.data.overallSentiment) > 0 ? 'text-emerald-400' : parseFloat(socialData.data.overallSentiment) < 0 ? 'text-rose-400' : 'text-muted-foreground'}`}>
                      {parseFloat(socialData.data.overallSentiment) > 0 ? '+' : ''}{socialData.data.overallSentiment}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-sm text-emerald-400">Positive</span>
                      <Progress value={socialData.data.breakdown.positive} className="flex-1" />
                      <span className="w-12 text-sm text-right">{socialData.data.breakdown.positive}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-sm text-muted-foreground">Neutral</span>
                      <Progress value={socialData.data.breakdown.neutral} className="flex-1" />
                      <span className="w-12 text-sm text-right">{socialData.data.breakdown.neutral}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-sm text-rose-400">Negative</span>
                      <Progress value={socialData.data.breakdown.negative} className="flex-1" />
                      <span className="w-12 text-sm text-right">{socialData.data.breakdown.negative}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-base">Recent Mentions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {socialData.data.mentions.map((mention, idx) => (
                    <div key={idx} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <Badge variant="outline" className="flex-shrink-0">{mention.platform}</Badge>
                      <div className="flex-1">
                        <p className="text-sm line-clamp-2">{mention.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(mention.timestamp)}</p>
                      </div>
                      <Badge className={`${getSentimentBgColor(mention.sentiment)} ${getSentimentColor(mention.sentiment)} capitalize text-xs`}>
                        {mention.sentiment}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>
      </Tabs>

      {/* Data source indicator */}
      <p className="text-xs text-muted-foreground text-center">
        Data sourced via Firecrawl • Last updated: {new Date().toLocaleTimeString()}
      </p>
    </div>
  );
}

export { CompanyResearch as default };
