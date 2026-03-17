import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, Zap, Globe, Clock, ArrowRight, ChevronRight,
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

  const tickers = theme.tickers || [];

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      className={cn(
        'group w-full text-left rounded-xl border transition-all duration-200',
        'bg-card hover:shadow-lg hover:shadow-primary/5',
        isSelected
          ? 'border-primary/40 ring-1 ring-primary/20 shadow-sm'
          : 'border-border/50 hover:border-border',
      )}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            {isMicro ? (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-primary/30 text-primary bg-primary/5 gap-1">
                <Zap className="h-2.5 w-2.5" />LIVE
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                <Globe className="h-2.5 w-2.5" />MACRO
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">{theme.category}</Badge>
          </div>
          <div className={cn('flex items-center gap-1 text-xs font-semibold', sentimentColor)}>
            {isBullish ? <TrendingUp className="h-3.5 w-3.5" /> : isBearish ? <TrendingDown className="h-3.5 w-3.5" /> : null}
            {isMicro && impactScore ? `${impactScore}/10` : `${theme.impactPercent > 0 ? '+' : ''}${theme.impactPercent.toFixed(1)}%`}
          </div>
        </div>

        {/* Title */}
        <div className="flex items-start gap-3 mb-2">
          <div className={cn('p-2 rounded-lg shrink-0', sentimentBg, sentimentColor)}>
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 pt-0.5">
            {theme.title}
          </h3>
        </div>

        {/* Summary */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {theme.detailedSummary || theme.summary}
        </p>
      </div>

      {/* Tickers Section */}
      {tickers.length > 0 && (
        <div className="border-t border-border/30 px-4 py-2.5 space-y-1.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Related Tickers</span>
            <span className="text-[10px] text-muted-foreground">{tickers.length} total</span>
          </div>
          {tickers.slice(0, 4).map(t => {
            const tickerBullish = t.sentiment === 'bullish' || (t.change != null && t.change > 0);
            const tickerBearish = t.sentiment === 'bearish' || (t.change != null && t.change < 0);
            const tickerColor = tickerBullish ? 'text-emerald-500' : tickerBearish ? 'text-rose-500' : 'text-muted-foreground';
            return (
              <div key={t.symbol} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono font-bold text-foreground shrink-0">{t.symbol}</span>
                  <span className="text-[11px] text-muted-foreground truncate">{t.name}</span>
                </div>
                <div className={cn('flex items-center gap-1 text-[11px] font-semibold shrink-0', tickerColor)}>
                  {tickerBullish ? <TrendingUp className="h-2.5 w-2.5" /> : tickerBearish ? <TrendingDown className="h-2.5 w-2.5" /> : null}
                  {t.change != null ? `${t.change > 0 ? '+' : ''}${t.change.toFixed(1)}%` : t.sentiment}
                </div>
              </div>
            );
          })}
          {tickers.length > 4 && (
            <div className="text-[10px] text-muted-foreground pt-0.5">
              +{tickers.length - 4} more tickers
            </div>
          )}
        </div>
      )}

      {/* Footer CTA */}
      <div className="border-t border-border/30 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isMicro && theme.headlines?.[0] && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              <span>{theme.headlines[0].source}</span>
              <span className="opacity-50">·</span>
              <span>{theme.headlines[0].time}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          Deep Dive <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </motion.button>
  );
}
