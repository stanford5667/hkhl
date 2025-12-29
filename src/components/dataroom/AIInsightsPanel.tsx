import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle,
  FileQuestion,
  Lightbulb,
  Sparkles,
  TrendingUp,
  Calendar,
} from "lucide-react";

interface AIInsightsPanelProps {
  folderPath: string[];
}

export function AIInsightsPanel({ folderPath }: AIInsightsPanelProps) {
  const insights = [
    {
      type: "missing",
      icon: <AlertTriangle className="h-4 w-4 text-warning" />,
      title: "Missing Documents",
      items: [
        "Q3 2024 financials (expected by Dec 30)",
        "FY22 audit report",
        "Tax returns 2023",
      ],
    },
    {
      type: "attention",
      icon: <FileQuestion className="h-4 w-4 text-primary" />,
      title: "Needs Review",
      items: [
        "Revenue recognition policy - outdated",
        "Customer contract #42 - unsigned",
      ],
    },
    {
      type: "complete",
      icon: <CheckCircle className="h-4 w-4 text-success" />,
      title: "Recently Completed",
      items: ["FY24 financials uploaded", "Management org chart updated"],
    },
  ];

  const keyMetrics = [
    { label: "Documents", value: "47", change: "+5 this week" },
    { label: "Completeness", value: "78%", change: "vs 65% target" },
    { label: "Last Updated", value: "2h ago", change: "by Sarah" },
  ];

  return (
    <div className="space-y-4">
      {/* AI Insights Header */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Based on analysis of {folderPath.length > 0 ? folderPath.join(" > ") : "all folders"}
          </p>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {keyMetrics.map((metric, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{metric.label}</span>
              <div className="text-right">
                <span className="font-mono font-medium text-foreground">
                  {metric.value}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {metric.change}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Insights List */}
      {insights.map((insight, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {insight.icon}
              {insight.title}
              <Badge variant="outline" className="ml-auto">
                {insight.items.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insight.items.map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-warning" />
            Suggested Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Calendar className="mr-2 h-4 w-4" />
            Request Q3 financials from management
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <TrendingUp className="mr-2 h-4 w-4" />
            Run data extraction on uploaded files
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
