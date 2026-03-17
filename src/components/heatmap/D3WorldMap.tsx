import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import { useHeatmapStore } from '@/stores/heatmapStore';
import type { RegionThemeData } from '@/hooks/useInvestmentHeatmap';
import { Skeleton } from '@/components/ui/skeleton';
import { MousePointerClick } from 'lucide-react';

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ISO 3166-1 numeric to alpha-2
const NUMERIC_TO_ALPHA2: Record<string, string> = {
  '840': 'US', '124': 'CA', '484': 'MX', '076': 'BR', '604': 'PE',
  '826': 'GB', '372': 'IE', '250': 'FR', '276': 'DE', '724': 'ES', '380': 'IT',
  '528': 'NL', '752': 'SE', '578': 'NO', '208': 'DK', '756': 'CH', '643': 'RU',
  '156': 'CN', '392': 'JP', '410': 'KR', '158': 'TW', '356': 'IN', '376': 'IL',
  '682': 'SA', '784': 'AE', '702': 'SG', '344': 'HK', '036': 'AU', '710': 'ZA',
  '360': 'ID', '032': 'AR', '170': 'CO', '566': 'NG', '404': 'KE',
  '764': 'TH', '704': 'VN', '608': 'PH', '458': 'MY', '616': 'PL', '203': 'CZ',
  '040': 'AT', '056': 'BE', '620': 'PT', '300': 'GR', '792': 'TR', '586': 'PK',
  '050': 'BD', '818': 'EG', '012': 'DZ', '504': 'MA', '288': 'GH', '834': 'TZ',
  '231': 'ET', '554': 'NZ', '152': 'CL', '858': 'UY', '600': 'PY', '068': 'BO',
  '862': 'VE', '716': 'ZW', '800': 'UG', '024': 'AO', '508': 'MZ',
  '748': 'SZ', '426': 'LS', '072': 'BW', '516': 'NA', '894': 'ZM',
  '180': 'CD', '178': 'CG', '120': 'CM', '266': 'GA', '226': 'GQ',
  '148': 'TD', '562': 'NE', '854': 'BF', '466': 'ML', '324': 'GN',
  '694': 'SL', '430': 'LR', '384': 'CI',
  '364': 'IR', '368': 'IQ', '760': 'SY', '422': 'LB', '400': 'JO',
  '512': 'OM', '887': 'YE', '004': 'AF', '860': 'UZ', '398': 'KZ',
  '496': 'MN', '104': 'MM', '418': 'LA', '116': 'KH',
};

const SENTIMENT_FILLS: Record<string, string> = {
  bullish: '#10b981',
  bearish: '#f43f5e',
  neutral: '#f59e0b',
  emerging: '#3b82f6',
};

// Base fill for countries without active themes — visible in both light and dark
const BASE_FILL = 'hsl(var(--muted))';
const BASE_FILL_OPACITY = 0.45;
const BORDER_COLOR = 'hsl(var(--foreground))';
const BORDER_OPACITY = 0.15;
const BORDER_OPACITY_HOVER = 0.6;

interface Props {
  regionData: RegionThemeData[];
  onCountryClick?: (countryCode: string) => void;
}

interface CountryFeature extends Feature<Geometry> {
  id: string;
  properties: { name: string };
}

export function D3WorldMap({ regionData, onCountryClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [worldData, setWorldData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; data: RegionThemeData | { countryCode: string; countryName: string };
  } | null>(null);

  const { hoveredCountry, setHoveredCountry } = useHeatmapStore();

  // Load TopoJSON
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

  // Region lookup
  const regionMap = useMemo(() => {
    const map = new Map<string, RegionThemeData>();
    for (const r of regionData) map.set(r.countryCode, r);
    return map;
  }, [regionData]);

  // Pinned spotlight countries that always show + top dynamic ones
  const PINNED_SPOTLIGHTS = ['US', 'CN', 'JP', 'IR'];
  const spotlightCountries = useMemo(() => {
    const pinned: RegionThemeData[] = [];
    const rest: RegionThemeData[] = [];
    for (const r of regionData) {
      if (PINNED_SPOTLIGHTS.includes(r.countryCode)) pinned.push(r);
      else rest.push(r);
    }
    // Sort pinned in the defined order
    pinned.sort((a, b) => PINNED_SPOTLIGHTS.indexOf(a.countryCode) - PINNED_SPOTLIGHTS.indexOf(b.countryCode));
    // Fill remaining slots from top dynamic
    rest.sort((a, b) => b.themeIntensity - a.themeIntensity);
    const dynamic = rest.slice(0, Math.max(0, 6 - pinned.length));
    return [...pinned, ...dynamic];
  }, [regionData]);

  // Country name lookup for non-themed countries
  const COUNTRY_NAMES: Record<string, string> = useMemo(() => ({
    US: 'United States', CN: 'China', JP: 'Japan', KR: 'South Korea',
    TW: 'Taiwan', DE: 'Germany', GB: 'United Kingdom', FR: 'France',
    CA: 'Canada', AU: 'Australia', IN: 'India', BR: 'Brazil',
    IL: 'Israel', CH: 'Switzerland', NL: 'Netherlands', SG: 'Singapore',
    HK: 'Hong Kong', DK: 'Denmark', NO: 'Norway', SE: 'Sweden',
    SA: 'Saudi Arabia', AE: 'UAE', RU: 'Russia', MX: 'Mexico',
    ID: 'Indonesia', ZA: 'South Africa', CL: 'Chile', PE: 'Peru',
    IE: 'Ireland', IT: 'Italy', ES: 'Spain', AR: 'Argentina',
    CO: 'Colombia', NG: 'Nigeria', KE: 'Kenya', TH: 'Thailand',
    VN: 'Vietnam', PH: 'Philippines', MY: 'Malaysia', PL: 'Poland',
    CZ: 'Czech Republic', AT: 'Austria', BE: 'Belgium', PT: 'Portugal',
    GR: 'Greece', TR: 'Turkey', PK: 'Pakistan', BD: 'Bangladesh',
    EG: 'Egypt', NZ: 'New Zealand', IR: 'Iran', IQ: 'Iraq',
    KZ: 'Kazakhstan', MN: 'Mongolia', MM: 'Myanmar',
  }), []);

  // Projection
  const width = 960;
  const height = 500;
  const projection = useMemo(() =>
    geoNaturalEarth1()
      .scale(160)
      .translate([width / 2, height / 2])
  , []);

  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);

  const handleMouseMove = useCallback((e: React.MouseEvent, data: any) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
      data,
    });
  }, []);

  const handleClick = useCallback((alpha2: string) => {
    if (alpha2 && onCountryClick) {
      onCountryClick(alpha2);
    }
  }, [onCountryClick]);

  // Dismiss the hint once user clicks any country
  const [hintDismissed, setHintDismissed] = useState(false);

  const handleClickWithHint = useCallback((alpha2: string) => {
    setHintDismissed(true);
    if (alpha2 && onCountryClick) onCountryClick(alpha2);
  }, [onCountryClick]);

  if (loading || !worldData) {
    return <Skeleton className="h-[300px] sm:h-[400px] lg:h-[520px] w-full" />;
  }

  return (
    <div className="relative overflow-hidden bg-card/30">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        style={{ minHeight: 200 }}
      >
        {/* Ocean background */}
        <rect width={width} height={height} fill="hsl(var(--background))" rx="8" />

        {/* Graticule lines */}
        <g strokeWidth="0.3" fill="none" stroke="hsl(var(--border))" strokeOpacity="0.2">
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
          const fill = hasTheme
            ? SENTIMENT_FILLS[region.sentiment]
            : BASE_FILL;
          const opacity = hasTheme
            ? (isHovered ? 0.95 : 0.55 + (region.themeIntensity / 300))
            : (isHovered ? 0.55 : BASE_FILL_OPACITY);

          return (
            <path
              key={f.id}
              d={d}
              fill={fill}
              fillOpacity={opacity}
              stroke={BORDER_COLOR}
              strokeWidth={isHovered ? 1.2 : 0.4}
              strokeOpacity={isHovered ? BORDER_OPACITY_HOVER : BORDER_OPACITY}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredCountry(alpha2)}
              onMouseLeave={() => { setHoveredCountry(null); setTooltip(null); }}
              onMouseMove={(e) => {
                const tooltipData = region || { countryCode: alpha2, countryName: COUNTRY_NAMES[alpha2] || f.properties.name || alpha2 };
                handleMouseMove(e, tooltipData);
              }}
              onClick={() => handleClickWithHint(alpha2)}
              onTouchStart={() => setHoveredCountry(alpha2)}
              onTouchEnd={() => { setHoveredCountry(null); setTooltip(null); }}
            />
          );
        })}

        {/* Spotlight pulsing dots */}
        {spotlightCountries.map((sc) => {
          const feat = worldData.features.find(f => NUMERIC_TO_ALPHA2[(f as CountryFeature).id] === sc.countryCode) as CountryFeature | undefined;
          if (!feat) return null;
          const centroid = pathGenerator.centroid(feat as GeoPermissibleObjects);
          if (!centroid || isNaN(centroid[0])) return null;
          const fill = SENTIMENT_FILLS[sc.sentiment] || SENTIMENT_FILLS.neutral;
          return (
            <g key={`spot-${sc.countryCode}`} className="cursor-pointer" onClick={() => handleClickWithHint(sc.countryCode)}>
              <circle cx={centroid[0]} cy={centroid[1]} r="12" fill={fill} fillOpacity="0.15">
                <animate attributeName="r" values="8;16;8" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="fill-opacity" values="0.25;0.05;0.25" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx={centroid[0]} cy={centroid[1]} r="5" fill={fill} fillOpacity="0.9" stroke="hsl(var(--background))" strokeWidth="1.5" />
            </g>
          );
        })}
      </svg>

      {/* HTML spotlight labels — rendered over the SVG for crisp readable text */}
      {spotlightCountries.map((sc) => {
        const feat = worldData.features.find(f => NUMERIC_TO_ALPHA2[(f as CountryFeature).id] === sc.countryCode) as CountryFeature | undefined;
        if (!feat) return null;
        const centroid = pathGenerator.centroid(feat as GeoPermissibleObjects);
        if (!centroid || isNaN(centroid[0])) return null;
        const fill = SENTIMENT_FILLS[sc.sentiment] || SENTIMENT_FILLS.neutral;
        const topTheme = sc.activeThemes[0] || '';
        // Convert SVG coords to percentage positions
        const leftPct = (centroid[0] / width) * 100;
        const topPct = (centroid[1] / height) * 100;
        return (
          <div
            key={`label-${sc.countryCode}`}
            className="absolute z-10 cursor-pointer group"
            style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: 'translate(8px, -50%)' }}
            onClick={() => handleClickWithHint(sc.countryCode)}
          >
            <div
              className="bg-popover/95 backdrop-blur-sm border rounded-md px-2.5 py-1.5 shadow-md transition-all group-hover:scale-105 group-hover:shadow-lg"
              style={{ borderColor: `${fill}50` }}
            >
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: fill }} />
                <span className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">{sc.countryName}</span>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 max-w-[180px] leading-tight">
                {topTheme.length > 35 ? topTheme.slice(0, 33) + '…' : topTheme}
              </p>
              <span className="text-[10px] font-medium mt-1 inline-block opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: fill }}>
                Click to explore →
              </span>
            </div>
          </div>
        );
      })}

      {/* Interactive hint callout */}
      {!hintDismissed && !tooltip && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 animate-bounce-slow pointer-events-none">
          <div className="flex items-center gap-2 bg-popover/95 backdrop-blur-sm border border-primary/30 rounded-full px-4 py-2 shadow-lg shadow-primary/10">
            <MousePointerClick className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-medium text-foreground whitespace-nowrap">
              Click any country to explore its regional themes
            </span>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none bg-popover border border-border rounded-lg shadow-lg p-3 max-w-xs"
          style={{
            left: Math.min(tooltip.x, (svgRef.current?.clientWidth || 800) - 200),
            top: tooltip.y - 80,
          }}
        >
          {'sentiment' in tooltip.data ? (
            <>
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: SENTIMENT_FILLS[(tooltip.data as RegionThemeData).sentiment] }}
                />
                <span className="font-semibold text-sm text-foreground">{(tooltip.data as RegionThemeData).countryName}</span>
                <span className="text-[10px] text-muted-foreground capitalize ml-auto">{(tooltip.data as RegionThemeData).sentiment}</span>
              </div>
              <div className="text-xs text-muted-foreground mb-1">
                <span className="font-medium">Themes:</span>{' '}
                {(tooltip.data as RegionThemeData).activeThemes.slice(0, 3).join(', ')}
                {(tooltip.data as RegionThemeData).activeThemes.length > 3 && ` +${(tooltip.data as RegionThemeData).activeThemes.length - 3}`}
              </div>
              <div className="flex gap-3 text-xs">
                {(tooltip.data as RegionThemeData).keyStats.map(s => (
                  <span key={s.label}>
                    <span className="text-muted-foreground">{s.label}:</span>{' '}
                    <span className="font-medium text-foreground">{s.value}</span>
                  </span>
                ))}
              </div>
              <div className="text-[10px] text-primary mt-1.5 font-medium">Click for regional dashboard →</div>
            </>
          ) : (
            <div>
              <span className="font-semibold text-sm text-foreground">{(tooltip.data as any).countryName}</span>
              <div className="text-[10px] text-muted-foreground mt-0.5">No active themes · Click to explore</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
