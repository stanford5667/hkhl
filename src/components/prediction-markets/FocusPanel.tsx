import { useState } from "react";
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink, 
  MessageSquare,
  Play,
  Eye,
  Bell,
  X,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { FeedItem } from "./UnifiedFeedCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FocusPanelProps {
  item: FeedItem | null;
  onClose: () => void;
  onAskAI: (context: string) => void;
}

export function FocusPanel({ item, onClose, onAskAI }: FocusPanelProps) {
  const [positionSize, setPositionSize] = useState([25]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!item) return;
    
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-brain", {
        body: {
          type: "analyze",
          context: {
            itemType: item.type,
            title: item.title,
            summary: item.summary,
            metadata: item.metadata,
          },
        },
      });

      if (error) throw error;
      setAiAnalysis(data?.response || "Analysis complete. No significant insights found.");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="p-4 rounded-full bg-muted/50 mb-4">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg mb-2">Select an item</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Click on any item in the feed to see detailed analysis and take action
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="capitalize">
                {item.type.replace("_", " ")}
              </Badge>
              {item.urgency === "high" && (
                <Badge variant="destructive">High Priority</Badge>
              )}
            </div>
            <h2 className="text-xl font-semibold mb-2">{item.title}</h2>
            <p className="text-muted-foreground">{item.summary}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        {/* AI Analysis */}
        <Card className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 border-violet-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isAnalyzing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </div>
            ) : aiAnalysis ? (
              <p className="text-sm">{aiAnalysis}</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Get AI-powered insights about this {item.type}
                </p>
                <Button size="sm" onClick={handleAnalyze}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze with AI
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Type-specific content */}
        {item.type === "opportunity" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Opportunity Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Profit Potential</span>
                <span className="font-semibold text-emerald-500">
                  {String(item.metadata?.badge || "—")}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confidence</span>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={Number(item.metadata?.confidence || 70)} 
                    className="w-20 h-2" 
                  />
                  <span className="text-sm">{String(item.metadata?.confidence || 70)}%</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Position Size</span>
                  <span className="font-medium">${(positionSize[0] * 100).toLocaleString()}</span>
                </div>
                <Slider
                  value={positionSize}
                  onValueChange={setPositionSize}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Kelly suggests: $3,500 (35%)
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Related Markets */}
        {(item.type === "news" || item.type === "insight") && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Related Markets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-sm">Related Market 1</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-emerald-500">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +5%
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-7">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-sm">Related Market 2</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-rose-500">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      -2%
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-7">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {item.type === "opportunity" && (
            <>
              <Button className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Execute
              </Button>
              <Button variant="outline" className="flex-1">
                Customize
              </Button>
            </>
          )}
          
          {(item.type === "news" || item.type === "insight") && (
            <>
              <Button variant="outline" className="flex-1">
                <Eye className="h-4 w-4 mr-2" />
                Watch Markets
              </Button>
              <Button variant="outline" className="flex-1">
                <Bell className="h-4 w-4 mr-2" />
                Set Alert
              </Button>
            </>
          )}

          <Button 
            variant="ghost" 
            className="flex-1"
            onClick={() => onAskAI(`Tell me more about: ${item.title}`)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Ask AI
          </Button>
        </div>

        {/* Source Link */}
        {item.metadata?.platform && (
          <Button variant="link" className="w-full justify-start p-0 h-auto text-sm text-muted-foreground">
            <ExternalLink className="h-3 w-3 mr-1" />
            View on {String(item.metadata.platform)}
          </Button>
        )}
      </div>
    </ScrollArea>
  );
}
