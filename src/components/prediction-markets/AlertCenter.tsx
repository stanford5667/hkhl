import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  BellRing,
  X, 
  Check, 
  Eye,
  Trash2,
  Settings,
  TrendingUp,
  Zap,
  Newspaper,
  Clock,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  alert_type: string;
  headline: string;
  summary: string;
  why_it_matters?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  confidence?: number;
  suggested_actions?: Array<{ action: string; description: string }>;
  status: 'unread' | 'read' | 'actioned' | 'dismissed';
  created_at: string;
  related_market_id?: string;
}

interface AlertConfig {
  type: string;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
}

const ALERT_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  news_impact: { icon: <Newspaper className="h-4 w-4" />, color: 'bg-blue-500', label: 'News Impact' },
  whale_movement: { icon: <TrendingUp className="h-4 w-4" />, color: 'bg-purple-500', label: 'Whale Movement' },
  arbitrage: { icon: <Zap className="h-4 w-4" />, color: 'bg-amber-500', label: 'Arbitrage' },
  price_movement: { icon: <TrendingUp className="h-4 w-4" />, color: 'bg-emerald-500', label: 'Price Movement' },
  sentiment_shift: { icon: <MessageSquare className="h-4 w-4" />, color: 'bg-pink-500', label: 'Sentiment Shift' },
  resolution: { icon: <Clock className="h-4 w-4" />, color: 'bg-orange-500', label: 'Resolution' },
};

const URGENCY_STYLES: Record<string, string> = {
  low: 'border-muted-foreground/20 bg-muted/50',
  medium: 'border-amber-500/30 bg-amber-500/5',
  high: 'border-orange-500/30 bg-orange-500/5',
  critical: 'border-red-500/30 bg-red-500/10 animate-pulse',
};

export function AlertCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([
    { type: 'news_impact', label: 'News Impact', icon: <Newspaper className="h-4 w-4" />, enabled: true },
    { type: 'whale_movement', label: 'Whale Movements', icon: <TrendingUp className="h-4 w-4" />, enabled: true },
    { type: 'arbitrage', label: 'Arbitrage Opportunities', icon: <Zap className="h-4 w-4" />, enabled: true },
    { type: 'price_movement', label: 'Price Movements', icon: <TrendingUp className="h-4 w-4" />, enabled: true },
    { type: 'sentiment_shift', label: 'Sentiment Shifts', icon: <MessageSquare className="h-4 w-4" />, enabled: false },
    { type: 'resolution', label: 'Market Resolutions', icon: <Clock className="h-4 w-4" />, enabled: true },
  ]);

  const unreadCount = alerts.filter(a => a.status === 'unread').length;

  useEffect(() => {
    // Load sample alerts on mount
    generateSampleAlerts();
  }, []);

  const generateSampleAlerts = async () => {
    setIsGenerating(true);
    try {
      const response = await supabase.functions.invoke('ai-alert-generator', {
        body: { generate_sample: true }
      });

      if (response.error) throw response.error;

      const sampleAlerts: Alert[] = response.data.alerts.map((alert: Omit<Alert, 'id' | 'status' | 'created_at' | 'alert_type'>, index: number) => ({
        id: `sample-${index}`,
        alert_type: ['news_impact', 'whale_movement', 'arbitrage', 'sentiment_shift', 'resolution'][index] || 'news_impact',
        status: index < 2 ? 'unread' : 'read',
        created_at: new Date(Date.now() - index * 3600000).toISOString(),
        ...alert,
      }));

      setAlerts(sampleAlerts);
    } catch (error) {
      console.error('Error generating sample alerts:', error);
      toast.error('Failed to generate sample alerts');
    } finally {
      setIsGenerating(false);
    }
  };

  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, status: 'read' as const } : alert
    ));
  };

  const markAsActioned = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, status: 'actioned' as const } : alert
    ));
    toast.success('Alert marked as actioned');
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, status: 'dismissed' as const } : alert
    ));
  };

  const deleteAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    toast.success('Alert deleted');
  };

  const toggleAlertConfig = (type: string) => {
    setAlertConfigs(prev => prev.map(config => 
      config.type === type ? { ...config, enabled: !config.enabled } : config
    ));
  };

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === 'all') return alert.status !== 'dismissed';
    if (activeTab === 'unread') return alert.status === 'unread';
    if (activeTab === 'actioned') return alert.status === 'actioned';
    return alert.alert_type === activeTab && alert.status !== 'dismissed';
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <BellRing className="h-5 w-5 text-primary" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <CardTitle className="text-lg">Alert Center</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={generateSampleAlerts}
              disabled={isGenerating}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isGenerating && "animate-spin")} />
              Refresh
            </Button>
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alert Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Configure which types of alerts you want to receive.
                  </p>
                  {alertConfigs.map(config => (
                    <div key={config.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          ALERT_TYPE_CONFIG[config.type]?.color || 'bg-muted'
                        )}>
                          {config.icon}
                        </div>
                        <Label htmlFor={config.type} className="font-medium">
                          {config.label}
                        </Label>
                      </div>
                      <Switch
                        id={config.type}
                        checked={config.enabled}
                        onCheckedChange={() => toggleAlertConfig(config.type)}
                      />
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <div className="px-4 pb-3 flex-shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              All
              {alerts.filter(a => a.status !== 'dismissed').length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {alerts.filter(a => a.status !== 'dismissed').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              Unread
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="arbitrage" className="text-xs">Arb</TabsTrigger>
            <TabsTrigger value="actioned" className="text-xs">Done</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm">Generating smart alerts...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">No alerts</p>
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onMarkRead={() => markAsRead(alert.id)}
                  onMarkActioned={() => markAsActioned(alert.id)}
                  onDismiss={() => dismissAlert(alert.id)}
                  onDelete={() => deleteAlert(alert.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface AlertCardProps {
  alert: Alert;
  onMarkRead: () => void;
  onMarkActioned: () => void;
  onDismiss: () => void;
  onDelete: () => void;
}

function AlertCard({ alert, onMarkRead, onMarkActioned, onDismiss, onDelete }: AlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const typeConfig = ALERT_TYPE_CONFIG[alert.alert_type] || ALERT_TYPE_CONFIG.news_impact;

  const handleExpand = () => {
    if (alert.status === 'unread') {
      onMarkRead();
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      className={cn(
        "rounded-lg border p-3 transition-all cursor-pointer",
        URGENCY_STYLES[alert.urgency],
        alert.status === 'unread' && 'ring-2 ring-primary/20'
      )}
      onClick={handleExpand}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg text-white flex-shrink-0", typeConfig.color)}>
          {typeConfig.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  {typeConfig.label}
                </Badge>
                {alert.status === 'unread' && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
                {alert.urgency === 'critical' && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Urgent
                  </Badge>
                )}
              </div>
              <h4 className="font-medium text-sm line-clamp-2">{alert.headline}</h4>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatTimeAgo(alert.created_at)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{alert.summary}</p>

          {alert.confidence && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${alert.confidence * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {Math.round(alert.confidence * 100)}%
              </span>
            </div>
          )}

          {isExpanded && (
            <div className="mt-3 pt-3 border-t space-y-3" onClick={e => e.stopPropagation()}>
              {alert.why_it_matters && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium mb-1">Why it matters</p>
                  <p className="text-xs text-muted-foreground">{alert.why_it_matters}</p>
                </div>
              )}

              {alert.suggested_actions && alert.suggested_actions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Suggested Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {alert.suggested_actions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkActioned();
                        }}
                      >
                        {action.action}
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkActioned();
                  }}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Done
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss();
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Dismiss
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}