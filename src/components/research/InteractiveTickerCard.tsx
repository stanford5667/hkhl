import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { MiniSparkline } from './MiniSparkline';
import { supabase } from '@/integrations/supabase/client';

interface InteractiveTickerCardProps {
  symbol: string;
  name: string;
  price?: number;
  changePercent?: number;
  onClick: () => void;
}

export function InteractiveTickerCard({
  symbol,
  name,
  price,
  changePercent,
  onClick,
}: InteractiveTickerCardProps) {
  const [sparklineData, setSparklineData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch sparkline data directly from Polygon via edge function
  useEffect(() => {
    let mounted = true;
    
    async function fetchPolygonSparkline() {
      try {
        const { data, error } = await supabase.functions.invoke('polygon-daily-bars', {
          body: { ticker: symbol.toUpperCase(), days: 30 }
        });
        
        if (!error && data?.ok && data?.bars?.length > 0 && mounted) {
          const closes = data.bars.map((bar: { close: number }) => bar.close);
          setSparklineData(closes);
        }
      } catch (err) {
        console.warn(`[Sparkline] Polygon fetch failed for ${symbol}:`, err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    
    fetchPolygonSparkline();
    return () => { mounted = false; };
  }, [symbol]);

  const isPositive = (changePercent ?? 0) >= 0;

  const formatPrice = (p: number | undefined) => {
    if (!p) return '—';
    return p.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 2 
    });
  };

  return (
    <button
      onClick={onClick}
      className="flex flex-col p-3 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-accent/30 transition-all text-left group"
    >
      {/* Header: Symbol + Change */}
      <div className="flex items-center justify-between w-full mb-1">
        <span className="font-semibold text-sm text-foreground">{symbol}</span>
        {changePercent !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        )}
      </div>
      
      {/* Company Name */}
      <span className="text-xs text-muted-foreground truncate w-full mb-2">{name}</span>
      
      {/* Sparkline Chart with Price Scale */}
      <div className="w-full h-12 mb-2">
        {isLoading ? (
          <div className="w-full h-full bg-muted/30 animate-pulse rounded" />
        ) : sparklineData.length > 0 ? (
          <MiniSparkline 
            data={sparklineData} 
            width={160} 
            height={48} 
            isPositive={isPositive}
            showPriceScale={true}
            className="w-full"
          />
        ) : (
          <div className="w-full h-full bg-muted/20 rounded flex items-center justify-center text-xs text-muted-foreground">
            No data
          </div>
        )}
      </div>
      
      {/* Price */}
      <span className="text-sm font-semibold text-foreground">
        {formatPrice(price)}
      </span>
    </button>
  );
}
