// Batch Job: Pre-populate study_probability_scores table
// supabase/functions/batch-populate-study-probabilities/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BatchBody = {
  tickerLimit?: number;
  batchSize?: number;
  studyTypes?: string[] | null;
  forceRecalculate?: boolean;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: BatchBody = await req.json();
    const {
      tickerLimit = 100,
      batchSize = 10,
      studyTypes = null,
      forceRecalculate = false,
    } = body;

    console.log("🚀 Starting batch population of study_probability_scores");
    console.log(
      `📊 Settings: tickers=${tickerLimit}, batchSize=${batchSize}, forceRecalculate=${forceRecalculate}`,
    );

    // 1) Get liquid tickers
    const { data: tickers, error: tickerError } = await supabase
      .from("asset_universe")
      .select("ticker, name, sector, market_cap_tier, avg_daily_volume")
      .eq("is_active", true)
      .order("avg_daily_volume", { ascending: false })
      .limit(tickerLimit);

    if (tickerError || !tickers?.length) {
      throw new Error(`Failed to fetch tickers: ${tickerError?.message || "No tickers"}`);
    }

    // 2) Decide which studies to run
    const defaultStudyTypes = [
      "after_down_x",
      "after_up_x",
      "after_consecutive_days",
      "after_high_volume",
      "after_gap",
      "below_ma",
      "rsi_analysis",
      "moving_average_analysis",
      "volatility_analysis",
      "gap_analysis",
    ];

    const studiesToRun = studyTypes?.length ? studyTypes : defaultStudyTypes;
    console.log(`🔬 Will run ${studiesToRun.length} study types`);

    // 3) Skip tickers that already have ANY rows (unless forcing)
    let tickersToProcess = tickers as any[];
    if (!forceRecalculate) {
      const { data: existingData, error: existingError } = await supabase
        .from("study_probability_scores")
        .select("symbol")
        .in(
          "symbol",
          tickers.map((t: any) => t.ticker),
        );

      if (!existingError && existingData?.length) {
        const existingSymbols = new Set(existingData.map((d: any) => d.symbol));
        tickersToProcess = tickers.filter((t: any) => !existingSymbols.has(t.ticker));
      }

      console.log(`⏭️  Skipping ${tickers.length - tickersToProcess.length} tickers with existing data`);
      console.log(`✅ ${tickersToProcess.length} tickers need processing`);
    }

    if (!tickersToProcess.length) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, skipped: tickers.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Date range (match Quant Lab default ~3 years)
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 756 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    let tickersProcessed = 0;
    let studiesSaved = 0;
    let errors = 0;
    const startedAt = Date.now();

    for (let i = 0; i < tickersToProcess.length; i += batchSize) {
      const batch = tickersToProcess.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(tickersToProcess.length / batchSize);

      console.log(
        `\n📦 Batch ${batchNum}/${totalBatches}: ${batch.map((t: any) => t.ticker).join(", ")}`,
      );

      const batchResults = await Promise.allSettled(
        batch.map((t: any) =>
          processTickerAllStudies(supabase, {
            ticker: t.ticker,
            name: t.name,
            sector: t.sector,
            market_cap_tier: t.market_cap_tier,
          }, studiesToRun, { startDate, endDate })
        ),
      );

      for (let j = 0; j < batchResults.length; j++) {
        tickersProcessed++;
        const ticker = batch[j].ticker;
        const r = batchResults[j];

        if (r.status === "fulfilled") {
          studiesSaved += r.value.studiesSaved;
          errors += r.value.studiesFailed;
          console.log(`  ✅ ${ticker}: saved=${r.value.studiesSaved}, failed=${r.value.studiesFailed}`);
        } else {
          errors += studiesToRun.length;
          console.error(`  ❌ ${ticker}: batch failure`, r.reason);
        }
      }

      // gentle pacing between batches
      if (i + batchSize < tickersToProcess.length) {
        await new Promise((res) => setTimeout(res, 1500));
      }
    }

    const totalTimeSeconds = (Date.now() - startedAt) / 1000;

    console.log("\n🎉 Batch population complete");
    console.log(`⏱️  Total time: ${totalTimeSeconds.toFixed(1)}s`);
    console.log(`📊 Tickers processed: ${tickersProcessed}`);
    console.log(`✅ Studies saved: ${studiesSaved}`);
    console.log(`❌ Errors: ${errors}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          tickersProcessed,
          studiesSaved,
          errors,
          totalTimeSeconds: Number(totalTimeSeconds.toFixed(1)),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("💥 Batch job failed:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function processTickerAllStudies(
  supabase: any,
  ticker: { ticker: string; name?: string | null; sector?: string | null; market_cap_tier?: string | null },
  studyTypes: string[],
  range: { startDate: string; endDate: string },
): Promise<{ studiesSaved: number; studiesFailed: number }> {
  let studiesSaved = 0;
  let studiesFailed = 0;

  for (const studyType of studyTypes) {
    try {
      const { data, error } = await supabase.functions.invoke("run-asset-study", {
        body: {
          ticker: ticker.ticker,
          studyType,
          startDate: range.startDate,
          endDate: range.endDate,
          saveToDatabase: true,
          metadata: {
            name: ticker.name,
            sector: ticker.sector,
            market_cap_tier: ticker.market_cap_tier,
          },
        },
      });

      if (error) {
        studiesFailed++;
        console.error(`  ❌ ${ticker.ticker}/${studyType}:`, error);
      } else if (data?.probabilitySummary?.savedToDatabase) {
        studiesSaved++;
      } else {
        // If the downstream function doesn't report saving, we still count it as a failure
        studiesFailed++;
        console.warn(`  ⚠️  ${ticker.ticker}/${studyType}: executed but not confirmed saved`);
      }
    } catch (e) {
      studiesFailed++;
      console.error(`  ❌ ${ticker.ticker}/${studyType}:`, e);
    }

    // small delay between studies on same ticker
    await new Promise((res) => setTimeout(res, 100));
  }

  return { studiesSaved, studiesFailed };
}
