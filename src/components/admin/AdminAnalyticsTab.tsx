import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart3, 
  Users, 
  Activity, 
  TrendingUp, 
  Loader2, 
  RefreshCw,
  FileText,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ActivityLogEntry {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_table: string | null;
  description: string;
  created_at: string;
  metadata: unknown;
}

interface AnalyticsData {
  totalUsers: number;
  activeToday: number;
  totalActivities: number;
  newUsersThisWeek: number;
}

export function AdminAnalyticsTab() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    activeToday: 0,
    totalActivities: 0,
    newUsersThisWeek: 0,
  });
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Calculate date ranges
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);

      // Fetch data in parallel
      const [profilesRes, activitiesRes, activityLogRes, usageRes] = await Promise.all([
        supabase.from('profiles').select('id, created_at'),
        supabase.from('activities').select('id, created_at').order('created_at', { ascending: false }).limit(1000),
        supabase.from('admin_activity_log').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('user_usage').select('id, updated_at'),
      ]);

      const profiles = profilesRes.data || [];
      const activities = activitiesRes.data || [];
      const usage = usageRes.data || [];

      // Calculate metrics
      const totalUsers = profiles.length;
      const newUsersThisWeek = profiles.filter(p => 
        new Date(p.created_at) >= startOfWeek
      ).length;
      const activeToday = usage.filter(u => 
        u.updated_at && new Date(u.updated_at) >= startOfToday
      ).length;
      const totalActivities = activities.length;

      setAnalytics({
        totalUsers,
        activeToday,
        totalActivities,
        newUsersThisWeek,
      });

      setActivityLog(activityLogRes.data || []);

    } catch (err) {
      console.error('Error fetching analytics:', err);
      toast({
        title: 'Error',
        description: 'Failed to load analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'role_change':
        return 'bg-amber-500/10 text-amber-500';
      case 'setting_change':
        return 'bg-blue-500/10 text-blue-500';
      case 'user_deactivate':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.totalUsers}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.activeToday}</p>
                <p className="text-sm text-muted-foreground">Active Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.newUsersThisWeek}</p>
                <p className="text-sm text-muted-foreground">New This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <FileText className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.totalActivities}</p>
                <p className="text-sm text-muted-foreground">Total Activities</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Activity Log */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Admin Activity Log</CardTitle>
              <CardDescription>Recent actions performed by administrators</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchAnalytics}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityLog.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No admin activity recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                activityLog.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge className={getActionBadgeColor(entry.action_type)}>
                        {entry.action_type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {entry.description}
                    </TableCell>
                    <TableCell>
                      {entry.target_table && (
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {entry.target_table}
                        </code>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
              <Users className="h-5 w-5" />
              <span>Export Users</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <span>Generate Report</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
              <Activity className="h-5 w-5" />
              <span>View All Activity</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
