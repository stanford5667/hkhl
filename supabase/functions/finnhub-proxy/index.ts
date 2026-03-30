import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logApiUsage, startTimer, getElapsedMs } from "../_shared/api-usage-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://finnhub.io/api/v1";

type Action = "quote" | "candles" | "profile" | "search" | "batch";
type PolygonTimespan = "minute" | "day" | "week" | "month";

class ProviderHttpError extends Error {
  status: number;
  body: string;

  constructor(provider: string, status: number, body: string) {
    super(`${provider} ${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function toIsoDateFromUnixSeconds(unix: string): string {
  return new Date(Number(unix) * 1000).toISOString().split("T")[0];
}

function resolutionToPolygonRange(resolution: string): { multiplier: number; timespan: PolygonTimespan } {
  const r = resolution.toUpperCase();

  if (r === "W") return { multiplier: 1, timespan: "week" };
  if (r === "M") return { multiplier: 1, timespan: "month" };
  if (r === "D") return { multiplier: 1, timespan: "day" };

  const minute = Number(r);
  if (Number.isFinite(minute) && minute > 0) {
    return { multiplier: minute, timespan: "minute" };
  }

  return { multiplier: 1, timespan: "day" };
}

function polygonToFinnhubCandles(results: any[] | undefined) {
  if (!Array.isArray(results) || results.length === 0) {
    return { s: "no_data" };
  }

  return {
    s: "ok",
    c: results.map((r) => r.c),
    h: results.map((r) => r.h),
    l: results.map((r) => r.l),
    o: results.map((r) => r.o),
    v: results.map((r) => r.v),
    t: results.map((r) => Math.floor((r.t ?? 0) / 1000)),
  };
}

async function fetchPolygonCandles(
  symbol: string,
  resolution: string,
  from: string,
  to: string,
  polygonApiKey: string,
) {
  const { multiplier, timespan } = resolutionToPolygonRange(resolution);
  const fromDate = toIsoDateFromUnixSeconds(from);
  const toDate = toIsoDateFromUnixSeconds(to);

  const polygonUrl = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(
    symbol.toUpperCase(),
  )}/range/${multiplier}/${timespan}/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=50000&apiKey=${polygonApiKey}`;

  const response = await fetch(polygonUrl);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ProviderHttpError("Polygon", response.status, text);
  }

  const polygonData = await response.json();
  if (polygonData?.status !== "OK" && polygonData?.status !== "DELAYED") {
    throw new Error(`Polygon status: ${polygonData?.status || "unknown"}`);
  }

  return polygonToFinnhubCandles(polygonData?.results);
}

async function fetchFinnhub(path: string, token: string) {
  const url = `${BASE_URL}${path}${path.includes("?") ? "&" : "?"}token=${token}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ProviderHttpError("Finnhub", res.status, text);
  }
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiStartTime = startTimer();
  let action = "unknown";
  let apiCallCount = 0;

  try {
    const FINNHUB_API_KEY = Deno.env.get("VITE_FINNHUB_API_KEY") || Deno.env.get("FINNHUB_API_KEY");
    const POLYGON_API_KEY = Deno.env.get("VITE_POLYGON_API_KEY") || Deno.env.get("POLYGON_API_KEY");

    const body = await req.json().catch(() => ({}));
    action = (body.action as Action) || "quote";

    if (action === "quote") {
      const symbol = String(body.symbol || "").toUpperCase();
      if (!symbol) return json({ ok: false, error: "symbol is required" }, 400);
      if (!FINNHUB_API_KEY) return json({ ok: false, error: "Finnhub API key not configured" }, 200);

      apiCallCount = 1;
      const data = await fetchFinnhub(`/quote?symbol=${encodeURIComponent(symbol)}`, FINNHUB_API_KEY);
      // Finnhub returns: c,d,dp,h,l,o,pc,t
      if (!data || data.c === 0) {
        await logApiUsage({
          functionName: "finnhub-proxy",
          endpoint: `/quote/${symbol}`,
          method: "GET",
          statusCode: 200,
          responseTimeMs: getElapsedMs(apiStartTime),
          metadata: { action, symbol, apiCalls: apiCallCount },
        });
        return json({ ok: true, quote: null }, 200);
      }

      await logApiUsage({
        functionName: "finnhub-proxy",
        endpoint: `/quote/${symbol}`,
        method: "GET",
        statusCode: 200,
        responseTimeMs: getElapsedMs(apiStartTime),
        metadata: { action, symbol, apiCalls: apiCallCount },
      });

      return json({
        ok: true,
        quote: {
          symbol,
          price: data.c,
          change: data.d || 0,
          changePercent: data.dp || 0,
          high: data.h,
          low: data.l,
          open: data.o,
          previousClose: data.pc,
          timestamp: (data.t || 0) * 1000,
          companyName: symbol,
        },
      });
    }

    if (action === "candles") {
      const symbol = String(body.symbol || "").toUpperCase();
      const resolution = String(body.resolution || "D");
      const from = body.from != null ? String(body.from) : "";
      const to = body.to != null ? String(body.to) : "";

      if (!symbol) return json({ ok: false, error: "symbol is required" }, 400);
      if (!from || !to) return json({ ok: false, error: "from and to are required" }, 400);

      let data: any;
      let providerUsed: "finnhub" | "polygon" = "finnhub";

      if (FINNHUB_API_KEY) {
        try {
          apiCallCount = 1;
          data = await fetchFinnhub(
            `/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${encodeURIComponent(resolution)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
            FINNHUB_API_KEY,
          );
        } catch (error) {
          if (
            POLYGON_API_KEY &&
            error instanceof ProviderHttpError &&
            [401, 403, 429].includes(error.status)
          ) {
            providerUsed = "polygon";
            data = await fetchPolygonCandles(symbol, resolution, from, to, POLYGON_API_KEY);
          } else {
            throw error;
          }
        }
      } else if (POLYGON_API_KEY) {
        providerUsed = "polygon";
        data = await fetchPolygonCandles(symbol, resolution, from, to, POLYGON_API_KEY);
      } else {
        return json({ ok: false, error: "No market data provider configured" }, 200);
      }

      await logApiUsage({
        functionName: "finnhub-proxy",
        endpoint: `/candles/${symbol}`,
        method: "GET",
        statusCode: 200,
        responseTimeMs: getElapsedMs(apiStartTime),
        metadata: { action, symbol, resolution, providerUsed, apiCalls: apiCallCount },
      });

      return json({ ok: true, candles: data, providerUsed });
    }

    if (action === "profile") {
      const symbol = String(body.symbol || "").toUpperCase();
      if (!symbol) return json({ ok: false, error: "symbol is required" }, 400);
      if (!FINNHUB_API_KEY) return json({ ok: false, error: "Finnhub API key not configured" }, 200);

      apiCallCount = 1;
      const data = await fetchFinnhub(`/stock/profile2?symbol=${encodeURIComponent(symbol)}`, FINNHUB_API_KEY);

      await logApiUsage({
        functionName: "finnhub-proxy",
        endpoint: `/profile/${symbol}`,
        method: "GET",
        statusCode: 200,
        responseTimeMs: getElapsedMs(apiStartTime),
        metadata: { action, symbol, apiCalls: apiCallCount },
      });

      if (!data || !data.name) return json({ ok: true, profile: null }, 200);

      return json({
        ok: true,
        profile: {
          name: data.name,
          ticker: data.ticker,
          marketCap: (data.marketCapitalization || 0) * 1000000,
          exchange: data.exchange,
          industry: data.finnhubIndustry,
        },
      });
    }

    if (action === "search") {
      const q = String(body.query || "").trim();
      if (!q) return json({ ok: true, results: [] }, 200);
      if (!FINNHUB_API_KEY) return json({ ok: false, error: "Finnhub API key not configured" }, 200);

      apiCallCount = 1;
      const data = await fetchFinnhub(`/search?q=${encodeURIComponent(q)}`, FINNHUB_API_KEY);
      const results = (data.result || []).slice(0, 10).map((r: any) => ({
        symbol: r.symbol,
        description: r.description,
      }));

      await logApiUsage({
        functionName: "finnhub-proxy",
        endpoint: "/search",
        method: "GET",
        statusCode: 200,
        responseTimeMs: getElapsedMs(apiStartTime),
        metadata: { action, query: q, resultsCount: results.length, apiCalls: apiCallCount },
      });

      return json({ ok: true, results });
    }

    if (action === "batch") {
      const symbols = Array.isArray(body.symbols) ? body.symbols : [];
      const normalized: string[] = symbols
        .map((s: unknown) => String(s ?? "").toUpperCase())
        .filter((s: string) => Boolean(s));

      const unique: string[] = Array.from(new Set(normalized));
      const out: Record<string, unknown> = {};

      if (!FINNHUB_API_KEY) return json({ ok: false, error: "Finnhub API key not configured" }, 200);

      // Chunk to be gentle with free tier; still relies on upstream limits.
      for (let i = 0; i < unique.length; i += 10) {
        const chunk: string[] = unique.slice(i, i + 10);
        const chunkResults: Array<readonly [string, unknown | null]> = await Promise.all(
          chunk.map(async (symbol: string) => {
            try {
              apiCallCount++;
              const data = await fetchFinnhub(`/quote?symbol=${encodeURIComponent(symbol)}`, FINNHUB_API_KEY);
              if (!data || data.c === 0) return [symbol, null] as const;
              return [
                symbol,
                {
                  symbol,
                  price: data.c,
                  change: data.d || 0,
                  changePercent: data.dp || 0,
                  high: data.h,
                  low: data.l,
                  open: data.o,
                  previousClose: data.pc,
                  timestamp: (data.t || 0) * 1000,
                  companyName: symbol,
                },
              ] as const;
            } catch {
              return [symbol, null] as const;
            }
          }),
        );

        for (const [symbol, quote] of chunkResults) {
          if (quote) out[symbol] = quote;
        }

        if (i + 10 < unique.length) await sleep(200);
      }

      await logApiUsage({
        functionName: "finnhub-proxy",
        endpoint: "/batch",
        method: "GET",
        statusCode: 200,
        responseTimeMs: getElapsedMs(apiStartTime),
        metadata: { action, symbolCount: unique.length, quotesReturned: Object.keys(out).length, apiCalls: apiCallCount },
      });

      return json({ ok: true, quotes: out });
    }

    return json({ ok: false, error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("[finnhub-proxy] error", error);

    await logApiUsage({
      functionName: "finnhub-proxy",
      endpoint: `/${action}`,
      method: "GET",
      statusCode: 500,
      responseTimeMs: getElapsedMs(apiStartTime),
      metadata: { action, error: String(error), apiCalls: apiCallCount },
    });

    return json({ ok: false, error: "Proxy failed" }, 200);
  }
});
