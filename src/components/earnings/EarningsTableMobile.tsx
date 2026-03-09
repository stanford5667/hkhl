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
            className="p-3 cursor-pointer hover:bg-muted/50 active:bg-muted/70 transition-colors"
            onClick={() => setSelectedEarning(earning)}
          >
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
