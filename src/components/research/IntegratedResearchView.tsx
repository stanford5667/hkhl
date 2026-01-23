/**
 * IntegratedResearchView - ALA UI Styled
 * Main container for chart + studies matching ALA design system
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3,
  TrendingUp,
  RefreshCw,
  Download,
  Sparkles,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EnhancedPriceChart } from './EnhancedPriceChart'
import { HybridStudyGrid } from './HybridStudyCard'
import type { StudyResult as StudyResultType } from '@/types/studies'
import type { StudyResult as ChartStudyResult } from '@/lib/generateChartLevels'

interface IntegratedResearchViewProps {
  ticker: string
  currentPrice: number
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

// Generate mock historical data for chart
function generateMockHistoricalData(ticker: string, basePrice: number): CandleData[] {
  const data: CandleData[] = []
  let price = basePrice * 0.9
  
  for (let i = 0; i < 60; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (60 - i))
    
    const change = (Math.random() - 0.48) * 3
    const open = price
    const close = price * (1 + change / 100)
    const high = Math.max(open, close) * (1 + Math.random() * 0.02)
    const low = Math.min(open, close) * (1 - Math.random() * 0.02)
    
    data.push({
      date: date.toISOString().split('T')[0],
      index: i,
      open,
      close,
      high,
      low,
      volume: Math.floor(Math.random() * 10000000) + 1000000,
      isGreen: close > open
    })
    
    price = close
  }
  
  return data
}

export function IntegratedResearchView({ ticker, currentPrice }: IntegratedResearchViewProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(false)
  const [autoStudies, setAutoStudies] = useState<StudyResultType[]>([])
  
  // Generate historical data
  const historicalData = useMemo(() => 
    generateMockHistoricalData(ticker, currentPrice), 
    [ticker, currentPrice]
  )
  
  // Convert study results for chart
  const chartStudyResults: ChartStudyResult[] = useMemo(() => {
    return autoStudies.map(s => ({
      studyId: s.studyId,
      signalActive: (s.winRate || 0) >= 60 || (s.winRate || 0) <= 40,
      winRate: s.winRate,
      avgMove_1w: s.avgMove_1w,
      avgMove_1m: s.avgMove_1m,
      currentRSI: s.currentRSI,
      sampleSize: s.sampleSize
    }))
  }, [autoStudies])
  
  // Auto-load Tier 1 studies on mount
  useEffect(() => {
    loadAutoStudies()
  }, [ticker])

  const loadAutoStudies = async () => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      // Mock auto studies
      const mockAutoStudies: StudyResultType[] = [
        {
          studyId: 'rsi_analysis',
          studyName: 'RSI Analysis',
          description: 'Oversold/overbought mean reversion patterns',
          winRate: 68,
          avgMove_1w: 2.34,
          avgMove_1m: 3.12,
          sampleSize: 47,
          currentRSI: 28,
          educationalNote: 'RSI below 30 suggests oversold conditions'
        },
        {
          studyId: 'gap_analysis',
          studyName: 'Gap Analysis',
          description: 'Overnight gap fill probabilities',
          winRate: 82,
          avgMove_1w: 1.85,
          avgMove_1m: 2.45,
          sampleSize: 24,
          educationalNote: 'Gaps tend to fill within 1-2 weeks'
        },
        {
          studyId: 'consecutive_days',
          studyName: 'After 3 Down Days',
          description: 'Mean reversion after losing streaks',
          winRate: 74,
          avgMove_1w: 3.21,
          avgMove_1m: 4.67,
          sampleSize: 31
        }
      ]
      
      setAutoStudies(mockAutoStudies)
      setIsLoading(false)
    }, 1000)
  }

  const handleRunManualStudy = (studyId: string) => {
    console.log('Running manual study:', studyId)
  }

  // Calculate summary stats
  const autoCompletion = autoStudies.length > 0 ? 100 : 0
  const manualCompletion = 0
  const avgWinRate = autoStudies.length > 0 
    ? autoStudies.reduce((sum, s) => sum + (s.winRate || 0), 0) / autoStudies.length 
    : 0
  const sentiment = avgWinRate >= 60 ? 'Bullish' : avgWinRate <= 40 ? 'Bearish' : 'Neutral'

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-medium">Research Dashboard</CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                {ticker}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadAutoStudies} disabled={isLoading}>
                <RefreshCw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-center">
              <div className="text-lg font-bold text-primary">{autoCompletion}%</div>
              <div className="text-[10px] text-muted-foreground">Auto Complete</div>
            </div>
            <div className="p-2 rounded-lg bg-secondary/50 text-center">
              <div className="text-lg font-bold">{manualCompletion}%</div>
              <div className="text-[10px] text-muted-foreground">Deep Dive</div>
            </div>
            <div className="p-2 rounded-lg bg-success/10 text-center">
              <div className="text-lg font-bold text-success">{avgWinRate.toFixed(0)}%</div>
              <div className="text-[10px] text-muted-foreground">Avg Win Rate</div>
            </div>
            <div className="p-2 rounded-lg bg-muted text-center">
              <div className={cn(
                "text-lg font-bold",
                sentiment === 'Bullish' ? 'text-success' : 
                sentiment === 'Bearish' ? 'text-destructive' : ''
              )}>
                {sentiment}
              </div>
              <div className="text-[10px] text-muted-foreground">Sentiment</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto p-0 bg-transparent gap-1">
          <TabsTrigger 
            value="overview"
            className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-xs px-2 py-1.5"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="auto"
            className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-xs px-2 py-1.5"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Auto Studies
          </TabsTrigger>
          <TabsTrigger 
            value="manual"
            className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-xs px-2 py-1.5"
          >
            Deep Dive
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Chart with Controls */}
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <EnhancedPriceChart
              ticker={ticker}
              studyResults={chartStudyResults}
              currentPrice={currentPrice}
              dailyVolatility={2.5}
              historicalData={historicalData}
            />
          )}

          {/* Top Auto Studies Summary */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Top Insights</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {autoStudies.length} Studies
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="space-y-2">
                  {autoStudies.slice(0, 3).map((study) => (
                    <div 
                      key={study.studyId}
                      className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
                    >
                      <div>
                        <div className="text-sm font-medium">{study.studyName}</div>
                        <div className="text-xs text-muted-foreground">{study.description}</div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          (study.winRate || 0) >= 60 ? "text-success border-success" :
                          (study.winRate || 0) <= 40 ? "text-destructive border-destructive" :
                          "text-primary border-primary"
                        )}
                      >
                        {study.winRate}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auto Studies Tab */}
        <TabsContent value="auto" className="mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                These studies run automatically on ticker load (&lt;500ms)
              </p>
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                Auto-Run
              </Badge>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
              </div>
            ) : (
              <HybridStudyGrid
                studies={autoStudies}
                autoStudies={autoStudies.map(s => s.studyId)}
                manualStudies={[]}
                calculatedStudyIds={autoStudies.map(s => s.studyId)}
                onRunStudy={handleRunManualStudy}
              />
            )}
          </div>
        </TabsContent>

        {/* Manual Studies Tab */}
        <TabsContent value="manual" className="mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Deep-dive studies - click to run on-demand (1-3s each)
              </p>
              <Badge variant="secondary" className="text-[10px]">
                On-Demand
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-8 rounded-lg border border-dashed border-border text-center">
                <div className="text-sm text-muted-foreground">
                  Click "Run Analysis" on studies above to add results here
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
