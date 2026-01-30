import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ComprehensiveFundamentals } from '@/hooks/useComprehensiveFundamentals';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ComprehensiveMetricsCardProps {
  data: ComprehensiveFundamentals;
  isLoading?: boolean;
}

function MetricCell({ 
  label, 
  value, 
  suffix = '', 
  prefix = '',
  isPositive,
  tooltip,
}: { 
  label: string; 
  value: number | string | null; 
  suffix?: string;
  prefix?: string;
  isPositive?: boolean;
  tooltip?: string;
}) {
  const displayValue = value === null || value === undefined 
    ? '—' 
    : typeof value === 'number'
      ? `${prefix}${value.toFixed(value < 10 && value > -10 ? 2 : 1)}${suffix}`
      : value;
  
  return (
    <div className="p-1.5 bg-secondary/30 rounded text-center">
      <div className="flex items-center justify-center gap-0.5">
        <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase truncate">{label}</p>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-2.5 w-2.5 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <p className={cn(
        "text-[10px] md:text-xs font-bold tabular-nums",
        isPositive === true && "text-emerald-500",
        isPositive === false && "text-destructive"
      )}>
        {displayValue}
      </p>
    </div>
  );
}

function formatMarketCap(value: number | null): string {
  if (!value) return '—';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

export function ComprehensiveMetricsCard({ data, isLoading }: ComprehensiveMetricsCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-2 space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sourceColor = data.useMockData 
    ? 'text-amber-500' 
    : data.dataQuality >= 7 
      ? 'text-emerald-500' 
      : 'text-muted-foreground';

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-2 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3 text-primary" />
            <span className="text-[10px] md:text-xs font-medium">Key Financials</span>
          </div>
          <Badge variant="outline" className={cn("text-[7px] px-1 py-0 h-4", sourceColor)}>
            {data.source} ({data.dataQuality}/10)
          </Badge>
        </div>
        
        {/* Valuation Row */}
        <div className="grid grid-cols-4 gap-1.5">
          <MetricCell 
            label="Mkt Cap" 
            value={formatMarketCap(data.marketCap)}
            tooltip="Total market value of outstanding shares"
          />
          <MetricCell 
            label="EPS" 
            value={data.eps} 
            prefix="$"
            tooltip="Earnings per share (TTM)"
          />
          <MetricCell 
            label="P/E" 
            value={data.pe} 
            suffix="x"
            tooltip="Price to earnings ratio"
          />
          <MetricCell 
            label="Fwd P/E" 
            value={data.forwardPE} 
            suffix="x"
            tooltip="Forward price to earnings based on analyst estimates"
          />
        </div>
        
        {/* Valuation Row 2 */}
        <div className="grid grid-cols-4 gap-1.5">
          <MetricCell 
            label="PEG" 
            value={data.peg}
            tooltip="P/E divided by EPS growth rate"
          />
          <MetricCell 
            label="P/B" 
            value={data.priceToBook} 
            suffix="x"
            tooltip="Price to book value ratio"
          />
          <MetricCell 
            label="P/Cash" 
            value={data.priceToCash} 
            suffix="x"
            tooltip="Price to cash flow ratio"
          />
          <MetricCell 
            label="EV/EBITDA" 
            value={data.evToEbitda} 
            suffix="x"
            tooltip="Enterprise value to EBITDA"
          />
        </div>
        
        {/* Profitability & Stability Row */}
        <div className="grid grid-cols-4 gap-1.5">
          <MetricCell 
            label="Op Margin" 
            value={data.operatingMargin} 
            suffix="%"
            isPositive={data.operatingMargin ? data.operatingMargin > 15 : undefined}
            tooltip="Operating income as % of revenue"
          />
          <MetricCell 
            label="D/E" 
            value={data.debtToEquity}
            isPositive={data.debtToEquity ? data.debtToEquity < 1 : undefined}
            tooltip="Total debt divided by shareholders' equity"
          />
          <MetricCell 
            label="Quick" 
            value={data.quickRatio}
            isPositive={data.quickRatio ? data.quickRatio > 1 : undefined}
            tooltip="(Current assets - inventory) / current liabilities"
          />
          <MetricCell 
            label="Beta" 
            value={data.beta}
            tooltip="Volatility relative to market (1 = market)"
          />
        </div>
        
        {/* Growth & Returns Row */}
        <div className="grid grid-cols-4 gap-1.5">
          <MetricCell 
            label="EPS Gr" 
            value={data.epsGrowthYoY} 
            suffix="%"
            isPositive={data.epsGrowthYoY ? data.epsGrowthYoY > 0 : undefined}
            tooltip="Year-over-year EPS growth rate"
          />
          <MetricCell 
            label="Rev Gr" 
            value={data.revenueGrowthYoY} 
            suffix="%"
            isPositive={data.revenueGrowthYoY ? data.revenueGrowthYoY > 0 : undefined}
            tooltip="Year-over-year revenue growth rate"
          />
          <MetricCell 
            label="ROE" 
            value={data.returnOnEquity} 
            suffix="%"
            isPositive={data.returnOnEquity ? data.returnOnEquity > 15 : undefined}
            tooltip="Return on equity"
          />
          <MetricCell 
            label="ROA" 
            value={data.returnOnAssets} 
            suffix="%"
            isPositive={data.returnOnAssets ? data.returnOnAssets > 5 : undefined}
            tooltip="Return on assets"
          />
        </div>
      </CardContent>
    </Card>
  );
}
