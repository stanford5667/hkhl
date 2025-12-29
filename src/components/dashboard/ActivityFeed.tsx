import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, ArrowRight, MessageSquare, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "model_update" | "document" | "stage_change" | "comment";
  description: string;
  user: string;
  userInitials: string;
  timestamp: string;
}

const activities: Activity[] = [
  {
    id: "1",
    type: "model_update",
    description: "Model updated: TechCo LBO",
    user: "Sarah",
    userInitials: "SA",
    timestamp: "2 hours ago",
  },
  {
    id: "2",
    type: "document",
    description: "New document: Acme CIM",
    user: "Mike",
    userInitials: "MK",
    timestamp: "4 hours ago",
  },
  {
    id: "3",
    type: "stage_change",
    description: "Deal moved: Beta to Due Diligence",
    user: "Chris",
    userInitials: "CS",
    timestamp: "Yesterday",
  },
  {
    id: "4",
    type: "comment",
    description: "@Sarah added comment on TechCo",
    user: "Mike",
    userInitials: "MK",
    timestamp: "Yesterday",
  },
];

export function ActivityFeed() {
  const getIcon = (type: Activity["type"]) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case "model_update":
        return <RefreshCw className={cn(iconClass, "text-primary")} />;
      case "document":
        return <FileText className={cn(iconClass, "text-success")} />;
      case "stage_change":
        return <ArrowRight className={cn(iconClass, "text-warning")} />;
      case "comment":
        return <MessageSquare className={cn(iconClass, "text-muted-foreground")} />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/30 transition-colors"
          >
            <Avatar className="h-8 w-8 mt-0.5">
              <AvatarFallback className="bg-secondary text-xs font-medium">
                {activity.userInitials}
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
        ))}
      </CardContent>
    </Card>
  );
}
