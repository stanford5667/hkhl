/**
 * Hybrid Study Card
 * Displays study results if available, or a "Run Study" button if not
 * Handles the tier-based execution model
 */

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Play,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  Zap,
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudyDefinition } from '@/components/quant-lab/studyDefinitions'
import { STUDY_TIER_METADATA } from '@/config/studyTiers'

interface StudyResult {
  winRate?: number
  avgMove_1w?: number
  avgMove_1m?: number
  sampleSize?: number
  confidence?: number
  signal?: 'bullish' | 'bearish' | 'neutral'
  message?: string
  data?: Record<string, unknown>
  [key: string]: unknown
}

interface HybridStudyCardProps {
  studyId: string
  studyName: string
  studyDescription?: string
  studyDefinition?: StudyDefinition
  data: StudyResult | null
  tier: 'AUTO' | 'MANUAL'
  onRun?: (studyId: string) => Promise<void>
  isLoading?: boolean
  className?: string
}

export function HybridStudyCard({
  studyId,
  studyName,
  studyDescription,
  studyDefinition,
  data,
  tier,
  onRun,
  isLoading = false,
  className
}: HybridStudyCardProps) {
  const [isRunning, setIsRunning] = useState(false)
  
  const metadata = STUDY_TIER_METADATA[studyId]

  const handleRun = async () => {
    if (!onRun || isRunning) return
    
    setIsRunning(true)
    try {
      await onRun(studyId)
    } catch (error) {
      console.error('Study execution error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  // ==== CASE 1: Data exists (Auto-run or manually run previously) ====
  if (data) {
    return (
      <Card className={cn(
        'bg-card/80 backdrop-blur border transition-all duration-200',
        data.signal === 'bullish' && 'border-l-4 border-l-green-500',
        data.signal === 'bearish' && 'border-l-4 border-l-red-500',
        data.signal === 'neutral' && 'border-l-4 border-l-blue-500',
        className
      )}>
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{studyName}</h3>
                {tier === 'AUTO' && (
                  <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/20">
                    <Zap className="h-2.5 w-2.5 mr-1" />
                    Auto
                  </Badge>
                )}
                {data.confidence && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-[10px]',
                            data.confidence > 80 && 'bg-green-500/10 text-green-500 border-green-500/20',
                            data.confidence > 60 && data.confidence <= 80 && 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
                            data.confidence <= 60 && 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                          )}
                        >
                          {data.confidence}% conf
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Statistical confidence level</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {studyDescription && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {studyDescription}
                </p>
              )}
            </div>

            {/* Win Rate Badge */}
            {data.winRate !== undefined && (
              <div className="shrink-0">
                <div className={cn(
                  'text-lg font-bold font-mono',
                  data.winRate >= 60 && 'text-green-500',
                  data.winRate >= 50 && data.winRate < 60 && 'text-yellow-500',
                  data.winRate < 50 && 'text-red-500'
                )}>
                  {data.winRate.toFixed(0)}%
                </div>
                <div className="text-[10px] text-muted-foreground text-center">WR</div>
              </div>
            )}
          </div>

          {/* Signal Message */}
          {data.message && (
            <div className={cn(
              'text-xs p-2 rounded-md flex items-start gap-2',
              data.signal === 'bullish' && 'bg-green-500/10 text-green-600 dark:text-green-400',
              data.signal === 'bearish' && 'bg-red-500/10 text-red-600 dark:text-red-400',
              data.signal === 'neutral' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
            )}>
              {data.signal === 'bullish' && <TrendingUp className="h-3 w-3 mt-0.5 shrink-0" />}
              {data.signal === 'bearish' && <TrendingDown className="h-3 w-3 mt-0.5 shrink-0" />}
              {data.signal === 'neutral' && <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />}
              <span className="flex-1">{data.message}</span>
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-2">
            {data.avgMove_1w !== undefined && (
              <MetricCard
                label="1W Avg Move"
                value={`${data.avgMove_1w > 0 ? '+' : ''}${data.avgMove_1w.toFixed(2)}%`}
                trend={data.avgMove_1w > 0 ? 'up' : 'down'}
              />
            )}
            {data.avgMove_1m !== undefined && (
              <MetricCard
                label="1M Avg Move"
                value={`${data.avgMove_1m > 0 ? '+' : ''}${data.avgMove_1m.toFixed(2)}%`}
                trend={data.avgMove_1m > 0 ? 'up' : 'down'}
              />
            )}
            {data.sampleSize !== undefined && (
              <MetricCard
                label="Sample Size"
                value={data.sampleSize.toString()}
              />
            )}
          </div>

          {/* Additional Data (if provided) */}
          {data.data && (
            <div className="pt-2 border-t border-border/50">
              {renderAdditionalData(data.data)}
            </div>
          )}

          {/* Educational Tooltip */}
          {studyDefinition && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="h-3 w-3" />
                    <span>Learn about this study</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[300px]">
                  <div className="space-y-2 text-xs">
                    <div>
                      <p className="font-medium mb-1">What it measures:</p>
                      <p className="text-muted-foreground">{studyDefinition.whatItMeasures}</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Why it matters:</p>
                      <p className="text-muted-foreground">{studyDefinition.whyItMatters}</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
    )
  }

  // ==== CASE 2: No data yet (Manual Tier - Pending) ====
  return (
    <Card className={cn(
      'bg-card/50 backdrop-blur border-2 border-dashed border-muted hover:border-primary/50 transition-all duration-200 group',
      className
    )}>
      <CardContent className="p-4 flex flex-col items-center justify-center min-h-[200px] space-y-3">
        {/* Study Icon */}
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>

        {/* Study Info */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <h3 className="font-semibold text-sm">{studyName}</h3>
            <Badge variant="secondary" className="text-[10px]">
              {tier === 'MANUAL' ? '🔬 Deep Dive' : '⚡ Auto'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            {studyDescription || metadata?.quickDescription || 'Advanced quantitative analysis'}
          </p>
          {metadata?.estimatedTime && (
            <p className="text-[10px] text-muted-foreground">
              Est. time: {metadata.estimatedTime}
            </p>
          )}
        </div>

        {/* Run Button */}
        <Button 
          onClick={handleRun}
          disabled={isRunning || isLoading}
          size="sm"
          className="gap-2 group-hover:shadow-lg transition-all"
        >
          {isRunning || isLoading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              Run Analysis
            </>
          )}
        </Button>

        {/* Progress bar during execution */}
        {(isRunning || isLoading) && (
          <div className="w-full space-y-1">
            <Progress value={undefined} className="h-1" />
            <p className="text-[10px] text-center text-muted-foreground">
              Crunching 3 years of data...
            </p>
          </div>
        )}

        {/* What You'll Get */}
        <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border/50 w-full">
          <span className="font-medium">You'll get:</span> Historical patterns, probabilities, and actionable insights
        </div>
      </CardContent>
    </Card>
  )
}

// Helper component for metric cards
function MetricCard({ 
  label, 
  value, 
  trend 
}: { 
  label: string
  value: string
  trend?: 'up' | 'down' 
}) {
  return (
    <div className="p-2 rounded-md bg-secondary/50 text-center">
      <div className={cn(
        'text-sm font-semibold font-mono',
        trend === 'up' && 'text-green-500',
        trend === 'down' && 'text-red-500'
      )}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  )
}

// Helper function to render additional data
function renderAdditionalData(data: Record<string, unknown>) {
  if (Array.isArray(data)) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {data.map((item: { label: string; value: string }, idx: number) => (
          <div key={idx} className="text-xs">
            <span className="text-muted-foreground">{item.label}:</span>
            <span className="ml-1 font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    )
  }

  if (typeof data === 'object') {
    return (
      <div className="space-y-1 text-xs">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="text-muted-foreground">{key}:</span>
            <span className="font-medium">{String(value)}</span>
          </div>
        ))}
      </div>
    )
  }

  return null
}
