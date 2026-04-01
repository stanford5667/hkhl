import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function SmartMoneyAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newAlert, setNewAlert] = useState({
    name: '',
    alert_type: 'insider_buy',
    ticker: '',
    min_value: '',
  });

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['smart-money-alerts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('smart_money_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const createAlert = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('smart_money_alerts').insert({
        user_id: user.id,
        name: newAlert.name || `${newAlert.alert_type} alert`,
        alert_type: newAlert.alert_type,
        conditions: {
          ticker: newAlert.ticker || null,
          min_value: newAlert.min_value ? Number(newAlert.min_value) : null,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-money-alerts'] });
      setShowCreate(false);
      setNewAlert({ name: '', alert_type: 'insider_buy', ticker: '', min_value: '' });
      toast.success('Alert created');
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleAlert = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('smart_money_alerts').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['smart-money-alerts'] }),
  });

  const deleteAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('smart_money_alerts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-money-alerts'] });
      toast.success('Alert deleted');
    },
  });

  if (!user) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>Sign in to create and manage alerts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-muted-foreground text-sm">Get notified when smart money moves</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Alert
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Create Alert</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Alert name" value={newAlert.name} onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })} />
            <div className="flex gap-3">
              <Select value={newAlert.alert_type} onValueChange={(v) => setNewAlert({ ...newAlert, alert_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="insider_buy">Insider Buy</SelectItem>
                  <SelectItem value="insider_sell">Insider Sell</SelectItem>
                  <SelectItem value="options_unusual">Unusual Options</SelectItem>
                  <SelectItem value="block_trade">Block Trade</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Ticker (optional)" value={newAlert.ticker} onChange={(e) => setNewAlert({ ...newAlert, ticker: e.target.value.toUpperCase() })} className="w-32" />
              <Input placeholder="Min value ($)" value={newAlert.min_value} onChange={(e) => setNewAlert({ ...newAlert, min_value: e.target.value })} className="w-36" type="number" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => createAlert.mutate()} disabled={createAlert.isPending}>Create</Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-8 text-center text-muted-foreground">Loading...</p>
          ) : alerts && alerts.length > 0 ? (
            <div className="divide-y divide-border">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={alert.is_active ?? false}
                      onCheckedChange={(checked) => toggleAlert.mutate({ id: alert.id, is_active: checked })}
                    />
                    <div>
                      <p className="text-sm font-medium">{alert.name}</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="secondary" className="text-xs">{alert.alert_type}</Badge>
                        {(alert.conditions as any)?.ticker && (
                          <Badge variant="outline" className="text-xs">{(alert.conditions as any).ticker}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteAlert.mutate(alert.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-muted-foreground text-sm">No alerts yet. Create one to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
