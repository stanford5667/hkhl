import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, Zap, Globe, Clock, ArrowRight,
} from 'lucide-react';
import type { MarketTheme } from '@/data/marketThemes';

interface Props {
  theme: MarketTheme;
  isSelected: boolean;
  onClick: () => void;
}

export function ThemeCard({ theme, isSelected, onClick }: Props) {
  const isMicro = !!(theme as any)._micro;
  const isBullish = theme.sentimentScore > 0.6;
  const isBearish = theme.sentimentScore < 0.4;
  const impactScore = (theme as any)._impactScore;
  const Icon = theme.icon;

  const sentimentColor = isBullish
    ? 'text-emerald-500'
    : isBearish
    ? 'text-rose-500'
    : 'text-amber-500';

  const sentimentBg = isBullish
    ? 'bg-emerald-500/10'
    : isBearish
    ? 'bg-rose-500/10'
    : 'bg-amber-500/10';

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      className={cn(
        'group w-full text-left rounded-xl border p-4 transition-all duration-200',
        'bg-card hover:shadow-md',
        isSelected
          ? 'border-primary/40 ring-1 ring-primary/20 shadow-sm'
          : 'border-border/50 hover:border-border',
      )}
    >
      {/* Top row: type badge + sentiment */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          {isMicro ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-primary/30 text-primary bg-primary/5 gap-1">
              <Zap className="h-2.5 w-2.5" />
              LIVE
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-1">
              <Globe className="h-2.5 w-2.5" />
              MACRO
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
            {theme.category}
          </Badge>
        </div>
        <div className={cn('flex items-center gap-1 text-xs font-semibold', sentimentColor)}>
          {isBullish ? <TrendingUp className="h-3.5 w-3.5" /> : isBearish ? <TrendingDown className="h-3.5 w-3.5" /> : null}
          {theme.impactPercent > 0 ? '+' : ''}{theme.impactPercent.toFixed(1)}%
        </div>
      </div>

      {/* Title + Icon */}
      <div className="flex items-start gap-3 mb-2">
        <div className={cn('p-2 rounded-lg shrink-0', sentimentBg, sentimentColor)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
            {theme.title}
          </h3>
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-3">
        {theme.summary}
      </p>

      {/* Bottom row: tickers + impact + source */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {theme.tickers && theme.tickers.length > 0 && (
            <div className="flex items-center gap-1">
              {theme.tickers.slice(0, 3).map(t => (
                <span key={t.symbol} className="text-[10px] font-mono font-medium text-foreground bg-muted/50 rounded px-1 py-0.5">
                  {t.symbol}
                </span>
              ))}
              {theme.tickers.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{theme.tickers.length - 3}</span>
              )}
            </div>
          )}
          {isMicro && impactScore && (
            <span className="text-[10px] font-semibold text-muted-foreground">
              Impact {impactScore}/10
            </span>
          )}
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Source attribution for live themes */}
      {isMicro && theme.headlines?.[0] && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/30 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          <span>{theme.headlines[0].source}</span>
          <span className="opacity-50">·</span>
          <span>{theme.headlines[0].time}</span>
        </div>
      )}
    </motion.button>
  );
}
