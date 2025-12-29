import { supabase } from "@/integrations/supabase/client";

export interface MacroIndicator {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

export interface MarketDataResponse {
  success: boolean;
  data: MacroIndicator[] | Record<string, number>;
  source: string;
  timestamp: string;
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
  { symbol: "^VIX", name: "VIX", price: 14.2, change: -0.82, changePercent: -5.45 },
  { symbol: "^DJI", name: "Dow Jones", price: 43325, change: 456, changePercent: 1.06 },
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
  // Extended list from Damodaran data
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

    // Return fallback if no valid data
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
