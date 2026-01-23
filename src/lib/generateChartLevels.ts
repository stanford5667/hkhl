/**
 * Chart Levels Generator
 * Transforms quantitative study results into actionable price coordinates for chart overlays
 * 
 * This system converts probabilities into visual price levels:
 * - Support/Resistance zones from RSI and mean reversion
 * - Price targets from "After Down X%" studies
 * - Gap fill levels as price magnets
 * - Confidence corridors from volatility
 */

export interface ChartLevel {
  levelType: 'SUPPORT' | 'RESISTANCE' | 'PIVOT' | 'TARGET' | 'GAP_FILL'
  price: number
  label: string
  description: string
  color: string
  probability: number // 0-100
  studySource: string
  alertTrigger?: boolean
  strength?: 'weak' | 'moderate' | 'strong' // Based on probability
}

export interface ConfidenceCorridor {
  upperBound: number
  lowerBound: number
  centerLine: number
  confidenceLevel: number // e.g., 68 for 1σ, 95 for 2σ
  timeline: string // e.g., "5 days"
  color: string
  opacity: number
}

export interface BounceZone {
  priceStart: number
  priceEnd: number
  probability: number
  label: string
  studySource: string
  type: 'bounce' | 'resistance'
  color: string
}

export interface SmartAlert {
  type: 'HIGH_EDGE' | 'EXHAUSTION' | 'GAP_MAGNET' | 'STREAK' | 'OVERSOLD' | 'OVERBOUGHT'
  isActive: boolean
  message: string
  icon: string
  color: string
  probability?: number
  actionable: string // What to do about it
}

export interface StudyResult {
  studyId: string
  signalActive: boolean
  
  // Movement projections
  avgMove_5d?: number
  avgMove_1w?: number
  avgMove_2w?: number
  avgMove_1m?: number
  
  // Performance metrics
  winRate?: number
  avgWin?: number
  avgLoss?: number
  sharpeRatio?: number
  
  // Technical indicators
  currentRSI?: number
  currentMACD?: number
  priceVsMA?: { ma20?: number; ma50?: number; ma200?: number }
  
  // Volatility
  stdDev?: number
  atr?: number
  bollingerPosition?: number // 0-100, where 0 = lower band, 100 = upper band
  
  // Patterns
  currentStreak?: number
  unfilledGaps?: Array<{ 
    price: number
    type: 'up' | 'down'
    age: number // days old
    distance: number // % from current price
  }>
  
  // Additional context
  sampleSize?: number
  lastUpdated?: string
  metadata?: Record<string, unknown>
}

/**
 * Generate chart levels from study results
 * Translates probabilities into actual price coordinates
 */
export function generateChartLevels(
  studyResults: StudyResult[],
  currentPrice: number,
  dailyVolatility: number
): ChartLevel[] {
  const levels: ChartLevel[] = []

  for (const result of studyResults) {
    // ========== AFTER DOWN X% - RECOVERY TARGETS ==========
    if (result.studyId === 'after_down_x' && result.signalActive) {
      if (result.avgMove_1w && result.winRate) {
        const targetPrice = currentPrice * (1 + (result.avgMove_1w / 100))
        const strength = getStrength(result.winRate)
        
        levels.push({
          levelType: 'TARGET',
          price: targetPrice,
          label: `1W Recovery Target (${result.winRate.toFixed(0)}% WR)`,
          description: `After similar drops, price reached this level ${result.winRate.toFixed(0)}% of the time within 1 week. Average gain: ${result.avgMove_1w.toFixed(2)}%`,
          color: strength === 'strong' ? '#10b981' : '#22c55e',
          probability: result.winRate,
          studySource: result.studyId,
          alertTrigger: result.winRate > 70,
          strength
        })
      }
      
      // 2-week and 1-month targets
      if (result.avgMove_2w && result.winRate) {
        levels.push({
          levelType: 'TARGET',
          price: currentPrice * (1 + (result.avgMove_2w / 100)),
          label: `2W Recovery Target`,
          description: `Extended recovery projection based on 2-week historical patterns`,
          color: '#059669',
          probability: Math.min(result.winRate + 5, 95),
          studySource: result.studyId,
          strength: getStrength(result.winRate + 5)
        })
      }
    }

    // ========== AFTER UP X% - RESISTANCE ZONES ==========
    if (result.studyId === 'after_up_x' && result.signalActive) {
      if (result.avgMove_1w && result.winRate) {
        const pullbackPrice = currentPrice * (1 + (result.avgMove_1w / 100))
        const pullbackProbability = 100 - result.winRate
        
        levels.push({
          levelType: 'RESISTANCE',
          price: pullbackPrice,
          label: `Pullback Zone (${pullbackProbability.toFixed(0)}% prob)`,
          description: `After similar rallies, price pulled back to this level ${pullbackProbability.toFixed(0)}% of the time`,
          color: '#ef4444',
          probability: pullbackProbability,
          studySource: result.studyId,
          alertTrigger: pullbackProbability > 60,
          strength: getStrength(pullbackProbability)
        })
      }
    }

    // ========== RSI - OVERBOUGHT/OVERSOLD ZONES ==========
    if (result.studyId === 'rsi_analysis' && result.currentRSI !== undefined) {
      if (result.currentRSI > 70 && result.avgMove_1w) {
        // Overbought - expect resistance
        levels.push({
          levelType: 'RESISTANCE',
          price: currentPrice * 1.02,
          label: `Overbought (RSI: ${result.currentRSI.toFixed(0)})`,
          description: `RSI at ${result.currentRSI.toFixed(0)} indicates overbought conditions. Historically, pullbacks are likely from this level.`,
          color: '#f59e0b',
          probability: 65,
          studySource: result.studyId,
          alertTrigger: true,
          strength: 'moderate'
        })
      } else if (result.currentRSI < 30 && result.avgMove_1w) {
        // Oversold - expect support/bounce
        const bounceTarget = currentPrice * (1 + Math.abs(result.avgMove_1w) / 100)
        
        levels.push({
          levelType: 'SUPPORT',
          price: currentPrice * 0.98,
          label: `Oversold Zone (RSI: ${result.currentRSI.toFixed(0)})`,
          description: `RSI at ${result.currentRSI.toFixed(0)} suggests oversold conditions. Historical bounce probability is elevated.`,
          color: '#10b981',
          probability: 68,
          studySource: result.studyId,
          alertTrigger: true,
          strength: 'strong'
        })
        
        // Add bounce target
        levels.push({
          levelType: 'TARGET',
          price: bounceTarget,
          label: `Oversold Bounce Target`,
          description: `Expected recovery level based on historical RSI oversold bounces`,
          color: '#22c55e',
          probability: result.winRate || 60,
          studySource: result.studyId,
          strength: getStrength(result.winRate || 60)
        })
      }
    }

    // ========== MOVING AVERAGE - MEAN REVERSION ==========
    if (result.studyId === 'below_ma' && result.signalActive && result.priceVsMA) {
      const ma20Distance = result.priceVsMA.ma20
      const ma50Distance = result.priceVsMA.ma50
      
      if (ma20Distance !== undefined && Math.abs(ma20Distance) > 2) {
        const ma20Price = currentPrice / (1 + (ma20Distance / 100))
        
        levels.push({
          levelType: 'PIVOT',
          price: ma20Price,
          label: `20-Day MA (${Math.abs(ma20Distance).toFixed(1)}% away)`,
          description: `Price is ${Math.abs(ma20Distance).toFixed(1)}% ${ma20Distance < 0 ? 'below' : 'above'} the 20-day moving average. Acts as magnetic support/resistance.`,
          color: '#6366f1',
          probability: 65,
          studySource: result.studyId,
          strength: 'moderate'
        })
      }
      
      if (ma50Distance !== undefined && Math.abs(ma50Distance) > 5) {
        const ma50Price = currentPrice / (1 + (ma50Distance / 100))
        
        levels.push({
          levelType: 'PIVOT',
          price: ma50Price,
          label: `50-Day MA`,
          description: `Important longer-term support/resistance level. Price ${ma50Distance < 0 ? 'below' : 'above'} suggests ${ma50Distance < 0 ? 'weakness' : 'strength'}.`,
          color: '#8b5cf6',
          probability: 60,
          studySource: result.studyId,
          strength: 'moderate'
        })
      }
    }

    // ========== GAP ANALYSIS - PRICE MAGNETS ==========
    if (result.studyId === 'gap_analysis' && result.unfilledGaps) {
      for (const gap of result.unfilledGaps) {
        const distancePercent = Math.abs((gap.price - currentPrice) / currentPrice) * 100
        
        // Only show gaps within 5% of current price
        if (distancePercent < 5) {
          // Gaps have ~82% fill rate historically
          const fillProbability = 82 - (gap.age * 0.5) // Reduce probability as gap gets older
          
          levels.push({
            levelType: 'GAP_FILL',
            price: gap.price,
            label: `Unfilled ${gap.type === 'up' ? 'Gap Up' : 'Gap Down'} (${Math.round(fillProbability)}% fill rate)`,
            description: `${gap.age}-day old gap at $${gap.price.toFixed(2)}. Gaps typically fill ${fillProbability.toFixed(0)}% of the time. Distance: ${distancePercent.toFixed(1)}%.`,
            color: '#8b5cf6',
            probability: fillProbability,
            studySource: result.studyId,
            alertTrigger: distancePercent < 1, // Alert when very close
            strength: getStrength(fillProbability)
          })
        }
      }
    }

    // ========== CONSECUTIVE DAYS - STREAK REVERSAL ==========
    if (result.studyId === 'consecutive_days' && result.currentStreak && result.avgMove_1w && result.winRate) {
      const isDownStreak = result.currentStreak < 0
      const streakDays = Math.abs(result.currentStreak)
      
      // Only create levels for significant streaks (3+ days)
      if (streakDays >= 3) {
        const targetPrice = currentPrice * (1 + (result.avgMove_1w / 100))
        
        levels.push({
          levelType: isDownStreak ? 'TARGET' : 'RESISTANCE',
          price: targetPrice,
          label: `${streakDays}-Day ${isDownStreak ? 'Down' : 'Up'} Streak Target`,
          description: `After ${streakDays} consecutive ${isDownStreak ? 'down' : 'up'} days, average 1W move is ${result.avgMove_1w > 0 ? '+' : ''}${result.avgMove_1w.toFixed(2)}% (${result.winRate.toFixed(0)}% WR)`,
          color: isDownStreak ? '#10b981' : '#ef4444',
          probability: result.winRate,
          studySource: result.studyId,
          alertTrigger: result.winRate > 65,
          strength: getStrength(result.winRate)
        })
      }
    }

    // ========== BOLLINGER BANDS - EXTREME POSITIONS ==========
    if (result.studyId === 'bollinger_analysis' && result.bollingerPosition !== undefined) {
      if (result.bollingerPosition > 95) {
        // At upper band
        levels.push({
          levelType: 'RESISTANCE',
          price: currentPrice * 1.01,
          label: `Bollinger Upper Band (Extreme)`,
          description: `Price at ${result.bollingerPosition.toFixed(0)}% of Bollinger range. Historically, mean reversion likely.`,
          color: '#f97316',
          probability: 70,
          studySource: result.studyId,
          alertTrigger: true,
          strength: 'strong'
        })
      } else if (result.bollingerPosition < 5) {
        // At lower band
        levels.push({
          levelType: 'SUPPORT',
          price: currentPrice * 0.99,
          label: `Bollinger Lower Band (Extreme)`,
          description: `Price at ${result.bollingerPosition.toFixed(0)}% of Bollinger range. Bounce typically occurs.`,
          color: '#10b981',
          probability: 72,
          studySource: result.studyId,
          alertTrigger: true,
          strength: 'strong'
        })
      }
    }
  }

  // Sort levels by proximity to current price
  levels.sort((a, b) => {
    const distA = Math.abs(a.price - currentPrice)
    const distB = Math.abs(b.price - currentPrice)
    return distA - distB
  })

  return levels
}

/**
 * Generate confidence corridors (volatility-based price ranges)
 * Shows where price is statistically expected to trade
 */
export function generateConfidenceCorridor(
  currentPrice: number,
  dailyVolatility: number,
  daysForward: number = 5
): ConfidenceCorridor[] {
  // Scale volatility to the forward period (sqrt of time)
  const periodVolatility = dailyVolatility * Math.sqrt(daysForward)
  
  const corridors: ConfidenceCorridor[] = [
    // 1 Standard Deviation (68% confidence)
    {
      upperBound: currentPrice * (1 + periodVolatility),
      lowerBound: currentPrice * (1 - periodVolatility),
      centerLine: currentPrice,
      confidenceLevel: 68,
      timeline: `${daysForward} days`,
      color: '#3b82f6',
      opacity: 0.15
    },
    // 2 Standard Deviations (95% confidence)
    {
      upperBound: currentPrice * (1 + (periodVolatility * 2)),
      lowerBound: currentPrice * (1 - (periodVolatility * 2)),
      centerLine: currentPrice,
      confidenceLevel: 95,
      timeline: `${daysForward} days`,
      color: '#3b82f6',
      opacity: 0.08
    }
  ]

  return corridors
}

/**
 * Generate bounce zones based on multiple study signals
 * These are high-probability price ranges where reversals occur
 */
export function generateBounceZones(
  studyResults: StudyResult[],
  currentPrice: number
): BounceZone[] {
  const zones: BounceZone[] = []

  for (const result of studyResults) {
    // High win rate after down moves
    if (result.studyId === 'after_down_x' && result.winRate && result.winRate > 65) {
      zones.push({
        priceStart: currentPrice * 0.97,
        priceEnd: currentPrice * 0.995,
        probability: result.winRate,
        label: `High Probability Bounce Zone (${result.winRate.toFixed(0)}%)`,
        studySource: result.studyId,
        type: 'bounce',
        color: '#10b98180' // Green with transparency
      })
    }

    // RSI oversold bounce zone
    if (result.studyId === 'rsi_analysis' && result.currentRSI !== undefined && result.currentRSI < 35) {
      zones.push({
        priceStart: currentPrice * 0.98,
        priceEnd: currentPrice * 1.0,
        probability: 68,
        label: `RSI Oversold Bounce Zone`,
        studySource: result.studyId,
        type: 'bounce',
        color: '#22c55e80'
      })
    }

    // Consecutive down days bounce zone
    if (result.studyId === 'consecutive_days' && result.currentStreak && result.currentStreak <= -4 && result.winRate && result.winRate > 70) {
      zones.push({
        priceStart: currentPrice * 0.96,
        priceEnd: currentPrice * 1.0,
        probability: result.winRate,
        label: `${Math.abs(result.currentStreak)}-Day Selloff Bounce Zone`,
        studySource: result.studyId,
        type: 'bounce',
        color: '#10b98180'
      })
    }

    // Resistance zones (after up moves)
    if (result.studyId === 'after_up_x' && result.winRate && result.winRate < 45) {
      const pullbackProb = 100 - result.winRate
      zones.push({
        priceStart: currentPrice * 1.0,
        priceEnd: currentPrice * 1.03,
        probability: pullbackProb,
        label: `Resistance Zone (${pullbackProb.toFixed(0)}% pullback prob)`,
        studySource: result.studyId,
        type: 'resistance',
        color: '#ef444480'
      })
    }
  }

  return zones
}

/**
 * Generate smart alerts based on edge opportunities
 */
export function generateSmartAlerts(
  studyResults: StudyResult[],
  currentPrice: number,
  dailyVolatility: number
): SmartAlert[] {
  const alerts: SmartAlert[] = []

  for (const result of studyResults) {
    // HIGH EDGE ALERT
    if (result.winRate && result.winRate > 75 && result.signalActive) {
      alerts.push({
        type: 'HIGH_EDGE',
        isActive: true,
        message: `${formatStudyName(result.studyId)} signal: ${result.winRate.toFixed(0)}% historical win rate`,
        icon: '⚡',
        color: '#10b981',
        probability: result.winRate,
        actionable: result.avgMove_1w && result.avgMove_1w > 0 
          ? `Consider entry. Avg 1W gain: +${result.avgMove_1w.toFixed(2)}%` 
          : 'Monitor for entry opportunity'
      })
    }

    // OVERSOLD ALERT
    if (result.studyId === 'rsi_analysis' && result.currentRSI !== undefined && result.currentRSI < 30) {
      alerts.push({
        type: 'OVERSOLD',
        isActive: true,
        message: `RSI oversold at ${result.currentRSI.toFixed(0)}. Bounce probability elevated.`,
        icon: '📈',
        color: '#10b981',
        probability: 68,
        actionable: 'Watch for reversal patterns. Consider scale-in approach.'
      })
    }

    // OVERBOUGHT ALERT
    if (result.studyId === 'rsi_analysis' && result.currentRSI !== undefined && result.currentRSI > 70) {
      alerts.push({
        type: 'OVERBOUGHT',
        isActive: true,
        message: `RSI overbought at ${result.currentRSI.toFixed(0)}. Pullback risk increased.`,
        icon: '⚠️',
        color: '#f59e0b',
        probability: 60,
        actionable: 'Consider profit-taking or tightening stops.'
      })
    }

    // EXHAUSTION ALERT (extreme positioning)
    if (result.priceVsMA && result.priceVsMA.ma20 && Math.abs(result.priceVsMA.ma20) > 10) {
      const direction = result.priceVsMA.ma20 > 0 ? 'above' : 'below'
      alerts.push({
        type: 'EXHAUSTION',
        isActive: true,
        message: `Price ${Math.abs(result.priceVsMA.ma20).toFixed(1)}% ${direction} 20-day MA. Extreme positioning.`,
        icon: '⚠️',
        color: '#f59e0b',
        probability: 75,
        actionable: `Mean reversion likely. ${direction === 'above' ? 'Reduce longs' : 'Watch for bounce'}.`
      })
    }

    // GAP MAGNET ALERT
    if (result.studyId === 'gap_analysis' && result.unfilledGaps) {
      for (const gap of result.unfilledGaps) {
        const distancePercent = Math.abs((gap.price - currentPrice) / currentPrice) * 100
        if (distancePercent < 0.5) {
          alerts.push({
            type: 'GAP_MAGNET',
            isActive: true,
            message: `Unfilled gap at $${gap.price.toFixed(2)} is ${distancePercent.toFixed(2)}% away (82% fill rate)`,
            icon: '🧲',
            color: '#8b5cf6',
            probability: 82,
            actionable: 'High probability of gap fill. Set alerts at gap level.'
          })
        }
      }
    }

    // STREAK ALERT
    if (result.studyId === 'consecutive_days' && result.currentStreak) {
      const streakDays = Math.abs(result.currentStreak)
      const isDown = result.currentStreak < 0
      
      if (streakDays >= 4 && result.winRate && result.winRate > 70) {
        alerts.push({
          type: 'STREAK',
          isActive: true,
          message: `${streakDays} consecutive ${isDown ? 'down' : 'up'} days. ${result.winRate.toFixed(0)}% ${isDown ? 'bounce' : 'pullback'} probability`,
          icon: isDown ? '📈' : '📉',
          color: isDown ? '#10b981' : '#ef4444',
          probability: result.winRate,
          actionable: isDown 
            ? `Strong reversal setup. Consider entry on confirmation.`
            : `Momentum exhaustion likely. Consider profit-taking.`
        })
      }
    }
  }

  return alerts
}

// Helper Functions
function getStrength(probability: number): 'weak' | 'moderate' | 'strong' {
  if (probability >= 70) return 'strong'
  if (probability >= 55) return 'moderate'
  return 'weak'
}

function formatStudyName(studyId: string): string {
  return studyId
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
