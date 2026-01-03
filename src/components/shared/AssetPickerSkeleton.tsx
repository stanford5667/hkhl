import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AssetPickerSkeletonProps {
  className?: string;
  itemCount?: number;
}

export function AssetPickerSkeleton({ className, itemCount = 6 }: AssetPickerSkeletonProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-4 space-y-4">
        {/* Search Input Skeleton */}
        <Skeleton className="h-10 w-full rounded-md" />
        
        {/* Category Tabs Skeleton */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-8 flex-1 rounded" />
          ))}
        </div>
        
        {/* Results Grid Skeleton */}
        <div className="h-[300px] overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.from({ length: itemCount }).map((_, i) => (
              <AssetItemSkeleton key={i} />
            ))}
          </div>
        </div>
        
        {/* Footer Skeleton */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16 rounded" />
            <Skeleton className="h-8 w-28 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AssetItemSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            {/* Ticker */}
            <Skeleton className="h-5 w-12" />
            {/* Star icon placeholder */}
            <Skeleton className="h-3 w-3 rounded-full" />
          </div>
          {/* Name */}
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      
      {/* Badges */}
      <div className="flex items-center gap-1.5 mt-2">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-12 rounded-full" />
        <Skeleton className="h-4 w-14 rounded-full" />
      </div>
    </div>
  );
}

export default AssetPickerSkeleton;
