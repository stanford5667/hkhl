/**
 * HistoryExpandColumn - Inline table column indicator for hidden historical data
 * Shows a narrow clickable column between labels and data when extra years are collapsed
 */

import React from 'react';
import { ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoryExpandColumnProps {
  lockedCount: number;
  isPro: boolean;
  showFullHistory: boolean;
  onToggle: () => void;
  onUpgrade: () => void;
  /** Render as <th> or <td> */
  as?: 'th' | 'td';
  className?: string;
}

export function HistoryExpandColumn({
  lockedCount,
  isPro,
  showFullHistory,
  onToggle,
  onUpgrade,
  as: Tag = 'td',
  className,
}: HistoryExpandColumnProps) {
  if (lockedCount <= 0) return null;

  const handleClick = () => {
    if (isPro) {
      onToggle();
    } else {
      onUpgrade();
    }
  };

  return (
    <Tag
      className={cn(
        "min-w-[44px] max-w-[44px] w-[44px] p-0 cursor-pointer select-none transition-all duration-200",
        "border-r border-primary/20",
        showFullHistory
          ? "bg-accent/60 hover:bg-accent/80"
          : "bg-primary/10 hover:bg-primary/20",
        className
      )}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center justify-center gap-1 py-2.5">
        {isPro ? (
          showFullHistory ? (
            <ChevronRight className="h-3.5 w-3.5 text-primary" />
          ) : (
            <div className="relative">
              <ChevronLeft className="h-3.5 w-3.5 text-primary animate-pulse" />
            </div>
          )
        ) : (
          <Crown className="h-3.5 w-3.5 text-amber-500 drop-shadow-sm" />
        )}
        <span className={cn(
          "text-[10px] font-semibold leading-none tracking-tight",
          showFullHistory ? "text-muted-foreground" : "text-primary"
        )}>
          {showFullHistory ? 'Hide' : `+${lockedCount}`}
        </span>
        {!showFullHistory && (
          <span className="text-[8px] font-medium text-muted-foreground leading-none uppercase tracking-wider">
            years
          </span>
        )}
      </div>
    </Tag>
  );
}
