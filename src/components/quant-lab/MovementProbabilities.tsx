/**
 * MovementProbabilities - Displays probability distributions for price movements
 * Shows likelihood of specific move magnitudes in both directions
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, ChevronDown, ChevronRight, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MovementProbability {
  threshold: number;
  upProbability: number;
  downProbability: number;
  upOccurrences: number;
  downOccurrences: number;
  avgMoveWhenUp: number;
  avgMoveWhenDown: number;
}

interface MovementProbabilitiesData {
  thresholds: MovementProbability[];
  overallUpProbability: number;
  overallDownProbability: number;
  expectedMove: number;
  sampleSize: number;
  volatilityAdjustedExpectedMove: number;
}

interface Props {
  movementProbabilities: {
    days1?: MovementProbabilitiesData;
    days5?: MovementProbabilitiesData;
    days10?: MovementProbabilitiesData;
    days21?: MovementProbabilitiesData;
  } | null;
  ticker: string;
}

const timeframeLabels: Record<string, string> = {
  days1: '1 Day',
  days5: '1 Week',
  days10: '2 Weeks',
  days21: '1 Month',
};

export function MovementProbabilities({ movementProbabilities, ticker }: Props) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('days5');
  const [expanded, setExpanded] = useState(false);

  if (!movementProbabilities) return null;

  const data = movementProbabilities[selectedTimeframe as keyof typeof movementProbabilities];
  if (!data || data.sampleSize === 0) return null;

  const direction = data.expectedMove >= 0 ? 'up' : 'down';
  const directionColor = direction === 'up' ? 'text-emerald-500' : 'text-red-500';
  const directionBg = direction === 'up' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30';

  return (
    <div className="px-3 py-3 border-b bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-transparent">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
            <Target className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            Movement Probabilities
          </span>
        </div>
        <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
          <SelectTrigger className="h-6 w-24 text-[10px] bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(timeframeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key} className="text-[10px]">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Probability Display */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Up Probability */}
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
              Upside
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500">
            {data.overallUpProbability.toFixed(1)}%
          </div>
          <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
            chance of positive move
          </p>
        </div>

        {/* Down Probability */}
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase">
              Downside
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-red-500">
            {data.overallDownProbability.toFixed(1)}%
          </div>
          <p className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-1">
            chance of negative move
          </p>
        </div>
      </div>

      {/* Expected Move Summary */}
      <div className={cn("p-2.5 rounded-lg border-2 mb-3", directionBg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium">Expected Move ({timeframeLabels[selectedTimeframe]})</span>
          </div>
          <span className={cn("text-lg font-bold font-mono", directionColor)}>
            {data.expectedMove >= 0 ? '+' : ''}{data.expectedMove.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            {data.sampleSize} samples
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            Risk-adj: {data.volatilityAdjustedExpectedMove >= 0 ? '+' : ''}{data.volatilityAdjustedExpectedMove.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Expand/Collapse Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors mb-2"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {expanded ? 'Hide threshold breakdown' : 'View probability by move size'}
      </button>

      {/* Threshold Breakdown */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-1.5"
        >
          <div className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wide mb-2">
            Probability by Move Threshold
          </div>
          {data.thresholds.slice(0, 5).map((t) => (
            <div key={t.threshold} className="flex items-center gap-2 text-xs">
              <span className="w-10 text-right font-mono text-muted-foreground">
                ±{t.threshold}%
              </span>
              
              {/* Up bar */}
              <div className="flex-1 flex items-center gap-1">
                <div 
                  className="h-4 rounded-r-sm bg-emerald-500/80 flex items-center justify-end pr-1"
                  style={{ width: `${Math.max(t.upProbability, 2)}%` }}
                >
                  <span className="text-[8px] font-mono text-white font-semibold">
                    {t.upProbability > 5 ? `${t.upProbability.toFixed(0)}%` : ''}
                  </span>
                </div>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono">
                  +{t.threshold}%
                </span>
              </div>
              
              {/* Down bar */}
              <div className="flex-1 flex items-center gap-1 flex-row-reverse">
                <div 
                  className="h-4 rounded-l-sm bg-red-500/80 flex items-center justify-start pl-1"
                  style={{ width: `${Math.max(t.downProbability, 2)}%` }}
                >
                  <span className="text-[8px] font-mono text-white font-semibold">
                    {t.downProbability > 5 ? `${t.downProbability.toFixed(0)}%` : ''}
                  </span>
                </div>
                <span className="text-[9px] text-red-600 dark:text-red-400 font-mono">
                  -{t.threshold}%
                </span>
              </div>
            </div>
          ))}
          
          {/* Insight text */}
          <div className="pt-2 mt-2 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {data.thresholds[1]?.upProbability > data.thresholds[1]?.downProbability 
                ? `${ticker} has a ${(data.thresholds[1]?.upProbability - data.thresholds[1]?.downProbability).toFixed(1)}pp higher chance of moving +2% than -2% over ${timeframeLabels[selectedTimeframe].toLowerCase()}.`
                : data.thresholds[1]?.downProbability > data.thresholds[1]?.upProbability
                ? `${ticker} has a ${(data.thresholds[1]?.downProbability - data.thresholds[1]?.upProbability).toFixed(1)}pp higher chance of moving -2% than +2% over ${timeframeLabels[selectedTimeframe].toLowerCase()}.`
                : `${ticker} has roughly equal probability of ±2% moves over ${timeframeLabels[selectedTimeframe].toLowerCase()}.`
              }
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
