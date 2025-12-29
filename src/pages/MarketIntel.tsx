import { TrendingUp, Newspaper, AlertCircle, DollarSign, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function MarketIntel() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="h1 flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          Market Intelligence
        </h1>
        <p className="text-muted-foreground mt-1">
          Industry news, competitor insights, and macroeconomic data
        </p>
      </div>

      {/* Coming Soon Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Newspaper className="h-5 w-5 text-primary" />
              Industry News
              <Badge variant="outline" className="ml-auto">Coming Soon</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              AI-powered news aggregation for your pipeline companies and portfolio.
              Get alerts on acquisitions, leadership changes, and market movements.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-warning" />
              Competitor Tracking
              <Badge variant="outline" className="ml-auto">Coming Soon</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Monitor competitor pricing changes, new product launches, and market
              positioning across your deal universe.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-success" />
              Consumer Trends
              <Badge variant="outline" className="ml-auto">Coming Soon</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Emerging trends in consumer behavior, spending patterns, and market
              preferences that impact your investments.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              Macro Data
              <Badge variant="outline" className="ml-auto">Coming Soon</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Real-time FED rates, CPI, commodities prices, and key economic
              indicators from Trading Economics integration.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
