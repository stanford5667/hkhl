import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, isToday, isBefore, startOfDay, parseISO } from 'date-fns';
import {
  Building2,
  Briefcase,
  Users,
  CheckSquare,
  FileText,
  Plus,
  RefreshCw,
  AlertTriangle,
  Clock,
  Calendar,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData, useUnifiedData, type CompanyWithRelations, type TaskWithRelations } from '@/contexts/UnifiedDataContext';
import { CompanyMiniCard } from '@/components/shared/CompanyMiniCard';
import { TaskRow } from '@/components/shared/TaskRow';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function StatCard({
  title,
  value,
  icon: Icon,
  alert,
  alertCount,
  onClick,
  isLoading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  alert?: boolean;
  alertCount?: number;
  onClick?: () => void;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-12" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div variants={itemVariants}>
      <Card
        className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] group"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{title}</span>
            <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{value}</span>
            {alert && alertCount && alertCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {alertCount} overdue
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function QuickActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-all"
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}

function TasksCard({
  tasks,
  isLoading,
}: {
  tasks: TaskWithRelations[];
  isLoading: boolean;
}) {
  const now = new Date();
  const todayStart = startOfDay(now);

  const { overdue, today, upcoming } = useMemo(() => {
    const openTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'completed');
    
    const overdue = openTasks.filter(t => {
      if (!t.due_date) return false;
      return isBefore(parseISO(t.due_date), todayStart);
    });

    const today = openTasks.filter(t => {
      if (!t.due_date) return false;
      return isToday(parseISO(t.due_date));
    });

    const upcoming = openTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = parseISO(t.due_date);
      return !isBefore(dueDate, todayStart) && !isToday(dueDate);
    }).slice(0, 5);

    return { overdue, today, upcoming };
  }, [tasks, todayStart]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          My Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {overdue.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <span className="text-xs font-medium text-destructive">Overdue ({overdue.length})</span>
            </div>
            <div className="space-y-1">
              {overdue.slice(0, 3).map(task => (
                <TaskRow
                  key={task.id}
                  task={{
                    ...task,
                    company: task.company ? { id: task.company.id, name: task.company.name } : null,
                    contact: task.contact ? { id: task.contact.id, name: `${task.contact.first_name} ${task.contact.last_name}` } : null,
                  }}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {today.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-3 w-3 text-amber-500" />
              <span className="text-xs font-medium text-amber-600">Today ({today.length})</span>
            </div>
            <div className="space-y-1">
              {today.slice(0, 3).map(task => (
                <TaskRow
                  key={task.id}
                  task={{
                    ...task,
                    company: task.company ? { id: task.company.id, name: task.company.name } : null,
                    contact: task.contact ? { id: task.contact.id, name: `${task.contact.first_name} ${task.contact.last_name}` } : null,
                  }}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Upcoming</span>
            </div>
            <div className="space-y-1">
              {upcoming.map(task => (
                <TaskRow
                  key={task.id}
                  task={{
                    ...task,
                    company: task.company ? { id: task.company.id, name: task.company.name } : null,
                    contact: task.contact ? { id: task.contact.id, name: `${task.contact.first_name} ${task.contact.last_name}` } : null,
                  }}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {overdue.length === 0 && today.length === 0 && upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming tasks
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PipelineChart({
  pipelineStats,
  isLoading,
}: {
  pipelineStats: ReturnType<typeof useUnifiedData>['pipelineStats'];
  isLoading: boolean;
}) {
  const stages = [
    { key: 'sourcing', label: 'Sourcing', color: 'bg-blue-500' },
    { key: 'screening', label: 'Screening', color: 'bg-amber-500' },
    { key: 'diligence', label: 'Diligence', color: 'bg-purple-500' },
    { key: 'negotiation', label: 'Negotiation', color: 'bg-green-500' },
    { key: 'closing', label: 'Closing', color: 'bg-emerald-500' },
  ];

  const total = pipelineStats.totalDeals || 1;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Pipeline Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map(stage => {
          const stageData = pipelineStats.byStage[stage.key];
          const count = stageData?.count || 0;
          const percentage = (count / total) * 100;

          return (
            <div key={stage.key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{stage.label}</span>
                <span className="font-medium">{count}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${stage.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
              </div>
            </div>
          );
        })}
        <div className="pt-2 border-t mt-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Deals</span>
            <span className="font-semibold">{pipelineStats.totalDeals}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentCompaniesGrid({
  companies,
  isLoading,
}: {
  companies: CompanyWithRelations[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-3" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {companies.slice(0, 6).map((company, index) => (
        <motion.div
          key={company.id}
          variants={itemVariants}
          custom={index}
        >
          <CompanyMiniCard
            company={{
              id: company.id,
              name: company.name,
              industry: company.industry,
              company_type: company.company_type,
              pipeline_stage: company.pipeline_stage,
            }}
            variant="detailed"
            counts={{
              tasks: company.openTaskCount,
              contacts: company.contactCount,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

function ActivityFeed({
  companies,
  tasks,
  isLoading,
}: {
  companies: CompanyWithRelations[];
  tasks: TaskWithRelations[];
  isLoading: boolean;
}) {
  const activities = useMemo(() => {
    const items: { id: string; type: string; title: string; time: Date; icon: React.ElementType }[] = [];

    // Recent companies
    companies.slice(0, 3).forEach(c => {
      items.push({
        id: `company-${c.id}`,
        type: 'company',
        title: `${c.name} added to ${c.company_type || 'companies'}`,
        time: new Date(c.created_at),
        icon: Building2,
      });
    });

    // Recent completed tasks
    tasks
      .filter(t => t.status === 'done' || t.status === 'completed')
      .slice(0, 3)
      .forEach(t => {
        items.push({
          id: `task-${t.id}`,
          type: 'task',
          title: `Completed: ${t.title}`,
          time: new Date(t.completed_at || t.updated_at),
          icon: CheckSquare,
        });
      });

    return items.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 5);
  }, [companies, tasks]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map(activity => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="p-1.5 rounded-full bg-muted">
                <activity.icon className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{activity.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(activity.time, 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activity
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EnhancedDashboard() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { stats, recentCompanies, upcomingTasks, isLoading } = useDashboardData();
  const { pipelineStats, tasksWithRelations, companiesWithRelations, refetchAll } = useUnifiedData();

  const greeting = getGreeting();
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';
  const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <motion.div
      className="p-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {greeting}, {userName}!
          </h1>
          <p className="text-muted-foreground">
            {currentDate}
            {currentOrganization && (
              <span className="ml-2">• {currentOrganization.name}</span>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refetchAll}
          className="self-start md:self-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
        <QuickActionButton
          icon={Building2}
          label="Add Company"
          onClick={() => navigate('/companies?create=true')}
        />
        <QuickActionButton
          icon={Plus}
          label="New Task"
          onClick={() => navigate('/tasks?create=true')}
        />
        <QuickActionButton
          icon={Users}
          label="Add Contact"
          onClick={() => navigate('/contacts?create=true')}
        />
        <QuickActionButton
          icon={Upload}
          label="Upload Docs"
          onClick={() => navigate('/documents?upload=true')}
        />
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Pipeline"
          value={stats.pipelineCount}
          icon={Briefcase}
          onClick={() => navigate('/pipeline')}
          isLoading={isLoading}
        />
        <StatCard
          title="Portfolio"
          value={stats.portfolioCount}
          icon={Building2}
          onClick={() => navigate('/portfolio')}
          isLoading={isLoading}
        />
        <StatCard
          title="Contacts"
          value={stats.totalContacts}
          icon={Users}
          onClick={() => navigate('/contacts')}
          isLoading={isLoading}
        />
        <StatCard
          title="Open Tasks"
          value={stats.openTasks}
          icon={CheckSquare}
          alert={stats.overdueTasks > 0}
          alertCount={stats.overdueTasks}
          onClick={() => navigate('/tasks')}
          isLoading={isLoading}
        />
        <StatCard
          title="Documents"
          value={stats.totalDocuments}
          icon={FileText}
          onClick={() => navigate('/documents')}
          isLoading={isLoading}
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Companies</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/companies')}>
                View All
              </Button>
            </div>
            <RecentCompaniesGrid companies={recentCompanies} isLoading={isLoading} />
          </motion.div>

          <motion.div variants={itemVariants}>
            <ActivityFeed
              companies={companiesWithRelations}
              tasks={tasksWithRelations}
              isLoading={isLoading}
            />
          </motion.div>
        </div>

        {/* Right Column - 1/3 */}
        <div className="space-y-6">
          <motion.div variants={itemVariants}>
            <TasksCard tasks={tasksWithRelations} isLoading={isLoading} />
          </motion.div>

          <motion.div variants={itemVariants}>
            <PipelineChart pipelineStats={pipelineStats} isLoading={isLoading} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
