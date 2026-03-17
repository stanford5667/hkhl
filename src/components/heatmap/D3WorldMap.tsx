import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import { useHeatmapStore } from '@/stores/heatmapStore';
import type { RegionThemeData } from '@/hooks/useInvestmentHeatmap';
import { Skeleton } from '@/components/ui/skeleton';

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
  '862': 'VE',
};

const SENTIMENT_FILLS: Record<string, string> = {
  bullish: '#10b981',
  bearish: '#f43f5e',
  neutral: '#f59e0b',
  emerging: '#3b82f6',
};

interface Props {
  regionData: RegionThemeData[];
}

interface CountryFeature extends Feature<Geometry> {
  id: string;
  properties: { name: string };
}

export function D3WorldMap({ regionData }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [worldData, setWorldData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; data: RegionThemeData;
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

  // Projection
  const width = 960;
  const height = 500;
  const projection = useMemo(() =>
    geoNaturalEarth1()
      .scale(160)
      .translate([width / 2, height / 2])
  , []);

  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);

  const handleMouseMove = useCallback((e: React.MouseEvent, region: RegionThemeData) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
      data: region,
    });
  }, []);

  if (loading || !worldData) {
    return <Skeleton className="h-[300px] sm:h-[400px] lg:h-[500px] w-full rounded-xl" />;
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
        <rect width={width} height={height} className="fill-muted/10" rx="8" />

        {/* Graticule lines */}
        <g className="stroke-border/10" strokeWidth="0.5" fill="none">
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

          const fill = region
            ? SENTIMENT_FILLS[region.sentiment]
            : 'hsl(var(--muted))';
          const opacity = region
            ? (isHovered ? 0.95 : 0.7 + (region.themeIntensity / 400))
            : (isHovered ? 0.35 : 0.2);

          return (
            <path
              key={f.id}
              d={d}
              fill={fill}
              fillOpacity={opacity}
              stroke={isHovered ? 'hsl(var(--foreground))' : 'hsl(var(--border))'}
              strokeWidth={isHovered ? 1.5 : 0.5}
              strokeOpacity={isHovered ? 0.8 : 0.3}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredCountry(alpha2)}
              onMouseLeave={() => { setHoveredCountry(null); setTooltip(null); }}
              onMouseMove={(e) => region && handleMouseMove(e, region)}
              onTouchStart={() => setHoveredCountry(alpha2)}
              onTouchEnd={() => { setHoveredCountry(null); setTooltip(null); }}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none bg-popover border border-border rounded-lg shadow-lg p-3 max-w-xs"
          style={{
            left: Math.min(tooltip.x, (svgRef.current?.clientWidth || 800) - 200),
            top: tooltip.y - 80,
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: SENTIMENT_FILLS[tooltip.data.sentiment] }}
            />
            <span className="font-semibold text-sm text-foreground">{tooltip.data.countryName}</span>
            <span className="text-[10px] text-muted-foreground capitalize ml-auto">{tooltip.data.sentiment}</span>
          </div>
          <div className="text-xs text-muted-foreground mb-1">
            <span className="font-medium">Themes:</span>{' '}
            {tooltip.data.activeThemes.slice(0, 3).join(', ')}
            {tooltip.data.activeThemes.length > 3 && ` +${tooltip.data.activeThemes.length - 3}`}
          </div>
          <div className="flex gap-3 text-xs">
            {tooltip.data.keyStats.map(s => (
              <span key={s.label}>
                <span className="text-muted-foreground">{s.label}:</span>{' '}
                <span className="font-medium text-foreground">{s.value}</span>
              </span>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            Intensity: {tooltip.data.themeIntensity}/100
          </div>
        </div>
      )}
    </div>
  );
}
