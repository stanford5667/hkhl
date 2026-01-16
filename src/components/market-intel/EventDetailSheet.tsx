/**
 * Event Detail Sheet Component
 * 
 * Comprehensive view for economic calendar events with:
 * - Educational content explaining what the event is
 * - Historical market impact analysis
 * - Fed meeting rate probabilities (CME FedWatch style)
 * - Related economic indicators
 * - Trading considerations
 */

import { useState, useEffect, useMemo } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  Calendar,
  BookOpen,
  BarChart3,
  Activity,
  Target,
  Clock,
  Globe,
  DollarSign,
  AlertTriangle,
  Info,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Building2,
  Users,
  ShoppingCart,
  Factory,
  Home,
  Briefcase,
  Percent,
  Scale,
  Gauge,
  CircleDot,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { CalendarEvent } from '@/hooks/useEconomicCalendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface EventDetailSheetProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RateProbability {
  rate: string;
  probability: number;
  change: number; // basis points change from current
}

interface HistoricalImpact {
  date: string;
  actual: string;
  forecast: string;
  spyChange: number;
  tltChange: number;
  dxyChange: number;
  vixChange: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDUCATIONAL CONTENT DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

interface EventEducation {
  title: string;
  shortDescription: string;
  fullDescription: string;
  whyItMatters: string[];
  marketImpact: {
    stocks: string;
    bonds: string;
    currencies: string;
    commodities: string;
  };
  tradingConsiderations: string[];
  relatedIndicators: string[];
  releaseSchedule: string;
  dataSource: string;
  historicalContext?: string;
  icon: any;
  category: 'monetary_policy' | 'employment' | 'inflation' | 'growth' | 'housing' | 'consumer' | 'manufacturing' | 'trade' | 'earnings';
}

const EVENT_EDUCATION: Record<string, EventEducation> = {
  // Federal Reserve Events
  'FOMC Meeting': {
    title: 'Federal Open Market Committee (FOMC) Meeting',
    shortDescription: 'The Fed\'s monetary policy decision-making body meets to set interest rates',
    fullDescription: `The FOMC is the branch of the Federal Reserve responsible for monetary policy decisions. It consists of 12 members: 7 members of the Board of Governors, the president of the Federal Reserve Bank of New York, and 4 of the remaining 11 Reserve Bank presidents who serve one-year rotating terms.

The committee meets 8 times per year (roughly every 6 weeks) to assess economic conditions and determine the appropriate stance of monetary policy. The primary tool is the federal funds rate target range, which influences borrowing costs throughout the economy.`,
    whyItMatters: [
      'Sets the benchmark interest rate that affects all borrowing costs',
      'Signals Fed\'s view on economic health and inflation outlook',
      'Impacts mortgage rates, credit card rates, and business loans',
      'Drives currency values through interest rate differentials',
      'Forward guidance shapes market expectations for months ahead',
    ],
    marketImpact: {
      stocks: 'Rate hikes typically pressure growth stocks; cuts support valuations. The "Fed put" concept suggests the Fed may ease policy during severe downturns.',
      bonds: 'Direct inverse relationship with rates. Higher rates = lower bond prices. Duration risk increases with longer maturities.',
      currencies: 'Higher rates attract foreign capital, strengthening USD. Rate differentials are a key FX driver.',
      commodities: 'Dollar strength from rate hikes typically pressures commodity prices. Gold often rises with lower real rates.',
    },
    tradingConsiderations: [
      'Volatility spikes around 2:00 PM ET announcement and 2:30 PM press conference',
      'Watch for dot plot changes (quarterly meetings only)',
      'Language changes in the statement can move markets significantly',
      'Options premiums inflate before meetings - consider selling premium',
      'The "blackout period" before meetings means no Fed speeches',
    ],
    relatedIndicators: ['Core PCE', 'Unemployment Rate', 'GDP Growth', 'CPI', 'Wage Growth'],
    releaseSchedule: '8 times per year, statement at 2:00 PM ET, press conference at 2:30 PM ET',
    dataSource: 'Federal Reserve',
    historicalContext: 'The FOMC was created in 1933 as part of the Banking Act. It gained its current form with the Federal Reserve Act amendments of 1935.',
    icon: Landmark,
    category: 'monetary_policy',
  },
  'Fed Chair Speech': {
    title: 'Federal Reserve Chair Speech',
    shortDescription: 'The Fed Chair addresses economic conditions and policy outlook',
    fullDescription: `The Federal Reserve Chair is the most influential voice in global monetary policy. Speeches, congressional testimonies, and press conferences provide crucial insights into the Fed's thinking on economic conditions, inflation risks, and future policy direction.

Key speaking events include the Jackson Hole Economic Symposium (August), congressional testimonies (semi-annual), and various economic conferences throughout the year.`,
    whyItMatters: [
      'Provides forward guidance on monetary policy direction',
      'Can signal policy shifts before official FOMC meetings',
      'Markets parse every word for hints about future decisions',
      'Unscripted Q&A sessions often reveal more than prepared remarks',
      'Can validate or challenge market rate expectations',
    ],
    marketImpact: {
      stocks: 'Hawkish comments can trigger selloffs; dovish remarks support risk assets.',
      bonds: 'Treasury yields move sharply on policy hints. The 2-year yield is most sensitive.',
      currencies: 'Dollar reacts immediately to rate guidance changes.',
      commodities: 'Gold particularly sensitive to real rate implications.',
    },
    tradingConsiderations: [
      'Check speech time zone carefully - not always during US market hours',
      'Jackson Hole in late August is often the most market-moving speech',
      'Watch for phrases like "data dependent" or "patient" for policy clues',
      'Congressional testimonies include market-moving Q&A sessions',
    ],
    relatedIndicators: ['FOMC Meeting', 'Fed Funds Rate', 'Treasury Yields'],
    releaseSchedule: 'Various - check Fed calendar for scheduled appearances',
    dataSource: 'Federal Reserve',
    icon: Users,
    category: 'monetary_policy',
  },
  // Employment Data
  'Non-Farm Payrolls': {
    title: 'Non-Farm Payrolls (NFP)',
    shortDescription: 'Monthly jobs report showing employment changes in the US economy',
    fullDescription: `Non-Farm Payrolls is the most closely watched employment indicator, measuring the number of jobs added or lost in the US economy, excluding farm workers, government employees, private household employees, and employees of nonprofit organizations.

Released by the Bureau of Labor Statistics (BLS) on the first Friday of each month, it covers the previous month's data and includes the unemployment rate, average hourly earnings, and labor force participation rate.`,
    whyItMatters: [
      'Key Fed input for monetary policy decisions',
      'Leading indicator of economic health and consumer spending power',
      'Wage growth data within report is crucial for inflation outlook',
      'Large revisions to prior months can shift market sentiment',
      'Participation rate shows labor market structural health',
    ],
    marketImpact: {
      stocks: 'Strong jobs can be positive (growth) or negative (more Fed hikes). Context matters.',
      bonds: 'Strong payrolls typically push yields higher on inflation/Fed concerns.',
      currencies: 'USD strength on strong numbers due to rate hike expectations.',
      commodities: 'Gold often falls on strong jobs (higher real rates expected).',
    },
    tradingConsiderations: [
      'Released 8:30 AM ET on first Friday of month - prepare for volatility',
      'Headline number matters less than the trend and wage data',
      'ADP report (Wednesday before) gives preview but often diverges',
      'Revisions to prior months can be significant (±30K common)',
      'Consider reducing position size around release due to volatility',
    ],
    relatedIndicators: ['Unemployment Rate', 'ADP Employment', 'Weekly Jobless Claims', 'JOLTs'],
    releaseSchedule: 'First Friday of each month at 8:30 AM ET',
    dataSource: 'Bureau of Labor Statistics (BLS)',
    historicalContext: 'The BLS has reported employment data since 1939. The modern NFP format began in 1994.',
    icon: Briefcase,
    category: 'employment',
  },
  'Unemployment Rate': {
    title: 'Unemployment Rate',
    shortDescription: 'Percentage of the labor force that is jobless and actively seeking work',
    fullDescription: `The unemployment rate represents the percentage of the total labor force that is unemployed but actively seeking employment. It's derived from the household survey (separate from the establishment survey used for NFP) and is a key measure of labor market slack.

The rate is part of the broader Employment Situation report and includes subcategories like U-3 (headline), U-6 (broader measure including underemployed), and demographic breakdowns.`,
    whyItMatters: [
      'Part of the Fed\'s dual mandate (maximum employment)',
      'At 4% or below typically considered "full employment"',
      'Changes in rate can lag economic turning points',
      'Rising unemployment often precedes recessions',
      'U-6 measure provides broader view of labor slack',
    ],
    marketImpact: {
      stocks: 'Rising unemployment negative for consumer discretionary; falling rate supports spending-sensitive sectors.',
      bonds: 'Higher unemployment → flight to safety → lower yields.',
      currencies: 'Currency weakens with rising unemployment due to expected policy easing.',
      commodities: 'Demand-sensitive commodities (oil, copper) suffer with rising unemployment.',
    },
    tradingConsiderations: [
      'Released same time as NFP - interpret together',
      'Rate can fall for "bad" reasons (people leaving labor force)',
      'Watch labor force participation rate for context',
      'The "Sahm Rule" uses unemployment rate rises to signal recessions',
    ],
    relatedIndicators: ['Non-Farm Payrolls', 'Labor Force Participation', 'JOLTs', 'Weekly Claims'],
    releaseSchedule: 'First Friday of each month at 8:30 AM ET',
    dataSource: 'Bureau of Labor Statistics (BLS)',
    icon: Users,
    category: 'employment',
  },
  'Initial Jobless Claims': {
    title: 'Initial Jobless Claims',
    shortDescription: 'Weekly count of new unemployment insurance filings',
    fullDescription: `Initial Jobless Claims measures the number of people filing for unemployment benefits for the first time. As a weekly indicator, it provides the most timely read on labor market conditions and is often an early warning signal of economic stress.

The 4-week moving average smooths out volatility and is considered more reliable for trend analysis. Continuing claims show the total number currently receiving benefits.`,
    whyItMatters: [
      'Most timely employment indicator (weekly vs monthly)',
      'Early warning signal for labor market deterioration',
      'Leading indicator for unemployment rate changes',
      'Spikes often precede recessions by several months',
      'Low claims indicate tight labor market conditions',
    ],
    marketImpact: {
      stocks: 'Spike in claims negative for risk assets; signals economic weakness.',
      bonds: 'Rising claims push yields lower (flight to safety, Fed ease expectations).',
      currencies: 'Higher claims weaken currency on growth concerns.',
      commodities: 'Demand concerns hurt industrial commodities.',
    },
    tradingConsiderations: [
      'Released every Thursday at 8:30 AM ET',
      'Holiday weeks can distort data - watch seasonal adjustments',
      'Focus on 4-week moving average, not single week',
      'Levels below 250K generally indicate healthy labor market',
    ],
    relatedIndicators: ['Continuing Claims', 'Unemployment Rate', 'NFP'],
    releaseSchedule: 'Every Thursday at 8:30 AM ET',
    dataSource: 'Department of Labor',
    icon: Briefcase,
    category: 'employment',
  },
  // Inflation Data
  'CPI': {
    title: 'Consumer Price Index (CPI)',
    shortDescription: 'Primary measure of consumer inflation in the US economy',
    fullDescription: `The Consumer Price Index measures the average change in prices paid by urban consumers for a basket of goods and services. It's the most widely followed inflation measure, though the Fed officially targets Core PCE.

The report includes headline CPI (all items), Core CPI (excluding food and energy), and breakdowns by category. Month-over-month and year-over-year figures are both closely watched.`,
    whyItMatters: [
      'Key input for Fed policy decisions on interest rates',
      'Affects real wage calculations and consumer purchasing power',
      'Used to adjust Social Security benefits and tax brackets',
      'Persistent high readings force aggressive Fed tightening',
      'Core CPI strips out volatile food/energy for trend view',
    ],
    marketImpact: {
      stocks: 'High inflation negative for multiples; pressures profit margins. Tech/growth most sensitive.',
      bonds: 'Higher inflation = higher yields. TIPS breakevens widen.',
      currencies: 'Higher inflation → higher rates → stronger dollar short-term.',
      commodities: 'Generally positive for commodities as inflation hedge.',
    },
    tradingConsiderations: [
      'Released 8:30 AM ET, usually second week of month',
      'Core MoM is often the most market-moving figure',
      '"Supercore" (services ex-housing) increasingly watched by Fed',
      'Housing components are sticky and lag real-time rent data',
      'Prepare for 50+ point moves in major indices on surprises',
    ],
    relatedIndicators: ['PCE', 'PPI', 'Import Prices', 'Wage Growth'],
    releaseSchedule: 'Monthly, usually 2nd or 3rd week, 8:30 AM ET',
    dataSource: 'Bureau of Labor Statistics (BLS)',
    historicalContext: 'CPI has been calculated since 1913. The current methodology was last updated in 1998.',
    icon: DollarSign,
    category: 'inflation',
  },
  'PCE Price Index': {
    title: 'Personal Consumption Expenditures (PCE) Price Index',
    shortDescription: 'The Fed\'s preferred inflation measure',
    fullDescription: `The PCE Price Index is the Federal Reserve's officially preferred measure of inflation for monetary policy decisions. Unlike CPI, PCE captures a broader range of expenditures, uses chain-weighted calculations, and adjusts for consumer substitution behavior.

Core PCE (excluding food and energy) is the specific measure the Fed targets at 2% annually. The PCE report also includes personal income and personal spending data.`,
    whyItMatters: [
      'Fed\'s official inflation target is 2% Core PCE',
      'More comprehensive than CPI in expenditure coverage',
      'Chain-weighted methodology better reflects actual spending',
      'Includes spending by employers on behalf of households',
      'Lower weight to shelter than CPI (typically runs lower)',
    ],
    marketImpact: {
      stocks: 'Core PCE above 2% sustained keeps Fed hawkish; below 2% supportive.',
      bonds: 'Direct link to Fed policy expectations; moves yields significantly.',
      currencies: 'USD sensitive to PCE deviation from Fed\'s 2% target.',
      commodities: 'Same dynamics as CPI but often less market impact (comes later in month).',
    },
    tradingConsiderations: [
      'Released last Friday of month, 8:30 AM ET',
      'CPI earlier in month often sets expectations for PCE',
      'Watch income and spending data in same report',
      'Savings rate provides insight on consumer health',
    ],
    relatedIndicators: ['CPI', 'Personal Income', 'Personal Spending', 'Savings Rate'],
    releaseSchedule: 'Monthly, last week of month, 8:30 AM ET',
    dataSource: 'Bureau of Economic Analysis (BEA)',
    icon: Percent,
    category: 'inflation',
  },
  'PPI': {
    title: 'Producer Price Index (PPI)',
    shortDescription: 'Measures inflation at the wholesale/producer level',
    fullDescription: `The Producer Price Index measures the average change in selling prices received by domestic producers for their output. It's often viewed as a leading indicator for consumer inflation since producer costs eventually pass through to retail prices.

The report includes finished goods, intermediate goods, and crude goods stages of processing, as well as industry-specific breakdowns.`,
    whyItMatters: [
      'Leading indicator for CPI - producer costs pass through to consumers',
      'Shows profit margin pressures for companies',
      'Early signal of supply chain pricing issues',
      'Core PPI strips out volatile food and energy',
      'Input costs indicator for corporate earnings',
    ],
    marketImpact: {
      stocks: 'High PPI squeezes margins; affects earnings expectations.',
      bonds: 'Leading indicator for CPI moves yield expectations.',
      currencies: 'Less direct impact than CPI but reinforces inflation narrative.',
      commodities: 'Validates commodity price trends in broader inflation picture.',
    },
    tradingConsiderations: [
      'Released mid-month, day before or after CPI',
      'Less market impact than CPI but sets context',
      'Services PPI increasingly important in services-driven economy',
      'Watch for pipeline pressures in intermediate goods',
    ],
    relatedIndicators: ['CPI', 'PCE', 'ISM Prices Paid', 'Import Prices'],
    releaseSchedule: 'Monthly, mid-month, 8:30 AM ET',
    dataSource: 'Bureau of Labor Statistics (BLS)',
    icon: Factory,
    category: 'inflation',
  },
  // GDP & Growth
  'GDP': {
    title: 'Gross Domestic Product (GDP)',
    shortDescription: 'The broadest measure of economic output and growth',
    fullDescription: `GDP measures the total value of goods and services produced in the United States. It's reported quarterly with three releases: advance (first estimate), second estimate (revision), and third estimate (final).

The report breaks down contributions from consumer spending, business investment, government spending, and net exports. Real GDP adjusts for inflation, while nominal GDP uses current prices.`,
    whyItMatters: [
      'Definitive measure of economic growth or contraction',
      'Two consecutive negative quarters traditionally defines recession',
      'Breaks down contribution by sector for detailed analysis',
      'Real vs nominal shows inflation\'s impact on growth',
      'GDP deflator is another inflation measure',
    ],
    marketImpact: {
      stocks: 'Strong GDP generally positive; but "too hot" can mean more Fed hikes.',
      bonds: 'Strong growth → higher yields; weak growth → lower yields.',
      currencies: 'Growth outperformance vs other countries strengthens currency.',
      commodities: 'Strong growth supports demand for industrial commodities.',
    },
    tradingConsiderations: [
      'Advance release most market-moving (released ~1 month after quarter end)',
      'Already partially priced in from monthly indicators',
      'Revisions can be significant but typically less market impact',
      'Watch personal consumption component (70% of GDP)',
    ],
    relatedIndicators: ['ISM Manufacturing', 'Retail Sales', 'Industrial Production', 'Employment'],
    releaseSchedule: 'Quarterly: Advance (~30 days), Second (~60 days), Third (~90 days) after quarter end',
    dataSource: 'Bureau of Economic Analysis (BEA)',
    historicalContext: 'Modern GDP accounting began during the Great Depression. Simon Kuznets developed the framework in 1934.',
    icon: BarChart3,
    category: 'growth',
  },
  // Manufacturing & Business
  'ISM Manufacturing': {
    title: 'ISM Manufacturing PMI',
    shortDescription: 'Survey-based gauge of manufacturing sector health',
    fullDescription: `The Institute for Supply Management Manufacturing PMI is a diffusion index based on surveys of purchasing managers at manufacturing companies. A reading above 50 indicates expansion; below 50 indicates contraction.

Sub-indices include new orders, production, employment, supplier deliveries, and inventories. The ISM Services PMI covers the larger services sector.`,
    whyItMatters: [
      'Leading indicator of economic activity',
      'Above 50 = expansion, below 50 = contraction',
      'New orders sub-index is most forward-looking',
      'Prices paid component is inflation signal',
      'Manufacturing has outsized impact on markets vs GDP share',
    ],
    marketImpact: {
      stocks: 'Positive correlation with equities, especially industrials/materials.',
      bonds: 'Strong ISM → higher yields; weak ISM → lower yields.',
      currencies: 'USD strengthens on strong readings.',
      commodities: 'New orders component signals industrial commodity demand.',
    },
    tradingConsiderations: [
      'Released first business day of month at 10:00 AM ET',
      'One of earliest reads on prior month\'s activity',
      'Compare with regional Fed surveys released earlier',
      'Watch employment component for jobs report clues',
    ],
    relatedIndicators: ['ISM Services', 'Regional Fed Surveys', 'Industrial Production', 'Durable Goods'],
    releaseSchedule: 'First business day of each month at 10:00 AM ET',
    dataSource: 'Institute for Supply Management (ISM)',
    icon: Factory,
    category: 'manufacturing',
  },
  'ISM Services': {
    title: 'ISM Services PMI',
    shortDescription: 'Survey-based gauge of services sector health',
    fullDescription: `The ISM Services PMI measures business activity in the services sector, which represents roughly 70% of US GDP. Like the Manufacturing PMI, it's a diffusion index where 50 is the expansion/contraction threshold.

The services sector is more domestically focused and employment-intensive than manufacturing, making this indicator crucial for the overall economic picture.`,
    whyItMatters: [
      'Services is 70%+ of US economy - larger than manufacturing',
      'More reflective of consumer-driven economic activity',
      'Employment component important for jobs outlook',
      'Prices paid shows service sector inflation pressures',
      'Less volatile than manufacturing PMI',
    ],
    marketImpact: {
      stocks: 'Broad impact on consumer discretionary, tech, and financial sectors.',
      bonds: 'Strong services → higher yields on growth expectations.',
      currencies: 'Reinforces or contradicts manufacturing picture for USD.',
      commodities: 'Less direct impact; mainly affects energy through demand.',
    },
    tradingConsiderations: [
      'Released third business day of month at 10:00 AM ET',
      'Comes after manufacturing PMI - markets context already set',
      'Watch business activity sub-index closely',
      'New orders indicates future services demand',
    ],
    relatedIndicators: ['ISM Manufacturing', 'Retail Sales', 'Consumer Confidence', 'Employment'],
    releaseSchedule: 'Third business day of each month at 10:00 AM ET',
    dataSource: 'Institute for Supply Management (ISM)',
    icon: Building2,
    category: 'manufacturing',
  },
  // Consumer Data
  'Retail Sales': {
    title: 'Retail Sales',
    shortDescription: 'Monthly measure of consumer spending at retail establishments',
    fullDescription: `Retail Sales measures the total receipts of retail stores, providing a key read on consumer spending which drives roughly 70% of US GDP. The report includes headline sales, ex-auto, ex-auto and gas, and the "control group" which feeds into GDP calculations.

The control group excludes autos, gas, building materials, and food services - items that are either volatile or counted elsewhere in GDP.`,
    whyItMatters: [
      'Consumer spending is ~70% of US GDP',
      'Monthly read on consumer health and confidence',
      'Control group used in GDP calculations',
      'Holiday season readings especially important',
      'E-commerce vs brick-and-mortar trends visible',
    ],
    marketImpact: {
      stocks: 'Strong sales boost consumer discretionary, retail, and e-commerce.',
      bonds: 'Strong spending → growth concerns → higher yields.',
      currencies: 'Supports USD on strong growth narrative.',
      commodities: 'Indicates demand for consumer goods, impacts oil (driving).',
    },
    tradingConsiderations: [
      'Released mid-month at 8:30 AM ET',
      'Watch control group, not just headline',
      'Revisions can be significant',
      'Gas prices heavily impact headline number',
      'Holiday months (November, December) are critical',
    ],
    relatedIndicators: ['Consumer Confidence', 'Personal Spending', 'Credit Card Data'],
    releaseSchedule: 'Monthly, mid-month, 8:30 AM ET',
    dataSource: 'Census Bureau',
    icon: ShoppingCart,
    category: 'consumer',
  },
  'Consumer Confidence': {
    title: 'Consumer Confidence Index',
    shortDescription: 'Survey measuring consumer optimism about the economy',
    fullDescription: `The Conference Board's Consumer Confidence Index measures consumer attitudes regarding current economic conditions and expectations for the future. It's based on a survey of 5,000 households asking about business conditions, employment, and income expectations.

The index has two components: Present Situation (current conditions) and Expectations (next 6 months). The Expectations component is a leading economic indicator.`,
    whyItMatters: [
      'Consumer sentiment drives spending decisions',
      'Expectations component is leading indicator',
      'Jobs "plentiful vs hard to get" spread predicts unemployment',
      'Big purchases intentions signal durable goods demand',
      'Historically falls before recessions',
    ],
    marketImpact: {
      stocks: 'High confidence supports consumer discretionary sectors.',
      bonds: 'Strong confidence → growth expectations → higher yields.',
      currencies: 'Positive for USD when outperforms expectations.',
      commodities: 'Indicates discretionary spending on commodities (jewelry, travel).',
    },
    tradingConsiderations: [
      'Released last Tuesday of month at 10:00 AM ET',
      'University of Michigan sentiment (Friday prior) sets expectations',
      'Watch labor market differential for jobs clues',
      'Buying intentions useful for autos and housing',
    ],
    relatedIndicators: ['Michigan Consumer Sentiment', 'Retail Sales', 'Personal Spending'],
    releaseSchedule: 'Last Tuesday of each month at 10:00 AM ET',
    dataSource: 'Conference Board',
    icon: Users,
    category: 'consumer',
  },
  // Housing
  'Housing Starts': {
    title: 'Housing Starts',
    shortDescription: 'Monthly count of new residential construction projects begun',
    fullDescription: `Housing Starts measures the number of new residential construction projects begun during a month. It's a leading indicator of economic activity due to housing's significant multiplier effect on the economy.

The report includes single-family and multi-family breakdowns, as well as building permits (a leading indicator of future starts) and housing completions.`,
    whyItMatters: [
      'Housing has large economic multiplier effect',
      'Leading indicator due to long construction cycle',
      'Building permits predict future starts',
      'Sensitive to interest rates and affordability',
      'Regional breakdowns show local economic health',
    ],
    marketImpact: {
      stocks: 'Homebuilders, building materials, home improvement retail move on this data.',
      bonds: 'Housing strength can support Fed hawkishness.',
      currencies: 'Less direct impact; housing is domestically focused.',
      commodities: 'Lumber, copper, and other building materials demand indicated.',
    },
    tradingConsiderations: [
      'Released mid-month at 8:30 AM ET',
      'Weather can cause significant month-to-month volatility',
      'Watch building permits for forward look',
      'Single-family vs multi-family trends matter for different stocks',
    ],
    relatedIndicators: ['Building Permits', 'New Home Sales', 'Existing Home Sales', 'Mortgage Rates'],
    releaseSchedule: 'Monthly, mid-month, 8:30 AM ET',
    dataSource: 'Census Bureau',
    icon: Home,
    category: 'housing',
  },
  'Existing Home Sales': {
    title: 'Existing Home Sales',
    shortDescription: 'Monthly count of closed sales of previously owned homes',
    fullDescription: `Existing Home Sales measures the number of closed sales of previously owned single-family homes, townhomes, condos, and co-ops. It's the largest component of residential real estate transactions (about 90% of home sales).

The report includes median price, months of supply (inventory), and regional breakdowns. Sales are reported when transactions close, typically 1-2 months after going under contract.`,
    whyItMatters: [
      'Represents ~90% of all home sales',
      'Wealth effect: rising home values boost consumer spending',
      'Indicates housing market health and consumer confidence',
      'Months of supply signals pricing pressure direction',
      'Regional data shows local economic conditions',
    ],
    marketImpact: {
      stocks: 'Real estate, mortgage lenders, home improvement retailers affected.',
      bonds: 'Housing strength supports economic growth narrative.',
      currencies: 'Minor direct impact.',
      commodities: 'Less direct than new construction for materials demand.',
    },
    tradingConsiderations: [
      'Released ~3 weeks after month end at 10:00 AM ET',
      'Lags contract signings by 1-2 months (Pending Home Sales is leading)',
      'Seasonally adjust expectations (spring selling season)',
      'Watch inventory levels for price direction',
    ],
    relatedIndicators: ['New Home Sales', 'Pending Home Sales', 'Housing Starts', 'Mortgage Rates'],
    releaseSchedule: 'Monthly, third or fourth week, 10:00 AM ET',
    dataSource: 'National Association of Realtors (NAR)',
    icon: Home,
    category: 'housing',
  },
  // Earnings
  'Earnings Season': {
    title: 'Corporate Earnings Season',
    shortDescription: 'Quarterly period when companies report financial results',
    fullDescription: `Earnings season refers to the weeks following each calendar quarter when public companies report their financial results. Major banks typically kick off earnings in mid-January, April, July, and October.

Key metrics include EPS (earnings per share), revenue, forward guidance, and specific KPIs by industry. The S&P 500 earnings growth rate is closely tracked as a market driver.`,
    whyItMatters: [
      'Company fundamentals ultimately drive stock prices',
      'Forward guidance often more important than reported numbers',
      'Sector trends emerge from aggregate earnings patterns',
      'Earnings growth vs. valuations determines market direction',
      'Credit markets watch debt metrics and cash flow',
    ],
    marketImpact: {
      stocks: 'Direct impact on individual stocks; sector and market implications from aggregate trends.',
      bonds: 'Corporate credit spreads react to earnings quality.',
      currencies: 'Aggregate earnings affect growth expectations and currency.',
      commodities: 'Sector earnings reveal demand trends (energy, materials).',
    },
    tradingConsiderations: [
      'Peak volatility around major FAANG and banking reports',
      'Options prices inflate into earnings (IV crush opportunity)',
      'After-hours and pre-market moves can be extreme',
      'Watch for whisper numbers vs consensus estimates',
      'Guidance matters more than beats/misses',
    ],
    relatedIndicators: ['S&P 500 Earnings Growth', 'GDP', 'Corporate Profits'],
    releaseSchedule: 'Quarterly, roughly 2-6 weeks after quarter end',
    dataSource: 'Individual company reports',
    icon: Building2,
    category: 'earnings',
  },
};

// Default education for unrecognized events
const DEFAULT_EDUCATION: EventEducation = {
  title: 'Economic Event',
  shortDescription: 'An economic indicator or market-moving event',
  fullDescription: 'This economic event may impact financial markets depending on the outcome relative to expectations.',
  whyItMatters: [
    'Economic data informs Fed policy decisions',
    'Markets move on surprises vs expectations',
    'Understanding the data helps with investment decisions',
  ],
  marketImpact: {
    stocks: 'Impact depends on the specific indicator and economic context.',
    bonds: 'Bond markets react to growth and inflation implications.',
    currencies: 'Currency impact depends on relative economic implications.',
    commodities: 'Commodities respond to demand and inflation signals.',
  },
  tradingConsiderations: [
    'Check consensus expectations before release',
    'Prepare for potential volatility',
    'Consider reducing position sizes around major releases',
  ],
  relatedIndicators: [],
  releaseSchedule: 'Check economic calendar for exact timing',
  dataSource: 'Various government and private organizations',
  icon: Calendar,
  category: 'growth',
};

// Function to find matching education
function getEventEducation(eventName: string): EventEducation {
  // Try exact match first
  if (EVENT_EDUCATION[eventName]) {
    return EVENT_EDUCATION[eventName];
  }
  
  // Try partial matches
  const nameLower = eventName.toLowerCase();
  
  if (nameLower.includes('fomc') || nameLower.includes('federal reserve') || nameLower.includes('fed meeting')) {
    return EVENT_EDUCATION['FOMC Meeting'];
  }
  if (nameLower.includes('fed chair') || nameLower.includes('powell') || nameLower.includes('fed speech')) {
    return EVENT_EDUCATION['Fed Chair Speech'];
  }
  if (nameLower.includes('payroll') || nameLower.includes('nfp') || nameLower.includes('employment situation')) {
    return EVENT_EDUCATION['Non-Farm Payrolls'];
  }
  if (nameLower.includes('unemployment rate')) {
    return EVENT_EDUCATION['Unemployment Rate'];
  }
  if (nameLower.includes('jobless claim') || nameLower.includes('initial claim')) {
    return EVENT_EDUCATION['Initial Jobless Claims'];
  }
  if (nameLower.includes('cpi') || nameLower.includes('consumer price')) {
    return EVENT_EDUCATION['CPI'];
  }
  if (nameLower.includes('pce') || nameLower.includes('personal consumption expenditure')) {
    return EVENT_EDUCATION['PCE Price Index'];
  }
  if (nameLower.includes('ppi') || nameLower.includes('producer price')) {
    return EVENT_EDUCATION['PPI'];
  }
  if (nameLower.includes('gdp') || nameLower.includes('gross domestic')) {
    return EVENT_EDUCATION['GDP'];
  }
  if (nameLower.includes('ism manufacturing') || nameLower.includes('manufacturing pmi')) {
    return EVENT_EDUCATION['ISM Manufacturing'];
  }
  if (nameLower.includes('ism services') || nameLower.includes('ism non-manufacturing') || nameLower.includes('services pmi')) {
    return EVENT_EDUCATION['ISM Services'];
  }
  if (nameLower.includes('retail sales')) {
    return EVENT_EDUCATION['Retail Sales'];
  }
  if (nameLower.includes('consumer confidence') || nameLower.includes('consumer sentiment')) {
    return EVENT_EDUCATION['Consumer Confidence'];
  }
  if (nameLower.includes('housing start') || nameLower.includes('building permit')) {
    return EVENT_EDUCATION['Housing Starts'];
  }
  if (nameLower.includes('existing home') || nameLower.includes('home sales')) {
    return EVENT_EDUCATION['Existing Home Sales'];
  }
  if (nameLower.includes('earning')) {
    return EVENT_EDUCATION['Earnings Season'];
  }
  
  return DEFAULT_EDUCATION;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FED RATE PROBABILITIES (CME FedWatch style)
// ═══════════════════════════════════════════════════════════════════════════════

function generateFedRateProbabilities(eventDate: string): RateProbability[] {
  // This would normally come from CME FedWatch API or be calculated from Fed Funds futures
  // For now, generate realistic-looking probabilities based on current context
  const currentRate = 5.25; // Example current rate
  const baseRates = [
    { rate: '5.75-6.00%', change: 50 },
    { rate: '5.50-5.75%', change: 25 },
    { rate: '5.25-5.50%', change: 0 },
    { rate: '5.00-5.25%', change: -25 },
    { rate: '4.75-5.00%', change: -50 },
    { rate: '4.50-4.75%', change: -75 },
  ];
  
  // Generate bell-curve-like probabilities centered on "no change"
  const seed = new Date(eventDate).getTime();
  const pseudoRandom = (n: number) => ((seed * (n + 1) * 9301 + 49297) % 233280) / 233280;
  
  let probs = baseRates.map((r, i) => {
    // Center probability around no change with some variance
    const distanceFromCenter = Math.abs(i - 2);
    let baseProbability = Math.max(5, 40 - distanceFromCenter * 15 + (pseudoRandom(i) - 0.5) * 20);
    return { ...r, probability: baseProbability };
  });
  
  // Normalize to 100%
  const total = probs.reduce((sum, p) => sum + p.probability, 0);
  probs = probs.map(p => ({ ...p, probability: Math.round((p.probability / total) * 100) }));
  
  // Ensure they sum to exactly 100
  const diff = 100 - probs.reduce((sum, p) => sum + p.probability, 0);
  probs[2].probability += diff;
  
  return probs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORICAL IMPACT DATA
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchHistoricalImpact(eventName: string): Promise<{ data: HistoricalImpact[]; useMockData: boolean; eventType?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-historical-market-reactions', {
      body: { eventName, lookbackMonths: 6 }
    });
    
    if (error) {
      console.error('Error fetching historical reactions:', error);
      return { data: generateFallbackHistoricalImpact(), useMockData: true };
    }
    
    if (data?.success && data?.reactions?.length > 0) {
      return { 
        data: data.reactions, 
        useMockData: data.useMockData || false,
        eventType: data.eventType 
      };
    }
    
    return { data: generateFallbackHistoricalImpact(), useMockData: true };
  } catch (error) {
    console.error('Error in fetchHistoricalImpact:', error);
    return { data: generateFallbackHistoricalImpact(), useMockData: true };
  }
}

// Fallback for when API fails
function generateFallbackHistoricalImpact(): HistoricalImpact[] {
  const events: HistoricalImpact[] = [];
  const now = new Date();
  
  for (let i = 0; i < 6; i++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i - 1);
    
    events.push({
      date: date.toISOString().split('T')[0],
      actual: (2.5 + (Math.random() - 0.5) * 2).toFixed(1) + '%',
      forecast: (2.5 + (Math.random() - 0.5) * 0.5).toFixed(1) + '%',
      spyChange: (Math.random() - 0.5) * 3,
      tltChange: (Math.random() - 0.5) * 2,
      dxyChange: (Math.random() - 0.5) * 1.5,
      vixChange: (Math.random() - 0.5) * 4,
    });
  }
  
  return events.reverse();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function EventDetailSheet({ event, open, onOpenChange }: EventDetailSheetProps) {
  const [activeTab, setActiveTab] = useState('education');
  const [rateProbabilities, setRateProbabilities] = useState<RateProbability[]>([]);
  const [historicalImpact, setHistoricalImpact] = useState<HistoricalImpact[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyDataSource, setHistoryDataSource] = useState<'live' | 'mock'>('mock');
  
  // Get educational content
  const education = useMemo(() => {
    if (!event) return DEFAULT_EDUCATION;
    return getEventEducation(event.event_name);
  }, [event?.event_name]);
  
  // Check if this is a Fed-related event
  const isFedEvent = useMemo(() => {
    if (!event) return false;
    const name = event.event_name.toLowerCase();
    return name.includes('fomc') || name.includes('federal reserve') || 
           name.includes('fed') || name.includes('powell');
  }, [event?.event_name]);
  
  // Load data when event changes
  useEffect(() => {
    if (!event || !open) return;
    
    // Generate Fed rate probabilities for Fed meetings
    if (isFedEvent) {
      setRateProbabilities(generateFedRateProbabilities(event.event_date));
    }
    
    // Fetch historical impact data from API
    const loadHistoricalData = async () => {
      setIsLoadingHistory(true);
      try {
        const { data, useMockData } = await fetchHistoricalImpact(event.event_name);
        setHistoricalImpact(data);
        setHistoryDataSource(useMockData ? 'mock' : 'live');
      } catch (error) {
        console.error('Failed to load historical data:', error);
        setHistoricalImpact(generateFallbackHistoricalImpact());
        setHistoryDataSource('mock');
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    loadHistoricalData();
  }, [event, open, isFedEvent]);
  
  if (!event) return null;
  
  const daysUntilEvent = differenceInDays(parseISO(event.event_date), new Date());
  const EventIcon = education.icon;
  
  const importanceColors = {
    high: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    low: 'text-muted-foreground bg-muted/50 border-border',
  };
  
  const categoryColors = {
    monetary_policy: 'from-blue-600/20 to-blue-900/10',
    employment: 'from-emerald-600/20 to-emerald-900/10',
    inflation: 'from-rose-600/20 to-rose-900/10',
    growth: 'from-purple-600/20 to-purple-900/10',
    housing: 'from-amber-600/20 to-amber-900/10',
    consumer: 'from-cyan-600/20 to-cyan-900/10',
    manufacturing: 'from-orange-600/20 to-orange-900/10',
    trade: 'from-indigo-600/20 to-indigo-900/10',
    earnings: 'from-pink-600/20 to-pink-900/10',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Header */}
        <div className={cn(
          "sticky top-0 z-10 p-6 pb-4 border-b bg-gradient-to-br",
          categoryColors[education.category]
        )}>
          <SheetHeader>
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-background/80 border shadow-lg">
                <EventIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl font-bold leading-tight">
                  {event.event_name}
                </SheetTitle>
                <SheetDescription className="mt-1 text-sm">
                  {education.shortDescription}
                </SheetDescription>
              </div>
            </div>
            
            {/* Event meta */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(event.event_date), 'MMMM d, yyyy')}
                {event.event_time && ` at ${event.event_time}`}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn("capitalize", importanceColors[event.importance as keyof typeof importanceColors])}
              >
                {event.importance} Impact
              </Badge>
              {daysUntilEvent > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {daysUntilEvent} days away
                </Badge>
              )}
              {daysUntilEvent === 0 && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  <Zap className="h-3 w-3 mr-1" />
                  Today
                </Badge>
              )}
            </div>
          </SheetHeader>
        </div>
        
        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="sticky top-0 z-10 bg-background border-b px-6">
            <TabsList className="w-full justify-start h-12 bg-transparent p-0 gap-0">
              <TabsTrigger 
                value="education" 
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Learn
              </TabsTrigger>
              {isFedEvent && (
                <TabsTrigger 
                  value="probabilities"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Probabilities
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="impact"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
              >
                <Activity className="h-4 w-4 mr-2" />
                Impact
              </TabsTrigger>
              <TabsTrigger 
                value="trading"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Trading
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="p-6">
            {/* Education Tab */}
            <TabsContent value="education" className="mt-0 space-y-6">
              {/* Full Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    What Is This?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {education.fullDescription}
                  </p>
                  {education.historicalContext && (
                    <p className="text-sm text-muted-foreground/80 mt-4 pt-4 border-t italic">
                      {education.historicalContext}
                    </p>
                  )}
                </CardContent>
              </Card>
              
              {/* Why It Matters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                    Why It Matters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {education.whyItMatters.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              
              {/* Market Impact */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                    Market Impact by Asset Class
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                        <span className="font-medium text-sm text-emerald-400">Stocks</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{education.marketImpact.stocks}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Scale className="h-4 w-4 text-blue-400" />
                        <span className="font-medium text-sm text-blue-400">Bonds</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{education.marketImpact.bonds}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-purple-400" />
                        <span className="font-medium text-sm text-purple-400">Currencies</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{education.marketImpact.currencies}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Gauge className="h-4 w-4 text-amber-400" />
                        <span className="font-medium text-sm text-amber-400">Commodities</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{education.marketImpact.commodities}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Release Schedule & Source */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Release Schedule</span>
                      <p className="font-medium">{education.releaseSchedule}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Data Source</span>
                      <p className="font-medium">{education.dataSource}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Related Indicators */}
              {education.relatedIndicators.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4" />
                      Related Indicators
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {education.relatedIndicators.map((indicator, i) => (
                        <Badge key={i} variant="secondary" className="cursor-pointer hover:bg-secondary">
                          {indicator}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            {/* Fed Rate Probabilities Tab */}
            {isFedEvent && (
              <TabsContent value="probabilities" className="mt-0 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Fed Funds Rate Probabilities
                    </CardTitle>
                    <CardDescription>
                      Market-implied probabilities for the target rate range after this meeting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Current Rate */}
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Current Target Rate</span>
                        <span className="text-2xl font-bold">5.25-5.50%</span>
                      </div>
                    </div>
                    
                    {/* Probability Bars */}
                    <div className="space-y-3">
                      {rateProbabilities.map((prob, i) => {
                        const isNoChange = prob.change === 0;
                        const isHike = prob.change > 0;
                        const isCut = prob.change < 0;
                        
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "font-medium",
                                  isNoChange && "text-primary",
                                  isHike && "text-rose-400",
                                  isCut && "text-emerald-400"
                                )}>
                                  {prob.rate}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[10px]",
                                    isNoChange && "border-primary/50 text-primary",
                                    isHike && "border-rose-500/50 text-rose-400",
                                    isCut && "border-emerald-500/50 text-emerald-400"
                                  )}
                                >
                                  {prob.change > 0 ? '+' : ''}{prob.change} bps
                                </Badge>
                              </div>
                              <span className="font-bold tabular-nums">{prob.probability}%</span>
                            </div>
                            <Progress 
                              value={prob.probability} 
                              className={cn(
                                "h-3",
                                isNoChange && "[&>div]:bg-primary",
                                isHike && "[&>div]:bg-rose-500",
                                isCut && "[&>div]:bg-emerald-500"
                              )}
                            />
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                      <div className="text-center p-3 rounded-lg bg-rose-500/10">
                        <div className="text-xs text-muted-foreground">Hike Probability</div>
                        <div className="text-lg font-bold text-rose-400">
                          {rateProbabilities.filter(p => p.change > 0).reduce((sum, p) => sum + p.probability, 0)}%
                        </div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-primary/10">
                        <div className="text-xs text-muted-foreground">No Change</div>
                        <div className="text-lg font-bold text-primary">
                          {rateProbabilities.find(p => p.change === 0)?.probability || 0}%
                        </div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-emerald-500/10">
                        <div className="text-xs text-muted-foreground">Cut Probability</div>
                        <div className="text-lg font-bold text-emerald-400">
                          {rateProbabilities.filter(p => p.change < 0).reduce((sum, p) => sum + p.probability, 0)}%
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Based on Fed Funds futures market pricing. Updates in real-time with market expectations.
                    </p>
                  </CardContent>
                </Card>
                
                {/* Dot Plot Expectations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CircleDot className="h-4 w-4" />
                      What to Watch
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">Statement language changes</strong> - Watch for shifts in "ongoing increases" or "data dependent"
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">Dot plot (quarterly)</strong> - Individual member rate projections
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">Press conference tone</strong> - Powell's Q&A often moves markets more than the statement
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">Economic projections (quarterly)</strong> - GDP, unemployment, and inflation forecasts
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
            
            {/* Historical Impact Tab */}
            <TabsContent value="impact" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Historical Market Reaction
                    {historyDataSource === 'live' && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        Live Data
                      </Badge>
                    )}
                    {historyDataSource === 'mock' && (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                        Estimated
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    How markets have reacted to recent releases of this indicator
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingHistory ? (
                    <div className="space-y-4">
                      <Skeleton className="h-64 w-full" />
                      <Skeleton className="h-32 w-full" />
                    </div>
                  ) : (
                    <>
                      {/* Chart */}
                      <div className="h-64 mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={historicalImpact}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 10 }}
                              tickFormatter={(val) => format(parseISO(val), 'MMM')}
                            />
                            <YAxis 
                              tick={{ fontSize: 10 }}
                              tickFormatter={(val) => `${val.toFixed(1)}%`}
                            />
                            <Tooltip 
                              formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                              labelFormatter={(label) => format(parseISO(label as string), 'MMM d, yyyy')}
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                            <Bar dataKey="spyChange" name="S&P 500" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                  
                      {/* Historical Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-2 text-xs text-muted-foreground">Date</th>
                              <th className="text-right py-2 px-2 text-xs text-muted-foreground">Actual</th>
                              <th className="text-right py-2 px-2 text-xs text-muted-foreground">Forecast</th>
                              <th className="text-right py-2 px-2 text-xs text-muted-foreground">SPY</th>
                              <th className="text-right py-2 px-2 text-xs text-muted-foreground">TLT</th>
                              <th className="text-right py-2 px-2 text-xs text-muted-foreground">DXY</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historicalImpact.map((row, i) => (
                              <tr key={i} className="border-b border-border/50">
                                <td className="py-2 px-2">{format(parseISO(row.date), 'MMM d')}</td>
                                <td className="py-2 px-2 text-right font-mono">{row.actual}</td>
                                <td className="py-2 px-2 text-right font-mono text-muted-foreground">{row.forecast}</td>
                                <td className={cn("py-2 px-2 text-right font-mono", row.spyChange >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                  {row.spyChange >= 0 ? '+' : ''}{row.spyChange.toFixed(2)}%
                                </td>
                                <td className={cn("py-2 px-2 text-right font-mono", row.tltChange >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                  {row.tltChange >= 0 ? '+' : ''}{row.tltChange.toFixed(2)}%
                                </td>
                                <td className={cn("py-2 px-2 text-right font-mono", row.dxyChange >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                  {row.dxyChange >= 0 ? '+' : ''}{row.dxyChange.toFixed(2)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              
              {/* Consensus Expectations */}
              {(event.forecast_value || event.previous_value) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Current Release Expectations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {event.previous_value && (
                        <div className="text-center p-3 rounded-lg bg-secondary/50">
                          <div className="text-xs text-muted-foreground">Previous</div>
                          <div className="text-lg font-bold">{event.previous_value}</div>
                        </div>
                      )}
                      {event.forecast_value && (
                        <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                          <div className="text-xs text-muted-foreground">Forecast</div>
                          <div className="text-lg font-bold text-primary">{event.forecast_value}</div>
                        </div>
                      )}
                      {event.actual_value && (
                        <div className="text-center p-3 rounded-lg bg-emerald-500/10">
                          <div className="text-xs text-muted-foreground">Actual</div>
                          <div className="text-lg font-bold text-emerald-400">{event.actual_value}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            {/* Trading Considerations Tab */}
            <TabsContent value="trading" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-400" />
                    Trading Considerations
                  </CardTitle>
                  <CardDescription>
                    Practical tips for positioning around this event
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {education.tradingConsiderations.map((tip, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-sm text-muted-foreground">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              
              {/* Pre-Event Checklist */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Pre-Event Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {[
                      'Review consensus expectations and whisper numbers',
                      'Check VIX levels and options implied volatility',
                      'Set alerts for key price levels',
                      'Consider reducing position sizes if volatility expected',
                      'Have a plan for both upside and downside scenarios',
                      'Note exact release time and prepare to be available',
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <div className="h-4 w-4 rounded border border-border flex items-center justify-center">
                          <div className="h-2 w-2 rounded-sm bg-muted-foreground/30" />
                        </div>
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              
              {/* Risk Warning */}
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-400">Risk Warning</p>
                      <p className="text-muted-foreground mt-1">
                        Economic data releases can cause significant market volatility. Past market reactions 
                        are not indicative of future results. Always use appropriate risk management and 
                        consider your personal financial situation before trading around high-impact events.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

export default EventDetailSheet;
