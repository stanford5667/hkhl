// src/components/earnings/EarningsTable.tsx

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EarningsWithPrediction } from '@/types/earnings';
import { formatEarningsCurrency } from '@/lib/earningsUtils';
import { EarningsDetailDialog } from './EarningsDetailDialog';

interface Props {
  earnings: EarningsWithPrediction[];
  showDate?: boolean;
}

export const EarningsTable = ({ earnings, showDate = false }: Props) => {
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
      beat: <TrendingUp className="h-3 w-3 mr-1" />,
      miss: <TrendingDown className="h-3 w-3 mr-1" />,
      inline: <Minus className="h-3 w-3 mr-1" />,
    };

    const confidenceText = `${Math.round(confidence_score * 100)}% confidence`;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant={variants[predicted_outcome]} className="text-xs">
              {icons[predicted_outcome]}
              {predicted_outcome.toUpperCase()}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{confidenceText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getTimeOfDayBadge = (timeOfDay: string | null) => {
    if (!timeOfDay) return null;

    const labels = {
      BMO: 'Before Market',
      AMC: 'After Market',
      DMT: 'During Market',
    };

    return (
      <Badge variant="outline" className="text-xs">
        {labels[timeOfDay as keyof typeof labels] || timeOfDay}
      </Badge>
    );
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Company</TableHead>
            {showDate && <TableHead>Date</TableHead>}
            <TableHead>Time</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">EPS Est.</TableHead>
            <TableHead className="text-right">Rev. Est.</TableHead>
            <TableHead className="text-center">Prediction</TableHead>
            <TableHead className="text-center">Analysts</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {earnings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showDate ? 10 : 9} className="text-center text-muted-foreground">
                No earnings events
              </TableCell>
            </TableRow>
          ) : (
            earnings.map((earning) => (
              <TableRow 
                key={earning.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedEarning(earning)}
              >
                <TableCell className="font-mono font-semibold">
                  {earning.symbol}
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate text-sm">
                    {earning.company_name || earning.symbol}
                  </div>
                </TableCell>
                {showDate && (
                  <TableCell className="text-sm">
                    {new Date(earning.report_date).toLocaleDateString()}
                  </TableCell>
                )}
                <TableCell>
                  {getTimeOfDayBadge(earning.time_of_day)}
                </TableCell>
                <TableCell className="text-sm">
                  {earning.fiscal_period} {earning.fiscal_year}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {earning.eps_estimate !== null 
                    ? `$${earning.eps_estimate.toFixed(2)}`
                    : '-'}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatEarningsCurrency(earning.revenue_estimate, true)}
                </TableCell>
                <TableCell className="text-center">
                  {getPredictionBadge(earning)}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {earning.analyst_count || '-'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEarning(earning);
                    }}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

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
