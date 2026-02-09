import { cn } from "@/lib/utils";

interface ShimmerSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton (default: full width) */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
  /** Border radius variant */
  variant?: 'default' | 'rounded' | 'circle' | 'card';
}

export function ShimmerSkeleton({ 
  className, 
  width, 
  height,
  variant = 'default',
  style,
  ...props 
}: ShimmerSkeletonProps) {
  const variantClasses = {
    default: 'rounded-md',
    rounded: 'rounded-xl',
    circle: 'rounded-full',
    card: 'rounded-xl',
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden bg-muted/60",
        variantClasses[variant],
        className
      )} 
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style
      }}
      {...props}
    >
      {/* Shimmer gradient overlay */}
      <div 
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, hsl(var(--muted-foreground) / 0.08) 50%, transparent 100%)',
        }}
      />
    </div>
  );
}

/** Pre-composed skeleton patterns for common use cases */

export function ShimmerCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-card border border-border rounded-xl p-4 space-y-3", className)}>
      <div className="flex items-center gap-3">
        <ShimmerSkeleton variant="circle" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <ShimmerSkeleton height={14} width="60%" />
          <ShimmerSkeleton height={10} width="40%" />
        </div>
      </div>
      <ShimmerSkeleton height={12} />
      <ShimmerSkeleton height={12} width="80%" />
    </div>
  );
}

export function ShimmerMetricCard({ className }: { className?: string }) {
  return (
    <div className={cn(
      "flex-shrink-0 w-40 bg-card border border-border rounded-xl p-4 space-y-2",
      className
    )}>
      <div className="flex items-center gap-2">
        <ShimmerSkeleton variant="rounded" width={28} height={28} />
        <ShimmerSkeleton height={10} width={60} />
      </div>
      <ShimmerSkeleton height={24} width="70%" />
      <ShimmerSkeleton height={12} width="50%" />
    </div>
  );
}

export function ShimmerChartCard({ className, height = 280 }: { className?: string; height?: number }) {
  return (
    <div className={cn("bg-card border border-border rounded-xl p-4 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <ShimmerSkeleton height={14} width={100} />
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <ShimmerSkeleton key={i} variant="rounded" width={32} height={24} />
          ))}
        </div>
      </div>
      <ShimmerSkeleton variant="rounded" height={height} />
    </div>
  );
}

export function ShimmerPriceHeader({ className }: { className?: string }) {
  return (
    <div className={cn("p-4 space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShimmerSkeleton height={24} width={60} />
          <ShimmerSkeleton height={32} width={100} />
          <ShimmerSkeleton variant="rounded" height={24} width={70} />
        </div>
        <div className="flex gap-2">
          <ShimmerSkeleton variant="circle" width={36} height={36} />
          <ShimmerSkeleton variant="circle" width={36} height={36} />
        </div>
      </div>
    </div>
  );
}
