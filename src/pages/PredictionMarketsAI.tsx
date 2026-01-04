import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Bell, 
  Newspaper, 
  LineChart, 
  Search, 
  Brain,
  MessageSquare,
  Sparkles,
  Database
} from "lucide-react";
import { 
  AlertCenter, 
  DailyBriefing, 
  StrategyBacktester, 
  NaturalLanguageSearch 
} from "@/components/prediction-markets";
import { AIBrainChat } from "@/components/prediction-markets/AIBrainChat";
import { DataSyncPanel } from "@/components/prediction-markets/DataSyncPanel";

export default function PredictionMarketsAI() {
  const [activeTab, setActiveTab] = useState("sync");

  const tabs = [
    { id: "sync", label: "Data Sync", icon: Database, description: "Sync market data" },
    { id: "briefing", label: "Daily Briefing", icon: Newspaper, description: "AI-generated market summaries" },
    { id: "alerts", label: "Smart Alerts", icon: Bell, description: "AI-powered notifications" },
    { id: "search", label: "Market Search", icon: Search, description: "Natural language queries" },
    { id: "backtest", label: "Strategy Tester", icon: LineChart, description: "Backtest trading strategies" },
    { id: "chat", label: "AI Assistant", icon: MessageSquare, description: "Chat with AI brain" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
          <Brain className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Prediction Markets AI</h1>
          <p className="text-muted-foreground">
            AI-powered intelligence for prediction market trading
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <span className="text-sm text-muted-foreground">AI Brain</span>
            </div>
            <p className="text-xl font-bold mt-1">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-muted-foreground">Alerts Today</span>
            </div>
            <p className="text-xl font-bold mt-1">—</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <LineChart className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-muted-foreground">Strategies</span>
            </div>
            <p className="text-xl font-bold mt-1">—</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-muted-foreground">Queries</span>
            </div>
            <p className="text-xl font-bold mt-1">—</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-muted/50">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-background"
            >
              <tab.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="sync" className="mt-6">
          <DataSyncPanel />
        </TabsContent>

        <TabsContent value="briefing" className="mt-6">
          <DailyBriefing />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <AlertCenter />
        </TabsContent>

        <TabsContent value="search" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Natural Language Market Search
              </CardTitle>
              <CardDescription>
                Search prediction markets using natural language queries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NaturalLanguageSearch />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backtest" className="mt-6">
          <StrategyBacktester />
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <AIBrainChat />
        </TabsContent>
      </Tabs>
    </div>
  );
}
