import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import {
  Newspaper,
  Target,
  Sparkles,
  Bell,
  TrendingUp,
  TrendingDown,
  Eye,
  X,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FeedItemType = "news" | "opportunity" | "whale" | "insight" | "alert" | "market_move";

export interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  summary: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  urgency?: "low" | "medium" | "high";
}

interface UnifiedFeedCardProps {
  item: FeedItem;
  isSelected: boolean;
  onSelect: () => void;
  onAction: (action: string) => void;
  onDismiss?: () => void;
  onWatch?: () => void;
}

const typeConfig: Record<FeedItemType, { icon: React.ElementType; color: string; bgColor: string }> = {
  news: { icon: Newspaper, color: "text-rose-500", bgColor: "bg-rose-500/10" },
  opportunity: { icon: Target, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  whale: { icon: TrendingUp, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  insight: { icon: Sparkles, color: "text-violet-500", bgColor: "bg-violet-500/10" },
  alert: { icon: Bell, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  market_move: { icon: TrendingUp, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
};

const actionsByType: Record<FeedItemType, string[]> = {
  news: ["View", "Watch", "Ask AI"],
  opportunity: ["Analyze", "Execute", "Dismiss"],
  whale: ["Follow", "Watch", "Details"],
  insight: ["Trade Idea", "Ask Why", "Dismiss"],
  alert: ["Review", "Dismiss", "Configure"],
  market_move: ["Analyze", "Watch", "Trade"],
};

export function UnifiedFeedCard({
  item,
  isSelected,
  onSelect,
  onAction,
  onDismiss,
  onWatch,
}: UnifiedFeedCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5]);
  const scale = useTransform(x, [-100, 0, 100], [0.95, 1, 0.95]);

  const config = typeConfig[item.type];
  const Icon = config.icon;
  const actions = actionsByType[item.type];

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    if (info.offset.x < -100 && onDismiss) {
      onDismiss();
    } else if (info.offset.x > 100 && onWatch) {
      onWatch();
    }
  };

  const timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: false });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      style={{ opacity, scale }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onClick={() => !isDragging && onSelect()}
      className={cn(
        "relative p-4 rounded-lg border cursor-pointer transition-all",
        "hover:bg-muted/50",
        isSelected && "ring-2 ring-primary bg-muted/50 border-primary/50",
        item.urgency === "high" && "border-l-4 border-l-rose-500"
      )}
    >
      {/* Swipe Indicators */}
      <div className="absolute inset-y-0 left-0 w-16 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <X className="h-6 w-6 text-rose-500" />
      </div>
      <div className="absolute inset-y-0 right-0 w-16 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <Eye className="h-6 w-6 text-emerald-500" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md", config.bgColor)}>
            <Icon className={cn("h-4 w-4", config.color)} />
          </div>
          <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo}</span>
      </div>

      {/* Summary */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{item.summary}</p>

      {/* Metadata Badge */}
      {item.metadata?.badge && (
        <div className="mb-3">
          <Badge variant="secondary" className="text-xs">
            {String(item.metadata.badge)}
          </Badge>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {actions.slice(0, 3).map((action, i) => (
          <Button
            key={action}
            variant={i === 0 ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onAction(action.toLowerCase().replace(" ", "_"));
            }}
          >
            {action}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs ml-auto"
          onClick={(e) => {
            e.stopPropagation();
            onAction("ask_ai");
          }}
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          Ask AI
        </Button>
      </div>
    </motion.div>
  );
}
