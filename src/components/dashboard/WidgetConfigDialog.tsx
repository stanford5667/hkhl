import { Settings, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { type DashboardWidget } from '@/hooks/useDashboardWidgets';
import { cn } from '@/lib/utils';

interface WidgetConfigDialogProps {
  widgets: DashboardWidget[];
  onToggle: (widgetId: string) => void;
  onReset: () => void;
}

export function WidgetConfigDialog({ widgets, onToggle, onReset }: WidgetConfigDialogProps) {
  const enabledCount = widgets.filter(w => w.enabled).length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Customize
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-background">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Toggle widgets to show or hide them on your dashboard.
          </p>
          <div className="space-y-3">
            {widgets.map((widget) => (
              <div
                key={widget.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-colors',
                  widget.enabled ? 'border-primary/30 bg-primary/5' : 'border-border'
                )}
              >
                <div className="flex items-center gap-3">
                  <widget.icon className={cn(
                    'h-4 w-4',
                    widget.enabled ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  <div>
                    <Label htmlFor={widget.id} className="cursor-pointer font-medium">
                      {widget.title}
                    </Label>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {widget.size}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Switch
                  id={widget.id}
                  checked={widget.enabled}
                  onCheckedChange={() => onToggle(widget.id)}
                />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <span className="text-sm text-muted-foreground">
            {enabledCount} of {widgets.length} enabled
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
