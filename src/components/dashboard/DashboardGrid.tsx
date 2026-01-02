import { ReactNode } from 'react';
import { type DashboardWidget, type WidgetSize } from '@/hooks/useDashboardWidgets';
import { cn } from '@/lib/utils';

interface DashboardGridProps {
  widgets: DashboardWidget[];
  renderWidget: (widget: DashboardWidget) => ReactNode;
  className?: string;
}

const sizeToColSpan: Record<WidgetSize, string> = {
  small: 'col-span-1',
  medium: 'col-span-1 md:col-span-2',
  large: 'col-span-1 md:col-span-2 lg:col-span-3',
};

export function DashboardGrid({ widgets, renderWidget, className }: DashboardGridProps) {
  return (
    <div className={cn(
      'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
      className
    )}>
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className={cn(sizeToColSpan[widget.size])}
        >
          {renderWidget(widget)}
        </div>
      ))}
    </div>
  );
}
