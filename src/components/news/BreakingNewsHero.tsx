import { AlertTriangle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { NewsArticle } from "@/hooks/useNewsIntelligence";

interface BreakingNewsHeroProps {
  article: NewsArticle;
  onSelect: (article: NewsArticle) => void;
  onDismiss?: () => void;
}

export function BreakingNewsHero({ article, onSelect, onDismiss }: BreakingNewsHeroProps) {
  return (
    <Card className="bg-gradient-to-r from-rose-950/50 to-slate-900/80 border-rose-500/30 backdrop-blur-sm animate-fade-in relative">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-3 rounded-lg bg-rose-500/20 animate-pulse">
          <AlertTriangle className="h-6 w-6 text-rose-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="destructive" className="text-xs uppercase tracking-wider">
              Breaking
            </Badge>
            <span className="text-xs text-rose-400">
              {formatDistanceToNow(new Date(article.detected_at), { addSuffix: true })}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white truncate">{article.title}</h3>
          {article.description && (
            <p className="text-sm text-slate-400 line-clamp-1 mt-1">{article.description}</p>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
          onClick={() => onSelect(article)}
        >
          View Details
        </Button>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 text-slate-500 hover:text-white"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
