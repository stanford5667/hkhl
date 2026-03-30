import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const YAHOO_BASE = "https://query2.finance.yahoo.com/v7/finance/options";

async function yahooFetch(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Yahoo API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function unixToDate(ts: number): string {
  return new Date(ts * 1000).toISOString().split("T")[0];
}

function mapContract(c: any, contractType: "call" | "put") {
  return {
    ticker: c.contractSymbol || "",
    strike_price: c.strike ?? 0,
    contract_type: contractType,
    expiration_date: c.expiration ? unixToDate(c.expiration) : "",
    shares_per_contract: 100,
    bid: c.bid ?? 0,
    ask: c.ask ?? 0,
    mid: c.bid != null && c.ask != null ? Math.round(((c.bid + c.ask) / 2) * 100) / 100 : c.lastPrice ?? 0,
    last_price: c.lastPrice ?? 0,
    volume: c.volume ?? 0,
    open_interest: c.openInterest ?? 0,
    implied_volatility: c.impliedVolatility ?? null,
    delta: null,
    gamma: null,
    theta: null,
    vega: null,
    change: c.change ?? 0,
    change_percent: c.percentChange ?? 0,
    in_the_money: c.inTheMoney ?? false,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker, expirationDate } = await req.json();
    if (!ticker || typeof ticker !== "string") {
      return json({ ok: false, error: "ticker is required" }, 400);
    }

    const upperTicker = ticker.toUpperCase();

    // Step 1: Fetch base options data (includes expirations list + nearest chain)
    const baseData = await yahooFetch(`${YAHOO_BASE}/${upperTicker}`);
    const optionChain = baseData?.optionChain;
    if (!optionChain?.result?.length) {
      return json({ ok: false, error: "No options data found for " + upperTicker }, 404);
    }

    const result = optionChain.result[0];
    const quote = result.quote || {};
    const stockPrice = quote.regularMarketPrice ?? 0;

    // All available expiration timestamps
    const expirationTimestamps: number[] = result.expirationDates || [];
    const expirations = expirationTimestamps.map(unixToDate);

    if (expirations.length === 0) {
      return json({
        ok: true,
        ticker: upperTicker,
        stockPrice,
        expirations: [],
        contracts: [],
      });
    }

    // Step 2: If a specific expiration was requested, fetch that chain
    let targetData = result;
    let selectedExpiration: string;

    if (expirationDate) {
      // Convert date string to unix timestamp
      const targetTs = expirationTimestamps.find(
        (ts) => unixToDate(ts) === expirationDate
      );
      if (targetTs) {
        const expData = await yahooFetch(
          `${YAHOO_BASE}/${upperTicker}?date=${targetTs}`
        );
        targetData = expData?.optionChain?.result?.[0] || result;
      }
      selectedExpiration = expirationDate;
    } else {
      selectedExpiration = expirations[0];
    }

    // Step 3: Map calls and puts
    const options = targetData.options?.[0] || {};
    const calls = (options.calls || []).map((c: any) => mapContract(c, "call"));
    const puts = (options.puts || []).map((c: any) => mapContract(c, "put"));
    const contracts = [...calls, ...puts].sort(
      (a: any, b: any) => a.strike_price - b.strike_price
    );

    return json({
      ok: true,
      ticker: upperTicker,
      stockPrice,
      expirations,
      selectedExpiration,
      contracts,
    });
  } catch (err) {
    console.error("[yahoo-options-chain] Error:", err);
    return json({ ok: false, error: err.message || "Unknown error" }, 500);
  }
});
