import { useState, useEffect } from "react";
import { HeatmapSidebar, TickerHeatData } from "./HeatmapSidebar";
import { AlphaFeed } from "./AlphaFeed";
import { AlphaInsight } from "./AlphaFeedCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

// Mock data for development - replace with real data fetching
const MOCK_HEAT_DATA: TickerHeatData[] = [
  { ticker: "NVDA", volume_spike: 245, direction: 'up', event_count: 12 },
  { ticker: "TSLA", volume_spike: 180, direction: 'down', event_count: 8 },
  { ticker: "AAPL", volume_spike: 95, direction: 'up', event_count: 5 },
  { ticker: "MSFT", volume_spike: 67, direction: 'up', event_count: 4 },
  { ticker: "AMD", volume_spike: 142, direction: 'up', event_count: 7 },
  { ticker: "GOOGL", volume_spike: 55, direction: 'down', event_count: 3 },
];

const MOCK_INSIGHTS: AlphaInsight[] = [
  {
    id: "1",
    primary_ticker: "NVDA",
    direction: 'bullish',
    confidence: 87,
    thesis: "TSMC capacity expansion announcement signals accelerated demand for AI chips. Nvidia's H100 production backlog could clear 2 months earlier than expected, driving Q4 revenue beat.",
    hidden_correlation: "Watch AMD (competitor) and ASML (equipment supplier) for correlated moves",
    impact_score: 9,
    created_at: new Date(Date.now() - 1800000).toISOString(),
    sources: [
      { title: "TSMC Announces $15B Expansion in Arizona", url: "https://reuters.com", source_name: "Reuters", published_at: new Date().toISOString() },
      { title: "AI Chip Demand Surges in Q3", url: "https://bloomberg.com", source_name: "Bloomberg", published_at: new Date().toISOString() },
    ]
  },
  {
    id: "2",
    primary_ticker: "TSLA",
    direction: 'bearish',
    confidence: 72,
    thesis: "German union labor negotiations stalling at Gigafactory Berlin. Production pause likely for 2+ weeks, impacting European delivery targets for Q4.",
    hidden_correlation: "Lithium suppliers (ALB, LTHM) may see reduced short-term orders",
    impact_score: 7,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    sources: [
      { title: "Tesla Faces Labor Disputes in Germany", url: "https://ft.com", source_name: "Financial Times", published_at: new Date().toISOString() },
    ]
  },
  {
    id: "3",
    primary_ticker: "CL=F",
    direction: 'bullish',
    confidence: 91,
    thesis: "OPEC+ emergency meeting scheduled after Libya pipeline disruption. Supply reduction of 500k bbl/day expected, pushing Brent above $85 resistance.",
    hidden_correlation: "Energy equities (XOM, CVX) and shipping (FRO) set to benefit",
    impact_score: 8,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    sources: [
      { title: "Libya Pipeline Attack Disrupts Supply", url: "https://reuters.com", source_name: "Reuters" },
      { title: "OPEC Considers Emergency Response", url: "https://wsj.com", source_name: "WSJ" },
      { title: "Oil Prices Surge on Supply Fears", url: "https://cnbc.com", source_name: "CNBC" },
    ]
  },
  {
    id: "4",
    primary_ticker: "META",
    direction: 'bullish',
    confidence: 65,
    thesis: "EU Digital Markets Act compliance deadline approaching. Meta's prepared response and advertiser tools suggest minimal revenue impact, contrary to analyst fears.",
    impact_score: 5,
    created_at: new Date(Date.now() - 14400000).toISOString(),
    sources: [
      { title: "Meta Prepares for DMA Compliance", url: "https://techcrunch.com", source_name: "TechCrunch" },
    ]
  },
];

export function AlphaDashboard() {
  const { user } = useAuth();
  const [heatData, setHeatData] = useState<TickerHeatData[]>(MOCK_HEAT_DATA);
  const [insights, setInsights] = useState<AlphaInsight[]>(MOCK_INSIGHTS);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  // Fetch real insights from ai_insights table
  const fetchInsights = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_insights')
        .select(`
          id,
          asset_focus,
          thesis,
          sentiment,
          impact_score,
          confidence,
          related_tickers,
          created_at,
          news_event_id
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedInsights: AlphaInsight[] = data.map(item => ({
          id: item.id,
          primary_ticker: item.asset_focus || 'UNKNOWN',
          direction: item.sentiment === 'bullish' ? 'bullish' : item.sentiment === 'bearish' ? 'bearish' : 'bullish',
          confidence: item.confidence || 50,
          thesis: item.thesis || 'Analysis pending...',
          impact_score: item.impact_score || 5,
          created_at: item.created_at || new Date().toISOString(),
          sources: [] // Would need to fetch from news_events
        }));
        setInsights(formattedInsights);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
      // Keep mock data on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [user]);

  // Filter insights by selected ticker
  const filteredInsights = selectedTicker 
    ? insights.filter(i => i.primary_ticker === selectedTicker)
    : insights;

  const handleTickerClick = (ticker: string) => {
    setSelectedTicker(prev => prev === ticker ? null : ticker);
  };

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] bg-[#121212] rounded-xl overflow-hidden border border-border/30">
      {/* Heatmap Sidebar */}
      <HeatmapSidebar 
        tickers={heatData}
        onTickerClick={handleTickerClick}
      />

      {/* Main Feed */}
      <div className="flex-1 bg-[#161616]">
        {selectedTicker && (
          <div className="px-4 pt-3">
            <button 
              onClick={() => setSelectedTicker(null)}
              className="text-xs text-primary hover:underline"
            >
              ← Clear filter: {selectedTicker}
            </button>
          </div>
        )}
        <AlphaFeed 
          insights={filteredInsights}
          isLoading={isLoading}
          onRefresh={fetchInsights}
        />
      </div>
    </div>
  );
}
