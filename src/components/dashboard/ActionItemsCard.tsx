import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileText, Clock, ChevronRight } from "lucide-react";

interface ActionItem {
  id: string;
  title: string;
  type: "urgent" | "task" | "deadline";
  description: string;
  daysLeft?: number;
}

const items: ActionItem[] = [
  {
    id: "1",
    title: "Acme Corp",
    type: "urgent",
    description: "LOI expires in 3 days",
    daysLeft: 3,
  },
  {
    id: "2",
    title: "TechCo",
    type: "urgent",
    description: "Missing Q3 financials",
  },
  {
    id: "3",
    title: "Beta Inc",
    type: "task",
    description: "IC memo due Friday",
  },
  {
    id: "4",
    title: "Gamma LLC",
    type: "deadline",
    description: "Management meeting tomorrow",
    daysLeft: 1,
  },
];

export function ActionItemsCard() {
  const getIcon = (type: ActionItem["type"]) => {
    switch (type) {
      case "urgent":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "task":
        return <FileText className="h-4 w-4 text-primary" />;
      case "deadline":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getBadge = (type: ActionItem["type"]) => {
    switch (type) {
      case "urgent":
        return <Badge variant="warning">Urgent</Badge>;
      case "task":
        return <Badge variant="default">Task</Badge>;
      case "deadline":
        return <Badge variant="outline">Deadline</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Deals Requiring Action</CardTitle>
        <Badge variant="destructive">{items.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors group text-left"
          >
            {getIcon(item.type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-foreground">{item.title}</span>
                {getBadge(item.type)}
              </div>
              <p className="text-sm text-muted-foreground truncate">{item.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
