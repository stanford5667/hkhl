import { Newspaper, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function NewsIntelligence() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
          <Newspaper className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Intelligence Feed</h1>
          <p className="text-muted-foreground">
            AI-powered market signal detection
          </p>
        </div>
      </div>

      {/* Placeholder */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin mb-4" />
          <p className="text-slate-400 text-lg">News feed loading...</p>
        </CardContent>
      </Card>
    </div>
  );
}
