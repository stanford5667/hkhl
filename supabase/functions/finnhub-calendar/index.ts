import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

// Cache calendar for 30 minutes
let calendarCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000;

interface EconomicEvent {
  id: string;
  event_date: string;
  event_time: string | null;
  event_name: string;
  event_type: string;
  description: string | null;
  importance: string;
  actual_value: string | null;
  forecast_value: string | null;
  previous_value: string | null;
  currency: string;
  country: string;
  source: string;
}

async function fetchFinnhubCalendar(apiKey: string, from: string, to: string): Promise<any> {
  const url = `${FINNHUB_BASE_URL}/calendar/economic?from=${from}&to=${to}&token=${apiKey}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Finnhub API error: ${response.status}`);
  }
  
  return response.json();
}

function mapImportance(impact: string | number | undefined): string {
  if (!impact) return 'low';
  const impactStr = String(impact).toLowerCase();
  if (impactStr === 'high' || impactStr === '3') return 'high';
  if (impactStr === 'medium' || impactStr === '2') return 'medium';
  return 'low';
}

function categorizeEvent(event: string): string {
  const lower = event.toLowerCase();
  
  if (lower.includes('fed') || lower.includes('fomc') || lower.includes('rate decision') || lower.includes('interest rate')) {
    return 'monetary_policy';
  }
  if (lower.includes('cpi') || lower.includes('inflation') || lower.includes('pce') || lower.includes('price')) {
    return 'inflation';
  }
  if (lower.includes('gdp') || lower.includes('growth')) {
    return 'gdp';
  }
  if (lower.includes('employment') || lower.includes('payroll') || lower.includes('jobless') || lower.includes('unemployment')) {
    return 'employment';
  }
  if (lower.includes('pmi') || lower.includes('ism') || lower.includes('manufacturing')) {
    return 'pmi';
  }
  if (lower.includes('retail') || lower.includes('consumer') || lower.includes('spending')) {
    return 'consumer';
  }
  if (lower.includes('housing') || lower.includes('home')) {
    return 'housing';
  }
  if (lower.includes('trade') || lower.includes('export') || lower.includes('import')) {
    return 'trade';
  }
  if (lower.includes('earnings') || lower.includes('report')) {
    return 'earnings';
  }
  return 'economic';
}

function generateJan2026MockEvents(): EconomicEvent[] {
  // Accurate 2026 economic calendar events
  return [
    // January 2026
    { id: 'fomc-2026-01-28', event_date: '2026-01-28', event_time: '14:00', event_name: 'FOMC Interest Rate Decision', event_type: 'monetary_policy', description: 'Federal Reserve interest rate decision', importance: 'high', actual_value: null, forecast_value: '3.50-3.75%', previous_value: '3.50-3.75%', currency: 'USD', country: 'US', source: 'Demo' },
    { id: 'fomc-2026-01-29', event_date: '2026-01-29', event_time: '14:30', event_name: 'Fed Chair Powell Press Conference', event_type: 'monetary_policy', description: 'Chair Powell speaks after FOMC', importance: 'high', actual_value: null, forecast_value: null, previous_value: null, currency: 'USD', country: 'US', source: 'Demo' },
    { id: 'gdp-2026-01-30', event_date: '2026-01-30', event_time: '08:30', event_name: 'GDP Q4 2025 Advance', event_type: 'gdp', description: 'Q4 2025 GDP first estimate', importance: 'high', actual_value: null, forecast_value: '2.3%', previous_value: '2.8%', currency: 'USD', country: 'US', source: 'Demo' },
    { id: 'pce-2026-01-31', event_date: '2026-01-31', event_time: '08:30', event_name: 'Core PCE Price Index', event_type: 'inflation', description: "Fed's preferred inflation gauge", importance: 'high', actual_value: null, forecast_value: '2.6%', previous_value: '2.8%', currency: 'USD', country: 'US', source: 'Demo' },
    
    // February 2026
    { id: 'nfp-2026-02-06', event_date: '2026-02-06', event_time: '08:30', event_name: 'Nonfarm Payrolls', event_type: 'employment', description: 'January 2026 jobs report', importance: 'high', actual_value: null, forecast_value: '175K', previous_value: '256K', currency: 'USD', country: 'US', source: 'Demo' },
    { id: 'cpi-2026-02-12', event_date: '2026-02-12', event_time: '08:30', event_name: 'CPI YoY', event_type: 'inflation', description: 'Consumer Price Index', importance: 'high', actual_value: null, forecast_value: '2.7%', previous_value: '2.9%', currency: 'USD', country: 'US', source: 'Demo' },
    { id: 'retail-2026-02-14', event_date: '2026-02-14', event_time: '08:30', event_name: 'Retail Sales MoM', event_type: 'consumer', description: 'Monthly retail sales', importance: 'medium', actual_value: null, forecast_value: '0.3%', previous_value: '0.4%', currency: 'USD', country: 'US', source: 'Demo' },
    { id: 'pmi-2026-02-21', event_date: '2026-02-21', event_time: '09:45', event_name: 'S&P Global US Manufacturing PMI', event_type: 'pmi', description: 'Flash manufacturing PMI', importance: 'medium', actual_value: null, forecast_value: '49.5', previous_value: '49.4', currency: 'USD', country: 'US', source: 'Demo' },
    { id: 'gdp-2026-02-27', event_date: '2026-02-27', event_time: '08:30', event_name: 'GDP Q4 2025 Second Estimate', event_type: 'gdp', description: 'Q4 2025 GDP revised', importance: 'high', actual_value: null, forecast_value: '2.4%', previous_value: '2.3%', currency: 'USD', country: 'US', source: 'Demo' },
    { id: 'pce-2026-02-28', event_date: '2026-02-28', event_time: '08:30', event_name: 'Core PCE Price Index', event_type: 'inflation', description: "Fed's preferred inflation gauge", importance: 'high', actual_value: null, forecast_value: '2.5%', previous_value: '2.6%', currency: 'USD', country: 'US', source: 'Demo' },
    
    // March 2026
    { id: 'nfp-2026-03-06', event_date: '2026-03-06', event_time: '08:30', event_name: 'Nonfarm Payrolls', event_type: 'employment', description: 'February 2026 jobs report', importance: 'high', actual_value: null, forecast_value: '185K', previous_value: '175K', currency: 'USD', country: 'US', source: 'Demo' },
    { id: 'cpi-2026-03-11', event_date: '2026-03-11', event_time: '08:30', event_name: 'CPI YoY', event_type: 'inflation', description: 'Consumer Price Index', importance: 'high', actual_value: null, forecast_value: '2.6%', previous_value: '2.7%', currency: 'USD', country: 'US', source: 'Demo' },
    { id: 'fomc-2026-03-18', event_date: '2026-03-18', event_time: '14:00', event_name: 'FOMC Interest Rate Decision', event_type: 'monetary_policy', description: 'Federal Reserve interest rate decision', importance: 'high', actual_value: null, forecast_value: '3.25-3.50%', previous_value: '3.50-3.75%', currency: 'USD', country: 'US', source: 'Demo' },
    { id: 'fomc-2026-03-19', event_date: '2026-03-19', event_time: '14:30', event_name: 'Fed Chair Powell Press Conference', event_type: 'monetary_policy', description: 'Chair Powell speaks after FOMC with SEP', importance: 'high', actual_value: null, forecast_value: null, previous_value: null, currency: 'USD', country: 'US', source: 'Demo' },
    
    // International events
    { id: 'ecb-2026-01-30', event_date: '2026-01-30', event_time: '07:45', event_name: 'ECB Interest Rate Decision', event_type: 'monetary_policy', description: 'European Central Bank rate decision', importance: 'high', actual_value: null, forecast_value: '2.65%', previous_value: '2.90%', currency: 'EUR', country: 'EU', source: 'Demo' },
    { id: 'boj-2026-01-24', event_date: '2026-01-24', event_time: '03:00', event_name: 'BoJ Interest Rate Decision', event_type: 'monetary_policy', description: 'Bank of Japan rate decision', importance: 'high', actual_value: null, forecast_value: '0.50%', previous_value: '0.25%', currency: 'JPY', country: 'JP', source: 'Demo' },
    { id: 'uk-cpi-2026-02-19', event_date: '2026-02-19', event_time: '02:00', event_name: 'UK CPI YoY', event_type: 'inflation', description: 'UK Consumer Price Index', importance: 'medium', actual_value: null, forecast_value: '2.4%', previous_value: '2.5%', currency: 'GBP', country: 'UK', source: 'Demo' },
    { id: 'china-pmi-2026-02-01', event_date: '2026-02-01', event_time: '21:30', event_name: 'China Manufacturing PMI', event_type: 'pmi', description: 'China Caixin Manufacturing PMI', importance: 'medium', actual_value: null, forecast_value: '50.2', previous_value: '50.5', currency: 'CNY', country: 'CN', source: 'Demo' },
  ].sort((a, b) => a.event_date.localeCompare(b.event_date));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FINNHUB_API_KEY = Deno.env.get("VITE_FINNHUB_API_KEY") || Deno.env.get("FINNHUB_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'fetch';
    const daysAhead = body.daysAhead || 90;
    
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysAhead);
    
    const from = today.toISOString().split('T')[0];
    const to = endDate.toISOString().split('T')[0];
    
    let events: EconomicEvent[] = [];
    let useMockData = !FINNHUB_API_KEY;
    let source = "Demo Data";
    
    if (FINNHUB_API_KEY) {
      // Check cache first
      if (calendarCache && Date.now() - calendarCache.timestamp < CACHE_TTL_MS) {
        console.log('[finnhub-calendar] Using cached data');
        events = calendarCache.data;
        source = "Finnhub (cached)";
      } else {
        try {
          const data = await fetchFinnhubCalendar(FINNHUB_API_KEY, from, to);
          
          if (data.economicCalendar && Array.isArray(data.economicCalendar)) {
            events = data.economicCalendar
              .filter((e: any) => e.event && e.time)
              .map((e: any, i: number) => ({
                id: `finnhub-${e.time}-${i}`,
                event_date: e.time?.split(' ')[0] || from,
                event_time: e.time?.split(' ')[1] || null,
                event_name: e.event,
                event_type: categorizeEvent(e.event),
                description: e.event,
                importance: mapImportance(e.impact),
                actual_value: e.actual?.toString() || null,
                forecast_value: e.estimate?.toString() || null,
                previous_value: e.prev?.toString() || null,
                currency: e.unit || 'USD',
                country: e.country || 'US',
                source: "Finnhub",
              }));
            
            calendarCache = { data: events, timestamp: Date.now() };
            source = "Finnhub";
            useMockData = false;
          } else {
            throw new Error("Invalid response format");
          }
        } catch (err) {
          console.error('[finnhub-calendar] Finnhub error, falling back to mock:', err);
          events = generateJan2026MockEvents();
          useMockData = true;
        }
      }
    } else {
      events = generateJan2026MockEvents();
    }
    
    // Filter to requested date range
    events = events.filter(e => e.event_date >= from && e.event_date <= to);
    
    // Optionally sync to database
    if (action === 'sync' && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && events.length > 0) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Upsert events to economic_calendar table
      const { error } = await supabase
        .from('economic_calendar')
        .upsert(events.map(e => ({
          id: e.id,
          event_date: e.event_date,
          event_time: e.event_time,
          event_name: e.event_name,
          event_type: e.event_type,
          description: e.description,
          importance: e.importance,
          actual_value: e.actual_value,
          forecast_value: e.forecast_value,
          previous_value: e.previous_value,
          currency: e.currency,
          country: e.country,
          source: e.source,
        })), { onConflict: 'id' });
      
      if (error) {
        console.error('[finnhub-calendar] Database upsert error:', error);
      } else {
        console.log(`[finnhub-calendar] Synced ${events.length} events to database`);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      events,
      count: events.length,
      useMockData,
      source,
      dateRange: { from, to },
      cachedAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error("[finnhub-calendar] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
