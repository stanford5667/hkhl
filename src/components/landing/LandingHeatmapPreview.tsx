import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import { Globe, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
}

const MOCK_REGIONS: MockRegion[] = [
  { code: 'US', name: 'United States', sentiment: 'bullish', theme: 'AI & Tech Dominance', intensity: 92 },
  { code: 'CN', name: 'China', sentiment: 'emerging', theme: 'EV & Battery Supply Chain', intensity: 78 },
  { code: 'JP', name: 'Japan', sentiment: 'bullish', theme: 'Semiconductor Renaissance', intensity: 74 },
  { code: 'IR', name: 'Iran', sentiment: 'bearish', theme: 'Sanctions & Energy Risk', intensity: 65 },
  { code: 'DE', name: 'Germany', sentiment: 'neutral', theme: 'Industrial Restructuring', intensity: 55 },
  { code: 'IN', name: 'India', sentiment: 'bullish', theme: 'Digital Infrastructure Boom', intensity: 82 },
  { code: 'BR', name: 'Brazil', sentiment: 'emerging', theme: 'Commodities Super Cycle', intensity: 68 },
  { code: 'GB', name: 'United Kingdom', sentiment: 'neutral', theme: 'Fintech & Green Finance', intensity: 52 },
  { code: 'AU', name: 'Australia', sentiment: 'bullish', theme: 'Critical Minerals', intensity: 60 },
  { code: 'KR', name: 'South Korea', sentiment: 'bullish', theme: 'Memory Chip Upcycle', intensity: 70 },
  { code: 'SA', name: 'Saudi Arabia', sentiment: 'emerging', theme: 'Vision 2030 Diversification', intensity: 62 },
  { code: 'IL', name: 'Israel', sentiment: 'neutral', theme: 'Cyber & Defense Tech', intensity: 58 },
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
            Explore AI-driven macro themes across 37+ categories — with sentiment scores, related tickers, and regional intelligence.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl shadow-purple-500/5"
        >
          {/* Map */}
          <div className="relative">
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
                  {/* Ocean */}
                  <rect width={width} height={height} fill="#0a0f1a" />

                  {/* Graticule */}
                  <g strokeWidth="0.3" fill="none" stroke="rgba(255,255,255,0.04)">
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
                    const d = pathGenerator(f as GeoPermissibleObjects);
                    if (!d) return null;

                    const hasTheme = !!region;
                    const fill = hasTheme ? SENTIMENT_FILLS[region.sentiment] : 'rgba(148,163,184,0.15)';
                    const opacity = hasTheme
                      ? (isHovered ? 0.95 : 0.45 + (region.intensity / 350))
                      : (isHovered ? 0.3 : 0.15);

                    return (
                      <path
                        key={f.id}
                        d={d}
                        fill={fill}
                        fillOpacity={opacity}
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth={isHovered ? 1.2 : 0.4}
                        className="transition-all duration-150 cursor-pointer"
                        onMouseEnter={() => setHoveredCountry(alpha2)}
                        onMouseLeave={() => setHoveredCountry(null)}
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
                    return (
                      <g key={`spot-${sc.code}`}>
                        <circle cx={centroid[0]} cy={centroid[1]} r="12" fill={fill} fillOpacity="0.15">
                          <animate attributeName="r" values="8;16;8" dur="2.5s" repeatCount="indefinite" />
                          <animate attributeName="fill-opacity" values="0.25;0.05;0.25" dur="2.5s" repeatCount="indefinite" />
                        </circle>
                        <circle cx={centroid[0]} cy={centroid[1]} r="5" fill={fill} fillOpacity="0.9" stroke="#0a0f1a" strokeWidth="1.5" />
                      </g>
                    );
                  })}
                </svg>

                {/* HTML labels over the map */}
                {spotlights.map((sc) => {
                  const feat = worldData.features.find(
                    f => NUMERIC_TO_ALPHA2[(f as CountryFeature).id] === sc.code
                  ) as CountryFeature | undefined;
                  if (!feat) return null;
                  const centroid = pathGenerator.centroid(feat as GeoPermissibleObjects);
                  if (!centroid || isNaN(centroid[0])) return null;
                  const fill = SENTIMENT_FILLS[sc.sentiment];
                  const leftPct = (centroid[0] / width) * 100;
                  const topPct = (centroid[1] / height) * 100;
                  return (
                    <div
                      key={`label-${sc.code}`}
                      className="absolute z-10 hidden sm:block"
                      style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: 'translate(8px, -50%)' }}
                    >
                      <div
                        className="bg-slate-900/95 backdrop-blur-sm border rounded-md px-2.5 py-1.5 shadow-lg transition-all hover:scale-105"
                        style={{ borderColor: `${fill}40` }}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: fill }} />
                          <span className="text-xs font-semibold text-white whitespace-nowrap">{sc.name}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 max-w-[160px] leading-tight truncate">
                          {sc.theme}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Gradient overlay at bottom for seamless blend */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />
          </div>

          {/* Theme cards strip below the map */}
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
                return (
                  <motion.div
                    key={r.code}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                    className="rounded-lg bg-slate-800/50 border border-white/[0.04] p-3 hover:border-purple-500/30 transition-all cursor-pointer group"
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
            className="rounded-full bg-purple-500 px-8 font-semibold text-white hover:bg-purple-400 shadow-lg shadow-purple-500/20"
          >
            Explore All Themes
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
