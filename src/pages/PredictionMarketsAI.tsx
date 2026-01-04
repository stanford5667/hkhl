import { useState } from "react";
import { Brain, Settings, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIStatusBar } from "@/components/prediction-markets/AIStatusBar";
import { LiveFeed } from "@/components/prediction-markets/LiveFeed";
import { FocusPanel } from "@/components/prediction-markets/FocusPanel";
import { CommandBar } from "@/components/prediction-markets/CommandBar";
import { DataSyncPanel } from "@/components/prediction-markets/DataSyncPanel";
import { FeedItem } from "@/components/prediction-markets/UnifiedFeedCard";

export default function PredictionMarketsAI() {
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [aiQuery, setAiQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const handleAskAI = (context: string) => {
    setAiQuery(context);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* AI Status Bar */}
      <AIStatusBar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Live Feed - Left Panel (40%) */}
        <div className="w-full md:w-2/5 border-r flex flex-col overflow-hidden">
          <LiveFeed
            selectedItem={selectedItem}
            onSelectItem={setSelectedItem}
            onAskAI={handleAskAI}
          />
        </div>

        {/* Focus Panel - Right Panel (60%) */}
        <div className="hidden md:flex md:w-3/5 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-violet-500" />
              <span className="font-medium text-sm">Focus Panel</span>
            </div>
            <Sheet open={showSettings} onOpenChange={setShowSettings}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data & Settings
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <Tabs defaultValue="sync">
                    <TabsList className="w-full">
                      <TabsTrigger value="sync" className="flex-1">Data Sync</TabsTrigger>
                      <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="sync" className="mt-4">
                      <DataSyncPanel />
                    </TabsContent>
                    <TabsContent value="settings" className="mt-4">
                      <div className="space-y-4 text-sm text-muted-foreground">
                        <p>Alert preferences, notification settings, and more coming soon.</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="flex-1 overflow-hidden">
            <FocusPanel
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
              onAskAI={handleAskAI}
            />
          </div>
        </div>
      </div>

      {/* Command Bar - Always visible at bottom */}
      <CommandBar 
        initialQuery={aiQuery} 
        onQueryChange={setAiQuery}
      />
    </div>
  );
}
