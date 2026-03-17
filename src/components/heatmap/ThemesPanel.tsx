import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Zap, Globe, Clock, ExternalLink } from 'lucide-react';
import type { MarketTheme } from '@/data/marketThemes';
import type { ThemeFilter } from '@/stores/heatmapStore';

interface Props {
  themes: MarketTheme[];
  selectedTheme: MarketTheme | null;
  onSelectTheme: (theme: MarketTheme) => void;
  themeFilter: ThemeFilter;
  onFilterChange: (filter: ThemeFilter) => void;
}

function ImpactBadge({ score }: { score: number }) {
  const color = score >= 8 ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                score >= 6 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                'bg-muted/50 text-muted-foreground border-border/30';
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0 h-4 rounded-full border', color)}>
      <Zap className="h-2.5 w-2.5" />
      {score}/10
    </span>
  );
}

function ThemeCard({ theme, isSelected, onClick, isMicro }: {
  theme: MarketTheme;
  isSelected: boolean;
  onClick: () => void;
  isMicro: boolean;
}) {
  const Icon = theme.icon;
  const isBullish = theme.sentimentScore > 0.6;
  const isBearish = theme.sentimentScore < 0.4;
  const microData = (theme as any);

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all duration-200',
        isSelected
          ? 'bg-primary/10 border-primary/40 shadow-sm'
          : 'bg-card/30 border-border/30 hover:border-border/60 hover:bg-card/60',
        isMicro && !isSelected && 'border-l-2 border-l-amber-500/50'
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium text-foreground leading-tight">{theme.title}</span>
            {isBullish ? (
              <TrendingUp className="h-3 w-3 text-emerald-400 flex-shrink-0" />
            ) : isBearish ? (
              <TrendingDown className="h-3 w-3 text-rose-400 flex-shrink-0" />
            ) : (
              <Minus className="h-3 w-3 text-amber-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{theme.summary}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {isMicro ? (
              <>
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-amber-500/30 text-amber-400 bg-amber-500/5">
                  <Zap className="h-2 w-2 mr-0.5" />
                  LIVE
                </Badge>
                <ImpactBadge score={microData._impactScore || 5} />
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">{theme.category}</Badge>
              </>
            ) : (
              <>
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-primary/5 text-primary/70 border-primary/20">
                  <Globe className="h-2 w-2 mr-0.5" />
                  MACRO
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{theme.category}</Badge>
              </>
            )}
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
          {/* Show source for micro-themes */}
          {isMicro && theme.headlines?.[0] && (
            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              <span>{theme.headlines[0].source}</span>
              <span>·</span>
              <span>{theme.headlines[0].time}</span>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

export function ThemesPanel({ themes, selectedTheme, onSelectTheme, themeFilter, onFilterChange }: Props) {
  const macroThemes = themes.filter(t => !(t as any)._micro);
  const microThemes = themes.filter(t => (t as any)._micro);

  const filteredThemes = themeFilter === 'macro' ? macroThemes :
                         themeFilter === 'news' ? microThemes :
                         // Sort: news-driven first (by impact), then macro
                         [...microThemes, ...macroThemes];

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">Active Themes</h2>
        <div className="flex items-center gap-1">
          {microThemes.length > 0 && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-amber-500/30 text-amber-400">
              {microThemes.length} live
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">{themes.length}</Badge>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 p-0.5 bg-muted/30 rounded-lg">
        {(['all', 'news', 'macro'] as ThemeFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={cn(
              'flex-1 text-[10px] sm:text-xs font-medium py-1 px-2 rounded-md transition-all',
              themeFilter === f
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {f === 'all' ? 'All' : f === 'news' ? '⚡ Live News' : '🌍 Macro'}
          </button>
        ))}
      </div>

      {/* Horizontal scroll on mobile */}
      <div className="lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 snap-x snap-mandatory scrollbar-hide">
          {filteredThemes.map((theme) => {
            const isSelected = selectedTheme?.id === theme.id;
            const isMicro = !!(theme as any)._micro;
            const Icon = theme.icon;
            const isBullish = theme.sentimentScore > 0.6;
            const isBearish = theme.sentimentScore < 0.4;

            return (
              <button
                key={theme.id}
                onClick={() => onSelectTheme(theme)}
                className={cn(
                  'flex-shrink-0 snap-start text-left p-2.5 rounded-lg border transition-all duration-200 w-[220px]',
                  isSelected
                    ? 'bg-primary/10 border-primary/40 shadow-sm'
                    : 'bg-card/30 border-border/30 active:bg-card/60',
                  isMicro && !isSelected && 'border-l-2 border-l-amber-500/50'
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
                  {isMicro && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 border-amber-500/30 text-amber-400 bg-amber-500/5">
                      LIVE
                    </Badge>
                  )}
                  <span className="text-xs font-medium text-foreground truncate flex-1">{theme.title}</span>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{theme.summary}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">{theme.category}</Badge>
                  {isMicro && <ImpactBadge score={(theme as any)._impactScore || 5} />}
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
        <ScrollArea className="h-[450px] pr-2">
          <div className="space-y-2">
            {filteredThemes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isSelected={selectedTheme?.id === theme.id}
                onClick={() => onSelectTheme(theme)}
                isMicro={!!(theme as any)._micro}
              />
            ))}
            {filteredThemes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {themeFilter === 'news' ? 'No live news themes yet. Click refresh to generate.' : 'No themes available.'}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
