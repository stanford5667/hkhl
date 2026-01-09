import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfidenceRadial } from "./ConfidenceRadial";
import { SourcesModal } from "./SourcesModal";
import { TickerBadge } from "@/components/ui/TickerBadge";
import { 
  TrendingUp, 
  TrendingDown, 
  ExternalLink, 
  Clock, 
  Zap,
  Link2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export interface AlphaInsight {
  id: string;
  primary_ticker: string;
  direction: 'bullish' | 'bearish';
  confidence: number;
  thesis: string;
  hidden_correlation?: string;
  impact_score: number;
  created_at: string;
  sources: Array<{
    title: string;
    url: string;
    source_name: string;
    published_at?: string;
    category?: string;
  }>;
}

interface AlphaFeedCardProps {
  insight: AlphaInsight;
  index: number;
}

export function AlphaFeedCard({ insight, index }: AlphaFeedCardProps) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  
  const isBullish = insight.direction === 'bullish';
  const timeAgo = formatDistanceToNow(new Date(insight.created_at), { addSuffix: true });

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.4, 
          delay: index * 0.1,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
      >
        <Card className={cn(
          "relative overflow-hidden bg-[#1a1a1a] border-border/30",
          "hover:border-border/60 transition-all duration-300",
          "hover:shadow-xl hover:shadow-black/20"
        )}>
          {/* Accent bar based on direction */}
          <div className={cn(
            "absolute left-0 top-0 bottom-0 w-1",
            isBullish ? "bg-emerald-500" : "bg-rose-500"
          )} />

          <div className="p-4 pl-5">
            <div className="flex items-start gap-4">
              {/* Confidence Radial */}
              <div className="shrink-0">
                <ConfidenceRadial confidence={insight.confidence} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-3">
                {/* Header row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Ticker */}
                    <TickerBadge 
                      ticker={insight.primary_ticker}
                      className="font-mono font-bold text-sm px-2 py-0.5 bg-[#252525] border-border/50 hover:bg-primary/20"
                    />
                    
                    {/* Direction tag */}
                    <Badge 
                      className={cn(
                        "font-bold uppercase tracking-wider text-xs",
                        isBullish 
                          ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" 
                          : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                      )}
                    >
                      {isBullish ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {insight.direction}
                    </Badge>

                    {/* Impact score */}
                    {insight.impact_score >= 7 && (
                      <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        High Impact
                      </Badge>
                    )}
                  </div>

                  {/* Time */}
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    {timeAgo}
                  </span>
                </div>

                {/* Thesis - NotebookLM style */}
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {insight.thesis}
                </p>

                {/* Hidden correlation */}
                {insight.hidden_correlation && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-[#252525] rounded-md p-2">
                    <Link2 className="h-3.5 w-3.5 mt-0.5 text-amber-400 shrink-0" />
                    <span>
                      <span className="text-amber-400 font-medium">Second-order effect:</span>{" "}
                      {insight.hidden_correlation}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSourcesOpen(true)}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    {insight.sources.length} Source{insight.sources.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <SourcesModal 
        open={sourcesOpen}
        onOpenChange={setSourcesOpen}
        sources={insight.sources}
        thesis={insight.thesis}
      />
    </>
  );
}
