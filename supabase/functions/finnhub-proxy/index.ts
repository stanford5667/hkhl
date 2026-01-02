import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://finnhub.io/api/v1";

type Action = "quote" | "candles" | "profile" | "search" | "batch";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchFinnhub(path: string, token: string) {
  const url = `${BASE_URL}${path}${path.includes("?") ? "&" : "?"}token=${token}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Finnhub ${res.status}: ${text}`);
  }
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FINNHUB_API_KEY = Deno.env.get("VITE_FINNHUB_API_KEY") || Deno.env.get("FINNHUB_API_KEY");
    if (!FINNHUB_API_KEY) {
      return json({ ok: false, error: "Finnhub API key not configured" }, 200);
    }

    const body = await req.json().catch(() => ({}));
    const action = (body.action as Action) || "quote";

    if (action === "quote") {
      const symbol = String(body.symbol || "").toUpperCase();
      if (!symbol) return json({ ok: false, error: "symbol is required" }, 400);

      const data = await fetchFinnhub(`/quote?symbol=${encodeURIComponent(symbol)}`, FINNHUB_API_KEY);
      // Finnhub returns: c,d,dp,h,l,o,pc,t
      if (!data || data.c === 0) return json({ ok: true, quote: null }, 200);

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

      const data = await fetchFinnhub(
        `/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${encodeURIComponent(resolution)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        FINNHUB_API_KEY
      );

      return json({ ok: true, candles: data });
    }

    if (action === "profile") {
      const symbol = String(body.symbol || "").toUpperCase();
      if (!symbol) return json({ ok: false, error: "symbol is required" }, 400);

      const data = await fetchFinnhub(`/stock/profile2?symbol=${encodeURIComponent(symbol)}`, FINNHUB_API_KEY);
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

      const data = await fetchFinnhub(`/search?q=${encodeURIComponent(q)}`, FINNHUB_API_KEY);
      const results = (data.result || []).slice(0, 10).map((r: any) => ({
        symbol: r.symbol,
        description: r.description,
      }));

      return json({ ok: true, results });
    }

    if (action === "batch") {
      const symbols = Array.isArray(body.symbols) ? body.symbols : [];
      const normalized: string[] = symbols
        .map((s: unknown) => String(s ?? "").toUpperCase())
        .filter((s: string) => Boolean(s));

      const unique: string[] = Array.from(new Set(normalized));
      const out: Record<string, unknown> = {};

      // Chunk to be gentle with free tier; still relies on upstream limits.
      for (let i = 0; i < unique.length; i += 10) {
        const chunk: string[] = unique.slice(i, i + 10);
        const chunkResults: Array<readonly [string, unknown | null]> = await Promise.all(
          chunk.map(async (symbol: string) => {
            try {
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
          })
        );

        for (const [symbol, quote] of chunkResults) {
          if (quote) out[symbol] = quote;
        }

        if (i + 10 < unique.length) await sleep(200);
      }

      return json({ ok: true, quotes: out });
    }

    return json({ ok: false, error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("[finnhub-proxy] error", error);
    return json({ ok: false, error: "Proxy failed" }, 200);
  }
});

