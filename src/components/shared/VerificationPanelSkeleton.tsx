import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface VerificationPanelSkeletonProps {
  className?: string;
}

export function VerificationPanelSkeleton({ className }: VerificationPanelSkeletonProps) {
  return (
    <Card className={cn('border-2 border-dashed', className)}>
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Icon placeholder */}
            <Skeleton className="h-5 w-5 rounded" />
            {/* Title */}
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="flex items-center gap-2">
            {/* Badge */}
            <Skeleton className="h-5 w-20 rounded-full" />
            {/* Chevron */}
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pb-6">
        {/* Data Sources Section */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="rounded-lg border border-border overflow-hidden">
            {/* Table header */}
            <div className="flex gap-4 p-3 bg-muted/50 border-b border-border">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            {/* Table rows */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 p-3 border-b border-border last:border-0">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Calculations Section */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Export Buttons */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 w-28 rounded" />
          <Skeleton className="h-9 w-28 rounded" />
          <Skeleton className="h-9 w-24 rounded ml-auto" />
        </div>
      </CardContent>
    </Card>
  );
}

export default VerificationPanelSkeleton;
