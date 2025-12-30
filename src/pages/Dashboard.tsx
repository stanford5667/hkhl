import { useNavigate } from 'react-router-dom';
import { TriggerBanner } from '@/components/dashboard/TriggerBanner';
import { AIInsightCard } from '@/components/dashboard/AIInsightCard';
import { StreakCounter } from '@/components/dashboard/StreakCounter';
import { QuickStatsTile } from '@/components/dashboard/QuickStatsTile';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { PortfolioSnapshot } from '@/components/dashboard/PortfolioSnapshot';
import { ActionItemsCard } from '@/components/dashboard/ActionItemsCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { UpcomingEvents } from '@/components/dashboard/UpcomingEvents';
import { PortfolioChart } from '@/components/dashboard/PortfolioChart';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useAppData';
import { Skeleton } from '@/components/ui/skeleton';

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  if (value >= 1) return `$${value.toFixed(0)}M`;
  if (value > 0) return `$${(value * 1000).toFixed(0)}K`;
  return '$0';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentOrganization, userProfile } = useOrganization();
  const { user } = useAuth();
  const { stats, isLoading } = useDashboardStats();
  
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const userName = userProfile?.full_name || user?.user_metadata?.full_name || 'there';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${userName}!`;
    if (hour < 18) return `Good afternoon, ${userName}!`;
    return `Good evening, ${userName}!`;
  };

  // Calculate alerts count (overdue tasks + urgent items)
  const alertCount = stats.overdueTasks;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header with Streak */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{currentDate}</div>
          {currentOrganization && (
            <div className="text-xs text-muted-foreground/70 mt-0.5">
              {currentOrganization.name}
            </div>
          )}
        </div>
        <StreakCounter days={5} />
      </div>

      {/* Trigger Banner (Hook: Variable Reward) */}
      <TriggerBanner
        greeting={getGreeting()}
        alertCount={alertCount}
        portfolioNews={stats.portfolio > 0 ? `${stats.portfolio} portfolio companies` : undefined}
        onReview={() => navigate('/companies')}
      />

      {/* Quick Stats Row (Real Data) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {isLoading ? (
          <>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </>
        ) : (
          <>
            <QuickStatsTile 
              label="Total Revenue" 
              value={formatCurrency(stats.totalRevenue)} 
              onClick={() => navigate('/companies?view=portfolio')}
            />
            <QuickStatsTile 
              label="Pipeline" 
              value={stats.pipeline.toString()} 
              onClick={() => navigate('/companies?type=pipeline')}
            />
            <QuickStatsTile 
              label="Portfolio" 
              value={stats.portfolio.toString()} 
              onClick={() => navigate('/companies?type=portfolio')}
            />
            <QuickStatsTile 
              label="Open Tasks" 
              value={stats.openTasks.toString()} 
              onClick={() => navigate('/tasks')}
            />
            <QuickStatsTile 
              label="Contacts" 
              value={stats.totalContacts.toString()} 
              onClick={() => navigate('/contacts')}
            />
          </>
        )}
      </div>

      {/* Main Content Grid (2/3 + 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Primary Content */}
        <div className="lg:col-span-2 space-y-6">
          <PortfolioSnapshot />
          <AIInsightCard />
          <ActivityFeed />
        </div>

        {/* Right Column - Secondary */}
        <div className="space-y-6">
          <ActionItemsCard />
          <UpcomingEvents />
        </div>
      </div>

      {/* Quick Actions Bar */}
      <QuickActions
        onAddCompany={() => navigate('/companies')}
        onCreateModel={() => navigate('/models')}
        onUploadFiles={() => navigate('/documents')}
      />

      {/* Portfolio Chart */}
      <PortfolioChart />
    </div>
  );
}
