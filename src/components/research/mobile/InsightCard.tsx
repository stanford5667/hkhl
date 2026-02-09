import { cn } from '@/lib/utils';
import { ChevronDown, Sparkles, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

export interface InsightData {
  id: string;
  title: string;
  summary: string;
  confidence?: number;
  sentiment?: 'bullish' | 'bearish' | 'neutral' | 'caution';
  details?: string;
  source?: string;
  timestamp?: string;
}

interface InsightCardProps {
  insight: InsightData;
  defaultExpanded?: boolean;
  onExpand?: (insight: InsightData) => void;
}

const sentimentConfig = {
  bullish: {
    icon: TrendingUp,
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-500',
    borderColor: 'border-emerald-500/30',
  },
  bearish: {
    icon: TrendingDown,
    bgColor: 'bg-destructive/10',
    textColor: 'text-destructive',
    borderColor: 'border-destructive/30',
  },
  neutral: {
    icon: Sparkles,
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/30',
  },
  caution: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-500/30',
  },
};

export function InsightCard({ insight, defaultExpanded = false, onExpand }: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const sentiment = insight.sentiment || 'neutral';
  const config = sentimentConfig[sentiment];
  const SentimentIcon = config.icon;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      onExpand?.(insight);
    }
  };

  return (
    <motion.div
      className={cn(
        "rounded-xl border transition-all overflow-hidden",
        "bg-card",
        config.borderColor
      )}
      layout
    >
      {/* Collapsed View - Always Visible */}
      <button
        onClick={handleToggle}
        className="w-full p-4 text-left active:bg-accent/50 touch-manipulation"
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left: Icon + Content */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={cn("p-2 rounded-lg shrink-0", config.bgColor)}>
              <SentimentIcon className={cn("h-4 w-4", config.textColor)} />
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-foreground truncate">
                  {insight.title}
                </h4>
                {insight.confidence && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-5 shrink-0",
                      config.bgColor,
                      config.textColor
                    )}
                  >
                    {insight.confidence}%
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {insight.summary}
              </p>
            </div>
          </div>

          {/* Right: Expand Icon */}
          <ChevronDown className={cn(
            "h-5 w-5 text-muted-foreground shrink-0 transition-transform",
            isExpanded && "rotate-180"
          )} />
        </div>
      </button>

      {/* Expanded View */}
      <AnimatePresence>
        {isExpanded && insight.details && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 pt-0">
              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-sm text-foreground leading-relaxed">
                  {insight.details}
                </p>
                
                {(insight.source || insight.timestamp) && (
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    {insight.source && <span>Source: {insight.source}</span>}
                    {insight.timestamp && <span>{insight.timestamp}</span>}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface InsightsDeckProps {
  insights: InsightData[];
  onInsightExpand?: (insight: InsightData) => void;
}

export function InsightsDeck({ insights, onInsightExpand }: InsightsDeckProps) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
        AI Insights
      </h3>
      <div className="space-y-2">
        {insights.map((insight, index) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <InsightCard 
              insight={insight} 
              onExpand={onInsightExpand}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
