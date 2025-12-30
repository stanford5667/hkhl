import { Sparkles, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

const insights = [
  { text: "TechCo grew revenue 12% vs sector's 8% average", highlight: "TechCo", metric: "+12%" },
  { text: "Midwest Manufacturing margins expanded 200bps QoQ", highlight: "Midwest", metric: "+2%" },
  { text: "Healthcare portfolio outperforming benchmark by 15%", highlight: "Healthcare", metric: "+15%" },
  { text: "Beta Inc's EBITDA trending above model projections", highlight: "Beta Inc", metric: "↑ trend" },
  { text: "3 companies hit covenant milestones this quarter", highlight: "3 companies", metric: "✓ hit" },
];

export function AIInsightCard() {
  const [currentInsight, setCurrentInsight] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshInsight = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setCurrentInsight((prev) => (prev + 1) % insights.length);
      setIsRefreshing(false);
    }, 500);
  };

  const insight = insights[currentInsight];

  return (
    <Card className="relative overflow-hidden border-premium/30 bg-gradient-to-br from-premium/10 to-premium/5 p-5">
      {/* Purple accent border */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-premium" />
      
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-premium/20">
          <Sparkles className="h-5 w-5 text-premium" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-premium uppercase tracking-wider">AI Insight</span>
            <span className="text-xs text-muted-foreground">• Daily</span>
          </div>
          
          <p className={`text-foreground leading-relaxed transition-opacity duration-300 ${isRefreshing ? 'opacity-0' : 'opacity-100'}`}>
            {insight.text}
          </p>
          
          <div className="flex items-center gap-3 mt-3">
            <span className="text-sm font-semibold text-success">{insight.metric}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground hover:text-premium ml-auto"
              onClick={refreshInsight}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              New insight
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}