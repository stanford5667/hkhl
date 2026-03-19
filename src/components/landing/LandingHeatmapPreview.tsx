import { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import { Globe, ChevronRight, TrendingUp, TrendingDown, Minus, X, BarChart3, Zap, ArrowUpRight, ArrowDownRight, Newspaper, AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const NUMERIC_TO_ALPHA2: Record<string, string> = {
  '840': 'US', '124': 'CA', '484': 'MX', '076': 'BR', '604': 'PE',
  '826': 'GB', '372': 'IE', '250': 'FR', '276': 'DE', '724': 'ES', '380': 'IT',
  '528': 'NL', '752': 'SE', '578': 'NO', '208': 'DK', '756': 'CH', '643': 'RU',
  '156': 'CN', '392': 'JP', '410': 'KR', '158': 'TW', '356': 'IN', '376': 'IL',
  '682': 'SA', '784': 'AE', '702': 'SG', '344': 'HK', '036': 'AU', '710': 'ZA',
  '360': 'ID', '032': 'AR', '170': 'CO', '566': 'NG', '404': 'KE',
  '764': 'TH', '704': 'VN', '608': 'PH', '458': 'MY', '616': 'PL',
  '364': 'IR', '368': 'IQ',
};

interface MockRegion {
  code: string;
  name: string;
  sentiment: 'bullish' | 'bearish' | 'neutral' | 'emerging';
  theme: string;
  intensity: number;
  tickers: { symbol: string; name: string; change: number }[];
  catalysts: string[];
  gdp: string;
  inflation: string;
}

const MOCK_REGIONS: MockRegion[] = [
  { code: 'US', name: 'United States', sentiment: 'bullish', theme: 'AI & Tech Dominance', intensity: 92,
    tickers: [{ symbol: 'NVDA', name: 'NVIDIA', change: 4.2 }, { symbol: 'MSFT', name: 'Microsoft', change: 1.8 }, { symbol: 'GOOGL', name: 'Alphabet', change: 2.1 }, { symbol: 'META', name: 'Meta', change: 3.4 }],
    catalysts: ['Fed rate decision ahead', 'AI capex acceleration', 'Strong labor market'], gdp: '2.8%', inflation: '2.4%' },
  { code: 'CN', name: 'China', sentiment: 'emerging', theme: 'EV & Battery Supply Chain', intensity: 78,
    tickers: [{ symbol: 'BYDDY', name: 'BYD Co', change: 5.1 }, { symbol: 'NIO', name: 'NIO Inc', change: -2.3 }, { symbol: 'XPEV', name: 'XPeng', change: 1.9 }, { symbol: 'LI', name: 'Li Auto', change: 3.2 }],
    catalysts: ['Stimulus package expansion', 'EV export surge', 'Battery tech breakthrough'], gdp: '5.2%', inflation: '0.3%' },
  { code: 'JP', name: 'Japan', sentiment: 'bullish', theme: 'Semiconductor Renaissance', intensity: 74,
    tickers: [{ symbol: 'TM', name: 'Toyota', change: 1.4 }, { symbol: 'SONY', name: 'Sony Group', change: 2.8 }, { symbol: '8035.T', name: 'Tokyo Electron', change: 3.6 }, { symbol: '6857.T', name: 'Advantest', change: 4.1 }],
    catalysts: ['BOJ policy normalization', 'TSMC fab construction', 'Yen stabilization'], gdp: '1.9%', inflation: '2.8%' },
  { code: 'IR', name: 'Iran', sentiment: 'bearish', theme: 'Sanctions & Energy Risk', intensity: 65,
    tickers: [{ symbol: 'USO', name: 'US Oil Fund', change: -1.2 }, { symbol: 'XLE', name: 'Energy Select', change: -0.8 }, { symbol: 'OXY', name: 'Occidental', change: -1.5 }, { symbol: 'COP', name: 'ConocoPhillips', change: -0.6 }],
    catalysts: ['Nuclear deal uncertainty', 'Regional conflict escalation', 'Oil supply disruption risk'], gdp: '3.1%', inflation: '35%' },
  { code: 'DE', name: 'Germany', sentiment: 'neutral', theme: 'Industrial Restructuring', intensity: 55,
    tickers: [{ symbol: 'SIEGY', name: 'Siemens', change: 0.9 }, { symbol: 'BASFY', name: 'BASF', change: -0.4 }, { symbol: 'SAP', name: 'SAP SE', change: 2.1 }, { symbol: 'VWAGY', name: 'Volkswagen', change: -1.2 }],
    catalysts: ['Energy transition costs', 'Auto sector EV pivot', 'ECB rate path'], gdp: '0.2%', inflation: '2.2%' },
  { code: 'IN', name: 'India', sentiment: 'bullish', theme: 'Digital Infrastructure Boom', intensity: 82,
    tickers: [{ symbol: 'INFY', name: 'Infosys', change: 2.4 }, { symbol: 'WIT', name: 'Wipro', change: 1.1 }, { symbol: 'INDA', name: 'iShares India', change: 1.8 }, { symbol: 'SMIN', name: 'India Small-Cap', change: 2.9 }],
    catalysts: ['UPI payments growth', 'Manufacturing shift from China', 'Demographics dividend'], gdp: '7.6%', inflation: '4.8%' },
  { code: 'BR', name: 'Brazil', sentiment: 'emerging', theme: 'Commodities Super Cycle', intensity: 68,
    tickers: [{ symbol: 'EWZ', name: 'iShares Brazil', change: 1.5 }, { symbol: 'VALE', name: 'Vale SA', change: 2.8 }, { symbol: 'PBR', name: 'Petrobras', change: 1.2 }, { symbol: 'ITUB', name: 'Itaú Unibanco', change: 0.9 }],
    catalysts: ['Selic rate cuts', 'Iron ore demand', 'Agribusiness expansion'], gdp: '2.9%', inflation: '4.5%' },
  { code: 'GB', name: 'United Kingdom', sentiment: 'neutral', theme: 'Fintech & Green Finance', intensity: 52,
    tickers: [{ symbol: 'EWU', name: 'iShares UK', change: 0.3 }, { symbol: 'HSBC', name: 'HSBC', change: 0.7 }, { symbol: 'BP', name: 'BP plc', change: -0.5 }, { symbol: 'AZN', name: 'AstraZeneca', change: 1.3 }],
    catalysts: ['BOE rate trajectory', 'London fintech growth', 'Green bond issuance'], gdp: '0.6%', inflation: '3.4%' },
  { code: 'AU', name: 'Australia', sentiment: 'bullish', theme: 'Critical Minerals', intensity: 60,
    tickers: [{ symbol: 'EWA', name: 'iShares Australia', change: 1.1 }, { symbol: 'BHP', name: 'BHP Group', change: 1.9 }, { symbol: 'RIO', name: 'Rio Tinto', change: 1.5 }, { symbol: 'FMG', name: 'Fortescue', change: 2.3 }],
    catalysts: ['Lithium demand surge', 'China stimulus spillover', 'Rare earth supply'], gdp: '1.5%', inflation: '3.6%' },
  { code: 'KR', name: 'South Korea', sentiment: 'bullish', theme: 'Memory Chip Upcycle', intensity: 70,
    tickers: [{ symbol: 'EWY', name: 'iShares Korea', change: 2.1 }, { symbol: '005930.KS', name: 'Samsung', change: 3.2 }, { symbol: '000660.KS', name: 'SK Hynix', change: 4.5 }, { symbol: 'LG', name: 'LG Corp', change: 1.8 }],
    catalysts: ['HBM demand explosion', 'AI server build-out', 'Won strengthening'], gdp: '2.2%', inflation: '2.6%' },
  { code: 'SA', name: 'Saudi Arabia', sentiment: 'emerging', theme: 'Vision 2030 Diversification', intensity: 62,
    tickers: [{ symbol: 'KSA', name: 'iShares Saudi', change: 0.8 }, { symbol: '2222.SR', name: 'Aramco', change: 0.3 }, { symbol: 'NEOM', name: 'NEOM Project', change: 0 }, { symbol: 'STC', name: 'Saudi Telecom', change: 1.1 }],
    catalysts: ['Tourism megaprojects', 'IPO pipeline', 'Oil price stabilization'], gdp: '4.1%', inflation: '1.6%' },
  { code: 'IL', name: 'Israel', sentiment: 'neutral', theme: 'Cyber & Defense Tech', intensity: 58,
    tickers: [{ symbol: 'EIS', name: 'iShares Israel', change: -0.4 }, { symbol: 'CYBR', name: 'CyberArk', change: 2.7 }, { symbol: 'CHKP', name: 'Check Point', change: 1.4 }, { symbol: 'MNDY', name: 'Monday.com', change: 1.9 }],
    catalysts: ['Cybersecurity demand', 'Regional tensions', 'Tech sector resilience'], gdp: '2.0%', inflation: '3.2%' },
];

const SENTIMENT_FILLS: Record<string, string> = {
  bullish: '#10b981',
  bearish: '#f43f5e',
  neutral: '#f59e0b',
  emerging: '#3b82f6',
};

const SENTIMENT_ICONS: Record<string, typeof TrendingUp> = {
  bullish: TrendingUp,
  bearish: TrendingDown,
  neutral: Minus,
  emerging: TrendingUp,
};

const LABEL_OFFSETS: Record<string, { dx: number; dy: number }> = {
  US: { dx: -60, dy: 15 },
  CN: { dx: 15, dy: -20 },
  JP: { dx: 15, dy: 5 },
  IR: { dx: -70, dy: -15 },
  IN: { dx: 15, dy: 15 },
  DE: { dx: -70, dy: -20 },
};

// HUD callout cards that appear on the map with blinking indicators
interface HudCallout {
  code: string;
  type: 'alert' | 'watch' | 'opportunity';
  headline: string;
  summary: string;
}

const HUD_CALLOUTS: HudCallout[] = [
  { code: 'US', type: 'opportunity', headline: 'AI Capex Surge', summary: 'NVDA, MSFT leading $200B+ AI infrastructure build-out' },
  { code: 'CN', type: 'watch', headline: 'Stimulus Watch', summary: 'PBoC expected to announce new easing measures this week' },
  { code: 'JP', type: 'opportunity', headline: 'Chip Revival', summary: 'TSMC Arizona + Tokyo Electron orders at record highs' },
  { code: 'IR', type: 'alert', headline: 'Geopolitical Risk', summary: 'Oil supply disruption risk elevated — energy sector volatile' },
];

const HUD_COLORS = {
  alert: { bg: 'rgba(244,63,94,0.12)', border: '#f43f5e', text: '#fda4af', icon: AlertTriangle },
  watch: { bg: 'rgba(59,130,246,0.12)', border: '#3b82f6', text: '#93c5fd', icon: Eye },
  opportunity: { bg: 'rgba(16,185,129,0.12)', border: '#10b981', text: '#6ee7b7', icon: TrendingUp },
};

// HUD callout offsets (percentage-based from centroid, separate from label offsets)
const HUD_OFFSETS: Record<string, { dx: number; dy: number }> = {
  US: { dx: -120, dy: -50 },
  CN: { dx: 40, dy: -55 },
  JP: { dx: 40, dy: 20 },
  IR: { dx: -130, dy: 10 },
};

// Recent news items
interface NewsItem {
  id: string;
  time: string;
  region: string;
  regionCode: string;
  headline: string;
  sentiment: 'bullish' | 'bearish' | 'neutral' | 'emerging';
  tickers: string[];
}

const MOCK_NEWS: NewsItem[] = [
  { id: '1', time: '2m ago', region: 'US', regionCode: 'US', headline: 'NVIDIA announces next-gen Blackwell Ultra chip, shares surge 4.2% in pre-market', sentiment: 'bullish', tickers: ['NVDA', 'AMD'] },
  { id: '2', time: '8m ago', region: 'China', regionCode: 'CN', headline: 'PBoC signals fresh stimulus package targeting EV and green energy sectors', sentiment: 'emerging', tickers: ['BYDDY', 'NIO'] },
  { id: '3', time: '15m ago', region: 'Iran', regionCode: 'IR', headline: 'Strait of Hormuz tensions rise as naval exercises expand — oil futures spike', sentiment: 'bearish', tickers: ['USO', 'XLE'] },
  { id: '4', time: '22m ago', region: 'Japan', regionCode: 'JP', headline: 'BOJ holds rates steady, signals gradual normalization path through 2026', sentiment: 'bullish', tickers: ['TM', 'SONY'] },
  { id: '5', time: '31m ago', region: 'India', regionCode: 'IN', headline: 'India UPI transactions hit record 18B monthly, fintech boom accelerates', sentiment: 'bullish', tickers: ['INFY', 'INDA'] },
  { id: '6', time: '45m ago', region: 'Germany', regionCode: 'DE', headline: 'ECB rate decision preview: markets pricing in 25bp cut amid weak PMI data', sentiment: 'neutral', tickers: ['SAP', 'SIEGY'] },
  { id: '7', time: '1h ago', region: 'Brazil', regionCode: 'BR', headline: 'Vale iron ore shipments beat estimates, commodity super-cycle thesis strengthens', sentiment: 'emerging', tickers: ['VALE', 'EWZ'] },
  { id: '8', time: '1h ago', region: 'S. Korea', regionCode: 'KR', headline: 'SK Hynix HBM4 production begins ahead of schedule, Samsung follows', sentiment: 'bullish', tickers: ['000660.KS', '005930.KS'] },
];

interface CountryFeature extends Feature<Geometry> {
  id: string;
  properties: { name: string };
}

interface Props {
  onSignUp: () => void;
}

export function LandingHeatmapPreview({ onSignUp }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [worldData, setWorldData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<MockRegion | null>(null);
  const [activeHudIndex, setActiveHudIndex] = useState(0);
  const [visibleHuds, setVisibleHuds] = useState<Set<number>>(new Set([0, 1]));

  useEffect(() => {
    let cancelled = false;
    fetch(WORLD_TOPO_URL)
      .then(r => r.json())
      .then((topo: Topology) => {
        if (cancelled) return;
        const countries = feature(topo, topo.objects.countries as GeometryCollection);
        setWorldData(countries as FeatureCollection);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  // Cycle through HUD callouts with a blinking reveal effect
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleHuds(prev => {
        const next = new Set(prev);
        const nextIdx = (Math.max(...Array.from(prev)) + 1) % HUD_CALLOUTS.length;
        if (next.size >= HUD_CALLOUTS.length) {
          // All visible, start cycling — remove oldest
          const arr = Array.from(next);
          next.delete(arr[0]);
        }
        next.add(nextIdx);
        return next;
      });
      setActiveHudIndex(prev => (prev + 1) % HUD_CALLOUTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const regionMap = useMemo(() => {
    const map = new Map<string, MockRegion>();
    for (const r of MOCK_REGIONS) map.set(r.code, r);
    return map;
  }, []);

  const spotlights = MOCK_REGIONS.slice(0, 6);

  const width = 960;
  const height = 500;
  const projection = useMemo(() =>
    geoNaturalEarth1().scale(160).translate([width / 2, height / 2])
  , []);
  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);

  const handleCountryClick = (alpha2: string) => {
    const region = regionMap.get(alpha2);
    if (region) {
      setSelectedCountry(region);
    }
  };

  // Compute centroid positions for HUD callouts
  const hudPositions = useMemo(() => {
    if (!worldData) return [];
    return HUD_CALLOUTS.map(hud => {
      const feat = worldData.features.find(
        f => NUMERIC_TO_ALPHA2[(f as CountryFeature).id] === hud.code
      ) as CountryFeature | undefined;
      if (!feat) return null;
      const centroid = pathGenerator.centroid(feat as GeoPermissibleObjects);
      if (!centroid || isNaN(centroid[0])) return null;
      const offset = HUD_OFFSETS[hud.code] || { dx: 20, dy: -30 };
      return {
        leftPct: ((centroid[0] + offset.dx) / width) * 100,
        topPct: ((centroid[1] + offset.dy) / height) * 100,
        centroidX: (centroid[0] / width) * 100,
        centroidY: (centroid[1] / height) * 100,
      };
    });
  }, [worldData, pathGenerator]);

  return (
    <section className="border-b border-white/[0.04] bg-slate-950 py-16 px-4 sm:px-8 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-2"
          >
            <Globe className="h-5 w-5 text-purple-400" />
            <h2 className="text-2xl font-bold sm:text-3xl">Global Investment Themes</h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-gray-400 max-w-xl"
          >
            Explore AI-driven macro themes across 37+ categories — click any country to preview its investment thesis.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="rounded-xl border border-purple-500/20 bg-slate-900/60 overflow-hidden shadow-[0_0_60px_rgba(168,85,247,0.08),0_0_120px_rgba(168,85,247,0.04)]"
        >
          {/* Map + Detail panel layout */}
          <div className="flex flex-col lg:flex-row">
            {/* Map container */}
            <div className={cn("relative transition-all duration-300", selectedCountry ? "lg:w-[60%]" : "w-full")}>
              {loading || !worldData ? (
                <Skeleton className="h-[300px] sm:h-[400px] lg:h-[480px] w-full bg-slate-800/50" />
              ) : (
                <>
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-auto"
                    style={{ minHeight: 220 }}
                  >
                    <defs>
                      <filter id="glow-bullish" x="-80%" y="-80%" width="260%" height="260%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feFlood floodColor="#10b981" floodOpacity="0.7" result="color" />
                        <feComposite in="color" in2="blur" operator="in" result="shadow" />
                        <feMerge><feMergeNode in="shadow" /><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                      <filter id="glow-bearish" x="-80%" y="-80%" width="260%" height="260%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feFlood floodColor="#f43f5e" floodOpacity="0.7" result="color" />
                        <feComposite in="color" in2="blur" operator="in" result="shadow" />
                        <feMerge><feMergeNode in="shadow" /><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                      <filter id="glow-neutral" x="-80%" y="-80%" width="260%" height="260%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feFlood floodColor="#f59e0b" floodOpacity="0.7" result="color" />
                        <feComposite in="color" in2="blur" operator="in" result="shadow" />
                        <feMerge><feMergeNode in="shadow" /><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                      <filter id="glow-emerging" x="-80%" y="-80%" width="260%" height="260%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feFlood floodColor="#3b82f6" floodOpacity="0.7" result="color" />
                        <feComposite in="color" in2="blur" operator="in" result="shadow" />
                        <feMerge><feMergeNode in="shadow" /><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                      <radialGradient id="radial-glow">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.06" />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Ocean */}
                    <rect width={width} height={height} fill="#060a14" />
                    <circle cx={width / 2} cy={height / 2} r="300" fill="url(#radial-glow)" />

                    {/* Graticule */}
                    <g strokeWidth="0.3" fill="none" stroke="rgba(168,85,247,0.06)">
                      {[-60, -30, 0, 30, 60].map(lat => {
                        const d = pathGenerator({
                          type: 'LineString',
                          coordinates: Array.from({ length: 361 }, (_, i) => [i - 180, lat]),
                        } as GeoPermissibleObjects);
                        return d ? <path key={`lat-${lat}`} d={d} /> : null;
                      })}
                      {[-120, -60, 0, 60, 120].map(lng => {
                        const d = pathGenerator({
                          type: 'LineString',
                          coordinates: Array.from({ length: 181 }, (_, i) => [lng, i - 90]),
                        } as GeoPermissibleObjects);
                        return d ? <path key={`lng-${lng}`} d={d} /> : null;
                      })}
                    </g>

                    {/* Countries */}
                    {worldData.features.map((feat) => {
                      const f = feat as CountryFeature;
                      const alpha2 = NUMERIC_TO_ALPHA2[f.id] || '';
                      const region = regionMap.get(alpha2);
                      const isHovered = hoveredCountry === alpha2;
                      const isSelected = selectedCountry?.code === alpha2;
                      const d = pathGenerator(f as GeoPermissibleObjects);
                      if (!d) return null;

                      const hasTheme = !!region;
                      const fill = hasTheme ? SENTIMENT_FILLS[region.sentiment] : 'rgba(148,163,184,0.08)';
                      const opacity = hasTheme
                        ? (isSelected ? 1 : isHovered ? 0.95 : 0.55 + (region.intensity / 300))
                        : (isHovered ? 0.2 : 0.08);

                      return (
                        <path
                          key={f.id}
                          d={d}
                          fill={fill}
                          fillOpacity={opacity}
                          stroke={hasTheme ? SENTIMENT_FILLS[region.sentiment] : 'rgba(255,255,255,0.06)'}
                          strokeWidth={isSelected ? 2 : hasTheme ? (isHovered ? 1.2 : 0.6) : 0.3}
                          strokeOpacity={hasTheme ? (isSelected ? 0.9 : isHovered ? 0.7 : 0.35) : 1}
                          filter={hasTheme ? `url(#glow-${region.sentiment})` : undefined}
                          className="transition-all duration-200 cursor-pointer"
                          onMouseEnter={() => setHoveredCountry(alpha2)}
                          onMouseLeave={() => setHoveredCountry(null)}
                          onClick={() => handleCountryClick(alpha2)}
                        />
                      );
                    })}

                    {/* Pulsing dots for spotlight countries */}
                    {spotlights.map((sc) => {
                      const feat = worldData.features.find(
                        f => NUMERIC_TO_ALPHA2[(f as CountryFeature).id] === sc.code
                      ) as CountryFeature | undefined;
                      if (!feat) return null;
                      const centroid = pathGenerator.centroid(feat as GeoPermissibleObjects);
                      if (!centroid || isNaN(centroid[0])) return null;
                      const fill = SENTIMENT_FILLS[sc.sentiment];
                      const isSelected = selectedCountry?.code === sc.code;
                      return (
                        <g key={`spot-${sc.code}`} className="cursor-pointer" onClick={() => handleCountryClick(sc.code)}>
                          {/* Outer blinking ring */}
                          <circle cx={centroid[0]} cy={centroid[1]} r="14" fill={fill} fillOpacity="0.12">
                            <animate attributeName="r" values="10;22;10" dur="2.5s" repeatCount="indefinite" />
                            <animate attributeName="fill-opacity" values="0.25;0.02;0.25" dur="2.5s" repeatCount="indefinite" />
                          </circle>
                          {/* Second blinking ring (offset timing) */}
                          <circle cx={centroid[0]} cy={centroid[1]} r="8" fill="none" stroke={fill} strokeWidth="0.8" strokeOpacity="0.3">
                            <animate attributeName="r" values="8;18;8" dur="2s" begin="0.5s" repeatCount="indefinite" />
                            <animate attributeName="stroke-opacity" values="0.4;0.05;0.4" dur="2s" begin="0.5s" repeatCount="indefinite" />
                          </circle>
                          {isSelected && (
                            <circle cx={centroid[0]} cy={centroid[1]} r="22" fill="none" stroke={fill} strokeWidth="1.5" strokeOpacity="0.5">
                              <animate attributeName="r" values="18;30;18" dur="1.8s" repeatCount="indefinite" />
                              <animate attributeName="stroke-opacity" values="0.5;0.1;0.5" dur="1.8s" repeatCount="indefinite" />
                            </circle>
                          )}
                          {/* Core dot with blink */}
                          <circle cx={centroid[0]} cy={centroid[1]} r="5" fill={fill} fillOpacity="0.95" stroke="#060a14" strokeWidth="1.5">
                            <animate attributeName="fill-opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
                          </circle>
                        </g>
                      );
                    })}
                  </svg>

                  {/* HUD Callout Cards — floating on the map */}
                  <AnimatePresence>
                    {HUD_CALLOUTS.map((hud, idx) => {
                      const pos = hudPositions[idx];
                      if (!pos || !visibleHuds.has(idx)) return null;
                      const style = HUD_COLORS[hud.type];
                      const HudIcon = style.icon;
                      return (
                        <motion.div
                          key={`hud-${hud.code}`}
                          initial={{ opacity: 0, scale: 0.85, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.85, y: -10 }}
                          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                          className="absolute z-20 hidden md:block pointer-events-auto cursor-pointer"
                          style={{ left: `${pos.leftPct}%`, top: `${pos.topPct}%` }}
                          onClick={() => handleCountryClick(hud.code)}
                        >
                          <div
                            className="rounded-lg px-3 py-2.5 backdrop-blur-md border max-w-[200px] shadow-lg"
                            style={{
                              background: style.bg,
                              borderColor: `${style.border}50`,
                              boxShadow: `0 0 20px ${style.border}20, 0 0 40px ${style.border}10`,
                            }}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              {/* Blinking indicator dot */}
                              <span className="relative flex h-2 w-2">
                                <span
                                  className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                                  style={{ backgroundColor: style.border }}
                                />
                                <span
                                  className="relative inline-flex rounded-full h-2 w-2"
                                  style={{ backgroundColor: style.border }}
                                />
                              </span>
                              <HudIcon className="h-3 w-3" style={{ color: style.border }} />
                              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: style.text }}>
                                {hud.type}
                              </span>
                            </div>
                            <p className="text-[11px] font-semibold text-white leading-tight mb-0.5">{hud.headline}</p>
                            <p className="text-[9px] leading-tight" style={{ color: `${style.text}CC` }}>{hud.summary}</p>
                          </div>
                          {/* Connector line to country */}
                          <svg
                            className="absolute pointer-events-none"
                            style={{
                              left: '50%',
                              top: '100%',
                              width: 2,
                              height: 20,
                              overflow: 'visible',
                            }}
                          >
                            <line x1="0" y1="0" x2="0" y2="20" stroke={style.border} strokeWidth="1" strokeOpacity="0.3" strokeDasharray="3 3">
                              <animate attributeName="stroke-opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
                            </line>
                          </svg>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* HTML labels */}
                  {spotlights.map((sc) => {
                    const feat = worldData.features.find(
                      f => NUMERIC_TO_ALPHA2[(f as CountryFeature).id] === sc.code
                    ) as CountryFeature | undefined;
                    if (!feat) return null;
                    const centroid = pathGenerator.centroid(feat as GeoPermissibleObjects);
                    if (!centroid || isNaN(centroid[0])) return null;
                    const fill = SENTIMENT_FILLS[sc.sentiment];
                    const offset = LABEL_OFFSETS[sc.code] || { dx: 12, dy: 0 };
                    const leftPct = ((centroid[0] + offset.dx) / width) * 100;
                    const topPct = ((centroid[1] + offset.dy) / height) * 100;
                    return (
                      <div
                        key={`label-${sc.code}`}
                        className="absolute z-10 hidden sm:block pointer-events-auto cursor-pointer"
                        style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: 'translate(0, -50%)' }}
                        onClick={() => handleCountryClick(sc.code)}
                      >
                        <div
                          className={cn(
                            "bg-slate-900/95 backdrop-blur-sm border rounded-md px-2 py-1 shadow-lg transition-all hover:scale-105",
                            selectedCountry?.code === sc.code && "ring-1 scale-105"
                          )}
                          style={{
                            borderColor: `${fill}40`,
                            ...(selectedCountry?.code === sc.code ? { boxShadow: `0 0 12px ${fill}30`, ringColor: fill } : {}),
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: fill }} />
                            <span className="text-[10px] font-semibold text-white whitespace-nowrap">{sc.name}</span>
                          </div>
                          <p className="text-[9px] text-gray-400 mt-0.5 max-w-[120px] leading-tight truncate">
                            {sc.theme}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Gradient overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none" />
            </div>

            {/* Detail panel — slides in when a country is selected */}
            <AnimatePresence mode="wait">
              {selectedCountry && (
                <motion.div
                  key={selectedCountry.code}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  className="lg:w-[40%] border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/80 backdrop-blur-sm"
                >
                  <div className="p-5 h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: SENTIMENT_FILLS[selectedCountry.sentiment] }} />
                          <h3 className="text-lg font-bold text-white">{selectedCountry.name}</h3>
                        </div>
                        <p className="text-sm text-gray-400">{selectedCountry.theme}</p>
                      </div>
                      <button
                        onClick={() => setSelectedCountry(null)}
                        className="p-1 rounded-md hover:bg-slate-800 text-gray-500 hover:text-white transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Sentiment & intensity */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="rounded-lg bg-slate-800/60 border border-white/[0.04] p-2.5 text-center">
                        <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Sentiment</div>
                        <div className="flex items-center justify-center gap-1">
                          {(() => { const Icon = SENTIMENT_ICONS[selectedCountry.sentiment]; return <Icon className="h-3.5 w-3.5" style={{ color: SENTIMENT_FILLS[selectedCountry.sentiment] }} />; })()}
                          <span className="text-xs font-bold capitalize" style={{ color: SENTIMENT_FILLS[selectedCountry.sentiment] }}>
                            {selectedCountry.sentiment}
                          </span>
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-800/60 border border-white/[0.04] p-2.5 text-center">
                        <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">GDP Growth</div>
                        <div className="text-sm font-bold text-white font-mono">{selectedCountry.gdp}</div>
                      </div>
                      <div className="rounded-lg bg-slate-800/60 border border-white/[0.04] p-2.5 text-center">
                        <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Inflation</div>
                        <div className="text-sm font-bold text-white font-mono">{selectedCountry.inflation}</div>
                      </div>
                    </div>

                    {/* Related tickers */}
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <BarChart3 className="h-3.5 w-3.5 text-gray-500" />
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Related Tickers</span>
                      </div>
                      <div className="space-y-1.5">
                        {selectedCountry.tickers.map((t) => (
                          <div key={t.symbol} className="flex items-center justify-between rounded-lg bg-slate-800/40 border border-white/[0.03] px-3 py-2 hover:bg-slate-800/60 transition-colors">
                            <div>
                              <span className="text-xs font-bold text-white font-mono">{t.symbol}</span>
                              <span className="text-[10px] text-gray-500 ml-2">{t.name}</span>
                            </div>
                            <div className={cn("flex items-center gap-0.5 text-xs font-mono font-semibold",
                              t.change >= 0 ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {t.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {t.change >= 0 ? '+' : ''}{t.change.toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Catalysts */}
                    <div className="mb-4 flex-1">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Key Catalysts</span>
                      </div>
                      <ul className="space-y-1.5">
                        {selectedCountry.catalysts.map((c, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: SENTIMENT_FILLS[selectedCountry.sentiment] }} />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Intensity bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-500">Theme Intensity</span>
                        <span className="text-xs font-bold font-mono" style={{ color: SENTIMENT_FILLS[selectedCountry.sentiment] }}>{selectedCountry.intensity}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedCountry.intensity}%` }}
                          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: SENTIMENT_FILLS[selectedCountry.sentiment],
                            boxShadow: `0 0 8px ${SENTIMENT_FILLS[selectedCountry.sentiment]}60`,
                          }}
                        />
                      </div>
                    </div>

                    {/* CTA */}
                    <Button
                      onClick={onSignUp}
                      size="sm"
                      className="w-full rounded-lg text-xs font-semibold"
                      style={{
                        backgroundColor: SENTIMENT_FILLS[selectedCountry.sentiment],
                        color: selectedCountry.sentiment === 'neutral' ? '#000' : '#fff',
                      }}
                    >
                      Unlock Full Analysis
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recent News Feed */}
          <div className="border-t border-slate-800 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2 mb-3">
              <Newspaper className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Live Global Feed</span>
              <span className="relative flex h-2 w-2 ml-1">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
            </div>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pr-1">
              {MOCK_NEWS.map((news, i) => (
                <motion.div
                  key={news.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="flex items-start gap-3 rounded-lg bg-slate-800/30 border border-white/[0.03] px-3 py-2.5 hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  onClick={() => handleCountryClick(news.regionCode)}
                >
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: SENTIMENT_FILLS[news.sentiment] }} />
                    <span className="text-[8px] text-gray-600 font-mono">{news.time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: SENTIMENT_FILLS[news.sentiment] }}>
                        {news.region}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-snug line-clamp-2 group-hover:text-white transition-colors">
                      {news.headline}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {news.tickers.map(t => (
                        <span key={t} className="text-[9px] font-mono font-semibold text-purple-400/80 bg-purple-500/10 rounded px-1.5 py-0.5">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Theme cards strip below */}
          <div className="border-t border-slate-800 px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Active Themes</span>
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                {(['bullish', 'bearish', 'neutral', 'emerging'] as const).map(s => (
                  <span key={s} className="flex items-center gap-1 capitalize">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SENTIMENT_FILLS[s] }} />
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {MOCK_REGIONS.slice(0, 6).map((r, i) => {
                const SentIcon = SENTIMENT_ICONS[r.sentiment];
                const isSelected = selectedCountry?.code === r.code;
                return (
                  <motion.div
                    key={r.code}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                    className={cn(
                      "rounded-lg bg-slate-800/50 border p-3 transition-all cursor-pointer group",
                      isSelected
                        ? "border-purple-500/50 shadow-[0_0_16px_rgba(168,85,247,0.12)]"
                        : "border-white/[0.04] hover:border-purple-500/30"
                    )}
                    onClick={() => handleCountryClick(r.code)}
                    onMouseEnter={() => setHoveredCountry(r.code)}
                    onMouseLeave={() => setHoveredCountry(null)}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: SENTIMENT_FILLS[r.sentiment] }} />
                      <span className="text-[11px] font-semibold text-white truncate">{r.name}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 line-clamp-1 mb-2">{r.theme}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <SentIcon className="h-3 w-3" style={{ color: SENTIMENT_FILLS[r.sentiment] }} />
                        <span className="text-[10px] capitalize font-medium" style={{ color: SENTIMENT_FILLS[r.sentiment] }}>
                          {r.sentiment}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">{r.intensity}%</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        <div className="mt-6 text-center">
          <Button
            onClick={onSignUp}
            className="rounded-full bg-purple-500 px-8 font-semibold text-white hover:bg-purple-400 shadow-[0_0_24px_rgba(168,85,247,0.3)]"
          >
            Explore All Themes
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
