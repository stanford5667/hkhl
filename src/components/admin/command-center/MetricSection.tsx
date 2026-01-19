import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from './MetricCard';
import { EmptyState } from './EmptyState';
import { MetricWithTrend } from '@/hooks/useCommandCenterMetrics';
import { 
  Users, 
  UserPlus, 
  Target, 
  Zap,
  Activity,
  CalendarDays,
  Calendar,
  TrendingDown,
  CheckCircle,
  Clock,
  AlertCircle,
  Server
} from 'lucide-react';

interface MetricConfig {
  key: string;
  title: string;
  icon: React.ReactNode;
  format: 'number' | 'percent' | 'ms';
  invertTrend?: boolean;
}

interface MetricSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  metrics: Record<string, MetricWithTrend>;
  config: MetricConfig[];
  emptyType: 'growth' | 'retention' | 'system' | 'users';
}

export function MetricSection({ title, description, icon, metrics, config, emptyType }: MetricSectionProps) {
  const hasData = Object.values(metrics).some(m => m.value > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState type={emptyType} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {config.map((item) => (
            <MetricCard
              key={item.key}
              title={item.title}
              metric={metrics[item.key]}
              icon={item.icon}
              format={item.format}
              invertTrend={item.invertTrend}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Pre-configured sections
export const growthMetricsConfig: MetricConfig[] = [
  { key: 'totalUsers', title: 'Total Users', icon: <Users className="h-5 w-5" />, format: 'number' },
  { key: 'newUsersThisWeek', title: 'New This Week', icon: <UserPlus className="h-5 w-5" />, format: 'number' },
  { key: 'signupConversionRate', title: 'Signup Conversion', icon: <Target className="h-5 w-5" />, format: 'percent' },
  { key: 'activationRate', title: 'Activation Rate', icon: <Zap className="h-5 w-5" />, format: 'percent' },
];

export const retentionMetricsConfig: MetricConfig[] = [
  { key: 'dailyActiveUsers', title: 'DAU', icon: <Activity className="h-5 w-5" />, format: 'number' },
  { key: 'weeklyActiveUsers', title: 'WAU', icon: <CalendarDays className="h-5 w-5" />, format: 'number' },
  { key: 'monthlyActiveUsers', title: 'MAU', icon: <Calendar className="h-5 w-5" />, format: 'number' },
  { key: 'churnRate', title: 'Churn Rate', icon: <TrendingDown className="h-5 w-5" />, format: 'percent', invertTrend: true },
];

export const systemHealthMetricsConfig: MetricConfig[] = [
  { key: 'apiSuccessRate', title: 'Success Rate', icon: <CheckCircle className="h-5 w-5" />, format: 'percent' },
  { key: 'avgResponseTime', title: 'Avg Response', icon: <Clock className="h-5 w-5" />, format: 'ms', invertTrend: true },
  { key: 'errorRate', title: 'Error Rate', icon: <AlertCircle className="h-5 w-5" />, format: 'percent', invertTrend: true },
  { key: 'totalApiCalls', title: 'API Calls', icon: <Server className="h-5 w-5" />, format: 'number' },
];
