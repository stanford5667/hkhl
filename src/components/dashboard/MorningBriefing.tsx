import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sun, TrendingUp, TrendingDown, Sparkles, ChevronRight, X, Crown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface BriefingData {
  marketMood: 'bullish' | 'bearish' | 'neutral';
  topMover: { ticker: string; change: number; reason: string };
  portfolioAlert?: { ticker: string; message: string };
  aiInsight: string;
  opportunities: Array<{ ticker: string; action: string; reason: string }>;
}

export function MorningBriefing() {
  const [isVisible, setIsVisible] = useState(false);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user already dismissed today
    const lastDismissed = localStorage.getItem('briefing-dismissed');
    const today = new Date().toDateString();
    if (lastDismissed === today) {
      return;
    }

    // Check if it's morning (before noon)
    const hour = new Date().getHours();
    if (hour >= 12) {
      return; // Only show morning briefing before noon
    }

    fetchBriefing();
  }, []);

  const fetchBriefing = async () => {
    try {
      const { data } = await supabase.functions.invoke('ai-daily-briefing');
      if (data) {
        setBriefing(data);
        setIsVisible(true);
      }
    } catch (e) {
      // Fallback data
      setBriefing({
        marketMood: 'bullish',
        topMover: { ticker: 'NVDA', change: 5.2, reason: 'AI chip demand surge' },
        aiInsight: 'Tech sector showing strength. Consider reviewing momentum plays.',
        opportunities: [
          { ticker: 'PLTR', action: 'Watch', reason: 'Breaking out of consolidation' },
          { ticker: 'COIN', action: 'Alert', reason: 'Crypto correlation play' },
        ],
      });
      setIsVisible(true);
    }
    setIsLoading(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('briefing-dismissed', new Date().toDateString());
    setIsVisible(false);
  };

  if (!isVisible || isLoading || !briefing) return null;

  const moodColors = {
    bullish: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    bearish: 'from-red-500/20 to-rose-500/20 border-red-500/30',
    neutral: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6"
      >
        <Card className={`border bg-gradient-to-r ${moodColors[briefing.marketMood]} overflow-hidden`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Sun className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">Good morning! Here's your daily briefing</span>
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {briefing.aiInsight}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Mover */}
              <div className="p-3 bg-background/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Top Mover</p>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{briefing.topMover.ticker}</span>
                  <span className={briefing.topMover.change > 0 ? 'text-green-500' : 'text-red-500'}>
                    {briefing.topMover.change > 0 ? '+' : ''}{briefing.topMover.change}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{briefing.topMover.reason}</p>
              </div>
              
              {/* Opportunities (Premium Tease) */}
              <div className="p-3 bg-background/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Today's Opportunities</p>
                  <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600">
                    <Crown className="h-3 w-3 mr-1" />
                    2 more with Pro
                  </Badge>
                </div>
                <div className="space-y-1">
                  {briefing.opportunities.slice(0, 2).map((opp) => (
                    <div key={opp.ticker} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{opp.ticker}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
