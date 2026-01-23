/**
 * EnhancedFinancialsPanel - ALA UI Styled
 * SEC filing data with multi-scenario projections matching ALA design system
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Shield,
  Target,
  Rocket,
  BarChart3,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnhancedFinancialsPanelProps {
  ticker: string
  currentPrice: number
}

type ScenarioType = 'conservative' | 'base' | 'aggressive'
type StatementView = 'income' | 'balance' | 'cashflow'

const SCENARIO_CONFIG = {
  conservative: {
    label: 'Conservative',
    icon: Shield,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
    description: 'Cautious growth assumptions'
  },
  base: {
    label: 'Base Case',
    icon: Target,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    description: 'Consensus analyst estimates'
  },
  aggressive: {
    label: 'Aggressive',
    icon: Rocket,
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
    description: 'Optimistic growth scenario'
  }
}

// Format number to millions/billions
function formatNumber(num: number, decimals = 1): string {
  if (Math.abs(num) >= 1000) {
    return `$${(num / 1000).toFixed(decimals)}B`
  }
  return `$${num.toFixed(decimals)}M`
}

function formatPercent(num: number, decimals = 1): string {
  return `${num >= 0 ? '+' : ''}${num.toFixed(decimals)}%`
}

export function EnhancedFinancialsPanel({ ticker, currentPrice }: EnhancedFinancialsPanelProps) {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('base')
  const [selectedView, setSelectedView] = useState<StatementView>('income')
  const [showHistorical, setShowHistorical] = useState(true)

  // Mock data for demonstration - replace with real data loading
  const mockValuations = {
    conservative: {
      fairValuePerShare: 165.32,
      impliedReturn: -16.7
    },
    base: {
      fairValuePerShare: 210.45,
      impliedReturn: 6.1
    },
    aggressive: {
      fairValuePerShare: 268.90,
      impliedReturn: 35.5
    }
  }

  const mockStatements = [
    { period: '2021', revenue: 365.8, netIncome: 94.7, eps: 5.61, isProjected: false },
    { period: '2022', revenue: 394.3, netIncome: 99.8, eps: 6.11, isProjected: false },
    { period: '2023', revenue: 383.3, netIncome: 97.0, eps: 6.13, isProjected: false },
    { period: '2024E', revenue: 410.0, netIncome: 106.8, eps: 6.95, isProjected: true },
    { period: '2025E', revenue: 438.0, netIncome: 118.9, eps: 7.85, isProjected: true },
    { period: '2026E', revenue: 467.0, netIncome: 130.9, eps: 8.78, isProjected: true },
  ]

  return (
    <div className="space-y-4">
      {/* Valuation Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(Object.keys(SCENARIO_CONFIG) as ScenarioType[]).map(scenario => {
          const config = SCENARIO_CONFIG[scenario]
          const valuation = mockValuations[scenario]
          const Icon = config.icon
          const isPositive = valuation.impliedReturn > 0
          
          return (
            <Card 
              key={scenario}
              className={cn(
                'cursor-pointer transition-all hover:border-primary/50',
                selectedScenario === scenario && cn('border', config.borderColor, 'ring-1 ring-primary/20')
              )}
              onClick={() => setSelectedScenario(scenario)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.bgColor)}>
                      <Icon className={cn('h-4 w-4', config.color)} />
                    </div>
                    <span className="font-medium text-sm">{config.label}</span>
                  </div>
                  {isPositive ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
                
                <div className="space-y-2">
                  <div>
                    <div className="text-2xl font-bold">
                      ${valuation.fairValuePerShare.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">Fair Value</div>
                  </div>
                  
                  <div className={cn(
                    'text-sm font-semibold',
                    isPositive ? 'text-success' : 'text-destructive'
                  )}>
                    {formatPercent(valuation.impliedReturn)} {isPositive ? 'upside' : 'downside'}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {config.description}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Financial Statements */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-medium">Financial Statements</CardTitle>
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                SEC Filings
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistorical(!showHistorical)}
                className="text-xs"
              >
                {showHistorical ? (
                  <><EyeOff className="h-3 w-3 mr-1" />Hide Historical</>
                ) : (
                  <><Eye className="h-3 w-3 mr-1" />Show Historical</>
                )}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Scenario selector */}
          <div className="flex items-center gap-2 mt-3">
            {(Object.keys(SCENARIO_CONFIG) as ScenarioType[]).map(scenario => {
              const config = SCENARIO_CONFIG[scenario]
              const Icon = config.icon
              
              return (
                <Button
                  key={scenario}
                  variant={selectedScenario === scenario ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedScenario(scenario)}
                  className="gap-2 text-xs"
                >
                  <Icon className="h-3 w-3" />
                  {config.label}
                </Button>
              )
            })}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as StatementView)}>
            <TabsList className="grid w-full grid-cols-3 h-auto p-0 bg-transparent gap-1">
              <TabsTrigger 
                value="income"
                className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-xs px-2 py-1.5"
              >
                Income Statement
              </TabsTrigger>
              <TabsTrigger 
                value="balance"
                className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-xs px-2 py-1.5"
              >
                Balance Sheet
              </TabsTrigger>
              <TabsTrigger 
                value="cashflow"
                className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-xs px-2 py-1.5"
              >
                Cash Flow
              </TabsTrigger>
            </TabsList>

            {/* Income Statement */}
            <TabsContent value="income" className="mt-3">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card z-10 text-xs">Metric</TableHead>
                      {mockStatements.map((stmt) => (
                        <TableHead key={stmt.period} className="text-right text-xs">
                          {stmt.period}
                          {stmt.isProjected && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                              Est
                            </Badge>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="font-semibold bg-muted/50">
                      <TableCell className="sticky left-0 bg-muted/50 text-xs">Revenue</TableCell>
                      {mockStatements.map((stmt) => (
                        <TableCell key={stmt.period} className="text-right text-sm">
                          {formatNumber(stmt.revenue)}
                        </TableCell>
                      ))}
                    </TableRow>
                    
                    <TableRow className="font-bold bg-primary/5">
                      <TableCell className="sticky left-0 bg-primary/5 text-xs">Net Income</TableCell>
                      {mockStatements.map((stmt) => (
                        <TableCell key={stmt.period} className="text-right text-sm text-primary">
                          {formatNumber(stmt.netIncome)}
                        </TableCell>
                      ))}
                    </TableRow>
                    
                    <TableRow className="font-semibold">
                      <TableCell className="sticky left-0 bg-card text-xs">EPS (Diluted)</TableCell>
                      {mockStatements.map((stmt) => (
                        <TableCell key={stmt.period} className="text-right text-sm">
                          ${stmt.eps.toFixed(2)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Balance Sheet */}
            <TabsContent value="balance" className="mt-3">
              <div className="text-center py-8 text-muted-foreground text-sm">
                Balance sheet data available in full integration
              </div>
            </TabsContent>

            {/* Cash Flow */}
            <TabsContent value="cashflow" className="mt-3">
              <div className="text-center py-8 text-muted-foreground text-sm">
                Cash flow data available in full integration
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Projection Assumptions */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Projection Assumptions ({SCENARIO_CONFIG[selectedScenario].label})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-2 rounded-lg bg-secondary/50">
              <div className="text-xs text-muted-foreground">Revenue Growth</div>
              <div className="font-semibold text-sm">6.8%</div>
            </div>
            <div className="p-2 rounded-lg bg-secondary/50">
              <div className="text-xs text-muted-foreground">Margin Expansion</div>
              <div className="font-semibold text-sm">+0.1%</div>
            </div>
            <div className="p-2 rounded-lg bg-secondary/50">
              <div className="text-xs text-muted-foreground">CapEx (% Rev)</div>
              <div className="font-semibold text-sm">2.8%</div>
            </div>
            <div className="p-2 rounded-lg bg-secondary/50">
              <div className="text-xs text-muted-foreground">Tax Rate</div>
              <div className="font-semibold text-sm">15.0%</div>
            </div>
            <div className="p-2 rounded-lg bg-secondary/50">
              <div className="text-xs text-muted-foreground">Buyback Rate</div>
              <div className="font-semibold text-sm">2.0%</div>
            </div>
            <div className="p-2 rounded-lg bg-secondary/50">
              <div className="text-xs text-muted-foreground">Debt Growth</div>
              <div className="font-semibold text-sm">0.0%</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
