/**
 * Enhanced Price Chart with Probability Overlays
 * Integrates chart levels, confidence corridors, and bounce zones
 */

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Layers, Bell, HelpCircle, Zap, TrendingUp } from 'lucide-react'
import {
  generateChartLevels,
  generateConfidenceCorridor,
  generateBounceZones,
  generateSmartAlerts,
  type ChartLevel,
  type StudyResult
} from '@/lib/generateChartLevels'

interface EnhancedPriceChartProps {
  ticker: string
  studyResults: StudyResult[]
  currentPrice: number
  dailyVolatility: number
  historicalData: CandleData[]
  onLevelClick?: (level: ChartLevel) => void
}

interface CandleData {
  date: string
  index: number
  open: number
  close: number
  high: number
  low: number
  volume: number
  isGreen: boolean
}

const TIMEFRAMES = ['1D', '1W', '1M', '3M', '6M', '1Y']

function InfoTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="ml-1 inline-flex items-center justify-center">
            <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] text-xs">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function EnhancedPriceChart({
  ticker,
  studyResults,
  currentPrice,
  dailyVolatility,
  historicalData,
  onLevelClick
}: EnhancedPriceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('3M')
  const [showLevels, setShowLevels] = useState(true)
  const [showCorridor, setShowCorridor] = useState(true)
  const [showBounceZones, setShowBounceZones] = useState(true)
  const [showAlerts, setShowAlerts] = useState(true)
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null)
  const [hoveredLevel, setHoveredLevel] = useState<ChartLevel | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 320 })

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect()
        setDimensions({ width: width - 60, height: 320 })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Generate chart overlays
  const chartLevels = useMemo(
    () => generateChartLevels(studyResults, currentPrice, dailyVolatility),
    [studyResults, currentPrice, dailyVolatility]
  )

  const confidenceCorridors = useMemo(
    () => generateConfidenceCorridor(currentPrice, dailyVolatility, 5),
    [currentPrice, dailyVolatility]
  )

  const bounceZones = useMemo(
    () => generateBounceZones(studyResults, currentPrice),
    [studyResults, currentPrice]
  )

  const smartAlerts = useMemo(
    () => generateSmartAlerts(studyResults, currentPrice, dailyVolatility),
    [studyResults, currentPrice, dailyVolatility]
  )

  // Calculate price range for chart
  const priceRange = useMemo(() => {
    const allPrices = [
      ...historicalData.map(d => d.low),
      ...historicalData.map(d => d.high),
      ...(showLevels ? chartLevels.map(l => l.price) : []),
      ...(showCorridor && confidenceCorridors[0] 
        ? [confidenceCorridors[0].upperBound, confidenceCorridors[0].lowerBound] 
        : [])
    ].filter(Boolean)

    const min = Math.min(...allPrices) * 0.995
    const max = Math.max(...allPrices) * 1.005
    return { min, max, range: max - min }
  }, [historicalData, chartLevels, confidenceCorridors, showLevels, showCorridor])

  // Chart rendering calculations
  const margin = { top: 20, right: 60, bottom: 30, left: 10 }
  const chartWidth = dimensions.width - margin.left - margin.right
  const chartHeight = dimensions.height - margin.top - margin.bottom
  const volumeHeight = 60

  const xScale = (index: number) => 
    margin.left + (index / (historicalData.length - 1)) * chartWidth

  const yScale = (price: number) => 
    margin.top + ((priceRange.max - price) / priceRange.range) * chartHeight

  const candleWidth = Math.max(2, Math.min(chartWidth / historicalData.length - 1, 12))

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const ticks: number[] = []
    const tickCount = 6
    for (let i = 0; i <= tickCount; i++) {
      ticks.push(priceRange.min + (priceRange.range * i) / tickCount)
    }
    return ticks
  }, [priceRange])

  // X-axis labels (show subset)
  const xLabels = useMemo(() => {
    const step = Math.max(1, Math.floor(historicalData.length / 8))
    return historicalData.filter((_, i) => i % step === 0)
  }, [historicalData])

  const maxVolume = Math.max(...historicalData.map(d => d.volume))
  const volumeScale = (vol: number) => (vol / maxVolume) * (volumeHeight - 5)

  // Handle mouse events
  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setMousePos({ x, y })

    // Find nearest candle
    const candleIndex = Math.round((x - margin.left) / (chartWidth / (historicalData.length - 1)))
    if (candleIndex >= 0 && candleIndex < historicalData.length) {
      setHoveredCandle(historicalData[candleIndex])
    }

    // Find nearest level
    if (showLevels && chartLevels.length > 0) {
      const priceAtY = priceRange.max - ((y - margin.top) / chartHeight) * priceRange.range
      const nearestLevel = chartLevels.reduce((nearest, level) => {
        const dist = Math.abs(level.price - priceAtY)
        const nearestDist = Math.abs(nearest.price - priceAtY)
        return dist < nearestDist ? level : nearest
      }, chartLevels[0])
      
      if (nearestLevel && Math.abs(yScale(nearestLevel.price) - y) < 10) {
        setHoveredLevel(nearestLevel)
      } else {
        setHoveredLevel(null)
      }
    }
  }

  const handleMouseLeave = () => {
    setHoveredCandle(null)
    setHoveredLevel(null)
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="pb-3 space-y-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-medium">
              {ticker} - Enhanced Chart
            </CardTitle>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Timeframe selector */}
            <div className="flex gap-1">
              {TIMEFRAMES.map(tf => (
                <Button
                  key={tf}
                  variant={selectedTimeframe === tf ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSelectedTimeframe(tf)}
                >
                  {tf}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Smart Alerts */}
        {showAlerts && smartAlerts.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {smartAlerts.slice(0, 3).map((alert, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded-lg text-xs"
                style={{ 
                  backgroundColor: `${alert.color}15`,
                  borderLeft: `3px solid ${alert.color}`
                }}
              >
                <span className="text-base leading-none">{alert.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium" style={{ color: alert.color }}>
                    {alert.message}
                  </div>
                  <div className="text-muted-foreground text-[10px] mt-0.5">
                    {alert.actionable}
                  </div>
                </div>
                {alert.probability && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {alert.probability.toFixed(0)}%
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Overlay Controls */}
        <div className="flex items-center gap-4 pt-2 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Switch checked={showLevels} onCheckedChange={setShowLevels} />
            <span>Levels</span>
            <InfoTooltip content="Show support, resistance, and target levels derived from quantitative studies" />
          </label>
          
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Switch checked={showCorridor} onCheckedChange={setShowCorridor} />
            <span>Corridor</span>
            <InfoTooltip content="Statistical confidence bands showing expected price range" />
          </label>
          
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Switch checked={showBounceZones} onCheckedChange={setShowBounceZones} />
            <span>Zones</span>
            <InfoTooltip content="High-probability bounce/resistance zones" />
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <Switch checked={showAlerts} onCheckedChange={setShowAlerts} />
            <span>Alerts</span>
          </label>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Main Chart */}
        <div ref={containerRef} className="relative">
          <svg
            width="100%"
            height={dimensions.height}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Confidence Corridors */}
            {showCorridor && confidenceCorridors.map((corridor, idx) => (
              <g key={idx}>
                <rect
                  x={margin.left}
                  y={yScale(corridor.upperBound)}
                  width={chartWidth}
                  height={yScale(corridor.lowerBound) - yScale(corridor.upperBound)}
                  fill={corridor.color}
                  opacity={corridor.opacity}
                />
                <line
                  x1={margin.left}
                  y1={yScale(corridor.upperBound)}
                  x2={dimensions.width - margin.right}
                  y2={yScale(corridor.upperBound)}
                  stroke={corridor.color}
                  strokeWidth={1}
                  strokeDasharray="4 2"
                  opacity={0.5}
                />
                <line
                  x1={margin.left}
                  y1={yScale(corridor.lowerBound)}
                  x2={dimensions.width - margin.right}
                  y2={yScale(corridor.lowerBound)}
                  stroke={corridor.color}
                  strokeWidth={1}
                  strokeDasharray="4 2"
                  opacity={0.5}
                />
                <text
                  x={dimensions.width - margin.right + 5}
                  y={yScale(corridor.centerLine) + 3}
                  fill={corridor.color}
                  fontSize={9}
                  opacity={0.7}
                >
                  {corridor.confidenceLevel}%
                </text>
              </g>
            ))}

            {/* Bounce Zones */}
            {showBounceZones && bounceZones.map((zone, idx) => (
              <g key={idx}>
                <rect
                  x={margin.left}
                  y={yScale(Math.max(zone.priceStart, zone.priceEnd))}
                  width={chartWidth}
                  height={Math.abs(yScale(zone.priceEnd) - yScale(zone.priceStart))}
                  fill={zone.color}
                />
                <text
                  x={margin.left + 5}
                  y={yScale((zone.priceStart + zone.priceEnd) / 2) + 3}
                  fill={zone.type === 'bounce' ? '#10b981' : '#ef4444'}
                  fontSize={9}
                  fontWeight={600}
                  opacity={0.9}
                >
                  {zone.label}
                </text>
              </g>
            ))}

            {/* Chart Levels */}
            {showLevels && chartLevels.slice(0, 10).map((level, idx) => {
              const y = yScale(level.price)
              const isHovered = hoveredLevel?.price === level.price
              
              return (
                <g 
                  key={idx}
                  className="cursor-pointer"
                  onClick={() => onLevelClick?.(level)}
                >
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={dimensions.width - margin.right}
                    y2={y}
                    stroke={level.color}
                    strokeWidth={isHovered ? 2 : 1}
                    strokeDasharray={level.levelType === 'PIVOT' ? '6 3' : '4 2'}
                    opacity={isHovered ? 1 : 0.6}
                  />
                  
                  <circle
                    cx={margin.left}
                    cy={y}
                    r={isHovered ? 4 : 3}
                    fill={level.color}
                    opacity={isHovered ? 1 : 0.8}
                  />
                  
                  <rect
                    x={dimensions.width - margin.right + 2}
                    y={y - 9}
                    width={52}
                    height={18}
                    rx={3}
                    fill={level.color}
                    opacity={isHovered ? 1 : 0.9}
                  />
                  <text
                    x={dimensions.width - margin.right + 28}
                    y={y + 4}
                    fill="white"
                    fontSize={10}
                    fontWeight={600}
                    textAnchor="middle"
                  >
                    ${level.price.toFixed(2)}
                  </text>
                  
                  {level.alertTrigger && (
                    <g>
                      <circle
                        cx={dimensions.width - margin.right - 10}
                        cy={y}
                        r={6}
                        fill={level.color}
                        opacity={0.3}
                      >
                        <animate
                          attributeName="r"
                          from="6"
                          to="12"
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          from="0.5"
                          to="0"
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <Bell className="h-3 w-3" />
                    </g>
                  )}
                </g>
              )
            })}

            {/* Current price line */}
            <line
              x1={margin.left}
              y1={yScale(currentPrice)}
              x2={dimensions.width - margin.right}
              y2={yScale(currentPrice)}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="4 2"
              opacity={0.8}
            />
            <rect
              x={dimensions.width - margin.right + 2}
              y={yScale(currentPrice) - 10}
              width={52}
              height={20}
              rx={3}
              fill="hsl(var(--primary))"
            />
            <text
              x={dimensions.width - margin.right + 28}
              y={yScale(currentPrice) + 4}
              fill="hsl(var(--primary-foreground))"
              fontSize={11}
              fontWeight={700}
              textAnchor="middle"
            >
              ${currentPrice.toFixed(2)}
            </text>

            {/* Candlesticks */}
            {historicalData.map((candle, i) => {
              const x = xScale(i)
              const color = candle.isGreen ? '#22c55e' : '#ef4444'
              
              const yHigh = yScale(candle.high)
              const yLow = yScale(candle.low)
              const yOpen = yScale(candle.open)
              const yClose = yScale(candle.close)
              
              const bodyTop = Math.min(yOpen, yClose)
              const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1)

              return (
                <g key={i}>
                  <line
                    x1={x}
                    y1={yHigh}
                    x2={x}
                    y2={yLow}
                    stroke={color}
                    strokeWidth={1}
                    opacity={0.8}
                  />
                  <rect
                    x={x - candleWidth / 2}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={color}
                    opacity={0.9}
                    rx={1}
                  />
                </g>
              )
            })}

            {/* Y-axis labels */}
            {yTicks.map((tick, i) => (
              <text
                key={i}
                x={dimensions.width - margin.right + 8}
                y={yScale(tick) + 3}
                fill="hsl(var(--muted-foreground))"
                fontSize={10}
              >
                ${tick.toFixed(0)}
              </text>
            ))}

            {/* X-axis labels */}
            {xLabels.map((candle, i) => (
              <text
                key={i}
                x={xScale(candle.index)}
                y={dimensions.height - 5}
                fill="hsl(var(--muted-foreground))"
                fontSize={10}
                textAnchor="middle"
              >
                {candle.date}
              </text>
            ))}

            {/* Crosshair on hover */}
            {hoveredCandle && (
              <>
                <line
                  x1={xScale(hoveredCandle.index)}
                  y1={margin.top}
                  x2={xScale(hoveredCandle.index)}
                  y2={dimensions.height - margin.bottom}
                  stroke="hsl(var(--foreground))"
                  strokeOpacity={0.3}
                  strokeDasharray="2 2"
                />
                <line
                  x1={margin.left}
                  y1={yScale(hoveredCandle.close)}
                  x2={dimensions.width - margin.right}
                  y2={yScale(hoveredCandle.close)}
                  stroke="hsl(var(--foreground))"
                  strokeOpacity={0.3}
                  strokeDasharray="2 2"
                />
              </>
            )}
          </svg>

          {/* Hovered Candle Tooltip */}
          {hoveredCandle && (
            <div
              className="absolute z-50 rounded-lg border bg-popover p-3 shadow-lg pointer-events-none"
              style={{
                left: mousePos.x > dimensions.width / 2 ? mousePos.x - 160 : mousePos.x + 15,
                top: Math.min(mousePos.y, dimensions.height - 150),
              }}
            >
              <div className="text-xs text-muted-foreground mb-2">{hoveredCandle.date}</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Open</span>
                  <span className="font-medium">${hoveredCandle.open.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">High</span>
                  <span className="font-medium text-green-500">${hoveredCandle.high.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Close</span>
                  <span className={`font-medium ${hoveredCandle.isGreen ? 'text-green-500' : 'text-red-500'}`}>
                    ${hoveredCandle.close.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Low</span>
                  <span className="font-medium text-red-500">${hoveredCandle.low.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Hovered Level Tooltip */}
          {hoveredLevel && !hoveredCandle && (
            <div
              className="absolute z-50 rounded-lg border bg-popover p-3 shadow-lg pointer-events-none max-w-[300px]"
              style={{
                left: mousePos.x > dimensions.width / 2 ? mousePos.x - 320 : mousePos.x + 15,
                top: Math.min(mousePos.y, dimensions.height - 100),
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: hoveredLevel.color }}
                />
                <span className="font-medium text-sm">{hoveredLevel.label}</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {hoveredLevel.probability.toFixed(0)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {hoveredLevel.description}
              </p>
              <div className="mt-2 pt-2 border-t text-xs">
                <span className="text-muted-foreground">Source: </span>
                <span className="font-medium">{hoveredLevel.studySource.replace(/_/g, ' ')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Volume Chart */}
        <div className="px-4 mt-1 pb-2">
          <svg
            width="100%"
            height={volumeHeight}
            viewBox={`0 0 ${dimensions.width} ${volumeHeight}`}
          >
            {historicalData.map((candle, i) => {
              const x = xScale(i)
              const barHeight = volumeScale(candle.volume)
              const color = candle.isGreen ? '#22c55e' : '#ef4444'
              
              return (
                <rect
                  key={i}
                  x={x - candleWidth / 2}
                  y={volumeHeight - barHeight}
                  width={candleWidth}
                  height={barHeight}
                  fill={color}
                  opacity={0.4}
                  rx={1}
                />
              )
            })}
          </svg>
        </div>

        {/* Levels Legend */}
        {showLevels && chartLevels.length > 0 && (
          <div className="px-4 pb-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Key Levels</span>
              <InfoTooltip content="Price levels derived from quantitative studies. Click a level for details." />
            </div>
            <div className="flex flex-wrap gap-2">
              {chartLevels.slice(0, 6).map((level, idx) => (
                <TooltipProvider key={idx} delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onLevelClick?.(level)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer border hover:border-primary/50 transition-colors"
                        style={{ 
                          borderColor: level.color,
                          backgroundColor: `${level.color}15`,
                        }}
                      >
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: level.color }}
                        />
                        <span style={{ color: level.color }} className="font-medium">
                          ${level.price.toFixed(2)}
                        </span>
                        <span className="text-muted-foreground">
                          ({level.probability.toFixed(0)}%)
                        </span>
                        {level.alertTrigger && (
                          <Zap className="h-3 w-3 ml-0.5" style={{ color: level.color }} />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[300px]">
                      <div className="text-xs">
                        <p className="font-medium mb-1">{level.label}</p>
                        <p className="text-muted-foreground">{level.description}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
