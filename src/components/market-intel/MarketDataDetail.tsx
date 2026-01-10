/**
 * Market Data Detail Component
 * Shows detailed information, historical chart, and studies for any market data point
 * (commodities, currencies, economic indicators, etc.)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  BarChart3,
  Activity,
  BookOpen,
  Play,
  Loader2,
  Info,
  Globe,
  Gem,
  Fuel,
  Wheat,
  Banknote,
  DollarSign,
  Target,
  Gauge,
  LineChart as LineChartIcon,
  ArrowLeftRight,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Data types
export type MarketDataType = 'commodity' | 'forex' | 'economic' | 'index' | 'rate' | 'fund';

export interface MarketDataItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  open?: number;
  prevClose?: number;
  timestamp?: string;
  category?: string;
  unit?: string;
  base?: string;
  quote?: string;
  type: MarketDataType;
}

interface MarketDataDetailProps {
  item: MarketDataItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Comprehensive educational content for different asset types
const ASSET_EXPLANATIONS: Record<string, { description: string; factors: string[]; usage: string; tradingHours?: string; volatility?: string }> = {
  // Commodities - Metals
  'Gold': {
    description: 'Gold is a precious metal that has served as a store of value for thousands of years. It\'s considered a safe-haven asset during economic uncertainty and inflation hedge. Central banks hold gold as part of their reserves.',
    factors: ['Inflation expectations', 'Real interest rates (inverse)', 'US Dollar strength (inverse)', 'Geopolitical tensions', 'Central bank buying/selling', 'Jewelry demand (India, China)', 'ETF flows'],
    usage: 'Investment, jewelry, electronics, dentistry, aerospace. Central banks hold ~35,000 tonnes globally.',
    tradingHours: '23 hours/day, Sunday 6PM - Friday 5PM ET',
    volatility: 'Medium - typically 10-15% annual volatility',
  },
  'Silver': {
    description: 'Silver is both a precious and industrial metal with dual demand drivers. It has monetary properties like gold but ~50% of demand comes from industrial applications, making it more economically sensitive.',
    factors: ['Gold price (0.85+ correlation)', 'Industrial production', 'Solar panel production (fastest growing use)', 'Electronics demand', 'Investment demand', 'Mine supply (often byproduct)'],
    usage: 'Solar panels, electronics, photography, medical devices, jewelry, silverware, and investment.',
    tradingHours: '23 hours/day, Sunday 6PM - Friday 5PM ET',
    volatility: 'High - typically 20-30% annual volatility, 1.5-2x gold',
  },
  'Platinum': {
    description: 'Platinum is a rare precious metal, 30x rarer than gold, primarily used in automotive catalytic converters (40% of demand). South Africa produces 70% of global supply.',
    factors: ['Auto industry demand', 'South African mining (70% supply)', 'Substitution with palladium', 'Investment demand', 'Jewelry demand', 'Hydrogen fuel cell potential'],
    usage: 'Catalytic converters (diesel), jewelry, laboratory equipment, electrodes, fuel cells.',
    tradingHours: '23 hours/day, Sunday 6PM - Friday 5PM ET',
    volatility: 'High - supply concentration creates price swings',
  },
  'Palladium': {
    description: 'Palladium is the rarest of the precious metals, primarily used in gasoline catalytic converters. Russia produces 40% of global supply, creating geopolitical supply risk.',
    factors: ['Gasoline vehicle production', 'Russian supply (40%)', 'South African supply', 'Substitution dynamics', 'Emissions regulations', 'EV adoption (negative)'],
    usage: 'Catalytic converters (gasoline), electronics, dentistry, jewelry, fuel cells.',
    tradingHours: '23 hours/day',
    volatility: 'Very High - can move 40%+ annually',
  },
  'Copper': {
    description: 'Copper is called "Dr. Copper" because its price is seen as a leading indicator of economic health. Essential for construction, electrical systems, and increasingly for green energy transition.',
    factors: ['Global manufacturing PMIs', 'China demand (50% global)', 'Construction activity', 'Green energy transition', 'EV production', 'Mining supply/disruptions'],
    usage: 'Construction (40%), electrical equipment (25%), transportation, industrial machinery, consumer products.',
    tradingHours: 'CME: Sunday 6PM - Friday 5PM ET',
    volatility: 'Medium-High - economically sensitive',
  },
  // Commodities - Energy
  'Crude Oil WTI': {
    description: 'West Texas Intermediate (WTI) is the US benchmark crude oil, a light, sweet crude with API gravity of ~39.6° and sulfur content <0.5%. Priced at Cushing, Oklahoma delivery.',
    factors: ['OPEC+ production decisions', 'US shale production', 'Strategic Petroleum Reserve', 'Global demand growth', 'Geopolitical events', 'Refinery capacity', 'Inventory levels'],
    usage: 'Refined into gasoline (45%), diesel (25%), jet fuel, petrochemicals, plastics, lubricants.',
    tradingHours: 'CME: Sunday 6PM - Friday 5PM ET',
    volatility: 'High - can swing 30-50% in volatile periods',
  },
  'Brent Crude': {
    description: 'Brent Crude is the international oil benchmark, pricing ~60% of global crude. Sourced from North Sea fields (Brent, Forties, Oseberg, Ekofisk, Troll).',
    factors: ['Global supply/demand balance', 'OPEC decisions', 'Geopolitical premium', 'Shipping/freight costs', 'Refinery margins', 'Seasonal demand patterns'],
    usage: 'International pricing benchmark; same refined products as WTI.',
    tradingHours: 'ICE: Sunday 7PM - Friday 5PM ET',
    volatility: 'High - similar to WTI with smaller WTI spread',
  },
  'Natural Gas': {
    description: 'Natural gas is a fossil fuel increasingly important for electricity generation and as a "transition fuel" to renewables. US became world\'s largest producer via shale revolution.',
    factors: ['Weather (heating/cooling demand)', 'Storage levels vs 5-year avg', 'LNG export capacity', 'Power generation switching', 'Production/rig counts', 'Pipeline capacity'],
    usage: 'Electricity generation (40%), residential/commercial heating (30%), industrial (25%), vehicles.',
    tradingHours: 'CME: Sunday 6PM - Friday 5PM ET',
    volatility: 'Very High - extremely weather sensitive, can spike 100%+',
  },
  'Gasoline RBOB': {
    description: 'RBOB (Reformulated Blendstock for Oxygenate Blending) is the gasoline futures benchmark. Price reflects refining costs, crude oil, and seasonal demand.',
    factors: ['Crude oil prices', 'Refinery utilization', 'Driving season (Memorial-Labor Day)', 'Refinery outages', 'RINs/ethanol mandates', 'Regional supply'],
    usage: 'Transportation fuel for passenger vehicles.',
    tradingHours: 'CME: Sunday 6PM - Friday 5PM ET',
    volatility: 'High - seasonal and supply-shock sensitive',
  },
  // Commodities - Agriculture
  'Corn': {
    description: 'Corn (maize) is the world\'s most produced grain. US produces ~35% of global supply. Only 10% goes to direct food; most goes to animal feed and ethanol.',
    factors: ['US weather during growing season', 'Ethanol mandates (40% of US crop)', 'Export demand (especially China)', 'Planted acreage', 'Livestock demand', 'Competing crop prices'],
    usage: 'Animal feed (36%), ethanol (34%), exports (13%), food/industrial (17%).',
    tradingHours: 'CBOT: Sunday 7PM - Friday 1:20PM CT',
    volatility: 'Medium-High - weather dependent',
  },
  'Soybeans': {
    description: 'Soybeans are the world\'s most important protein crop. Brazil and US dominate production. Crushed into meal (animal feed) and oil (cooking/biodiesel).',
    factors: ['China import demand (60% of global trade)', 'South American production', 'US-China relations', 'Planted acreage competition', 'Crush margins', 'Biodiesel mandates'],
    usage: 'Meal for livestock feed (70% of value), oil for cooking and biodiesel.',
    tradingHours: 'CBOT: Sunday 7PM - Friday 1:20PM CT',
    volatility: 'Medium-High - trade-policy sensitive',
  },
  'Wheat': {
    description: 'Wheat is the most widely grown cereal globally, a staple food for 35% of world population. Major exporters: Russia, EU, US, Canada, Australia, Ukraine.',
    factors: ['Global production estimates', 'Black Sea supply (Russia/Ukraine)', 'Weather in key regions', 'Export restrictions', 'Quality premiums', 'Competing grain prices'],
    usage: 'Bread and baked goods (70%), animal feed, industrial (starch, gluten).',
    tradingHours: 'CBOT: Sunday 7PM - Friday 1:20PM CT',
    volatility: 'Medium-High - geopolitically sensitive',
  },
  'Coffee': {
    description: 'Coffee is the world\'s second most traded commodity by value after oil. Two main varieties: Arabica (higher quality, 60% of production) and Robusta.',
    factors: ['Brazilian weather (35% of production)', 'Vietnamese production (Robusta)', 'Colombian production', 'Global consumption growth', 'Currency movements (BRL)', 'Frost/drought risk'],
    usage: 'Beverage consumption. Specialty coffee is fastest growing segment.',
    tradingHours: 'ICE: 4:15AM - 1:30PM ET',
    volatility: 'High - weather-driven supply shocks',
  },
  'Sugar': {
    description: 'Sugar is produced from sugarcane (80%) and sugar beets (20%). Brazil is dominant producer/exporter. Price influenced by oil (ethanol competition in Brazil).',
    factors: ['Brazilian production/exports', 'Indian production/policies', 'Oil prices (ethanol arbitrage)', 'Currency movements', 'Weather in key regions', 'Government subsidies'],
    usage: 'Food/beverage sweetener (70%), ethanol production (Brazil), industrial uses.',
    tradingHours: 'ICE: 3:30AM - 1:00PM ET',
    volatility: 'Medium-High',
  },
  'Cotton': {
    description: 'Cotton is the world\'s most important natural fiber. China is largest producer and consumer. US is largest exporter.',
    factors: ['China demand/imports', 'US production', 'India production', 'Synthetic fiber competition', 'Weather in cotton belt', 'Textile demand'],
    usage: 'Textiles and apparel (70%), home furnishings, industrial products.',
    tradingHours: 'ICE: Sunday 8PM - Friday 2:20PM ET',
    volatility: 'Medium-High',
  },
  'Cocoa': {
    description: 'Cocoa beans are the raw material for chocolate. West Africa (Ivory Coast, Ghana) produces 70% of global supply. Prices highly sensitive to regional weather and disease.',
    factors: ['West African weather', 'Ivory Coast/Ghana policies', 'Global chocolate demand', 'Currency movements', 'Disease outbreaks', 'Speculative positioning'],
    usage: 'Chocolate and confectionery (90%), cosmetics, pharmaceuticals.',
    tradingHours: 'ICE: 4:45AM - 1:30PM ET',
    volatility: 'High - concentrated supply region',
  },
  // Forex - Major pairs
  'EUR/USD': {
    description: 'EUR/USD is the world\'s most traded currency pair, representing ~25% of daily forex volume. Nicknamed "The Euro" or "Fiber". Key relationship between world\'s two largest economies.',
    factors: ['ECB vs Fed monetary policy', 'Interest rate differentials', 'Eurozone economic data', 'US economic data', 'Political stability', 'Risk sentiment'],
    usage: 'Primary pair for eurozone trade, investment flows, and hedging.',
    tradingHours: '24 hours, Sunday 5PM - Friday 5PM ET. Most liquid during London/NY overlap.',
    volatility: 'Low-Medium - most liquid pair, ~8-10% annual',
  },
  'GBP/USD': {
    description: 'GBP/USD ("Cable") is one of the oldest currency pairs, named after the transatlantic telegraph cable. Third most traded pair globally.',
    factors: ['Bank of England policy', 'UK economic data', 'Brexit aftermath effects', 'Risk appetite', 'Political stability', 'Trade balance'],
    usage: 'UK international trade and investment transactions.',
    tradingHours: '24 hours. Most liquid during London session.',
    volatility: 'Medium - more volatile than EUR/USD, ~10-12% annual',
  },
  'USD/JPY': {
    description: 'USD/JPY is the second most traded currency pair. The yen is a major funding currency for carry trades due to Japan\'s low interest rates.',
    factors: ['BOJ monetary policy', 'US-Japan rate differential', 'Risk sentiment (yen strengthens in risk-off)', 'Japanese intervention', 'Trade flows', 'Repatriation flows'],
    usage: 'Major carry trade pair, Japanese trade and investment hedging.',
    tradingHours: '24 hours. Most liquid during Tokyo and London sessions.',
    volatility: 'Medium - intervention risk adds tail risk, ~10-12% annual',
  },
  'USD/CHF': {
    description: 'USD/CHF ("Swissie") features the Swiss franc, a traditional safe-haven currency. Switzerland\'s political neutrality and banking secrecy historically supported the franc.',
    factors: ['SNB policy/intervention', 'Safe-haven flows', 'EUR/CHF relationship', 'Risk sentiment', 'Swiss economic data', 'Negative rates'],
    usage: 'Safe-haven currency, Swiss trade and banking flows.',
    tradingHours: '24 hours. Most liquid during European session.',
    volatility: 'Low-Medium - SNB intervention limits moves',
  },
  'AUD/USD': {
    description: 'AUD/USD ("Aussie") is a commodity currency closely correlated with commodity prices, especially iron ore and copper. Proxy for China growth.',
    factors: ['China economic data', 'Commodity prices', 'RBA policy', 'Risk sentiment', 'Interest rate differential', 'Australian economic data'],
    usage: 'Commodity exposure, carry trades, China growth proxy.',
    tradingHours: '24 hours. Most liquid during Sydney and London sessions.',
    volatility: 'Medium-High - commodity and risk sensitive, ~12-15% annual',
  },
  'USD/CAD': {
    description: 'USD/CAD ("Loonie") is influenced by oil prices due to Canada\'s major oil exports. Strong trade relationship between US and Canada.',
    factors: ['Oil prices (inverse correlation)', 'BOC vs Fed policy', 'Trade balance', 'US economic data', 'Canadian economic data', 'Risk sentiment'],
    usage: 'US-Canada trade hedging, oil price exposure.',
    tradingHours: '24 hours. Most liquid during NY session.',
    volatility: 'Medium - oil correlation adds volatility',
  },
  'NZD/USD': {
    description: 'NZD/USD ("Kiwi") is a commodity currency with high interest rates historically making it popular for carry trades. Sensitive to dairy prices.',
    factors: ['Dairy prices', 'RBNZ policy', 'China demand', 'Risk sentiment', 'Interest rate differential', 'Australian dollar correlation'],
    usage: 'Carry trades, dairy/agricultural exposure.',
    tradingHours: '24 hours.',
    volatility: 'Medium-High - smaller market, more volatile',
  },
  // Forex - Cross pairs
  'EUR/GBP': {
    description: 'EUR/GBP reflects the relative economic performance of the Eurozone vs UK. Brexit significantly increased this pair\'s volatility and importance.',
    factors: ['ECB vs BOE policy', 'Brexit developments', 'Eurozone vs UK data', 'Political risk', 'Trade relationships'],
    usage: 'European trade hedging, Brexit positioning.',
    tradingHours: '24 hours. Most liquid during European session.',
    volatility: 'Low-Medium - two developed economies',
  },
  'EUR/JPY': {
    description: 'EUR/JPY is a risk-sensitive cross pair. Rises in risk-on environments as traders sell yen to buy higher-yielding euros.',
    factors: ['Risk sentiment', 'ECB vs BOJ policy', 'Global equity markets', 'Carry trade flows', 'Eurozone data'],
    usage: 'Risk sentiment indicator, carry trades.',
    tradingHours: '24 hours.',
    volatility: 'Medium-High - combines two different risk profiles',
  },
  'GBP/JPY': {
    description: 'GBP/JPY ("Geppy" or "Dragon") is known for high volatility. Popular with retail traders seeking larger moves.',
    factors: ['Risk sentiment', 'BOE vs BOJ policy', 'UK political risk', 'Carry trade flows', 'UK economic data'],
    usage: 'High-volatility trading, risk sentiment.',
    tradingHours: '24 hours.',
    volatility: 'High - combines volatile GBP with safe-haven JPY, ~15%+ annual',
  },
  // Forex - Emerging markets
  'USD/MXN': {
    description: 'USD/MXN is the most liquid emerging market pair. Mexico\'s proximity to US and USMCA trade agreement makes it sensitive to US economic policy.',
    factors: ['US economic policy', 'Mexico interest rates (Banxico)', 'Oil prices', 'Remittances', 'USMCA trade', 'US-Mexico relations'],
    usage: 'Mexico trade hedging, EM carry trades.',
    tradingHours: '24 hours.',
    volatility: 'High - EM volatility, ~12-18% annual',
  },
  'USD/CNY': {
    description: 'USD/CNY is the onshore Chinese yuan rate, managed within a daily band by PBOC. Critical for global trade as China is world\'s largest exporter.',
    factors: ['PBOC policy', 'Trade tensions', 'China economic data', 'US-China relations', 'Capital flows', 'Reserve management'],
    usage: 'China trade hedging, global trade indicator.',
    tradingHours: 'Onshore: Beijing trading hours. Offshore (CNH): 24 hours.',
    volatility: 'Low-Medium - PBOC management limits moves',
  },
};

// Available studies for different asset types
const AVAILABLE_STUDIES: Record<MarketDataType, { id: string; name: string; icon: any; description: string }[]> = {
  commodity: [
    { id: 'trend_analysis', name: 'Trend Analysis', icon: TrendingUp, description: 'Identify current trend direction and strength using moving averages' },
    { id: 'seasonality', name: 'Seasonality Patterns', icon: Calendar, description: 'Historical monthly return patterns and best/worst months' },
    { id: 'volatility_analysis', name: 'Volatility Analysis', icon: Zap, description: 'ATR, historical volatility, and volatility regime' },
    { id: 'mean_reversion', name: 'Mean Reversion', icon: ArrowLeftRight, description: 'Distance from moving averages, reversion probability' },
    { id: 'drawdown_analysis', name: 'Drawdown Analysis', icon: TrendingDown, description: 'Maximum drawdown, recovery times, risk metrics' },
    { id: 'price_targets', name: 'Price Projections', icon: Target, description: 'Statistical price targets based on historical moves' },
  ],
  forex: [
    { id: 'trend_analysis', name: 'Trend Analysis', icon: TrendingUp, description: 'Multi-timeframe trend assessment with MA alignment' },
    { id: 'volatility_analysis', name: 'Volatility Analysis', icon: Zap, description: 'Pip range, ATR, and volatility percentile' },
    { id: 'rsi_analysis', name: 'RSI Study', icon: Gauge, description: 'RSI levels, overbought/oversold analysis' },
    { id: 'mean_reversion', name: 'Mean Reversion', icon: ArrowLeftRight, description: 'Distance from averages, reversion stats' },
    { id: 'range_analysis', name: 'Range Analysis', icon: BarChart3, description: 'Daily/weekly range statistics and patterns' },
    { id: 'day_of_week_returns', name: 'Day of Week', icon: Calendar, description: 'Performance by day of week' },
  ],
  economic: [
    { id: 'trend_analysis', name: 'Trend Analysis', icon: TrendingUp, description: 'Long-term trend direction' },
    { id: 'volatility_analysis', name: 'Volatility', icon: Zap, description: 'Historical volatility metrics' },
    { id: 'mean_reversion', name: 'Mean Reversion', icon: ArrowLeftRight, description: 'Distance from historical average' },
  ],
  index: [
    { id: 'trend_analysis', name: 'Trend Analysis', icon: TrendingUp, description: 'Trend direction and strength' },
    { id: 'seasonality', name: 'Seasonality', icon: Calendar, description: 'Monthly/weekly patterns' },
    { id: 'volatility_analysis', name: 'Volatility', icon: Zap, description: 'VIX correlation and vol metrics' },
    { id: 'drawdown_analysis', name: 'Drawdown Analysis', icon: TrendingDown, description: 'Drawdown metrics and recovery' },
  ],
  rate: [
    { id: 'trend_analysis', name: 'Trend Analysis', icon: TrendingUp, description: 'Rate trend direction' },
    { id: 'volatility_analysis', name: 'Volatility', icon: Zap, description: 'Rate volatility metrics' },
    { id: 'mean_reversion', name: 'Mean Reversion', icon: ArrowLeftRight, description: 'Historical rate levels' },
  ],
  fund: [
    { id: 'performance_analysis', name: 'Performance Analysis', icon: TrendingUp, description: 'IRR and MOIC analysis' },
    { id: 'volatility_analysis', name: 'Volatility', icon: Zap, description: 'Return volatility' },
    { id: 'drawdown_analysis', name: 'Drawdown Analysis', icon: TrendingDown, description: 'Fund drawdown metrics' },
  ],
};

const TIME_PERIODS = [
  { value: '1M', label: '1 Month', days: 30 },
  { value: '3M', label: '3 Months', days: 90 },
  { value: '6M', label: '6 Months', days: 180 },
  { value: '1Y', label: '1 Year', days: 365 },
  { value: '2Y', label: '2 Years', days: 730 },
  { value: '5Y', label: '5 Years', days: 1825 },
];

interface HistoricalDataPoint {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export function MarketDataDetail({ item, open, onOpenChange }: MarketDataDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [timePeriod, setTimePeriod] = useState('1Y');
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [runningStudy, setRunningStudy] = useState<string | null>(null);
  const [studyResults, setStudyResults] = useState<Record<string, any>>({});

  // Fetch historical data
  const fetchHistoricalData = useCallback(async () => {
    if (!item) return;
    
    setIsLoadingHistory(true);
    try {
      const period = TIME_PERIODS.find(p => p.value === timePeriod);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (period?.days || 365));

      const { data, error } = await supabase.functions.invoke('polygon-aggs', {
        body: {
          ticker: item.symbol,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          timespan: 'day',
        },
      });

      if (error) throw error;

      if (data?.results && data.results.length > 0) {
        const formatted = data.results.map((bar: any) => ({
          date: new Date(bar.t).toISOString().split('T')[0],
          close: bar.c,
          open: bar.o,
          high: bar.h,
          low: bar.l,
          volume: bar.v,
        }));
        setHistoricalData(formatted);
      } else {
        setHistoricalData([]);
        console.log('No historical data returned for', item.symbol);
      }
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setHistoricalData([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [item, timePeriod]);

  // Run a study on the asset
  const runStudy = useCallback(async (studyId: string) => {
    if (!item) {
      toast.error('No item selected');
      return;
    }

    // If we don't have historical data, fetch it first
    if (historicalData.length === 0) {
      toast.info('Loading historical data first...');
      await fetchHistoricalData();
    }

    setRunningStudy(studyId);
    try {
      const period = TIME_PERIODS.find(p => p.value === timePeriod);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (period?.days || 365));

      const { data, error } = await supabase.functions.invoke('run-asset-study', {
        body: {
          ticker: item.symbol,
          studyType: studyId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          params: {},
        },
      });

      if (error) throw error;

      setStudyResults(prev => ({
        ...prev,
        [studyId]: data,
      }));

      toast.success(`${studyId.replace(/_/g, ' ')} study completed`);
    } catch (err) {
      console.error('Study error:', err);
      toast.error('Failed to run study. Check console for details.');
    } finally {
      setRunningStudy(null);
    }
  }, [item, historicalData, timePeriod, fetchHistoricalData]);

  // Fetch data when item changes
  useEffect(() => {
    if (open && item) {
      fetchHistoricalData();
      setStudyResults({}); // Clear previous results
      setActiveTab('overview');
    }
  }, [open, item?.symbol]);

  // Refetch when time period changes
  useEffect(() => {
    if (open && item && historicalData.length > 0) {
      fetchHistoricalData();
    }
  }, [timePeriod]);

  if (!item) return null;

  const isUp = item.change >= 0;
  const explanation = ASSET_EXPLANATIONS[item.name] || {
    description: `${item.name} is a ${item.type} instrument traded on global markets.`,
    factors: ['Supply and demand', 'Market sentiment', 'Economic data', 'Technical factors', 'Global events'],
    usage: 'Used for trading, hedging, and portfolio diversification.',
  };

  const studies = AVAILABLE_STUDIES[item.type] || AVAILABLE_STUDIES.commodity;

  // Calculate statistics from historical data
  const stats = historicalData.length > 0 ? calculateStats(historicalData) : null;

  const getIcon = () => {
    switch (item.type) {
      case 'commodity':
        if (item.category === 'metals') return <Gem className="h-6 w-6 text-yellow-500" />;
        if (item.category === 'energy') return <Fuel className="h-6 w-6 text-orange-500" />;
        return <Wheat className="h-6 w-6 text-green-500" />;
      case 'forex':
        return <Banknote className="h-6 w-6 text-blue-500" />;
      default:
        return <BarChart3 className="h-6 w-6 text-primary" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-secondary">
              {getIcon()}
            </div>
            <div>
              <SheetTitle className="text-xl flex items-center gap-2">
                {item.name}
                <Badge variant="outline" className="ml-2 text-xs">
                  {item.type.toUpperCase()}
                </Badge>
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                {item.symbol}
                {item.category && (
                  <Badge variant="secondary" className="text-xs">
                    {item.category}
                  </Badge>
                )}
              </SheetDescription>
            </div>
          </div>

          {/* Current Price */}
          <div className="flex items-center gap-6 mt-4 p-4 rounded-lg bg-secondary/50">
            <div>
              <p className="text-sm text-muted-foreground">Current Price</p>
              <p className="text-3xl font-bold tabular-nums">
                {item.type === 'forex' 
                  ? item.price.toFixed(item.quote === 'JPY' ? 3 : 5)
                  : `$${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                }
              </p>
            </div>
            <div className={cn(
              "flex items-center gap-1 px-3 py-2 rounded-lg",
              isUp ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}>
              {isUp ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              <div>
                <p className="font-bold tabular-nums">
                  {isUp ? '+' : ''}{item.change.toFixed(item.type === 'forex' ? 5 : 2)}
                </p>
                <p className="text-sm tabular-nums">
                  ({isUp ? '+' : ''}{item.changePercent.toFixed(2)}%)
                </p>
              </div>
            </div>
            {item.high && item.low && (
              <div className="text-sm text-muted-foreground">
                <p>H: {item.type === 'forex' ? item.high.toFixed(5) : `$${item.high.toFixed(2)}`}</p>
                <p>L: {item.type === 'forex' ? item.low.toFixed(5) : `$${item.low.toFixed(2)}`}</p>
              </div>
            )}
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <Info className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="chart" className="gap-2">
              <LineChartIcon className="h-4 w-4" />
              Chart
            </TabsTrigger>
            <TabsTrigger value="studies" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Studies
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  What is {item.name}?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  {explanation.description}
                </p>
                
                <div>
                  <h4 className="font-medium mb-2">Key Price Drivers</h4>
                  <div className="flex flex-wrap gap-2">
                    {explanation.factors.map((factor, i) => (
                      <Badge key={i} variant="outline">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Primary Use</h4>
                  <p className="text-sm text-muted-foreground">{explanation.usage}</p>
                </div>

                {explanation.tradingHours && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Trading Hours
                    </h4>
                    <p className="text-sm text-muted-foreground">{explanation.tradingHours}</p>
                  </div>
                )}

                {explanation.volatility && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Typical Volatility
                    </h4>
                    <p className="text-sm text-muted-foreground">{explanation.volatility}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Historical Statistics ({timePeriod})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Period High" value={formatPrice(stats.high, item.type)} color="emerald" />
                    <StatCard label="Period Low" value={formatPrice(stats.low, item.type)} color="rose" />
                    <StatCard label="Average" value={formatPrice(stats.average, item.type)} />
                    <StatCard label="Volatility" value={`${stats.volatility.toFixed(1)}%`} />
                    <StatCard label="Total Return" value={`${stats.totalReturn >= 0 ? '+' : ''}${stats.totalReturn.toFixed(1)}%`} color={stats.totalReturn >= 0 ? 'emerald' : 'rose'} />
                    <StatCard label="Best Day" value={`+${stats.bestDay.toFixed(2)}%`} color="emerald" />
                    <StatCard label="Worst Day" value={`${stats.worstDay.toFixed(2)}%`} color="rose" />
                    <StatCard label="Up Days" value={`${stats.upDaysPct.toFixed(0)}%`} />
                  </div>
                </CardContent>
              </Card>
            )}

            {!stats && !isLoadingHistory && (
              <Card className="p-6">
                <div className="text-center text-muted-foreground">
                  <p>Historical statistics will appear after data loads.</p>
                  <Button onClick={fetchHistoricalData} variant="outline" size="sm" className="mt-2">
                    Load Historical Data
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Chart Tab */}
          <TabsContent value="chart" className="space-y-4">
            <div className="flex items-center justify-between">
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_PERIODS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchHistoricalData}
                disabled={isLoadingHistory}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingHistory && "animate-spin")} />
                Refresh
              </Button>
            </div>

            <Card className="p-4">
              {isLoadingHistory ? (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading historical data...</p>
                  </div>
                </div>
              ) : historicalData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isUp ? "#10b981" : "#f43f5e"} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={isUp ? "#10b981" : "#f43f5e"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#666"
                      tick={{ fill: '#888', fontSize: 11 }}
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                      stroke="#666"
                      tick={{ fill: '#888', fontSize: 11 }}
                      domain={['auto', 'auto']}
                      tickFormatter={(val) => item.type === 'forex' ? val.toFixed(3) : `$${val.toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#888' }}
                      formatter={(value: number) => [
                        item.type === 'forex' ? value.toFixed(5) : `$${value.toFixed(2)}`,
                        'Price'
                      ]}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    />
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke={isUp ? "#10b981" : "#f43f5e"}
                      strokeWidth={2}
                      fill="url(#colorPrice)"
                    />
                    {stats && (
                      <ReferenceLine 
                        y={stats.average} 
                        stroke="#666" 
                        strokeDasharray="3 3"
                        label={{ value: 'Avg', fill: '#666', fontSize: 10 }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No historical data available for this symbol.</p>
                    <p className="text-sm mt-1">This may be due to symbol format or data availability.</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Return Distribution */}
            {historicalData.length > 0 && stats && (
              <Card className="p-4">
                <h4 className="font-medium mb-4">Daily Return Distribution</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={calculateReturnDistribution(historicalData)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="range" stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
                    <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      formatter={(value: number) => [`${value} days`, 'Count']}
                    />
                    <Bar dataKey="count" fill="#3b82f6">
                      {calculateReturnDistribution(historicalData).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.range.includes('-') ? '#f43f5e' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </TabsContent>

          {/* Studies Tab */}
          <TabsContent value="studies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Quantitative Studies
                </CardTitle>
                <CardDescription>
                  Run analytical studies on {item.name} historical data ({timePeriod} period)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {studies.map((study) => {
                    const Icon = study.icon;
                    const isRunning = runningStudy === study.id;
                    const hasResult = studyResults[study.id] && !studyResults[study.id].error;
                    const hasError = studyResults[study.id]?.error;

                    return (
                      <Card 
                        key={study.id} 
                        className={cn(
                          "p-4 cursor-pointer hover:bg-secondary/50 transition-colors",
                          hasResult && "border-primary/50 bg-primary/5",
                          hasError && "border-rose-500/50 bg-rose-500/5"
                        )}
                        onClick={() => !isRunning && runStudy(study.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              hasResult ? "bg-primary/20" : hasError ? "bg-rose-500/20" : "bg-secondary"
                            )}>
                              <Icon className={cn(
                                "h-4 w-4",
                                hasResult ? "text-primary" : hasError ? "text-rose-500" : "text-muted-foreground"
                              )} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{study.name}</p>
                              <p className="text-xs text-muted-foreground">{study.description}</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant={hasResult ? "secondary" : "outline"}
                            disabled={isRunning}
                          >
                            {isRunning ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : hasResult ? (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            ) : hasError ? (
                              <XCircle className="h-4 w-4 text-rose-500" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        {/* Show result preview */}
                        {hasResult && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <StudyResultPreview 
                              studyId={study.id} 
                              result={studyResults[study.id]} 
                              type={item.type}
                            />
                          </div>
                        )}

                        {hasError && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-rose-500">Error running study</p>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Study Methodology */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Study Methodology</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Studies analyze historical price data to identify patterns, trends, and statistical characteristics.
                  All calculations use the selected time period ({timePeriod}) of data.
                </p>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-amber-200">
                    <strong>Disclaimer:</strong> Past performance does not guarantee future results.
                    These studies are for informational and educational purposes only, not investment advice.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// Helper function to format price based on asset type
function formatPrice(value: number, type: MarketDataType): string {
  if (type === 'forex') {
    return value.toFixed(5);
  }
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper component for stat cards
function StatCard({ label, value, color }: { label: string; value: string; color?: 'emerald' | 'rose' }) {
  return (
    <div className={cn(
      "p-3 rounded-lg text-center",
      color === 'emerald' ? "bg-emerald-500/10" :
      color === 'rose' ? "bg-rose-500/10" :
      "bg-secondary/50"
    )}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        "font-bold tabular-nums",
        color === 'emerald' ? "text-emerald-500" :
        color === 'rose' ? "text-rose-500" : ""
      )}>
        {value}
      </p>
    </div>
  );
}

// Calculate statistics from historical data
function calculateStats(data: HistoricalDataPoint[]) {
  const closes = data.map(d => d.close);
  const returns = closes.slice(1).map((close, i) => ((close - closes[i]) / closes[i]) * 100);
  
  const high = Math.max(...closes);
  const low = Math.min(...closes);
  const average = closes.reduce((a, b) => a + b, 0) / closes.length;
  const totalReturn = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized
  
  const upDays = returns.filter(r => r > 0).length;
  const upDaysPct = (upDays / returns.length) * 100;
  
  const bestDay = Math.max(...returns);
  const worstDay = Math.min(...returns);
  
  return {
    high,
    low,
    average,
    totalReturn,
    volatility,
    upDaysPct,
    bestDay,
    worstDay,
  };
}

// Calculate return distribution for histogram
function calculateReturnDistribution(data: HistoricalDataPoint[]) {
  const closes = data.map(d => d.close);
  const returns = closes.slice(1).map((close, i) => ((close - closes[i]) / closes[i]) * 100);
  
  const buckets: Record<string, number> = {
    '<-3%': 0,
    '-3% to -2%': 0,
    '-2% to -1%': 0,
    '-1% to 0%': 0,
    '0% to 1%': 0,
    '1% to 2%': 0,
    '2% to 3%': 0,
    '>3%': 0,
  };
  
  returns.forEach(r => {
    if (r < -3) buckets['<-3%']++;
    else if (r < -2) buckets['-3% to -2%']++;
    else if (r < -1) buckets['-2% to -1%']++;
    else if (r < 0) buckets['-1% to 0%']++;
    else if (r < 1) buckets['0% to 1%']++;
    else if (r < 2) buckets['1% to 2%']++;
    else if (r < 3) buckets['2% to 3%']++;
    else buckets['>3%']++;
  });
  
  return Object.entries(buckets).map(([range, count]) => ({ range, count }));
}

// Preview component for study results
function StudyResultPreview({ studyId, result, type }: { studyId: string; result: any; type: MarketDataType }) {
  if (!result) return null;

  const r = result.result || result;

  switch (studyId) {
    case 'trend_analysis':
    case 'trend_strength':
      const trend = r.trendDirection || r.currentTrend || (r.trendScore > 3 ? 'bullish' : r.trendScore < -3 ? 'bearish' : 'neutral');
      return (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Trend:</span>
          <Badge variant={trend === 'bullish' || trend?.includes('up') ? 'default' : trend === 'bearish' || trend?.includes('down') ? 'destructive' : 'secondary'}>
            {(trend || 'NEUTRAL').toUpperCase().replace('_', ' ')}
          </Badge>
        </div>
      );
      
    case 'volatility_analysis':
      return (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Ann. Volatility:</span>
          <span className="font-mono text-sm">{(r.annualizedVolatility || r.volatility || 0).toFixed(1)}%</span>
        </div>
      );
      
    case 'seasonality':
    case 'month_of_year_returns':
      const months = r.monthlyReturns || r.byMonth || {};
      const bestMonth = Object.entries(months).sort((a: any, b: any) => (b[1]?.avgReturn || b[1]) - (a[1]?.avgReturn || a[1]))[0];
      return (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Best Month:</span>
          <span className="font-mono text-sm">{bestMonth?.[0] || '--'}</span>
        </div>
      );
      
    case 'rsi_analysis':
      const rsi = r.current || r.currentRSI || 50;
      return (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">RSI:</span>
          <span className={cn(
            "font-mono text-sm font-bold",
            rsi > 70 ? "text-rose-500" : rsi < 30 ? "text-emerald-500" : ""
          )}>
            {rsi.toFixed(1)}
          </span>
        </div>
      );
      
    case 'mean_reversion':
      return (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Regime:</span>
          <span className="font-mono text-sm capitalize">{(r.regime || 'unknown').replace('_', ' ')}</span>
        </div>
      );
      
    case 'drawdown_analysis':
      return (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Max Drawdown:</span>
          <span className="font-mono text-sm text-rose-500">{(r.maxDrawdown || 0).toFixed(1)}%</span>
        </div>
      );
      
    case 'day_of_week_returns':
      const days = r.byDay || r.dayOfWeekReturns || {};
      const bestDay = Object.entries(days).sort((a: any, b: any) => (b[1]?.avgReturn || b[1]) - (a[1]?.avgReturn || a[1]))[0];
      return (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Best Day:</span>
          <span className="font-mono text-sm">{bestDay?.[0] || '--'}</span>
        </div>
      );
      
    default:
      return (
        <div className="text-xs text-emerald-500 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Study complete - data available
        </div>
      );
  }
}

export default MarketDataDetail;
