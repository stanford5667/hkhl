/**
 * Study Types for ALA UI Integration
 */

export interface StudyResult {
  studyId: string
  studyName: string
  description: string
  winRate?: number
  avgMove_1w?: number
  avgMove_1m?: number
  sampleSize?: number
  currentRSI?: number
  educationalNote?: string
  estimatedTime?: string
  signal?: 'bullish' | 'bearish' | 'neutral'
  confidence?: number
  message?: string
}

export interface ChartLevel {
  levelType: 'SUPPORT' | 'RESISTANCE' | 'TARGET' | 'PIVOT'
  price: number
  label: string
  probability: number
  color: string
}

export interface ConfidenceCorridor {
  upper: number
  lower: number
  label: string
  probability: number
}

export interface ChartStudyResult {
  studyId: string
  signalActive: boolean
  avgMove_1w?: number
  avgMove_2w?: number
  avgMove_1m?: number
  winRate?: number
  currentRSI?: number
  priceVsMA?: { ma20?: number; ma50?: number; ma200?: number }
  currentStreak?: number
  unfilledGaps?: Array<{ price: number; type: 'up' | 'down'; age: number; distance: number }>
  stdDev?: number
  atr?: number
  bollingerPosition?: number
}
