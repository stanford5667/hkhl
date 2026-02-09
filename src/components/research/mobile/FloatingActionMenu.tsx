import { cn } from '@/lib/utils';
import { Zap, BarChart3, Search, LineChart, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ActionItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

interface FloatingActionMenuProps {
  primaryAction?: ActionItem;
  secondaryActions?: ActionItem[];
  position?: 'bottom-right' | 'bottom-center';
}

export function FloatingActionMenu({
  primaryAction,
  secondaryActions = [],
  position = 'bottom-right',
}: FloatingActionMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const positionClasses = {
    'bottom-right': 'right-4 bottom-20',
    'bottom-center': 'left-1/2 -translate-x-1/2 bottom-20',
  };

  // If no primary action provided, create a default
  const mainAction = primaryAction || {
    id: 'main',
    icon: <Plus className="h-6 w-6" />,
    label: 'Actions',
    onClick: () => setIsExpanded(!isExpanded),
    variant: 'primary' as const,
  };

  return (
    <div className={cn(
      "fixed z-50",
      positionClasses[position]
    )}>
      {/* Backdrop when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm -z-10"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Secondary Actions (expand upward) */}
      <AnimatePresence>
        {isExpanded && secondaryActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 mb-2 space-y-2"
          >
            {secondaryActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-2 justify-end"
              >
                <span className="text-xs font-medium text-foreground bg-card px-3 py-1.5 rounded-lg shadow-lg border border-border whitespace-nowrap">
                  {action.label}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-12 w-12 rounded-full shadow-lg bg-card border-border hover:bg-accent"
                  onClick={() => {
                    action.onClick();
                    setIsExpanded(false);
                  }}
                >
                  {action.icon}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary FAB */}
      <motion.button
        className={cn(
          "h-14 w-14 rounded-full shadow-lg flex items-center justify-center",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "active:scale-95 transition-transform touch-manipulation"
        )}
        onClick={() => {
          if (secondaryActions.length > 0) {
            setIsExpanded(!isExpanded);
          } else {
            mainAction.onClick();
          }
        }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isExpanded ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {isExpanded ? <X className="h-6 w-6" /> : mainAction.icon}
      </motion.button>
    </div>
  );
}

// Pre-configured action sets for common use cases
export const stockActions = {
  analyze: {
    id: 'analyze',
    icon: <BarChart3 className="h-5 w-5" />,
    label: 'Analyze',
  },
  compare: {
    id: 'compare',
    icon: <Search className="h-5 w-5" />,
    label: 'Compare',
  },
  backtest: {
    id: 'backtest',
    icon: <LineChart className="h-5 w-5" />,
    label: 'Backtest',
  },
  trade: {
    id: 'trade',
    icon: <Zap className="h-5 w-5" />,
    label: 'Trade',
  },
};
