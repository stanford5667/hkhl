import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export function SmartMoneySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Smart Money Settings</h1>
        <p className="text-muted-foreground">Admin-only configuration for the Smart Money platform.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Platform Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Settings panel coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
