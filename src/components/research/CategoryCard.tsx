import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  onClick: () => void;
  stockCount?: number;
}

export function CategoryCard({ title, description, icon: Icon, gradient, onClick, stockCount }: CategoryCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-xl p-5 text-left transition-all duration-300",
        "border border-border hover:border-primary/50",
        "bg-card hover:shadow-lg hover:shadow-primary/10",
        "min-h-[140px] flex flex-col justify-between"
      )}
    >
      {/* Gradient accent */}
      <div className={cn(
        "absolute top-0 right-0 w-24 h-24 opacity-20 blur-2xl transition-opacity group-hover:opacity-40",
        gradient
      )} />
      
      {/* Icon + Count Badge */}
      <div className="flex items-start justify-between">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          "bg-primary/10 text-primary"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        {stockCount !== undefined && stockCount > 0 && (
          <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            {stockCount.toLocaleString()} stocks
          </span>
        )}
      </div>
      
      {/* Content */}
      <div className="mt-3">
        <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {description}
        </p>
      </div>
    </button>
  );
}
