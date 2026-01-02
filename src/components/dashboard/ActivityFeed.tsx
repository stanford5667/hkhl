import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppCompanies, useAppTasks } from "@/hooks/useAppData";
import { FileText, ArrowRight, CheckSquare, Building2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useMemo } from "react";
import { Link } from "react-router-dom";

interface Activity {
  id: string;
  type: "company_added" | "task_created" | "task_completed" | "document";
  description: string;
  entityName: string;
  entityInitial: string;
  entityId?: string;
  entityType: "company" | "task";
  timestamp: Date;
  timeAgo: string;
}

export function ActivityFeed() {
  const { companies, isLoading: companiesLoading } = useAppCompanies();
  const { tasks, isLoading: tasksLoading } = useAppTasks();
  
  const isLoading = companiesLoading || tasksLoading;
  
  // Build a combined activity feed from recent companies and tasks
  const recentActivities = useMemo(() => {
    const activities: Activity[] = [];
    
    // Add recent companies
    companies.slice(0, 10).forEach(company => {
      activities.push({
        id: `company-${company.id}`,
        type: "company_added",
        description: `Added ${company.name}`,
        entityName: company.name,
        entityInitial: company.name.charAt(0).toUpperCase(),
        entityId: company.id,
        entityType: "company",
        timestamp: new Date(company.created_at),
        timeAgo: formatDistanceToNow(new Date(company.created_at), { addSuffix: true }),
      });
    });
    
    // Add recently completed tasks
    tasks
      .filter(t => t.status === 'done' && t.completed_at)
      .slice(0, 10)
      .forEach(task => {
        activities.push({
          id: `task-done-${task.id}`,
          type: "task_completed",
          description: `Completed: ${task.title}`,
          entityName: task.title,
          entityInitial: "✓",
          entityId: task.id,
          entityType: "task",
          timestamp: new Date(task.completed_at!),
          timeAgo: formatDistanceToNow(new Date(task.completed_at!), { addSuffix: true }),
        });
      });
    
    // Add recently created tasks
    tasks.slice(0, 10).forEach(task => {
      activities.push({
        id: `task-created-${task.id}`,
        type: "task_created",
        description: `Created task: ${task.title}`,
        entityName: task.title,
        entityInitial: task.title.charAt(0).toUpperCase(),
        entityId: task.id,
        entityType: "task",
        timestamp: new Date(task.created_at),
        timeAgo: formatDistanceToNow(new Date(task.created_at), { addSuffix: true }),
      });
    });
    
    // Sort by timestamp and take top 8
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 8);
  }, [companies, tasks]);

  const getIcon = (type: Activity["type"]) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case "company_added":
        return <Building2 className={cn(iconClass, "text-blue-400")} />;
      case "task_created":
        return <CheckSquare className={cn(iconClass, "text-purple-400")} />;
      case "task_completed":
        return <CheckSquare className={cn(iconClass, "text-emerald-400")} />;
      case "document":
        return <FileText className={cn(iconClass, "text-amber-400")} />;
    }
  };

  const getAvatarStyle = (type: Activity["type"]) => {
    switch (type) {
      case "company_added":
        return "bg-blue-500/20 text-blue-400";
      case "task_completed":
        return "bg-emerald-500/20 text-emerald-400";
      case "task_created":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-secondary";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {recentActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs">Activity will appear here as you work</p>
          </div>
        ) : (
          recentActivities.map((activity) => {
            const content = (
              <div
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer"
              >
                <Avatar className={cn("h-8 w-8 mt-0.5", getAvatarStyle(activity.type))}>
                  <AvatarFallback className="text-xs font-medium bg-transparent">
                    {activity.type === "task_completed" ? "✓" : activity.entityInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getIcon(activity.type)}
                    <p className="text-sm text-foreground truncate">{activity.description}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{activity.timeAgo}</p>
                </div>
              </div>
            );
            
            if (activity.entityType === "company" && activity.entityId) {
              return (
                <Link key={activity.id} to={`/portfolio/${activity.entityId}`}>
                  {content}
                </Link>
              );
            }
            
            if (activity.entityType === "task") {
              return (
                <Link key={activity.id} to="/tasks">
                  {content}
                </Link>
              );
            }
            
            return <div key={activity.id}>{content}</div>;
          })
        )}
      </CardContent>
    </Card>
  );
}