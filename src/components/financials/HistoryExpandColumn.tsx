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
        "min-w-[40px] max-w-[40px] w-[40px] p-0 cursor-pointer select-none transition-colors",
        "border-r border-border/30",
        "hover:bg-accent/40",
        className
      )}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center justify-center gap-0.5 py-2">
        {isPro ? (
          showFullHistory ? (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-muted-foreground" />
          )
        ) : (
          <Crown className="h-3 w-3 text-amber-500" />
        )}
        <span className="text-[9px] font-medium text-muted-foreground leading-none">
          {showFullHistory ? 'Hide' : `+${lockedCount}yr`}
        </span>
      </div>
    </Tag>
  );
}
