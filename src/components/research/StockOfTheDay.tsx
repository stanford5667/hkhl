import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, TrendingUp, TrendingDown, ArrowRight, 
  Brain, Lightbulb, Target 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface StockPick {
  ticker: string;
  name: string;
  price: number;
  change: number;
  reason: string;
  catalyst: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

// Curated picks with AI-generated reasoning
const DAILY_PICKS: StockPick[] = [
  { ticker: 'NVDA', name: 'NVIDIA Corporation', price: 0, change: 0, reason: 'AI infrastructure leader with dominant GPU market share. Data center revenue accelerating as hyperscalers invest heavily.', catalyst: 'Upcoming earnings report & new Blackwell chips', sentiment: 'bullish', confidence: 85 },
  { ticker: 'AAPL', name: 'Apple Inc.', price: 0, change: 0, reason: 'Services revenue hitting all-time highs while Vision Pro creates new growth vertical. Strong ecosystem lock-in.', catalyst: 'iPhone 16 cycle momentum', sentiment: 'bullish', confidence: 78 },
  { ticker: 'MSFT', name: 'Microsoft Corporation', price: 0, change: 0, reason: 'Copilot integration across enterprise suite driving subscription upgrades. Azure maintaining cloud leadership.', catalyst: 'AI monetization acceleration', sentiment: 'bullish', confidence: 82 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', price: 0, change: 0, reason: 'Search advertising resilience plus Gemini AI integration. YouTube Shorts gaining TikTok market share.', catalyst: 'Cloud AI services expansion', sentiment: 'bullish', confidence: 75 },
  { ticker: 'AMZN', name: 'Amazon.com, Inc.', price: 0, change: 0, reason: 'AWS margins expanding while retail logistics efficiency improves. Prime membership at record highs.', catalyst: 'Ad revenue growth outpacing expectations', sentiment: 'bullish', confidence: 80 },
  { ticker: 'META', name: 'Meta Platforms', price: 0, change: 0, reason: 'Reels monetization closing gap with TikTok. Reality Labs losses narrowing while AI spending shows ROI.', catalyst: 'Efficiency gains boosting margins', sentiment: 'bullish', confidence: 77 },
  { ticker: 'TSLA', name: 'Tesla, Inc.', price: 0, change: 0, reason: 'Energy storage business scaling rapidly. FSD technology advancing toward regulatory approval windows.', catalyst: 'Robotaxi announcement timeline', sentiment: 'neutral', confidence: 65 },
];

export function StockOfTheDay() {
  const navigate = useNavigate();
  const [pick, setPick] = useState<StockPick | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStockOfTheDay = async () => {
      try {
        // Get a deterministic pick based on day of year
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
        const pickIndex = dayOfYear % DAILY_PICKS.length;
        const selectedPick = DAILY_PICKS[pickIndex];

        // Fetch live price data
        const { data } = await supabase
          .from('asset_universe')
          .select('ticker, name, last_close, change_percent_1d')
          .eq('ticker', selectedPick.ticker)
          .maybeSingle();

        if (data) {
          setPick({
            ...selectedPick,
            name: data.name || selectedPick.name,
            price: data.last_close ?? 0,
            change: data.change_percent_1d ?? 0,
          });
        } else {
          setPick(selectedPick);
        }
      } catch (error) {
        console.error('Error fetching stock of the day:', error);
        setPick(DAILY_PICKS[0]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStockOfTheDay();
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-md border border-border/40 bg-card p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-20 w-full rounded" />
      </div>
    );
  }

  if (!pick) return null;

  const isPositive = pick.change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-md border border-border/40 bg-card p-6 overflow-hidden group shadow-[0_1px_2px_hsl(var(--foreground)/0.02)]"
    >
      {/* Header */}
      <div className="relative flex items-center justify-between mb-5 pb-4 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[11px] font-semibold text-foreground uppercase tracking-[0.08em]">
            Stock of the Day
          </h3>
          <span className="hidden md:inline text-[11px] text-muted-foreground">
            AI-powered spotlight pick
          </span>
        </div>
        <Badge 
          variant="outline" 
          className="text-[10px] font-normal border-border/50 text-muted-foreground tabular-nums"
        >
          <Brain className="h-2.5 w-2.5 mr-1" />
          {pick.confidence}% confidence
        </Badge>
      </div>

      {/* Stock Info */}
      <div className="relative flex items-start justify-between mb-5">
        <div>
          <button
            onClick={() => navigate(`/stock/${pick.ticker}`)}
            className="text-xl font-semibold tracking-tight text-foreground hover:text-primary transition-colors"
          >
            {pick.ticker}
          </button>
          <p className="text-xs text-muted-foreground">{pick.name}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold tracking-tight text-foreground tabular-nums">
            ${pick.price > 0 ? pick.price.toFixed(2) : '—'}
          </div>
          <div className={cn(
            "flex items-center justify-end gap-1 text-xs font-medium tabular-nums",
            isPositive ? "text-success" : "text-destructive"
          )}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? '+' : ''}{pick.change.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* AI Reasoning */}
      <div className="relative space-y-2.5 mb-6">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <p className="leading-relaxed">{pick.reason}</p>
        </div>
        <div className="flex items-start gap-2 text-xs text-foreground/80">
          <Target className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p className="font-medium">{pick.catalyst}</p>
        </div>
      </div>

      {/* CTA */}
      <Button
        onClick={() => navigate(`/stock/${pick.ticker}`)}
        variant="outline"
        className="w-full border-border/50 hover:bg-muted/40 transition-colors"
        size="sm"
      >
        <span>View Full Analysis</span>
        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
      </Button>

    </motion.div>
  );
}
