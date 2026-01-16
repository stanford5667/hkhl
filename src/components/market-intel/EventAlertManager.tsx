import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Bell,
  BellPlus,
  BellOff,
  Clock,
  Mail,
  Smartphone,
  Trash2,
  Calendar,
  Globe,
  AlertCircle,
  Settings2,
  Plus,
  Check,
} from 'lucide-react';
import { 
  useEventAlertSubscriptions, 
  useCreateEventAlert, 
  useDeleteEventAlert,
  useUpdateEventAlert,
  useEventTypes,
  type CreateEventAlertInput,
} from '@/hooks/useEventAlerts';
import { triggerTestNotification } from '@/hooks/useEventNotifications';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

const EVENT_TYPES = [
  { value: 'all', label: 'All Events' },
  { value: 'Interest Rate', label: 'Interest Rate / FOMC' },
  { value: 'Employment', label: 'Employment (NFP, Claims)' },
  { value: 'Inflation', label: 'Inflation (CPI, PCE)' },
  { value: 'GDP', label: 'GDP / Growth' },
  { value: 'Consumer', label: 'Consumer Sentiment' },
  { value: 'Manufacturing', label: 'Manufacturing (ISM)' },
  { value: 'Retail', label: 'Retail Sales' },
  { value: 'Housing', label: 'Housing Market' },
];

const IMPORTANCE_OPTIONS = [
  { value: 'high', label: 'High', color: 'text-red-400' },
  { value: 'medium', label: 'Medium', color: 'text-amber-400' },
  { value: 'low', label: 'Low', color: 'text-muted-foreground' },
];

const TIMING_OPTIONS = [
  { value: 1, label: '1 hour before' },
  { value: 2, label: '2 hours before' },
  { value: 4, label: '4 hours before' },
  { value: 12, label: '12 hours before' },
  { value: 24, label: '1 day before' },
  { value: 48, label: '2 days before' },
  { value: 168, label: '1 week before' },
];

interface EventAlertManagerProps {
  className?: string;
}

export function EventAlertManager({ className }: EventAlertManagerProps) {
  const { data: subscriptions, isLoading } = useEventAlertSubscriptions();
  const createAlert = useCreateEventAlert();
  const deleteAlert = useDeleteEventAlert();
  const updateAlert = useUpdateEventAlert();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAlert, setNewAlert] = useState<CreateEventAlertInput>({
    event_type: null,
    importance: ['high'],
    countries: ['US'],
    alert_before_hours: 24,
    alert_on_release: true,
    in_app: true,
    email: false,
    push: false,
  });

  const handleCreate = async () => {
    await createAlert.mutateAsync(newAlert);
    setDialogOpen(false);
    setNewAlert({
      event_type: null,
      importance: ['high'],
      countries: ['US'],
      alert_before_hours: 24,
      alert_on_release: true,
      in_app: true,
      email: false,
      push: false,
    });
  };

  const toggleImportance = (value: string) => {
    const current = newAlert.importance || [];
    if (current.includes(value)) {
      setNewAlert({ ...newAlert, importance: current.filter(i => i !== value) });
    } else {
      setNewAlert({ ...newAlert, importance: [...current, value] });
    }
  };

  const getEventTypeLabel = (type: string | null) => {
    if (!type) return 'All Events';
    return EVENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const activeCount = subscriptions?.filter(s => s.is_active).length || 0;

  return (
    <Card className={cn("border-border/50 bg-card/50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Event Alerts</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeCount} active alert{activeCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5"
              onClick={triggerTestNotification}
            >
              <Bell className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Add Alert</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BellPlus className="h-5 w-5 text-primary" />
                  Create Event Alert
                </DialogTitle>
                <DialogDescription>
                  Get notified about upcoming economic events and data releases.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Alert Preview Box */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <AlertCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground mb-1">
                        You'll be notified when:
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span>
                            <strong>{getEventTypeLabel(newAlert.event_type)}</strong> events are 
                            <strong> {TIMING_OPTIONS.find(t => t.value === newAlert.alert_before_hours)?.label || '24 hours before'}</strong>
                          </span>
                        </li>
                        {newAlert.importance && newAlert.importance.length > 0 && (
                          <li className="flex items-center gap-1.5">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span>
                              Only <strong>{newAlert.importance.map(i => i.charAt(0).toUpperCase() + i.slice(1)).join(', ')}</strong> importance events
                            </span>
                          </li>
                        )}
                        {newAlert.alert_on_release && (
                          <li className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>And immediately when actual data is released</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Event Type */}
                <div className="space-y-2">
                  <Label>Event Category</Label>
                  <Select 
                    value={newAlert.event_type || 'all'} 
                    onValueChange={(v) => setNewAlert({ ...newAlert, event_type: v === 'all' ? null : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select "All Events" to get alerts for any economic release
                  </p>
                </div>

                {/* Importance Filter */}
                <div className="space-y-2">
                  <Label>Minimum Impact Level</Label>
                  <div className="flex gap-2">
                    {IMPORTANCE_OPTIONS.map(opt => (
                      <Button
                        key={opt.value}
                        variant={newAlert.importance?.includes(opt.value) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleImportance(opt.value)}
                        className={cn(
                          "flex-1",
                          newAlert.importance?.includes(opt.value) && opt.value === 'high' && 'bg-red-500 hover:bg-red-600',
                          newAlert.importance?.includes(opt.value) && opt.value === 'medium' && 'bg-amber-500 hover:bg-amber-600',
                        )}
                      >
                        {newAlert.importance?.includes(opt.value) && (
                          <Check className="h-3 w-3 mr-1" />
                        )}
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    High = major market movers (FOMC, NFP, CPI)
                  </p>
                </div>

                {/* Timing */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    How Far in Advance?
                  </Label>
                  <Select 
                    value={String(newAlert.alert_before_hours)} 
                    onValueChange={(v) => setNewAlert({ ...newAlert, alert_before_hours: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMING_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Alert on Release Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Also Alert When Data Drops</Label>
                    <p className="text-xs text-muted-foreground">
                      Get a second notification when the actual number is released
                    </p>
                  </div>
                  <Switch
                    checked={newAlert.alert_on_release}
                    onCheckedChange={(v) => setNewAlert({ ...newAlert, alert_on_release: v })}
                  />
                </div>

                <Separator />

                {/* Notification Channels */}
                <div className="space-y-2">
                  <Label>How to Notify You</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-background/50">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-sm">In-App Toast</span>
                          <p className="text-[10px] text-muted-foreground">Pop-up notification in corner</p>
                        </div>
                      </div>
                      <Switch
                        checked={newAlert.in_app}
                        onCheckedChange={(v) => setNewAlert({ ...newAlert, in_app: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-background/50 opacity-60">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-sm">Email</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 ml-2">Coming Soon</Badge>
                        </div>
                      </div>
                      <Switch
                        checked={newAlert.email}
                        onCheckedChange={(v) => setNewAlert({ ...newAlert, email: v })}
                        disabled
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-background/50 opacity-60">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-sm">Push</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 ml-2">Coming Soon</Badge>
                        </div>
                      </div>
                      <Switch
                        checked={newAlert.push}
                        onCheckedChange={(v) => setNewAlert({ ...newAlert, push: v })}
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={createAlert.isPending || (newAlert.importance?.length === 0)}
                >
                  {createAlert.isPending ? 'Creating...' : 'Create Alert'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-16 rounded-lg bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : subscriptions && subscriptions.length > 0 ? (
          <ScrollArea className="h-[280px] pr-3">
            <div className="space-y-2">
              {subscriptions.map(sub => (
                <div 
                  key={sub.id} 
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    sub.is_active 
                      ? "bg-secondary/30 border-border/50" 
                      : "bg-muted/30 border-muted/30 opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {getEventTypeLabel(sub.event_type)}
                        </span>
                        {sub.importance?.map(imp => (
                          <Badge 
                            key={imp} 
                            variant="outline" 
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              imp === 'high' && 'border-red-500/30 text-red-400',
                              imp === 'medium' && 'border-amber-500/30 text-amber-400',
                              imp === 'low' && 'border-muted-foreground/30'
                            )}
                          >
                            {imp}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {sub.alert_before_hours}h before
                        </span>
                        {sub.alert_on_release && (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            On release
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          {sub.in_app && <Bell className="h-3 w-3" />}
                          {sub.email && <Mail className="h-3 w-3" />}
                          {sub.push && <Smartphone className="h-3 w-3" />}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={sub.is_active}
                        onCheckedChange={(v) => updateAlert.mutate({ id: sub.id, is_active: v })}
                        className="scale-75"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteAlert.mutate(sub.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-muted/50 mb-3">
              <BellOff className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No alerts configured</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              Create alerts to get notified about upcoming economic events
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create First Alert
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
