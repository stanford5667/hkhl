import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logApiUsage, startTimer, getElapsedMs } from "../_shared/api-usage-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://api.polygon.io";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchPolygon(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[polygon] ${res.status}: ${text.slice(0, 200)}`);
    return null;
  }
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const timer = startTimer();

  try {
    const apiKey = Deno.env.get("POLYGON_API_KEY");
    if (!apiKey) {
      return json({ ok: false, error: "POLYGON_API_KEY not configured" }, 500);
    }

    const { ticker, expirationDate } = await req.json();

    if (!ticker || typeof ticker !== "string") {
      return json({ ok: false, error: "ticker is required" }, 400);
    }

    const upperTicker = ticker.toUpperCase();

    // 1. Fetch contracts list
    const params = new URLSearchParams({
      underlying_ticker: upperTicker,
      limit: "250",
      order: "asc",
      sort: "strike_price",
      apiKey,
    });

    if (expirationDate) {
      params.set("expiration_date", expirationDate);
    } else {
      const now = new Date();
      const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      params.set("expiration_date.gte", now.toISOString().split("T")[0]);
      params.set("expiration_date.lte", sixtyDays.toISOString().split("T")[0]);
    }

    const contractsUrl = `${BASE_URL}/v3/reference/options/contracts?${params}`;
    console.log(`[polygon-options-chain] Fetching contracts for ${upperTicker}`);

    const contractsData = await fetchPolygon(contractsUrl);
    if (!contractsData) {
      return json({ ok: false, error: "Failed to fetch contracts from Polygon" }, 500);
    }

    const contracts = contractsData.results || [];
    if (contracts.length === 0) {
      await logApiUsage({
        functionName: "polygon-options-chain",
        endpoint: `/options/contracts/${upperTicker}`,
        method: "POST",
        statusCode: 200,
        responseTimeMs: getElapsedMs(timer),
      });
      return json({ ok: true, ticker: upperTicker, expirations: [], contracts: [] });
    }

    // Extract unique expiration dates
    const expirations = [...new Set(contracts.map((c: any) => c.expiration_date))].sort();
    const targetExpiration = expirationDate || expirations[0];
    const targetContracts = contracts.filter((c: any) => c.expiration_date === targetExpiration);

    // 2. Get current stock price to determine ATM
    const quoteData = await fetchPolygon(
      `${BASE_URL}/v2/aggs/ticker/${upperTicker}/prev?adjusted=true&apiKey=${apiKey}`
    );
    const stockPrice = quoteData?.results?.[0]?.c || 0;

    // 3. Sort contracts by distance from ATM, take nearest 40
    const sortedByATM = [...targetContracts].sort(
      (a: any, b: any) => Math.abs(a.strike_price - stockPrice) - Math.abs(b.strike_price - stockPrice)
    );
    const nearContracts = sortedByATM.slice(0, 40);

    // 4. Fetch prev-day aggs for each contract ticker (works on basic Polygon plans)
    const CHUNK_SIZE = 10;
    const enrichedMap: Record<string, any> = {};

    for (let i = 0; i < nearContracts.length; i += CHUNK_SIZE) {
      const chunk = nearContracts.slice(i, i + CHUNK_SIZE);
      const results = await Promise.allSettled(
        chunk.map(async (c: any) => {
          const optTicker = c.ticker; // e.g. O:MSFT260401C00330000
          // Fetch previous day's OHLCV
          const aggData = await fetchPolygon(
            `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(optTicker)}/prev?adjusted=true&apiKey=${apiKey}`
          );
          const agg = aggData?.results?.[0];

          // Also fetch last NBBO quote for bid/ask
          const quoteRes = await fetchPolygon(
            `${BASE_URL}/v3/quotes/${encodeURIComponent(optTicker)}?limit=1&order=desc&sort=timestamp&apiKey=${apiKey}`
          );
          const quote = quoteRes?.results?.[0];

          return { ticker: optTicker, agg, quote };
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          const { ticker: t, agg, quote } = r.value;
          const bid = quote?.bid_price || 0;
          const ask = quote?.ask_price || 0;
          enrichedMap[t] = {
            bid,
            ask,
            mid: bid && ask ? (bid + ask) / 2 : agg?.c || 0,
            last_price: agg?.c || 0,
            volume: agg?.v || 0,
            open_interest: 0, // not available from aggs
            change: agg ? (agg.c - agg.o) : 0,
            change_percent: agg && agg.o ? ((agg.c - agg.o) / agg.o) * 100 : 0,
          };
        }
      }
    }

    // 5. Build final enriched contracts (all target contracts, sorted by strike)
    const enrichedContracts = targetContracts
      .sort((a: any, b: any) => a.strike_price - b.strike_price)
      .map((c: any) => {
        const snap = enrichedMap[c.ticker] || {};
        return {
          ticker: c.ticker,
          strike_price: c.strike_price,
          contract_type: c.contract_type,
          expiration_date: c.expiration_date,
          shares_per_contract: c.shares_per_contract || 100,
          bid: snap.bid || 0,
          ask: snap.ask || 0,
          mid: snap.mid || 0,
          last_price: snap.last_price || 0,
          volume: snap.volume || 0,
          open_interest: snap.open_interest || 0,
          implied_volatility: null,
          delta: null,
          gamma: null,
          theta: null,
          vega: null,
          change: snap.change || 0,
          change_percent: snap.change_percent || 0,
        };
      });

    await logApiUsage({
      functionName: "polygon-options-chain",
      endpoint: `/options/contracts/${upperTicker}`,
      method: "POST",
      statusCode: 200,
      responseTimeMs: getElapsedMs(timer),
      metadata: { contractCount: enrichedContracts.length, expiration: targetExpiration, enriched: Object.keys(enrichedMap).length },
    });

    return json({
      ok: true,
      ticker: upperTicker,
      expirations,
      selectedExpiration: targetExpiration,
      contracts: enrichedContracts,
    });
  } catch (err) {
    console.error("[polygon-options-chain] Error:", err);
    return json({ ok: false, error: err.message || "Unknown error" }, 500);
  }
});
