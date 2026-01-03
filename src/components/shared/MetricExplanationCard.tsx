import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Calculator, BookOpen, Target, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { getMetricDefinition, formatMetricValue, getInterpretation } from '@/data/metricDefinitions';
import type { CalculationTrace } from '@/hooks/usePortfolioCalculations';

export interface MetricExplanationCardProps {
  metricId: string;
  value: number;
  trace?: CalculationTrace;
  mode?: 'compact' | 'expanded';
  onToggleExpand?: () => void;
  className?: string;
}

const interpretationColors = {
  excellent: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  good: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  fair: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  poor: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
};

export function MetricExplanationCard({
  metricId,
  value,
  trace,
  mode = 'compact',
  onToggleExpand,
  className,
}: MetricExplanationCardProps) {
  const [isExpanded, setIsExpanded] = useState(mode === 'expanded');
  const definition = getMetricDefinition(metricId);
  
  if (!definition) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">Unknown metric: {metricId}</p>
        </CardContent>
      </Card>
    );
  }
  
  const formattedValue = formatMetricValue(value, definition);
  const interpretation = getInterpretation(value, definition);
  
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onToggleExpand?.();
  };
  
  return (
    <Card className={cn('transition-all duration-200', className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader 
            className="cursor-pointer hover:bg-muted/50 transition-colors py-4"
            onClick={handleToggle}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{definition.name}</span>
                  <span className="text-2xl font-bold text-foreground">{formattedValue}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={cn('capitalize', interpretationColors[interpretation.level])}
                >
                  {interpretation.label}
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="animate-accordion-down">
          <CardContent className="pt-0 pb-4">
            <Tabs defaultValue="plain-english" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="plain-english" className="text-xs gap-1">
                  <BookOpen className="h-3 w-3" />
                  <span className="hidden sm:inline">Plain English</span>
                </TabsTrigger>
                <TabsTrigger value="formula" className="text-xs gap-1">
                  <Calculator className="h-3 w-3" />
                  <span className="hidden sm:inline">Formula</span>
                </TabsTrigger>
                <TabsTrigger value="calculation" className="text-xs gap-1">
                  <ListChecks className="h-3 w-3" />
                  <span className="hidden sm:inline">Your Calc</span>
                </TabsTrigger>
                <TabsTrigger value="interpretation" className="text-xs gap-1">
                  <Target className="h-3 w-3" />
                  <span className="hidden sm:inline">What's Good</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Plain English Tab */}
              <TabsContent value="plain-english" className="space-y-3">
                <p className="text-sm text-foreground leading-relaxed">
                  {definition.plainEnglish}
                </p>
                {definition.whyItMatters && (
                  <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Why it matters:</p>
                    <p className="text-sm text-foreground">{definition.whyItMatters}</p>
                  </div>
                )}
              </TabsContent>
              
              {/* Formula Tab */}
              <TabsContent value="formula" className="space-y-3">
                <div className="p-3 bg-muted rounded-lg border border-border/50">
                  <code className="text-sm font-mono text-foreground">
                    {definition.formula}
                  </code>
                </div>
                {definition.formulaExplained && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Step by step:</p>
                    <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                      {definition.formulaExplained}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              {/* Your Calculation Tab */}
              <TabsContent value="calculation" className="space-y-3">
                {trace && trace.steps.length > 0 ? (
                  <ol className="space-y-3">
                    {trace.steps.map((step, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                          {step.step}
                        </span>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium text-foreground">{step.description}</p>
                          {step.formula && (
                            <code className="text-xs font-mono text-muted-foreground block">
                              {step.formula}
                            </code>
                          )}
                          {step.inputs && Object.keys(step.inputs).length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Inputs: {Object.entries(step.inputs).map(([k, v]) => (
                                <span key={k} className="inline-flex items-center gap-1 mr-2">
                                  <span className="font-mono">{k}</span>=
                                  <span className="font-semibold">{typeof v === 'number' ? v.toFixed(4) : String(v)}</span>
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="text-sm">
                            <span className="text-muted-foreground">→ Result: </span>
                            <span className="font-semibold text-foreground">
                              {typeof step.result === 'number' ? step.result.toFixed(4) : String(step.result)}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No calculation trace available</p>
                    <p className="text-xs mt-1">Enable trace generation to see step-by-step calculations</p>
                  </div>
                )}
              </TabsContent>
              
              {/* What's Good Tab */}
              <TabsContent value="interpretation" className="space-y-3">
                <div className="space-y-2">
                  {(['excellent', 'good', 'fair', 'poor'] as const).map((level) => {
                    const range = definition.interpretation[level];
                    if (!range) return null;
                    
                    const isCurrentLevel = interpretation.level === level;
                    const rangeText = range.max === Infinity 
                      ? `≥ ${range.min}` 
                      : range.min === -Infinity 
                        ? `≤ ${range.max}`
                        : `${range.min} to ${range.max}`;
                    
                    return (
                      <div 
                        key={level}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg border transition-all',
                          isCurrentLevel 
                            ? interpretationColors[level] + ' border-2' 
                            : 'bg-muted/30 border-border/50'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn('capitalize text-xs', interpretationColors[level])}
                          >
                            {range.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-muted-foreground">
                            {rangeText}
                          </span>
                          {isCurrentLevel && (
                            <span className="text-xs font-medium text-foreground">
                              ← You: {formattedValue}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default MetricExplanationCard;
