import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DashboardSkeletonProps {
  className?: string;
}

export function AdvancedMetricsDashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded" />
      </div>
      
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charts Section */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded" />
          </CardContent>
        </Card>
        
        {/* Metrics Grid */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <MetricItemSkeleton key={i} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Category Sections */}
      {[1, 2].map((section) => (
        <Card key={section}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-36" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <MetricItemSkeleton key={i} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function MetricItemSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-border space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-6 w-16" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-12 rounded-full" />
        <Skeleton className="h-3 w-8" />
      </div>
    </div>
  );
}

// Progress indicator for calculations
interface CalculationProgressProps {
  progress: number;
  message?: string;
  className?: string;
}

export function CalculationProgress({ progress, message, className }: CalculationProgressProps) {
  return (
    <Card className={cn('border-primary/30 bg-primary/5', className)}>
      <CardContent className="py-8">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Animated spinner */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
            <div 
              className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold">Calculating Metrics</h3>
            {message && (
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
            )}
          </div>
          
          {/* Progress bar */}
          <div className="w-full max-w-xs">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AdvancedMetricsDashboardSkeleton;
