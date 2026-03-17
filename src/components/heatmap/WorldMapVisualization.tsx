import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { MarketTheme } from '@/data/marketThemes';
import type { RegionThemeData } from '@/hooks/useInvestmentHeatmap';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
  regionData: RegionThemeData[];
  selectedTheme: MarketTheme | null;
}

// Simplified SVG paths for major countries (viewBox: 0 0 1000 500)
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
};

const SENTIMENT_COLORS: Record<string, string> = {
  bullish: 'fill-emerald-500/70 stroke-emerald-400',
  bearish: 'fill-rose-500/70 stroke-rose-400',
  neutral: 'fill-amber-500/60 stroke-amber-400',
  emerging: 'fill-sky-500/70 stroke-sky-400',
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
    for (const r of regionData) {
      map.set(r.countryCode, r);
    }
    return map;
  }, [regionData]);

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Global Theme Exposure</h2>
        <span className="text-xs text-muted-foreground">
          {regionData.length} active regions
        </span>
      </div>

      <svg
        viewBox="0 0 1000 460"
        className="w-full h-auto"
        style={{ minHeight: 280 }}
      >
        {/* Background */}
        <rect width="1000" height="460" className="fill-muted/20" rx="8" />

        {/* Grid lines */}
        {[100, 200, 300, 400].map(y => (
          <line key={y} x1="0" y1={y} x2="1000" y2={y} className="stroke-border/20" strokeDasharray="4" />
        ))}
        {[200, 400, 600, 800].map(x => (
          <line key={x} x1={x} y1="0" x2={x} y2="460" className="stroke-border/20" strokeDasharray="4" />
        ))}

        {/* Country shapes */}
        {Object.entries(COUNTRY_PATHS).map(([code, path]) => {
          const region = regionMap.get(code);
          const isHovered = hoveredCountry === code;
          const colorClass = region
            ? SENTIMENT_COLORS[region.sentiment]
            : 'fill-muted/30 stroke-border/40';

          return (
            <Tooltip key={code}>
              <TooltipTrigger asChild>
                <motion.path
                  d={path.d}
                  className={`${colorClass} cursor-pointer transition-all duration-200 ${isHovered ? 'brightness-125' : ''}`}
                  strokeWidth={isHovered ? 2 : 1}
                  onMouseEnter={() => setHoveredCountry(code)}
                  onMouseLeave={() => setHoveredCountry(null)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: region ? (isHovered ? 1 : 0.85) : 0.4 }}
                  transition={{ duration: 0.3 }}
                />
              </TooltipTrigger>
              {region && (
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${SENTIMENT_BG[region.sentiment]}`} />
                      <span className="font-semibold text-sm">{region.countryName}</span>
                    </div>
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
                    <div className="text-xs text-muted-foreground">
                      Intensity: {region.themeIntensity}/100
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
              y={path.cy}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-[8px] font-semibold pointer-events-none"
              style={{ fontSize: '8px' }}
            >
              {code}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
