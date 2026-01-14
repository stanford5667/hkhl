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
  Activity, 
  Loader2, 
  RefreshCw,
  Calendar,
  Zap,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Server
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

interface ApiUsageLog {
  id: string;
  user_id: string | null;
  function_name: string;
  endpoint: string | null;
  method: string | null;
  status_code: number | null;
  response_time_ms: number | null;
  tokens_used: number | null;
  cost_estimate: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  usage_date: string | null;
}

interface UsageSummary {
  function_name: string;
  call_count: number;
  unique_users: number;
  avg_response_time: number;
  total_tokens: number;
  total_cost: number;
  success_rate: number;
}

interface DailyUsage {
  date: string;
  calls: number;
  tokens: number;
  cost: number;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function AdminApiUsageTab() {
  const [logs, setLogs] = useState<ApiUsageLog[]>([]);
  const [summary, setSummary] = useState<UsageSummary[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [totals, setTotals] = useState({
    totalCalls: 0,
    totalTokens: 0,
    totalCost: 0,
    avgResponseTime: 0,
    successRate: 0,
    uniqueUsers: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchApiUsage();
  }, [timeRange]);

  const getDateFilter = () => {
    const now = new Date();
    switch (timeRange) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const fetchApiUsage = async () => {
    setLoading(true);
    try {
      const dateFilter = getDateFilter();
      
      // Fetch raw logs
      const { data: logsData, error: logsError } = await supabase
        .from('api_usage_logs')
        .select('*')
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })
        .limit(500);

      if (logsError) throw logsError;
      
      const typedLogs = (logsData || []) as ApiUsageLog[];
      setLogs(typedLogs);

      // Calculate summary by function
      const functionMap = new Map<string, {
        calls: number;
        users: Set<string>;
        totalTime: number;
        tokens: number;
        cost: number;
        successes: number;
      }>();

      typedLogs.forEach(log => {
        const existing = functionMap.get(log.function_name) || {
          calls: 0,
          users: new Set<string>(),
          totalTime: 0,
          tokens: 0,
          cost: 0,
          successes: 0
        };
        
        existing.calls++;
        if (log.user_id) existing.users.add(log.user_id);
        if (log.response_time_ms) existing.totalTime += log.response_time_ms;
        if (log.tokens_used) existing.tokens += log.tokens_used;
        if (log.cost_estimate) existing.cost += Number(log.cost_estimate);
        if (log.status_code && log.status_code >= 200 && log.status_code < 300) {
          existing.successes++;
        }
        
        functionMap.set(log.function_name, existing);
      });

      const summaryData: UsageSummary[] = Array.from(functionMap.entries()).map(([name, data]) => ({
        function_name: name,
        call_count: data.calls,
        unique_users: data.users.size,
        avg_response_time: Math.round(data.totalTime / data.calls) || 0,
        total_tokens: data.tokens,
        total_cost: data.cost,
        success_rate: Math.round((data.successes / data.calls) * 100)
      })).sort((a, b) => b.call_count - a.call_count);

      setSummary(summaryData);

      // Calculate daily usage
      const dailyMap = new Map<string, { calls: number; tokens: number; cost: number }>();
      typedLogs.forEach(log => {
        const date = log.usage_date || log.created_at.split('T')[0];
        const existing = dailyMap.get(date) || { calls: 0, tokens: 0, cost: 0 };
        existing.calls++;
        if (log.tokens_used) existing.tokens += log.tokens_used;
        if (log.cost_estimate) existing.cost += Number(log.cost_estimate);
        dailyMap.set(date, existing);
      });

      const dailyData = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          ...data
        }))
        .reverse();
      setDailyUsage(dailyData);

      // Calculate totals
      const allUsers = new Set<string>();
      let totalTime = 0;
      let successCount = 0;
      let totalTokens = 0;
      let totalCost = 0;

      typedLogs.forEach(log => {
        if (log.user_id) allUsers.add(log.user_id);
        if (log.response_time_ms) totalTime += log.response_time_ms;
        if (log.tokens_used) totalTokens += log.tokens_used;
        if (log.cost_estimate) totalCost += Number(log.cost_estimate);
        if (log.status_code && log.status_code >= 200 && log.status_code < 300) {
          successCount++;
        }
      });

      setTotals({
        totalCalls: typedLogs.length,
        totalTokens,
        totalCost,
        avgResponseTime: typedLogs.length > 0 ? Math.round(totalTime / typedLogs.length) : 0,
        successRate: typedLogs.length > 0 ? Math.round((successCount / typedLogs.length) * 100) : 100,
        uniqueUsers: allUsers.size
      });

    } catch (err) {
      console.error('Error fetching API usage:', err);
      toast({
        title: 'Error',
        description: 'Failed to load API usage data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (statusCode: number | null) => {
    if (!statusCode) return <Badge variant="outline">Unknown</Badge>;
    if (statusCode >= 200 && statusCode < 300) {
      return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{statusCode}</Badge>;
    }
    if (statusCode >= 400) {
      return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">{statusCode}</Badge>;
    }
    return <Badge variant="outline">{statusCode}</Badge>;
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
      {/* Header with time filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">API Usage Analytics</h2>
          <p className="text-muted-foreground text-sm">Monitor API calls, costs, and performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchApiUsage}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="h-4 w-4" />
                <span className="text-xs">Total Calls</span>
              </div>
              <p className="text-2xl font-bold">{totals.totalCalls.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span className="text-xs">Tokens Used</span>
              </div>
              <p className="text-2xl font-bold">{totals.totalTokens.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Est. Cost</span>
              </div>
              <p className="text-2xl font-bold">${totals.totalCost.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Avg Response</span>
              </div>
              <p className="text-2xl font-bold">{totals.avgResponseTime}ms</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs">Success Rate</span>
              </div>
              <p className="text-2xl font-bold">{totals.successRate}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Unique Users</span>
              </div>
              <p className="text-2xl font-bold">{totals.uniqueUsers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily API Calls</CardTitle>
            <CardDescription>API call volume over time</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="calls" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No usage data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage by Function */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage by Function</CardTitle>
            <CardDescription>API calls by endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={summary.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    dataKey="function_name" 
                    type="category" 
                    width={120}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="call_count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No usage data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Function Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Function Performance
          </CardTitle>
          <CardDescription>Performance metrics by API function</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Function</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Avg Time</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Success</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No API usage recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                summary.map((item) => (
                  <TableRow key={item.function_name}>
                    <TableCell className="font-medium">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {item.function_name}
                      </code>
                    </TableCell>
                    <TableCell className="text-right">{item.call_count.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.unique_users}</TableCell>
                    <TableCell className="text-right">{item.avg_response_time}ms</TableCell>
                    <TableCell className="text-right">{item.total_tokens.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${item.total_cost.toFixed(4)}</TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        className={
                          item.success_rate >= 95 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : item.success_rate >= 80 
                              ? 'bg-amber-500/10 text-amber-500' 
                              : 'bg-red-500/10 text-red-500'
                        }
                      >
                        {item.success_rate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent API Calls
          </CardTitle>
          <CardDescription>Latest API requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Function</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Response</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No API calls recorded yet
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.slice(0, 50).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {log.function_name}
                        </code>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status_code)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {log.tokens_used?.toLocaleString() || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
