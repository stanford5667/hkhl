 /**
  * Backtesting Library
  * Production-ready backtesting system with comprehensive type safety and validation
  */
 
 // Export all types
 export type {
   // Strategy types
   StrategyType,
   PrebuiltStrategyId,
   OrderType,
   PositionType,
   OrderAction,
   
   // Configuration types
   PositionSizingConfig,
   StopLossConfig,
   TakeProfitConfig,
   TrailingStopConfig,
   RiskManagementConfig,
   TradingRulesConfig,
   BacktestConfig,
   
   // Strategy definition
   StrategyParameters,
   PrebuiltStrategy,
   CustomStrategy,
   AIGeneratedStrategy,
   StrategyDefinition,
   
   // Request/Response
   BacktestRequest,
   BacktestResponse,
   
   // Market data
   Candle,
   
   // Position & Portfolio
   Position,
   Portfolio,
   Order,
   
   // Trade results
   Trade,
   
   // Performance
   PerformanceMetrics,
   EquityCurvePoint,
   Distribution,
   DistributionBucket,
   
   // Validation
   ValidationResult,
   ValidationError,
   
   // Strategy context
   StrategyContext,
 } from './types'
 
 // Export constants
 export { PREBUILT_STRATEGIES } from './types'
 
 // Export validation functions
 export {
   validateBacktestRequest,
   formatValidationErrors,
 } from './validation'
 
 // Export technical indicators
 export { TechnicalIndicators } from './indicators'
 
 // Export backtesting engine
 export { BacktestEngine } from './engine'