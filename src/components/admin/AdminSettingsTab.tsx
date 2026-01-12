import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, AlertTriangle, Settings, Power, Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

interface AppSetting {
  id: string;
  setting_key: string;
  setting_value: Json;
  description: string | null;
  updated_at: string;
}

export function AdminSettingsTab() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      setSettings(data || []);
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (setting: AppSetting, newValue: Json) => {
    setSaving(setting.id);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ setting_value: newValue, updated_at: new Date().toISOString() })
        .eq('id', setting.id);

      if (error) throw error;
      toast({ title: 'Setting Updated', description: `Successfully updated ${setting.setting_key}` });
      fetchSettings();
    } catch (err) {
      console.error('Error updating setting:', err);
      toast({ title: 'Error', description: 'Failed to update setting', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const getSettingValue = (setting: AppSetting, key: string): unknown => {
    if (typeof setting.setting_value === 'object' && setting.setting_value !== null) {
      return (setting.setting_value as Record<string, unknown>)[key];
    }
    return undefined;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const maintenanceSetting = settings.find(s => s.setting_key === 'maintenance_mode');
  const signupSetting = settings.find(s => s.setting_key === 'signup_enabled');
  const featureFlagsSetting = settings.find(s => s.setting_key === 'feature_flags');

  return (
    <div className="space-y-6">
      {/* Maintenance Mode */}
      <Card className="border-amber-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <CardTitle>Maintenance Mode</CardTitle>
              <CardDescription>Temporarily disable the application</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Maintenance Mode</Label>
            <Switch
              checked={Boolean(getSettingValue(maintenanceSetting!, 'enabled'))}
              onCheckedChange={(checked) => {
                if (maintenanceSetting) {
                  const currentValue = maintenanceSetting.setting_value as Record<string, unknown>;
                  updateSetting(maintenanceSetting, { ...currentValue, enabled: checked });
                }
              }}
              disabled={saving === maintenanceSetting?.id || !maintenanceSetting}
            />
          </div>
        </CardContent>
      </Card>

      {/* User Signups */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Power className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>User Registration</CardTitle>
              <CardDescription>Control new user signups</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>Allow New Signups</Label>
            <Switch
              checked={Boolean(getSettingValue(signupSetting!, 'enabled'))}
              onCheckedChange={(checked) => {
                if (signupSetting) {
                  updateSetting(signupSetting, { enabled: checked });
                }
              }}
              disabled={saving === signupSetting?.id || !signupSetting}
            />
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Flag className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Toggle experimental features</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {featureFlagsSetting && typeof featureFlagsSetting.setting_value === 'object' && 
           featureFlagsSetting.setting_value !== null && 
           Object.entries(featureFlagsSetting.setting_value as Record<string, unknown>).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
              <Switch
                checked={Boolean(value)}
                onCheckedChange={(checked) => {
                  const currentValue = featureFlagsSetting.setting_value as Record<string, unknown>;
                  updateSetting(featureFlagsSetting, { ...currentValue, [key]: checked } as Json);
                }}
                disabled={saving === featureFlagsSetting.id}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* All Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>All Settings</CardTitle>
              <CardDescription>Raw view of all settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {settings.map((setting) => (
              <div key={setting.id} className="p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono text-primary">{setting.setting_key}</code>
                  <span className="text-xs text-muted-foreground">
                    Updated: {new Date(setting.updated_at).toLocaleString()}
                  </span>
                </div>
                <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                  {JSON.stringify(setting.setting_value, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
