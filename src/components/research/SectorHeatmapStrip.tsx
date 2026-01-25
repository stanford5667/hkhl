import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Cpu, Heart, Landmark, ShoppingCart, Zap, Factory, 
  Building2, Sparkles, Globe, BarChart3
} from 'lucide-react';

interface Sector {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  performance: number; // Daily % change
}

const SECTORS: Sector[] = [
  { id: 'all', name: 'All', icon: Globe, performance: 0 },
  { id: 'technology', name: 'Tech', icon: Cpu, performance: 1.2 },
  { id: 'healthcare', name: 'Health', icon: Heart, performance: -0.8 },
  { id: 'financials', name: 'Finance', icon: Landmark, performance: 0.5 },
  { id: 'consumer', name: 'Consumer', icon: ShoppingCart, performance: -0.3 },
  { id: 'energy', name: 'Energy', icon: Zap, performance: 2.1 },
  { id: 'industrials', name: 'Industrial', icon: Factory, performance: 0.7 },
  { id: 'etfs', name: 'ETFs', icon: BarChart3, performance: 0.4 },
];

interface SectorHeatmapStripProps {
  selectedSector: string;
  onSectorChange: (sectorId: string) => void;
}

export function SectorHeatmapStrip({ selectedSector, onSectorChange }: SectorHeatmapStripProps) {
  return (
    <div className="relative">
      {/* Scrollable container */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 px-1">
        {SECTORS.map((sector) => {
          const Icon = sector.icon;
          const isSelected = selectedSector === sector.id;
          const isPositive = sector.performance > 0;
          const isNeutral = sector.performance === 0;
          
          // Heat intensity based on performance magnitude
          const intensity = Math.min(Math.abs(sector.performance) / 3, 1);
          
          return (
            <button
              key={sector.id}
              onClick={() => onSectorChange(sector.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap',
                'font-mono text-xs font-medium transition-all duration-200',
                'border backdrop-blur-md min-h-[40px]',
                // Base glassmorphism
                'bg-slate-950/40',
                // Selection state
                isSelected 
                  ? 'border-primary bg-primary/20 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]' 
                  : 'border-slate-800/50 hover:border-slate-700',
                // Heat color when not selected
                !isSelected && !isNeutral && (
                  isPositive 
                    ? `text-success/80` 
                    : `text-destructive/80`
                ),
                !isSelected && isNeutral && 'text-muted-foreground'
              )}
              style={!isSelected && !isNeutral ? {
                boxShadow: isPositive 
                  ? `0 0 ${8 * intensity}px hsl(var(--success) / ${0.2 * intensity})`
                  : `0 0 ${8 * intensity}px hsl(var(--destructive) / ${0.2 * intensity})`
              } : undefined}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{sector.name}</span>
              {sector.id !== 'all' && (
                <span className={cn(
                  'text-[10px] font-mono',
                  isPositive ? 'text-success' : 'text-destructive',
                  isNeutral && 'text-muted-foreground'
                )}>
                  {isPositive ? '+' : ''}{sector.performance.toFixed(1)}%
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-1 w-4 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-1 w-4 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
}
