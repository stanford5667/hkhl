/**
 * ETF Holdings Tab - Shows detailed holdings breakdown
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Activity, TrendingUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ETFHoldingsTabProps {
  ticker: string;
  companyName?: string;
  etfData?: {
    holdings?: number;
    topHoldings?: Array<{
      symbol: string;
      name: string;
      weight: number;
    }>;
    sectorBreakdown?: Array<{
      sector: string;
      weight: number;
    }>;
    category?: string;
  };
  isLoading?: boolean;
}

export function ETFHoldingsTab({
  ticker,
  companyName,
  etfData,
  isLoading = false,
}: ETFHoldingsTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasTopHoldings = etfData?.topHoldings && etfData.topHoldings.length > 0;
  const hasSectorBreakdown = etfData?.sectorBreakdown && etfData.sectorBreakdown.length > 0;

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-5 w-5 text-violet-500" />
            Holdings Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Holdings</p>
              <p className="text-2xl font-bold">{etfData?.holdings?.toLocaleString() || '—'}</p>
            </div>
            {etfData?.category && (
              <Badge variant="outline" className="text-xs">
                {etfData.category}
              </Badge>
            )}
          </div>
          
          {!hasTopHoldings && !hasSectorBreakdown && (
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs text-foreground font-medium">Detailed holdings data unavailable</p>
                <p className="text-xs text-muted-foreground">
                  This ETF's constituent holdings are not available in our free data tier. 
                  {etfData?.holdings === 1 && " This appears to be a single-asset trust (e.g., precious metal or commodity)."}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Holdings Card */}
      {hasTopHoldings && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Top Holdings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {etfData.topHoldings!.map((holding, i) => (
                <div 
                  key={holding.symbol} 
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground w-6 shrink-0">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{holding.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate">{holding.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, holding.weight)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium tabular-nums w-14 text-right">
                      {holding.weight.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sector Breakdown Card */}
      {hasSectorBreakdown && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-amber-500" />
              Sector Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {etfData.sectorBreakdown!.map((sector) => (
                <div 
                  key={sector.sector} 
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <span className="text-sm font-medium flex-1 min-w-0 truncate pr-3">
                    {sector.sector}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, sector.weight)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium tabular-nums w-14 text-right">
                      {sector.weight.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
