import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MarketTheme } from '@/data/marketThemes';

interface Props {
  themes: MarketTheme[];
  selectedTheme: MarketTheme | null;
  onSelectTheme: (theme: MarketTheme) => void;
}

export function ThemesPanel({ themes, selectedTheme, onSelectTheme }: Props) {
  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">Active Themes</h2>
        <Badge variant="outline" className="text-xs">{themes.length}</Badge>
      </div>

      {/* Horizontal scroll on mobile, vertical scroll on desktop */}
      <div className="lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 snap-x snap-mandatory scrollbar-hide">
          {themes.map((theme) => {
            const isSelected = selectedTheme?.id === theme.id;
            const Icon = theme.icon;
            const isBullish = theme.sentimentScore > 0.6;
            const isBearish = theme.sentimentScore < 0.4;

            return (
              <button
                key={theme.id}
                onClick={() => onSelectTheme(theme)}
                className={cn(
                  'flex-shrink-0 snap-start text-left p-2.5 rounded-lg border transition-all duration-200 w-[200px]',
                  isSelected
                    ? 'bg-primary/10 border-primary/40 shadow-sm'
                    : 'bg-card/30 border-border/30 active:bg-card/60'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn(
                    'p-1 rounded-md',
                    isBullish ? 'bg-emerald-500/10 text-emerald-400' :
                    isBearish ? 'bg-rose-500/10 text-rose-400' :
                    'bg-amber-500/10 text-amber-400'
                  )}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-xs font-medium text-foreground truncate">{theme.title}</span>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{theme.summary}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">{theme.category}</Badge>
                  <span className={cn(
                    'text-[10px] font-medium',
                    theme.impactPercent > 0 ? 'text-emerald-400' : theme.impactPercent < 0 ? 'text-rose-400' : 'text-muted-foreground'
                  )}>
                    {theme.impactPercent > 0 ? '+' : ''}{theme.impactPercent.toFixed(1)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vertical scroll list for desktop */}
      <div className="hidden lg:block">
        <ScrollArea className="h-[400px] pr-2">
          <div className="space-y-2">
            {themes.map((theme, i) => {
              const isSelected = selectedTheme?.id === theme.id;
              const Icon = theme.icon;
              const isBullish = theme.sentimentScore > 0.6;
              const isBearish = theme.sentimentScore < 0.4;

              return (
                <motion.button
                  key={theme.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => onSelectTheme(theme)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-all duration-200',
                    isSelected
                      ? 'bg-primary/10 border-primary/40 shadow-sm'
                      : 'bg-card/30 border-border/30 hover:border-border/60 hover:bg-card/60'
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={cn(
                      'p-1.5 rounded-md mt-0.5',
                      isBullish ? 'bg-emerald-500/10 text-emerald-400' :
                      isBearish ? 'bg-rose-500/10 text-rose-400' :
                      'bg-amber-500/10 text-amber-400'
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{theme.title}</span>
                        {isBullish ? (
                          <TrendingUp className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                        ) : isBearish ? (
                          <TrendingDown className="h-3 w-3 text-rose-400 flex-shrink-0" />
                        ) : (
                          <Minus className="h-3 w-3 text-amber-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{theme.summary}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{theme.category}</Badge>
                        <span className={cn(
                          'text-[10px] font-medium',
                          theme.impactPercent > 0 ? 'text-emerald-400' : theme.impactPercent < 0 ? 'text-rose-400' : 'text-muted-foreground'
                        )}>
                          {theme.impactPercent > 0 ? '+' : ''}{theme.impactPercent.toFixed(1)}%
                        </span>
                        {theme.tickers && theme.tickers.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">{theme.tickers.length} tickers</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
