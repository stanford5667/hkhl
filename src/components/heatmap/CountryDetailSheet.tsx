import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Globe, TrendingUp, BarChart3, Building2,
  DollarSign, Activity, Users, Factory, Landmark, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RegionThemeData } from '@/hooks/useInvestmentHeatmap';
import type { MarketTheme } from '@/data/marketThemes';

// Static economic snapshot data per country
const COUNTRY_ECON_DATA: Record<string, {
  gdp: string; gdpGrowth: string; inflation: string; unemployment: string;
  currency: string; centralBank: string; marketIndex: string; indexChange: string;
  keyExports: string[]; population: string;
}> = {
  US: { gdp: '$28.8T', gdpGrowth: '+2.5%', inflation: '3.1%', unemployment: '3.7%', currency: 'USD', centralBank: 'Federal Reserve', marketIndex: 'S&P 500', indexChange: '+12.4% YTD', keyExports: ['Technology', 'Aerospace', 'Pharma'], population: '335M' },
  CN: { gdp: '$18.5T', gdpGrowth: '+5.2%', inflation: '0.7%', unemployment: '5.2%', currency: 'CNY', centralBank: 'PBOC', marketIndex: 'CSI 300', indexChange: '-2.1% YTD', keyExports: ['Electronics', 'Machinery', 'Textiles'], population: '1.4B' },
  JP: { gdp: '$4.4T', gdpGrowth: '+1.9%', inflation: '2.8%', unemployment: '2.6%', currency: 'JPY', centralBank: 'Bank of Japan', marketIndex: 'Nikkei 225', indexChange: '+18.2% YTD', keyExports: ['Automobiles', 'Electronics', 'Machinery'], population: '125M' },
  GB: { gdp: '$3.3T', gdpGrowth: '+0.6%', inflation: '4.0%', unemployment: '4.2%', currency: 'GBP', centralBank: 'Bank of England', marketIndex: 'FTSE 100', indexChange: '+3.8% YTD', keyExports: ['Financial Services', 'Pharma', 'Machinery'], population: '67M' },
  DE: { gdp: '$4.5T', gdpGrowth: '+0.3%', inflation: '2.9%', unemployment: '5.7%', currency: 'EUR', centralBank: 'ECB', marketIndex: 'DAX', indexChange: '+9.1% YTD', keyExports: ['Automobiles', 'Machinery', 'Chemicals'], population: '84M' },
  IN: { gdp: '$3.9T', gdpGrowth: '+7.6%', inflation: '5.1%', unemployment: '7.1%', currency: 'INR', centralBank: 'RBI', marketIndex: 'SENSEX', indexChange: '+14.5% YTD', keyExports: ['IT Services', 'Pharma', 'Textiles'], population: '1.4B' },
  BR: { gdp: '$2.2T', gdpGrowth: '+2.9%', inflation: '4.6%', unemployment: '7.8%', currency: 'BRL', centralBank: 'BCB', marketIndex: 'Bovespa', indexChange: '+5.3% YTD', keyExports: ['Soybeans', 'Iron Ore', 'Oil'], population: '216M' },
  KR: { gdp: '$1.7T', gdpGrowth: '+2.2%', inflation: '3.2%', unemployment: '2.8%', currency: 'KRW', centralBank: 'BOK', marketIndex: 'KOSPI', indexChange: '+7.6% YTD', keyExports: ['Semiconductors', 'Automobiles', 'Ships'], population: '52M' },
  AU: { gdp: '$1.7T', gdpGrowth: '+2.1%', inflation: '3.4%', unemployment: '3.9%', currency: 'AUD', centralBank: 'RBA', marketIndex: 'ASX 200', indexChange: '+6.2% YTD', keyExports: ['Iron Ore', 'Coal', 'LNG'], population: '26M' },
  CA: { gdp: '$2.1T', gdpGrowth: '+1.5%', inflation: '2.8%', unemployment: '5.8%', currency: 'CAD', centralBank: 'Bank of Canada', marketIndex: 'TSX', indexChange: '+5.9% YTD', keyExports: ['Oil', 'Minerals', 'Lumber'], population: '40M' },
  FR: { gdp: '$3.0T', gdpGrowth: '+1.0%', inflation: '2.4%', unemployment: '7.4%', currency: 'EUR', centralBank: 'ECB', marketIndex: 'CAC 40', indexChange: '+8.3% YTD', keyExports: ['Aerospace', 'Luxury Goods', 'Wine'], population: '68M' },
  CH: { gdp: '$0.9T', gdpGrowth: '+1.3%', inflation: '1.4%', unemployment: '2.0%', currency: 'CHF', centralBank: 'SNB', marketIndex: 'SMI', indexChange: '+4.5% YTD', keyExports: ['Pharma', 'Watches', 'Finance'], population: '9M' },
  SG: { gdp: '$0.5T', gdpGrowth: '+3.2%', inflation: '3.5%', unemployment: '1.9%', currency: 'SGD', centralBank: 'MAS', marketIndex: 'STI', indexChange: '+3.1% YTD', keyExports: ['Electronics', 'Petrochemicals', 'Finance'], population: '6M' },
  TW: { gdp: '$0.8T', gdpGrowth: '+3.5%', inflation: '2.1%', unemployment: '3.4%', currency: 'TWD', centralBank: 'CBC', marketIndex: 'TAIEX', indexChange: '+22.1% YTD', keyExports: ['Semiconductors', 'Electronics', 'Machinery'], population: '24M' },
  NL: { gdp: '$1.1T', gdpGrowth: '+0.8%', inflation: '2.7%', unemployment: '3.6%', currency: 'EUR', centralBank: 'ECB', marketIndex: 'AEX', indexChange: '+11.2% YTD', keyExports: ['Machinery', 'Chemicals', 'Food'], population: '18M' },
  SE: { gdp: '$0.6T', gdpGrowth: '+0.5%', inflation: '2.3%', unemployment: '7.8%', currency: 'SEK', centralBank: 'Riksbank', marketIndex: 'OMX 30', indexChange: '+6.7% YTD', keyExports: ['Machinery', 'Vehicles', 'Paper'], population: '10M' },
  IL: { gdp: '$0.5T', gdpGrowth: '+2.0%', inflation: '3.3%', unemployment: '3.5%', currency: 'ILS', centralBank: 'BOI', marketIndex: 'TA-35', indexChange: '+1.2% YTD', keyExports: ['Tech', 'Diamonds', 'Pharma'], population: '10M' },
  SA: { gdp: '$1.1T', gdpGrowth: '+0.8%', inflation: '1.6%', unemployment: '4.8%', currency: 'SAR', centralBank: 'SAMA', marketIndex: 'Tadawul', indexChange: '-3.2% YTD', keyExports: ['Oil', 'Petrochemicals', 'Plastics'], population: '36M' },
  AE: { gdp: '$0.5T', gdpGrowth: '+3.4%', inflation: '2.3%', unemployment: '2.9%', currency: 'AED', centralBank: 'CBUAE', marketIndex: 'ADX', indexChange: '+2.8% YTD', keyExports: ['Oil', 'Aluminum', 'Gold'], population: '10M' },
};

const SENTIMENT_COLORS: Record<string, { text: string; bg: string }> = {
  bullish: { text: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  bearish: { text: 'text-rose-500', bg: 'bg-rose-500/10' },
  neutral: { text: 'text-amber-500', bg: 'bg-amber-500/10' },
  emerging: { text: 'text-primary', bg: 'bg-primary/10' },
};

interface Props {
  country: RegionThemeData | null;
  themes?: MarketTheme[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onThemeSelect?: (theme: MarketTheme) => void;
}

export function CountryDetailSheet({ country, themes = [], open, onOpenChange, onThemeSelect }: Props) {
  if (!country) return null;

  const econ = COUNTRY_ECON_DATA[country.countryCode];
  const colors = SENTIMENT_COLORS[country.sentiment] || SENTIMENT_COLORS.neutral;
  const gdpGrowthPositive = econ?.gdpGrowth?.startsWith('+');
  const hasThemeDetails = themes.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg md:max-w-xl p-0 border-l border-border/50 bg-background">
        <ScrollArea className="h-full">
          <div className="p-5 sm:p-6 space-y-5">
            {/* Header */}
            <SheetHeader className="space-y-3 text-left">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('text-[10px] gap-1', colors.text, colors.bg)}>
                  {country.sentiment.toUpperCase()}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {country.countryCode}
                </Badge>
              </div>
              <div className="flex items-start gap-3">
                <div className={cn('p-2.5 rounded-xl shrink-0', colors.bg, colors.text)}>
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <SheetTitle className="text-lg sm:text-xl font-bold text-foreground">
                    {country.countryName}
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Regional market intelligence · {country.activeThemes.length} active theme{country.activeThemes.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </SheetHeader>

            {/* Economic Dashboard */}
            {econ ? (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <StatCard icon={DollarSign} label="GDP" value={econ.gdp} sub={econ.gdpGrowth} subPositive={gdpGrowthPositive} />
                  <StatCard icon={Activity} label="Inflation" value={econ.inflation} />
                  <StatCard icon={Users} label="Unemployment" value={econ.unemployment} />
                  <StatCard icon={Landmark} label="Central Bank" value={econ.centralBank} small />
                  <StatCard icon={BarChart3} label={econ.marketIndex} value={econ.indexChange} subPositive={econ.indexChange.startsWith('+')} highlight />
                  <StatCard icon={Building2} label="Population" value={econ.population} />
                </div>

                {/* Key Exports */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Factory className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Key Exports & Industries</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {econ.keyExports.map(e => (
                      <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                    ))}
                  </div>
                </div>

                <Separator className="opacity-50" />
              </>
            ) : (
              <div className="rounded-lg bg-card border border-border/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">Detailed economic data not yet available for this region.</p>
              </div>
            )}

            {/* Active Themes */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Active Investment Themes</h3>
              </div>
              <div className="space-y-2">
                {hasThemeDetails ? themes.map((theme, index) => (
                  <button
                    key={`${theme.id}-${index}`}
                    onClick={() => onThemeSelect?.(theme)}
                    className="w-full text-left p-3 rounded-lg bg-card border border-border/30 hover:border-border/60 transition-colors space-y-2.5 group/theme cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground font-semibold leading-snug">{theme.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {theme.summary}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover/theme:opacity-100 transition-opacity shrink-0">
                        Deep Dive <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                    {theme.tickers?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {theme.tickers.slice(0, 4).map((ticker) => (
                          <Badge key={`${theme.id}-${ticker.symbol}`} variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-5">
                            {ticker.symbol}
                          </Badge>
                        ))}
                        {theme.tickers.length > 4 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                            +{theme.tickers.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}
                  </button>
                )) : country.activeThemes.map((theme, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/30">
                    <div className={cn('p-1.5 rounded-md shrink-0', colors.bg)}>
                      <Activity className={cn('h-3 w-3', colors.text)} />
                    </div>
                    <span className="text-sm text-foreground font-medium">{theme}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Stats */}
            {country.keyStats.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Theme Metrics</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {country.keyStats.map(s => (
                    <div key={s.label} className="rounded-lg bg-card border border-border/30 p-3">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                      <div className="text-sm font-bold text-foreground mt-0.5">{s.value}</div>
                    </div>
                  ))}
                  <div className="rounded-lg bg-card border border-border/30 p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Intensity</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            country.sentiment === 'bullish'
                              ? 'bg-primary'
                              : country.sentiment === 'bearish'
                                ? 'bg-destructive'
                                : 'bg-muted-foreground'
                          )}
                          style={{ width: `${country.themeIntensity}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-foreground">{country.themeIntensity}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function StatCard({ icon: Icon, label, value, sub, subPositive, small, highlight }: {
  icon: React.ElementType; label: string; value: string; sub?: string; subPositive?: boolean; small?: boolean; highlight?: boolean;
}) {
  return (
    <div className={cn('rounded-lg border p-3', highlight ? 'bg-primary/5 border-primary/20' : 'bg-card border-border/30')}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className={cn('font-bold text-foreground', small ? 'text-xs' : 'text-sm')}>
        {value}
      </div>
      {sub && (
        <div className={cn('text-[11px] font-semibold mt-0.5', subPositive ? 'text-primary' : 'text-destructive')}>
          {sub}
        </div>
      )}
    </div>
  );
}
