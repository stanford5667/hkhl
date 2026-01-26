 # Backtesting Library
 
 Production-ready backtesting system with comprehensive type safety, parameter validation, and technical indicators.
 
 ## Features
 
 ✅ **Complete TypeScript type system** (~550 lines of type definitions)  
 ✅ **Comprehensive parameter validation** (~720 lines of validation logic)  
 ✅ **Technical indicators library** (RSI, SMA, EMA, MACD, Bollinger Bands, ATR, etc.)  
 ✅ **Backtesting execution engine** (~950 lines)  
 ✅ **10 prebuilt strategies** with customizable parameters  
 ✅ **25+ performance metrics** (Sharpe, Sortino, Max Drawdown, etc.)
 
 ## Quick Start
 
 ### 1. Import Types and Validation
 
 ```typescript
 import {
   BacktestRequest,
   BacktestConfig,
   StrategyDefinition,
   validateBacktestRequest,
   formatValidationErrors,
   PREBUILT_STRATEGIES
 } from '@/lib/backtesting'
 ```
 
 ### 2. Create a Backtest Request
 
 ```typescript
 const request: BacktestRequest = {
   ticker: 'AAPL',
   
   strategy: {
     type: 'prebuilt',
     prebuilt: {
       id: 'rsi_oversold_bounce',
       name: 'RSI Oversold Bounce',
       description: 'Buy when RSI < 30, sell when RSI > 50',
       category: 'reversal',
       riskLevel: 'moderate',
       parameters: {
         rsiPeriod: 14,
         rsiOversold: 30,
         rsiOverbought: 50,
       },
       defaultParameters: PREBUILT_STRATEGIES.rsi_oversold_bounce.defaultParameters
     }
   },
   
   config: {
     startDate: '2023-01-01',
     endDate: '2024-01-01',
     startingCapital: 10000,
     
     positionSizing: {
       method: 'percent-portfolio',
       value: 10,
       maxPositions: 3,
       allowFractional: false
     },
     
     riskManagement: {
       stopLoss: { type: 'percent', value: 5 },
       takeProfit: { type: 'percent', value: 10 },
       trailingStop: { enabled: false, percent: 0 },
       maxLossPerTrade: 2
     },
     
     tradingRules: {
       commission: 0,
       slippage: 0.1,
       fillAssumptions: {
         marketOrders: 'next-bar-open',
         limitOrders: 'if-price-reached',
         stopOrders: 'when-triggered'
       },
       tradeDuringMarketHoursOnly: true,
       allowShortSelling: false
     },
     
     dataFrequency: 'daily'
   },
   
   organizationId: 'org_123',
   userId: 'user_456'
 }
 ```
 
 ### 3. Validate Before Running
 
 ```typescript
 const validation = validateBacktestRequest(request)
 
 if (!validation.valid) {
   const errors = formatValidationErrors(validation)
   console.error('Validation failed:', errors)
   return
 }
 
 if (validation.warnings.length > 0) {
   console.warn('Warnings:', validation.warnings)
 }
 ```
 
 ### 4. Run Backtest
 
 ```typescript
 const engine = new BacktestEngine(request)
 const result = await engine.run()
 
 console.log('Backtest Results:', {
   totalReturn: result.performance.totalReturnPercent,
   sharpeRatio: result.performance.sharpeRatio,
   maxDrawdown: result.performance.maxDrawdownPercent,
   totalTrades: result.performance.totalTrades,
   winRate: result.performance.winRate
 })
 ```
 
 ## Available Strategies
 
 The library includes 10 prebuilt strategies:
 
 1. **consecutive_days_reversal** - Mean reversion after consecutive down days
 2. **rsi_oversold_bounce** - Buy when RSI < 30, sell when RSI > 50
 3. **ma_crossover** - Golden/death cross strategy
 4. **gap_fill** - Trade gap-down openings
 5. **post_earnings_drift** - Capture post-earnings momentum
 6. **volatility_breakout** - Trade ATR breakouts
 7. **yield_optimizer** - Dividend capture strategy
 8. **macd_divergence** - MACD signal divergence
 9. **bollinger_reversal** - Mean reversion at Bollinger Bands
 10. **volume_spike** - Trade volume anomalies
 
 ## Position Sizing Methods
 
 - **fixed-dollar**: Fixed dollar amount per position ($1000, $5000, etc.)
 - **fixed-shares**: Fixed number of shares (100, 500, etc.)
 - **percent-portfolio**: Percentage of total portfolio (10%, 25%, etc.)
 - **risk-based**: Size based on risk per trade (1% risk, 2% risk, etc.)
 
 ## Risk Management
 
 ### Stop Loss Types
 - **percent**: Fixed percentage below entry (5%, 10%)
 - **fixed**: Fixed dollar amount ($100, $500)
 - **atr**: Based on Average True Range (2x ATR, 3x ATR)
 - **none**: No stop loss
 
 ### Take Profit Types
 - **percent**: Fixed percentage above entry (10%, 20%)
 - **fixed**: Fixed dollar amount ($200, $1000)
 - **ratio**: Risk/reward ratio (2:1, 3:1)
 - **none**: No take profit
 
 ### Trailing Stops
 - Enable with `enabled: true`
 - Set percentage with `percent` (e.g., 5 for 5% trailing stop)
 
 ## Technical Indicators
 
 Available indicators via `TechnicalIndicators` class:
 
 - **RSI** (Relative Strength Index)
 - **SMA** (Simple Moving Average)
 - **EMA** (Exponential Moving Average)
 - **MACD** (Moving Average Convergence Divergence)
 - **Bollinger Bands**
 - **ATR** (Average True Range)
 - **Stochastic Oscillator**
 - **ADX** (Average Directional Index)
 
 ## Validation Rules
 
 The validation system checks:
 
 - ✅ Valid ticker format (1-10 characters, alphanumeric)
 - ✅ Valid date ranges (start < end, not in future)
 - ✅ Capital within reasonable limits ($100 - $10M)
 - ✅ Position sizing parameters are valid for chosen method
 - ✅ Stop loss < take profit (prevents losing more than gaining)
 - ✅ Strategy parameters within valid ranges
 - ✅ 20+ cross-field validation rules
 
 ## Performance Metrics
 
 The backtester calculates 25+ metrics:
 
 - Total return, annualized return, CAGR
 - Win rate, avg win, avg loss
 - Sharpe ratio, Sortino ratio
 - Max drawdown, current drawdown
 - Profit factor, payoff ratio
 - Best/worst trades
 - Expected value
 - Recovery time
 - Trading frequency
 
 ## Integration with Existing Code
 
 ### In Edge Functions
 
 ```typescript
 import { validateBacktestRequest, BacktestRequest } from '@/lib/backtesting'
 
 serve(async (req) => {
   const body = await req.json()
   
   // Validate request before processing
   const validation = validateBacktestRequest(body as BacktestRequest)
   
   if (!validation.valid) {
     return new Response(JSON.stringify({
       success: false,
       errors: validation.errors
     }), { status: 400 })
   }
   
   // Your backtest logic here...
 })
 ```
 
 ### In UI Components
 
 ```typescript
 import type { BacktestResult, Trade } from '@/lib/backtesting'
 
 interface Props {
   result: BacktestResult
 }
 
 export function ResultsDisplay({ result }: Props) {
   return (
     <div>
       <h2>Results</h2>
       <p>Total Return: {result.performance.totalReturnPercent.toFixed(2)}%</p>
       <p>Sharpe Ratio: {result.performance.sharpeRatio.toFixed(2)}</p>
       {/* ... */}
     </div>
   )
 }
 ```
 
 ## Examples
 
 See `examples.ts` for 7 complete working examples:
 
 1. Prebuilt RSI strategy with custom parameters
 2. Moving average crossover
 3. Gap fill strategy
 4. Custom JavaScript strategy
 5. AI-generated strategy from prompt
 6. Multi-position portfolio strategy
 7. Options-based strategy
 
 ## Error Handling
 
 The validation system provides user-friendly error messages:
 
 ```typescript
 {
   field: 'config.riskManagement.stopLoss',
   message: 'Stop loss (15%) must be less than take profit (5%). You\'re risking more than you could gain.',
   code: 'STOP_LOSS_GREATER_THAN_TAKE_PROFIT'
 }
 ```
 
 ## Next Steps
 
 1. Review the types in `types.ts` to understand the full API
 2. Check `validation.ts` for all validation rules
 3. See `examples.ts` for complete working examples
 4. Integrate with your existing edge functions and UI
 
 ## Notes
 
 - The engine requires historical market data (OHLCV candles)
 - Data can be fetched from your database or external APIs
 - The `loadMarketData()` method needs to be implemented for your specific data source
 - All monetary values are in dollars (not cents)
 - All percentages are in percentage points (10 = 10%, not 0.10)