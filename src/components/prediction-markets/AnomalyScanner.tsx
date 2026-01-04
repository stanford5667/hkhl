import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription 
} from '@/components/ui/sheet';
import { 
  AlertTriangle, RefreshCw, TrendingUp, TrendingDown, 
  Sparkles, Fish, FileText, ExternalLink, Eye, 
  BarChart3, Zap, Clock, ArrowUpDown
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Anomaly {
  id: string;
  marketId: string;
  marketTitle: string;
  platform: string;
  category: string;
  marketPrice: number; // Market implied probability (0-100)
  sentimentScore: number; // AI aggregated sentiment (0-100)
  divergence: number; // Absolute difference
  direction: 'bullish' | 'bearish'; // Sentiment vs market direction
  whaleTransactions: Array<{
    id: string;
    wallet_id: string;
    side: string;
    amount: number;
    price: number;
    timestamp: string;
  }>;
  rawSignals: Array<{
    id: string;
    signal_type: string;
    title: string;
    content: string;
    source_url: string | null;
    detected_at: string;
    sentiment_score: number | null;
  }>;
  generatedAt: string;
}

interface DivergenceBarProps {
  marketPrice: number;
  sentimentScore: number;
}

function DivergenceBar({ marketPrice, sentimentScore }: DivergenceBarProps) {
  const gap = Math.abs(sentimentScore - marketPrice);
  const isSentimentHigher = sentimentScore > marketPrice;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Market Implied</span>
        <span>AI Sentiment</span>
      </div>
      <div className="flex gap-2 h-8">
        {/* Market Price Bar */}
        <div className="flex-1 relative bg-muted rounded-md overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-blue-500/80 transition-all"
            style={{ width: `${marketPrice}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
            {marketPrice.toFixed(0)}%
          </span>
        </div>
        
        {/* Sentiment Score Bar */}
        <div className="flex-1 relative bg-muted rounded-md overflow-hidden">
          <div 
            className={cn(
              "absolute inset-y-0 left-0 transition-all",
              isSentimentHigher ? "bg-emerald-500/80" : "bg-rose-500/80"
            )}
            style={{ width: `${sentimentScore}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
            {sentimentScore.toFixed(0)}%
          </span>
        </div>
      </div>
      
      {/* Gap indicator */}
      <div className="flex items-center justify-center gap-2">
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
        <span className={cn(
          "text-sm font-bold",
          gap >= 20 ? "text-amber-500" : "text-muted-foreground"
        )}>
          {gap.toFixed(0)}% divergence
        </span>
      </div>
    </div>
  );
}

interface EvidenceCardProps {
  anomaly: Anomaly;
  onViewRawSignals: () => void;
}

function EvidenceCard({ anomaly, onViewRawSignals }: EvidenceCardProps) {
  const bullishSignals = anomaly.rawSignals.filter(s => (s.sentiment_score || 0) > 0.5);
  const bearishSignals = anomaly.rawSignals.filter(s => (s.sentiment_score || 0) < -0.5);
  const largeTxs = anomaly.whaleTransactions.filter(t => t.amount >= 1000); // Large transactions
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {anomaly.platform}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  anomaly.direction === 'bullish' 
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-500 border-rose-500/30"
                )}
              >
                {anomaly.direction === 'bullish' ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {anomaly.direction}
              </Badge>
              <Badge 
                variant="outline" 
                className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {anomaly.divergence.toFixed(0)}% gap
              </Badge>
            </div>
            <CardTitle className="text-base mt-2 line-clamp-2">
              {anomaly.marketTitle}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Divergence Visual */}
        <DivergenceBar 
          marketPrice={anomaly.marketPrice} 
          sentimentScore={anomaly.sentimentScore} 
        />
        
        <Separator />
        
        {/* Evidence Found */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Evidence Found
          </h4>
          
          {/* Whale Activity */}
          {largeTxs.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Fish className="h-3 w-3" />
                Large Transactions ({largeTxs.length})
              </div>
              <div className="space-y-1">
                {largeTxs.slice(0, 3).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between text-xs">
                    <span className="font-mono truncate max-w-[120px]">
                      {tx.wallet_id.slice(0, 8)}...
                    </span>
                    <span className={cn(
                      "font-medium",
                      tx.side === 'buy' ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {tx.side.toUpperCase()} ${tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
                {largeTxs.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{largeTxs.length - 3} more transactions
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Signals Summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-center">
              <p className="text-lg font-bold text-emerald-500">{bullishSignals.length}</p>
              <p className="text-xs text-muted-foreground">Bullish Signals</p>
            </div>
            <div className="p-2 bg-rose-500/10 rounded-lg text-center">
              <p className="text-lg font-bold text-rose-500">{bearishSignals.length}</p>
              <p className="text-xs text-muted-foreground">Bearish Signals</p>
            </div>
          </div>
          
          {/* Recent Signals */}
          {anomaly.rawSignals.length > 0 && (
            <div className="space-y-2">
              {anomaly.rawSignals.slice(0, 2).map(signal => (
                <div key={signal.id} className="p-2 border rounded-lg">
                  <div className="flex items-start gap-2">
                    <Zap className="h-3 w-3 mt-0.5 text-amber-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-1">{signal.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {signal.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={onViewRawSignals}
          >
            <Eye className="h-3 w-3 mr-1" />
            View All Evidence
          </Button>
        </div>
        
        {/* Timestamp */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Detected {format(new Date(anomaly.generatedAt), 'MMM d, h:mm a')}
        </div>
      </CardContent>
    </Card>
  );
}

export function AnomalyScanner() {
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [minDivergence, setMinDivergence] = useState(15);

  // Fetch anomalies by joining markets with outcomes, whale transactions, and signals
  const { data: anomalies = [], isLoading, refetch } = useQuery({
    queryKey: ['anomalies', minDivergence],
    queryFn: async () => {
      // Fetch markets with outcomes
      const { data: markets, error: marketsError } = await supabase
        .from('prediction_markets')
        .select(`
          id, title, platform, category,
          market_outcomes (current_price)
        `)
        .eq('status', 'active')
        .limit(100);

      if (marketsError) throw marketsError;
      if (!markets || markets.length === 0) return [];

      const marketIds = markets.map(m => m.id);

      // Fetch whale transactions for these markets
      const { data: whaleData } = await supabase
        .from('whale_transactions')
        .select('*')
        .in('market_id', marketIds)
        .gte('detected_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
        .order('detected_at', { ascending: false });

      // Fetch market drivers to get related signals
      const { data: drivers } = await supabase
        .from('market_drivers')
        .select('market_id, signal_id, direction, confidence')
        .in('market_id', marketIds);

      const signalIds = (drivers || []).map(d => d.signal_id).filter(Boolean);

      // Fetch raw signals
      const { data: signals } = signalIds.length > 0 
        ? await supabase
            .from('raw_signals')
            .select('*')
            .in('id', signalIds)
        : { data: [] };

      // Fetch KOL sentiment for sentiment aggregation
      const { data: kolSentiment } = await supabase
        .from('kol_sentiment')
        .select('related_markets, sentiment_score, confidence')
        .not('related_markets', 'is', null);

      // Build anomalies
      const anomalyList: Anomaly[] = [];

      for (const market of markets) {
        const outcomes = market.market_outcomes as Array<{ current_price: number | null }>;
        const primaryOutcome = outcomes?.[0];
        const marketPrice = (primaryOutcome?.current_price || 0.5) * 100;

        // Calculate aggregated sentiment from KOL data and drivers
        const marketKolSentiment = (kolSentiment || [])
          .filter(k => k.related_markets?.includes(market.id))
          .map(k => k.sentiment_score || 0);
        
        const marketDrivers = (drivers || []).filter(d => d.market_id === market.id);
        const driverConfidences = marketDrivers.map(d => {
          const score = d.confidence || 0.5;
          return d.direction === 'bullish' ? score : 1 - score;
        });

        // Aggregate all sentiment signals
        const allSentiments = [...marketKolSentiment, ...driverConfidences];
        const avgSentiment = allSentiments.length > 0
          ? (allSentiments.reduce((a, b) => a + b, 0) / allSentiments.length) * 100
          : marketPrice; // Default to market price if no sentiment data

        const divergence = Math.abs(avgSentiment - marketPrice);
        
        // Only include if divergence > threshold
        if (divergence < minDivergence) continue;

        // Get whale transactions for this market
        const marketWhales = (whaleData || [])
          .filter(w => w.market_id === market.id)
          .map(w => ({
            id: w.id,
            wallet_id: w.wallet_id || 'Unknown',
            side: w.side || 'unknown',
            amount: w.amount || 0,
            price: w.price || 0,
            timestamp: w.timestamp || '',
          }));

        // Get raw signals for this market
        const marketSignalIds = marketDrivers.map(d => d.signal_id);
        const marketSignals = (signals || [])
          .filter(s => marketSignalIds.includes(s.id))
          .map(s => ({
            id: s.id,
            signal_type: s.signal_type || 'unknown',
            title: s.title || '',
            content: s.content || '',
            source_url: s.source_url,
            detected_at: s.detected_at || '',
            sentiment_score: s.sentiment_score,
          }));

        anomalyList.push({
          id: market.id,
          marketId: market.id,
          marketTitle: market.title,
          platform: market.platform,
          category: market.category || 'General',
          marketPrice,
          sentimentScore: avgSentiment,
          divergence,
          direction: avgSentiment > marketPrice ? 'bullish' : 'bearish',
          whaleTransactions: marketWhales,
          rawSignals: marketSignals,
          generatedAt: new Date().toISOString(),
        });
      }

      // Sort by divergence descending
      return anomalyList.sort((a, b) => b.divergence - a.divergence);
    },
  });

  const handleViewEvidence = (anomaly: Anomaly) => {
    setSelectedAnomaly(anomaly);
    setShowEvidence(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Anomaly Scanner</h1>
            <p className="text-sm text-muted-foreground">
              Markets where AI sentiment diverges from price ({'>'}15% gap)
            </p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          onClick={() => refetch()}
          disabled={isLoading}
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Anomalies Found</span>
            </div>
            <p className="text-2xl font-bold mt-1">{anomalies.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Bullish Divergence</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {anomalies.filter(a => a.direction === 'bullish').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-500" />
              <span className="text-sm text-muted-foreground">Bearish Divergence</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {anomalies.filter(a => a.direction === 'bearish').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Avg Divergence</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {anomalies.length > 0 
                ? (anomalies.reduce((sum, a) => sum + a.divergence, 0) / anomalies.length).toFixed(0)
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Anomalies Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : anomalies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="font-medium">No significant anomalies detected</p>
            <p className="text-sm text-muted-foreground mt-1">
              All markets are currently aligned with AI sentiment analysis
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pr-4">
            {anomalies.map(anomaly => (
              <EvidenceCard
                key={anomaly.id}
                anomaly={anomaly}
                onViewRawSignals={() => handleViewEvidence(anomaly)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Disclaimer Footer */}
      <div className="p-4 bg-muted/50 rounded-lg border">
        <p className="text-xs text-muted-foreground text-center">
          <strong>AI-Augmented Data Analysis. Not Financial Advice.</strong>{' '}
          Check the 'Raw Signals' tab for source verification.
        </p>
      </div>

      {/* Evidence Drawer */}
      <Sheet open={showEvidence} onOpenChange={setShowEvidence}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Evidence: {selectedAnomaly?.marketTitle}</SheetTitle>
            <SheetDescription>
              Raw signals and whale transactions supporting this analysis
            </SheetDescription>
          </SheetHeader>
          
          {selectedAnomaly && (
            <div className="space-y-6 mt-6">
              {/* Divergence Summary */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <DivergenceBar 
                  marketPrice={selectedAnomaly.marketPrice}
                  sentimentScore={selectedAnomaly.sentimentScore}
                />
              </div>

              {/* Whale Transactions */}
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Fish className="h-4 w-4" />
                  Whale Transactions ({selectedAnomaly.whaleTransactions.length})
                </h3>
                {selectedAnomaly.whaleTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No whale activity in the last 12 hours
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedAnomaly.whaleTransactions.map(tx => (
                      <div key={tx.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm truncate max-w-[200px]">
                            {tx.wallet_id}
                          </span>
                          {tx.amount >= 5000 && (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500">
                              Large
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <Badge className={cn(
                            tx.side === 'buy' 
                              ? "bg-emerald-500/20 text-emerald-500" 
                              : "bg-rose-500/20 text-rose-500"
                          )}>
                            {tx.side.toUpperCase()}
                          </Badge>
                          <span className="font-medium">
                            ${tx.amount.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(tx.timestamp), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Raw Signals */}
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Raw Signals ({selectedAnomaly.rawSignals.length})
                </h3>
                {selectedAnomaly.rawSignals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No signal data available for this market
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedAnomaly.rawSignals.map(signal => (
                      <div key={signal.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <Badge variant="outline" className="text-xs">
                            {signal.signal_type}
                          </Badge>
                          {signal.sentiment_score !== null && (
                            <Badge className={cn(
                              signal.sentiment_score > 0.5
                                ? "bg-emerald-500/20 text-emerald-500"
                                : signal.sentiment_score < -0.5
                                  ? "bg-rose-500/20 text-rose-500"
                                  : "bg-muted text-muted-foreground"
                            )}>
                              {(signal.sentiment_score * 100).toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium mt-2">{signal.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {signal.content}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(signal.detected_at), 'MMM d, h:mm a')}
                          </span>
                          {signal.source_url && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(signal.source_url!, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Source
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
