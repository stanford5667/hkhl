import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StockCard {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  description: string;
  market_cap_tier: string;
  asset_type: string;
  tags: string[];
  price?: number;
  change_percent?: number;
  volume?: number;
  week52_high?: number;
  week52_low?: number;
  rsi?: number;
  trend?: string;
  signal?: "bullish" | "bearish" | "neutral";
  momentum_score?: number;
}

export type SwipeDirection = "left" | "right" | "up";

export interface SwipeAction {
  ticker: string;
  direction: SwipeDirection;
  timestamp: number;
}

const SECTORS = [
  "Technology",
  "Healthcare",
  "Financial Services",
  "Consumer Cyclical",
  "Consumer Defensive",
  "Energy",
  "Industrials",
  "Communication Services",
  "Real Estate",
  "Utilities",
  "Basic Materials",
];

export function useStockDiscoveryFeed(options?: {
  sectorFilter?: string | null;
  assetType?: string | null;
  limit?: number;
}) {
  const { sectorFilter = null, assetType = null, limit = 50 } = options || {};

  const [swipedTickers, setSwipedTickers] = useState<Set<string>>(new Set());
  const [swipeHistory, setSwipeHistory] = useState<SwipeAction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: assets, isLoading } = useQuery({
    queryKey: ["stock-discovery-feed", sectorFilter, assetType, limit],
    queryFn: async () => {
      let query = supabase
        .from("asset_universe")
        .select("*")
        .eq("is_free_tier", true)
        .order("liquidity_score", { ascending: false })
        .limit(limit);

      if (sectorFilter) {
        query = query.eq("sector", sectorFilter);
      }
      if (assetType) {
        query = query.eq("asset_type", assetType);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        return generateFallbackCards();
      }

      return data.map(
        (a): StockCard => ({
          ticker: a.ticker,
          name: a.name,
          sector: a.sector || "Unknown",
          industry: a.industry || "Unknown",
          description: a.description || "",
          market_cap_tier: a.market_cap_tier || "unknown",
          asset_type: a.asset_type || "stock",
          tags: Array.isArray(a.tags) ? a.tags : [],
          signal: "neutral",
          momentum_score: Math.floor(Math.random() * 100),
        })
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  const shuffledCards = useMemo(() => {
    if (!assets) return [];
    const arr = [...assets];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [assets]);

  const availableCards = useMemo(
    () => shuffledCards.filter((c) => !swipedTickers.has(c.ticker)),
    [shuffledCards, swipedTickers]
  );

  const handleSwipe = useCallback(
    (ticker: string, direction: SwipeDirection) => {
      const card = shuffledCards.find((c) => c.ticker === ticker);
      setSwipedTickers((prev) => new Set([...prev, ticker]));
      setSwipeHistory((prev) => [
        ...prev,
        { ticker, direction, timestamp: Date.now() },
      ]);
      setCurrentIndex((prev) => prev + 1);

      // Persist likes to watchlist (right swipe = like)
      if (direction === "right" && card) {
        (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          await supabase.from("user_watchlist").upsert(
            {
              item_id: ticker,
              item_name: card.name,
              item_type: "stock",
              user_id: user.id,
            },
            { onConflict: "user_id,item_id" }
          );
        })();
      }
    },
    [shuffledCards]
  );

  const undoLastSwipe = useCallback(() => {
    if (swipeHistory.length === 0) return;
    const last = swipeHistory[swipeHistory.length - 1];
    setSwipedTickers((prev) => {
      const next = new Set(prev);
      next.delete(last.ticker);
      return next;
    });
    setSwipeHistory((prev) => prev.slice(0, -1));
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, [swipeHistory]);

  const stats = useMemo(() => {
    const likes = swipeHistory.filter((s) => s.direction === "right").length;
    const passes = swipeHistory.filter((s) => s.direction === "left").length;
    const saves = swipeHistory.filter((s) => s.direction === "up").length;
    return { likes, passes, saves, total: swipeHistory.length };
  }, [swipeHistory]);

  return {
    cards: availableCards,
    allCards: shuffledCards,
    isLoading,
    currentIndex,
    swipeHistory,
    stats,
    handleSwipe,
    undoLastSwipe,
    sectors: SECTORS,
  };
}

// ─── Fallback Data ──────────────────────────────────────────────────────

function generateFallbackCards(): StockCard[] {
  const stocks = [
    { ticker: "AAPL", name: "Apple Inc.", sector: "Technology", industry: "Consumer Electronics", market_cap_tier: "mega", description: "Designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.", tags: ["magnificent_7", "sp500", "tech"] },
    { ticker: "MSFT", name: "Microsoft Corporation", sector: "Technology", industry: "Software - Infrastructure", market_cap_tier: "mega", description: "Develops, licenses, and supports software, services, devices, and solutions worldwide.", tags: ["magnificent_7", "sp500", "cloud"] },
    { ticker: "NVDA", name: "NVIDIA Corporation", sector: "Technology", industry: "Semiconductors", market_cap_tier: "mega", description: "Provides graphics, compute and networking solutions. The AI chip leader.", tags: ["magnificent_7", "sp500", "ai", "semiconductors"] },
    { ticker: "GOOGL", name: "Alphabet Inc.", sector: "Technology", industry: "Internet Content & Information", market_cap_tier: "mega", description: "Parent company of Google, YouTube, and Waymo. Dominates search and digital advertising.", tags: ["magnificent_7", "sp500", "advertising"] },
    { ticker: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Cyclical", industry: "Internet Retail", market_cap_tier: "mega", description: "Retail, cloud computing (AWS), streaming, and AI. The everything store.", tags: ["magnificent_7", "sp500", "ecommerce", "cloud"] },
    { ticker: "META", name: "Meta Platforms Inc.", sector: "Technology", industry: "Social Media", market_cap_tier: "mega", description: "Operates Facebook, Instagram, WhatsApp, and is building the metaverse.", tags: ["magnificent_7", "sp500", "social_media"] },
    { ticker: "TSLA", name: "Tesla Inc.", sector: "Consumer Cyclical", industry: "Auto Manufacturers", market_cap_tier: "mega", description: "Electric vehicles, energy storage, solar, and autonomous driving technology.", tags: ["magnificent_7", "sp500", "ev", "energy"] },
    { ticker: "JPM", name: "JPMorgan Chase & Co.", sector: "Financial Services", industry: "Banks - Diversified", market_cap_tier: "mega", description: "The largest US bank by assets. Investment banking, commercial banking, and asset management.", tags: ["sp500", "dow30", "banks"] },
    { ticker: "V", name: "Visa Inc.", sector: "Financial Services", industry: "Credit Services", market_cap_tier: "mega", description: "The world's largest payment network, processing billions of transactions annually.", tags: ["sp500", "dow30", "payments"] },
    { ticker: "UNH", name: "UnitedHealth Group", sector: "Healthcare", industry: "Healthcare Plans", market_cap_tier: "mega", description: "Largest US health insurer. Optum health services and technology arm.", tags: ["sp500", "dow30", "healthcare"] },
    { ticker: "LLY", name: "Eli Lilly and Company", sector: "Healthcare", industry: "Drug Manufacturers", market_cap_tier: "mega", description: "Pharma giant behind blockbuster obesity and diabetes drugs.", tags: ["sp500", "pharma", "obesity_drugs"] },
    { ticker: "XOM", name: "Exxon Mobil Corporation", sector: "Energy", industry: "Oil & Gas Integrated", market_cap_tier: "mega", description: "World's largest publicly traded oil and gas company.", tags: ["sp500", "dow30", "energy", "dividend"] },
    { ticker: "COST", name: "Costco Wholesale", sector: "Consumer Defensive", industry: "Discount Stores", market_cap_tier: "large", description: "Membership warehouse club. Known for bulk deals and loyal customer base.", tags: ["sp500", "retail", "consumer"] },
    { ticker: "NFLX", name: "Netflix Inc.", sector: "Communication Services", industry: "Entertainment", market_cap_tier: "mega", description: "The streaming giant. Original content powerhouse with 250M+ subscribers.", tags: ["sp500", "nasdaq100", "streaming"] },
    { ticker: "AMD", name: "Advanced Micro Devices", sector: "Technology", industry: "Semiconductors", market_cap_tier: "large", description: "CPUs, GPUs, and AI accelerators. NVIDIA's biggest competitor in AI chips.", tags: ["sp500", "nasdaq100", "semiconductors", "ai"] },
    { ticker: "CRM", name: "Salesforce Inc.", sector: "Technology", industry: "Software - Application", market_cap_tier: "large", description: "The #1 CRM platform. Enterprise cloud software and AI (Einstein).", tags: ["sp500", "dow30", "cloud", "saas"] },
    { ticker: "AVGO", name: "Broadcom Inc.", sector: "Technology", industry: "Semiconductors", market_cap_tier: "mega", description: "Semiconductor and infrastructure software. Key supplier for AI networking.", tags: ["sp500", "semiconductors", "ai"] },
    { ticker: "DIS", name: "The Walt Disney Company", sector: "Communication Services", industry: "Entertainment", market_cap_tier: "large", description: "Theme parks, Disney+, ESPN, Marvel, Star Wars. Entertainment empire.", tags: ["sp500", "dow30", "entertainment", "streaming"] },
    { ticker: "COIN", name: "Coinbase Global", sector: "Financial Services", industry: "Financial Data & Exchanges", market_cap_tier: "mid", description: "Largest US crypto exchange. The gateway to digital assets.", tags: ["sp500", "crypto", "fintech"] },
    { ticker: "PLTR", name: "Palantir Technologies", sector: "Technology", industry: "Software - Infrastructure", market_cap_tier: "large", description: "AI and data analytics for government and enterprise. Big data platform.", tags: ["sp500", "ai", "defense", "data"] },
    { ticker: "SOFI", name: "SoFi Technologies", sector: "Financial Services", industry: "Credit Services", market_cap_tier: "mid", description: "Digital personal finance: student loans, investing, banking, and crypto.", tags: ["fintech", "banking", "millennial"] },
    { ticker: "RIVN", name: "Rivian Automotive", sector: "Consumer Cyclical", industry: "Auto Manufacturers", market_cap_tier: "mid", description: "Electric adventure vehicles. Amazon delivery van partner.", tags: ["ev", "growth", "amazon"] },
    { ticker: "NET", name: "Cloudflare Inc.", sector: "Technology", industry: "Software - Infrastructure", market_cap_tier: "mid", description: "Internet security and performance. Protects and accelerates websites globally.", tags: ["cybersecurity", "cloud", "saas"] },
    { ticker: "SNOW", name: "Snowflake Inc.", sector: "Technology", industry: "Software - Infrastructure", market_cap_tier: "large", description: "Cloud data platform. The data warehouse for the AI era.", tags: ["cloud", "data", "ai", "saas"] },
    { ticker: "SQ", name: "Block Inc.", sector: "Financial Services", industry: "Software - Infrastructure", market_cap_tier: "mid", description: "Square payments, Cash App, and Bitcoin. Fintech for businesses and consumers.", tags: ["fintech", "payments", "crypto", "bitcoin"] },
  ];

  return stocks.map(
    (s): StockCard => ({
      ...s,
      asset_type: "stock",
      signal: (["bullish", "bearish", "neutral"] as const)[Math.floor(Math.random() * 3)],
      momentum_score: Math.floor(Math.random() * 100),
    })
  );
}
