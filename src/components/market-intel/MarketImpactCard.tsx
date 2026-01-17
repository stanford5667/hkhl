/**
 * Market Impact Card
 * 
 * Displays historical market reactions to major economic events
 * alongside the Featured Insight probability card.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Scale,
  DollarSign,
  BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Asset class impact data
const assetImpacts = [
  { 
    name: 'Stocks', 
    ticker: 'SPY', 
    change: -0.42, 
    icon: TrendingUp,
    color: 'emerald',
    description: 'Growth sensitive'
  },
  { 
    name: 'Bonds', 
    ticker: 'TLT', 
    change: 0.68, 
    icon: Scale,
    color: 'blue',
    description: 'Rate inverse'
  },
  { 
    name: 'Dollar', 
    ticker: 'DXY', 
    change: 0.23, 
    icon: DollarSign,
    color: 'purple',
    description: 'Safe haven'
  },
  { 
    name: 'Volatility', 
    ticker: 'VIX', 
    change: 8.45, 
    icon: Activity,
    color: 'amber',
    description: 'Fear gauge'
  },
];

// Historical average impacts by event type
const eventImpacts = [
  { event: 'CPI Hot', spyAvg: -1.2, tltAvg: -0.8, vixAvg: 12.5 },
  { event: 'NFP Strong', spyAvg: 0.6, tltAvg: -0.4, vixAvg: -5.2 },
  { event: 'FOMC Hawkish', spyAvg: -0.9, tltAvg: -1.1, vixAvg: 15.3 },
];

const colorClasses = {
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    icon: 'text-emerald-400',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    icon: 'text-blue-400',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
    icon: 'text-purple-400',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    icon: 'text-amber-400',
  },
};

export function MarketImpactCard() {
  return (
    <Card className="bg-gradient-to-br from-secondary/30 via-card to-primary/5 border-primary/20 overflow-hidden h-full">
      <CardHeader className="p-3 sm:pb-2 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="p-1 sm:p-1.5 rounded-md bg-amber-500/10 shrink-0">
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base truncate">Market Impact</CardTitle>
              <CardDescription className="text-[10px] sm:text-xs truncate">Asset Reactions</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30 shrink-0 px-1.5">
            Historical
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0 space-y-3 sm:space-y-4">
        {/* Asset Class Impact Grid */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {assetImpacts.map((asset) => {
            const colors = colorClasses[asset.color as keyof typeof colorClasses];
            const IconComponent = asset.icon;
            const isPositive = asset.change >= 0;
            
            return (
              <div 
                key={asset.ticker}
                className={cn(
                  "p-2 sm:p-3 rounded-lg border",
                  colors.bg,
                  colors.border
                )}
              >
                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                  <IconComponent className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0", colors.icon)} />
                  <span className={cn("font-medium text-xs sm:text-sm truncate", colors.text)}>{asset.name}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">{asset.ticker}</span>
                  <div className="flex items-center gap-0.5">
                    {isPositive ? (
                      <ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-rose-400" />
                    )}
                    <span className={cn(
                      "text-[10px] sm:text-xs font-mono font-semibold",
                      isPositive ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {isPositive ? '+' : ''}{asset.change.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 sm:mt-1 truncate">{asset.description}</p>
              </div>
            );
          })}
        </div>
        
        {/* Divider */}
        <div className="h-px bg-border" />
        
        {/* Historical Averages */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <BarChart2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
            <span className="text-xs sm:text-sm font-medium truncate">Avg. Reactions</span>
          </div>
          
          <div className="space-y-1.5 sm:space-y-2">
            {eventImpacts.map((event, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors gap-2"
              >
                <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 shrink-0">
                  {event.event}
                </Badge>
                <div className="flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px]">
                  <span className={cn(
                    "font-mono",
                    event.spyAvg >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    SPY {event.spyAvg >= 0 ? '+' : ''}{event.spyAvg}%
                  </span>
                  <span className={cn(
                    "font-mono",
                    event.vixAvg < 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    VIX {event.vixAvg >= 0 ? '+' : ''}{event.vixAvg}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
