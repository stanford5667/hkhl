import { useState } from 'react';
import { RegionNewsStream } from './RegionNewsStream';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Globe, TrendingUp, BarChart3, Building2,
  DollarSign, Activity, Users, Factory, Landmark, ArrowRight,
  ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { THEME_TICKERS } from '@/hooks/useInvestmentHeatmap';
import type { RegionThemeData } from '@/hooks/useInvestmentHeatmap';
import type { MarketTheme } from '@/data/marketThemes';

// Expanded economic data with detail context
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
  IR: { gdp: '$0.4T', gdpGrowth: '-1.2%', inflation: '40.0%', unemployment: '9.5%', currency: 'IRR', centralBank: 'CBI', marketIndex: 'TEDPIX', indexChange: '-8.5% YTD', keyExports: ['Oil', 'Petrochemicals', 'Metals'], population: '88M' },
  IQ: { gdp: '$0.3T', gdpGrowth: '+3.7%', inflation: '5.0%', unemployment: '15.5%', currency: 'IQD', centralBank: 'CBI', marketIndex: 'ISX', indexChange: '+1.2% YTD', keyExports: ['Crude Oil', 'Natural Gas', 'Dates'], population: '44M' },
  SY: { gdp: '$0.01T', gdpGrowth: '-5.0%', inflation: '80%+', unemployment: '50%+', currency: 'SYP', centralBank: 'CBS', marketIndex: 'DSE', indexChange: 'N/A', keyExports: ['Oil (limited)', 'Textiles', 'Agriculture'], population: '23M' },
  YE: { gdp: '$0.02T', gdpGrowth: '-2.0%', inflation: '35%+', unemployment: '30%+', currency: 'YER', centralBank: 'CBY', marketIndex: 'N/A', indexChange: 'N/A', keyExports: ['Oil', 'Coffee', 'Fish'], population: '34M' },
  RU: { gdp: '$2.0T', gdpGrowth: '+3.6%', inflation: '7.4%', unemployment: '2.9%', currency: 'RUB', centralBank: 'CBR', marketIndex: 'MOEX', indexChange: '-12.3% YTD', keyExports: ['Oil & Gas', 'Metals', 'Wheat'], population: '144M' },
  UA: { gdp: '$0.18T', gdpGrowth: '+5.3%', inflation: '5.8%', unemployment: '18%+', currency: 'UAH', centralBank: 'NBU', marketIndex: 'PFTS', indexChange: 'N/A', keyExports: ['Grain', 'Steel', 'IT Services'], population: '37M' },
  NG: { gdp: '$0.5T', gdpGrowth: '+2.9%', inflation: '28.9%', unemployment: '33.3%', currency: 'NGN', centralBank: 'CBN', marketIndex: 'NGX ASI', indexChange: '+35.1% YTD', keyExports: ['Crude Oil', 'Cocoa', 'Rubber'], population: '224M' },
  KE: { gdp: '$0.11T', gdpGrowth: '+5.0%', inflation: '6.6%', unemployment: '5.7%', currency: 'KES', centralBank: 'CBK', marketIndex: 'NSE 20', indexChange: '+2.4% YTD', keyExports: ['Tea', 'Cut Flowers', 'Coffee'], population: '55M' },
  GH: { gdp: '$0.08T', gdpGrowth: '+3.2%', inflation: '23.1%', unemployment: '13.4%', currency: 'GHS', centralBank: 'BOG', marketIndex: 'GSE-CI', indexChange: '+12.8% YTD', keyExports: ['Gold', 'Cocoa', 'Oil'], population: '34M' },
  ZA: { gdp: '$0.4T', gdpGrowth: '+0.8%', inflation: '5.4%', unemployment: '32.1%', currency: 'ZAR', centralBank: 'SARB', marketIndex: 'JSE Top 40', indexChange: '+4.2% YTD', keyExports: ['Gold', 'Platinum', 'Coal'], population: '60M' },
  TR: { gdp: '$1.1T', gdpGrowth: '+4.5%', inflation: '64.8%', unemployment: '9.4%', currency: 'TRY', centralBank: 'TCMB', marketIndex: 'BIST 100', indexChange: '+42.5% YTD', keyExports: ['Vehicles', 'Machinery', 'Textiles'], population: '85M' },
  MX: { gdp: '$1.8T', gdpGrowth: '+3.2%', inflation: '4.3%', unemployment: '2.7%', currency: 'MXN', centralBank: 'Banxico', marketIndex: 'IPC', indexChange: '+8.4% YTD', keyExports: ['Vehicles', 'Electronics', 'Oil'], population: '130M' },
  VN: { gdp: '$0.4T', gdpGrowth: '+6.5%', inflation: '3.3%', unemployment: '2.3%', currency: 'VND', centralBank: 'SBV', marketIndex: 'VN-Index', indexChange: '+11.3% YTD', keyExports: ['Electronics', 'Textiles', 'Seafood'], population: '100M' },
  TH: { gdp: '$0.5T', gdpGrowth: '+2.5%', inflation: '1.2%', unemployment: '1.0%', currency: 'THB', centralBank: 'BOT', marketIndex: 'SET', indexChange: '-2.8% YTD', keyExports: ['Electronics', 'Vehicles', 'Rubber'], population: '72M' },
  ID: { gdp: '$1.4T', gdpGrowth: '+5.1%', inflation: '2.6%', unemployment: '5.3%', currency: 'IDR', centralBank: 'BI', marketIndex: 'JCI', indexChange: '+3.9% YTD', keyExports: ['Palm Oil', 'Coal', 'Nickel'], population: '278M' },
  PL: { gdp: '$0.8T', gdpGrowth: '+3.5%', inflation: '3.9%', unemployment: '2.8%', currency: 'PLN', centralBank: 'NBP', marketIndex: 'WIG 20', indexChange: '+15.2% YTD', keyExports: ['Machinery', 'Vehicles', 'Furniture'], population: '38M' },
  CZ: { gdp: '$0.3T', gdpGrowth: '+1.8%', inflation: '2.5%', unemployment: '2.7%', currency: 'CZK', centralBank: 'CNB', marketIndex: 'PX', indexChange: '+10.8% YTD', keyExports: ['Vehicles', 'Machinery', 'Electronics'], population: '11M' },
  AR: { gdp: '$0.6T', gdpGrowth: '-1.6%', inflation: '211%', unemployment: '6.2%', currency: 'ARS', centralBank: 'BCRA', marketIndex: 'Merval', indexChange: '+148% YTD', keyExports: ['Soybeans', 'Corn', 'Beef'], population: '46M' },
  KZ: { gdp: '$0.26T', gdpGrowth: '+5.1%', inflation: '9.8%', unemployment: '4.8%', currency: 'KZT', centralBank: 'NBK', marketIndex: 'KASE', indexChange: '+6.1% YTD', keyExports: ['Oil', 'Uranium', 'Metals'], population: '20M' },
  UZ: { gdp: '$0.09T', gdpGrowth: '+6.3%', inflation: '10.0%', unemployment: '5.2%', currency: 'UZS', centralBank: 'CBU', marketIndex: 'UZSE', indexChange: '+4.3% YTD', keyExports: ['Gold', 'Cotton', 'Natural Gas'], population: '36M' },
  EG: { gdp: '$0.4T', gdpGrowth: '+3.8%', inflation: '33.7%', unemployment: '7.1%', currency: 'EGP', centralBank: 'CBE', marketIndex: 'EGX 30', indexChange: '+52.3% YTD', keyExports: ['Oil & Gas', 'Textiles', 'Tourism'], population: '105M' },
  PK: { gdp: '$0.34T', gdpGrowth: '+2.0%', inflation: '24.5%', unemployment: '6.3%', currency: 'PKR', centralBank: 'SBP', marketIndex: 'KSE 100', indexChange: '+48.2% YTD', keyExports: ['Textiles', 'Rice', 'Leather'], population: '230M' },
};

// Contextual explanations for each stat type per country
const ECON_DETAILS: Record<string, Record<string, { explanation: string; context: string; trend: string }>> = {};

function getEconDetail(code: string, label: string, econ: typeof COUNTRY_ECON_DATA[string]): { explanation: string; context: string; trend: string } {
  const cached = ECON_DETAILS[code]?.[label];
  if (cached) return cached;

  const details: Record<string, { explanation: string; context: string; trend: string }> = {
    GDP: {
      explanation: `Gross Domestic Product measures the total value of goods and services produced. ${econ.gdp} ranks this economy among ${parseFloat(econ.gdp.replace(/[^0-9.]/g, '')) > 5 ? 'the world\'s largest' : parseFloat(econ.gdp.replace(/[^0-9.]/g, '')) > 1 ? 'major global economies' : 'developing or mid-size economies'}.`,
      context: `Growth rate of ${econ.gdpGrowth} ${econ.gdpGrowth.startsWith('+') ? 'indicates economic expansion' : 'signals contraction'}. Currency: ${econ.currency}. Central bank: ${econ.centralBank}.`,
      trend: econ.gdpGrowth.startsWith('+') ? 'Expanding' : 'Contracting',
    },
    Inflation: {
      explanation: `Consumer price inflation at ${econ.inflation} measures how fast prices are rising. ${parseFloat(econ.inflation) > 20 ? 'This is hyperinflationary territory — purchasing power is eroding rapidly.' : parseFloat(econ.inflation) > 6 ? 'Elevated inflation is pressuring consumers and may force tighter monetary policy.' : parseFloat(econ.inflation) > 3 ? 'Moderately above most central bank targets of ~2%.' : 'Well-contained within normal ranges.'}`,
      context: `The ${econ.centralBank} manages monetary policy. Higher rates tend to slow growth but stabilize prices.`,
      trend: parseFloat(econ.inflation) > 10 ? 'Critical' : parseFloat(econ.inflation) > 4 ? 'Elevated' : 'Stable',
    },
    Unemployment: {
      explanation: `${econ.unemployment} of the labor force is seeking work. ${parseFloat(econ.unemployment) > 20 ? 'Extremely high — signals structural economic distress and potential social instability.' : parseFloat(econ.unemployment) > 8 ? 'Above-average unemployment suggests economic slack and weaker consumer spending.' : parseFloat(econ.unemployment) > 5 ? 'Moderate levels — economy near equilibrium.' : 'Very tight labor market — may drive wage inflation.'}`,
      context: `Labor market conditions directly affect consumer spending (typically 60-70% of GDP) and corporate margins.`,
      trend: parseFloat(econ.unemployment) > 10 ? 'Weak' : parseFloat(econ.unemployment) > 5 ? 'Moderate' : 'Tight',
    },
    'Central Bank': {
      explanation: `The ${econ.centralBank} sets interest rates and manages the ${econ.currency} money supply. It plays a critical role in controlling inflation and supporting economic stability.`,
      context: `Key tools include interest rate adjustments, open market operations, and reserve requirements.`,
      trend: 'Policy-driven',
    },
    Population: {
      explanation: `A population of ${econ.population} represents the total consumer base and labor pool. ${parseFloat(econ.population.replace(/[^0-9.]/g, '')) > 200 ? 'Massive domestic market with scale advantages.' : parseFloat(econ.population.replace(/[^0-9.]/g, '')) > 50 ? 'Significant consumer base for domestic-oriented companies.' : 'Smaller market — economy likely trade-dependent.'}`,
      context: `Demographics drive long-term growth potential. Young populations fuel expansion; aging ones create fiscal pressure.`,
      trend: 'Structural',
    },
  };

  // Market index gets dynamic detail
  details[econ.marketIndex] = {
    explanation: `The ${econ.marketIndex} is the primary equity benchmark. A ${econ.indexChange} performance reflects ${econ.indexChange.startsWith('+') ? 'investor confidence and capital inflows' : econ.indexChange === 'N/A' ? 'limited market activity or data availability' : 'risk aversion or capital flight'}.`,
    context: `This index tracks the largest listed companies and serves as a barometer for foreign investment sentiment. Currency: ${econ.currency}.`,
    trend: econ.indexChange.startsWith('+') ? 'Bullish' : econ.indexChange === 'N/A' ? 'N/A' : 'Bearish',
  };

  return details[label] || {
    explanation: `${label}: ${econ.gdp}`,
    context: 'Tap for more details on related indicators.',
    trend: 'N/A',
  };
}

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
  const [expandedStat, setExpandedStat] = useState<string | null>(null);

  if (!country) return null;

  const econ = COUNTRY_ECON_DATA[country.countryCode];
  const colors = SENTIMENT_COLORS[country.sentiment] || SENTIMENT_COLORS.neutral;
  const gdpGrowthPositive = econ?.gdpGrowth?.startsWith('+');
  const hasThemeDetails = themes.length > 0;

  // Get tickers for a theme name from the THEME_TICKERS map
  const getTickersForTheme = (themeName: string) => {
    return THEME_TICKERS[themeName] || [];
  };

  const toggleStat = (label: string) => {
    setExpandedStat(prev => prev === label ? null : label);
  };

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
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Economic Overview</h3>
                    <span className="text-[10px] text-muted-foreground ml-auto">Tap any metric for details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <ExpandableStatCard
                      icon={DollarSign} label="GDP" value={econ.gdp} sub={econ.gdpGrowth} subPositive={gdpGrowthPositive}
                      expanded={expandedStat === 'GDP'} onToggle={() => toggleStat('GDP')}
                      detail={getEconDetail(country.countryCode, 'GDP', econ)}
                    />
                    <ExpandableStatCard
                      icon={Activity} label="Inflation" value={econ.inflation}
                      expanded={expandedStat === 'Inflation'} onToggle={() => toggleStat('Inflation')}
                      detail={getEconDetail(country.countryCode, 'Inflation', econ)}
                    />
                    <ExpandableStatCard
                      icon={Users} label="Unemployment" value={econ.unemployment}
                      expanded={expandedStat === 'Unemployment'} onToggle={() => toggleStat('Unemployment')}
                      detail={getEconDetail(country.countryCode, 'Unemployment', econ)}
                    />
                    <ExpandableStatCard
                      icon={Landmark} label="Central Bank" value={econ.centralBank} small
                      expanded={expandedStat === 'Central Bank'} onToggle={() => toggleStat('Central Bank')}
                      detail={getEconDetail(country.countryCode, 'Central Bank', econ)}
                    />
                    <ExpandableStatCard
                      icon={BarChart3} label={econ.marketIndex} value={econ.indexChange}
                      subPositive={econ.indexChange.startsWith('+')} highlight
                      expanded={expandedStat === econ.marketIndex} onToggle={() => toggleStat(econ.marketIndex)}
                      detail={getEconDetail(country.countryCode, econ.marketIndex, econ)}
                    />
                    <ExpandableStatCard
                      icon={Building2} label="Population" value={econ.population}
                      expanded={expandedStat === 'Population'} onToggle={() => toggleStat('Population')}
                      detail={getEconDetail(country.countryCode, 'Population', econ)}
                    />
                  </div>
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

            {/* Active Themes — always show tickers */}
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
                        {theme.tickers.slice(0, 5).map((ticker) => (
                          <Badge key={`${theme.id}-${ticker.symbol}`} variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-5">
                            {ticker.symbol}
                            {typeof ticker.change === 'number' && (
                              <span className={cn('ml-1', ticker.change >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                                {ticker.change >= 0 ? '+' : ''}{ticker.change.toFixed(1)}%
                              </span>
                            )}
                          </Badge>
                        ))}
                        {theme.tickers.length > 5 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                            +{theme.tickers.length - 5}
                          </Badge>
                        )}
                      </div>
                    )}
                  </button>
                )) : country.activeThemes.map((themeName, i) => {
                  const tickers = getTickersForTheme(themeName);
                  return (
                    <div key={i} className="p-3 rounded-lg bg-card border border-border/30 space-y-2.5">
                      <div className="flex items-center gap-3">
                        <div className={cn('p-1.5 rounded-md shrink-0', colors.bg)}>
                          <Activity className={cn('h-3 w-3', colors.text)} />
                        </div>
                        <span className="text-sm text-foreground font-semibold">{themeName}</span>
                      </div>
                      {tickers.length > 0 && (
                        <>
                          <p className="text-[11px] text-muted-foreground pl-9">Related tickers to watch:</p>
                          <div className="flex flex-wrap gap-1.5 pl-9">
                            {tickers.map((t) => (
                              <div
                                key={`fallback-${themeName}-${t.symbol}`}
                                className="flex items-center gap-1.5 rounded-md bg-muted/50 border border-border/30 px-2 py-1"
                              >
                                <span className="text-[11px] font-mono font-bold text-foreground">{t.symbol}</span>
                                <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{t.name}</span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0">{t.sector}</Badge>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Regional News Stream */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Radio className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Live News &amp; Events</h3>
              </div>
              <div className="rounded-lg border border-border/30 bg-card/50 p-3">
                <RegionNewsStream
                  countryCode={country.countryCode}
                  countryName={country.countryName}
                />
              </div>
            </div>

            <Separator className="opacity-50" />

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

function ExpandableStatCard({ icon: Icon, label, value, sub, subPositive, small, highlight, expanded, onToggle, detail }: {
  icon: React.ElementType; label: string; value: string; sub?: string; subPositive?: boolean; small?: boolean; highlight?: boolean;
  expanded: boolean; onToggle: () => void;
  detail: { explanation: string; context: string; trend: string };
}) {
  return (
    <div className={cn('rounded-lg border transition-all', highlight ? 'bg-primary/5 border-primary/20' : 'bg-card border-border/30', expanded && 'col-span-2')}>
      <button onClick={onToggle} className="w-full text-left p-3 cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
          </div>
          <div className="flex items-center gap-1">
            <Info className="h-3 w-3 text-muted-foreground/50" />
            {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
          </div>
        </div>
        <div className={cn('font-bold text-foreground mt-0.5', small ? 'text-xs' : 'text-sm')}>
          {value}
        </div>
        {sub && (
          <div className={cn('text-[11px] font-semibold mt-0.5', subPositive ? 'text-primary' : 'text-destructive')}>
            {sub}
          </div>
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/20 pt-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{detail.trend}</Badge>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">{detail.explanation}</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{detail.context}</p>
        </div>
      )}
    </div>
  );
}
