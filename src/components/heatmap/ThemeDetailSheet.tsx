import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, Zap, Globe, Clock, ExternalLink,
  BarChart3, Target, Newspaper, Shield, AlertTriangle, ArrowRight,
  Bookmark, BookmarkCheck, Loader2,
} from 'lucide-react';
import type { MarketTheme } from '@/data/marketThemes';
import type { ThemeTicker } from '@/hooks/useInvestmentHeatmap';
import { useNavigate } from 'react-router-dom';
import { useSaveReport, useIsReportSaved } from '@/hooks/useSavedReports';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { AuthGateDialog } from '@/components/auth/AuthGateDialog';

interface Props {
  theme: MarketTheme | null;
  tickers: ThemeTicker[];
  tickersLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThemeDetailSheet({ theme, tickers, tickersLoading, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const saveReport = useSaveReport();
  const isSaved = useIsReportSaved(theme?.id);
  const { requireAuth, showAuthDialog, closeAuthDialog } = useRequireAuth();

  if (!theme) return null;

  const isMicro = !!(theme as any)._micro;
  const isBullish = theme.sentimentScore > 0.6;
  const isBearish = theme.sentimentScore < 0.4;
  const Icon = theme.icon;
  const impactScore = (theme as any)._impactScore;
  const countries: string[] = (theme as any)._countries || [];
  const assetImpacts: Record<string, number> = (theme as any)._assetImpacts || {};

  const sentimentLabel = isBullish ? 'Bullish' : isBearish ? 'Bearish' : 'Neutral';
  const sentimentColor = isBullish ? 'text-emerald-500' : isBearish ? 'text-rose-500' : 'text-amber-500';
  const sentimentBg = isBullish ? 'bg-emerald-500/10' : isBearish ? 'bg-rose-500/10' : 'bg-amber-500/10';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg md:max-w-xl p-0 border-l border-border/50 bg-background">
        <ScrollArea className="h-full">
          <div className="p-5 sm:p-6 space-y-6">
            {/* ─── Header ─── */}
            <SheetHeader className="space-y-3 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {isMicro ? (
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5 gap-1">
                      <Zap className="h-2.5 w-2.5" />LIVE
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Globe className="h-2.5 w-2.5" />MACRO
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px]">{theme.category}</Badge>
                  <Badge variant="outline" className={cn('text-[10px]', sentimentColor)}>
                    {sentimentLabel}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={isSaved || saveReport.isPending}
                  onClick={() => saveReport.mutate({ theme, tickers })}
                  title={isSaved ? 'Already saved' : 'Save this report'}
                >
                  {saveReport.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isSaved ? (
                    <BookmarkCheck className="h-4 w-4 text-primary" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-start gap-3">
                <div className={cn('p-2.5 rounded-xl shrink-0', sentimentBg, sentimentColor)}>
                  <Icon className="h-5 w-5" />
                </div>
                <SheetTitle className="text-lg sm:text-xl font-bold text-foreground leading-snug">
                  {theme.title}
                </SheetTitle>
              </div>
            </SheetHeader>

            {/* ─── Key Metrics Row ─── */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Impact',
                  value: isMicro ? `${impactScore}/10` : `${theme.impactPercent > 0 ? '+' : ''}${theme.impactPercent.toFixed(1)}%`,
                  icon: Target,
                },
                {
                  label: 'Sentiment',
                  value: `${(theme.sentimentScore * 100).toFixed(0)}%`,
                  icon: isBullish ? TrendingUp : isBearish ? TrendingDown : AlertTriangle,
                },
                {
                  label: 'Tickers',
                  value: `${theme.tickers?.length || 0}`,
                  icon: BarChart3,
                },
              ].map(m => (
                <div key={m.label} className="rounded-lg bg-card border border-border/50 p-3 text-center">
                  <m.icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <div className="text-sm font-bold text-foreground">{m.value}</div>
                  <div className="text-[10px] text-muted-foreground">{m.label}</div>
                </div>
              ))}
            </div>

            {/* ─── Executive Summary ─── */}
            <Section title="Executive Summary" icon={Shield}>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {theme.detailedSummary || theme.summary}
              </p>
            </Section>

            {/* ─── Key Catalysts / News ─── */}
            {theme.headlines && theme.headlines.length > 0 && (
              <Section title="Key Catalysts" icon={Newspaper}>
                <div className="space-y-2">
                  {theme.headlines.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border/30">
                      <div className="mt-0.5 p-1.5 rounded-md bg-primary/5">
                        <Newspaper className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-snug">{h.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                          <span className="font-medium">{h.source}</span>
                          <span className="opacity-50">·</span>
                          <Clock className="h-2.5 w-2.5" />
                          <span>{h.time}</span>
                        </div>
                      </div>
                      {h.url && (
                        <a href={h.url} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ─── Affected Regions ─── */}
            {countries.length > 0 && (
              <Section title="Affected Regions" icon={Globe}>
                <div className="flex flex-wrap gap-1.5">
                  {countries.map(c => (
                    <Badge key={c} variant="outline" className="text-xs">
                      {c}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}

            {/* ─── Asset Class Impacts ─── */}
            {Object.keys(assetImpacts).length > 0 && (
              <Section title="Asset Class Impact" icon={BarChart3}>
                <div className="space-y-2">
                  {Object.entries(assetImpacts).map(([asset, impact]) => (
                    <div key={asset} className="flex items-center justify-between">
                      <span className="text-sm text-foreground capitalize">{asset.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              impact > 0 ? 'bg-emerald-500' : 'bg-rose-500',
                            )}
                            style={{ width: `${Math.min(Math.abs(impact) * 10, 100)}%` }}
                          />
                        </div>
                        <span className={cn(
                          'text-xs font-mono font-semibold w-10 text-right',
                          impact > 0 ? 'text-emerald-500' : impact < 0 ? 'text-rose-500' : 'text-muted-foreground'
                        )}>
                          {impact > 0 ? '+' : ''}{impact}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ─── Impacted Tickers ─── */}
            <Section title="Impacted Tickers" icon={BarChart3}>
              {tickersLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : tickers.length === 0 && theme.tickers?.length > 0 ? (
                <div className="space-y-2">
                  {theme.tickers.map(t => (
                    <TickerRow
                      key={t.symbol}
                      symbol={t.symbol}
                      name={t.name}
                      change={t.change}
                      rationale={t.themeRelevance}
                      sentiment={t.sentiment}
                      onNavigate={() => navigate(`/stock/${t.symbol}`)}
                    />
                  ))}
                </div>
              ) : tickers.length > 0 ? (
                <div className="space-y-2">
                  {tickers.map(t => (
                    <TickerRow
                      key={t.symbol}
                      symbol={t.symbol}
                      name={t.name}
                      price={t.price}
                      change={t.changePercent}
                      rationale={t.themeExposure}
                      sentiment={t.changePercent != null ? (t.changePercent > 0 ? 'bullish' : t.changePercent < 0 ? 'bearish' : 'neutral') : 'neutral'}
                      onNavigate={() => navigate(`/stock/${t.symbol}`)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No ticker data available for this theme.</p>
              )}
            </Section>

            {/* ─── Analyze CTA ─── */}
            <Button
              className="w-full gap-2"
              onClick={() => {
                const sanitized = { ...theme, icon: undefined };
                navigate('/theme-analysis', { state: { theme: sanitized } });
              }}
            >
              Deep Dive Analysis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, icon: SectionIcon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <SectionIcon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function TickerRow({ symbol, name, price, change, rationale, sentiment, onNavigate }: {
  symbol: string;
  name: string;
  price?: number | null;
  change?: number | null;
  rationale?: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  onNavigate: () => void;
}) {
  const changeColor = sentiment === 'bullish' ? 'text-emerald-500' : sentiment === 'bearish' ? 'text-rose-500' : 'text-muted-foreground';

  return (
    <button
      onClick={onNavigate}
      className="w-full text-left flex items-center gap-3 p-3 rounded-lg bg-card border border-border/30 hover:border-border/60 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-bold text-foreground">{symbol}</span>
          <span className="text-xs text-muted-foreground truncate">{name}</span>
        </div>
        {rationale && (
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{rationale}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        {price != null && (
          <div className="text-sm font-semibold text-foreground">${price.toFixed(2)}</div>
        )}
        {change != null && (
          <div className={cn('text-xs font-semibold flex items-center justify-end gap-0.5', changeColor)}>
            {sentiment === 'bullish' ? <TrendingUp className="h-3 w-3" /> : sentiment === 'bearish' ? <TrendingDown className="h-3 w-3" /> : null}
            {change > 0 ? '+' : ''}{change.toFixed(2)}%
          </div>
        )}
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}
