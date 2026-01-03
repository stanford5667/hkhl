// Efficient Frontier Slider Component
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts';
import { EfficientFrontierPoint } from '@/types/portfolio';
import { cn } from '@/lib/utils';
import { TrendingUp, Shield, Target } from 'lucide-react';

interface EfficientFrontierSliderProps {
  frontierPoints: EfficientFrontierPoint[];
  selectedPoint: EfficientFrontierPoint | null;
  onRiskToleranceChange: (tolerance: number) => void;
  riskTolerance: number;
  currentPortfolio?: { risk: number; return: number };
}

export function EfficientFrontierSlider({
  frontierPoints,
  selectedPoint,
  onRiskToleranceChange,
  riskTolerance,
  currentPortfolio
}: EfficientFrontierSliderProps) {
  // Convert frontier to chart data
  const chartData = useMemo(() => {
    return frontierPoints.map(p => ({
      risk: parseFloat(p.risk.toFixed(2)),
      return: parseFloat(p.return.toFixed(2)),
      sharpe: parseFloat(p.sharpe.toFixed(2)),
    }));
  }, [frontierPoints]);

  // Find max Sharpe portfolio
  const maxSharpePoint = useMemo(() => {
    if (frontierPoints.length === 0) return null;
    return frontierPoints.reduce((best, p) => p.sharpe > best.sharpe ? p : best);
  }, [frontierPoints]);

  // Find min volatility portfolio
  const minVolPoint = useMemo(() => {
    if (frontierPoints.length === 0) return null;
    return frontierPoints.reduce((min, p) => p.risk < min.risk ? p : min);
  }, [frontierPoints]);

  if (frontierPoints.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Target className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>Run the analysis to generate the efficient frontier</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-purple-500" />
          Efficient Frontier
        </CardTitle>
        <CardDescription>
          Drag the slider to adjust your risk-return tradeoff. Optimal weights update in real-time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="frontierGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="risk" 
                tick={{ fontSize: 11 }} 
                label={{ value: 'Risk (Volatility %)', position: 'insideBottom', offset: -5, fontSize: 11 }}
                domain={['auto', 'auto']}
              />
              <YAxis 
                dataKey="return" 
                tick={{ fontSize: 11 }} 
                label={{ value: 'Return %', angle: -90, position: 'insideLeft', fontSize: 11 }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(2)}%`,
                  name === 'risk' ? 'Volatility' : name === 'return' ? 'Expected Return' : 'Sharpe'
                ]}
              />
              <Area
                type="monotone"
                dataKey="return"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#frontierGradient)"
              />
              
              {/* Max Sharpe point */}
              {maxSharpePoint && (
                <ReferenceDot
                  x={parseFloat(maxSharpePoint.risk.toFixed(2))}
                  y={parseFloat(maxSharpePoint.return.toFixed(2))}
                  r={6}
                  fill="hsl(var(--chart-2))"
                  stroke="white"
                  strokeWidth={2}
                />
              )}
              
              {/* Selected point */}
              {selectedPoint && (
                <ReferenceDot
                  x={parseFloat(selectedPoint.risk.toFixed(2))}
                  y={parseFloat(selectedPoint.return.toFixed(2))}
                  r={8}
                  fill="hsl(var(--primary))"
                  stroke="white"
                  strokeWidth={2}
                />
              )}
              
              {/* Current portfolio if different */}
              {currentPortfolio && (
                <ReferenceDot
                  x={currentPortfolio.risk}
                  y={currentPortfolio.return}
                  r={5}
                  fill="hsl(var(--destructive))"
                  stroke="white"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>Selected Portfolio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-chart-2" />
            <span>Max Sharpe</span>
          </div>
          {currentPortfolio && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span>Current Portfolio</span>
            </div>
          )}
        </div>

        {/* Risk Tolerance Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Risk Tolerance</span>
            </div>
            <Badge variant="secondary">{riskTolerance}%</Badge>
          </div>
          <Slider
            value={[riskTolerance]}
            onValueChange={([value]) => onRiskToleranceChange(value)}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Minimum Volatility</span>
            <span>Maximum Return</span>
          </div>
        </div>

        {/* Selected Portfolio Stats */}
        {selectedPoint && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Expected Return</p>
              <p className={cn(
                "text-lg font-bold",
                selectedPoint.return >= 0 ? "text-emerald-500" : "text-rose-500"
              )}>
                {selectedPoint.return >= 0 ? '+' : ''}{selectedPoint.return.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Volatility</p>
              <p className="text-lg font-bold text-foreground">
                {selectedPoint.risk.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Sharpe Ratio</p>
              <p className={cn(
                "text-lg font-bold",
                selectedPoint.sharpe > 1 ? "text-emerald-500" : selectedPoint.sharpe > 0.5 ? "text-foreground" : "text-rose-500"
              )}>
                {selectedPoint.sharpe.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Optimal Weights Preview */}
        {selectedPoint && selectedPoint.weights.size > 0 && (
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-3">Optimal Allocation at this Risk Level</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedPoint.weights.entries())
                .filter(([_, weight]) => weight > 0.01)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([symbol, weight]) => (
                  <Badge key={symbol} variant="outline" className="gap-1">
                    <span className="font-mono">{symbol}</span>
                    <span className="text-muted-foreground">{(weight * 100).toFixed(1)}%</span>
                  </Badge>
                ))
              }
              {selectedPoint.weights.size > 8 && (
                <Badge variant="secondary">+{selectedPoint.weights.size - 8} more</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
