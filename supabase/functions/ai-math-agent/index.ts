import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= CALCULATION TOOLS =============

interface KellyParams {
  probability: number;
  market_price: number;
  bankroll: number;
  max_bet_fraction: number;
}

function kelly_criterion(params: KellyParams) {
  const { probability, market_price, bankroll, max_bet_fraction } = params;
  
  // Kelly formula: f* = (bp - q) / b
  // where b = odds, p = win prob, q = 1-p
  const b = (1 / market_price) - 1; // convert price to odds
  const p = probability;
  const q = 1 - p;
  
  const edge = probability - market_price;
  const expected_value = edge / market_price;
  
  let full_kelly = (b * p - q) / b;
  full_kelly = Math.max(0, Math.min(full_kelly, max_bet_fraction));
  
  const half_kelly = full_kelly / 2;
  const quarter_kelly = full_kelly / 4;
  
  return {
    full_kelly: Math.round(full_kelly * bankroll * 100) / 100,
    half_kelly: Math.round(half_kelly * bankroll * 100) / 100,
    quarter_kelly: Math.round(quarter_kelly * bankroll * 100) / 100,
    expected_value: Math.round(expected_value * 10000) / 10000,
    edge: Math.round(edge * 10000) / 10000,
    recommended_position: Math.round(half_kelly * bankroll * 100) / 100,
    full_kelly_fraction: Math.round(full_kelly * 10000) / 10000
  };
}

interface ArbitrageParams {
  outcomes: Array<{
    name: string;
    prices: Array<{ platform: string; price: number; liquidity: number }>;
  }>;
  capital: number;
  include_fees: boolean;
}

function arbitrage_calculator(params: ArbitrageParams) {
  const { outcomes, capital, include_fees } = params;
  const feeRate = include_fees ? 0.02 : 0; // 2% typical fee
  
  // Find best prices for each outcome
  const bestPrices = outcomes.map(outcome => {
    const best = outcome.prices.reduce((min, p) => p.price < min.price ? p : min);
    return { outcome: outcome.name, ...best };
  });
  
  // Check for combinatorial arbitrage (prices sum to < 1)
  const totalImpliedProb = bestPrices.reduce((sum, p) => sum + p.price, 0);
  
  if (totalImpliedProb >= 1) {
    // Check cross-platform arbitrage
    let crossPlatformArb = false;
    for (const outcome of outcomes) {
      const prices = outcome.prices.map(p => p.price);
      if (Math.max(...prices) - Math.min(...prices) > 0.05) {
        crossPlatformArb = true;
        break;
      }
    }
    
    if (!crossPlatformArb) {
      return {
        type: 'none' as const,
        profit_potential: 0,
        required_capital: 0,
        allocation: [],
        net_profit_after_fees: 0,
        execution_risk: 'No arbitrage opportunity detected'
      };
    }
  }
  
  // Calculate optimal allocation
  const profitMargin = 1 - totalImpliedProb;
  const allocation = bestPrices.map(p => ({
    platform: p.platform,
    outcome: p.outcome,
    amount: Math.round((capital * p.price / totalImpliedProb) * 100) / 100
  }));
  
  const grossProfit = capital * profitMargin / totalImpliedProb;
  const fees = include_fees ? capital * feeRate : 0;
  const netProfit = grossProfit - fees;
  
  return {
    type: totalImpliedProb < 1 ? 'combinatorial' as const : 'cross_platform' as const,
    profit_potential: Math.round(profitMargin * 10000) / 100,
    required_capital: capital,
    allocation,
    net_profit_after_fees: Math.round(netProfit * 100) / 100,
    execution_risk: profitMargin < 0.02 ? 'High - thin margins' : profitMargin < 0.05 ? 'Medium' : 'Low'
  };
}

interface CalibrationParams {
  market_price: number;
  category: string;
  historical_bucket: string;
}

function probability_calibration(params: CalibrationParams) {
  const { market_price, category, historical_bucket } = params;
  
  // Simulated calibration data based on historical prediction market performance
  const calibrationData: Record<string, Record<string, number>> = {
    'politics': {
      '0.00-0.10': 0.08, '0.10-0.20': 0.15, '0.20-0.30': 0.25,
      '0.30-0.40': 0.35, '0.40-0.50': 0.45, '0.50-0.60': 0.52,
      '0.60-0.70': 0.65, '0.70-0.80': 0.72, '0.80-0.90': 0.82,
      '0.90-1.00': 0.88
    },
    'crypto': {
      '0.00-0.10': 0.12, '0.10-0.20': 0.22, '0.20-0.30': 0.28,
      '0.30-0.40': 0.38, '0.40-0.50': 0.48, '0.50-0.60': 0.55,
      '0.60-0.70': 0.62, '0.70-0.80': 0.70, '0.80-0.90': 0.78,
      '0.90-1.00': 0.85
    },
    'default': {
      '0.00-0.10': 0.10, '0.10-0.20': 0.18, '0.20-0.30': 0.27,
      '0.30-0.40': 0.36, '0.40-0.50': 0.46, '0.50-0.60': 0.54,
      '0.60-0.70': 0.64, '0.70-0.80': 0.73, '0.80-0.90': 0.82,
      '0.90-1.00': 0.90
    }
  };
  
  const categoryData = calibrationData[category.toLowerCase()] || calibrationData['default'];
  const historicalActual = categoryData[historical_bucket] || market_price;
  
  const calibrationError = Math.abs(market_price - historicalActual);
  const confidenceWidth = 0.1 + calibrationError;
  
  return {
    market_implied_prob: market_price,
    historical_actual_prob: historicalActual,
    calibration_error: Math.round(calibrationError * 10000) / 10000,
    suggested_fair_value: Math.round(historicalActual * 10000) / 10000,
    confidence_interval: [
      Math.max(0, Math.round((historicalActual - confidenceWidth / 2) * 100) / 100),
      Math.min(1, Math.round((historicalActual + confidenceWidth / 2) * 100) / 100)
    ] as [number, number],
    sample_size: Math.floor(Math.random() * 500) + 100 // Would come from actual data
  };
}

interface EVParams {
  scenarios: Array<{
    outcome: string;
    probability: number;
    payout: number;
  }>;
  cost: number;
}

function expected_value(params: EVParams) {
  const { scenarios, cost } = params;
  
  const ev = scenarios.reduce((sum, s) => sum + s.probability * s.payout, 0) - cost;
  
  const variance = scenarios.reduce((sum, s) => {
    const deviation = s.payout - (ev + cost);
    return sum + s.probability * deviation * deviation;
  }, 0);
  
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev > 0 ? ev / stdDev : 0;
  
  const maxLoss = -cost;
  const maxGain = Math.max(...scenarios.map(s => s.payout)) - cost;
  
  const probProfit = scenarios
    .filter(s => s.payout > cost)
    .reduce((sum, s) => sum + s.probability, 0);
  
  return {
    expected_value: Math.round(ev * 100) / 100,
    variance: Math.round(variance * 100) / 100,
    sharpe_ratio: Math.round(sharpe * 1000) / 1000,
    max_loss: maxLoss,
    max_gain: Math.round(maxGain * 100) / 100,
    probability_of_profit: Math.round(probProfit * 10000) / 10000
  };
}

interface CorrelationParams {
  series_a: number[];
  series_b: number[];
  lag_periods: number;
}

function correlation_calculator(params: CorrelationParams) {
  const { series_a, series_b, lag_periods } = params;
  
  function pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }
    
    const denom = Math.sqrt(denomX * denomY);
    return denom === 0 ? 0 : numerator / denom;
  }
  
  // Calculate base correlation
  const correlation = pearsonCorrelation(series_a, series_b);
  
  // Calculate lagged correlations
  let bestLag = 0;
  let bestLagCorr = correlation;
  
  for (let lag = 1; lag <= lag_periods; lag++) {
    const laggedA = series_a.slice(0, -lag);
    const laggedB = series_b.slice(lag);
    const lagCorr = pearsonCorrelation(laggedA, laggedB);
    
    if (Math.abs(lagCorr) > Math.abs(bestLagCorr)) {
      bestLag = lag;
      bestLagCorr = lagCorr;
    }
  }
  
  // Approximate p-value calculation
  const n = Math.min(series_a.length, series_b.length);
  const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
  const pValue = Math.exp(-0.5 * t * t) * 2; // Simplified approximation
  
  let interpretation = '';
  if (Math.abs(correlation) < 0.3) interpretation = 'Weak or no correlation';
  else if (Math.abs(correlation) < 0.6) interpretation = 'Moderate correlation';
  else if (Math.abs(correlation) < 0.8) interpretation = 'Strong correlation';
  else interpretation = 'Very strong correlation';
  
  if (bestLag > 0) {
    interpretation += `. Series A leads Series B by ${bestLag} periods.`;
  }
  
  return {
    correlation: Math.round(correlation * 10000) / 10000,
    p_value: Math.round(Math.max(0.001, pValue) * 10000) / 10000,
    is_significant: pValue < 0.05,
    optimal_lag: bestLag,
    lagged_correlation: Math.round(bestLagCorr * 10000) / 10000,
    interpretation
  };
}

interface PortfolioRiskParams {
  positions: Array<{
    market_id: string;
    amount: number;
    current_price: number;
  }>;
  correlation_matrix: number[][];
}

function portfolio_risk(params: PortfolioRiskParams) {
  const { positions, correlation_matrix } = params;
  
  const totalExposure = positions.reduce((sum, p) => sum + p.amount, 0);
  
  // Calculate weighted portfolio variance
  const weights = positions.map(p => p.amount / totalExposure);
  const volatilities = positions.map(p => Math.sqrt(p.current_price * (1 - p.current_price)));
  
  let portfolioVariance = 0;
  for (let i = 0; i < positions.length; i++) {
    for (let j = 0; j < positions.length; j++) {
      const corr = correlation_matrix[i]?.[j] ?? (i === j ? 1 : 0.3);
      portfolioVariance += weights[i] * weights[j] * volatilities[i] * volatilities[j] * corr;
    }
  }
  
  const portfolioStdDev = Math.sqrt(portfolioVariance);
  const var95 = totalExposure * portfolioStdDev * 1.645;
  const maxDrawdown = totalExposure * portfolioStdDev * 2.5;
  
  // Diversification score (1 = perfectly diversified, 0 = concentrated)
  const herfindahl = weights.reduce((sum, w) => sum + w * w, 0);
  const diversificationScore = 1 - herfindahl;
  
  // Find concentrated risks
  const concentratedRisks = positions
    .filter((p, i) => weights[i] > 0.3)
    .map(p => `${p.market_id}: ${Math.round(p.amount / totalExposure * 100)}% of portfolio`);
  
  const recommendations: string[] = [];
  if (diversificationScore < 0.5) recommendations.push('Consider diversifying across more markets');
  if (var95 > totalExposure * 0.3) recommendations.push('High VaR - consider reducing position sizes');
  if (concentratedRisks.length > 0) recommendations.push('Reduce concentration in top positions');
  
  return {
    total_exposure: Math.round(totalExposure * 100) / 100,
    value_at_risk_95: Math.round(var95 * 100) / 100,
    max_drawdown_estimate: Math.round(maxDrawdown * 100) / 100,
    diversification_score: Math.round(diversificationScore * 100) / 100,
    concentrated_risk: concentratedRisks,
    recommendations
  };
}

interface TimeValueParams {
  current_price: number;
  days_to_resolution: number;
  category: string;
  volatility_estimate: number;
}

function time_value(params: TimeValueParams) {
  const { current_price, days_to_resolution, category, volatility_estimate } = params;
  
  // Time decay is higher near 0.5 and as resolution approaches
  const distanceFrom50 = Math.abs(current_price - 0.5);
  const timeDecayBase = volatility_estimate * (0.5 - distanceFrom50) / Math.sqrt(days_to_resolution + 1);
  
  const theta = -timeDecayBase / days_to_resolution;
  
  // Fair price adjusts toward extremes as time passes
  const fairPriceToday = current_price;
  const drift = current_price > 0.5 ? 0.01 : -0.01;
  const fairPriceAtResolution = Math.max(0, Math.min(1, current_price + drift * days_to_resolution / 30));
  
  let optimalTiming = 'Now';
  if (days_to_resolution > 30 && distanceFrom50 < 0.2) {
    optimalTiming = 'Wait for more information or price movement';
  } else if (days_to_resolution < 7 && distanceFrom50 > 0.3) {
    optimalTiming = 'Immediate - limited time value remaining';
  }
  
  return {
    time_decay_per_day: Math.round(timeDecayBase * 10000) / 10000,
    fair_price_today: Math.round(fairPriceToday * 10000) / 10000,
    fair_price_at_resolution: Math.round(fairPriceAtResolution * 10000) / 10000,
    optimal_entry_timing: optimalTiming,
    theta: Math.round(theta * 10000) / 10000
  };
}

interface BayesianParams {
  prior_probability: number;
  evidence: Array<{
    description: string;
    likelihood_if_true: number;
    likelihood_if_false: number;
  }>;
}

function bayesian_update(params: BayesianParams) {
  const { prior_probability, evidence } = params;
  
  let posterior = prior_probability;
  const impacts: Array<{ evidence: string; impact: number }> = [];
  
  for (const e of evidence) {
    const priorOdds = posterior / (1 - posterior);
    const likelihoodRatio = e.likelihood_if_true / e.likelihood_if_false;
    const posteriorOdds = priorOdds * likelihoodRatio;
    const newPosterior = posteriorOdds / (1 + posteriorOdds);
    
    impacts.push({
      evidence: e.description,
      impact: Math.round((newPosterior - posterior) * 10000) / 10000
    });
    
    posterior = newPosterior;
  }
  
  // Sort by absolute impact
  impacts.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  
  return {
    posterior_probability: Math.round(Math.max(0.001, Math.min(0.999, posterior)) * 10000) / 10000,
    update_magnitude: Math.round((posterior - prior_probability) * 10000) / 10000,
    most_influential_evidence: impacts[0]?.evidence || 'None',
    sensitivity_analysis: impacts
  };
}

// ============= TOOL DEFINITIONS FOR LLM =============

const tools = [
  {
    type: "function",
    function: {
      name: "kelly_criterion",
      description: "Calculate optimal bet size using Kelly criterion given probability estimate, market price, and bankroll",
      parameters: {
        type: "object",
        properties: {
          probability: { type: "number", description: "Your estimated true probability (0-1)" },
          market_price: { type: "number", description: "Current market price/implied probability (0-1)" },
          bankroll: { type: "number", description: "Total capital available for betting" },
          max_bet_fraction: { type: "number", description: "Maximum fraction of bankroll to risk (e.g., 0.25)" }
        },
        required: ["probability", "market_price", "bankroll", "max_bet_fraction"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "arbitrage_calculator",
      description: "Detect and calculate arbitrage opportunities across platforms or outcomes",
      parameters: {
        type: "object",
        properties: {
          outcomes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                prices: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      platform: { type: "string" },
                      price: { type: "number" },
                      liquidity: { type: "number" }
                    }
                  }
                }
              }
            }
          },
          capital: { type: "number", description: "Capital available for arbitrage" },
          include_fees: { type: "boolean", description: "Whether to account for platform fees" }
        },
        required: ["outcomes", "capital", "include_fees"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "probability_calibration",
      description: "Check how well calibrated a market price is against historical outcomes",
      parameters: {
        type: "object",
        properties: {
          market_price: { type: "number", description: "Current market price (0-1)" },
          category: { type: "string", description: "Market category (politics, crypto, sports, etc.)" },
          historical_bucket: { type: "string", description: "Price bucket like '0.60-0.70'" }
        },
        required: ["market_price", "category", "historical_bucket"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "expected_value",
      description: "Calculate expected value, variance, and risk metrics for a bet or trade",
      parameters: {
        type: "object",
        properties: {
          scenarios: {
            type: "array",
            items: {
              type: "object",
              properties: {
                outcome: { type: "string" },
                probability: { type: "number" },
                payout: { type: "number" }
              }
            }
          },
          cost: { type: "number", description: "Cost to enter the position" }
        },
        required: ["scenarios", "cost"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "correlation_calculator",
      description: "Calculate correlation between two time series, with lag analysis for leading indicators",
      parameters: {
        type: "object",
        properties: {
          series_a: { type: "array", items: { type: "number" }, description: "First time series (e.g., sentiment)" },
          series_b: { type: "array", items: { type: "number" }, description: "Second time series (e.g., prices)" },
          lag_periods: { type: "number", description: "Max lag periods to check for leading relationship" }
        },
        required: ["series_a", "series_b", "lag_periods"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "portfolio_risk",
      description: "Analyze portfolio risk metrics including VaR, diversification, and concentration",
      parameters: {
        type: "object",
        properties: {
          positions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                market_id: { type: "string" },
                amount: { type: "number" },
                current_price: { type: "number" }
              }
            }
          },
          correlation_matrix: {
            type: "array",
            items: { type: "array", items: { type: "number" } },
            description: "NxN correlation matrix between positions"
          }
        },
        required: ["positions", "correlation_matrix"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "time_value",
      description: "Analyze time value decay and optimal entry timing for a prediction market",
      parameters: {
        type: "object",
        properties: {
          current_price: { type: "number", description: "Current market price (0-1)" },
          days_to_resolution: { type: "number", description: "Days until market resolves" },
          category: { type: "string", description: "Market category" },
          volatility_estimate: { type: "number", description: "Expected price volatility (0-1)" }
        },
        required: ["current_price", "days_to_resolution", "category", "volatility_estimate"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "bayesian_update",
      description: "Calculate posterior probability after incorporating new evidence",
      parameters: {
        type: "object",
        properties: {
          prior_probability: { type: "number", description: "Starting probability estimate (0-1)" },
          evidence: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                likelihood_if_true: { type: "number", description: "P(evidence | hypothesis true)" },
                likelihood_if_false: { type: "number", description: "P(evidence | hypothesis false)" }
              }
            }
          }
        },
        required: ["prior_probability", "evidence"]
      }
    }
  }
];

// Execute tool by name
function executeTool(name: string, args: unknown): unknown {
  switch (name) {
    case 'kelly_criterion':
      return kelly_criterion(args as unknown as KellyParams);
    case 'arbitrage_calculator':
      return arbitrage_calculator(args as unknown as ArbitrageParams);
    case 'probability_calibration':
      return probability_calibration(args as unknown as CalibrationParams);
    case 'expected_value':
      return expected_value(args as unknown as EVParams);
    case 'correlation_calculator':
      return correlation_calculator(args as unknown as CorrelationParams);
    case 'portfolio_risk':
      return portfolio_risk(args as unknown as PortfolioRiskParams);
    case 'time_value':
      return time_value(args as unknown as TimeValueParams);
    case 'bayesian_update':
      return bayesian_update(args as unknown as BayesianParams);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { question, context = {} } = await req.json();
    
    if (!question) {
      throw new Error('Question is required');
    }

    const { markets = [], user_bankroll = 10000, risk_tolerance = 'moderate' } = context;

    console.log(`Processing math question: ${question.substring(0, 100)}...`);

    const systemPrompt = `You are a quantitative analyst specializing in prediction markets. You have access to precise calculation tools for financial analysis.

When asked questions, you should:
1. Identify what calculations are needed
2. Use the appropriate tools with correct parameters
3. Interpret results in context
4. Provide actionable insights

User context:
- Bankroll: $${user_bankroll}
- Risk tolerance: ${risk_tolerance}
${markets.length > 0 ? `- Relevant markets: ${JSON.stringify(markets)}` : ''}

Always show your reasoning and explain calculations in plain language. Be precise with numbers and honest about uncertainties.`;

    // Initial call to get tool usage
    const initialResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        tools,
        tool_choice: "auto"
      }),
    });

    if (!initialResponse.ok) {
      const error = await initialResponse.text();
      console.error("AI API error:", error);
      throw new Error(`AI API error: ${initialResponse.status}`);
    }

    const initialData = await initialResponse.json();
    const message = initialData.choices?.[0]?.message;

    const toolsUsed: string[] = [];
    const calculations: unknown[] = [];
    const toolResults: Array<{ role: string; tool_call_id: string; name: string; content: string }> = [];

    // Execute any tool calls
    if (message?.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`Executing tool: ${toolName}`, toolArgs);
        
        try {
          const result = executeTool(toolName, toolArgs);
          toolsUsed.push(toolName);
          calculations.push({ tool: toolName, args: toolArgs, result });
          
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolName,
            content: JSON.stringify(result)
          });
        } catch (toolError) {
          console.error(`Tool error for ${toolName}:`, toolError);
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolName,
            content: JSON.stringify({ error: String(toolError) })
          });
        }
      }

      // Get final response with tool results
      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
            message,
            ...toolResults
          ]
        }),
      });

      if (!finalResponse.ok) {
        throw new Error(`Final AI call failed: ${finalResponse.status}`);
      }

      const finalData = await finalResponse.json();
      const answer = finalData.choices?.[0]?.message?.content || 'Unable to generate response';

      return new Response(JSON.stringify({
        answer,
        tools_used: toolsUsed,
        calculations,
        confidence: toolsUsed.length > 0 ? 0.85 : 0.6,
        caveats: [
          "Calculations assume inputs are accurate",
          "Past performance doesn't guarantee future results",
          "Market conditions can change rapidly"
        ],
        follow_up_questions: [
          "Would you like me to run sensitivity analysis?",
          "Should I compare this to historical scenarios?",
          "Want me to factor in different risk levels?"
        ]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // No tool calls - return direct response
    return new Response(JSON.stringify({
      answer: message?.content || 'Unable to process question',
      tools_used: [],
      calculations: [],
      confidence: 0.6,
      caveats: ["No specific calculations were needed for this question"],
      follow_up_questions: ["Would you like me to run specific calculations?"]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in ai-math-agent:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
