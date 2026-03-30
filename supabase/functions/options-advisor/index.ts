import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRADIER_BASE = "https://api.tradier.com/v1";

async function tradierFetch(path: string, token: string) {
  const res = await fetch(`${TRADIER_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Tradier ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function getOptionsContext(ticker: string, token: string) {
  // Get quote
  const quoteData = await tradierFetch(
    `/markets/quotes?symbols=${ticker}&greeks=false`,
    token
  );
  const quote = quoteData?.quotes?.quote;
  const stockPrice = quote?.last ?? quote?.close ?? 0;
  const prevClose = quote?.prevclose ?? stockPrice;
  const change1d = stockPrice && prevClose ? ((stockPrice - prevClose) / prevClose) * 100 : 0;

  // Get expirations
  const expData = await tradierFetch(
    `/markets/options/expirations?symbol=${ticker}&includeAllRoots=true&strikes=false`,
    token
  );
  let expirations: string[] = [];
  const rawExp = expData?.expirations?.date;
  if (Array.isArray(rawExp)) expirations = rawExp;
  else if (typeof rawExp === "string") expirations = [rawExp];

  // Get first 3 expirations' chains for analysis
  const chains: any[] = [];
  const expsToFetch = expirations.slice(0, 4);
  
  for (const exp of expsToFetch) {
    try {
      const chainData = await tradierFetch(
        `/markets/options/chains?symbol=${ticker}&expiration=${exp}&greeks=true`,
        token
      );
      let opts = chainData?.options?.option;
      if (!opts) continue;
      if (!Array.isArray(opts)) opts = [opts];
      
      // Summarize: ATM options, key strikes
      const calls = opts.filter((o: any) => o.option_type === "call");
      const puts = opts.filter((o: any) => o.option_type === "put");
      
      // Find ATM
      const atmCall = calls.reduce((closest: any, c: any) => 
        !closest || Math.abs(c.strike - stockPrice) < Math.abs(closest.strike - stockPrice) ? c : closest
      , null);
      const atmPut = puts.reduce((closest: any, p: any) => 
        !closest || Math.abs(p.strike - stockPrice) < Math.abs(closest.strike - stockPrice) ? p : closest
      , null);

      // Compute put/call volume ratio
      const totalCallVol = calls.reduce((s: number, c: any) => s + (c.volume || 0), 0);
      const totalPutVol = puts.reduce((s: number, p: any) => s + (p.volume || 0), 0);
      const pcRatio = totalCallVol > 0 ? (totalPutVol / totalCallVol).toFixed(2) : "N/A";

      // Avg IV
      const allIVs = opts
        .map((o: any) => o.greeks?.mid_iv)
        .filter((v: any) => v != null && v > 0);
      const avgIV = allIVs.length > 0 
        ? (allIVs.reduce((s: number, v: number) => s + v, 0) / allIVs.length * 100).toFixed(1)
        : "N/A";

      // Top OI strikes
      const topOICalls = [...calls].sort((a: any, b: any) => (b.open_interest || 0) - (a.open_interest || 0)).slice(0, 3);
      const topOIPuts = [...puts].sort((a: any, b: any) => (b.open_interest || 0) - (a.open_interest || 0)).slice(0, 3);

      chains.push({
        expiration: exp,
        daysToExpiry: Math.round((new Date(exp).getTime() - Date.now()) / 86400000),
        totalStrikes: opts.length,
        avgIV: avgIV + "%",
        putCallRatio: pcRatio,
        atmCall: atmCall ? {
          strike: atmCall.strike,
          bid: atmCall.bid,
          ask: atmCall.ask,
          iv: atmCall.greeks?.mid_iv ? (atmCall.greeks.mid_iv * 100).toFixed(1) + "%" : "N/A",
          delta: atmCall.greeks?.delta?.toFixed(3),
          theta: atmCall.greeks?.theta?.toFixed(3),
          vega: atmCall.greeks?.vega?.toFixed(3),
          volume: atmCall.volume,
          openInterest: atmCall.open_interest,
        } : null,
        atmPut: atmPut ? {
          strike: atmPut.strike,
          bid: atmPut.bid,
          ask: atmPut.ask,
          iv: atmPut.greeks?.mid_iv ? (atmPut.greeks.mid_iv * 100).toFixed(1) + "%" : "N/A",
          delta: atmPut.greeks?.delta?.toFixed(3),
          theta: atmPut.greeks?.theta?.toFixed(3),
          vega: atmPut.greeks?.vega?.toFixed(3),
          volume: atmPut.volume,
          openInterest: atmPut.open_interest,
        } : null,
        topOICallStrikes: topOICalls.map((c: any) => ({ strike: c.strike, oi: c.open_interest, vol: c.volume })),
        topOIPutStrikes: topOIPuts.map((p: any) => ({ strike: p.strike, oi: p.open_interest, vol: p.volume })),
      });
    } catch (e) {
      console.error(`Chain fetch error for ${exp}:`, e);
    }
  }

  // Historical volatility from Tradier
  let historicalVol = "N/A";
  try {
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
    const histData = await tradierFetch(
      `/markets/history?symbol=${ticker}&interval=daily&start=${start}&end=${end}`,
      token
    );
    const days = histData?.history?.day;
    if (Array.isArray(days) && days.length > 20) {
      const returns = [];
      for (let i = 1; i < days.length; i++) {
        if (days[i].close && days[i - 1].close) {
          returns.push(Math.log(days[i].close / days[i - 1].close));
        }
      }
      if (returns.length > 10) {
        const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
        const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
        const dailyVol = Math.sqrt(variance);
        const annualizedVol = dailyVol * Math.sqrt(252);
        historicalVol = (annualizedVol * 100).toFixed(1) + "%";
      }
    }
  } catch (e) {
    console.error("Historical vol error:", e);
  }

  return {
    ticker,
    stockPrice,
    change1d: change1d.toFixed(2) + "%",
    historicalVolatility: historicalVol,
    availableExpirations: expirations.slice(0, 12),
    chainSummaries: chains,
  };
}

const SYSTEM_PROMPT = `You are an expert options strategist and institutional-grade trading advisor. You have access to LIVE market data for the ticker the user is analyzing.

## Your Analytical Framework

When recommending options trades, use these industry-standard methods:

### Strike Selection Methodology
1. **Delta-based selection**: Use delta as probability proxy (e.g., 0.30 delta ≈ 30% chance ITM at expiry)
2. **Standard deviation bands**: 1σ move = ~68% probability, 2σ = ~95%. Use implied volatility to calculate expected moves
3. **Open Interest / Volume analysis**: High OI strikes act as "magnets" — they indicate institutional positioning
4. **Technical support/resistance alignment**: Strikes near key levels have higher significance
5. **Risk/Reward ratio**: Always calculate max profit, max loss, breakeven

### Expiration Selection
1. **Theta decay curve**: Options lose time value fastest in the last 30 days. Sellers want short DTE, buyers want longer
2. **Event timing**: Position expiration AFTER catalysts (earnings, FDA, etc.) for event-driven trades
3. **Volatility term structure**: Compare near vs far IV to find mispricings
4. **Liquidity**: Prefer monthly expirations over weeklies for tighter spreads

### Strategy Selection by Intent
- **HEDGE**: Protective puts, collars, put spreads. Delta-neutral where possible
- **INCOME**: Covered calls, cash-secured puts, iron condors, credit spreads. Focus on high theta
- **GROWTH/DIRECTIONAL**: Long calls/puts, debit spreads, LEAPS. Optimize for delta exposure per dollar
- **EVENT-DRIVEN**: Straddles, strangles before events. Iron condors after IV crush expected

### Risk Management
- Position size: Never risk more than 2-5% of portfolio on a single trade
- Greeks exposure: Monitor portfolio delta, gamma, theta, vega
- Breakeven analysis: Always state breakeven price(s)
- Probability of profit: Use delta and standard deviation to estimate

## Response Format
- Be conversational but precise
- Use actual numbers from the live data provided
- Show your reasoning with the framework above
- Format recommendations clearly with: Strategy, Strike(s), Expiry, Cost, Max Profit, Max Loss, Breakeven, Probability of Profit
- Use markdown tables and formatting for clarity
- Ask follow-up questions to refine recommendations
- If user hasn't specified intent, ASK what their goal is (hedge, income, growth, event-driven)`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, ticker } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch live options context if ticker provided
    let marketContext = "";
    if (ticker) {
      const tradierToken = Deno.env.get("TRADIER_API_TOKEN");
      if (tradierToken) {
        try {
          const ctx = await getOptionsContext(ticker.toUpperCase(), tradierToken);
          marketContext = `\n\n## LIVE MARKET DATA (as of now)\n\`\`\`json\n${JSON.stringify(ctx, null, 2)}\n\`\`\`\n\nUse this data to provide specific, actionable recommendations. Reference actual bid/ask prices, IV levels, and open interest in your analysis.`;
        } catch (e) {
          console.error("Market context fetch error:", e);
          marketContext = `\n\nNote: Could not fetch live data for ${ticker}. Provide general guidance.`;
        }
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + marketContext },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("options-advisor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
