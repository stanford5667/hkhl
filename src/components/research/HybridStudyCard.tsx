/**
 * HybridStudyCard - ALA UI Styled
 * Displays calculated or pending study results matching ALA design system
 */

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Sparkles,
  Loader2,
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudyResult } from '@/types/studies'

interface HybridStudyCardProps {
  study: StudyResult
  tier: 'AUTO' | 'MANUAL'
  isCalculated: boolean
  isLoading?: boolean
  onRunStudy?: () => void
}

export function HybridStudyCard({ 
  study, 
  tier, 
  isCalculated, 
  isLoading = false,
  onRunStudy 
}: HybridStudyCardProps) {
  
  // Determine signal and color
  const getSignal = () => {
    if (!isCalculated || !study.winRate) return 'neutral'
    if (study.winRate >= 60) return 'bullish'
    if (study.winRate <= 40) return 'bearish'
    return 'neutral'
  }

  const signal = getSignal()
  
  const signalConfig = {
    bullish: {
      label: 'Bullish',
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/30',
      icon: TrendingUp
    },
    bearish: {
      label: 'Bearish',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/30',
      icon: TrendingDown
    },
    neutral: {
      label: 'Neutral',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
      icon: Minus
    }
  }

  const config = signalConfig[signal]
  const SignalIcon = config.icon

  // Calculated state
  if (isCalculated) {
    return (
      <Card className={cn("transition-all border", config.borderColor)}>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium">{study.studyName}</div>
              <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {study.description}
              </div>
            </div>
            <Badge 
              variant="outline" 
              className={cn("text-xs ml-2", config.color)}
            >
              <SignalIcon className="h-2.5 w-2.5 mr-1" />
              {study.winRate}%
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-3 space-y-3">
          {/* Signal Message */}
          <div className={cn("p-2 rounded-lg text-center", config.bgColor)}>
            <div className={cn("text-xs font-medium", config.color)}>
              {signal === 'bullish' && `${study.winRate}% win rate suggests bullish bias`}
              {signal === 'bearish' && `${study.winRate}% win rate suggests bearish bias`}
              {signal === 'neutral' && `${study.winRate}% win rate - no clear edge`}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            {study.avgMove_1w != null && (
              <div className="p-2 rounded-lg bg-secondary/50 text-center">
                <div className={cn(
                  "text-sm font-semibold",
                  study.avgMove_1w > 0 ? "text-success" : 
                  study.avgMove_1w < 0 ? "text-destructive" : ""
                )}>
                  {study.avgMove_1w > 0 ? '+' : ''}{study.avgMove_1w.toFixed(2)}%
                </div>
                <div className="text-[10px] text-muted-foreground">1W Avg</div>
              </div>
            )}
            
            {study.avgMove_1m != null && (
              <div className="p-2 rounded-lg bg-secondary/50 text-center">
                <div className={cn(
                  "text-sm font-semibold",
                  study.avgMove_1m > 0 ? "text-success" : 
                  study.avgMove_1m < 0 ? "text-destructive" : ""
                )}>
                  {study.avgMove_1m > 0 ? '+' : ''}{study.avgMove_1m.toFixed(2)}%
                </div>
                <div className="text-[10px] text-muted-foreground">1M Avg</div>
              </div>
            )}
            
            <div className="p-2 rounded-lg bg-muted text-center">
              <div className="text-sm font-semibold">
                {study.sampleSize}
              </div>
              <div className="text-[10px] text-muted-foreground">Samples</div>
            </div>
          </div>

          {/* Additional Info */}
          {study.educationalNote && (
            <button 
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-left"
              onClick={() => {/* Show tooltip or modal */}}
            >
              <HelpCircle className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                Learn more about this study
              </span>
            </button>
          )}
        </CardContent>
      </Card>
    )
  }

  // Pending state (Manual studies not yet run)
  return (
    <Card className="transition-all hover:border-primary/50 border border-transparent">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-sm font-medium">{study.studyName}</div>
            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {study.description}
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] ml-2">
            {tier === 'AUTO' ? '⚡ Auto' : '🔬 Deep Dive'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-3 space-y-3">
        {/* Pending Icon */}
        <div className="flex flex-col items-center justify-center py-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="text-xs text-center text-muted-foreground mb-3">
            {study.description}
          </div>
          
          {/* Run Button */}
          <Button 
            onClick={onRunStudy}
            disabled={isLoading}
            size="sm"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-1" />
                Run Analysis
              </>
            )}
          </Button>

          {/* Estimated Time */}
          <div className="text-[10px] text-muted-foreground mt-2">
            Est. {study.estimatedTime || '2-3s'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Grid of Hybrid Study Cards
 */
interface HybridStudyGridProps {
  studies: StudyResult[]
  autoStudies: string[]
  manualStudies: string[]
  calculatedStudyIds: string[]
  loadingStudyId?: string
  onRunStudy: (studyId: string) => void
}

export function HybridStudyGrid({
  studies,
  autoStudies,
  manualStudies,
  calculatedStudyIds,
  loadingStudyId,
  onRunStudy
}: HybridStudyGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {studies.map((study) => {
        const tier = autoStudies.includes(study.studyId) ? 'AUTO' : 'MANUAL'
        const isCalculated = calculatedStudyIds.includes(study.studyId)
        const isLoading = loadingStudyId === study.studyId

        return (
          <HybridStudyCard
            key={study.studyId}
            study={study}
            tier={tier}
            isCalculated={isCalculated}
            isLoading={isLoading}
            onRunStudy={() => onRunStudy(study.studyId)}
          />
        )
      })}
    </div>
  )
}
