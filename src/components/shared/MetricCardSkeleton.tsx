import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MetricCardSkeletonProps {
  className?: string;
  variant?: 'compact' | 'expanded';
}

export function MetricCardSkeleton({ className, variant = 'compact' }: MetricCardSkeletonProps) {
  return (
    <Card className={cn('animate-pulse', className)}>
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-2">
              {/* Metric name */}
              <Skeleton className="h-4 w-24" />
              {/* Metric value */}
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Interpretation badge */}
            <Skeleton className="h-5 w-16 rounded-full" />
            {/* Chevron */}
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      
      {variant === 'expanded' && (
        <CardContent className="pt-0 pb-4 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 flex-1 rounded" />
            ))}
          </div>
          {/* Content */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          {/* Why it matters box */}
          <div className="p-3 border border-border rounded-lg space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Grid of metric skeletons
interface MetricGridSkeletonProps {
  count?: number;
  columns?: number;
  className?: string;
}

export function MetricGridSkeleton({ 
  count = 6, 
  columns = 2, 
  className 
}: MetricGridSkeletonProps) {
  return (
    <div 
      className={cn(
        'grid gap-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 md:grid-cols-2',
        columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default MetricCardSkeleton;
