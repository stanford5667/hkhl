import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, LayoutDashboard, TrendingUp, Users, Zap } from 'lucide-react';
import { useCommandCenterMetrics, TierFilter as TierFilterType } from '@/hooks/useCommandCenterMetrics';
import { TierFilter } from './TierFilter';
import { MetricSection, growthMetricsConfig, retentionMetricsConfig, systemHealthMetricsConfig } from './MetricSection';
import { UserManagementTable } from './UserManagementTable';

export function CommandCenterDashboard() {
  const [tierFilter, setTierFilter] = useState<TierFilterType>('all');
  const { data, loading, error, refresh } = useCommandCenterMetrics(tierFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Intelligence Command Center...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={refresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Intelligence Command Center</h2>
            <p className="text-muted-foreground">High-signal metrics for product decision-making</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TierFilter 
            value={tierFilter} 
            onChange={setTierFilter} 
            tierBreakdown={data.tierBreakdown} 
          />
          <Button variant="outline" size="icon" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Growth Section */}
      <MetricSection
        title="Growth"
        description="User acquisition and activation metrics"
        icon={<TrendingUp className="h-5 w-5" />}
        metrics={data.growth as unknown as Record<string, any>}
        config={growthMetricsConfig}
        emptyType="growth"
      />

      {/* Retention Section */}
      <MetricSection
        title="Retention"
        description="User engagement and return rates"
        icon={<Users className="h-5 w-5" />}
        metrics={data.retention as unknown as Record<string, any>}
        config={retentionMetricsConfig}
        emptyType="retention"
      />

      {/* System Health Section */}
      <MetricSection
        title="System Health"
        description="API performance and reliability"
        icon={<Zap className="h-5 w-5" />}
        metrics={data.systemHealth as unknown as Record<string, any>}
        config={systemHealthMetricsConfig}
        emptyType="system"
      />

      {/* User Management */}
      <UserManagementTable users={data.users} onRefresh={refresh} />
    </div>
  );
}
