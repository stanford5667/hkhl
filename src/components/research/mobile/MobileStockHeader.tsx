import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Bookmark, Bell, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface MobileStockHeaderProps {
  ticker: string;
  companyName?: string;
  price: number;
  change: number;
  changePercent: number;
  exchange?: string;
  sector?: string;
  onWatchlist?: () => void;
  onAlert?: () => void;
  isWatchlisted?: boolean;
  hasAlert?: boolean;
  sticky?: boolean;
}

export function MobileStockHeader({
  ticker,
  companyName,
  price,
  change,
  changePercent,
  exchange,
  sector,
  onWatchlist,
  onAlert,
  isWatchlisted = false,
  hasAlert = false,
  sticky = true,
}: MobileStockHeaderProps) {
  const isPositive = change >= 0;
  const [showDetails, setShowDetails] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <motion.div
      className={cn(
        "bg-background/95 backdrop-blur-md border-b border-border z-30",
        sticky && "sticky top-0"
      )}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-4 py-3 space-y-2">
        {/* Main Row: Symbol + Price + Actions */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Symbol & Price */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 min-w-0"
            >
              <span className="text-xl font-bold text-foreground">{ticker}</span>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                showDetails && "rotate-180"
              )} />
            </button>
            
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {formatCurrency(price)}
              </span>
              <motion.div 
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                  isPositive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                )}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span className="tabular-nums">
                  {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                </span>
              </motion.div>
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 rounded-full",
                isWatchlisted && "text-primary bg-primary/10"
              )}
              onClick={onWatchlist}
            >
              <Bookmark className={cn("h-4 w-4", isWatchlisted && "fill-current")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 rounded-full",
                hasAlert && "text-amber-500 bg-amber-500/10"
              )}
              onClick={onAlert}
            >
              <Bell className={cn("h-4 w-4", hasAlert && "fill-current")} />
            </Button>
          </div>
        </div>

        {/* Expandable Details Row */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-1 pb-2 space-y-2">
                <p className="text-sm text-muted-foreground truncate">
                  {companyName || ticker}
                </p>
                <div className="flex items-center gap-2">
                  {exchange && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-secondary/50">
                      {exchange}
                    </Badge>
                  )}
                  {sector && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-secondary/50">
                      {sector}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    <span className="opacity-70">Change: </span>
                    <span className={cn("font-medium", isPositive ? "text-success" : "text-destructive")}>
                      {isPositive ? '+' : ''}{formatCurrency(change)}
                    </span>
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
