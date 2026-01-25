import { LucideIcon, ChevronRight } from 'lucide-react';
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
        "group relative overflow-hidden rounded-xl p-4 text-left transition-all duration-300",
        "border border-border/60 hover:border-primary/40",
        "bg-gradient-to-br from-card to-card/80",
        "hover:shadow-xl hover:shadow-primary/5",
        "min-h-[120px] flex flex-col justify-between"
      )}
    >
      {/* Gradient accent */}
      <div className={cn(
        "absolute top-0 right-0 w-20 h-20 opacity-15 blur-2xl transition-opacity group-hover:opacity-30",
        gradient
      )} />
      
      {/* Header: Icon + Arrow */}
      <div className="flex items-center justify-between">
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center",
          "bg-primary/10 text-primary border border-primary/20"
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
      
      {/* Content */}
      <div className="mt-3">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          {stockCount !== undefined && stockCount > 0 && (
            <span className="text-[9px] font-medium text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-full">
              {stockCount.toLocaleString()}
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed mb-2">
          {description}
        </p>
        
        {/* Click hint */}
        <div className="flex items-center gap-1 text-[9px] text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Explore stocks</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>
    </button>
  );
}
