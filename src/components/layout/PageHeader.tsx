/**
 * Unified Page Header Component
 * 
 * Provides consistent page header styling across the application.
 * Features:
 * - Consistent typography and spacing
 * - Icon with gradient background
 * - Title and subtitle
 * - Optional action buttons
 */

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  iconColor?: string;
  iconBgGradient?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  iconColor = 'text-primary',
  iconBgGradient,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4", className)}>
      <div className="flex items-center gap-3">
        {iconBgGradient ? (
          <div className={cn("p-2.5 rounded-xl border", iconBgGradient)}>
            <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", iconColor)} />
          </div>
        ) : (
          <Icon className={cn("h-5 w-5 sm:h-7 sm:w-7", iconColor)} />
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm sm:text-base mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * Common icon gradient presets for consistency
 */
export const PAGE_ICON_PRESETS = {
  primary: {
    iconColor: 'text-primary',
    iconBgGradient: 'bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30',
  },
  violet: {
    iconColor: 'text-violet-400',
    iconBgGradient: 'bg-gradient-to-br from-violet-500/20 to-purple-500/20 border-violet-500/30',
  },
  emerald: {
    iconColor: 'text-emerald-400',
    iconBgGradient: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
  },
  amber: {
    iconColor: 'text-amber-400',
    iconBgGradient: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30',
  },
  rose: {
    iconColor: 'text-rose-400',
    iconBgGradient: 'bg-gradient-to-br from-rose-500/20 to-pink-500/20 border-rose-500/30',
  },
  blue: {
    iconColor: 'text-blue-400',
    iconBgGradient: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  },
} as const;
