import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ComprehensiveFundamentals } from '@/hooks/useComprehensiveFundamentals';

interface EarningsIntelCardProps {
  data: ComprehensiveFundamentals;
  isLoading?: boolean;
}

export function EarningsIntelCard({ data, isLoading }: EarningsIntelCardProps) {
  // Only show if we have earnings prediction data
  if (!data.beatProbability && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-2 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
    );
  }

  const probability = data.beatProbability || 0;
  const confidence = data.confidenceLevel;
  
  const confidenceColors = {
    high: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
    medium: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    low: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
  };
  
  const barWidth = Math.min(100, Math.max(0, probability));

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-2 space-y-2">
        {/* Header */}
        <div className="flex items-center gap-1">
          <Target className="h-3 w-3 text-primary" />
          <span className="text-[10px] md:text-xs font-medium">Earnings Intelligence</span>
        </div>
        
        {/* Beat Probability */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground">Beat Probability</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tabular-nums">{probability}%</span>
              {confidence && (
                <Badge 
                  variant="outline" 
                  className={cn("text-[7px] px-1 py-0 h-4 uppercase", confidenceColors[confidence])}
                >
                  {confidence}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className={cn(
                "absolute top-0 left-0 h-full rounded-full transition-all duration-500",
                probability >= 70 ? "bg-emerald-500" : 
                probability >= 50 ? "bg-blue-500" : 
                "bg-amber-500"
              )}
              style={{ width: `${barWidth}%` }}
            />
            {/* Center marker at 50% */}
            <div className="absolute top-0 left-1/2 w-px h-full bg-muted-foreground/30" />
          </div>
        </div>
        
        {/* Additional Info */}
        <div className="flex items-center justify-between text-[8px] text-muted-foreground">
          <span>EPS Std Dev: {data.epsStdDev ? `$${data.epsStdDev.toFixed(2)}` : '—'}</span>
          <span>Avg Vol: {data.avgVolume20D ? `${(data.avgVolume20D / 1e6).toFixed(1)}M` : '—'}</span>
        </div>
      </CardContent>
    </Card>
  );
}
