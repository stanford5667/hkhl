/**
 * Visual Strategy Builder - Serializer
 * 
 * Converts visual canvas blocks to parameters matching
 * the existing StrategyBacktester and strategy-backtest edge function.
 */

import type { CanvasBlock, VisualStrategyOutput, StrategyType } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGY DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export function detectStrategyType(blocks: CanvasBlock[]): StrategyType {
  const hasRSI = blocks.some(b => b.subtype === 'RSI');
  const maBlocks = blocks.filter(b => b.subtype === 'EMA' || b.subtype === 'SMA');
  const hasMACrossover = maBlocks.length >= 2;
  const hasGap = blocks.some(b => b.subtype === 'GAP_DOWN');
  const hasConsecutive = blocks.some(b => b.subtype === 'CONSECUTIVE_DOWN');

  // Priority order matches existing edge function strategies
  if (hasRSI) return 'rsi';
  if (hasMACrossover) return 'ma-crossover';
  if (hasGap) return 'gap-fill';
  if (hasConsecutive) return 'consecutive-days';
  
  return 'visual-custom';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARAMETER EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

function extractRSIParams(blocks: CanvasBlock[]): Record<string, number> {
  const rsiBlock = blocks.find(b => b.subtype === 'RSI');
  const conditionBlocks = blocks.filter(b => b.type === 'condition');
  
  const params: Record<string, number> = {
    rsiPeriod: Number(rsiBlock?.parameters.period) || 14,
  };

  // Find oversold condition (RSI < value)
  const oversoldCondition = conditionBlocks.find(b => 
    b.subtype === 'LESS_THAN' && 
    b.connections.inputs.some(id => blocks.find(bl => bl.id === id)?.subtype === 'RSI')
  );
  if (oversoldCondition) {
    params.rsiOversold = Number(oversoldCondition.parameters.value) || 30;
  }

  // Find overbought condition (RSI > value)
  const overboughtCondition = conditionBlocks.find(b => 
    b.subtype === 'GREATER_THAN' && 
    b.connections.inputs.some(id => blocks.find(bl => bl.id === id)?.subtype === 'RSI')
  );
  if (overboughtCondition) {
    params.rsiOverbought = Number(overboughtCondition.parameters.value) || 70;
  } else {
    params.rsiOverbought = 70; // Default
  }

  return params;
}

function extractMAParams(blocks: CanvasBlock[]): Record<string, number> {
  const maBlocks = blocks.filter(b => b.subtype === 'SMA' || b.subtype === 'EMA');
  
  if (maBlocks.length < 2) {
    return { fastMaPeriod: 10, slowMaPeriod: 50 };
  }

  const periods = maBlocks.map(b => Number(b.parameters.period) || 20).sort((a, b) => a - b);
  
  return {
    fastMaPeriod: periods[0],
    slowMaPeriod: periods[periods.length - 1],
  };
}

function extractGapParams(blocks: CanvasBlock[]): Record<string, number> {
  const gapBlock = blocks.find(b => b.subtype === 'GAP_DOWN');
  return {
    gapThreshold: Number(gapBlock?.parameters.threshold) || 2,
  };
}

function extractConsecutiveParams(blocks: CanvasBlock[]): Record<string, number> {
  const consecBlock = blocks.find(b => b.subtype === 'CONSECUTIVE_DOWN');
  const timeExit = blocks.find(b => b.subtype === 'TIME_EXIT');
  
  return {
    consecutiveDays: Number(consecBlock?.parameters.days) || 3,
    holdingPeriod: Number(timeExit?.parameters.days) || 5,
  };
}

function extractExitParams(blocks: CanvasBlock[]): Record<string, number | undefined> {
  const takeProfitBlock = blocks.find(b => b.subtype === 'TAKE_PROFIT');
  const stopLossBlock = blocks.find(b => b.subtype === 'STOP_LOSS');

  return {
    takeProfitPercent: takeProfitBlock ? Number(takeProfitBlock.parameters.percent) : undefined,
    stopLossPercent: stopLossBlock ? Number(stopLossBlock.parameters.percent) : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

function generateEntrySummary(blocks: CanvasBlock[], strategyType: StrategyType): string {
  switch (strategyType) {
    case 'rsi': {
      const rsiBlock = blocks.find(b => b.subtype === 'RSI');
      const oversoldBlock = blocks.find(b => b.subtype === 'LESS_THAN');
      const period = rsiBlock?.parameters.period || 14;
      const threshold = oversoldBlock?.parameters.value || 30;
      return `RSI(${period}) < ${threshold}`;
    }
    case 'ma-crossover': {
      const maBlocks = blocks.filter(b => b.subtype === 'SMA' || b.subtype === 'EMA');
      const periods = maBlocks.map(b => Number(b.parameters.period) || 20).sort((a, b) => a - b);
      return `MA(${periods[0]}) crosses above MA(${periods[periods.length - 1]})`;
    }
    case 'gap-fill': {
      const gapBlock = blocks.find(b => b.subtype === 'GAP_DOWN');
      const threshold = gapBlock?.parameters.threshold || 2;
      return `Gap down > ${threshold}%`;
    }
    case 'consecutive-days': {
      const consecBlock = blocks.find(b => b.subtype === 'CONSECUTIVE_DOWN');
      const days = consecBlock?.parameters.days || 3;
      return `${days} consecutive down days`;
    }
    default:
      return 'Custom conditions';
  }
}

function generateExitSummary(blocks: CanvasBlock[]): string {
  const exitParts: string[] = [];
  
  const takeProfitBlock = blocks.find(b => b.subtype === 'TAKE_PROFIT');
  if (takeProfitBlock) {
    exitParts.push(`+${takeProfitBlock.parameters.percent}% profit`);
  }
  
  const stopLossBlock = blocks.find(b => b.subtype === 'STOP_LOSS');
  if (stopLossBlock) {
    exitParts.push(`-${stopLossBlock.parameters.percent}% loss`);
  }
  
  const timeExitBlock = blocks.find(b => b.subtype === 'TIME_EXIT');
  if (timeExitBlock) {
    exitParts.push(`${timeExitBlock.parameters.days} day hold`);
  }

  if (exitParts.length === 0) {
    return 'Strategy-specific exit';
  }

  return exitParts.join(' OR ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SERIALIZER
// ═══════════════════════════════════════════════════════════════════════════════

export function serializeStrategy(blocks: CanvasBlock[], ticker: string): VisualStrategyOutput {
  const strategyType = detectStrategyType(blocks);
  
  let strategyParams: Record<string, number> = {};
  
  switch (strategyType) {
    case 'rsi':
      strategyParams = extractRSIParams(blocks);
      break;
    case 'ma-crossover':
      strategyParams = extractMAParams(blocks);
      break;
    case 'gap-fill':
      strategyParams = extractGapParams(blocks);
      break;
    case 'consecutive-days':
      strategyParams = extractConsecutiveParams(blocks);
      break;
  }

  const exitParams = extractExitParams(blocks);

  return {
    strategy: strategyType,
    ticker,
    params: {
      ...strategyParams,
      ...exitParams,
    },
    summary: {
      entryCondition: generateEntrySummary(blocks, strategyType),
      exitCondition: generateExitSummary(blocks),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// URL PARAMETER ENCODING
// ═══════════════════════════════════════════════════════════════════════════════

export function encodeStrategyToURL(output: VisualStrategyOutput): string {
  const params = new URLSearchParams({
    source: 'builder',
    strategy: output.strategy,
    ticker: output.ticker,
    params: JSON.stringify(output.params),
  });
  return params.toString();
}

export function decodeStrategyFromURL(searchParams: URLSearchParams): VisualStrategyOutput | null {
  if (searchParams.get('source') !== 'builder') return null;
  
  try {
    const strategy = searchParams.get('strategy') as StrategyType;
    const ticker = searchParams.get('ticker') || '';
    const params = JSON.parse(searchParams.get('params') || '{}');
    
    return {
      strategy,
      ticker,
      params,
      summary: {
        entryCondition: 'Loaded from builder',
        exitCondition: 'Loaded from builder',
      },
    };
  } catch {
    return null;
  }
}
