/**
 * Integrated Research View
 * Combines enhanced price chart with hybrid study execution model
 * Main component for the ALA-style research interface
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EnhancedPriceChart } from './EnhancedPriceChart'
import { HybridStudyCard } from './HybridStudyCard'
import { 
  Sparkles, 
  TrendingUp,
  BarChart3,
  Zap,
  Play,
  RefreshCw,
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STUDY_TIERS, TIER_DISPLAY } from '@/config/studyTiers'
import { STUDY_DEFINITIONS } from '@/components/quant-lab/studyDefinitions'
import type { StudyResult as ChartStudyResult, ChartLevel } from '@/lib/generateChartLevels'

interface IntegratedResearchViewProps {
  ticker: string
  onRunStudy: (studyId: string) => Promise<Record<string, unknown>>
  onRunAutoSnapshot: () => Promise<Record<string, unknown>>
  initialData?: Record<string, unknown>
}

export function IntegratedResearchView({
  ticker,
  onRunStudy,
  onRunAutoSnapshot,
  initialData = {}
}: IntegratedResearchViewProps) {
  const [studyResults, setStudyResults] = useState<Record<string, Record<string, unknown>>>(initialData as Record<string, Record<string, unknown>>)
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false)
  const [isLoadingStudy, setIsLoadingStudy] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<'overview' | 'auto' | 'manual'>('overview')
  const [selectedLevel, setSelectedLevel] = useState<ChartLevel | null>(null)

  // Mock data for demonstration (replace with real data from your API)
  const mockCurrentPrice = 198.45
  const mockDailyVolatility = 0.022
  const mockHistoricalData = generateMockHistoricalData(ticker, mockCurrentPrice)

  // Load auto-run studies on mount
  useEffect(() => {
    loadAutoStudies()
  }, [ticker])

  const loadAutoStudies = async () => {
    setIsLoadingSnapshot(true)
    try {
      const snapshot = await onRunAutoSnapshot()
      setStudyResults(prev => ({ ...prev, ...snapshot as Record<string, Record<string, unknown>> }))
    } catch (error) {
      console.error('Failed to load auto studies:', error)
    } finally {
      setIsLoadingSnapshot(false)
    }
  }

  const handleManualStudyRun = async (studyId: string) => {
    setIsLoadingStudy(prev => ({ ...prev, [studyId]: true }))
    try {
      const result = await onRunStudy(studyId)
      setStudyResults(prev => ({ ...prev, [studyId]: result }))
    } catch (error) {
      console.error(`Failed to run study ${studyId}:`, error)
    } finally {
      setIsLoadingStudy(prev => ({ ...prev, [studyId]: false }))
    }
  }

  const handleRefreshAll = async () => {
    await loadAutoStudies()
  }

  // Transform study results for chart overlay
  const chartStudyResults: ChartStudyResult[] = useMemo(() => {
    return Object.entries(studyResults).map(([studyId, data]) => ({
      studyId,
      signalActive: (data as Record<string, unknown>)?.signal !== 'neutral',
      avgMove_1w: (data as Record<string, number>)?.avgMove_1w,
      avgMove_2w: (data as Record<string, number>)?.avgMove_2w,
      avgMove_1m: (data as Record<string, number>)?.avgMove_1m,
      winRate: (data as Record<string, number>)?.winRate,
      currentRSI: (data as Record<string, number>)?.currentRSI,
      priceVsMA: (data as Record<string, { ma20?: number; ma50?: number; ma200?: number }>)?.priceVsMA,
      currentStreak: (data as Record<string, number>)?.currentStreak,
      unfilledGaps: (data as Record<string, Array<{ price: number; type: 'up' | 'down'; age: number; distance: number }>>)?.unfilledGaps,
      stdDev: (data as Record<string, number>)?.stdDev,
      atr: (data as Record<string, number>)?.atr,
      bollingerPosition: (data as Record<string, number>)?.bollingerPosition,
    }))
  }, [studyResults])

  // Get study definitions
  const autoStudyDefs = useMemo(() => 
    STUDY_DEFINITIONS.filter(def => STUDY_TIERS.AUTO.includes(def.id)),
    []
  )

  const manualStudyDefs = useMemo(() => 
    STUDY_DEFINITIONS.filter(def => STUDY_TIERS.MANUAL.includes(def.id)),
    []
  )

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const autoRun = STUDY_TIERS.AUTO.length
    const autoComplete = Object.keys(studyResults).filter(id => STUDY_TIERS.AUTO.includes(id)).length
    const manualRun = Object.keys(studyResults).filter(id => STUDY_TIERS.MANUAL.includes(id)).length
    
    const resultsWithWinRate = Object.values(studyResults).filter((r) => (r as Record<string, number>)?.winRate !== undefined)
    const avgWinRate = resultsWithWinRate.length > 0
      ? resultsWithWinRate.reduce((sum, r) => sum + ((r as Record<string, number>).winRate || 0), 0) / resultsWithWinRate.length
      : 0

    const bullishSignals = Object.values(studyResults).filter((r) => (r as Record<string, string>)?.signal === 'bullish').length
    const bearishSignals = Object.values(studyResults).filter((r) => (r as Record<string, string>)?.signal === 'bearish').length

    return {
      autoComplete,
      autoTotal: autoRun,
      manualComplete: manualRun,
      avgWinRate: avgWinRate || 0,
      bullishSignals,
      bearishSignals,
      overallSentiment: bullishSignals > bearishSignals ? 'bullish' : bearishSignals > bullishSignals ? 'bearish' : 'neutral'
    }
  }, [studyResults])

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header with Summary */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {ticker}
            <Badge 
              variant="outline" 
              className={cn(
                'text-xs',
                summaryStats.overallSentiment === 'bullish' && 'bg-green-500/10 text-green-500 border-green-500/20',
                summaryStats.overallSentiment === 'bearish' && 'bg-red-500/10 text-red-500 border-red-500/20',
                summaryStats.overallSentiment === 'neutral' && 'bg-blue-500/10 text-blue-500 border-blue-500/20'
              )}
            >
              {summaryStats.overallSentiment === 'bullish' && <TrendingUp className="h-3 w-3 mr-1" />}
              {summaryStats.overallSentiment}
            </Badge>
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-blue-500" />
              <span>{summaryStats.autoComplete}/{summaryStats.autoTotal} Auto</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              <span>{summaryStats.manualComplete} Manual</span>
            </div>
            {summaryStats.avgWinRate > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Avg WR:</span>
                <span className={cn(
                  'font-mono',
                  summaryStats.avgWinRate >= 60 && 'text-green-500',
                  summaryStats.avgWinRate >= 50 && summaryStats.avgWinRate < 60 && 'text-yellow-500',
                  summaryStats.avgWinRate < 50 && 'text-red-500'
                )}>
                  {summaryStats.avgWinRate.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isLoadingSnapshot}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoadingSnapshot && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Enhanced Chart */}
      <EnhancedPriceChart
        ticker={ticker}
        studyResults={chartStudyResults}
        currentPrice={mockCurrentPrice}
        dailyVolatility={mockDailyVolatility}
        historicalData={mockHistoricalData}
        onLevelClick={(level) => setSelectedLevel(level)}
      />

      {/* Level Details Modal (when a level is clicked) */}
      {selectedLevel && (
        <Card className="border-2 border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedLevel.color }}
                  />
                  {selectedLevel.label}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedLevel.description}
                </p>
              </div>
              <Badge variant="secondary">
                {selectedLevel.probability.toFixed(0)}% probability
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">Price Level</div>
                <div className="font-semibold">${selectedLevel.price.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Type</div>
                <div className="font-semibold">{selectedLevel.levelType}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Source</div>
                <div className="font-semibold text-xs">{selectedLevel.studySource.replace(/_/g, ' ')}</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setSelectedLevel(null)}
            >
              Close
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Study Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'auto' | 'manual')} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="auto" className="gap-2">
            <Zap className="h-4 w-4" />
            Instant Insights ({summaryStats.autoComplete})
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Deep Dive ({summaryStats.manualComplete})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab - Blended View */}
        <TabsContent value="overview" className="space-y-6">
          {/* Top Auto Studies */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                {TIER_DISPLAY.AUTO.name}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('auto')}
              >
                View All →
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {autoStudyDefs.slice(0, 6).map(study => (
                <HybridStudyCard
                  key={study.id}
                  studyId={study.id}
                  studyName={study.name}
                  studyDescription={study.description}
                  studyDefinition={study}
                  data={studyResults[study.id] as Record<string, unknown> & { winRate?: number; avgMove_1w?: number; avgMove_1m?: number; sampleSize?: number; confidence?: number; signal?: 'bullish' | 'bearish' | 'neutral'; message?: string } || null}
                  tier="AUTO"
                  isLoading={isLoadingSnapshot}
                />
              ))}
            </div>
          </div>

          {/* Featured Manual Studies */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                {TIER_DISPLAY.MANUAL.name}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('manual')}
              >
                View All →
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {manualStudyDefs.slice(0, 3).map(study => (
                <HybridStudyCard
                  key={study.id}
                  studyId={study.id}
                  studyName={study.name}
                  studyDescription={study.description}
                  studyDefinition={study}
                  data={studyResults[study.id] as Record<string, unknown> & { winRate?: number; avgMove_1w?: number; avgMove_1m?: number; sampleSize?: number; confidence?: number; signal?: 'bullish' | 'bearish' | 'neutral'; message?: string } || null}
                  tier="MANUAL"
                  onRun={handleManualStudyRun}
                  isLoading={isLoadingStudy[study.id]}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Auto Studies Tab */}
        <TabsContent value="auto" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                {TIER_DISPLAY.AUTO.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {TIER_DISPLAY.AUTO.description}
              </p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {summaryStats.autoComplete}/{summaryStats.autoTotal} Complete
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {autoStudyDefs.map(study => (
              <HybridStudyCard
                key={study.id}
                studyId={study.id}
                studyName={study.name}
                studyDescription={study.description}
                studyDefinition={study}
                data={studyResults[study.id] as Record<string, unknown> & { winRate?: number; avgMove_1w?: number; avgMove_1m?: number; sampleSize?: number; confidence?: number; signal?: 'bullish' | 'bearish' | 'neutral'; message?: string } || null}
                tier="AUTO"
                isLoading={isLoadingSnapshot}
              />
            ))}
          </div>
        </TabsContent>

        {/* Manual Studies Tab */}
        <TabsContent value="manual" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                {TIER_DISPLAY.MANUAL.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {TIER_DISPLAY.MANUAL.description}
              </p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Play className="h-3 w-3" />
              {summaryStats.manualComplete} Run
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {manualStudyDefs.map(study => (
              <HybridStudyCard
                key={study.id}
                studyId={study.id}
                studyName={study.name}
                studyDescription={study.description}
                studyDefinition={study}
                data={studyResults[study.id] as Record<string, unknown> & { winRate?: number; avgMove_1w?: number; avgMove_1m?: number; sampleSize?: number; confidence?: number; signal?: 'bullish' | 'bearish' | 'neutral'; message?: string } || null}
                tier="MANUAL"
                onRun={handleManualStudyRun}
                isLoading={isLoadingStudy[study.id]}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper function to generate mock historical data
function generateMockHistoricalData(ticker: string, basePrice: number) {
  const data: Array<{
    date: string
    index: number
    open: number
    close: number
    high: number
    low: number
    volume: number
    isGreen: boolean
  }> = []
  let currentPrice = basePrice * 0.9
  
  const seed = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const seededRandom = (i: number) => {
    const x = Math.sin(seed + i * 9999) * 10000
    return x - Math.floor(x)
  }

  for (let i = 0; i < 60; i++) {
    const change = (seededRandom(i) - 0.48) * currentPrice * 0.02
    const open = currentPrice
    const close = currentPrice + change
    const high = Math.max(open, close) + seededRandom(i + 100) * currentPrice * 0.01
    const low = Math.min(open, close) - seededRandom(i + 200) * currentPrice * 0.01
    
    data.push({
      date: `Day ${i + 1}`,
      index: i,
      open: Number(open.toFixed(2)),
      close: Number(close.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      volume: Math.floor(seededRandom(i + 300) * 50000000) + 20000000,
      isGreen: close >= open
    })
    
    currentPrice = close
  }
  
  return data
}
