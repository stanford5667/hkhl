import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import {
  useAnalystReports,
  useSocialSentiment,
  useRefreshResearch,
  getSentimentColor,
  getSentimentBgColor,
  getRatingColor,
  formatRelativeTime,
} from '@/hooks/useCompanyResearch';
import { toast } from 'sonner';

interface AnalystSocialPanelProps {
  ticker: string;
  companyName?: string;
}

export function AnalystSocialPanel({ ticker, companyName }: AnalystSocialPanelProps) {
  const [activeTab, setActiveTab] = useState('analyst');
  
  const { data: analystData, isLoading: analystLoading } = useAnalystReports(ticker, 5, activeTab === 'analyst');
  const { data: socialData, isLoading: socialLoading } = useSocialSentiment(ticker, 10, activeTab === 'social');
  
  const refreshMutation = useRefreshResearch();
  
  const handleRefresh = () => {
    refreshMutation.mutate({ ticker, scrapeType: activeTab });
    toast.success('Refreshing data...');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Analyst & Social Sentiment</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshMutation.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="analyst" className="gap-2">
            <Users className="h-4 w-4" />
            Analyst Reports
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Social Sentiment
          </TabsTrigger>
        </TabsList>

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
          ) : (
            <Card className="glass-card">
              <CardContent className="p-6 text-center text-muted-foreground">
                No analyst data available for {ticker}
              </CardContent>
            </Card>
          )}
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
          ) : (
            <Card className="glass-card">
              <CardContent className="p-6 text-center text-muted-foreground">
                No social sentiment data available for {ticker}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Data source indicator */}
      <p className="text-xs text-muted-foreground text-center">
        Data sourced via Firecrawl • Last updated: {new Date().toLocaleTimeString()}
      </p>
    </div>
  );
}
