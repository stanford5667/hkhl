// src/components/earnings/EarningsDetailDialog.tsx

import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, Calendar, DollarSign, Users, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EarningsWithPrediction } from '@/types/earnings';
import { useEarningsHistory } from '@/hooks/useEarningsCalendar';
import { formatEarningsCurrency } from '@/lib/earningsUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

interface Props {
  earning: EarningsWithPrediction;
  open: boolean;
  onClose: () => void;
}

export const EarningsDetailDialog = ({ earning, open, onClose }: Props) => {
  const navigate = useNavigate();
  const { data: history, isLoading: historyLoading } = useEarningsHistory(earning.symbol);

  const getPredictionIcon = () => {
    if (!earning.prediction) return <Minus className="h-5 w-5" />;
    
    switch (earning.prediction.predicted_outcome) {
      case 'beat':
        return <TrendingUp className="h-5 w-5 text-emerald-600" />;
      case 'miss':
        return <TrendingDown className="h-5 w-5 text-destructive" />;
      default:
        return <Minus className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const historicalBeatRate = history && history.length > 0
    ? (history.filter(h => (h.eps_surprise_pct || 0) > 0).length / history.length) * 100
    : 0;

  const avgSurprise = history && history.length > 0
    ? history.reduce((sum, h) => sum + (h.eps_surprise_pct || 0), 0) / history.length
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                {earning.symbol}
                {getPredictionIcon()}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {earning.company_name || earning.symbol}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                navigate(`/stock/${earning.symbol}`);
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Research
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="prediction">Prediction</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Report Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">
                      {format(parseISO(earning.report_date), 'MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium">
                      {earning.time_of_day === 'BMO' && 'Before Market Open'}
                      {earning.time_of_day === 'AMC' && 'After Market Close'}
                      {earning.time_of_day === 'DMT' && 'During Market Hours'}
                      {!earning.time_of_day && 'TBD'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Period:</span>
                    <span className="font-medium">
                      {earning.fiscal_period} {earning.fiscal_year}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Estimates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">EPS Estimate:</span>
                    <span className="font-mono font-medium">
                      {earning.eps_estimate !== null 
                        ? `$${earning.eps_estimate.toFixed(2)}`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revenue Estimate:</span>
                    <span className="font-mono font-medium">
                      {formatEarningsCurrency(earning.revenue_estimate, true)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Analyst Count:
                    </span>
                    <span className="font-medium">
                      {earning.analyst_count || 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="prediction" className="space-y-4">
            {earning.prediction ? (
              <>
                <Card className="bg-card/50 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">AI Prediction</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Predicted Outcome</p>
                        <p className="text-2xl font-bold capitalize mt-1">
                          {earning.prediction.predicted_outcome}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <p className="text-2xl font-bold mt-1">
                          {Math.round(earning.prediction.confidence_score * 100)}%
                        </p>
                      </div>
                    </div>
                    <Progress value={earning.prediction.confidence_score * 100} />
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground">
                        Model: {earning.prediction.model_version}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {earning.prediction.signals && Object.keys(earning.prediction.signals).length > 0 && (
                  <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Signal Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(earning.prediction.signals).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                            <span className="text-sm font-medium capitalize">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <span className="text-sm text-muted-foreground font-mono">
                              {typeof value === 'number' 
                                ? value.toFixed(4)
                                : JSON.stringify(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No prediction available for this earnings event
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Historical Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Beat Rate (2Y):</span>
                    <span className="font-medium">{historicalBeatRate.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Surprise:</span>
                    <span className="font-medium">{avgSurprise.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reports Analyzed:</span>
                    <span className="font-medium">{history?.length || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {historyLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : history && history.length > 0 ? (
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Recent Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {history.slice(0, 8).map((h) => (
                      <div key={h.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <div>
                          <p className="text-sm font-medium">
                            {format(parseISO(h.report_date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {h.fiscal_period}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono">
                            {h.eps_actual !== null ? `$${h.eps_actual.toFixed(2)}` : 'N/A'}
                          </p>
                          {h.eps_surprise_pct !== null && (
                            <Badge
                              variant={h.eps_surprise_pct > 0 ? 'default' : 'destructive'}
                              className="text-xs mt-1"
                            >
                              {h.eps_surprise_pct > 0 ? '+' : ''}
                              {h.eps_surprise_pct.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No historical earnings data available
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
