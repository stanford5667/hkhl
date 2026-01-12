import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FlaskConical, TrendingUp, TrendingDown, 
  AlertCircle, Zap, ArrowRight, Activity 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface StudySignal {
  ticker: string;
  signal: 'oversold' | 'overbought' | 'golden_cross' | 'death_cross' | 'high_volume' | 'trending';
  value: number;
  label: string;
}

interface StudiesInsightsCardProps {
  portfolioTickers?: string[];
}

export function StudiesInsightsCard({ portfolioTickers = [] }: StudiesInsightsCardProps) {
  const [signals, setSignals] = useState<StudySignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading - in production this would fetch real study data
    const timer = setTimeout(() => {
      // Mock signals based on portfolio tickers or defaults
      const mockSignals: StudySignal[] = [
        { ticker: 'AAPL', signal: 'trending', value: 85, label: 'Strong Trend' },
        { ticker: 'TSLA', signal: 'oversold', value: 28, label: 'RSI 28' },
        { ticker: 'NVDA', signal: 'high_volume', value: 2.5, label: '2.5x Volume' },
        { ticker: 'MSFT', signal: 'golden_cross', value: 0, label: 'Golden Cross' },
      ];
      setSignals(mockSignals);
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [portfolioTickers]);

  const getSignalStyles = (signal: StudySignal['signal']) => {
    switch (signal) {
      case 'oversold': 
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' };
      case 'overbought': 
        return { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/30' };
      case 'golden_cross': 
        return { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' };
      case 'death_cross': 
        return { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' };
      case 'high_volume': 
        return { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' };
      case 'trending': 
        return { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-500/30' };
      default:
        return { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };
    }
  };

  const getSignalIcon = (signal: StudySignal['signal']) => {
    switch (signal) {
      case 'oversold': return <TrendingUp className="h-3.5 w-3.5" />;
      case 'overbought': return <TrendingDown className="h-3.5 w-3.5" />;
      case 'golden_cross': return <Activity className="h-3.5 w-3.5" />;
      case 'death_cross': return <AlertCircle className="h-3.5 w-3.5" />;
      case 'high_volume': return <Zap className="h-3.5 w-3.5" />;
      case 'trending': return <TrendingUp className="h-3.5 w-3.5" />;
      default: return <Activity className="h-3.5 w-3.5" />;
    }
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-violet-500" />
            Market Signals
          </CardTitle>
          <Link to="/quant-lab">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No signals detected. Add holdings to see insights.
          </div>
        ) : (
          <div className="space-y-2">
            {signals.map((signal, i) => {
              const styles = getSignalStyles(signal.signal);
              return (
                <Link 
                  key={i} 
                  to={`/quant-lab?ticker=${signal.ticker}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium text-foreground">{signal.ticker}</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "gap-1 text-xs",
                        styles.bg, styles.text, styles.border
                      )}
                    >
                      {getSignalIcon(signal.signal)}
                      {signal.label}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
