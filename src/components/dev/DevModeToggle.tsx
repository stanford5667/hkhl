import { useState } from 'react';
import { Activity, Pause, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDevMode } from '@/contexts/DevModeContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function DevModeToggle() {
  const { 
    marketDataEnabled, 
    toggleMarketData, 
    apiCallCount, 
    resetApiCallCount,
    isDevEnvironment 
  } = useDevMode();
  
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show in development or for debugging
  if (!isDevEnvironment) return null;

  return (
    <motion.div
      className="fixed bottom-4 left-4 z-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div className={cn(
        "rounded-lg border shadow-lg backdrop-blur-sm transition-colors",
        marketDataEnabled 
          ? "bg-emerald-500/10 border-emerald-500/30" 
          : "bg-amber-500/10 border-amber-500/30"
      )}>
        {/* Main toggle button */}
        <button
          onClick={toggleMarketData}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors w-full",
            marketDataEnabled 
              ? "text-emerald-400 hover:text-emerald-300" 
              : "text-amber-400 hover:text-amber-300"
          )}
        >
          {marketDataEnabled ? (
            <Activity className="h-4 w-4" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
          <span className="whitespace-nowrap">
            {marketDataEnabled ? 'Live Data' : 'Data Paused'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="ml-1 p-0.5 hover:bg-white/10 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </button>
        </button>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-2 pt-1 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{apiCallCount} API calls this session</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetApiCallCount}
                    className="h-6 px-2 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground/70">
                  {marketDataEnabled 
                    ? 'API calls are active' 
                    : 'Using cached data only'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
