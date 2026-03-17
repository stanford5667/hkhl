import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowRight, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { THEME_TICKERS } from '@/hooks/useInvestmentHeatmap';

// Top global themes to feature — curated for the research page
const FEATURED_THEMES = [
  { country: 'US', flag: '🇺🇸', name: 'United States', theme: 'AI & Tech Leadership', sentiment: 'bullish' as const, intensity: 88, tickers: THEME_TICKERS['AI & Machine Learning'] || THEME_TICKERS['Technology'] },
  { country: 'CN', flag: '🇨🇳', name: 'China', theme: 'US-China Trade Tensions', sentiment: 'bearish' as const, intensity: 70, tickers: THEME_TICKERS['US-China Trade Tensions'] },
  { country: 'JP', flag: '🇯🇵', name: 'Japan', theme: 'Yen Weakness & Governance Reform', sentiment: 'bullish' as const, intensity: 68, tickers: THEME_TICKERS['Yen Weakness & Corporate Governance Reform'] },
  { country: 'IR', flag: '🇮🇷', name: 'Iran', theme: 'Middle East Conflict & Sanctions', sentiment: 'bearish' as const, intensity: 85, tickers: THEME_TICKERS['Middle East Conflict & Sanctions'] },
  { country: 'IN', flag: '🇮🇳', name: 'India', theme: 'Demographic Dividend & Manufacturing', sentiment: 'bullish' as const, intensity: 72, tickers: THEME_TICKERS['Demographic Dividend & Manufacturing Shift'] },
  { country: 'UA', flag: '🇺🇦', name: 'Ukraine', theme: 'War & Reconstruction Demand', sentiment: 'bearish' as const, intensity: 90, tickers: THEME_TICKERS['War & Reconstruction Demand'] },
  { country: 'BR', flag: '🇧🇷', name: 'Brazil', theme: 'Agribusiness & Commodity Supercycle', sentiment: 'bullish' as const, intensity: 58, tickers: THEME_TICKERS['Agribusiness & Commodity Supercycle'] },
  { country: 'DE', flag: '🇩🇪', name: 'Germany', theme: 'EU Energy Transition', sentiment: 'neutral' as const, intensity: 50, tickers: THEME_TICKERS['EU Industrial Policy & Energy Transition'] },
];

const SENTIMENT_STYLES: Record<string, { text: string; bg: string; icon: typeof TrendingUp }> = {
  bullish: { text: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: TrendingUp },
  bearish: { text: 'text-rose-500', bg: 'bg-rose-500/10', icon: TrendingDown },
  neutral: { text: 'text-amber-500', bg: 'bg-amber-500/10', icon: Minus },
  emerging: { text: 'text-primary', bg: 'bg-primary/10', icon: Zap },
};

export function GlobalThemesWidget() {
  const navigate = useNavigate();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const themes = useMemo(() => FEATURED_THEMES, []);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 sm:p-1.5 rounded-md bg-primary/10 border border-primary/20">
            <Globe className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-xs sm:text-base font-mono font-semibold text-foreground uppercase tracking-wide">
              Global Investment Themes
            </h2>
            <p className="text-[9px] sm:text-[10px] font-mono text-muted-foreground hidden sm:block">
              Live geopolitical & macro themes driving markets
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/investment-heatmap')}
          className="inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-wide rounded-lg transition-all bg-[hsl(175_80%_45%)] text-background hover:bg-[hsl(175_80%_50%)] shadow-[0_0_16px_hsl(175_80%_45%/0.4)] hover:shadow-[0_0_24px_hsl(175_80%_45%/0.6)] text-[10px] sm:text-[11px] px-3 sm:px-5 py-2 sm:py-2.5"
        >
          <span className="hidden sm:inline">Open Full Map</span>
          <span className="sm:hidden">Map</span>
          <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </button>
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
        {themes.map((item, idx) => {
          const style = SENTIMENT_STYLES[item.sentiment] || SENTIMENT_STYLES.neutral;
          const SentimentIcon = style.icon;
          const isHovered = hoveredIdx === idx;
          const tickers = item.tickers || [];

          return (
            <button
              key={item.country}
              onClick={() => navigate('/investment-heatmap')}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={cn(
                'relative text-left p-3 sm:p-3.5 rounded-xl border transition-all duration-200 cursor-pointer group/card',
                'bg-card/80 backdrop-blur-sm',
                isHovered
                  ? 'border-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.15)] scale-[1.02]'
                  : 'border-border/30 hover:border-border/60'
              )}
            >
              {/* Country + Sentiment */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg sm:text-xl leading-none">{item.flag}</span>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-foreground truncate">{item.name}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 h-4 shrink-0 gap-0.5', style.text, style.bg)}>
                  <SentimentIcon className="h-2.5 w-2.5" />
                  {item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1)}
                </Badge>
              </div>

              {/* Theme Name */}
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug line-clamp-2 mb-2.5">
                {item.theme}
              </p>

              {/* Intensity Bar */}
              <div className="flex items-center gap-2 mb-2.5">
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      item.sentiment === 'bullish' ? 'bg-emerald-500' :
                      item.sentiment === 'bearish' ? 'bg-rose-500' :
                      'bg-amber-500'
                    )}
                    style={{ width: `${item.intensity}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono font-bold text-muted-foreground">{item.intensity}</span>
              </div>

              {/* Tickers */}
              {tickers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tickers.slice(0, 3).map((t) => (
                    <Badge key={t.symbol} variant="secondary" className="text-[9px] font-mono px-1.5 py-0 h-4">
                      {t.symbol}
                    </Badge>
                  ))}
                  {tickers.length > 3 && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                      +{tickers.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Hover CTA */}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none">
                <span className="text-[9px] font-mono text-primary font-semibold flex items-center gap-1">
                  Explore on map <ArrowRight className="h-2.5 w-2.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
