import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, Scatter, ComposedChart, Area
} from 'recharts';
import { format, parseISO, startOfHour, subHours } from 'date-fns';
import { TrendingUp } from 'lucide-react';
import { NewsArticle } from './NewsIntelligenceDashboard';

interface SentimentTimelineProps {
  articles: NewsArticle[];
  onArticleSelect: (article: NewsArticle) => void;
}

export function SentimentTimeline({ articles, onArticleSelect }: SentimentTimelineProps) {
  const chartData = useMemo(() => {
    if (articles.length === 0) return [];

    // Group articles by hour
    const hourlyData = new Map<string, { 
      articles: NewsArticle[], 
      totalSentiment: number,
      count: number,
      highImpact: number
    }>();

    // Generate last 24 hours
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const hour = startOfHour(subHours(now, i));
      const key = hour.toISOString();
      hourlyData.set(key, { articles: [], totalSentiment: 0, count: 0, highImpact: 0 });
    }

    // Aggregate articles into hours
    articles.forEach(article => {
      const articleHour = startOfHour(parseISO(article.detected_at));
      const key = articleHour.toISOString();
      
      if (hourlyData.has(key)) {
        const data = hourlyData.get(key)!;
        data.articles.push(article);
        data.totalSentiment += article.sentiment_score || 0;
        data.count++;
        if (article.severity === 'critical' || article.severity === 'high') {
          data.highImpact++;
        }
      }
    });

    // Convert to array
    return Array.from(hourlyData.entries()).map(([hour, data]) => ({
      hour,
      time: format(parseISO(hour), 'HH:mm'),
      sentiment: data.count > 0 ? data.totalSentiment / data.count : null,
      articleCount: data.count,
      highImpact: data.highImpact,
      articles: data.articles
    }));
  }, [articles]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 max-w-xs">
        <p className="font-medium text-sm">{data.time}</p>
        <div className="mt-2 space-y-1 text-xs">
          <p className="text-muted-foreground">
            Sentiment: <span className={data.sentiment >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
              {data.sentiment?.toFixed(2) || 'N/A'}
            </span>
          </p>
          <p className="text-muted-foreground">
            Articles: {data.articleCount}
          </p>
          {data.highImpact > 0 && (
            <p className="text-amber-500">
              🔴 {data.highImpact} breaking news
            </p>
          )}
        </div>
        {data.articles.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Recent headlines:</p>
            {data.articles.slice(0, 2).map((a: NewsArticle) => (
              <p key={a.id} className="text-xs truncate">{a.title}</p>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Sentiment Timeline (24h)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No sentiment data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                />
                <YAxis 
                  domain={[-1, 1]}
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  tickFormatter={(v) => v.toFixed(1)}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                
                {/* Sentiment area */}
                <Area
                  type="monotone"
                  dataKey="sentiment"
                  stroke="hsl(var(--primary))"
                  fill="url(#sentimentGradient)"
                  strokeWidth={2}
                  connectNulls
                />
                
                {/* Sentiment line */}
                <Line
                  type="monotone"
                  dataKey="sentiment"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (!payload.sentiment) return null;
                    
                    // Larger dot for high-impact periods
                    const size = payload.highImpact > 0 ? 8 : payload.articleCount > 2 ? 5 : 3;
                    const color = payload.highImpact > 0 
                      ? 'hsl(var(--destructive))' 
                      : 'hsl(var(--primary))';
                    
                    return (
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={size} 
                        fill={color}
                        className="cursor-pointer"
                      />
                    );
                  }}
                  activeDot={{
                    r: 6,
                    fill: 'hsl(var(--primary))',
                    stroke: 'hsl(var(--background))',
                    strokeWidth: 2
                  }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Click on data points to view articles from that time period
        </p>
      </CardContent>
    </Card>
  );
}
