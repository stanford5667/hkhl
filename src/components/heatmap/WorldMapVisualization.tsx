import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MarketTheme } from '@/data/marketThemes';
import type { RegionThemeData } from '@/hooks/useInvestmentHeatmap';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Swords, CloudRain, BarChart3, TrendingUp, TrendingDown,
  ShieldAlert, Factory, Zap, Wheat, Cpu, Landmark, Flame,
  DollarSign, AlertTriangle, Globe, Rocket, Anchor, Scale
} from 'lucide-react';

interface Props {
  regionData: RegionThemeData[];
  selectedTheme: MarketTheme | null;
}

const COUNTRY_PATHS: Record<string, { d: string; cx: number; cy: number }> = {
  US: { d: 'M130,160 L260,160 L260,220 L130,220 Z', cx: 195, cy: 190 },
  CA: { d: 'M130,100 L280,100 L280,155 L130,155 Z', cx: 205, cy: 127 },
  MX: { d: 'M140,225 L220,225 L220,270 L140,270 Z', cx: 180, cy: 247 },
  BR: { d: 'M280,290 L350,290 L350,380 L280,380 Z', cx: 315, cy: 335 },
  CL: { d: 'M260,350 L275,350 L275,430 L260,430 Z', cx: 267, cy: 390 },
  PE: { d: 'M245,290 L275,290 L275,340 L245,340 Z', cx: 260, cy: 315 },
  GB: { d: 'M445,130 L460,130 L460,155 L445,155 Z', cx: 452, cy: 142 },
  IE: { d: 'M435,130 L445,130 L445,150 L435,150 Z', cx: 440, cy: 140 },
  FR: { d: 'M450,160 L480,160 L480,190 L450,190 Z', cx: 465, cy: 175 },
  DE: { d: 'M475,140 L500,140 L500,170 L475,170 Z', cx: 487, cy: 155 },
  ES: { d: 'M435,185 L470,185 L470,210 L435,210 Z', cx: 452, cy: 197 },
  IT: { d: 'M485,175 L505,175 L505,210 L485,210 Z', cx: 495, cy: 192 },
  NL: { d: 'M470,135 L485,135 L485,147 L470,147 Z', cx: 477, cy: 141 },
  SE: { d: 'M490,85 L505,85 L505,130 L490,130 Z', cx: 497, cy: 107 },
  NO: { d: 'M475,75 L490,75 L490,120 L475,120 Z', cx: 482, cy: 97 },
  DK: { d: 'M480,125 L492,125 L492,137 L480,137 Z', cx: 486, cy: 131 },
  CH: { d: 'M475,165 L490,165 L490,178 L475,178 Z', cx: 482, cy: 171 },
  RU: { d: 'M550,60 L780,60 L780,160 L550,160 Z', cx: 665, cy: 110 },
  CN: { d: 'M700,170 L800,170 L800,250 L700,250 Z', cx: 750, cy: 210 },
  JP: { d: 'M830,170 L855,170 L855,210 L830,210 Z', cx: 842, cy: 190 },
  KR: { d: 'M810,185 L828,185 L828,205 L810,205 Z', cx: 819, cy: 195 },
  TW: { d: 'M805,230 L820,230 L820,248 L805,248 Z', cx: 812, cy: 239 },
  IN: { d: 'M660,230 L710,230 L710,310 L660,310 Z', cx: 685, cy: 270 },
  IL: { d: 'M545,210 L555,210 L555,230 L545,230 Z', cx: 550, cy: 220 },
  SA: { d: 'M565,230 L610,230 L610,270 L565,270 Z', cx: 587, cy: 250 },
  AE: { d: 'M610,245 L630,245 L630,260 L610,260 Z', cx: 620, cy: 252 },
  SG: { d: 'M745,290 L760,290 L760,300 L745,300 Z', cx: 752, cy: 295 },
  HK: { d: 'M790,240 L805,240 L805,252 L790,252 Z', cx: 797, cy: 246 },
  AU: { d: 'M800,340 L890,340 L890,410 L800,410 Z', cx: 845, cy: 375 },
  ZA: { d: 'M520,370 L570,370 L570,410 L520,410 Z', cx: 545, cy: 390 },
  ID: { d: 'M750,300 L830,300 L830,325 L750,325 Z', cx: 790, cy: 312 },
  UA: { d: 'M530,135 L555,135 L555,155 L530,155 Z', cx: 542, cy: 145 },
  IR: { d: 'M590,195 L630,195 L630,225 L590,225 Z', cx: 610, cy: 210 },
  TR: { d: 'M530,175 L570,175 L570,195 L530,195 Z', cx: 550, cy: 185 },
  PK: { d: 'M640,220 L665,220 L665,250 L640,250 Z', cx: 652, cy: 235 },
  EG: { d: 'M520,225 L545,225 L545,255 L520,255 Z', cx: 532, cy: 240 },
  NG: { d: 'M470,280 L500,280 L500,305 L470,305 Z', cx: 485, cy: 292 },
  AR: { d: 'M275,380 L305,380 L305,435 L275,435 Z', cx: 290, cy: 407 },
  VN: { d: 'M755,250 L770,250 L770,280 L755,280 Z', cx: 762, cy: 265 },
  TH: { d: 'M735,255 L752,255 L752,280 L735,280 Z', cx: 743, cy: 267 },
  PL: { d: 'M505,130 L530,130 L530,148 L505,148 Z', cx: 517, cy: 139 },
};

// Event icons mapped to countries based on geopolitical themes
type EventType = 'war' | 'sanctions' | 'gdp_report' | 'earnings' | 'weather' | 'tech' | 'energy' | 'trade' | 'inflation' | 'reform' | 'growth' | 'commodity' | 'geopolitical';

const EVENT_ICON_MAP: Record<EventType, typeof Swords> = {
  war: Swords,
  sanctions: ShieldAlert,
  gdp_report: BarChart3,
  earnings: DollarSign,
  weather: CloudRain,
  tech: Cpu,
  energy: Zap,
  trade: Scale,
  inflation: Flame,
  reform: Landmark,
  growth: Rocket,
  commodity: Wheat,
  geopolitical: AlertTriangle,
};

const COUNTRY_EVENTS: Record<string, { type: EventType; label: string; urgent?: boolean }[]> = {
  UA: [{ type: 'war', label: 'Active Conflict', urgent: true }],
  RU: [{ type: 'sanctions', label: 'Sanctions Active', urgent: true }, { type: 'energy', label: 'Energy Exports' }],
  IR: [{ type: 'sanctions', label: 'Nuclear Sanctions', urgent: true }, { type: 'geopolitical', label: 'Regional Tensions' }],
  US: [{ type: 'gdp_report', label: 'GDP Report' }, { type: 'tech', label: 'AI Leadership' }, { type: 'earnings', label: 'Earnings Season' }],
  CN: [{ type: 'trade', label: 'Trade War' }, { type: 'tech', label: 'Tech Rivalry' }],
  JP: [{ type: 'reform', label: 'Corp Reform' }, { type: 'gdp_report', label: 'GDP Data' }],
  DE: [{ type: 'energy', label: 'Energy Crisis' }, { type: 'gdp_report', label: 'GDP Contraction' }],
  GB: [{ type: 'gdp_report', label: 'Post-Brexit GDP' }],
  IN: [{ type: 'growth', label: 'GDP +7.2%' }, { type: 'tech', label: 'Tech Hub' }],
  BR: [{ type: 'commodity', label: 'Agri Exports' }, { type: 'growth', label: 'Growth Rebound' }],
  SA: [{ type: 'energy', label: 'Oil Policy' }, { type: 'reform', label: 'Vision 2030' }],
  TW: [{ type: 'tech', label: 'Chip Exports' }, { type: 'geopolitical', label: 'Strait Tensions' }],
  KR: [{ type: 'tech', label: 'Battery Tech' }],
  AU: [{ type: 'commodity', label: 'Mining Exports' }, { type: 'weather', label: 'Climate Events' }],
  TR: [{ type: 'inflation', label: 'Inflation 50%+', urgent: true }],
  EG: [{ type: 'trade', label: 'Suez Revenue' }],
  NG: [{ type: 'growth', label: 'Fintech Boom' }],
  AR: [{ type: 'inflation', label: 'Peso Crisis', urgent: true }, { type: 'reform', label: 'Milei Reforms' }],
  IL: [{ type: 'war', label: 'Regional Conflict', urgent: true }, { type: 'tech', label: 'Cyber/Defense' }],
  MX: [{ type: 'trade', label: 'Nearshoring' }],
  PK: [{ type: 'geopolitical', label: 'IMF Bailout' }],
  VN: [{ type: 'growth', label: 'Mfg Migration' }],
  SG: [{ type: 'growth', label: 'Finance Hub' }],
  ZA: [{ type: 'energy', label: 'Power Crisis' }],
};

const SENTIMENT_FILLS: Record<string, { base: string; glow: string; stroke: string }> = {
  bullish:  { base: 'hsl(160 84% 39% / 0.55)', glow: 'hsl(160 84% 50% / 0.4)', stroke: 'hsl(160 84% 55%)' },
  bearish:  { base: 'hsl(0 72% 51% / 0.55)',    glow: 'hsl(0 72% 60% / 0.4)',    stroke: 'hsl(0 72% 60%)' },
  neutral:  { base: 'hsl(45 93% 47% / 0.45)',   glow: 'hsl(45 93% 55% / 0.3)',   stroke: 'hsl(45 93% 55%)' },
  emerging: { base: 'hsl(199 89% 48% / 0.55)',  glow: 'hsl(199 89% 58% / 0.4)',  stroke: 'hsl(199 89% 58%)' },
};

const SENTIMENT_BG: Record<string, string> = {
  bullish: 'bg-emerald-500',
  bearish: 'bg-rose-500',
  neutral: 'bg-amber-500',
  emerging: 'bg-sky-500',
};

export function WorldMapVisualization({ regionData, selectedTheme }: Props) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const regionMap = useMemo(() => {
    const map = new Map<string, RegionThemeData>();
    for (const r of regionData) map.set(r.countryCode, r);
    return map;
  }, [regionData]);

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3 sm:p-4 md:p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary animate-pulse" />
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Global Theme Exposure</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground">
            {(['bullish', 'bearish', 'neutral', 'emerging'] as const).map(s => (
              <span key={s} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${SENTIMENT_BG[s]}`} />
                {s}
              </span>
            ))}
          </div>
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            {regionData.length} active regions
          </span>
        </div>
      </div>

      <svg
        viewBox="0 0 1000 460"
        className="w-full h-auto touch-pan-x touch-pan-y"
        style={{ minHeight: 200 }}
      >
        <defs>
          {/* Animated glow filters per sentiment */}
          {Object.entries(SENTIMENT_FILLS).map(([key, val]) => (
            <filter key={key} id={`glow-${key}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feFlood floodColor={val.glow} result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
          {/* Urgent pulse filter */}
          <filter id="glow-urgent" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feFlood floodColor="hsl(0 72% 60% / 0.6)" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Radial gradient for background */}
          <radialGradient id="map-bg" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="hsl(217 91% 60% / 0.04)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Background with subtle radial glow */}
        <rect width="1000" height="460" className="fill-muted/20" rx="8" />
        <rect width="1000" height="460" fill="url(#map-bg)" rx="8" />

        {/* Grid lines */}
        {[100, 200, 300, 400].map(y => (
          <line key={y} x1="0" y1={y} x2="1000" y2={y} className="stroke-border/15" strokeDasharray="4" />
        ))}
        {[200, 400, 600, 800].map(x => (
          <line key={x} x1={x} y1="0" x2={x} y2="460" className="stroke-border/15" strokeDasharray="4" />
        ))}

        {/* Country shapes with animated glow */}
        {Object.entries(COUNTRY_PATHS).map(([code, path]) => {
          const region = regionMap.get(code);
          const isHovered = hoveredCountry === code;
          const sentiment = region?.sentiment || 'neutral';
          const colors = SENTIMENT_FILLS[sentiment];
          const hasUrgent = COUNTRY_EVENTS[code]?.some(e => e.urgent);
          const intensity = region?.themeIntensity || 30;

          return (
            <Tooltip key={code}>
              <TooltipTrigger asChild>
                <g>
                  {/* Animated outer glow ring for active regions */}
                  {region && (
                    <motion.path
                      d={path.d}
                      fill="none"
                      stroke={colors.stroke}
                      strokeWidth={hasUrgent ? 3 : 2}
                      strokeOpacity={0}
                      filter={hasUrgent ? 'url(#glow-urgent)' : `url(#glow-${sentiment})`}
                      animate={{
                        strokeOpacity: [0.2, 0.6, 0.2],
                        ...(hasUrgent ? { strokeWidth: [2, 4, 2] } : {}),
                      }}
                      transition={{
                        duration: hasUrgent ? 1.5 : 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: Math.random() * 2,
                      }}
                    />
                  )}
                  {/* Country fill */}
                  <motion.path
                    d={path.d}
                    fill={region ? colors.base : 'hsl(222 47% 20% / 0.3)'}
                    stroke={region ? colors.stroke : 'hsl(222 47% 30% / 0.4)'}
                    strokeWidth={isHovered ? 2.5 : 1}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredCountry(code)}
                    onMouseLeave={() => setHoveredCountry(null)}
                    onTouchStart={() => setHoveredCountry(code)}
                    onTouchEnd={() => setHoveredCountry(null)}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{
                      opacity: region ? (isHovered ? 1 : 0.85) : 0.4,
                      scale: isHovered ? 1.02 : 1,
                      fill: isHovered && region ? colors.stroke.replace(')', ' / 0.7)') : undefined,
                    }}
                    transition={{ duration: 0.3 }}
                    style={{ transformOrigin: `${path.cx}px ${path.cy}px` }}
                  />
                </g>
              </TooltipTrigger>
              {region && (
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${SENTIMENT_BG[region.sentiment]}`} />
                      <span className="font-semibold text-sm">{region.countryName}</span>
                    </div>
                    {COUNTRY_EVENTS[code] && (
                      <div className="flex flex-wrap gap-1">
                        {COUNTRY_EVENTS[code].map((evt, i) => {
                          const Icon = EVENT_ICON_MAP[evt.type];
                          return (
                            <span key={i} className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${evt.urgent ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                              <Icon className="h-2.5 w-2.5" />
                              {evt.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Active Themes:</span>{' '}
                      {region.activeThemes.slice(0, 3).join(', ')}
                      {region.activeThemes.length > 3 && ` +${region.activeThemes.length - 3} more`}
                    </div>
                    <div className="flex gap-3 text-xs">
                      {region.keyStats.map(s => (
                        <span key={s.label}>
                          <span className="text-muted-foreground">{s.label}:</span>{' '}
                          <span className="font-medium">{s.value}</span>
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      Intensity:
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${SENTIMENT_BG[region.sentiment]}`}
                          style={{ width: `${region.themeIntensity}%` }}
                        />
                      </div>
                      <span className="font-medium">{region.themeIntensity}/100</span>
                    </div>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}

        {/* Country labels */}
        {Object.entries(COUNTRY_PATHS).map(([code, path]) => {
          const region = regionMap.get(code);
          if (!region) return null;
          return (
            <text
              key={`label-${code}`}
              x={path.cx}
              y={path.cy + 12}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground font-semibold pointer-events-none select-none"
              style={{ fontSize: '7px', opacity: 0.7 }}
            >
              {code}
            </text>
          );
        })}

        {/* Animated event icons on map */}
        {Object.entries(COUNTRY_PATHS).map(([code, path]) => {
          const events = COUNTRY_EVENTS[code];
          const region = regionMap.get(code);
          if (!events || !region) return null;

          // Show first event icon (most important)
          const primaryEvent = events[0];
          const Icon = EVENT_ICON_MAP[primaryEvent.type];

          return (
            <g key={`icon-${code}`}>
              {/* Icon background pulse */}
              {primaryEvent.urgent && (
                <motion.circle
                  cx={path.cx}
                  cy={path.cy - 4}
                  r={8}
                  fill="hsl(0 72% 51% / 0.15)"
                  stroke="hsl(0 72% 51% / 0.3)"
                  strokeWidth={1}
                  animate={{
                    r: [8, 14, 8],
                    opacity: [0.6, 0, 0.6],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              {/* Icon container */}
              <motion.foreignObject
                x={path.cx - 7}
                y={path.cy - 11}
                width={14}
                height={14}
                className="pointer-events-none overflow-visible"
                animate={primaryEvent.urgent ? {
                  y: [path.cy - 11, path.cy - 13, path.cy - 11],
                } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className={`w-3.5 h-3.5 flex items-center justify-center rounded-full ${
                  primaryEvent.urgent 
                    ? 'bg-destructive/80 text-destructive-foreground' 
                    : 'bg-card/80 text-foreground border border-border/50'
                }`} style={{ backdropFilter: 'blur(4px)' }}>
                  <Icon style={{ width: 8, height: 8 }} />
                </div>
              </motion.foreignObject>

              {/* Badge count for multiple events */}
              {events.length > 1 && (
                <motion.foreignObject
                  x={path.cx + 3}
                  y={path.cy - 16}
                  width={12}
                  height={12}
                  className="pointer-events-none"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="w-3 h-3 rounded-full bg-primary text-primary-foreground flex items-center justify-center" style={{ fontSize: 6, fontWeight: 700 }}>
                    {events.length}
                  </div>
                </motion.foreignObject>
              )}
            </g>
          );
        })}

        {/* Animated connection lines between trade-linked countries */}
        <motion.line
          x1={195} y1={190} x2={750} y2={210}
          stroke="hsl(45 93% 55% / 0.15)"
          strokeWidth={1}
          strokeDasharray="6 4"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        <motion.line
          x1={195} y1={190} x2={842} y2={190}
          stroke="hsl(199 89% 48% / 0.12)"
          strokeWidth={1}
          strokeDasharray="6 4"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
        <motion.line
          x1={542} y1={145} x2={665} y2={110}
          stroke="hsl(0 72% 51% / 0.2)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          animate={{ strokeDashoffset: [0, -14], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>

      {/* Bottom event legend */}
      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/30">
        <span className="text-[10px] text-muted-foreground font-medium mr-1">Events:</span>
        {[
          { type: 'war' as EventType, label: 'Conflict' },
          { type: 'sanctions' as EventType, label: 'Sanctions' },
          { type: 'gdp_report' as EventType, label: 'GDP Data' },
          { type: 'earnings' as EventType, label: 'Earnings' },
          { type: 'trade' as EventType, label: 'Trade' },
          { type: 'inflation' as EventType, label: 'Inflation' },
          { type: 'tech' as EventType, label: 'Tech' },
          { type: 'energy' as EventType, label: 'Energy' },
        ].map(({ type, label }) => {
          const Icon = EVENT_ICON_MAP[type];
          return (
            <span key={type} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Icon className="h-2.5 w-2.5" />
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
