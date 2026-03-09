// src/components/earnings/EarningsTableMobile.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EarningsWithPrediction } from '@/types/earnings';
import { formatMarketCapFull } from '@/lib/earningsUtils';
import { EarningsDetailDialog } from './EarningsDetailDialog';

interface Props {
  earnings: EarningsWithPrediction[];
}

export const EarningsTableMobile = ({ earnings }: Props) => {
  const navigate = useNavigate();
  const [selectedEarning, setSelectedEarning] = useState<EarningsWithPrediction | null>(null);

  const getPredictionBadge = (earning: EarningsWithPrediction) => {
    if (!earning.prediction) return null;

    const { predicted_outcome, confidence_score } = earning.prediction;
    
    const variants = {
      beat: 'default' as const,
      miss: 'destructive' as const,
      inline: 'secondary' as const,
    };

    const icons = {
      beat: <TrendingUp className="h-3 w-3" />,
      miss: <TrendingDown className="h-3 w-3" />,
      inline: <Minus className="h-3 w-3" />,
    };

    const colors = {
      beat: 'text-green-500',
      miss: 'text-red-500',
      inline: 'text-muted-foreground',
    };

    return (
      <div className="flex items-center gap-1.5">
        <Badge variant={variants[predicted_outcome]} className="text-[10px] px-1.5 py-0 h-5">
          {icons[predicted_outcome]}
          <span className="ml-0.5">{predicted_outcome.toUpperCase()}</span>
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {Math.round(confidence_score * 100)}%
        </span>
      </div>
    );
  };

  const getTimeLabel = (timeOfDay: string | null) => {
    const labels: Record<string, string> = {
      BMO: 'Pre',
      AMC: 'Post',
      DMT: 'During',
    };
    return timeOfDay ? labels[timeOfDay] || timeOfDay : '';
  };

  if (earnings.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 text-sm">
        No earnings events
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {earnings.map((earning) => (
          <Card
            key={earning.id}
            className="p-3 cursor-pointer hover:bg-muted/50 active:bg-muted/70 transition-colors relative group/card"
            onClick={() => setSelectedEarning(earning)}
          >
            {/* Hover/long-press action overlay */}
            <div className="absolute inset-0 z-20 flex items-center justify-center gap-2.5 px-3 bg-black/60 backdrop-blur-sm rounded-[inherit] opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-250" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); navigate(`/stock/${earning.symbol}`); }}
                className="inline-flex items-center gap-1.5 font-mono font-semibold text-[11px] px-3.5 py-1.5 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all backdrop-blur-sm"
              >
                📊 Research
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); navigate(`/stock/${earning.symbol}`, { state: { tab: 'backtest' } }); }}
                className="inline-flex items-center gap-1.5 font-mono font-semibold text-[11px] px-3.5 py-1.5 rounded-full bg-[hsl(175_80%_45%)] text-background hover:bg-[hsl(175_80%_50%)] shadow-[0_0_16px_hsl(175_80%_45%/0.5)] hover:shadow-[0_0_24px_hsl(175_80%_45%/0.7)] transition-all"
              >
                ⚡ Quick Test
              </button>
            </div>
            <div className="flex items-start justify-between gap-2">
              {/* Left: Symbol + Company + Industry */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-sm">
                    {earning.symbol}
                  </span>
                  {earning.time_of_day && (
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {getTimeLabel(earning.time_of_day)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground truncate mt-0.5">
                  {earning.company_name || earning.symbol}
                </p>
                {earning.industry && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {earning.industry}
                  </p>
                )}
              </div>

              {/* Right: Prediction + Chevron */}
              <div className="flex items-center gap-1 shrink-0">
                {getPredictionBadge(earning)}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Bottom row: Stats */}
            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
              {earning.market_cap && (
                <span>
                  <span className="opacity-60">Market Cap:</span>{' '}
                  <span className="text-foreground">
                    {formatMarketCapFull(earning.market_cap)}
                  </span>
                </span>
              )}
              {earning.eps_estimate !== null && (
                <span>
                  <span className="opacity-60">EPS:</span>{' '}
                  <span className="text-foreground font-mono">
                    ${earning.eps_estimate.toFixed(2)}
                  </span>
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {selectedEarning && (
        <EarningsDetailDialog
          earning={selectedEarning}
          open={!!selectedEarning}
          onClose={() => setSelectedEarning(null)}
        />
      )}
    </>
  );
};
