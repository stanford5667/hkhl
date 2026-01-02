import React from 'react';
import { X, ExternalLink, Edit, Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface QuickPreviewCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  onClose: () => void;
  onOpenDetail: () => void;
  onEdit?: () => void;
  onAddTask?: () => void;
  onAddNote?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function QuickPreviewCard({
  title,
  subtitle,
  icon,
  badge,
  onClose,
  onOpenDetail,
  onEdit,
  onAddTask,
  onAddNote,
  children,
  className,
}: QuickPreviewCardProps) {
  return (
    <Card
      data-quick-preview
      className={cn(
        'border-border/50 shadow-lg animate-in slide-in-from-right-4 duration-200',
        className
      )}
    >
      <CardHeader className="pb-3 space-y-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {icon && (
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate">{title}</h3>
                {badge}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {children}

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={onOpenDetail}
          >
            <ExternalLink className="h-4 w-4 mr-1.5" />
            Open Details
          </Button>
          
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
          
          {onAddTask && (
            <Button variant="outline" size="sm" onClick={onAddTask}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
          
          {onAddNote && (
            <Button variant="outline" size="sm" onClick={onAddNote}>
              <FileText className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Empty state when nothing is selected
export function QuickPreviewEmpty({ message = 'Select an item to preview' }: { message?: string }) {
  return (
    <div
      data-quick-preview
      className="h-full flex items-center justify-center p-8 border border-dashed border-border/50 rounded-lg bg-muted/20"
    >
      <p className="text-sm text-muted-foreground text-center">{message}</p>
    </div>
  );
}

// Loading state
export function QuickPreviewLoading() {
  return (
    <Card data-quick-preview className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-3 bg-muted rounded" />
        <div className="h-3 bg-muted rounded w-4/5" />
        <div className="h-3 bg-muted rounded w-3/5" />
      </CardContent>
    </Card>
  );
}
