import { supabase } from "@/integrations/supabase/client";

export interface MacroIndicator {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

export interface NewsArticle {
  id: string;
  headline: string;
  url: string;
  source: string;
  time: string;
  isMock: boolean;
}

export interface IndustryMultiples {
  [industry: string]: number;
}

// Fallback data when API fails
export const fallbackMacroIndicators: MacroIndicator[] = [
  { symbol: "^TNX", name: "10Y Treasury", price: 4.42, change: 0.05, changePercent: 1.14 },
  { symbol: "^GSPC", name: "S&P 500", price: 6037, change: 73.2, changePercent: 1.23 },
  { symbol: "CL=F", name: "Crude Oil", price: 69.24, change: -0.87, changePercent: -1.24 },
  { symbol: "GC=F", name: "Gold", price: 2634, change: 12.4, changePercent: 0.47 },
  { symbol: "SI=F", name: "Silver", price: 29.85, change: 0.32, changePercent: 1.08 },
  { symbol: "BTC-USD", name: "Bitcoin", price: 94250, change: 1250, changePercent: 1.34 },
];

// Fallback news
export const fallbackNews: NewsArticle[] = [
  {
    id: "1",
    headline: "Private Equity Deal Volume Rebounds in Q4 2024",
    url: "https://finance.yahoo.com/topic/mna/",
    source: "Wall Street Journal",
    time: "2 hours ago",
    isMock: true,
  },
  {
    id: "2",
    headline: "Consumer Beauty Sector Sees Record M&A Activity",
    url: "https://finance.yahoo.com/topic/mna/",
    source: "Bloomberg",
    time: "5 hours ago",
    isMock: true,
  },
  {
    id: "3",
    headline: "Fed Signals Pause in Rate Cuts for Early 2025",
    url: "https://finance.yahoo.com/topic/mna/",
    source: "Reuters",
    time: "8 hours ago",
    isMock: true,
  },
  {
    id: "4",
    headline: "Healthcare Services Sector Faces Margin Pressure",
    url: "https://finance.yahoo.com/topic/mna/",
    source: "Financial Times",
    time: "12 hours ago",
    isMock: true,
  },
  {
    id: "5",
    headline: "New Mezzanine Fund Launches with $2B Target",
    url: "https://finance.yahoo.com/topic/mna/",
    source: "Private Equity International",
    time: "1 day ago",
    isMock: true,
  },
];

// Fallback multiples matching common industries
export const fallbackIndustryMultiples: IndustryMultiples = {
  "Technology": 12.5,
  "Healthcare": 11.0,
  "Consumer": 9.5,
  "Industrial": 8.0,
  "Financial Services": 10.0,
  "Energy": 6.5,
  "Real Estate": 14.0,
  "Media & Entertainment": 10.5,
  "Other": 8.5,
  "Software (System & Application)": 19.4,
  "Air Transport": 6.8,
  "Retail (General)": 8.2,
  "Drugs (Pharmaceutical)": 13.5,
  "Banks (Regional)": 7.8,
  "Insurance (General)": 8.5,
  "Telecom (Wireless)": 7.2,
  "Auto & Truck": 6.5,
  "Beverage (Alcoholic)": 12.8,
  "Entertainment": 11.2,
  "Homebuilding": 7.5,
  "Restaurant/Dining": 10.8,
};

/**
 * Fetches live macro economic indicators from the edge function
 */
export async function fetchLiveMarketData(): Promise<{
  data: MacroIndicator[];
  timestamp: Date | null;
  isLive: boolean;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("fetch-market-data", {
      body: { type: "macro" },
    });

    if (error) throw error;

    if (data?.success && Array.isArray(data.data)) {
      const validData = data.data.filter((d: MacroIndicator) => d.price !== null);
      if (validData.length > 0) {
        return {
          data: data.data,
          timestamp: new Date(data.timestamp),
          isLive: true,
        };
      }
    }

    return {
      data: fallbackMacroIndicators,
      timestamp: null,
      isLive: false,
    };
  } catch (error) {
    console.error("Error fetching macro data:", error);
    return {
      data: fallbackMacroIndicators,
      timestamp: null,
      isLive: false,
    };
  }
}

/**
 * Fetches M&A news from the edge function
 */
export async function fetchMarketNews(): Promise<{
  data: NewsArticle[];
  timestamp: Date | null;
  isLive: boolean;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("fetch-market-data", {
      body: { type: "news" },
    });

    if (error) throw error;

    if (data?.success && Array.isArray(data.data)) {
      return {
        data: data.data,
        timestamp: new Date(data.timestamp),
        isLive: !data.isMock,
      };
    }

    return {
      data: fallbackNews,
      timestamp: null,
      isLive: false,
    };
  } catch (error) {
    console.error("Error fetching news:", error);
    return {
      data: fallbackNews,
      timestamp: null,
      isLive: false,
    };
  }
}

/**
 * Fetches industry EV/EBITDA multiples from the edge function
 */
export async function fetchIndustryMultiples(): Promise<{
  data: IndustryMultiples;
  timestamp: Date | null;
  isLive: boolean;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("fetch-market-data", {
      body: { type: "multiples" },
    });

    if (error) throw error;

    if (data?.success && data.data && typeof data.data === "object") {
      return {
        data: data.data as IndustryMultiples,
        timestamp: new Date(data.timestamp),
        isLive: true,
      };
    }

    return {
      data: fallbackIndustryMultiples,
      timestamp: null,
      isLive: false,
    };
  } catch (error) {
    console.error("Error fetching industry multiples:", error);
    return {
      data: fallbackIndustryMultiples,
      timestamp: null,
      isLive: false,
    };
  }
}

/**
 * Finds the best matching multiple for an industry
 */
export function getMultipleForIndustry(
  industry: string,
  multiples: IndustryMultiples
): number | null {
  // Direct match
  if (multiples[industry]) {
    return multiples[industry];
  }

  // Fuzzy match - find industry containing the search term
  const lowerIndustry = industry.toLowerCase();
  for (const [key, value] of Object.entries(multiples)) {
    if (key.toLowerCase().includes(lowerIndustry) || lowerIndustry.includes(key.toLowerCase())) {
      return value;
    }
  }

  // Default fallback
  return multiples["Other"] || 8.5;
}

/**
 * Calculate enterprise value from EBITDA and multiple
 */
export function calculateValuation(ebitda: number, multiple: number): number {
  return ebitda * multiple;
}
