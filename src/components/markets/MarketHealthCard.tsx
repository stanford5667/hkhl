/**
 * Market Health Card Component
 * 
 * Displays the market health score with contributing factors.
 * Extracted from LiveMacroContent for flexible layout positioning.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HealthFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
}

interface MarketHealthScore {
  score: number;
  label: string;
  factors: HealthFactor[];
}

interface MarketHealthCardProps {
  healthScore: MarketHealthScore;
}

export function MarketHealthCard({ healthScore }: MarketHealthCardProps) {
  return (
    <Card className="bg-gradient-to-br from-card to-secondary/20 border-primary/20">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base sm:text-lg text-muted-foreground mb-1">Market Health</p>
            <div className="flex items-center gap-3">
              <span className={cn(
                "text-5xl sm:text-6xl font-bold tabular-nums tracking-tight",
                healthScore.score >= 60 ? "text-emerald-400" :
                healthScore.score <= 40 ? "text-rose-400" : "text-amber-400"
              )}>
                {healthScore.score}
              </span>
              <Badge variant="outline" className={cn(
                "text-sm sm:text-base px-3 py-1",
                healthScore.score >= 60 ? "border-emerald-500/30 text-emerald-400" :
                healthScore.score <= 40 ? "border-rose-500/30 text-rose-400" : 
                "border-amber-500/30 text-amber-400"
              )}>
                {healthScore.label}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
