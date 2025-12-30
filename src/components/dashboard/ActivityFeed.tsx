import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppCompanies } from "@/hooks/useAppData";
import { FileText, ArrowRight, MessageSquare, RefreshCw, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  type: "company_added" | "document" | "stage_change" | "comment";
  description: string;
  companyName: string;
  companyInitial: string;
  timestamp: string;
}

export function ActivityFeed() {
  const { companies, isLoading } = useAppCompanies();
  
  // Convert recent companies to activity items
  const recentActivities: Activity[] = companies
    .slice(0, 6)
    .map(company => ({
      id: company.id,
      type: "company_added" as const,
      description: `Company added: ${company.name}`,
      companyName: company.name,
      companyInitial: company.name.charAt(0).toUpperCase(),
      timestamp: formatDistanceToNow(new Date(company.created_at), { addSuffix: true }),
    }));

  const getIcon = (type: Activity["type"]) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case "company_added":
        return <Building2 className={cn(iconClass, "text-primary")} />;
      case "document":
        return <FileText className={cn(iconClass, "text-success")} />;
      case "stage_change":
        return <ArrowRight className={cn(iconClass, "text-warning")} />;
      case "comment":
        return <MessageSquare className={cn(iconClass, "text-muted-foreground")} />;
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
        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {recentActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs">Activity will appear here as you work</p>
          </div>
        ) : (
          recentActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/30 transition-colors"
            >
              <Avatar className="h-8 w-8 mt-0.5">
                <AvatarFallback className="bg-secondary text-xs font-medium">
                  {activity.companyInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {getIcon(activity.type)}
                  <p className="text-sm text-foreground truncate">{activity.description}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{activity.timestamp}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
