// src/components/earnings/EarningsTable.tsx

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, Info, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
import { formatEarningsCurrency, formatMarketCapFull } from '@/lib/earningsUtils';
import { parseDateOnly } from '@/lib/date';
import { EarningsDetailDialog } from './EarningsDetailDialog';
import { EarningsTableMobile } from './EarningsTableMobile';
import { useIsMobile } from '@/hooks/use-mobile';

type SortField = 'market_cap' | 'symbol' | 'company_name' | 'eps_estimate' | 'revenue_estimate' | 'analyst_count' | 'confidence';
type SortDirection = 'asc' | 'desc';

interface Props {
  earnings: EarningsWithPrediction[];
  showDate?: boolean;
}

export const EarningsTable = ({ earnings, showDate = false }: Props) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [selectedEarning, setSelectedEarning] = useState<EarningsWithPrediction | null>(null);
  const [sortField, setSortField] = useState<SortField>('market_cap');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'symbol' || field === 'company_name' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const sortedEarnings = useMemo(() => {
    return [...earnings].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortField) {
        case 'market_cap':
          aVal = a.market_cap ?? 0;
          bVal = b.market_cap ?? 0;
          break;
        case 'symbol':
          aVal = a.symbol || '';
          bVal = b.symbol || '';
          break;
        case 'company_name':
          aVal = a.company_name || a.symbol || '';
          bVal = b.company_name || b.symbol || '';
          break;
        case 'eps_estimate':
          aVal = a.eps_estimate ?? 0;
          bVal = b.eps_estimate ?? 0;
          break;
        case 'revenue_estimate':
          aVal = a.revenue_estimate ?? 0;
          bVal = b.revenue_estimate ?? 0;
          break;
        case 'analyst_count':
          aVal = a.analyst_count ?? 0;
          bVal = b.analyst_count ?? 0;
          break;
        case 'confidence':
          aVal = a.prediction?.confidence_score ?? 0;
          bVal = b.prediction?.confidence_score ?? 0;
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [earnings, sortField, sortDirection]);

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

  // Mobile: Use card-based layout
  if (isMobile) {
    return <EarningsTableMobile earnings={sortedEarnings} />;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('symbol')}
            >
              <div className="flex items-center">
                Symbol
                <SortIcon field="symbol" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('company_name')}
            >
              <div className="flex items-center">
                Company
                <SortIcon field="company_name" />
              </div>
            </TableHead>
            {showDate && <TableHead>Date</TableHead>}
            <TableHead>Time</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>Period</TableHead>
            <TableHead 
              className="text-right cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('market_cap')}
            >
              <div className="flex items-center justify-end">
                Market Cap
                <SortIcon field="market_cap" />
              </div>
            </TableHead>
            <TableHead 
              className="text-right cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('eps_estimate')}
            >
              <div className="flex items-center justify-end">
                EPS Est.
                <SortIcon field="eps_estimate" />
              </div>
            </TableHead>
            <TableHead 
              className="text-right cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('revenue_estimate')}
            >
              <div className="flex items-center justify-end">
                Rev. Est.
                <SortIcon field="revenue_estimate" />
              </div>
            </TableHead>
            <TableHead 
              className="text-center cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('confidence')}
            >
              <div className="flex items-center justify-center">
                Prediction
                <SortIcon field="confidence" />
              </div>
            </TableHead>
            <TableHead 
              className="text-center cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('analyst_count')}
            >
              <div className="flex items-center justify-center">
                Analysts
                <SortIcon field="analyst_count" />
              </div>
            </TableHead>
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
            sortedEarnings.map((earning) => (
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
                    {format(parseDateOnly(earning.report_date), 'MMM d, yyyy')}
                  </TableCell>
                )}
                <TableCell>
                  {getTimeOfDayBadge(earning.time_of_day)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
                  {earning.industry || '-'}
                </TableCell>
                <TableCell className="text-sm">
                  {earning.fiscal_period} {earning.fiscal_year}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {earning.market_cap 
                    ? formatMarketCapFull(earning.market_cap)
                    : '-'}
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
