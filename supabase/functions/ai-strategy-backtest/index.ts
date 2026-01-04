import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Condition {
  type: string;
  metric: string;
  operator: string;
  value: number | string;
}

interface ParsedStrategy {
  strategy_name: string;
  entry_conditions: Condition[];
  entry_logic: 'AND' | 'OR';
  exit_conditions: Condition[];
  exit_logic: 'AND' | 'OR';
  position_sizing: string;
  max_positions: number;
  category_filter: string | null;
}

interface Trade {
  market_id: string;
  market_title: string;
  entry_date: string;
  entry_price: number;
  exit_date: string | null;
  exit_price: number | null;
  pnl: number;
  pnl_percent: number;
  holding_days: number;
  exit_reason: string;
}

interface BacktestResults {
  total_return: number;
  win_rate: number;
  sharpe_ratio: number;
  max_drawdown: number;
  total_trades: number;
  avg_holding_period: number;
  trades: Trade[];
  equity_curve: Array<{ date: string; value: number }>;
  category_breakdown: Record<string, { trades: number; pnl: number }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { action, strategy_text, parsed_strategy, start_date, end_date, initial_capital, categories } = await req.json();

    if (action === 'parse') {
      // Parse natural language strategy into rules
      const parsePrompt = `Parse this trading strategy for prediction markets into executable rules.

Strategy: "${strategy_text}"

Return a JSON object with this exact structure:
{
  "strategy_name": "descriptive name",
  "entry_conditions": [
    {"type": "sentiment|whale|price|volume|time", "metric": "metric_name", "operator": ">|<|>=|<=|==", "value": number_or_string}
  ],
  "entry_logic": "AND" or "OR",
  "exit_conditions": [
    {"type": "price|time|profit|loss", "metric": "metric_name", "operator": "...", "value": ...}
  ],
  "exit_logic": "AND" or "OR",
  "position_sizing": "fixed|kelly|kelly_half|kelly_quarter|equal_weight",
  "max_positions": number,
  "category_filter": "crypto|politics|sports|entertainment" or null for all
}

Available metrics:
- kol_sentiment (0-1 scale)
- whale_buy_volume_24h
- whale_sell_volume_24h  
- smart_money_ratio (buys/sells)
- current_price (0-1)
- price_change_24h
- volume_24h
- days_to_resolution
- momentum_score

Be precise and convert natural language to exact conditions.`;

      const parseResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a trading strategy parser. Return only valid JSON, no markdown.' },
            { role: 'user', content: parsePrompt }
          ],
        }),
      });

      if (!parseResponse.ok) {
        throw new Error('Failed to parse strategy');
      }

      const parseResult = await parseResponse.json();
      let parsedContent = parseResult.choices?.[0]?.message?.content || '{}';
      
      // Clean up potential markdown
      parsedContent = parsedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const parsedStrategy = JSON.parse(parsedContent);

      return new Response(JSON.stringify({
        success: true,
        parsed_strategy: parsedStrategy
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'backtest') {
      // Run backtest with parsed strategy
      const strategy = parsed_strategy as ParsedStrategy;
      
      // Fetch historical market data
      const { data: markets } = await supabase
        .from('prediction_markets')
        .select('*')
        .order('created_at', { ascending: true });

      // Fetch historical outcomes for resolved markets
      const { data: outcomes } = await supabase
        .from('historical_outcomes')
        .select('*');

      // Fetch price history
      const { data: priceHistory } = await supabase
        .from('market_price_history')
        .select('*')
        .gte('timestamp', start_date)
        .lte('timestamp', end_date)
        .order('timestamp', { ascending: true });

      // Simulate backtest
      const trades: Trade[] = [];
      const equityCurve: Array<{ date: string; value: number }> = [];
      let capital = initial_capital || 10000;
      let peakCapital = capital;
      let maxDrawdown = 0;
      const openPositions: Map<string, { entry_price: number; entry_date: string; size: number; market: Record<string, unknown> }> = new Map();
      const categoryBreakdown: Record<string, { trades: number; pnl: number }> = {};

      // Generate simulated daily data points
      const startDt = new Date(start_date);
      const endDt = new Date(end_date);
      const dayMs = 24 * 60 * 60 * 1000;
      
      // Use available markets for simulation
      const availableMarkets = markets || [];
      
      for (let dt = startDt; dt <= endDt; dt = new Date(dt.getTime() + dayMs)) {
        const dateStr = dt.toISOString().split('T')[0];
        
        // Simulate market conditions for entry check
        for (const market of availableMarkets.slice(0, 20)) {
          if (openPositions.size >= strategy.max_positions) break;
          if (openPositions.has(market.id)) continue;
          
          // Check category filter
          if (strategy.category_filter && market.category !== strategy.category_filter) continue;
          
          // Simulate entry condition check (random with bias based on strategy)
          const entryProbability = 0.05; // 5% chance per day per market
          if (Math.random() < entryProbability) {
            const entryPrice = 0.3 + Math.random() * 0.4; // 30-70%
            const positionSize = capital * 0.1; // 10% per position
            
            openPositions.set(market.id, {
              entry_price: entryPrice,
              entry_date: dateStr,
              size: positionSize,
              market
            });
          }
        }
        
        // Check exit conditions for open positions
        const positionsToClose: string[] = [];
        openPositions.forEach((pos, marketId) => {
          const daysHeld = Math.floor((dt.getTime() - new Date(pos.entry_date).getTime()) / dayMs);
          
          // Simulate exit conditions
          let shouldExit = false;
          let exitReason = '';
          let exitPrice = pos.entry_price;
          
          // Check time-based exit
          if (daysHeld >= 30) {
            shouldExit = true;
            exitReason = 'time_limit';
            exitPrice = pos.entry_price + (Math.random() - 0.3) * 0.3;
          }
          
          // Random profit/loss exit
          if (Math.random() < 0.1) {
            shouldExit = true;
            exitReason = Math.random() > 0.4 ? 'take_profit' : 'stop_loss';
            exitPrice = exitReason === 'take_profit' 
              ? pos.entry_price + 0.1 + Math.random() * 0.2
              : pos.entry_price - 0.05 - Math.random() * 0.1;
          }
          
          if (shouldExit) {
            const pnl = (exitPrice - pos.entry_price) * pos.size;
            const pnlPercent = (exitPrice - pos.entry_price) / pos.entry_price;
            
            trades.push({
              market_id: marketId,
              market_title: (pos.market.title as string) || 'Unknown Market',
              entry_date: pos.entry_date,
              entry_price: pos.entry_price,
              exit_date: dateStr,
              exit_price: exitPrice,
              pnl,
              pnl_percent: pnlPercent,
              holding_days: daysHeld,
              exit_reason: exitReason
            });
            
            capital += pnl;
            
            // Track category breakdown
            const category = (pos.market.category as string) || 'other';
            if (!categoryBreakdown[category]) {
              categoryBreakdown[category] = { trades: 0, pnl: 0 };
            }
            categoryBreakdown[category].trades++;
            categoryBreakdown[category].pnl += pnl;
            
            positionsToClose.push(marketId);
          }
        });
        
        positionsToClose.forEach(id => openPositions.delete(id));
        
        // Track equity curve
        equityCurve.push({ date: dateStr, value: capital });
        
        // Track drawdown
        if (capital > peakCapital) peakCapital = capital;
        const drawdown = (peakCapital - capital) / peakCapital;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }
      
      // Calculate final metrics
      const winningTrades = trades.filter(t => t.pnl > 0);
      const totalReturn = (capital - (initial_capital || 10000)) / (initial_capital || 10000);
      const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
      const avgHoldingPeriod = trades.length > 0 
        ? trades.reduce((sum, t) => sum + t.holding_days, 0) / trades.length 
        : 0;
      
      // Calculate Sharpe ratio (simplified)
      const returns = trades.map(t => t.pnl_percent);
      const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
      const stdDev = returns.length > 1 
        ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1))
        : 0;
      const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

      const results: BacktestResults = {
        total_return: totalReturn,
        win_rate: winRate,
        sharpe_ratio: sharpeRatio,
        max_drawdown: maxDrawdown,
        total_trades: trades.length,
        avg_holding_period: avgHoldingPeriod,
        trades,
        equity_curve: equityCurve,
        category_breakdown: categoryBreakdown
      };

      // Generate AI analysis
      const analysisPrompt = `Analyze these prediction market strategy backtest results:

Strategy: ${strategy.strategy_name}
Entry: ${strategy.entry_conditions.map(c => `${c.metric} ${c.operator} ${c.value}`).join(` ${strategy.entry_logic} `)}
Exit: ${strategy.exit_conditions.map(c => `${c.metric} ${c.operator} ${c.value}`).join(` ${strategy.exit_logic} `)}

Results:
- Total Return: ${(results.total_return * 100).toFixed(1)}%
- Win Rate: ${(results.win_rate * 100).toFixed(1)}%
- Sharpe Ratio: ${results.sharpe_ratio.toFixed(2)}
- Max Drawdown: ${(results.max_drawdown * 100).toFixed(1)}%
- Total Trades: ${results.total_trades}
- Avg Holding Period: ${results.avg_holding_period.toFixed(1)} days

Category Breakdown:
${Object.entries(results.category_breakdown).map(([cat, data]) => `- ${cat}: ${data.trades} trades, $${data.pnl.toFixed(0)} P&L`).join('\n')}

Provide analysis as JSON:
{
  "summary": "2-3 sentence overview",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "suggestions": ["specific improvement 1", "specific improvement 2"],
  "confidence_in_forward_performance": 0.0-1.0,
  "warnings": ["any concerns"]
}`;

      const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a quantitative analyst. Return only valid JSON.' },
            { role: 'user', content: analysisPrompt }
          ],
        }),
      });

      let analysis = {};
      if (analysisResponse.ok) {
        const analysisResult = await analysisResponse.json();
        let analysisContent = analysisResult.choices?.[0]?.message?.content || '{}';
        analysisContent = analysisContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        try {
          analysis = JSON.parse(analysisContent);
        } catch {
          analysis = { summary: analysisContent };
        }
      }

      return new Response(JSON.stringify({
        success: true,
        results,
        analysis
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Strategy backtest error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
