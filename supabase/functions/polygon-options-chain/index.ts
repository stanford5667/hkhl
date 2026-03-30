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

    // Build Polygon options chain URL
    // GET /v3/reference/options/contracts?underlying_ticker=AAPL&expiration_date=2024-01-19
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
      // Default: get contracts expiring in the next 60 days
      const now = new Date();
      const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      params.set("expiration_date.gte", now.toISOString().split("T")[0]);
      params.set("expiration_date.lte", sixtyDays.toISOString().split("T")[0]);
    }

    // Fetch contracts list
    const contractsUrl = `${BASE_URL}/v3/reference/options/contracts?${params}`;
    console.log(`[polygon-options-chain] Fetching contracts for ${upperTicker}`);

    const contractsRes = await fetch(contractsUrl);
    if (!contractsRes.ok) {
      const text = await contractsRes.text();
      console.error(`[polygon-options-chain] Contracts API error ${contractsRes.status}: ${text}`);
      return json({ ok: false, error: `Polygon API error: ${contractsRes.status}`, status: contractsRes.status }, contractsRes.status === 403 ? 403 : 500);
    }

    const contractsData = await contractsRes.json();
    const contracts = contractsData.results || [];

    if (contracts.length === 0) {
      await logApiUsage({
        functionName: "polygon-options-chain",
        endpoint: `/v3/reference/options/contracts/${upperTicker}`,
        method: "POST",
        statusCode: 200,
        responseTimeMs: getElapsedMs(timer),
      });
      return json({ ok: true, ticker: upperTicker, expirations: [], contracts: [], snapshots: {} });
    }

    // Extract unique expiration dates
    const expirations = [...new Set(contracts.map((c: any) => c.expiration_date))].sort();

    // Get the target expiration (first one or the requested one)
    const targetExpiration = expirationDate || expirations[0];

    // Filter contracts for the target expiration
    const targetContracts = contracts.filter((c: any) => c.expiration_date === targetExpiration);

    // Now fetch snapshots for these contracts to get bid/ask/last price
    // GET /v3/snapshot/options/{underlyingAsset}?expiration_date=2024-01-19
    const snapshotParams = new URLSearchParams({
      expiration_date: targetExpiration,
      limit: "250",
      order: "asc",
      sort: "strike_price",
      apiKey,
    });

    const snapshotUrl = `${BASE_URL}/v3/snapshot/options/${upperTicker}?${snapshotParams}`;
    console.log(`[polygon-options-chain] Fetching snapshots for ${upperTicker} exp ${targetExpiration}`);

    const snapshotRes = await fetch(snapshotUrl);
    let snapshots: any[] = [];

    if (snapshotRes.ok) {
      const snapshotData = await snapshotRes.json();
      snapshots = snapshotData.results || [];
    } else {
      console.warn(`[polygon-options-chain] Snapshot API error ${snapshotRes.status}, continuing with contracts only`);
    }

    // Build a map of option ticker -> snapshot data
    const snapshotMap: Record<string, any> = {};
    for (const snap of snapshots) {
      const details = snap.details || {};
      const dayData = snap.day || {};
      const lastQuote = snap.last_quote || {};
      const greeks = snap.greeks || {};

      snapshotMap[details.ticker || snap.ticker] = {
        strike_price: details.strike_price,
        contract_type: details.contract_type,
        expiration_date: details.expiration_date,
        bid: lastQuote.bid || 0,
        ask: lastQuote.ask || 0,
        mid: lastQuote.midpoint || ((lastQuote.bid || 0) + (lastQuote.ask || 0)) / 2,
        last_price: dayData.close || snap.value || 0,
        volume: dayData.volume || 0,
        open_interest: snap.open_interest || 0,
        implied_volatility: snap.implied_volatility || greeks.iv || null,
        delta: greeks.delta || null,
        gamma: greeks.gamma || null,
        theta: greeks.theta || null,
        vega: greeks.vega || null,
        change: dayData.change || 0,
        change_percent: dayData.change_percent || 0,
      };
    }

    // Merge contracts with snapshot data
    const enrichedContracts = targetContracts.map((c: any) => {
      const snap = snapshotMap[c.ticker] || {};
      return {
        ticker: c.ticker,
        strike_price: c.strike_price,
        contract_type: c.contract_type, // "call" or "put"
        expiration_date: c.expiration_date,
        shares_per_contract: c.shares_per_contract || 100,
        bid: snap.bid || 0,
        ask: snap.ask || 0,
        mid: snap.mid || 0,
        last_price: snap.last_price || 0,
        volume: snap.volume || 0,
        open_interest: snap.open_interest || 0,
        implied_volatility: snap.implied_volatility,
        delta: snap.delta,
        gamma: snap.gamma,
        theta: snap.theta,
        vega: snap.vega,
        change: snap.change || 0,
        change_percent: snap.change_percent || 0,
      };
    });

    await logApiUsage({
      functionName: "polygon-options-chain",
      endpoint: `/v3/reference/options/contracts/${upperTicker}`,
      method: "POST",
      statusCode: 200,
      responseTimeMs: getElapsedMs(timer),
      metadata: { contractCount: enrichedContracts.length, expiration: targetExpiration },
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
